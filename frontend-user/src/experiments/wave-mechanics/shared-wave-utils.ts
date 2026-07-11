import * as THREE from "three";
import {
  calculateWaveSpeed,
  calculateWaveNumber,
  calculateAngularFrequency,
} from "@/utils/physics";

export const WAVE_COLORS = {
  transverseCrest: "#4f8fff",
  transverseTrough: "#8b5cf6",
  longitudinalDense: "#ff6b35",
  longitudinalSparse: "#ec4899",
  propagation: "#06d6a0",
  equilibrium: "#a0a0c8",
  emissivePeak: "#e8e8ff",
  sceneFog: "#0d0d24",
  platformEdge: "#06d6a0",
  troughDark: "#1a1a3e",
} as const;

export type WaveMedium = "rope" | "air" | "spring";
export type ViewMode = "compare" | "transverse" | "longitudinal" | "overlay";

export interface WaveParams {
  frequency: number;
  amplitude: number;
  wavelength: number;
}

export interface WavePhysics {
  k: number;
  omega: number;
  waveSpeed: number;
}

export interface MediumPreset {
  particleCount: number;
  particleRadius: number;
  transverseAmplitudeScale: number;
  showSprings: boolean;
  chainLength: number;
}

export interface WaveSnapshot {
  time: number;
  frequency: number;
  amplitude: number;
  wavelength: number;
  waveSpeed: number;
  k: number;
  omega: number;
  transverseYMax: number;
  transverseYMin: number;
  longitudinalRhoMax: number;
  longitudinalRhoMin: number;
}

export interface Wavefront {
  emissionTime: number;
  x: number;
}

export interface ShockRing {
  active: boolean;
  startTime: number;
  x: number;
}

const COLOR_CACHE = {
  transverseCrest: new THREE.Color(WAVE_COLORS.transverseCrest),
  transverseTrough: new THREE.Color(WAVE_COLORS.transverseTrough),
  emissivePeak: new THREE.Color(WAVE_COLORS.emissivePeak),
  troughDark: new THREE.Color(WAVE_COLORS.troughDark),
  equilibrium: new THREE.Color(WAVE_COLORS.equilibrium),
  dense: new THREE.Color(WAVE_COLORS.longitudinalDense),
  sparse: new THREE.Color(WAVE_COLORS.longitudinalSparse),
  white: new THREE.Color("#ffffff"),
};

export const MEDIUM_PRESETS: Record<WaveMedium, MediumPreset> = {
  rope: {
    particleCount: 50,
    particleRadius: 0.12,
    transverseAmplitudeScale: 1,
    showSprings: false,
    chainLength: 14,
  },
  air: {
    particleCount: 80,
    particleRadius: 0.08,
    transverseAmplitudeScale: 0.1,
    showSprings: false,
    chainLength: 14,
  },
  spring: {
    particleCount: 50,
    particleRadius: 0.12,
    transverseAmplitudeScale: 1,
    showSprings: true,
    chainLength: 14,
  },
};

export function getWavePhysics(params: WaveParams): WavePhysics {
  return {
    k: calculateWaveNumber(params.wavelength),
    omega: calculateAngularFrequency(params.frequency),
    waveSpeed: calculateWaveSpeed(params.frequency, params.wavelength),
  };
}

export function transverseDisplacement(
  x0: number,
  t: number,
  A: number,
  k: number,
  omega: number
): number {
  return A * Math.sin(k * x0 - omega * t);
}

export function longitudinalDisplacement(
  x0: number,
  t: number,
  A: number,
  k: number,
  omega: number
): number {
  return A * Math.sin(k * x0 - omega * t);
}

export function transverseVelocity(
  x0: number,
  t: number,
  A: number,
  k: number,
  omega: number
): number {
  return -A * omega * Math.cos(k * x0 - omega * t);
}

