/** Cloud MP3 first; browser speechSynthesis as stable local fallback. Soft-pause keeps audio position. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Soft-pause barrier: play loop waits here instead of aborting. */
let softPaused = false;
const softWaiters: Array<() => void> = [];

export function isSoftPaused(): boolean {
  return softPaused;
}

export function softPauseMedia() {
  softPaused = true;
  if (sharedAudio && !sharedAudio.paused) {
    sharedAudio.pause();
  }
  if (canSpeak()) {
    try {
      window.speechSynthesis.pause();
    } catch {
      /* ignore */
    }
  }
}

export function softResumeMedia() {
  softPaused = false;
  if (sharedAudio && sharedAudio.paused && sharedAudio.src && !sharedAudio.ended) {
    void sharedAudio.play().catch(() => undefined);
  }
  if (canSpeak()) {
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  }
  const ws = softWaiters.splice(0);
  for (const w of ws) w();
}

export async function awaitSoftPause(signal?: AbortSignal): Promise<void> {
  while (softPaused) {
    if (signal?.aborted) throw new Error("已暂停");
    await new Promise<void>((resolve) => {
      softWaiters.push(resolve);
    });
  }
}

let sharedAudio: HTMLAudioElement | null = null;

/** 解锁用的静音 wav 桩（0 采样 data URI）；unlockMedia 的清理守卫也以它为标记 */
const DATA_PING =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

export function stopSpeaking() {
  softPaused = false;
  softWaiters.splice(0).forEach((w) => w());
  if (sharedAudio) {
    sharedAudio.onended = null;
    sharedAudio.onerror = null;
    sharedAudio.pause();
    try {
      sharedAudio.removeAttribute("src");
      sharedAudio.load();
    } catch {
      /* ignore */
    }
  }
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/**
 * Call synchronously inside a click handler (before any await).
 * Browsers drop autoplay permission after setTimeout/await; unlock once per gesture.
 */
export function unlockMedia() {
  const audio = getAudio();
  // 只凭 currentSrc/src 判断「是否正在播放」不可靠：stopSpeaking 的 removeAttribute+load()
  // 之后 currentSrc 仍会残留旧 URL（实测 400ms+），会把「已清空」误判成「正在播」而跳过解锁桩。
  // 改用真实播放进度判定：只有确实在推进播放时才视为 midClip。
  const src = audio.currentSrc || audio.src || "";
  const midClip =
    !audio.paused && !audio.ended && audio.readyState >= 2 && !src.startsWith("data:");
  if (midClip) {
    // Don't wipe a paused demo clip — resume under this click instead.
    softPaused = false;
    if (audio.paused) void audio.play().catch(() => undefined);
    const ws = softWaiters.splice(0);
    for (const w of ws) w();
    return;
  }
  softPaused = false;
  try {
    // Tiny silent wav — enough to mark this element as user-activated.
    // 0 采样本身无声，且绝不触碰 muted：避免解锁流程遗留静音状态（会导致讲解"能走但没声音"）。
    audio.src = DATA_PING;
    void audio
      .play()
      .then(() => {
        // 守卫：只在元素「仍是这枚静音桩」时清理它。
        // 点节点重播场景下，正式讲解音频可能在桩的 play() resolve 之前就已接管元素，
        // 若无差别 pause + 清 src，会把刚起播的讲解音频打断（onended 永不触发），
        // 导致整个讲解循环被永久挂起：无声、不推进、也不显示暂停。
        if (audio.src.startsWith("data:audio/wav")) {
          audio.pause();
          try {
            audio.removeAttribute("src");
            audio.load();
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* 桩播放失败不影响后续正式播放 */
      });
  } catch {
    /* ignore */
  }
  if (canSpeak()) {
    try {
      // Touch speechSynthesis under the same user gesture.
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/** Prefer local Chinese voices — more stable than Edge Online neural. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const s = `${v.name} ${v.lang} ${v.voiceURI}`;
  let n = 0;
  if (/zh(-|_|\s)?cn|cmn|chinese|中文|汉语/i.test(s)) n += 50;
  if (v.localService) n += 40;
  if (/microsoft|google|samsung/i.test(s)) n += 5;
  if (/online|neural/i.test(s)) n -= 20;
  return n;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

export function pickZhVoice(): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return cachedVoice;
  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  cachedVoice = sorted[0] ?? null;
  return cachedVoice;
}

export function warmVoices() {
  if (!canSpeak()) return;
  window.speechSynthesis.getVoices();
  pickZhVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => pickZhVoice());
}

export type SpeakOpts = {
  rate?: number;
  pitch?: number;
  signal?: AbortSignal;
  skipSignal?: AbortSignal;
};

function mediaUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Play pre-generated MP3; supports soft-pause (currentTime kept). */
export function playAudio(url: string, opts?: SpeakOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const audio = getAudio();
    let watchdog: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (watchdog != null) {
        clearInterval(watchdog);
        watchdog = null;
      }
      opts?.signal?.removeEventListener("abort", onAbort);
      opts?.skipSignal?.removeEventListener("abort", onSkip);
      audio.onended = null;
      audio.onerror = null;
    };
    const finishOk = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const finishAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      audio.pause();
      reject(new Error("已暂停"));
    };
    const onAbort = () => finishAbort();
    const onSkip = () => {
      audio.pause();
      try {
        audio.currentTime = audio.duration || 0;
      } catch {
        /* ignore */
      }
      finishOk();
    };

    if (opts?.signal?.aborted) {
      reject(new Error("已暂停"));
      return;
    }
    if (opts?.skipSignal?.aborted) {
      resolve();
      return;
    }
    opts?.signal?.addEventListener("abort", onAbort);
    opts?.skipSignal?.addEventListener("abort", onSkip);

    audio.onended = () => finishOk();
    audio.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("音频播放失败"));
    };

    const src = mediaUrl(url);
    // 无条件重设资源，保证每次播放都从零重新加载。
    // 不能依据 currentSrc 判断「已加载同一音频」而跳过设置：stopSpeaking 清空元素后
    // currentSrc 会残留旧 URL（实测 400ms+），「点当前节点重播」时目标恰等于残留值，
    // 误判会让空元素上的 play() 失败——无声、不报错、当前步被静默跳过。
    try {
      audio.src = src;
      audio.load();
    } catch {
      /* ignore */
    }
    // 讲解音频必须有声（解锁桩等外部状态一律不保留静音），且每次都从头开始：
    // 「点当前节点重播」与「切换进度」效果一致——直接重播该步语音。
    audio.muted = false;
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }

    const tryPlay = () => {
      if (settled) return;
      if (opts?.signal?.aborted) {
        onAbort();
        return;
      }
      if (opts?.skipSignal?.aborted) {
        onSkip();
        return;
      }
      if (softPaused) {
        void awaitSoftPause(opts?.signal).then(tryPlay).catch(finishAbort);
        return;
      }
      void audio.play().catch(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error("音频播放失败"));
        }
      });
    };
    // 看门狗：播放进行中 currentTime 长期停滞（设备异常 / 极端竞态）时按「已播完」放行。
    // 防止 onended 丢失导致讲解循环永久挂起；元素处于暂停或 soft-pause 期间不计停滞。
    let lastT = -1;
    let stale = 0;
    watchdog = setInterval(() => {
      if (settled || audio.paused || softPaused) {
        stale = 0;
        return;
      }
      const t = audio.currentTime;
      if (t > lastT + 0.01) {
        lastT = t;
        stale = 0;
        return;
      }
      stale += 1;
      if (stale >= 3) {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
        finishOk();
      }
    }, 2000);

    tryPlay();
  });
}

