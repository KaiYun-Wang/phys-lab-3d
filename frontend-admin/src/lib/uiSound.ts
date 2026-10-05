/**
 * 界面微交互音效（Web Audio 实时合成，零素材 / 零依赖）
 *
 * - hover tick：滑过菜单/按钮的轻「嗒」，快速划过连成滑块声（内部 45ms 限流）
 * - press：点击按压的闷响「噗」，比 tick 更低更沉
 * - 默认开启，开关持久化 localStorage；受浏览器 autoplay 策略影响，
 *   首次真实点击（pointerdown）后才可能出声——AdminShell 已挂首次手势解锁
 *
 * 基准：DESIGN-style-guide.md §五 微交互（音量轻，不喧宾夺主）
 */

const STORAGE_KEY = "physlab-admin-ui-sound";
/** 快速滑过时两次 tick 的最小间隔（ms），防止叠成噪音 */
const TICK_MIN_GAP = 45;

let enabled = true;
let initialized = false;
let ctx: AudioContext | null = null;
let lastTickAt = 0;
const listeners = new Set<(on: boolean) => void>();

function notify() {
  listeners.forEach((fn) => fn(enabled));
}

/** 读取持久化偏好（幂等；须在客户端 effect 中调用） */
export function initSoundPreference() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "off") enabled = false;
  } catch {
    /* 隐私模式下 localStorage 不可用：保持默认开 */
  }
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* 忽略写入失败 */
  }
  notify();
}

export function subscribeSound(fn: (on: boolean) => void) {
  listeners.add(fn);
  fn(enabled); // 订阅时立即同步当前值
  return () => {
    listeners.delete(fn);
  };
}

/** 在真实用户手势中调用，提前解锁音频（autoplay 策略） */
export function unlockAudio() {
  getCtx();
}

function getCtx(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  if (!ctx) {
    if (!window.AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

let noiseBuf: AudioBuffer | null = null;

/** 复用同一段白噪声（提供实体按键的「块/嗒」质感） */
function getNoiseBuf(c: AudioContext) {
  if (!noiseBuf) {
    const len = Math.ceil(c.sampleRate * 0.06);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/**
 * 合成一次苹果式短音：固定音高（无滑音——滑音会听成「楸」）
 * + 极短高频噪声（「块/嗒」的实体质感）
 */
function blip(c: AudioContext, freq: number, vol: number, dur: number, noiseVol: number) {
  const t = c.currentTime;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);

  if (noiseVol > 0) {
    const src = c.createBufferSource();
    src.buffer = getNoiseBuf(c);
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(4200, t);
    band.Q.setValueAtTime(0.8, t);
    const ng = c.createGain();
    ng.gain.setValueAtTime(noiseVol, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
    src.connect(band);
    band.connect(ng);
    ng.connect(c.destination);
    src.start(t);
    src.stop(t + 0.02);
  }
}

/** 滑过菜单/按钮：短促清脆「嗒」（固定 2.4kHz；45ms 限流防叠成噪音） */
export function playHoverTick() {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastTickAt < TICK_MIN_GAP) return;
  lastTickAt = now;

  const c = getCtx();
  if (!c) return;
  blip(c, 2400, 0.05, 0.03, 0.016);
}

/** 点击按压：低一度、更沉的「嗒」（固定 1.2kHz） */
export function playPress() {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  blip(c, 1150, 0.06, 0.06, 0.02);
}
