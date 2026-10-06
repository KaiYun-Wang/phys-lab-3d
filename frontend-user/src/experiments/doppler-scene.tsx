"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { clamp } from "@/utils/physics";
import { SceneLabelSprite } from "./scene-labels";

/**
 * 多普勒效应 3D 场景（声学全息舞台）
 *
 * 物理模型：
 * - 声源沿主光轴往复振荡，峰值速度 = 源速度滑块（vₛ），波速 v 独立可调
 * - 每个波前记录发射点与发射时刻，半径 r = (t − t_emit)·v，形成同心圆波阵
 * - 声源运动方向前方的波环被压缩（波长缩短 → 蓝移），后方被拉开（红移）
 * - 观察者频移：f′ = f₀·v/(v ∓ vₛ)，马赫数 M = |vₛ|/v ≥ 1 时出现马赫锥
 *
 * 视觉：
 * - 波环着色按「环上各点相对运动方向的余弦」连续插值：前方弧段蓝白、后方淡红，
 *   声源往返时整场颜色随之流动（与观察者接收到的频移方向自洽）
 * - 声源 = 脉冲信标（脉冲与发射节奏同步），带运动拖尾
 * - 观察者 = 接收示波塔，悬浮屏实时绘制接收波形（波峰间距 ∝ f′/f₀）
 * - 全部动画在 useFrame 内命令式更新，不做逐帧 React 重渲染
 */

interface DopplerSceneProps {
  onDataChange?: (data: DopplerData) => void;
  sourceFrequency?: number;
  sourceVelocity?: number;
  observerPosition?: number; // x position
  waveSpeed?: number;
  resetTrigger?: number;
  isPlaying?: boolean;
  simulationSpeed?: number;
}

export interface DopplerData {
  sourceFrequency: number;
  observedFrequency: number;
  dopplerShiftRatio: number;
  machNumber: number;
  waveSpeed: number;
  shiftType: "blueshift" | "redshift" | "none";
}

/** 供子组件共享的可变数值引用 */
interface NumRef {
  current: number;
}

interface WaveRecord {
  emissionX: number;
  emissionTime: number;
  /** 波是否已扫过观察者（用于到达闪光，只触发一次） */
  arrived: boolean;
}

interface WavesRef {
  current: WaveRecord[];
}

/* ═══════════════════════ 场景常量 ═══════════════════════ */

const FOG_COLOR = 0x030616;
/** 全息光场地面高度 */
const STAGE_Y = -2.1;
/** 声源与波环所在水平面 */
const WAVE_Y = 0;
/** 波环最大半径，超出后淡出回收 */
const WAVE_MAX_RADIUS = 40;
/** 波环对象池容量 */
const MAX_WAVES = 26;
/** 声源往复振荡角频率（峰值速度 = 滑块值） */
const OSC_SPEED = 0.5;
/** 波环环带半宽（世界单位） */
const RING_HALF_W = 0.1;
/** 拖尾粒子池容量 */
const TRAIL_MAX = 150;
/** 马赫锥母线长度（世界单位） */
const CONE_LEN = 26;
/** 马赫锥最大底半径 */
const CONE_MAX_R = 34;

/** 波环三色（全站规范：sky / 白热蓝 / 红移淡红） */
const RING_NEUTRAL = "#38bdf8";
const RING_BLUE = "#bae6fd";
const RING_RED = "#fca5a5";

/* ═══════════════════════ 纹理与材质工具 ═══════════════════════ */

/** 径向渐变柔光纹理（中心光池 / 基座光斑共用） */
function makeRadialGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
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
    scene.environmentIntensity = 0.45;
    const prevFog = scene.fog;
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.01);
    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
      scene.fog = prevFog;
      envMap.dispose();
    };
  }, [gl, scene]);

  return null;
}

/* ═══════════════════════ 波环场（核心视觉） ═══════════════════════ */

/**
 * 波环对象池：每个波环是一块 1×1 的平面（ShaderMaterial 画环带）。
 * 每帧按半径缩放平面（平面半宽 = 半径 + 余量），环宽在归一化空间换算，
 * 保证世界空间下环带宽恒定、且 overdraw 随半径增长而非固定铺满全屏。
 */