export function buildEquilibriumPositions(count: number, length: number): Float32Array {
  const positions = new Float32Array(count);
  const spacing = length / (count - 1);
  const start = -length / 2;
  for (let i = 0; i < count; i++) {
    positions[i] = start + i * spacing;
  }
  return positions;
}

export function colorForTransverse(
  y: number,
  A: number,
  target: THREE.Color
): { emissiveIntensity: number } {
  const absY = Math.abs(y);
  const t = A > 1e-6 ? Math.min(absY / A, 1) : 0;

  if (y > 0.05 * A) {
    target.lerpColors(COLOR_CACHE.transverseCrest, COLOR_CACHE.emissivePeak, t);
  } else if (y < -0.05 * A) {
    target.lerpColors(COLOR_CACHE.transverseTrough, COLOR_CACHE.troughDark, t);
  } else {
    target.copy(COLOR_CACHE.equilibrium);
  }

  return { emissiveIntensity: absY > 0.85 * A ? 1.5 : 0.15 };
}

export function colorForLongitudinal(
  rho: number,
  target: THREE.Color
): { emissiveIntensity: number; scale: number } {
  if (rho > 1.05) {
    const t = Math.min((rho - 1) * 5, 1);
    target.lerpColors(COLOR_CACHE.dense, COLOR_CACHE.white, t);
    return { emissiveIntensity: 0.8 + t * 0.5, scale: 1 + t * 0.15 };
  }
  if (rho < 0.95) {
    const t = Math.min((1 - rho) * 5, 1);
    target.lerpColors(COLOR_CACHE.sparse, COLOR_CACHE.troughDark, t);
    return { emissiveIntensity: 0.4 + t * 0.3, scale: 1 - t * 0.15 };
  }
  target.copy(COLOR_CACHE.equilibrium);
  return { emissiveIntensity: 0.15, scale: 1 };
}

export function computeCompressionRatios(
  xPositions: Float32Array,
  d0: number
): Float32Array {
  const n = xPositions.length;
  const rho = new Float32Array(n);
  for (let i = 0; i < n - 1; i++) {
    const di = Math.max(xPositions[i + 1] - xPositions[i], 1e-4);
    rho[i] = d0 / di;
  }
  rho[n - 1] = rho[n - 2] ?? 1;
  return rho;
}

export function phaseLineX(t: number, k: number, omega: number, phase = 0): number {
  if (k < 1e-6) return 0;
  return (omega * t + phase) / k;
}

export function wrapPhaseLineX(x: number, length: number): number {
  const half = length / 2;
  while (x > half) x -= length;
  while (x < -half) x += length;
  return x;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function createWavefrontPool(max: number): Wavefront[] {
  return Array.from({ length: max }, () => ({ emissionTime: -999, x: 0 }));
}

export function createShockRingPool(max: number): ShockRing[] {
  return Array.from({ length: max }, () => ({
    active: false,
    startTime: 0,
    x: 0,
  }));
}

export function spawnWavefront(
  pool: Wavefront[],
  time: number,
  x: number
): void {
  const slot = pool.find((w) => time - w.emissionTime > 6);
  if (slot) {
    slot.emissionTime = time;
    slot.x = x;
  }
}

export function spawnShockRing(
  pool: ShockRing[],
  time: number,
  x: number
): void {
  const active = pool.filter((r) => r.active).length;
  if (active >= 5) return;
  const slot = pool.find((r) => !r.active);
  if (slot) {
    slot.active = true;
    slot.startTime = time;
    slot.x = x;
  }
}

// ponytail: one assert-based self-check for wave math
export function __waveSelfCheck(): boolean {
  const p = getWavePhysics({ frequency: 2, amplitude: 1, wavelength: 4 });
  const y = transverseDisplacement(0, 0, 1, p.k, p.omega);
  return Math.abs(y) < 1e-9 && Math.abs(p.waveSpeed - 8) < 1e-9;
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  console.assert(__waveSelfCheck(), "wave-mechanics physics self-check failed");
}
