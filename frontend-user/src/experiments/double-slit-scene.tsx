"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

interface DoubleSlitSceneProps {
  onDataChange?: (data: DoubleSlitData) => void;
  wavelength?: number;
  slitSeparation?: number;
  slitWidth?: number;
  particleRate?: number;
  isPlaying?: boolean;
  simulationSpeed?: number;
  resetTrigger?: number;
  observerMode?: boolean; // true=particle(collapsed), false=wave(superposition)
}
export interface DoubleSlitData {
  fringeSpacing: number; particleCount: number; wavelength: number; slitSeparation: number; slitWidth: number;
}
interface Particle {
  position: THREE.Vector3; velocity: THREE.Vector3; active: boolean; phase: "source" | "travelling"; birth: number;
}

const particleVS = `attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float uPixelRatio;
void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);
gl_PointSize=aSize*uPixelRatio*(150.0/-mv.z);gl_PointSize=clamp(gl_PointSize,2.0,50.0);gl_Position=projectionMatrix*mv;}`;
const particleFS = `varying float vAlpha;uniform vec3 uColor;
void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;
float core=smoothstep(0.5,0.0,d);float glow=exp(-d*4.0)*0.6;
float a=(core+glow)*vAlpha;vec3 c=mix(uColor,vec3(1.0),core*0.3);gl_FragColor=vec4(c,a);}`;
const trailVS = `attribute float aAlpha;varying float vAlpha;uniform float uPixelRatio;
void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);
gl_PointSize=3.0*uPixelRatio*(100.0/-mv.z);gl_PointSize=clamp(gl_PointSize,1.0,20.0);gl_Position=projectionMatrix*mv;}`;
const trailFS = `varying float vAlpha;uniform vec3 uColor;
void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;
float a=smoothstep(0.5,0.0,d)*vAlpha*0.5;gl_FragColor=vec4(uColor*0.8,a);}`;

const MAX_P = 1400;
const MAX_T = 3000;
/** 每帧最多补发射的粒子数（防止高发射速率下卡顿） */
const MAX_SPAWN_PER_FRAME = 20;
/** 在途粒子硬上限：超出后淘汰最早的，避免高发射速率下无界叠加 */
const MAX_ALIVE = 1400;
/** 粒子飞行速度（单位/秒）：保证 1000 个/秒时在途数不超过上限且能飞到屏 */
const PARTICLE_SPEED = 14;
const TW = 512;
const TH = 512;

/* ═══════════════════════ 视觉辅助（仅观感，不含物理） ═══════════════════════ */

/** 柔和径向辉光贴图：用于光源出射口、缝口、地面光池 */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.42)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 深色圆角底板 + 白字标签（与凸透镜实验的悬浮标签同款，无描边） */
function makeLabelTexture(text: string): THREE.CanvasTexture {
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
  ctx.font = "bold 44px 'Microsoft YaHei', 'PingFang SC', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** 环境光照 + 淡雾：只影响材质观感与空气感，不参与任何计算 */
function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = envMap;
    scene.environmentIntensity = 0.5;
    const prevFog = scene.fog;
    scene.fog = new THREE.FogExp2(0x050a1c, 0.014);
    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
      scene.fog = prevFog;
      envMap.dispose();
    };
  }, [gl, scene]);

  return null;
}