function RingField({
  wavesRef,
  timeRef,
  compressRef,
  waveSpeed,
}: {
  wavesRef: WavesRef;
  timeRef: NumRef;
  compressRef: NumRef;
  waveSpeed: number;
}) {
  const pool = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const meshes = Array.from({ length: MAX_WAVES }, () => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uRingR: { value: 0 },
          uRingW: { value: 0.02 },
          uOpacity: { value: 0 },
          uCompress: { value: 0 },
          uColorNeutral: { value: new THREE.Color(RING_NEUTRAL) },
          uColorBlue: { value: new THREE.Color(RING_BLUE) },
          uColorRed: { value: new THREE.Color(RING_RED) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uRingR;
          uniform float uRingW;
          uniform float uOpacity;
          uniform float uCompress;
          uniform vec3 uColorNeutral;
          uniform vec3 uColorBlue;
          uniform vec3 uColorRed;

          void main() {
            vec2 uv2 = vUv - 0.5;
            float nd = length(uv2) * 2.0;      // 0 = 环心，1 = 平面边缘
            float delta = nd - uRingR;
            float ad = abs(delta);
            float core = 1.0 - smoothstep(0.0, uRingW, ad);
            float glow = exp(-ad / (uRingW * 2.4)) * 0.5;
            float mask = core + glow;
            if (mask < 0.004) discard;

            // 方向性频移着色：环上各点相对运动方向（+x）的余弦
            float dir = nd > 1e-4 ? uv2.x / (nd * 0.5) : 0.0;
            float shift = dir * uCompress;     // >0 = 压缩（蓝移）
            float blueAmt = clamp(shift, 0.0, 1.0);
            float redAmt = clamp(-shift, 0.0, 1.0);
            vec3 col = uColorNeutral;
            col = mix(col, uColorBlue, blueAmt);
            col = mix(col, uColorRed, redAmt);
            // 压缩侧波列密集 → 能量集中提亮
            float energy = 1.0 + 0.85 * max(blueAmt, redAmt);
            float brightness = core * 1.9 + glow;

            gl_FragColor = vec4(col * brightness * energy, mask * uOpacity);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 5;
      return { mesh, material };
    });
    return { geometry, meshes };
  }, []);

  useEffect(
    () => () => {
      pool.geometry.dispose();
      pool.meshes.forEach((m) => m.material.dispose());
    },
    [pool],
  );

  useFrame(() => {
    const waves = wavesRef.current;
    const t = timeRef.current;
    const compress = compressRef.current;
    for (let i = 0; i < MAX_WAVES; i++) {
      const slot = pool.meshes[i];
      const wave = waves[i];
      if (!wave) {
        slot.mesh.visible = false;
        continue;
      }
      const radius = (t - wave.emissionTime) * waveSpeed;
      if (radius >= WAVE_MAX_RADIUS || radius < 0) {
        slot.mesh.visible = false;
        continue;
      }
      const half = Math.max(radius + 4, 5);
      slot.mesh.visible = true;
      slot.mesh.position.set(wave.emissionX, WAVE_Y, 0);
      slot.mesh.scale.setScalar(half * 2);
      slot.material.uniforms.uRingR.value = radius / half;
      slot.material.uniforms.uRingW.value = RING_HALF_W / half;
      slot.material.uniforms.uOpacity.value =
        0.9 * clamp(1 - radius / WAVE_MAX_RADIUS, 0, 1);
      slot.material.uniforms.uCompress.value = compress;
    }
  });

  return (
    <group>
      {pool.meshes.map((slot, i) => (
        <primitive key={i} object={slot.mesh} />
      ))}
    </group>
  );
}

/* ═══════════════════════ 声源：脉冲信标 ═══════════════════════ */

