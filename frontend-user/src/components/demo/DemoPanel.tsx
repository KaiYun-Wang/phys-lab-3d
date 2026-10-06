"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  clearDemoProgress,
  completeDemoStep,
  deleteDemo,
  ensureDemoAudio,
  fetchDemo,
  fetchDemos,
  submitDemoQuiz,
  updateDemoStatus,
  type DemoQuizResult,
  type DemoSessionDetail,
  type DemoSessionSummary,
  type DemoStep,
} from "@/lib/api";
import {
  animateParams,
  isSoftPaused,
  narrateText,
  softPauseMedia,
  softResumeMedia,
  stopSpeaking,
  unlockMedia,
  wait,
  warmVoices,
} from "@/lib/demoSpeech";
import { DemoPlanCard } from "@/components/demo/DemoPlanCard";

export type DemoAdapter = {
  experimentId: number | null;
  getParams: () => Record<string, unknown>;
  getReadings: () => Record<string, unknown> | null;
  applyParams: (params: Record<string, unknown>) => void;
  /** Resume simulation if user paused the bottom play bar. */
  ensurePlaying?: () => void;
  /** Fire a named UI action after params settle (e.g. launchParticle). */
  runAction?: (action: string) => void;
  setOnUserEdit?: (fn: (() => void) | null) => void;
};

export type DemoStageUi = {
  highlightId: string | null;
  caption: string;
  captionLabel: string;
  voiceOn: boolean;
  /** 字幕开关：关闭后场景字幕条隐藏文本，仅保留控制按钮 */
  captionsOn: boolean;
  canSkip: boolean;
  canPrev: boolean;
  nextLabel: string;
  prevLabel: string;
};

type Phase = "idle" | "step" | "done" | "paused" | "error";

function focusToDemoId(focus?: string): string | null {
  if (!focus) return null;
  if (focus === "v1" || focus === "areaRatio" || focus === "fluid") return focus;
  if (focus === "readings" || focus === "hud") return "readings";
  return focus;
}

function quizLabel(h: DemoSessionSummary): string {
  const a = h.quizAnswers;
  if (!a || a.every((x) => x == null)) return "未答题";
  if (a.some((x) => x == null)) return "答题中";
  return "已答题";
}

function stepCaptionLabel(i: number, total: number): string {
  return `讲解 · ${i + 1}/${total}`;
}

/** Prefer segments[]; legacy narration(+action) becomes one segment. */
function resolveSegments(step: DemoStep): Array<{
  narration: string;
  action?: string;
  audio?: { url?: string };
}> {
  if (step.segments?.length) {
    return step.segments.filter((s) => !!(s.narration && s.narration.trim()));
  }
  const text = (step.narration || step.title || "").trim();
  return text || step.action
    ? [{ narration: text || step.title || "", action: step.action, audio: step.audio }]
    : [];
}

/** Full-step caption: join all segment texts (one subtitle for the whole major step). */
function stepCaptionText(step: DemoStep, segs: ReturnType<typeof resolveSegments>): string {
  if (segs.length) return segs.map((s) => s.narration.trim()).filter(Boolean).join("");
  return (step.narration || step.title || "").trim();
}

