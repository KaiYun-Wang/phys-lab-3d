"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { clamp } from "@/utils/physics";

/**
 * 光电效应 3D 场景
 *
 * 物理模型（理想光电效应）：
 * - 光子能量 E = hν = 1239.84 / λ(eV·nm)
 * - 光电方程 Kmax = E − φ：只有 E > φ 才能逸出光电子
 * - 截止电压 eUc = Kmax；反向电压使光电流自 Uc 起线性衰减到零
 * - 饱和光电流与光强成正比，与波长、电压无关（只要有逸出）
 *
 * 视觉：真空管 + 可切换材料的阴极 K + 阳极 A，光子流（波长决定颜色、
 * 尺寸统一，不承载物理含义）击中阴极后激发电子流；夜灯照明 + 光池。
 */

/* ═══════════════════════ 物理常量与数据 ═══════════════════════ */

const HC = 1239.84; // eV·nm（hν = HC/λ）
/** 饱和光电流系数：光强 100% 时约 9.5 μA（象征值） */
const ISAT_FULL = 9.5;

export interface PhotoMaterial {
  id: string;
  name: string;
  /** 逸出功 φ（eV） */
  phi: number;
  /** 阴极板基色 */
  color: number;
}

export const PHOTO_MATERIALS: PhotoMaterial[] = [
  { id: "cs", name: "铯", phi: 2.1, color: 0xc9c2ae },
  { id: "k", name: "钾", phi: 2.3, color: 0xd3cfc0 },
  { id: "na", name: "钠", phi: 2.4, color: 0xd8d8d8 },
  { id: "ca", name: "钙", phi: 2.9, color: 0xb9b9a8 },
  { id: "zn", name: "锌", phi: 4.3, color: 0x9aa6b0 },
  { id: "cu", name: "铜", phi: 4.7, color: 0xb87333 },
  { id: "pt", name: "铂", phi: 5.6, color: 0xd9dde2 },
];

export function peMaterialById(id: string): PhotoMaterial {
  return PHOTO_MATERIALS.find((m) => m.id === id) ?? PHOTO_MATERIALS[2];
}

export function photonEnergyEv(wavelengthNm: number): number {
  return HC / wavelengthNm;
}

export function stoppingVoltageV(wavelengthNm: number, phi: number): number {
  return Math.max(0, HC / wavelengthNm - phi);
}

export function thresholdWavelengthNm(phi: number): number {
  return HC / phi;
}

/** 饱和光电流（μA）：有逸出才 > 0，正比光强 */
export function saturationCurrentUa(
  wavelengthNm: number,
  phi: number,
  intensityPct: number,
): number {
  if (HC / wavelengthNm <= phi) return 0;
  return (intensityPct / 100) * ISAT_FULL;
}

/** 实际光电流（μA）：反向电压使电流自 Uc 起线性衰减至零 */
export function photocurrentUa(
  wavelengthNm: number,
  phi: number,
  intensityPct: number,
  voltageV: number,
): number {
  const isat = saturationCurrentUa(wavelengthNm, phi, intensityPct);
  if (isat <= 0) return 0;
  if (voltageV >= 0) return isat;
  const vs = Math.max(stoppingVoltageV(wavelengthNm, phi), 0.02);
  return isat * clamp(1 + voltageV / vs, 0, 1);
}

/** 波长 → RGB（UV 段用幽灵紫白，可见段为光谱近似） */
export function waveColor(nm: number): [number, number, number] {
  if (nm < 380) {
    const t = clamp((nm - 200) / 180, 0, 1);
    return [0.72 + 0.22 * t, 0.5 + 0.34 * t, 1.0];
  }
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = -(nm - 440) / 60;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / 65;
  } else {
    r = 1;
  }
  const f = nm > 700 ? 1 - (nm - 700) / 600 : 1;
  return [r * f, g * f, b * f];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.round(clamp(v, 0, 1) * 255);
  return `#${((1 << 24) | (to(r) << 16) | (to(g) << 8) | to(b)).toString(16).slice(1)}`;
}

export function waveColorHex(nm: number): string {
  const [r, g, b] = waveColor(nm);
  return rgbToHex(r, g, b);
}

/* ═══════════════════════ 场景常量 ═══════════════════════ */

const FOG_COLOR = 0x030616;
const TUBE_R = 4.7;
const CATHODE_X = -5.2;
const ANODE_X = 5.2;
const CATHODE_FACE = CATHODE_X + 0.28;
const ANODE_FACE = ANODE_X - 0.28;
const PLATE_R = 3.15;
const LAUNCH_X = -8.5;
const FLOOR_Y = -6.6;