function PulseSource({
  sourceXRef,
  sourceVelRef,
  timeRef,
  sourceFrequency,
  waveSpeed,
}: {
  sourceXRef: NumRef;
  sourceVelRef: NumRef;
  timeRef: NumRef;
  sourceFrequency: number;
  waveSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const shaftRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = timeRef.current;
    const v = sourceVelRef.current;
    groupRef.current?.position.set(sourceXRef.current, WAVE_Y, 0);

    // 脉冲闪光与发射节奏同步：phase 的小数部分即距上次发射的时间占比
    const frac = (t * sourceFrequency) % 1;
    const flash = Math.exp(-frac * 5.5);

    if (coreMatRef.current) coreMatRef.current.emissiveIntensity = 1.6 + flash * 4.2;
    if (coreRef.current) coreRef.current.scale.setScalar(1 + flash * 0.24);
    if (glowMatRef.current) glowMatRef.current.opacity = 0.1 + flash * 0.22;
    if (ringMatRef.current) ringMatRef.current.opacity = 0.4 + flash * 0.45;

    // 外壳缓慢自转，信标感
    if (shellRef.current) {
      shellRef.current.rotation.y = t * 0.5;
      shellRef.current.rotation.z = Math.sin(t * 0.35) * 0.25;
    }

    // 速度矢量箭头：长度随速度，方向随运动翻转
    const arrow = arrowRef.current;
    if (arrow) {
      const speedT = clamp(Math.abs(v) / Math.max(waveSpeed, 1), 0, 1.6);
      const len = 1.15 + speedT * 5.2;
      arrow.visible = Math.abs(v) > 0.15;
      arrow.rotation.y = v >= 0 ? 0 : Math.PI;
      if (shaftRef.current) {
        shaftRef.current.scale.y = len;
        shaftRef.current.position.x = len / 2;
      }
      if (tipRef.current) tipRef.current.position.x = len + 0.22;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 发光内核（脉冲白热） */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.46, 32, 32]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color="#fff4e0"
          emissive="#ffb84d"
          emissiveIntensity={1.6}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* 外壳：三道正交金属环（陀螺仪造型） */}
      <group ref={shellRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.78, 0.05, 12, 48]} />
          <meshStandardMaterial color="#4a5470" metalness={0.9} roughness={0.32} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <torusGeometry args={[0.78, 0.05, 12, 48]} />
          <meshStandardMaterial color="#4a5470" metalness={0.9} roughness={0.32} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.78, 0.05, 12, 48]} />
          <meshStandardMaterial color="#4a5470" metalness={0.9} roughness={0.32} />
        </mesh>
      </group>

      {/* 发光信标环（脉冲呼吸） */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.02, 0.022, 8, 64]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#fbbf24"
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* 柔光包围（Bloom 拾取） */}
      <mesh>
        <sphereGeometry args={[1.35, 24, 24]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color="#f59e0b"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 速度矢量箭头 */}
      <group ref={arrowRef} visible={false}>
        <mesh ref={shaftRef} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 1, 8]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.85} />
        </mesh>
        <mesh ref={tipRef} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.16, 0.44, 12]} />
          <meshBasicMaterial color="#7dd3fc" />
        </mesh>
      </group>

      {/* 悬浮标签：声源（跟随往复运动） */}
      <SceneLabelSprite text="声源" position={[0, 2.3, 0]} height={1.1} />
    </group>
  );
}

/* ═══════════════════════ 声源拖尾粒子 ═══════════════════════ */

interface TrailParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

