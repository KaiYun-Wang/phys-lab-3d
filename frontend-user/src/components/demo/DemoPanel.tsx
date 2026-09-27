"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDemoProgress,
  fetchDemo,
  fetchDemos,
  submitDemoQuiz,
  updateDemoStatus,
  verifyDemoStep,
  type DemoSessionDetail,
  type DemoSessionSummary,
  type DemoStep,
} from "@/lib/api";
import { animateParams, speak, stopSpeaking, wait, warmVoices } from "@/lib/demoSpeech";

export type DemoAdapter = {
  experimentId: number | null;
  getParams: () => Record<string, unknown>;
  getReadings: () => Record<string, unknown> | null;
  applyParams: (params: Record<string, unknown>) => void;
};

export type DemoStageUi = {
  highlightId: string | null;
  caption: string;
  captionLabel: string;
  voiceOn: boolean;
  canSkip: boolean;
  canPrev: boolean;
  nextLabel: string;
  prevLabel: string;
};

type Phase =
  | "idle"
  | "action"
  | "verify"
  | "result"
  | "gate"
  | "done"
  | "paused"
  | "error";

type GateAction = "next" | "prev";

const MICRO = {
  action: { label: "操作讲解", n: 1 },
  verify: { label: "核验读数", n: 2 },
  result: { label: "结果讲解", n: 3 },
} as const;

function focusToDemoId(focus?: string): string | null {
  if (!focus) return null;
  if (focus === "v1" || focus === "areaRatio" || focus === "fluid") return focus;
  if (focus === "readings" || focus === "hud") return "readings";
  return focus;
}

function quizLabel(h: DemoSessionSummary): string {
  if (h.quizAnswerIndex == null) return "未答题";
  if (h.quizCorrect === true) return "答题正确";
  if (h.quizCorrect === false) return "答题错误";
  return "已答题";
}

function microLabel(kind: keyof typeof MICRO): string {
  const m = MICRO[kind];
  return `${m.label} · ${m.n}/3`;
}