const MAX_PH = 320;
const MAX_EL = 220;
const TRAIL_SEG = 19; // 每个电子 20 个采样点 → 19 段
const MAX_SEG = MAX_EL * TRAIL_SEG;
const MAX_TRAIL_FLOATS = 60; // 20 点 × 3
const RIPPLE_N = 28;
const PHOTON_SIZE = 5.2; // 光子尺寸统一：大小不承载物理含义，波长由颜色区分

export interface PhotoelectricData {
  wavelengthNm: number;
  intensityPct: number;
  voltageV: number;
  materialId: string;
  materialName: string;
  /** 光子能量 hν（eV） */
  photonEnergyEv: number;
  /** 逸出功 φ（eV） */
  workFunctionEv: number;
  /** 最大初动能 Kmax（eV） */
  maxKineticEv: number;
  /** 截止电压 Uc（V） */
  stopVoltageV: number;
  /** 极限波长 λ₀（nm） */
  thresholdNm: number;
  /** 光电流（μA） */
  currentUa: number;
  /** 当前是否发生光电效应 */
  emitting: boolean;
}

interface PhotoelectricSceneProps {
  wavelengthNm?: number;
  intensityPct?: number;
  voltageV?: number;
  materialId?: string;
  isPlaying?: boolean;
  simulationSpeed?: number;
  onDataChange?: (data: PhotoelectricData) => void;
}

/* ═══════════════════════ 纹理工具 ═══════════════════════ */

function makeRadialGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.42, "rgba(255,255,255,0.46)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 深色圆角底板 + 白字的标签纹理（与凸透镜实验的悬浮标签同款，无描边） */
function makeLabelSpriteTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const r = 24;
  const w = 236;
  const h = 116;
  const x = (c.width - w) / 2;
  const y = (c.height - h) / 2;
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.font = "bold 48px 'Microsoft YaHei', 'PingFang SC', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/* ═══════════════════════ 夜灯环境与雾 ═══════════════════════ */

function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = envMap;
    scene.environmentIntensity = 0.52;
    const prevFog = scene.fog;
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.009);
    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
      scene.fog = prevFog;
      envMap.dispose();
    };
  }, [gl, scene]);

  return null;
}

/* ═══════════════════════ 粒子系统（光子/电子/涟漪） ═══════════════════════ */

interface Photon {
  x: number;
  y: number;
  z: number;
  vx: number;
  r: number;
  g: number;
  b: number;
  E: number;
}

interface Electron {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** 扁平化尾迹采样点 [x,y,z, ...] */
  trail: number[];
  tAcc: number;
}

interface RippleState {
  t: number;
  dur: number;
  maxS: number;
  strength: number;
  on: boolean;
}

interface ParticleProps {
  wavelengthNm: number;
  intensityPct: number;
  voltageV: number;
  phi: number;
  isPlaying: boolean;
  simulationSpeed: number;
}