function SourceTrail({
  sourceXRef,
  sourceVelRef,
  waveSpeed,
  isPlaying,
}: {
  sourceXRef: NumRef;
  sourceVelRef: NumRef;
  waveSpeed: number;
  isPlaying: boolean;
}) {
  const particlesRef = useRef<TrailParticle[]>([]);
  const accRef = useRef(0);

  const system = useMemo(() => {
    const pos = new Float32Array(TRAIL_MAX * 3);
    const col = new Float32Array(TRAIL_MAX * 3);
    const size = new Float32Array(TRAIL_MAX);
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
          gl_PointSize = clamp(gl_PointSize, 1.0, 32.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol * core, core);
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

  const gl = useThree((s) => s.gl);
  useEffect(() => {
    system.material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  }, [gl, system]);

  useEffect(
    () => () => {
      system.geometry.dispose();
      system.material.dispose();
    },
    [system],
  );

  useFrame((_, rawDelta) => {
    if (!isPlaying) return;
    const dt = Math.min(rawDelta, 0.05);
    const list = particlesRef.current;
    const sx = sourceXRef.current;
    const speedRatio = Math.abs(sourceVelRef.current) / Math.max(waveSpeed, 1);

    // 拖尾发射速率随速度提升
    const rate = 14 + 90 * clamp(speedRatio, 0, 1.6);
    accRef.current += rate * dt;
    while (accRef.current >= 1) {
      accRef.current -= 1;
      if (list.length >= TRAIL_MAX) break;
      const rr = Math.sqrt(Math.random()) * 0.55;
      const th = Math.random() * Math.PI * 2;
      list.push({
        x: sx + Math.cos(th) * rr,
        y: WAVE_Y + (Math.random() - 0.5) * 0.6,
        z: Math.sin(th) * rr,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.7,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.5,
      });
    }

    // 粒子推进与寿命
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }

    // 重建缓冲（琥珀色随寿命衰减）
    const { pos, col, size, geometry } = system;
    let c = 0;
    for (const p of list) {
      const lt = 1 - p.life / p.maxLife;
      pos[c * 3] = p.x;
      pos[c * 3 + 1] = p.y;
      pos[c * 3 + 2] = p.z;
      col[c * 3] = 0.984 * lt;
      col[c * 3 + 1] = 0.749 * lt;
      col[c * 3 + 2] = 0.141 * lt;
      size[c] = 1.4 + 2.4 * lt;
      c++;
    }
    geometry.setDrawRange(0, c);
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  });

  return <primitive object={system.points} />;
}

/* ═══════════════════════ 观察者：接收示波塔 ═══════════════════════ */

interface ArrivalRipple {
  on: boolean;
  t: number;
  material: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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
}

function ObserverTower({
  observerX,
  wavesRef,
  timeRef,
  ratioRef,
  shiftRef,
  waveSpeed,
  isPlaying,
  simulationSpeed,
}: {
  observerX: number;
  wavesRef: WavesRef;
  timeRef: NumRef;
  ratioRef: NumRef;
  shiftRef: NumRef;
  waveSpeed: number;
  isPlaying: boolean;
  simulationSpeed: number;
}) {
  const flashRef = useRef(0);
  const scopePhaseRef = useRef(0);
  const sensorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringGroupRef = useRef<THREE.Group>(null);

  // 到达涟漪池
  const ripples = useMemo<ArrivalRipple[]>(() => {
    const geometry = new THREE.RingGeometry(0.92, 1, 64);
    return Array.from({ length: 4 }, () => {
      const material = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = WAVE_Y + 0.02;
      mesh.visible = false;
      mesh.renderOrder = 9;
      return { on: false, t: 0, material, mesh };
    });
  }, []);
  const rippleCursorRef = useRef(0);

  useEffect(
    () => () => {
      ripples.forEach((r) => {
        r.mesh.geometry.dispose();
        r.material.dispose();
      });
    },
    [ripples],
  );

  // 示波屏画布
  const scope = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    return { canvas, ctx, texture };
  }, []);

  useEffect(() => () => scope.texture.dispose(), [scope]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = timeRef.current;
    const waves = wavesRef.current;

    // ── 波到达检测：半径越过「发射点到观察者」的距离时触发一次闪光 ──
    for (const w of waves) {
      if (w.arrived) continue;
      const dist = Math.abs(observerX - w.emissionX);
      const radius = (t - w.emissionTime) * waveSpeed;
      if (radius >= dist) {
        w.arrived = true;
        flashRef.current = 1;
        const rp = ripples[rippleCursorRef.current % ripples.length];
        rippleCursorRef.current = (rippleCursorRef.current + 1) % ripples.length;
        rp.on = true;
        rp.t = 0;
        rp.mesh.visible = true;
        // 涟漪颜色跟随观察者接收到的频移方向
        rp.material.color.set(shiftRef.current >= 0 ? "#7dd3fc" : "#fca5a5");
      }
    }
    flashRef.current = Math.max(0, flashRef.current - dt * 3.4);

    // ── 感应球 / 环随闪光脉冲 ──
    const flash = flashRef.current;
    if (sensorMatRef.current) sensorMatRef.current.emissiveIntensity = 0.9 + flash * 3.2;
    if (ringMatRef.current) ringMatRef.current.opacity = 0.3 + flash * 0.55;
    if (ringGroupRef.current) {
      const s = 1 + flash * 0.08;
      ringGroupRef.current.scale.setScalar(s);
    }

    // ── 涟漪推进 ──
    for (const rp of ripples) {
      if (!rp.on) continue;
      rp.t += dt * 1.9;
      if (rp.t >= 1) {
        rp.on = false;
        rp.mesh.visible = false;
        continue;
      }
      const k = rp.t;
      rp.mesh.scale.setScalar(0.9 + k * 4.6);
      rp.material.opacity = (1 - k) * 0.65;
    }

    // ── 示波屏：波形密度 ∝ f′/f₀，滚动相位随接收频率推进 ──
    if (isPlaying) {
      scopePhaseRef.current += dt * simulationSpeed * (1.5 + 7.5 * clamp(ratioRef.current, 0, 2.4));
    }
    const { canvas, ctx, texture } = scope;
    const W = canvas.width;
    const H = canvas.height;
    const ratio = ratioRef.current;
    const accent = shiftRef.current < 0 ? "#fca5a5" : "#7dd3fc";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(8, 13, 26, 0.92)";
    roundRectPath(ctx, 3, 3, W - 6, H - 6, 14);
    ctx.fill();
    ctx.strokeStyle = flash > 0.03 ? accent : "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 2 + flash * 3.5;
    roundRectPath(ctx, 3, 3, W - 6, H - 6, 14);
    ctx.stroke();

    // 中轴虚线
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, H / 2);
    ctx.lineTo(W - 12, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 接收波形（波长 ∝ 1/频率比）
    const lambdaPx = clamp(30 / Math.max(ratio, 0.15), 8, 88);
    const k2 = (Math.PI * 2) / lambdaPx;
    const phase = scopePhaseRef.current;
    ctx.beginPath();
    for (let px = 12; px <= W - 12; px += 2) {
      const y = H / 2 + Math.sin(px * k2 - phase) * 30;
      if (px === 12) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 9;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 读数
    ctx.font = "bold 17px 'JetBrains Mono', monospace";
    ctx.fillStyle = accent;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`f′/f₀ ${ratio.toFixed(2)}`, 12, 10);

    texture.needsUpdate = true;

    // 屏体位置或朝向不需要更新（sprite 自动面向相机）
  });

  return (
    <group position={[observerX, 0, 0]}>
      {/* 基座 */}
      <mesh position={[0, STAGE_Y + 0.2, 0]}>
        <cylinderGeometry args={[1.5, 1.75, 0.4, 48]} />
        <meshStandardMaterial color="#2a3352" metalness={0.8} roughness={0.42} />
      </mesh>
      <mesh position={[0, STAGE_Y + 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.48, 0.03, 8, 64]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.55} />
      </mesh>

      {/* 立柱 */}
      <mesh position={[0, STAGE_Y + 1.65, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 2.5, 16]} />
        <meshStandardMaterial color="#39415c" metalness={0.85} roughness={0.35} />
      </mesh>

      {/* 感应球与接收环阵（波到达时脉冲） */}
      <group ref={ringGroupRef} position={[0, STAGE_Y + 3.05, 0]}>
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            ref={sensorMatRef}
            color="#e9d5ff"
            emissive="#c084fc"
            emissiveIntensity={0.9}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.02, 8, 48]} />
          <meshBasicMaterial ref={ringMatRef} color="#c084fc" transparent opacity={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <torusGeometry args={[0.62, 0.015, 8, 48]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.22} />
        </mesh>
        <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
          <torusGeometry args={[0.62, 0.015, 8, 48]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.22} />
        </mesh>
      </group>

      {/* 接收示波屏 */}
      <sprite position={[0, STAGE_Y + 4.5, 0]} scale={[3.4, 1.7, 1]} renderOrder={21}>
        <spriteMaterial map={scope.texture} transparent depthTest={false} depthWrite={false} />
      </sprite>

      {/* 到达涟漪 */}
      {ripples.map((rp, i) => (
        <primitive key={i} object={rp.mesh} />
      ))}

      {/* 悬浮标签：观察者 */}
      <SceneLabelSprite text="观察者" position={[0, STAGE_Y + 5.9, 0]} height={1.0} />
    </group>
  );
}