export function DemoPanel({
  adapter,
  activeDemoId,
  onActiveDemoChange,
  onStageUi,
  onEnsureLeftOpen,
  onSkipReady,
  onPrevReady,
}: {
  adapter: DemoAdapter;
  activeDemoId: number | null;
  onActiveDemoChange: (id: number | null) => void;
  onStageUi?: (ui: DemoStageUi) => void;
  onEnsureLeftOpen?: () => void;
  onSkipReady?: (skip: (() => void) | null) => void;
  onPrevReady?: (prev: (() => void) | null) => void;
}) {
  const [detail, setDetail] = useState<DemoSessionDetail | null>(null);
  const [history, setHistory] = useState<DemoSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [quizFb, setQuizFb] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const gateRef = useRef<{ resolve: (a: GateAction) => void } | null>(null);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;

  const steps: DemoStep[] = detail?.plan?.steps ?? [];

  useEffect(() => {
    warmVoices();
  }, []);

  const pushUi = useCallback(
    (partial: Partial<DemoStageUi>) => {
      onStageUi?.({
        highlightId: null,
        caption: "",
        captionLabel: "",
        voiceOn: voiceRef.current,
        canSkip: false,
        canPrev: false,
        nextLabel: "下一步 ›",
        prevLabel: "‹ 上一步",
        ...partial,
      });
    },
    [onStageUi],
  );

  const clearStage = useCallback(() => {
    stopSpeaking();
    pushUi({ highlightId: null, caption: "", captionLabel: "", canSkip: false, canPrev: false });
  }, [pushUi]);

  const requestSkip = useCallback(() => {
    if (phaseRef.current === "gate") {
      gateRef.current?.resolve("next");
      return;
    }
    skipRef.current?.abort();
    stopSpeaking();
  }, []);

  const requestPrev = useCallback(() => {
    if (phaseRef.current === "gate") {
      gateRef.current?.resolve("prev");
      return;
    }
    // 播放中：中断并重播上一节（或本节）
    const i = stepIndexRef.current;
    const target = phaseRef.current === "action" && i > 0 ? i - 1 : i;
    skipRef.current?.abort();
    abortRef.current?.abort();
    stopSpeaking();
    // playFrom 由外部调用；用 run 标记后异步启动
    void (async () => {
      await wait(60);
      // 直接在闭包外触发需要 playFrom — 用 ref
      playFromRef.current?.(target);
    })();
  }, []);

  const playFromRef = useRef<((from: number) => void) | null>(null);

  useEffect(() => {
    onSkipReady?.(requestSkip);
    return () => onSkipReady?.(null);
  }, [onSkipReady, requestSkip]);

  useEffect(() => {
    onPrevReady?.(requestPrev);
    return () => onPrevReady?.(null);
  }, [onPrevReady, requestPrev]);

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
      if (d.quizResult) {
        setQuizPick(d.quizResult.chosenIndex);
        setQuizFb({
          correct: d.quizResult.correct,
          explanation: d.quizResult.explanation,
        });
      } else {
        setQuizPick(null);
        setQuizFb(null);
      }
      if (n > 0 && cur >= n) {
        setPhase("done");
        setStepIndex(n - 1);
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
      gateRef.current = null;
      stopSpeaking();
      setLoading(true);
      setError("");
      try {
        const d = await fetchDemo(id);
        applyLoaded(d);
      } catch (e) {
        setDetail(null);
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
    if (activeDemoId != null && activeDemoId !== detail?.id) {
      void loadDemo(activeDemoId);
    }
  }, [activeDemoId, detail?.id, loadDemo]);

  useEffect(() => () => clearStage(), [clearStage]);

  const waitReadingsStable = async (
    signal: AbortSignal,
    skipSignal?: AbortSignal,
  ): Promise<Record<string, unknown>> => {
    let prev: string | null = null;
    for (let i = 0; i < 50; i++) {
      if (signal.aborted) throw new Error("已暂停");
      if (skipSignal?.aborted) {
        const last = adapter.getReadings();
        if (last) return last;
      }
      await wait(100, signal, skipSignal);
      const r = adapter.getReadings();
      if (!r) continue;
      const key = JSON.stringify({
        v2: Number(r.v2)?.toFixed?.(3) ?? r.v2,
        deltaP: Number(r.deltaP)?.toFixed?.(2) ?? r.deltaP,
      });
      if (prev != null && prev === key) return r;
      prev = key;
    }
    const last = adapter.getReadings();
    if (!last) throw new Error("读数未就绪");
    return last;
  };

  const narrate = async (text: string, signal: AbortSignal, skipSignal: AbortSignal) => {
    if (!text.trim()) return;
    if (voiceRef.current) {
      await speak(text, { signal, skipSignal });
    } else {
      await wait(Math.min(10000, Math.max(2800, text.length * 180)), signal, skipSignal);
    }
  };

  const waitGate = (signal: AbortSignal): Promise<GateAction> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("已暂停"));
        return;
      }
      const onAbort = () => {
        gateRef.current = null;
        reject(new Error("已暂停"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      gateRef.current = {
        resolve: (a) => {
          signal.removeEventListener("abort", onAbort);
          gateRef.current = null;
          resolve(a);
        },
      };
    });

  /** 播完一个大步骤（含三个小步）；不自动进下一节 */
  const runBigStep = async (
    i: number,
    ac: AbortSignal,
    runId: number,
  ): Promise<"ok" | "stop"> => {
    if (!detail) return "stop";
    const step = steps[i];
    setStepIndex(i);
    onEnsureLeftOpen?.();

    // 1 操作
    const focusId = focusToDemoId(step.focus);
    setPhase("action");
    const skipAction = freshSkip();
    pushUi({
      highlightId: focusId,
      captionLabel: microLabel("action"),
      caption: step.actionNarration || step.title,
      canSkip: true,
      canPrev: true,
    });
    const fromParams = adapter.getParams();
    await Promise.all([
      narrate(step.actionNarration || step.title, ac, skipAction),
      animateParams(fromParams, step.params, adapter.applyParams, 1600, ac, skipAction),
    ]);
    if (runId !== runIdRef.current) return "stop";
    adapter.applyParams(step.params);

    // 2 核验
    setPhase("verify");
    const skipVerify = freshSkip();
    pushUi({
      highlightId: "readings",
      captionLabel: microLabel("verify"),
      caption: "观察场景与读数变化，正在与理想模型核对…",
      canSkip: true,
      canPrev: true,
    });
    const readings = await waitReadingsStable(ac, skipVerify);
    if (runId !== runIdRef.current) return "stop";
    await verifyDemoStep(detail.id, i, { params: step.params, readings });
    const nextDone = i + 1;
    setCompleted((c) => Math.max(c, nextDone));
    setDetail((d) => (d ? { ...d, currentStep: Math.max(d.currentStep ?? 0, nextDone) } : d));

    // 3 结果
    setPhase("result");
    const skipResult = freshSkip();
    const resultText = step.resultNarration || "本步完成。";
    pushUi({
      highlightId: "readings",
      captionLabel: microLabel("result"),
      caption: resultText,
      canSkip: true,
      canPrev: true,
    });
    await narrate(resultText, ac, skipResult);
    if (runId !== runIdRef.current) return "stop";
    return "ok";
  };

  const playFrom = async (from: number) => {
    if (!detail) return;
    const runId = ++runIdRef.current;
    abortRef.current?.abort();
    gateRef.current = null;
    stopSpeaking();
    await wait(40);
    if (runId !== runIdRef.current) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setError("");
    try {
      await updateDemoStatus(detail.id, "playing");
      let i = from;
      while (i < steps.length) {
        if (runId !== runIdRef.current || ac.signal.aborted) {
          if (runId === runIdRef.current) setPhase("paused");
          return;
        }
        const r = await runBigStep(i, ac.signal, runId);
        if (r !== "ok" || runId !== runIdRef.current) return;

        if (i >= steps.length - 1) break;

        // 大步骤之间：等用户确认
        setPhase("gate");
        const nextTitle = steps[i + 1]?.title ?? "下一节";
        pushUi({
          highlightId: null,
          captionLabel: "本节完成",
          caption: `「${steps[i].title}」讲完了。是否进入下一节「${nextTitle}」？`,
          canSkip: true,
          canPrev: true,
          nextLabel: "进入下一节 ›",
          prevLabel: "‹ 重看本节",
        });
        const action = await waitGate(ac.signal);
        if (runId !== runIdRef.current) return;
        if (action === "prev") {
          // 重看本节
          continue;
        }
        i += 1;
      }

      const summary = detail.plan.summary || "演示完成。";
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
      await narrate(summary, ac.signal, skipSum);
      if (runId !== runIdRef.current) return;
      pushUi({
        canSkip: false,
        canPrev: false,
        caption: summary,
        captionLabel: "演示小结",
        highlightId: null,
      });
      await updateDemoStatus(detail.id, "done");
      void loadHistory();
    } catch (e) {
      if (runId !== runIdRef.current) return;
      if (ac.signal.aborted) {
        setPhase("paused");
        pushUi({
          captionLabel: "已暂停",
          caption: "你可以手动操作，或点继续接着讲。",
          canSkip: false,
          canPrev: false,
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
        gateRef.current = null;
      }
    }
  };

  playFromRef.current = (from: number) => {
    void playFrom(from);
  };

  const pause = () => {
    abortRef.current?.abort();
    gateRef.current = null;
    stopSpeaking();
    setPhase("paused");
  };

  const jumpToStep = (i: number) => {
    if (i < 0 || i >= completed) return;
    void playFrom(i);
  };

  const onClearProgress = async () => {
    if (!detail) return;
    if (!window.confirm("清除观看进度与答题结果？剧本保留，可重新完整观看。")) return;
    runIdRef.current += 1;
    abortRef.current?.abort();
    gateRef.current = null;
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

  const onQuiz = async (idx: number) => {
    if (!detail || quizFb) return;
    setQuizPick(idx);
    try {
      const res = await submitDemoQuiz(detail.id, idx);
      setQuizFb({ correct: res.correct, explanation: res.explanation });
      setDetail((d) =>
        d
          ? {
              ...d,
              quizAnswerIndex: res.chosenIndex,
              quizCorrect: res.correct,
              quizResult: {
                chosenIndex: res.chosenIndex,
                correct: res.correct,
                answerIndex: res.answerIndex,
                explanation: res.explanation,
              },
            }
          : d,
      );
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    }
  };

  const nextToPlay = Math.min(completed, steps.length);
  const canShowQuiz =
    phase === "done" || (completed >= steps.length && steps.length > 0 && !!detail?.plan.quiz);
  const playing =
    phase === "action" || phase === "verify" || phase === "result" || phase === "gate";

  return (
    <div className="demo-panel">
      {loading && <p className="demo-panel__hint">加载中…</p>}
      {error && <p className="demo-panel__err">{error}</p>}

      {!detail && !loading && (
        <div className="demo-panel__empty">
          <p>在对话里说一句想看的演示，AI 会生成带讲解的教学计划。</p>
          <p className="demo-panel__hint">开始后：高亮控件 · 中下字幕 · 语音播报。</p>
        </div>
      )}

      {detail && (
        <>
          <div className="demo-panel__head">
            <span className="demo-panel__src">AI 教学演示</span>
            <span className="demo-panel__prog">
              {completed}/{steps.length} 已完成
              {phase === "idle" && (completed > 0 ? " · 可继续" : " · 待开始")}
              {playing && phase !== "gate" && " · 讲解中"}
              {phase === "gate" && " · 待进入下一节"}
              {phase === "done" && " · 已完成"}
              {phase === "paused" && " · 已暂停"}
            </span>
          </div>
          <h5 className="demo-panel__title">{detail.title}</h5>
          {detail.plan.overview ? <p className="demo-panel__desc">{detail.plan.overview}</p> : null}

          <ol className="demo-panel__steps">
            {steps.map((s, i) => {
              const isDone = i < completed;
              const active =
                i === stepIndex &&
                (phase === "action" ||
                  phase === "verify" ||
                  phase === "result" ||
                  phase === "gate" ||
                  phase === "paused");
              const clickable = isDone && !active && !playing;
              return (
                <li
                  key={i}
                  className={`${isDone && !active ? "done" : ""}${active ? " active" : ""}${clickable ? " clickable" : ""}`}
                  onClick={clickable ? () => jumpToStep(i) : undefined}
                  title={clickable ? "点击回看此节" : undefined}
                >
                  <span className="n">{isDone && !active ? "✓" : i + 1}</span>
                  <span>
                    <strong>{s.title}</strong>
                    <small>
                      v₁ {String(s.params.v1)} · 面积比 {String(s.params.areaRatio)} ·{" "}
                      {String(s.params.fluid)}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="demo-panel__tools">
            <label>
              <input
                type="checkbox"
                checked={voiceOn}
                onChange={(e) => setVoiceOn(e.target.checked)}
              />
              语音讲解
            </label>
          </div>

          <div className="demo-panel__actions">
            {(phase === "idle" || phase === "paused" || phase === "error") && (
              <button
                type="button"
                className="demo-panel__btn primary"
                onClick={() => {
                  if (phase === "paused") void playFrom(stepIndex);
                  else if (completed >= steps.length && steps.length > 0) void playFrom(0);
                  else void playFrom(nextToPlay);
                }}
              >
                {phase === "paused"
                  ? "▶ 继续讲解"
                  : completed > 0 && completed < steps.length
                    ? `▶ 从第 ${completed + 1} 节继续`
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
            {(completed > 0 || quizFb) && (
              <button type="button" className="demo-panel__btn" onClick={() => void onClearProgress()}>
                清除进度
              </button>
            )}
          </div>

          {canShowQuiz && detail.plan.quiz && (
            <div className="demo-panel__quiz">
              <p className="demo-panel__quiz-q">{detail.plan.quiz.question}</p>
              <div className="demo-panel__quiz-opts">
                {(detail.plan.quiz.options ?? []).map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className={quizPick === i ? "sel" : ""}
                    disabled={!!quizFb}
                    onClick={() => void onQuiz(i)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {quizFb && (
                <p className={`demo-panel__quiz-fb${quizFb.correct ? " ok" : " bad"}`}>
                  {quizFb.correct ? "回答正确" : "回答错误"}
                  {quizFb.explanation ? ` · ${quizFb.explanation}` : ""}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <details className="demo-panel__hist">
          <summary>演示历史</summary>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => void loadDemo(h.id)}>
                  {h.title}
                  <small>
                    {h.currentStep}/{h.totalSteps ?? "?"} 步 · {quizLabel(h)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