function speakOne(text: string, opts?: SpeakOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    // 看门狗：浏览器 TTS 的 onend 偶发丢失（cancel 竞态等）时，按文本长度限时放行，
    // 避免讲解循环永久驻留；soft-pause 期间不计时。
    let elapsed = 0;
    let lastTick = performance.now();
    const maxMs = Math.min(90000, 10000 + text.length * 350);
    let watchdog: ReturnType<typeof setInterval> | null = null;
    const cleanup = () => {
      if (watchdog != null) {
        clearInterval(watchdog);
        watchdog = null;
      }
      opts?.signal?.removeEventListener("abort", onAbort);
      opts?.skipSignal?.removeEventListener("abort", onSkip);
    };
    const startWatchdog = () => {
      if (watchdog != null) return;
      lastTick = performance.now();
      watchdog = setInterval(() => {
        const now = performance.now();
        if (!softPaused) elapsed += now - lastTick;
        lastTick = now;
        if (settled) return;
        if (elapsed >= maxMs) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
          finishOk();
        }
      }, 1000);
    };
    const finishOk = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const finishAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("已暂停"));
    };
    const onAbort = () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      finishAbort();
    };
    const onSkip = () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      finishOk();
    };

    if (opts?.signal?.aborted) {
      reject(new Error("已暂停"));
      return;
    }
    if (opts?.skipSignal?.aborted) {
      resolve();
      return;
    }
    opts?.signal?.addEventListener("abort", onAbort);
    opts?.skipSignal?.addEventListener("abort", onSkip);

    const start = () => {
      if (settled) return;
      if (softPaused) {
        void awaitSoftPause(opts?.signal).then(start).catch(finishAbort);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickZhVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang || "zh-CN";
      } else {
        u.lang = "zh-CN";
      }
      u.rate = opts?.rate ?? 1;
      u.pitch = opts?.pitch ?? 1;
      u.onend = finishOk;
      u.onerror = () => finishOk();
      startWatchdog();
      try {
        window.speechSynthesis.speak(u);
      } catch {
        finishOk();
      }
    };
    start();
  });
}