/* ═══════════════════════ 马赫锥（超音速激波） ═══════════════════════ */

function MachCone({
  sourceXRef,
  sourceVelRef,
  machRef,
}: {
  sourceXRef: NumRef;
  sourceVelRef: NumRef;
  machRef: NumRef;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const coneMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const strutMatRef = useRef<THREE.LineBasicMaterial>(null);
  const rimMatRef = useRef<THREE.LineBasicMaterial>(null);
  const dirRef = useRef(1);
  const fadeRef = useRef(0);

  /** 8 条母线（顶点 → 底缘） */
  const strutGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(8 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage),
    );
    return geo;
  }, []);

  /** 底缘圆环（64 段折线） */
  const rimGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(64 * 3), 3).setUsage(THREE.DynamicDrawUsage),
    );
    return geo;
  }, []);

  useEffect(
    () => () => {
      strutGeo.dispose();
      rimGeo.dispose();
    },
    [strutGeo, rimGeo],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const v = sourceVelRef.current;
    if (Math.abs(v) > 0.05) dirRef.current = v > 0 ? 1 : -1;
    g.position.set(sourceXRef.current, WAVE_Y, 0);
    g.rotation.y = dirRef.current > 0 ? 0 : Math.PI;

    const mach = machRef.current;
    const target = mach >= 1.01 ? clamp((mach - 1.0) * 1.6, 0, 1) : 0;
    fadeRef.current += (target - fadeRef.current) * 0.12;
    const fade = fadeRef.current;
    g.visible = fade > 0.01;
    if (!g.visible) return;

    // 锥半角 θ = asin(1/M)，顶点在声源、开口朝运动反方向
    const m = Math.max(mach, 1.01);
    const theta = Math.asin(Math.min(1 / m, 1));
    const tan = Math.max(Math.tan(theta), 1e-3);
    const R = Math.min(CONE_LEN * tan, CONE_MAX_R);
    const L = Math.min(CONE_LEN, CONE_MAX_R / tan);

    if (coneRef.current) {
      coneRef.current.scale.set(R, L, R);
      coneRef.current.position.x = -L / 2;
    }
    if (coneMatRef.current) coneMatRef.current.opacity = 0.075 * fade;

    // 母线顶点
    const sp = strutGeo.attributes.position as THREE.BufferAttribute;
    const sa = sp.array as Float32Array;
    for (let i = 0; i < 8; i++) {
      const phi = (i / 8) * Math.PI * 2;
      const o = i * 6;
      sa[o] = 0;
      sa[o + 1] = 0;
      sa[o + 2] = 0;
      sa[o + 3] = -L;
      sa[o + 4] = R * Math.cos(phi);
      sa[o + 5] = R * Math.sin(phi);
    }
    sp.needsUpdate = true;

    // 底缘圆环顶点
    const rp = rimGeo.attributes.position as THREE.BufferAttribute;
    const ra = rp.array as Float32Array;
    for (let i = 0; i < 64; i++) {
      const phi = (i / 64) * Math.PI * 2;
      ra[i * 3] = -L;
      ra[i * 3 + 1] = R * Math.cos(phi);
      ra[i * 3 + 2] = R * Math.sin(phi);
    }
    rp.needsUpdate = true;

    if (strutMatRef.current) strutMatRef.current.opacity = 0.5 * fade;
    if (rimMatRef.current) rimMatRef.current.opacity = 0.62 * fade;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* 激波锥面 */}
      <mesh ref={coneRef} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[1, 1, 48, 1, true]} />
        <meshBasicMaterial
          ref={coneMatRef}
          color="#38bdf8"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* 母线 */}
      <lineSegments geometry={strutGeo}>
        <lineBasicMaterial ref={strutMatRef} color="#7dd3fc" transparent opacity={0} />
      </lineSegments>
      {/* 底缘亮环 */}
      <lineLoop geometry={rimGeo}>
        <lineBasicMaterial ref={rimMatRef} color="#bae6fd" transparent opacity={0} />
      </lineLoop>
    </group>
  );
}