function ParticleSystems({
  wavelengthNm,
  intensityPct,
  voltageV,
  phi,
  isPlaying,
  simulationSpeed,
}: ParticleProps) {
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);

  // ── 每帧读取最新参数，不重建几何 ──
  const propsRef = useRef({ wavelengthNm, intensityPct, voltageV, phi, isPlaying, simulationSpeed });
  propsRef.current = { wavelengthNm, intensityPct, voltageV, phi, isPlaying, simulationSpeed };

  const photonsRef = useRef<Photon[]>([]);
  const electronsRef = useRef<Electron[]>([]);
  const phAccRef = useRef(0);

  // ── 光子：Points + 自定义 shader ──
  const photonSystem = useMemo(() => {
    const pos = new Float32Array(MAX_PH * 3);
    const col = new Float32Array(MAX_PH * 3);
    const size = new Float32Array(MAX_PH);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: 1 } },
      vertexShader: `
        attribute float aSize; attribute vec3 aColor;
        varying vec3 vCol; uniform float uPixelRatio;
        void main(){
          vCol = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mv.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float glow = exp(-d * 6.0) * 0.75;
          gl_FragColor = vec4(vCol * (core + glow), core + glow);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 10;
    return { pos, col, size, geometry, material, points };
  }, []);

  useEffect(() => {
    photonSystem.material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  }, [gl, dpr, photonSystem]);

  // ── 电子：InstancedMesh + 尾迹线段 ──
  const electronSystem = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.085, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: 0x62d9ff });
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_EL);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = 12;
    return { geometry, material, mesh };
  }, []);

  const trailSystem = useMemo(() => {
    const pos = new Float32Array(MAX_SEG * 2 * 3);
    const col = new Float32Array(MAX_SEG * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;
    lines.renderOrder = 11;
    return { pos, col, geometry, material, lines };
  }, []);

  // ── 涟漪池（命中/到达闪光） ──
  const rippleSystem = useMemo(() => {
    const geometry = new THREE.RingGeometry(0.42, 0.6, 40);
    const meshes = Array.from({ length: RIPPLE_N }, () => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.y = Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 13;
      return mesh;
    });
    return { geometry, meshes };
  }, []);
  const rippleStateRef = useRef<RippleState[]>(
    Array.from({ length: RIPPLE_N }, () => ({ t: 0, dur: 0.55, maxS: 1, strength: 1, on: false })),
  );
  const rippleCursorRef = useRef(0);

  // ── 初始化/清理 ──
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    // 初始全部缩到 0，避免首帧出现一团电子
    dummy.position.set(0, 0, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < MAX_EL; i++) electronSystem.mesh.setMatrixAt(i, dummy.matrix);
    electronSystem.mesh.instanceMatrix.needsUpdate = true;
    dummy.scale.setScalar(1);
  }, [dummy, electronSystem]);

  useEffect(
    () => () => {
      photonSystem.geometry.dispose();
      photonSystem.material.dispose();
      electronSystem.geometry.dispose();
      electronSystem.material.dispose();
      trailSystem.geometry.dispose();
      trailSystem.material.dispose();
      rippleSystem.geometry.dispose();
      rippleSystem.meshes.forEach((m) => (m.material as THREE.Material).dispose());
    },
    [photonSystem, electronSystem, trailSystem, rippleSystem],
  );

  // ── 模拟辅助 ──
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const spawnRipple = useMemo(
    () =>
      (x: number, y: number, z: number, color: THREE.Color, maxScale: number, strength: number) => {
        const idx = rippleCursorRef.current % RIPPLE_N;
        rippleCursorRef.current = (rippleCursorRef.current + 1) % RIPPLE_N;
        const st = rippleStateRef.current[idx];
        const mesh = rippleSystem.meshes[idx];
        mesh.position.set(x, y, z);
        (mesh.material as THREE.MeshBasicMaterial).color.copy(color);
        st.t = 0;
        st.maxS = maxScale;
        st.strength = strength;
        st.on = true;
        mesh.visible = true;
        mesh.scale.setScalar(0.3);
      },
    [rippleSystem],
  );

  const spawnElectron = useMemo(
    () =>
      (y: number, z: number, K: number) => {
        const list = electronsRef.current;
        if (list.length >= MAX_EL) return;
        const v0 = 1.6 + Math.sqrt(Math.max(K, 0)) * 4.0 + Math.random() * 0.6;
        list.push({
          x: CATHODE_FACE + 0.04,
          y,
          z,
          vx: v0,
          vy: (Math.random() - 0.5) * 0.56,
          vz: (Math.random() - 0.5) * 0.56,
          trail: [CATHODE_FACE + 0.04, y, z],
          tAcc: 0,
        });
      },
    [],
  );

  useFrame((_, rawDelta) => {
    const p = propsRef.current;
    const dt = Math.min(rawDelta, 0.05);
    if (!p.isPlaying) return;
    const step = dt * p.simulationSpeed;
    const energy = HC / p.wavelengthNm;

    // ── 发射光子 ──
    phAccRef.current += (p.intensityPct / 100) * 60 * step;
    if (phAccRef.current >= 1) {
      const [cr, cg, cb] = waveColor(p.wavelengthNm);
      const list = photonsRef.current;
      while (phAccRef.current >= 1) {
        phAccRef.current -= 1;
        if (list.length >= MAX_PH) continue;
        const rr = Math.sqrt(Math.random()) * 2.2;
        const th = Math.random() * Math.PI * 2;
        list.push({
          x: LAUNCH_X,
          y: Math.cos(th) * rr,
          z: Math.sin(th) * rr,
          vx: 15 + Math.random() * 2.5,
          r: cr,
          g: cg,
          b: cb,
          E: energy,
        });
      }
    }

    // ── 光子飞行与命中 ──
    const photons = photonsRef.current;
    for (let i = photons.length - 1; i >= 0; i--) {
      const ph = photons[i];
      ph.x += ph.vx * step;
      if (ph.x >= CATHODE_FACE) {
        const canEmit = ph.E > p.phi;
        if (Math.random() < 0.34) {
          tmpColor.setRGB(ph.r, ph.g, ph.b);
          spawnRipple(CATHODE_FACE + 0.06, ph.y, ph.z, tmpColor, canEmit ? 1.6 : 1.0, canEmit ? 1.0 : 0.5);
        }
        if (canEmit && Math.random() < 0.55) spawnElectron(ph.y, ph.z, ph.E - p.phi);
        photons.splice(i, 1);
      }
    }

    // ── 电子运动（电场加速度：正电压加速、负电压阻挡） ──
    const accel = p.voltageV * 1.9;
    const electrons = electronsRef.current;
    for (let i = electrons.length - 1; i >= 0; i--) {
      const e = electrons[i];
      e.vx += accel * step;
      e.x += e.vx * step;
      e.y += e.vy * step;
      e.z += e.vz * step;
      e.tAcc += step;
      if (e.tAcc >= 0.02) {
        e.tAcc = 0;
        e.trail.push(e.x, e.y, e.z);
        if (e.trail.length > MAX_TRAIL_FLOATS) e.trail.splice(0, e.trail.length - MAX_TRAIL_FLOATS);
      }
      if (e.x >= ANODE_FACE) {
        if (Math.random() < 0.3) {
          spawnRipple(ANODE_FACE - 0.06, e.y, e.z, tmpColor.setHex(0x5eead4), 0.9, 0.5);
        }
        electrons.splice(i, 1);
        continue;
      }
      if (e.x <= CATHODE_FACE + 0.06 && e.vx <= 0) {
        spawnRipple(CATHODE_FACE + 0.06, e.y, e.z, tmpColor.setHex(0x6a7cff), 0.7, 0.35);
        electrons.splice(i, 1);
      }
    }

    // ── 涟漪扩散 ──
    for (let i = 0; i < RIPPLE_N; i++) {
      const st = rippleStateRef.current[i];
      if (!st.on) continue;
      const mesh = rippleSystem.meshes[i];
      st.t += step;
      const k = Math.min(1, st.t / st.dur);
      mesh.scale.setScalar(0.3 + (st.maxS - 0.3) * (1 - Math.pow(1 - k, 2.2)));
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85 * st.strength;
      if (k >= 1) {
        st.on = false;
        mesh.visible = false;
      }
    }

    // ── 重建粒子缓冲 ──
    let pc = 0;
    const { pos, col, size, geometry: phGeo } = photonSystem;
    for (const ph of photons) {
      pos[pc * 3] = ph.x;
      pos[pc * 3 + 1] = ph.y;
      pos[pc * 3 + 2] = ph.z;
      col[pc * 3] = ph.r;
      col[pc * 3 + 1] = ph.g;
      col[pc * 3 + 2] = ph.b;
      size[pc] = PHOTON_SIZE;
      pc++;
    }
    phGeo.setDrawRange(0, pc);
    (phGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (phGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (phGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;

    dummy.scale.setScalar(1);
    for (let i = 0; i < MAX_EL; i++) {
      if (i < electrons.length) {
        const e = electrons[i];
        dummy.position.set(e.x, e.y, e.z);
        dummy.updateMatrix();
      } else {
        dummy.position.set(0, 0, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        dummy.scale.setScalar(1);
      }
      electronSystem.mesh.setMatrixAt(i, dummy.matrix);
    }
    electronSystem.mesh.instanceMatrix.needsUpdate = true;

    let seg = 0;
    const { pos: trailPos, col: trailCol, geometry: trailGeo } = trailSystem;
    for (const e of electrons) {
      const n = e.trail.length / 3;
      for (let j = 0; j < n - 1 && seg < MAX_SEG; j++) {
        const t0 = j / (n - 1);
        const t1 = (j + 1) / (n - 1);
        const o = seg * 6;
        trailPos[o] = e.trail[j * 3];
        trailPos[o + 1] = e.trail[j * 3 + 1];
        trailPos[o + 2] = e.trail[j * 3 + 2];
        trailPos[o + 3] = e.trail[j * 3 + 3];
        trailPos[o + 4] = e.trail[j * 3 + 4];
        trailPos[o + 5] = e.trail[j * 3 + 5];
        trailCol[o] = 0.3 * t0;
        trailCol[o + 1] = 0.8 * t0;
        trailCol[o + 2] = 1.0 * t0;
        trailCol[o + 3] = 0.3 * t1;
        trailCol[o + 4] = 0.8 * t1;
        trailCol[o + 5] = 1.0 * t1;
        seg++;
      }
    }
    trailGeo.setDrawRange(0, seg * 2);
    (trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (trailGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group>
      <primitive object={photonSystem.points} />
      <primitive object={electronSystem.mesh} />
      <primitive object={trailSystem.lines} />
      {rippleSystem.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

/* ═══════════════════════ 主场景 ═══════════════════════ */

export function PhotoelectricSceneComponent({
  wavelengthNm = 500,
  intensityPct = 60,
  voltageV = 0,
  materialId = "na",
  isPlaying = true,
  simulationSpeed = 1,
  onDataChange,
}: PhotoelectricSceneProps) {
  const material = peMaterialById(materialId);
  const phi = material.phi;
  const energy = photonEnergyEv(wavelengthNm);
  const kMax = Math.max(0, energy - phi);
  const emitting = energy > phi;
  const stopVoltage = stoppingVoltageV(wavelengthNm, phi);
  const lambda0 = thresholdWavelengthNm(phi);
  const currentUa = photocurrentUa(wavelengthNm, phi, intensityPct, voltageV);

  // ── 上报读数（HUD / AI 演示核验） ──
  useEffect(() => {
    onDataChange?.({
      wavelengthNm,
      intensityPct,
      voltageV,
      materialId,
      materialName: material.name,
      photonEnergyEv: energy,
      workFunctionEv: phi,
      maxKineticEv: kMax,
      stopVoltageV: stopVoltage,
      thresholdNm: lambda0,
      currentUa,
      emitting,
    });
  }, [
    wavelengthNm,
    intensityPct,
    voltageV,
    materialId,
    material.name,
    energy,
    phi,
    kMax,
    stopVoltage,
    lambda0,
    currentUa,
    emitting,
    onDataChange,
  ]);

  // ── 静态纹理 ──
  const glowTex = useMemo(makeRadialGlowTexture, []);
  const cathodeLabelTex = useMemo(() => makeLabelSpriteTexture("阴极 K"), []);
  const anodeLabelTex = useMemo(() => makeLabelSpriteTexture("阳极 A"), []);

  // ── 动态材质颜色 ──
  const cathodeColor = useMemo(
    () => new THREE.Color(material.color).multiplyScalar(0.65),
    [material.color],
  );
  const muzzleColor = useMemo(() => {
    const [r, g, b] = waveColor(wavelengthNm);
    return new THREE.Color(r, g, b);
  }, [wavelengthNm]);

  // ── 电场线（电压非零时显现） ──
  const fieldLines = useMemo(
    () =>
      [-2.1, 0, 2.1].map((fy) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(CATHODE_FACE, fy, 0),
          new THREE.Vector3(ANODE_FACE, fy, 0),
        ]);
        return new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: 0x3f7bff, transparent: true, opacity: 0 }),
        );
      }),
    [],
  );
  useEffect(() => {
    const opacity = Math.min(0.42, (Math.abs(voltageV) / 5) * 0.46 + 0.03);
    const color = voltageV >= 0 ? 0x3f7bff : 0xff5677;
    fieldLines.forEach((l) => {
      const m = l.material as THREE.LineBasicMaterial;
      m.opacity = opacity;
      m.color.setHex(color);
    });
  }, [voltageV, fieldLines]);
  useEffect(
    () => () => {
      fieldLines.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
    },
    [fieldLines],
  );

  return (
    <group>
      <EffectComposer>
        <Bloom intensity={0.72} luminanceThreshold={0.58} luminanceSmoothing={0.5} mipmapBlur radius={0.5} />
        <Vignette offset={0.5} darkness={0.6} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      <SceneEnvironment />

      {/* 夜灯光源：容器自带基础灯，这里只补冷暖氛围光与管芯光 */}
      <pointLight position={[-16, 6, -9]} intensity={1.2} color="#4f6bff" distance={55} decay={1.6} />
      <pointLight position={[14, -4, 9]} intensity={0.8} color="#ffa64d" distance={50} decay={1.6} />
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#66aaff" distance={32} decay={1.7} />

      {/* 地板与网格 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[90, 60]} />
        <meshStandardMaterial color="#080b16" roughness={0.92} metalness={0.1} />
      </mesh>
      <gridHelper args={[90, 45, "#3a66c4", "#1a2a56"]} position={[0, FLOOR_Y + 0.02, 0]} />

      {/* 中心柔光光池 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.04, 0]}>
        <planeGeometry args={[76, 48]} />
        <meshBasicMaterial
          map={glowTex}
          color="#3b82f6"
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 真空管（半透明舱体） */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[TUBE_R, TUBE_R, 13.6, 56, 1, true]} />
        <meshPhysicalMaterial
          color="#9db8ff"
          transparent
          opacity={0.045}
          roughness={0.35}
          metalness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 舱体端环与光环 */}
      {[-6.8, 6.8].map((rx) => (
        <mesh key={`ring-${rx}`} rotation={[0, Math.PI / 2, 0]} position={[rx, 0, 0]}>
          <torusGeometry args={[TUBE_R, 0.09, 10, 72]} />
          <meshStandardMaterial color="#394060" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {[-6.72, -2.3, 2.3, 6.72].map((rx) => (
        <mesh key={`glow-ring-${rx}`} rotation={[0, Math.PI / 2, 0]} position={[rx, 0, 0]}>
          <torusGeometry args={[TUBE_R * 0.995, 0.045, 8, 72]} />
          <meshBasicMaterial color="#3fa9ff" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* 阴极板（材料可切换）：磨砂暗金属，避免整片高光 */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[CATHODE_X, 0, 0]}>
        <cylinderGeometry args={[PLATE_R, PLATE_R, 0.5, 48]} />
        <meshStandardMaterial color={cathodeColor} metalness={0.75} roughness={0.68} envMapIntensity={0.1} />
      </mesh>

      {/* 阳极板（普通收集极：与光敏阴极以材质区分） */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[ANODE_X, 0, 0]}>
        <cylinderGeometry args={[PLATE_R, PLATE_R, 0.5, 48]} />
        <meshStandardMaterial color="#5a6480" metalness={0.75} roughness={0.65} envMapIntensity={0.1} />
      </mesh>

      {/* 极板发光边缘环 */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[CATHODE_FACE - 0.01, 0, 0]}>
        <torusGeometry args={[PLATE_R + 0.03, 0.05, 8, 64]} />
        <meshBasicMaterial color="#53c3ff" transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[ANODE_FACE + 0.01, 0, 0]}>
        <torusGeometry args={[PLATE_R + 0.03, 0.05, 8, 64]} />
        <meshBasicMaterial color="#8899ff" transparent opacity={0.6} />
      </mesh>
      {/* 阴极靶面同心环 */}
      {[1.15, 2.2].map((rr) => (
        <mesh key={`concentric-${rr}`} rotation={[0, Math.PI / 2, 0]} position={[CATHODE_FACE - 0.005, 0, 0]}>
          <torusGeometry args={[rr, 0.02, 6, 64]} />
          <meshBasicMaterial color="#74c7ff" transparent opacity={0.26} />
        </mesh>
      ))}

      {/* 阴阳极文字提示 */}
      <sprite position={[CATHODE_X, -4.0, 1.35]} scale={[2.6, 1.3, 1]} renderOrder={10}>
        <spriteMaterial map={cathodeLabelTex} transparent depthTest={false} depthWrite={false} />
      </sprite>
      <sprite position={[ANODE_X, -4.0, 1.35]} scale={[2.6, 1.3, 1]} renderOrder={10}>
        <spriteMaterial map={anodeLabelTex} transparent depthTest={false} depthWrite={false} />
      </sprite>

      {/* 支撑腿 */}
      {[CATHODE_X, ANODE_X].map((lx) => (
        <mesh key={`leg-${lx}`} position={[lx, FLOOR_Y + 1.75, 0]}>
          <cylinderGeometry args={[0.24, 0.34, 3.5, 16]} />
          <meshStandardMaterial color="#2a3352" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}

      {/* 光子发射器 */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-9.8, 0, 0]}>
        <cylinderGeometry args={[1.25, 1.55, 2.4, 24]} />
        <meshStandardMaterial color="#2c3558" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-8.55, 0, 0]}>
        <circleGeometry args={[0.95, 32]} />
        <meshBasicMaterial color={muzzleColor} transparent opacity={0.72} />
      </mesh>

      {/* 电场可视化线 */}
      {fieldLines.map((l, i) => (
        <primitive key={`field-${i}`} object={l} />
      ))}

      {/* 光子 / 电子 / 涟漪粒子系统 */}
      <ParticleSystems
        wavelengthNm={wavelengthNm}
        intensityPct={intensityPct}
        voltageV={voltageV}
        phi={phi}
        isPlaying={isPlaying}
        simulationSpeed={simulationSpeed}
      />
    </group>
  );
}

export default PhotoelectricSceneComponent;