export async function speak(text: string, opts?: SpeakOpts): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await awaitSoftPause(opts?.signal);

  if (!canSpeak()) {
    await wait(Math.min(12000, Math.max(2500, trimmed.length * 220)), opts?.signal, opts?.skipSignal);
    return;
  }
  if (!window.speechSynthesis.getVoices().length) {
    await wait(200, opts?.signal, opts?.skipSignal);
    pickZhVoice();
  }
  if (opts?.signal?.aborted) throw new Error("已暂停");
  if (opts?.skipSignal?.aborted) return;
  await speakOne(trimmed, opts);
}

/** Prefer cloud URL; fall back to browser TTS. */
export async function narrateText(
  text: string,
  audioUrl: string | undefined | null,
  opts?: SpeakOpts,
): Promise<void> {
  if (!text.trim() && !audioUrl) return;
  await awaitSoftPause(opts?.signal);
  if (audioUrl) {
    try {
      await playAudio(audioUrl, opts);
      return;
    } catch (e) {
      if (opts?.signal?.aborted) throw e;
      if (e instanceof Error && e.message === "已暂停") throw e;
      // fall through to browser
    }
  }
  if (text.trim()) await speak(text, opts);
}

export function wait(ms: number, signal?: AbortSignal, skipSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("已暂停"));
      return;
    }
    if (skipSignal?.aborted) {
      resolve();
      return;
    }
    let left = ms;
    let last = performance.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (signal?.aborted) {
        cleanup();
        reject(new Error("已暂停"));
        return;
      }
      if (skipSignal?.aborted) {
        cleanup();
        resolve();
        return;
      }
      if (softPaused) {
        last = performance.now();
        void awaitSoftPause(signal).then(() => {
          last = performance.now();
          timer = setTimeout(tick, 32);
        }, () => {
          cleanup();
          reject(new Error("已暂停"));
        });
        return;
      }
      const now = performance.now();
      left -= now - last;
      last = now;
      if (left <= 0) {
        cleanup();
        resolve();
        return;
      }
      timer = setTimeout(tick, Math.min(32, left));
    };

    const cleanup = () => {
      if (timer != null) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      skipSignal?.removeEventListener("abort", onSkip);
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("已暂停"));
    };
    const onSkip = () => {
      cleanup();
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    skipSignal?.addEventListener("abort", onSkip, { once: true });
    timer = setTimeout(tick, Math.min(32, ms));
  });
}

export async function animateParams(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
  apply: (p: Record<string, unknown>) => void,
  durationMs: number,
  signal?: AbortSignal,
  skipSignal?: AbortSignal,
): Promise<void> {
  let start = performance.now();
  let pausedAccum = 0;
  const fromN: Record<string, number> = {};
  const toN: Record<string, number> = {};
  for (const [k, v] of Object.entries(to)) {
    const a = Number(from[k]);
    const b = Number(v);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
      fromN[k] = a;
      toN[k] = b;
    }
  }
  // 非数值参数（如流体介质枚举）在动画开始前直接切换
  const switchNow: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(to)) {
    if (v == null) continue;
    const a = Number(from[k]);
    const b = Number(v);
    if (Number.isFinite(a) && Number.isFinite(b)) continue;
    if (v !== from[k]) switchNow[k] = v;
  }
  if (Object.keys(switchNow).length > 0) {
    apply({ ...from, ...switchNow });
  }
  if (Object.keys(toN).length === 0) {
    apply({ ...to });
    return;
  }
  while (true) {
    if (signal?.aborted) throw new Error("已暂停");
    if (skipSignal?.aborted) {
      apply({ ...to });
      return;
    }
    if (softPaused) {
      const pauseAt = performance.now();
      await awaitSoftPause(signal);
      pausedAccum += performance.now() - pauseAt;
    }
    const t = Math.min(1, (performance.now() - start - pausedAccum) / durationMs);
    const eased = t * (2 - t);
    const cur: Record<string, unknown> = { ...to };
    for (const k of Object.keys(toN)) {
      cur[k] = fromN[k] + (toN[k] - fromN[k]) * eased;
    }
    apply(cur);
    if (t >= 1) break;
    await wait(32, signal, skipSignal);
  }
  apply({ ...to });
}