/* ═══════════════════════ 地面刻度尺 ═══════════════════════ */

function AxisTicks() {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (let x = -35; x <= 35; x += 2.5) {
      const isMajor = Math.abs(x % 10) < 1e-6;
      const half = isMajor ? 0.85 : 0.4;
      pts.push(x, STAGE_Y + 0.008, -half, x, STAGE_Y + 0.008, half);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#27406e" transparent opacity={0.55} />
    </lineSegments>
  );
}

/* ═══════════════════════ 主场景 ═══════════════════════ */

export function DopplerSceneComponent({
  onDataChange,
  sourceFrequency = 2,
  sourceVelocity = 5,
  observerPosition = 15,
  waveSpeed = 10,
  resetTrigger,
  isPlaying = true,
  simulationSpeed = 1,
}: DopplerSceneProps) {
  const timeRef = useRef(0);
  const frameCountRef = useRef(0);
  const sourceXRef = useRef(0);
  const sourceVelRef = useRef(0);
  const wavesRef = useRef<WaveRecord[]>([]);
  /** 有符号压缩系数（源速度朝 +x / 波速），驱动波环着色 */
  const compressRef = useRef(0);
  const machRef = useRef(0);
  /** 观测/源频率比与频移方向（示波屏与涟漪共用） */
  const ratioRef = useRef(1);
  const shiftRef = useRef(0);

  // 参数重置：清空物理状态
  useEffect(() => {
    if (resetTrigger === undefined) return;
    timeRef.current = 0;
    frameCountRef.current = 0;
    sourceXRef.current = 0;
    sourceVelRef.current = 0;
    wavesRef.current = [];
    compressRef.current = 0;
    machRef.current = 0;
  }, [resetTrigger]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    frameCountRef.current++;

    if (isPlaying) {
      const step = dt * simulationSpeed;
      timeRef.current += step;

      // ── 声源往复振荡：峰值速度 = sourceVelocity ──
      const amp = sourceVelocity / OSC_SPEED;
      const ph = timeRef.current * OSC_SPEED;
      sourceXRef.current = Math.sin(ph) * amp;
      sourceVelRef.current = Math.cos(ph) * amp * OSC_SPEED;

      // ── 发射波前：每个波记录发射点与时刻 ──
      const interval = 1 / sourceFrequency;
      const last = wavesRef.current[wavesRef.current.length - 1];
      if (!last || timeRef.current - last.emissionTime >= interval) {
        wavesRef.current.push({
          emissionX: sourceXRef.current,
          emissionTime: timeRef.current,
          arrived: false,
        });
        if (wavesRef.current.length > MAX_WAVES) wavesRef.current.shift();
      }
    }

    // 场参数（暂停时保持最后一次着色）
    compressRef.current = clamp(sourceVelRef.current / Math.max(waveSpeed, 1), -1.2, 1.2);
    machRef.current = Math.abs(sourceVelRef.current) / Math.max(waveSpeed, 1);

    // ── 数据上报（每 8 帧节流） ──
    if (frameCountRef.current % 8 === 0) {
      const obsX = observerPosition;
      const srcX = sourceXRef.current;
      const srcVel = sourceVelRef.current;

      // 多普勒公式：f_obs = f_src · v / (v ∓ v_source)
      const sourceToObserver = obsX - srcX;
      const sourceVelTowardObserver = sourceToObserver > 0 ? srcVel : -srcVel;

      let observedFreq: number;
      let shiftType: "blueshift" | "redshift" | "none";

      if (Math.abs(srcVel) < 0.1) {
        observedFreq = sourceFrequency;
        shiftType = "none";
      } else if (sourceVelTowardObserver > 0) {
        // 数值防护：源速度接近波速（马赫 ≥ 1）时公式除零，夹取到亚音速上限
        const towardSafe = Math.min(sourceVelTowardObserver, waveSpeed * 0.999);
        observedFreq = sourceFrequency * (waveSpeed / (waveSpeed - towardSafe));
        shiftType = "blueshift";
      } else {
        observedFreq =
          sourceFrequency * (waveSpeed / (waveSpeed + Math.abs(sourceVelTowardObserver)));
        shiftType = "redshift";
      }

      const machNumber = Math.abs(srcVel) / Math.max(waveSpeed, 1);
      const dopplerShiftRatio = observedFreq / sourceFrequency;
      ratioRef.current = dopplerShiftRatio;
      shiftRef.current = shiftType === "blueshift" ? 1 : shiftType === "redshift" ? -1 : 0;

      const newData: DopplerData = {
        sourceFrequency,
        observedFrequency: Math.max(0, observedFreq),
        dopplerShiftRatio,
        machNumber,
        waveSpeed,
        shiftType,
      };

      onDataChange?.(newData);
    }
  });

  const glowTex = useMemo(makeRadialGlowTexture, []);

  return (
    <group>
      <EffectComposer>
        <Bloom
          intensity={0.65}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.5}
          mipmapBlur
          radius={0.55}
        />
        <Vignette offset={0.45} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      <SceneEnvironment />

      {/* 冷暖氛围光 */}
      <pointLight position={[-18, 9, -10]} intensity={1.1} color="#4f6bff" distance={60} decay={1.6} />
      <pointLight position={[16, -3, 10]} intensity={0.7} color="#ffa64d" distance={54} decay={1.6} />
      <pointLight position={[0, 3, 0]} intensity={0.85} color="#66aaff" distance={44} decay={1.7} />

      {/* 地板与网格 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STAGE_Y, 0]} receiveShadow>
        <planeGeometry args={[110, 76]} />
        <meshStandardMaterial color="#070b18" roughness={0.94} metalness={0.08} />
      </mesh>
      <gridHelper args={[110, 55, "#1c2a52", "#0e1428"]} position={[0, STAGE_Y + 0.005, 0]} />

      {/* 中心柔光光池 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STAGE_Y + 0.012, 0]}>
        <planeGeometry args={[88, 56]} />
        <meshBasicMaterial
          map={glowTex}
          color="#3b82f6"
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <AxisTicks />

      {/* 主光轴（虚线） */}
      <Line
        points={[
          [-38, WAVE_Y, 0],
          [38, WAVE_Y, 0],
        ]}
        color="#5b7bb5"
        lineWidth={1}
        dashed
        dashSize={0.35}
        gapSize={0.25}
        transparent
        opacity={0.4}
      />

      {/* 波环场（核心视觉） */}
      <RingField
        wavesRef={wavesRef}
        timeRef={timeRef}
        compressRef={compressRef}
        waveSpeed={waveSpeed}
      />

      {/* 声源：脉冲信标 + 拖尾 */}
      <PulseSource
        sourceXRef={sourceXRef}
        sourceVelRef={sourceVelRef}
        timeRef={timeRef}
        sourceFrequency={sourceFrequency}
        waveSpeed={waveSpeed}
      />
      <SourceTrail
        sourceXRef={sourceXRef}
        sourceVelRef={sourceVelRef}
        waveSpeed={waveSpeed}
        isPlaying={isPlaying}
      />

      {/* 观察者：接收示波塔 */}
      <ObserverTower
        observerX={observerPosition}
        wavesRef={wavesRef}
        timeRef={timeRef}
        ratioRef={ratioRef}
        shiftRef={shiftRef}
        waveSpeed={waveSpeed}
        isPlaying={isPlaying}
        simulationSpeed={simulationSpeed}
      />

      {/* 超音速马赫锥 */}
      <MachCone sourceXRef={sourceXRef} sourceVelRef={sourceVelRef} machRef={machRef} />
    </group>
  );
}

export default DopplerSceneComponent;
