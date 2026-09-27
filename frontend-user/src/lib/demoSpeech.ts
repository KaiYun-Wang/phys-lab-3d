/** Browser TTS. Prefer Microsoft Online/Neural voices; chunk long text for Chrome. */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

let cachedVoice: SpeechSynthesisVoice | null = null;

/** Score voices: Edge Online/Neural ≫ local Chinese ≫ anything. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const s = `${v.name} ${v.lang} ${v.voiceURI}`;
  let n = 0;
  if (/zh(-|_|\s)?cn|cmn|chinese|中文|汉语/i.test(s)) n += 50;
  if (/online/i.test(s)) n += 40; // Edge cloud neural
  if (/neural/i.test(s)) n += 30;
  if (/natural/i.test(s)) n += 20;
  if (/xiaoxiao|yunxi|xiaoyi|yunyang|xiaoyan|huihui|yaoyao/i.test(s)) n += 25;
  if (/microsoft/i.test(s)) n += 10;
  if (v.localService) n -= 5; // local often more robotic on Chrome
  return n;
}

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

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？；…!?])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [text.trim()].filter(Boolean);
  // Chrome ~15s limit: keep chunks short
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > 80 && buf) {
      out.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + p : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function speakOne(text: string, opts?: SpeakOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let keepAlive: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (startTimer != null) clearTimeout(startTimer);
      if (keepAlive != null) clearInterval(keepAlive);
      opts?.signal?.removeEventListener("abort", onAbort);
      opts?.skipSignal?.removeEventListener("abort", onSkip);
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
      stopSpeaking();
      finishAbort();
    };
    const onSkip = () => {
      stopSpeaking();
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

    // Edge/Chrome: cancel→speak same turn often silent; settle first
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      stopSpeaking();
    }
    startTimer = setTimeout(() => {
      startTimer = null;
      if (settled) return;
      if (opts?.signal?.aborted) {
        onAbort();
        return;
      }
      if (opts?.skipSignal?.aborted) {
        finishOk();
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
      u.rate = opts?.rate ?? 0.95;
      u.pitch = opts?.pitch ?? 1;

      let started = false;
      u.onstart = () => {
        started = true;
      };
      u.onend = finishOk;
      u.onerror = () => finishOk();

      try {
        window.speechSynthesis.speak(u);
        window.speechSynthesis.resume();
        keepAlive = setInterval(() => {
          try {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          } catch {
            /* ignore */
          }
        }, 3000);
        // Edge sometimes never fires onstart/onend — safety timeout
        const ms = Math.min(30000, Math.max(4000, text.length * 280));
        setTimeout(() => {
          if (!settled && !started && !window.speechSynthesis.speaking) finishOk();
        }, ms);
      } catch {
        finishOk();
      }
    }, 180);
  });
}

export async function speak(text: string, opts?: SpeakOpts): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (!canSpeak()) {
    await wait(Math.min(12000, Math.max(2500, trimmed.length * 220)), opts?.signal, opts?.skipSignal);
    return;
  }

  // Ensure voices loaded (Edge often empty on first call)
  if (!window.speechSynthesis.getVoices().length) {
    await wait(250, opts?.signal, opts?.skipSignal);
    pickZhVoice();
  }

  const chunks = splitSentences(trimmed);
  for (const chunk of chunks) {
    if (opts?.signal?.aborted) throw new Error("已暂停");
    if (opts?.skipSignal?.aborted) return;
    await speakOne(chunk, opts);
  }
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
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      skipSignal?.removeEventListener("abort", onSkip);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      skipSignal?.removeEventListener("abort", onSkip);
      reject(new Error("已暂停"));
    };
    const onSkip = () => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    skipSignal?.addEventListener("abort", onSkip, { once: true });
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
  const keys = ["v1", "areaRatio"] as const;
  const start = performance.now();
  const fromN: Record<string, number> = {};
  const toN: Record<string, number> = {};
  for (const k of keys) {
    const a = Number(from[k]);
    const b = Number(to[k]);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
      fromN[k] = a;
      toN[k] = b;
    }
  }
  if (to.fluid != null && to.fluid !== from.fluid) {
    apply({ ...from, fluid: to.fluid });
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
    const t = Math.min(1, (performance.now() - start) / durationMs);
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