export function DemoPanel({
  adapter,
  activeDemoId,
  onActiveDemoChange,
  onStageUi,
  onEnsureLeftOpen,
  onSkipReady,
  onPrevReady,
  onStopReady,
  onPauseReady,
}: {
  adapter: DemoAdapter;
  activeDemoId: number | null;
  onActiveDemoChange: (id: number | null) => void;
  onStageUi?: (ui: DemoStageUi) => void;
  onEnsureLeftOpen?: () => void;
  onSkipReady?: (skip: (() => void) | null) => void;
  onPrevReady?: (prev: (() => void) | null) => void;
  onStopReady?: (stop: (() => void) | null) => void;
  onPauseReady?: (pause: (() => void) | null) => void;
}) {
  const [detail, setDetail] = useState<DemoSessionDetail | null>(null);
  const [history, setHistory] = useState<DemoSessionSummary[]>([]);
  const [browsing, setBrowsing] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  /** 进度节点气泡：记录视口坐标，经 portal 渲染到 body 顶层（不被右栏裁剪） */
  const [hoverTip, setHoverTip] = useState<{
    i: number;
    /** 节点中心（锚点，视口坐标） */
    ax: number;
    /** 气泡中心：挂载后按实测宽度收边（避免按最坏宽度过度偏离节点） */
    x: number;
    top: number;
    /** 底部小三角相对气泡中心的偏移，始终指向锚点 */
    arrow: number;
  } | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  /** 字幕开关：关闭后场景字幕条隐藏文本，仅保留控制按钮 */
  const [captionsOn, setCaptionsOn] = useState(true);
  /** per-question feedback after submit */
  const [quizFb, setQuizFb] = useState<Record<number, DemoQuizResult>>({});
  const abortRef = useRef<AbortController | null>(null);
  const skipRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;
  const captionsRef = useRef(captionsOn);
  captionsRef.current = captionsOn;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const resumePhaseRef = useRef<Phase>("step");
  const pauseSnapshotRef = useRef<Record<string, unknown> | null>(null);
  const softPausedUiRef = useRef(false);
  const stepTargetParamsRef = useRef<Record<string, unknown> | null>(null);
  const pauseRef = useRef<() => void>(() => undefined);
  const pauseUiRef = useRef<{
    caption: string;
    captionLabel: string;
    highlightId: string | null;
  } | null>(null);
  /** 舞台字幕/按钮的最近一次完整快照（工具开关重推时据此保持其余字段不变） */
  const stageUiRef = useRef<DemoStageUi>({
    highlightId: null,
    caption: "",
    captionLabel: "",
    voiceOn: true,
    captionsOn: true,
    canSkip: false,
    canPrev: false,
    nextLabel: "下一步 ›",
    prevLabel: "‹ 上一步",
  });
  const skipCooldownRef = useRef(0);
  const detailRef = useRef(detail);
  detailRef.current = detail;

  const steps: DemoStep[] = detail?.plan?.steps ?? [];
  const quizzes = useMemo(() => {
    const p = detail?.plan;
    if (!p) return [];
    if (p.quizzes?.length) return p.quizzes;
    return p.quiz ? [p.quiz] : [];
  }, [detail?.plan]);

  const stepsDone = steps.length > 0 && completed >= steps.length;

  useEffect(() => {
    warmVoices();
  }, []);

  const pushUi = useCallback(
    (partial: Partial<DemoStageUi>) => {
      const next: DemoStageUi = {
        highlightId: null as string | null,
        caption: "",
        captionLabel: "",
        voiceOn: voiceRef.current,
        captionsOn: captionsRef.current,
        canSkip: false,
        canPrev: false,
        nextLabel: "下一步 ›",
        prevLabel: "‹ 上一步",
        ...partial,
      };
      stageUiRef.current = next;
      onStageUi?.(next);
    },
    [onStageUi],
  );

  /** 切换语音/字幕开关时重推舞台 UI：以最近快照为基线，保持当前字幕与按钮状态不变 */
  const pushToolsUi = useCallback(() => {
    const next: DemoStageUi = {
      ...stageUiRef.current,
      voiceOn: voiceRef.current,
      captionsOn: captionsRef.current,
    };
    stageUiRef.current = next;
    onStageUi?.(next);
  }, [onStageUi]);

  /** 字幕开关：关 → 字幕条只留控制按钮；开 → 立即恢复当前字幕文本 */
  const toggleCaptions = useCallback(() => {
    const on = !captionsRef.current;
    captionsRef.current = on;
    setCaptionsOn(on);
    pushToolsUi();
  }, [pushToolsUi]);

  const clearStage = useCallback(() => {
    stopSpeaking();
    pushUi({ highlightId: null, caption: "", captionLabel: "", canSkip: false, canPrev: false });
  }, [pushUi]);

  const requestSkip = useCallback(() => {
    const now = Date.now();
    if (now - skipCooldownRef.current < 350) return;
    skipCooldownRef.current = now;
    // Soft-paused: next = leave pause and play the following step (or summary).
    if (phaseRef.current === "paused" || softPausedUiRef.current) {
      softPausedUiRef.current = false;
      pauseSnapshotRef.current = null;
      pauseUiRef.current = null;
      const next = stepIndexRef.current + 1;
      playFromRef.current?.(next);
      return;
    }
    skipRef.current?.abort();
  }, []);

  const playFromRef = useRef<((from: number) => void) | null>(null);

  const requestPrev = useCallback(() => {
    const i = stepIndexRef.current;
    const inPlay =
      phaseRef.current === "step" || phaseRef.current === "paused" || softPausedUiRef.current;
    const target = inPlay && i > 0 ? i - 1 : i;
    softPausedUiRef.current = false;
    pauseSnapshotRef.current = null;
    pauseUiRef.current = null;
    skipRef.current?.abort();
    abortRef.current?.abort();
    stopSpeaking();
    void (async () => {
      await wait(60);
      playFromRef.current?.(target);
    })();
  }, []);

  useEffect(() => {
    onSkipReady?.(requestSkip);
    return () => onSkipReady?.(null);
  }, [onSkipReady, requestSkip]);

  useEffect(() => {
    onPrevReady?.(requestPrev);
    return () => onPrevReady?.(null);
  }, [onPrevReady, requestPrev]);

  const stopPlayback = useCallback(() => {
    const d = detailRef.current;
    runIdRef.current += 1;
    abortRef.current?.abort();
    skipRef.current?.abort();
    stopSpeaking();
    softPausedUiRef.current = false;
    pauseSnapshotRef.current = null;
    setPhase((p) => (p === "done" ? p : "idle"));
    clearStage();
    if (d) {
      void updateDemoStatus(d.id, "aborted").catch(() => undefined);
    }
  }, [clearStage]);

  useEffect(() => {
    onStopReady?.(stopPlayback);
    return () => onStopReady?.(null);
  }, [onStopReady, stopPlayback]);

  useEffect(() => {
    onPauseReady?.(() => pauseRef.current());
    return () => onPauseReady?.(null);
  }, [onPauseReady]);

  useEffect(() => {
    adapter.setOnUserEdit?.(() => {
      if (phaseRef.current === "step") pauseRef.current();
    });
    return () => adapter.setOnUserEdit?.(null);
  }, [adapter]);

  const freshSkip = () => {
    skipRef.current = new AbortController();
    return skipRef.current.signal;
  };

  const loadHistory = useCallback(async () => {
    if (adapter.experimentId == null) {
      setHistory([]);
      return;
    }
    try {
      setHistory(await fetchDemos(adapter.experimentId));
    } catch {
      setHistory([]);
    }
  }, [adapter.experimentId]);

  const applyLoaded = useCallback(
    (d: DemoSessionDetail) => {
      const n = d.plan?.steps?.length ?? 0;
      const cur = Math.max(0, Math.min(d.currentStep ?? 0, n));
      setDetail(d);
      setCompleted(cur);
      onActiveDemoChange(d.id);
      const fb: Record<number, DemoQuizResult> = {};
      for (const r of d.quizResults ?? []) {
        fb[r.questionIndex] = r;
      }
      setQuizFb(fb);
      if (n > 0 && cur >= n) {
        setPhase("done");
        setStepIndex(Math.max(0, n - 1));
      } else {
        setPhase("idle");
        setStepIndex(cur);
      }
      clearStage();
    },
    [onActiveDemoChange, clearStage],
  );

  const loadDemo = useCallback(
    async (id: number) => {
      runIdRef.current += 1;
      abortRef.current?.abort();
      stopSpeaking();
      setLoading(true);
      setError("");
      setBrowsing(false);
      try {
        const d = await fetchDemo(id);
        applyLoaded(d);
      } catch (e) {
        setDetail(null);
        setBrowsing(true);
        setError(e instanceof Error ? e.message : "加载演示失败");
      } finally {
        setLoading(false);
      }
    },
    [applyLoaded],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (activeDemoId == null) {
      setBrowsing(true);
      return;
    }
    if (activeDemoId !== detail?.id) {
      void loadDemo(activeDemoId);
    }
  }, [activeDemoId, detail?.id, loadDemo]);

  const backToList = () => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    stopSpeaking();
    clearStage();
    setPhase("idle");
    setBrowsing(true);
    setConfirmClear(false);
    setHoverTip(null);
    onActiveDemoChange(null);
    void loadHistory();
  };

  // 面板真正卸载（离开实验页）时中止播放，避免残留循环继续走步
  useEffect(
    () => () => {
      runIdRef.current += 1;
      abortRef.current?.abort();
      skipRef.current?.abort();
      clearStage();
    },
    [clearStage],
  );

  const narrate = async (
    text: string,
    signal: AbortSignal,
    skipSignal: AbortSignal,
    audioUrl?: string | null,
  ) => {
    if (!text.trim() && !audioUrl) return;
    if (voiceRef.current) {
      await narrateText(text, audioUrl, { signal, skipSignal });
    } else {
      await wait(Math.min(10000, Math.max(2800, text.length * 180)), signal, skipSignal);
    }
  };

  const runStep = async (
    i: number,
    ac: AbortSignal,
    runId: number,
    playSteps: DemoStep[],
    demoId: number,
  ): Promise<"ok" | "stop"> => {
    const step = playSteps[i];
    if (!step) return "stop";
    setStepIndex(i);
    const animate = !!step.animate && !!step.params;
    stepTargetParamsRef.current = animate ? { ...step.params } : { ...adapter.getParams() };
    onEnsureLeftOpen?.();

    const segs = resolveSegments(step);
    const caption = stepCaptionText(step, segs);
    const focusId = animate ? focusToDemoId(step.focus) : "readings";
    setPhase("step");
    const skip = freshSkip();
    const label = stepCaptionLabel(i, playSteps.length);

    // One caption for the whole major step; only audio/actions advance per segment.
    pushUi({
      highlightId: focusId,
      captionLabel: label,
      caption,
      canSkip: true,
      canPrev: true,
    });

    const playSeg = async (seg: (typeof segs)[number]) => {
      if (seg.action && adapter.runAction) {
        adapter.ensurePlaying?.();
        // Let applyParams from the previous beat commit into scene refs first.
        await wait(120, ac, skip);
        if (runId !== runIdRef.current) return;
        adapter.runAction(seg.action);
        await wait(80, ac, skip);
        if (runId !== runIdRef.current) return;
      }
      await narrate(seg.narration, ac, skip, seg.audio?.url);
    };

    let fromSeg = 0;
    if (animate && step.params) {
      const fromParams = adapter.getParams();
      // Pure-say first segment can ride along with the param tween.
      if (segs[0] && !segs[0].action) {
        await Promise.all([
          narrate(segs[0].narration, ac, skip, segs[0].audio?.url),
          animateParams(fromParams, step.params, adapter.applyParams, 1600, ac, skip),
        ]);
        fromSeg = 1;
      } else {
        await animateParams(fromParams, step.params, adapter.applyParams, 1600, ac, skip);
      }
      if (runId !== runIdRef.current) return "stop";
      adapter.applyParams(step.params);
      // Flush React state so launch* refs see the target params.
      await wait(120, ac, skip);
      if (runId !== runIdRef.current) return "stop";
    }

    for (let s = fromSeg; s < segs.length; s++) {
      if (runId !== runIdRef.current) return "stop";
      await playSeg(segs[s]);
      if (runId !== runIdRef.current) return "stop";
    }

    const nextDone = i + 1;
    setCompleted((c) => Math.max(c, nextDone));
    setDetail((d) =>
      d
        ? {
            ...d,
            currentStep: Math.max(d.currentStep ?? 0, nextDone),
            stepsFinished: nextDone >= playSteps.length,
          }
        : d,
    );
    try {
      await completeDemoStep(demoId, i);
    } catch {
      /* progress best-effort */
    }
    if (runId !== runIdRef.current) return "stop";
    return "ok";
  };

  const playFrom = async (from: number) => {
    if (!detail) return;
    softPausedUiRef.current = false;
    pauseSnapshotRef.current = null;
    unlockMedia();
    adapter.ensurePlaying?.();
    const runId = ++runIdRef.current;
    abortRef.current?.abort();
    stopSpeaking();
    // Re-unlock after stopSpeaking cleared the element (still same click task if called sync from onClick).
    unlockMedia();
    await wait(40);
    if (runId !== runIdRef.current) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setError("");
    let playDetail = detail;
    try {
      const cloudBlocked =
        playDetail.plan.audioStatus === "failed" || playDetail.plan.audioStatus === "unavailable";
      const already =
        !!playDetail.plan.summaryAudioUrl ||
        (playDetail.plan.steps ?? []).some(
          (s) =>
            !!s.audio?.url ||
            (s.segments ?? []).some((seg) => !!seg.audio?.url),
        );
      if (!already && !cloudBlocked) {
        setGeneratingAudio(true);
        try {
          await ensureDemoAudio(detail.id);
          playDetail = await fetchDemo(detail.id);
          setDetail(playDetail);
          detailRef.current = playDetail;
        } catch {
          /* browser fallback */
        } finally {
          setGeneratingAudio(false);
        }
      }
      const playSteps = playDetail.plan?.steps ?? [];
      await updateDemoStatus(playDetail.id, "playing");
      let i = from;
      while (i < playSteps.length) {
        if (runId !== runIdRef.current || ac.signal.aborted) {
          if (runId === runIdRef.current && !softPausedUiRef.current) setPhase("paused");
          return;
        }
        const r = await runStep(i, ac.signal, runId, playSteps, playDetail.id);
        if (r !== "ok" || runId !== runIdRef.current) return;
        i += 1;
      }

      const summary = playDetail.plan.summary || "演示完成。";
      setPhase("done");
      const skipSum = freshSkip();
      pushUi({
        highlightId: null,
        captionLabel: "演示小结",
        caption: summary,
        canSkip: true,
        canPrev: false,
        nextLabel: "完成",
      });
      await narrate(summary, ac.signal, skipSum, playDetail.plan.summaryAudioUrl);
      if (runId !== runIdRef.current) return;
      clearStage();
      try {
        await updateDemoStatus(detail.id, "ready");
      } catch {
        /* ignore */
      }
      void loadHistory();
    } catch (e) {
      if (runId !== runIdRef.current) return;
      if (softPausedUiRef.current || isSoftPaused()) {
        setPhase("paused");
        return;
      }
      if (ac.signal.aborted) {
        setPhase("paused");
        // Keep current teaching caption + prev/next (same as soft-pause).
        pushUi({
          highlightId: stageUiRef.current.highlightId,
          captionLabel: stageUiRef.current.captionLabel || stepCaptionLabel(stepIndexRef.current, steps.length),
          caption: stageUiRef.current.caption,
          canSkip: true,
          canPrev: true,
        });
      } else {
        setPhase("error");
        setError(e instanceof Error ? e.message : "演示失败");
        clearStage();
        try {
          await updateDemoStatus(detail.id, "aborted");
        } catch {
          /* ignore */
        }
      }
    } finally {
      if (runId === runIdRef.current) {
        skipRef.current = null;
      }
    }
  };

  playFromRef.current = (from: number) => {
    void playFrom(from);
  };

  const pause = () => {
    if (softPausedUiRef.current) return;
    if (phaseRef.current !== "step") return;
    resumePhaseRef.current = "step";
    pauseSnapshotRef.current = {
      ...(stepTargetParamsRef.current ?? adapter.getParams()),
    };
    pauseUiRef.current = { ...stageUiRef.current };
    softPausedUiRef.current = true;
    softPauseMedia();
    setPhase("paused");
    // Keep teaching caption so user can read while paused; keep prev/next to continue.
    pushUi({
      highlightId: pauseUiRef.current.highlightId,
      captionLabel: pauseUiRef.current.captionLabel,
      caption: pauseUiRef.current.caption,
      canSkip: true,
      canPrev: true,
    });
  };
  pauseRef.current = pause;

  const resumeSoft = () => {
    const snap = pauseSnapshotRef.current;
    if (snap) {
      adapter.applyParams(snap);
      pauseSnapshotRef.current = null;
    }
    softPausedUiRef.current = false;
    setPhase("step");
    const ui = pauseUiRef.current;
    pauseUiRef.current = null;
    pushUi({
      highlightId: ui?.highlightId ?? null,
      caption: ui?.caption ?? "",
      captionLabel: ui?.captionLabel ?? "",
      canSkip: true,
      canPrev: true,
    });
    adapter.ensurePlaying?.();
    softResumeMedia();
  };

  /** 进度条任意跳转：视频式 seek——先把参数复位到该步「起点状态」，再从头重演该步（语音+参数动画） */
  const jumpToStep = (i: number) => {
    if (i < 0 || i >= steps.length) return;
    // 点任意节点（含正在播的那一步）都要重新完整演示：先瞬时跳回该步起点的参数
    // （即上一步的目标参数），runStep 的参数动画便能从起点重新演示一遍；第 1 步无起点数据则不复位。
    const prevParams = i > 0 ? steps[i - 1]?.params : undefined;
    if (prevParams) {
      try {
        adapter.applyParams({ ...adapter.getParams(), ...prevParams });
      } catch {
        /* ignore */
      }
    }
    unlockMedia();
    void playFrom(i);
  };

  /** 跳到演示小结（复用同一播放管线：from = steps.length 即 while 跳过各步、直接播小结段） */
  const jumpToSummary = () => {
    if (steps.length === 0) return;
    unlockMedia();
    void playFrom(steps.length);
  };

  /** 记录节点锚点（真实收边在气泡挂载后按实测宽度进行，见下方 useLayoutEffect） */
  const setTipFor = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const ax = r.left + r.width / 2;
    setHoverTip({ i, ax, x: ax, top: r.top - 10, arrow: 0 });
  };

  // 气泡挂载后按实测宽度收边：短气泡不再被 180px 最坏值拉偏，且三角始终指向节点。
  // 在 paint 前（layout effect）完成修正，不会出现「先偏后跳」。
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el || !hoverTip) return;
    const w = el.offsetWidth;
    const half = w / 2 + 6;
    const vw = window.innerWidth;
    const want = Math.min(Math.max(hoverTip.ax, half), vw - half);
    const maxOff = Math.max(0, w / 2 - 10);
    const arrow = Math.max(-maxOff, Math.min(maxOff, hoverTip.ax - want));
    if (Math.abs(want - hoverTip.x) > 0.5 || Math.abs(arrow - hoverTip.arrow) > 0.5) {
      setHoverTip((t) => (t ? { ...t, x: want, arrow } : t));
    }
  }, [hoverTip]);

  const doClearProgress = async () => {
    if (!detail) return;
    setConfirmClear(false);
    runIdRef.current += 1;
    abortRef.current?.abort();
    stopSpeaking();
    try {
      await clearDemoProgress(detail.id);
      const d = await fetchDemo(detail.id);
      applyLoaded(d);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "清除失败");
    }
  };

  const doDelete = async (id: number) => {
    setConfirmDeleteId(null);
    if (detail?.id === id) {
      runIdRef.current += 1;
      abortRef.current?.abort();
      stopSpeaking();
      setDetail(null);
      setBrowsing(true);
      onActiveDemoChange(null);
      clearStage();
    }
    try {
      await deleteDemo(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
      void loadHistory();
    }
  };

  const onQuiz = async (questionIndex: number, answerIndex: number) => {
    if (!detail || !stepsDone || quizFb[questionIndex]) return;
    try {
      const res = await submitDemoQuiz(detail.id, questionIndex, answerIndex);
      setQuizFb((prev) => ({ ...prev, [questionIndex]: res }));
      setDetail((d) => {
        if (!d) return d;
        const answers = [...(d.quizAnswers ?? [])];
        while (answers.length <= questionIndex) answers.push(null);
        answers[questionIndex] = res.chosenIndex;
        return { ...d, quizAnswers: answers };
      });
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    }
  };

  const nextToPlay = Math.min(completed, steps.length);
  const playing = phase === "step";
  const progressPct =
    steps.length <= 1 ? (completed > 0 ? 100 : 0) : (completed / steps.length) * 100;
  const showList = browsing || !detail;

  return (
    <div className="demo-panel">
      {loading && <p className="demo-panel__hint">加载中…</p>}
      {error && <p className="demo-panel__err">{error}</p>}

      {showList && (
        <div className="demo-panel__list">
          {history.length === 0 && !loading ? (
            <div className="demo-panel__empty">
              <p>在对话里说一句想看的演示，AI 会生成带讲解的教学计划。</p>
            </div>
          ) : (
            <>
              <div className="demo-panel__head">
                <span className="demo-panel__src">我的演示</span>
                <span className="demo-panel__prog">{history.length} 个</span>
              </div>
              <div className="demo-panel__scroll">
                {history.map((h) => (
                  <DemoPlanCard
                    key={h.id}
                    demoId={h.id}
                    title={h.title}
                    steps={h.totalSteps ?? 0}
                    currentStep={h.currentStep ?? 0}
                    quizStatus={quizLabel(h)}
                    active={detail?.id === h.id}
                    onStart={(id) => void loadDemo(id)}
                    onDelete={(id) => setConfirmDeleteId(id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!showList && detail && (
        <>
          <div className="demo-panel__head">
            <button type="button" className="demo-panel__back" onClick={backToList}>
              ‹ 列表
            </button>
            <span className="demo-panel__src">AI 教学演示</span>
            <span className="demo-panel__prog">
              {completed}/{steps.length} 步
              {phase === "idle" && (completed > 0 ? " · 可继续" : " · 待开始")}
              {playing && " · 讲解中"}
              {phase === "done" && " · 可答题"}
              {phase === "paused" && " · 已暂停"}
            </span>
          </div>
          <h5 className="demo-panel__title">{detail.title}</h5>
          {detail.plan.overview ? <p className="demo-panel__desc">{detail.plan.overview}</p> : null}

          {steps.length > 0 && (
            <div className="demo-scrubber" aria-label="演示进度">
              <div className="demo-scrubber__rail">
                <div className="demo-scrubber__fill" style={{ width: `${progressPct}%` }} />
                {steps.map((s, i) => {
                  // 步骤节点均布在 0~(n-1)/n，末端 100% 留给「实验小结」节点；
                  // fill 宽度 completed/n 恰与节点位置对齐。
                  const left = (i / steps.length) * 100;
                  const isDone = i < completed;
                  const active = i === stepIndex && (playing || phase === "paused");
                  // 仅播放中脉冲（暂停时保持静态高亮，不再跳动）
                  const pulsing = playing && i === stepIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`demo-scrubber__node${isDone ? " done" : ""}${active ? " active" : ""}${
                        pulsing ? " pulsing" : ""
                      }`}
                      style={{ left: `${left}%` }}
                      aria-label={`第 ${i + 1} 步：${s.title}`}
                      onMouseEnter={(e) => setTipFor(i, e.currentTarget)}
                      onMouseLeave={() => setHoverTip(null)}
                      onFocus={(e) => setTipFor(i, e.currentTarget)}
                      onBlur={() => setHoverTip(null)}
                      onClick={() => jumpToStep(i)}
                    />
                  );
                })}
                {/* 实验小结节点（进度终点站）：气泡固定文案，点击直达小结段 */}
                <button
                  type="button"
                  className={`demo-scrubber__node demo-scrubber__node--sum${
                    completed >= steps.length ? " done" : ""
                  }${phase === "done" ? " active" : ""}`}
                  style={{ left: "100%" }}
                  aria-label="实验小结"
                  onMouseEnter={(e) => setTipFor(steps.length, e.currentTarget)}
                  onMouseLeave={() => setHoverTip(null)}
                  onFocus={(e) => setTipFor(steps.length, e.currentTarget)}
                  onBlur={() => setHoverTip(null)}
                  onClick={jumpToSummary}
                />
                {hoverTip != null &&
                  (hoverTip.i >= steps.length || steps[hoverTip.i]) &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <div
                      ref={tipRef}
                      className="demo-scrubber__tip"
                      style={
                        {
                          left: hoverTip.x,
                          top: hoverTip.top,
                          "--tip-arrow": `${hoverTip.arrow}px`,
                        } as CSSProperties
                      }
                      role="tooltip"
                    >
                      {hoverTip.i < steps.length ? (
                        <>
                          <span className="demo-scrubber__tip-n">{hoverTip.i + 1}</span>
                          {steps[hoverTip.i].title}
                        </>
                      ) : (
                        "实验小结"
                      )}
                    </div>,
                    document.body,
                  )}
              </div>
              <p className="demo-scrubber__hint">
                {steps[stepIndex]?.title ?? "—"}
                <span> · 点击节点跳转</span>
              </p>
            </div>
          )}

          <div className="demo-panel__tools">
            <button
              type="button"
              className={`demo-tool${voiceOn ? " on" : ""}`}
              role="switch"
              aria-checked={voiceOn}
              onClick={() => setVoiceOn((v) => !v)}
            >
              <i
                className={`fa-solid ${voiceOn ? "fa-volume-high" : "fa-volume-xmark"}`}
                aria-hidden
              />
              <span className="demo-tool__label">语音讲解</span>
              <span className="demo-tool__chip" aria-hidden />
            </button>
            <button
              type="button"
              className={`demo-tool${captionsOn ? " on" : ""}`}
              role="switch"
              aria-checked={captionsOn}
              onClick={toggleCaptions}
            >
              <i className="fa-solid fa-closed-captioning" aria-hidden />
              <span className="demo-tool__label">字幕</span>
              <span className="demo-tool__chip" aria-hidden />
            </button>
          </div>

          <div className="demo-panel__actions">
            {(phase === "idle" || phase === "paused" || phase === "error") && (
              <button
                type="button"
                className="demo-panel__btn primary"
                disabled={generatingAudio}
                onClick={() => {
                  if (generatingAudio) return;
                  if (phase === "paused" && softPausedUiRef.current) {
                    resumeSoft();
                    return;
                  }
                  unlockMedia();
                  if (phase === "paused") void playFrom(stepIndex);
                  else if (completed >= steps.length && steps.length > 0) void playFrom(0);
                  else void playFrom(nextToPlay);
                }}
              >
                {generatingAudio
                  ? "正在准备语音…"
                  : phase === "paused"
                    ? "▶ 继续讲解"
                    : completed > 0 && completed < steps.length
                      ? `▶ 从第 ${completed + 1} 步继续`
                      : completed >= steps.length && steps.length > 0
                        ? "↻ 再演示一次"
                        : "▶ 开始演示"}
              </button>
            )}
            {playing && (
              <button type="button" className="demo-panel__btn primary" onClick={pause}>
                Ⅱ 暂停 / 我来操作
              </button>
            )}
            {phase === "done" && (
              <button
                type="button"
                className="demo-panel__btn primary"
                onClick={() => {
                  setPhase("idle");
                  clearStage();
                  void playFrom(0);
                }}
              >
                ↻ 再演示一次
              </button>
            )}
            {(completed > 0 || Object.keys(quizFb).length > 0) && (
              <button type="button" className="demo-panel__btn" onClick={() => setConfirmClear(true)}>
                清除进度
              </button>
            )}
          </div>

          {quizzes.length > 0 && (
            <div className={`demo-panel__quiz${stepsDone ? "" : " locked"}`}>
              {!stepsDone && (
                <p className="demo-panel__hint">看完全部演示步骤后解锁随堂题（共 {quizzes.length} 题）</p>
              )}
              {quizzes.map((q, qi) => {
                const fb = quizFb[qi];
                const answered = !!fb;
                return (
                  <div key={qi} className="demo-panel__quiz-item">
                    <p className="demo-panel__quiz-q">
                      {quizzes.length > 1 ? `${qi + 1}. ` : ""}
                      {q.question}
                    </p>
                    <div className="demo-panel__quiz-opts">
                      {(q.options ?? []).map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          className={fb?.chosenIndex === oi ? "sel" : ""}
                          disabled={!stepsDone || answered}
                          onClick={() => void onQuiz(qi, oi)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {fb && (
                      <p className={`demo-panel__quiz-fb${fb.correct ? " ok" : " bad"}`}>
                        {fb.correct ? "回答正确" : "回答错误"}
                        {fb.explanation ? ` · ${fb.explanation}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {confirmClear && (
        <div
          className="demo-confirm-overlay"
          role="presentation"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="demo-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="demo-confirm-title" className="demo-confirm__title">
              清除进度？
            </p>
            <p className="demo-confirm__body">观看进度与答题结果会清空，剧本保留，可重新完整观看。</p>
            <div className="demo-confirm__actions">
              <button type="button" className="demo-panel__btn" onClick={() => setConfirmClear(false)}>
                取消
              </button>
              <button type="button" className="demo-panel__btn primary" onClick={() => void doClearProgress()}>
                清除
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId != null && (
        <div
          className="demo-confirm-overlay"
          role="presentation"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="demo-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="demo-delete-title" className="demo-confirm__title">
              删除演示？
            </p>
            <p className="demo-confirm__body">将永久删除该演示剧本与进度，不可恢复。</p>
            <div className="demo-confirm__actions">
              <button type="button" className="demo-panel__btn" onClick={() => setConfirmDeleteId(null)}>
                取消
              </button>
              <button
                type="button"
                className="demo-panel__btn primary"
                onClick={() => void doDelete(confirmDeleteId)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