export function DoubleSlitSceneComponent({
  onDataChange, wavelength = 500, slitSeparation = 0.8, slitWidth = 0.15,
  particleRate = 300,
  isPlaying = true, simulationSpeed = 1, resetTrigger, observerMode = true,
}: DoubleSlitSceneProps) {
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const totalRef = useRef(0);
  const hitsRef = useRef<number[]>(new Array(300).fill(0));
  const maxHitRef = useRef(1);
  const waveFadeRef = useRef(0);
  const prevObserverRef = useRef(observerMode);

  const srcX = -10;
  const barX = 0;
  const scrX = 10;
  const plateH = 12;
  const plateW = 12;
  const plateThick = 0.15;
  const slitH = 2.0;
  const scrH = plateH;
  const scrW = plateW;

  const [intensities, setIntensities] = useState<Float32Array>(new Float32Array(300));

  const wHex = useMemo(() => { const h = ((540 - wavelength * 0.6) % 360 + 360) % 360; return `hsl(${h},100%,50%)`; }, [wavelength]);
  const wColor = useMemo(() => { const h = ((540 - wavelength * 0.6) % 360 + 360) % 360; return new THREE.Color().setHSL(h / 360, 1, 0.5); }, [wavelength]);

  // ─── Screen Canvas ─────────────────────────────────────────────
  const cvs = useMemo(() => { const c = document.createElement("canvas"); c.width = TW; c.height = TH; const x = c.getContext("2d")!; x.fillStyle = "#000"; x.fillRect(0, 0, TW, TH); return c; }, []);
  const ctx = useMemo(() => cvs.getContext("2d")!, [cvs]);
  const scrTex = useMemo(() => { const t = new THREE.CanvasTexture(cvs); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; return t; }, [cvs]);

  // ─── Buffers ───────────────────────────────────────────────────
  const pGeo = useMemo(() => { const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(MAX_P), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(MAX_P), 1)); return g; }, []);
  const pMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: particleVS, fragmentShader: particleFS,
    uniforms: { uColor: { value: wColor.clone() }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const tGeo = useMemo(() => { const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_T * 3), 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(MAX_T), 1)); return g; }, []);
  const tMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: trailVS, fragmentShader: trailFS,
    uniforms: { uColor: { value: wColor.clone() }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);

  // ─── Physics ───────────────────────────────────────────────────
  // Scale wavelength for visual fringe spacing: ~10 visible fringes across screen
  const visLambda = useMemo(() => {
    const L = scrX - barX;
    const targetSpacing = scrW / 10;
    return (slitSeparation * targetSpacing) / L;
  }, [slitSeparation, scrX, barX, scrW]);

  const calcI = useCallback((z: number) => {
    const L = scrX - barX; const d = slitSeparation; const a = slitWidth; const lam = visLambda;
    const zn = z / L;
    const intArg = Math.PI * d * zn / lam;
    const inter = Math.cos(intArg) ** 2;
    const difArg = Math.PI * a * zn / lam;
    let diff = 1;
    if (Math.abs(difArg) > 0.0001) { const s = Math.sin(difArg) / difArg; diff = s * s; }
    return inter * diff;
  }, [slitSeparation, slitWidth, visLambda, scrX, barX]);

  const sampleZ = useCallback(() => {
    const r = scrW * 0.45;
    for (let i = 0; i < 200; i++) { const z = (Math.random() - 0.5) * 2 * r; if (Math.random() < calcI(z)) return z; }
    return (Math.random() - 0.5) * scrW * 0.4;
  }, [calcI]);

  useEffect(() => { const lam = wavelength / 10000; const L = scrX - barX; const fs = lam * L / slitSeparation;
    onDataChange?.({ fringeSpacing: fs * 1000, particleCount: totalRef.current, wavelength, slitSeparation, slitWidth });
  }, [wavelength, slitSeparation, slitWidth, onDataChange, intensities]);

  // ─── Reset / 参数变化清屏（挡板打点不再对应新工况） ─────────────
  useEffect(() => {
    particlesRef.current = []; hitsRef.current = new Array(300).fill(0);
    maxHitRef.current = 1; timeRef.current = 0; lastSpawnRef.current = 0; totalRef.current = 0;
    waveFadeRef.current = 0;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, TW, TH); scrTex.needsUpdate = true; setIntensities(new Float32Array(300));
  }, [resetTrigger, ctx, scrTex, observerMode, slitSeparation, slitWidth]);

  // Reset wave fade when switching to wave mode
  useEffect(() => {
    if (!observerMode && prevObserverRef.current) {
      waveFadeRef.current = 0;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, TW, TH); scrTex.needsUpdate = true;
    } else if (observerMode && !prevObserverRef.current) {
      // 切回观测模式：发射基准对齐当前时间，避免瞬间补发粒子
      lastSpawnRef.current = timeRef.current;
    }
    prevObserverRef.current = observerMode;
  }, [observerMode, ctx, scrTex]);

  // Paint dot for particle mode
  const paintDot = useCallback((z: number, y: number) => {
    const u = (z + scrW / 2) / scrW; const v = (y + scrH / 2) / scrH;
    const px = u * TW; const py = (1 - v) * TH;
    const h = ((540 - wavelength * 0.6) % 360 + 360) % 360;
    const g = ctx.createRadialGradient(px, py, 0, px, py, 6);
    g.addColorStop(0, `hsla(${h},100%,85%,1)`);
    g.addColorStop(0.25, `hsla(${h},100%,65%,0.7)`);
    g.addColorStop(0.6, `hsla(${h},100%,45%,0.25)`);
    g.addColorStop(1, `hsla(${h},100%,30%,0)`);
    ctx.fillStyle = g; ctx.fillRect(px - 7, py - 7, 14, 14);
  }, [ctx, scrW, scrH, wavelength]);

  // Draw continuous wave fringes (ImageData for pixel-level control)
  const drawWaveFrings = useCallback((alpha: number) => {
    const img = ctx.createImageData(TW, TH);
    const d = img.data;
    const L = scrX - barX; const lam = visLambda;
    const dd = slitSeparation; const a = slitWidth;
    for (let px = 0; px < TW; px++) {
      const z = ((px / TW) - 0.5) * scrW;
      const zn = z / L;
      const intArg = Math.PI * dd * zn / lam;
      const inter = Math.cos(intArg) ** 2;
      const difArg = Math.PI * a * zn / lam;
      let diff = 1;
      if (Math.abs(difArg) > 0.0001) { const s = Math.sin(difArg) / difArg; diff = s * s; }
      const I = inter * diff;
      const I2 = Math.pow(I, 0.8); // gamma for softer contrast
      const cR = wColor.r, cG = wColor.g, cB = wColor.b;
      // Vertical envelope matching slit height
      const fringeHalfH = (slitH / scrH) * TH + 12;
      const centerPy = TH / 2;
      for (let py = 0; py < TH; py++) {
        const dy = Math.abs(py - centerPy);
        const yEnv = dy < fringeHalfH * 0.7 ? 1.0 : Math.max(0, 1.0 - (dy - fringeHalfH * 0.7) / (fringeHalfH * 0.3));
        const brt = Math.pow(I2, 0.8);
        const yr = Math.floor(255 * (cR * brt + (1 - brt) * 0.05) * alpha * yEnv);
        const ygg = Math.floor(255 * (cG * brt + (1 - brt) * 0.05) * alpha * yEnv);
        const yb = Math.floor(255 * (cB * brt + (1 - brt) * 0.05) * alpha * yEnv);
        const i = (py * TW + px) * 4;
        d[i] = Math.min(255, yr); d[i + 1] = Math.min(255, ygg); d[i + 2] = Math.min(255, yb); d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [ctx, scrW, scrX, barX, slitSeparation, slitWidth, visLambda, wColor]);

  // ─── Animate ───────────────────────────────────────────────────
  useFrame((state, delta) => {
    const el = state.clock.elapsedTime;
    pMat.uniforms.uColor.value.copy(wColor); tMat.uniforms.uColor.value.copy(wColor);
    if (!isPlaying) return;
    const dt = Math.min(delta, 0.033) * simulationSpeed;
    timeRef.current += dt;

    if (observerMode) {
      // ── Particle Mode (camera ON, wavefunction collapsed) ──
      {
        let budget = MAX_SPAWN_PER_FRAME;
        const interval = 1 / particleRate;
        const tt = (scrX - srcX) / PARTICLE_SPEED;
        while (timeRef.current - lastSpawnRef.current > interval && budget-- > 0) {
          const tz = sampleZ(); const vz = tz / tt;
          const vy = (Math.random() - 0.5) * 2.0;
          particlesRef.current.push({ position: new THREE.Vector3(srcX + 1.5, 0, 0),
            velocity: new THREE.Vector3(PARTICLE_SPEED, vy, vz), active: true, phase: "source", birth: el });
          lastSpawnRef.current += interval;
        }
        // 硬上限：淘汰最早的粒子，防止在途数量无界增长
        if (particlesRef.current.length > MAX_ALIVE) {
          particlesRef.current.splice(0, particlesRef.current.length - MAX_ALIVE);
        }
      }
      const pA = pGeo.attributes.position as THREE.BufferAttribute;
      const sA = pGeo.attributes.aSize as THREE.BufferAttribute;
      const aA = pGeo.attributes.aAlpha as THREE.BufferAttribute;
      const tpA = tGeo.attributes.position as THREE.BufferAttribute;
      const taA = tGeo.attributes.aAlpha as THREE.BufferAttribute;
      let pi = 0, ti = 0, ntu = false;
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]; if (!p.active) continue;
        if (ti < MAX_T && p.phase !== "source") {
          tpA.setXYZ(ti, p.position.x - p.velocity.x * dt, p.position.y, p.position.z - p.velocity.z * dt);
          taA.setX(ti, Math.max(0.4 - (el - p.birth) * 0.08, 0.02)); ti++;
        }
        p.position.x += p.velocity.x * dt; p.position.y += p.velocity.y * dt; p.position.z += p.velocity.z * dt;
        if (p.phase === "source" && p.position.x >= barX) {
          const z1 = slitSeparation / 2, z2 = -slitSeparation / 2;
          const inZ = Math.abs(p.position.z - z1) < slitWidth / 2 || Math.abs(p.position.z - z2) < slitWidth / 2;
          const inY = Math.abs(p.position.y) < slitH / 2;
          if (inZ && inY) { p.phase = "travelling"; p.velocity.z += (Math.random() - 0.5) * 0.15; p.velocity.normalize().multiplyScalar(PARTICLE_SPEED); }
          else p.active = false;
        }
        if (p.position.x >= scrX) {
          paintDot(p.position.z, p.position.y); ntu = true;
          const idx = Math.floor(((p.position.z + scrW / 2) / scrW) * 300);
          if (idx >= 0 && idx < 300) { hitsRef.current[idx]++; totalRef.current++; if (hitsRef.current[idx] > maxHitRef.current) maxHitRef.current = hitsRef.current[idx]; }
          p.active = false;
        }
        if (p.active && pi < MAX_P) {
          const f = Math.min((el - p.birth) * 4, 1);
          pA.setXYZ(pi, p.position.x, p.position.y, p.position.z); sA.setX(pi, 0.4); aA.setX(pi, f * 0.9); pi++;
        }
        if (!p.active) particlesRef.current.splice(i, 1);
      }
      for (let i = pi; i < MAX_P; i++) aA.setX(i, 0);
      for (let i = ti; i < MAX_T; i++) taA.setX(i, 0);
      pA.needsUpdate = sA.needsUpdate = aA.needsUpdate = true;
      tpA.needsUpdate = taA.needsUpdate = true;
      pGeo.setDrawRange(0, pi); tGeo.setDrawRange(0, ti);
      if (ntu) scrTex.needsUpdate = true;
    } else {
      // ── Wave Mode (no camera, quantum superposition) ──
      // 波动模式不打粒子：光以波的形式从光源射向双缝（光柱为场景常显元素），
      // 屏上干涉条纹随发射速率逐渐淡入
      particlesRef.current.length = 0;
      pGeo.setDrawRange(0, 0);
      tGeo.setDrawRange(0, 0);
      // 干涉条纹以固定节奏淡入（与发射速率参数无关）
      waveFadeRef.current = Math.min(waveFadeRef.current + dt * 1.5, 1);
      drawWaveFrings(waveFadeRef.current);
      scrTex.needsUpdate = true;
    }
    // 强度数组节流到每 8 帧更新一次 React state（约 7.5Hz，足够 HUD 显示且避免每帧全页重渲染）
    if (frameCountRef.current++ % 8 === 0) {
      const arr = new Float32Array(300);
      for (let i = 0; i < 300; i++) if (maxHitRef.current > 0) arr[i] = hitsRef.current[i] / maxHitRef.current;
      setIntensities(arr);
    }
  });

  const s1Z = slitSeparation / 2;
  const s2Z = -slitSeparation / 2;
  const darkMat = { color: "#141428", metalness: 0.35, roughness: 0.8 } as const;
  const frameMat = { color: "#2a2a4a", metalness: 0.7, roughness: 0.3, clearcoat: 0.4 } as const;

  const camPos: [number, number, number] = [-4, -2, 8];
  const camQuat = useMemo(() => {
    const m = new THREE.Matrix4();
    m.lookAt(new THREE.Vector3(...camPos), new THREE.Vector3(barX, 0, 0), new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [barX]);

  // 视觉用贴图（纯观感）
  const glowTex = useMemo(makeGlowTexture, []);
  const srcLabel = useMemo(() => makeLabelTexture("相干光源"), []);
  const barLabel = useMemo(() => makeLabelTexture("双缝板"), []);
  const scrLabel = useMemo(() => makeLabelTexture("探测屏"), []);
  useEffect(
    () => () => {
      glowTex.dispose();
      srcLabel.dispose();
      barLabel.dispose();
      scrLabel.dispose();
    },
    [glowTex, srcLabel, barLabel, scrLabel],
  );

  return (
    <group>
      <EffectComposer>
        <Bloom intensity={observerMode ? 0.55 : 0.85} luminanceThreshold={observerMode ? 0.62 : 0.42} luminanceSmoothing={0.5} mipmapBlur radius={0.6} />
        <Vignette offset={0.42} darkness={0.58} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      {/* 环境光照 + 淡雾（纯观感） */}
      <SceneEnvironment />

      {/* Lab fill lighting */}
      <pointLight position={[5, 8, 0]} intensity={2.0} color="#ffffff" distance={45} decay={1.5} />
      <pointLight position={[0, 6, 14]} intensity={1.5} color="#e2e8f0" distance={40} decay={1.5} />
      <pointLight position={[0, 5, -12]} intensity={1.2} color="#cbd5e1" distance={40} decay={1.5} />
      <pointLight position={[scrX, 4, 0]} intensity={1.5} color="#ffffff" distance={25} decay={1.5} />
      {/* 冷暖氛围补光（纯观感） */}
      <pointLight position={[-14, 7, -9]} intensity={1.1} color="#4f6bff" distance={40} decay={1.6} />
      <pointLight position={[13, -4, 9]} intensity={0.8} color="#ffa64d" distance={36} decay={1.6} />

      {/* ═══ Ground ═══ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.5, 0]} receiveShadow>
        <planeGeometry args={[35, 25]} />
        <meshStandardMaterial color="#080b18" roughness={0.92} metalness={0.1} envMapIntensity={0.35} />
      </mesh>
      <gridHelper args={[35, 70, "#3358a8", "#152449"]} position={[0, -6.49, 0]} />

      {/* 地面柔光光池（纯观感） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.47, 0]}>
        <planeGeometry args={[30, 22]} />
        <meshBasicMaterial
          map={glowTex}
          color="#3b82f6"
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ═══ Particle Source ═══ */}
      <group position={[srcX, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.6, 0.7, 2.5, 24]} />
          <meshPhysicalMaterial {...darkMat} />
        </mesh>
        <mesh position={[-1.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.08, 24]} />
          <meshPhysicalMaterial color="#1a1a38" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[1.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.45, 0.04, 8, 24]} />
          <meshStandardMaterial color={wHex} emissive={wHex} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[1.3, 0, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshBasicMaterial color={wHex} transparent opacity={0.6} />
        </mesh>
        {/* 出射口辉光 + 标签（纯观感） */}
        <mesh position={[1.55, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial
            map={glowTex}
            color={wHex}
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <sprite position={[0, 1.7, 0]} scale={[2.8, 1.4, 1]} renderOrder={20}>
          <spriteMaterial map={srcLabel} transparent depthTest={false} depthWrite={false} />
        </sprite>
        <pointLight color={wHex} intensity={2} distance={6} decay={2} />
      </group>

      {/* Beam axis — 手电筒式光锥：光源射向双缝，光斑抱住双缝落于板面 */}
      <mesh position={[(srcX + 1.5 + barX) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 1.3, barX - srcX - 1.5, 24, 1, true]} />
        <meshBasicMaterial
          color={wHex}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[(srcX + 1.5 + barX) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.6, barX - srcX - 1.5, 20, 1, true]} />
        <meshBasicMaterial
          color={wHex}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 缝板落点光斑（手电筒打上去的亮斑） */}
      <mesh position={[-0.1, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial
          map={glowTex}
          color={wHex}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ═══ Barrier ═══ */}
      <group position={[barX, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[plateThick, plateH, plateW]} />
          <meshPhysicalMaterial {...darkMat} />
        </mesh>
        {[s1Z, s2Z].flatMap((sz, i) => [
          <mesh key={`sc${i}f`} position={[plateThick / 2 + 0.005, 0, sz]}>
            <boxGeometry args={[0.01, slitH, slitWidth]} /><meshBasicMaterial color="#020208" />
          </mesh>,
          <mesh key={`sc${i}b`} position={[-plateThick / 2 - 0.005, 0, sz]}>
            <boxGeometry args={[0.01, slitH, slitWidth]} /><meshBasicMaterial color="#020208" />
          </mesh>,
        ])}
        {[s1Z, s2Z].flatMap((sz, si) => [
          <mesh key={`se${si}a`} position={[plateThick / 2 + 0.01, 0, sz - slitWidth / 2]}>
            <boxGeometry args={[0.005, slitH + 0.08, 0.005]} /><meshBasicMaterial color={wHex} transparent opacity={0.5} />
          </mesh>,
          <mesh key={`se${si}b`} position={[plateThick / 2 + 0.01, 0, sz + slitWidth / 2]}>
            <boxGeometry args={[0.005, slitH + 0.08, 0.005]} /><meshBasicMaterial color={wHex} transparent opacity={0.5} />
          </mesh>,
          <mesh key={`se${si}c`} position={[plateThick / 2 + 0.01, slitH / 2, sz]}>
            <boxGeometry args={[0.005, 0.005, slitWidth + 0.04]} /><meshBasicMaterial color={wHex} transparent opacity={0.3} />
          </mesh>,
          <mesh key={`se${si}d`} position={[plateThick / 2 + 0.01, -slitH / 2, sz]}>
            <boxGeometry args={[0.005, 0.005, slitWidth + 0.04]} /><meshBasicMaterial color={wHex} transparent opacity={0.3} />
          </mesh>,
        ])}
        {/* 缝口柔和辉光（纯观感） */}
        {[s1Z, s2Z].map((sz, si) => (
          <mesh key={`sg${si}`} position={[plateThick / 2 + 0.06, 0, sz]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[slitH * 2.4, slitH * 2.4]} />
            <meshBasicMaterial
              map={glowTex}
              color={wHex}
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
        {/* 板标签（纯观感） */}
        <sprite position={[0, plateH / 2 + 1.2, 0]} scale={[3, 1.5, 1]} renderOrder={20}>
          <spriteMaterial map={barLabel} transparent depthTest={false} depthWrite={false} />
        </sprite>
      </group>

      {/* Beam axis (barrier → screen) */}
      <mesh position={[(barX + scrX) / 2, 0, 0]}>
        <boxGeometry args={[scrX - barX, 0.008, 0.008]} />
        <meshBasicMaterial color="#222" transparent opacity={0.06} />
      </mesh>

      {/* ═══ Observer Camera (source side, watching which slit particles enter) ═══ */}
      <group position={camPos} quaternion={camQuat}>
        {/* Camera body */}
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.6, 1.3]} />
          <meshPhysicalMaterial color="#1c1c32" metalness={0.65} roughness={0.35} />
        </mesh>
        {/* Lens barrel */}
        <mesh position={[0, 0, -0.85]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.5, 16]} />
          <meshPhysicalMaterial color="#0e0e20" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Lens glass */}
        <mesh position={[0, 0, -1.12]}>
          <circleGeometry args={[0.2, 16]} />
          <meshPhysicalMaterial color="#1a1a44" metalness={0.1} roughness={0.1} transparent opacity={0.8} />
        </mesh>
        {/* Viewfinder */}
        <mesh position={[0.2, 0.42, 0.1]}>
          <boxGeometry args={[0.3, 0.2, 0.35]} />
          <meshPhysicalMaterial color="#1a1a30" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Tripod pole */}
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.5} />
        </mesh>
        {/* Tripod base */}
        <mesh position={[0, -2.1, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* Recording LED */}
        <mesh position={[0.35, 0.35, -0.6]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={observerMode ? "#ff2222" : "#331111"} />
        </mesh>
        {/* REC label */}
        <mesh position={[0.35, 0.22, -0.6]}>
          <planeGeometry args={[0.22, 0.08]} />
          <meshBasicMaterial color={observerMode ? "#ff0000" : "#220000"} transparent opacity={observerMode ? 0.7 : 0.2} />
        </mesh>
        {observerMode && <pointLight position={[0.35, 0.35, -0.6]} color="#ff0000" intensity={0.4} distance={2} decay={2} />}
        {/* Observation beam (only when active) */}
        {observerMode && (
          <mesh position={[0, 0, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[2.5, 6, 16, 1, true]} />
            <meshBasicMaterial color="#ff2222" transparent opacity={0.025} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>

      {/* ═══ Detection Screen ═══ */}
      <group position={[scrX, 0, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[plateThick, plateH, plateW]} />
          <meshPhysicalMaterial color={observerMode ? "#0c0c22" : "#050512"} metalness={0.1} roughness={0.7} transparent opacity={observerMode ? 0.88 : 0.95} />
        </mesh>
        {/* Canvas fringe texture — LEFT face only */}
        <mesh position={[-plateThick / 2 - 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[plateW, plateH]} />
          <meshBasicMaterial map={scrTex} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        {/* Frame */}
        <mesh position={[0, plateH / 2 + 0.1, 0]}><boxGeometry args={[0.2, 0.18, plateW + 0.3]} /><meshPhysicalMaterial {...frameMat} /></mesh>
        <mesh position={[0, -plateH / 2 - 0.1, 0]}><boxGeometry args={[0.2, 0.18, plateW + 0.3]} /><meshPhysicalMaterial {...frameMat} /></mesh>
        <mesh position={[0, 0, -plateW / 2 - 0.1]}><boxGeometry args={[0.2, plateH + 0.4, 0.18]} /><meshPhysicalMaterial {...frameMat} /></mesh>
        <mesh position={[0, 0, plateW / 2 + 0.1]}><boxGeometry args={[0.2, plateH + 0.4, 0.18]} /><meshPhysicalMaterial {...frameMat} /></mesh>
        {/* Mode label */}
        <mesh position={[0, plateH / 2 + 0.5, 0]}>
          <planeGeometry args={[5, 0.6]} />
          <meshBasicMaterial color={observerMode ? "#442222" : "#224422"} transparent opacity={0.4} />
        </mesh>
        {/* 屏标签（纯观感） */}
        <sprite position={[0, plateH / 2 + 1.5, 0]} scale={[3, 1.5, 1]} renderOrder={20}>
          <spriteMaterial map={scrLabel} transparent depthTest={false} depthWrite={false} />
        </sprite>
      </group>

      {/* ═══ Particles ═══ */}
      <points geometry={pGeo} material={pMat} />
      <points geometry={tGeo} material={tMat} />
    </group>
  );
}

export default DoubleSlitSceneComponent;
