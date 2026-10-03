"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { clamp } from "@/utils/physics";

/**
 * 凸透镜成像 3D 场景
 *
 * 物理模型：薄透镜成像公式 1/f = 1/u + 1/v
 * - 场景单位与厘米的换算：1 单位 = 5 cm
 * - 物距 u、焦距 f 由页面传入（cm），内部换算为场景单位计算
 * - 像距 v = uf/(u−f)：v > 0 为实像（右侧），v < 0 为虚像（左侧，与物同侧）
 * - 像高 h' = −h·v/u：实像倒立（负），虚像正立（正）
 * - 光路：两条特征光线（平行光/过光心），虚像时画反向延长虚线
 * - 场景采用浮空布局：无试验台/地面，避免近焦时像超出台面范围
 */

export type LensImageKind = "real" | "virtual" | "none";

export interface ConvexLensData {
  uCm: number;
  fCm: number;
  /** 像距（cm），虚像为负；不成像时为 Infinity */
  vCm: number;
  /** 放大率 |v|/u */
  magnification: number;
  kind: LensImageKind;
  /** "倒立" | "正立" | null */
  orientation: string | null;
  /** "放大" | "缩小" | "等大" | null */
  sizeRelation: string | null;
}

interface ConvexLensSceneProps {
  uCm?: number;
  fCm?: number;
  showRays?: boolean;
  isPlaying?: boolean;
  simulationSpeed?: number;
  onDataChange?: (data: ConvexLensData) => void;
}

/** cm → 场景单位 */
const CM = 5;
/** 物高（场景单位），即 6 cm */
const OBJECT_H = 1.2;
/** 透镜半口径（场景单位）：明显大于物高，避免平行光线看起来像指向透镜顶点的斜线 */
const LENS_R = 1.6;
/** 光线绘制边界（放宽到光场网格内，避免像刚走远就被裁切） */
const RAY_MAX_X = 28;
const Y_MIN = -16;
const Y_MAX = 16;
/** 像距超过该值时淡出（场景单位） */
const IMAGE_FADE_V = 28;
const PHOTON_COUNT_PER_RAY = 3;
/** 全息光场参考面高度（场景单位） */
const STAGE_Y = -2.1;

const RAY_COLORS = {
  parallel: "#60a5fa", // 平行光线（出射后过焦点）
  center: "#4ade80", // 过光心
  extension: "#a78bfa", // 虚像反向延长线
};

function clipRay(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
): [number, number, number] {
  let t = (RAY_MAX_X - ox) / dx;
  if (dy > 1e-9) t = Math.min(t, (Y_MAX - oy) / dy);
  else if (dy < -1e-9) t = Math.min(t, (Y_MIN - oy) / dy);
  return [ox + dx * t, oy + dy * t, 0];
}

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const r = 14;
  const w = 120;
  const h = 58;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
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

  ctx.font = "bold 34px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** 径向渐变光晕纹理（光场中心柔光与悬浮基座光斑共用） */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.35, "rgba(255, 255, 255, 0.5)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

interface ArrowProps {
  /** 带符号高度：正=向上，负=向下（倒立） */
  height: number;
  color: string;
  emissiveIntensity?: number;
  opacity?: number;
}

function GlowArrow({ height, color, emissiveIntensity = 1.3, opacity = 1 }: ArrowProps) {
  const abs = Math.abs(height);
  const shaftLen = Math.max(abs - 0.3, 0.02);
  const transparent = opacity < 1;
  return (
    <group rotation={height < 0 ? [0, 0, Math.PI] : [0, 0, 0]}>
      <mesh position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, shaftLen, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, abs - 0.15, 0]}>
        <coneGeometry args={[0.13, 0.3, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

interface PolyMetric {
  points: [number, number, number][];
  cum: number[];
  total: number;
}

function buildPolyMetric(
  segments: [number, number, number][][],
): PolyMetric {
  const points: [number, number, number][] = [];
  const cum: number[] = [];
  let total = 0;
  for (const seg of segments) {
    for (let i = 0; i < seg.length; i++) {
      // 相邻线段共享端点，避免重复
      if (points.length > 0 && i === 0) continue;
      points.push(seg[i]);
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    total += d;
    cum.push(total);
  }
  return { points, cum, total };
}

function pointAtFraction(metric: PolyMetric, s: number): [number, number, number] {
  const { points, cum } = metric;
  if (points.length < 2 || cum.length === 0) return points[0] ?? [0, 0, 0];
  for (let i = 0; i < cum.length; i++) {
    if (s <= cum[i]) {
      const segStart = i === 0 ? 0 : cum[i - 1];
      const segLen = cum[i] - segStart;
      const t = segLen > 1e-9 ? (s - segStart) / segLen : 0;
      const a = points[i];
      const b = points[i + 1];
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
    }
  }
  return points[points.length - 1];
}

export function ConvexLensSceneComponent({
  uCm = 30,
  fCm = 10,
  showRays = true,
  isPlaying = true,
  simulationSpeed = 1,
  onDataChange,
}: ConvexLensSceneProps) {
  // ── 物理量（场景单位）──
  const u = uCm / CM;
  const f = fCm / CM;
  const uEf = u - f;
  const nearFocal = Math.abs(uEf) < 1e-9;

  const v = nearFocal ? Number.POSITIVE_INFINITY : (u * f) / uEf;
  const magnification = nearFocal ? Number.POSITIVE_INFINITY : Math.abs(v) / u;
  const hImg = nearFocal ? 0 : (-OBJECT_H * v) / u;

  const kind: LensImageKind = nearFocal ? "none" : v > 0 ? "real" : "virtual";
  const orientation = kind === "none" ? null : kind === "real" ? "倒立" : "正立";
  const sizeRelation =
    kind === "none"
      ? null
      : magnification > 1.02
        ? "放大"
        : magnification < 0.98
          ? "缩小"
          : "等大";

  // ── 上报数据 ──
  useEffect(() => {
    onDataChange?.({
      uCm,
      fCm,
      vCm: nearFocal ? Number.POSITIVE_INFINITY : v * CM,
      magnification,
      kind,
      orientation,
      sizeRelation,
    });
  }, [uCm, fCm, nearFocal, v, magnification, kind, orientation, sizeRelation, onDataChange]);

  // ── 光路几何 ──
  const optics = useMemo(() => {
    const P: [number, number, number] = [-u, OBJECT_H, 0];
    const hitA: [number, number, number] = [0, OBJECT_H, 0];
    const hitB: [number, number, number] = [0, 0, 0];

    // 出射光线（理想化薄透镜）：平行光出射后过焦点，过光心光线方向不变
    const endA = clipRay(hitA[0], hitA[1], f, -OBJECT_H);
    const endB = clipRay(hitB[0], hitB[1], u, -OBJECT_H);

    const rays = [
      { pre: [P, hitA] as [number, number, number][], post: [hitA, endA] as [number, number, number][], color: RAY_COLORS.parallel },
      { pre: [P, hitB] as [number, number, number][], post: [hitB, endB] as [number, number, number][], color: RAY_COLORS.center },
    ];

    // 虚像反向延长线
    const imageTip: [number, number, number] = [v, hImg, 0];
    const extensions =
      kind === "virtual"
        ? ([
            [hitA, imageTip],
            [hitB, imageTip],
          ] as [number, number, number][][])
        : [];

    const polylines = rays.map((r) => buildPolyMetric([r.pre, r.post]));

    const imageFade =
      kind === "none"
        ? 0
        : clamp(
            Math.min(
              (IMAGE_FADE_V - Math.abs(v)) / 1.2,
              (16 - Math.abs(hImg)) / 1.2,
              1,
            ),
            0,
            1,
          );

    return { rays, extensions, polylines, imageTip, imageFade };
  }, [u, f, v, hImg, kind, nearFocal]);

  // ── 光子流 ──
  const photonRef = useRef<THREE.InstancedMesh>(null);
  const phaseRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const placePhotons = useCallback(
    (phase: number) => {
      const mesh = photonRef.current;
      if (!mesh) return;
      const metrics = optics.polylines;
      const slots = 2 * PHOTON_COUNT_PER_RAY;
      for (let i = 0; i < slots; i++) {
        const polyIdx = Math.floor(i / PHOTON_COUNT_PER_RAY);
        if (!showRays || polyIdx >= metrics.length) {
          dummy.position.set(0, 0, 0);
          dummy.scale.set(0, 0, 0);
        } else {
          const metric = metrics[polyIdx];
          const frac =
            (i % PHOTON_COUNT_PER_RAY) / PHOTON_COUNT_PER_RAY + phase + polyIdx * 0.17;
          const s = ((frac % 1) + 1) % 1 * metric.total;
          const p = pointAtFraction(metric, s);
          dummy.position.set(p[0], p[1], p[2]);
          dummy.scale.set(0.06, 0.06, 0.06);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    [optics.polylines, showRays, dummy],
  );

  useEffect(() => {
    placePhotons(phaseRef.current);
  }, [placePhotons]);

  useFrame((_, delta) => {
    if (isPlaying && showRays) {
      phaseRef.current =
        (phaseRef.current + Math.min(delta, 0.05) * simulationSpeed * 0.32) % 1;
    }
    placePhotons(phaseRef.current);
  });

  // ── 标签 ──
  const labels = useMemo(
    () => ({
      F: makeLabelTexture("F"),
      twoF: makeLabelTexture("2F"),
      object: makeLabelTexture("物"),
      image: makeLabelTexture("像"),
    }),
    [],
  );

  const glowTex = useMemo(makeGlowTexture, []);

  const imageVisible = optics.imageFade > 0.02;
  const imageColor = kind === "virtual" ? "#c084fc" : "#22d3ee";

  return (
    <group>
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.5} luminanceSmoothing={0.5} mipmapBlur />
        <Vignette offset={0.2} darkness={0.4} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 6]} intensity={1.3} color="#ffffff" />
      <pointLight position={[-5, 3, 4]} intensity={0.7} color="#60a5fa" distance={20} decay={1.6} />
      <pointLight position={[4, 2, -4]} intensity={0.55} color="#f59e0b" distance={18} decay={1.6} />

      {/* 全息光场：暗网格向四周延伸（无实体台面）+ 中心柔光，避免元素悬浮在纯黑虚空中 */}
      <gridHelper args={[64, 64, "#1c2a52", "#0e1428"]} position={[0, STAGE_Y, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STAGE_Y + 0.01, 0]}>
        <planeGeometry args={[58, 36]} />
        <meshBasicMaterial
          map={glowTex}
          color="#3b82f6"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 主光轴（虚线） */}
      <Line
        points={[
          [-28, 0, 0],
          [28, 0, 0],
        ]}
        color="#64748b"
        lineWidth={1}
        dashed
        dashSize={0.25}
        gapSize={0.18}
        transparent
        opacity={0.45}
      />

      {/* 凸透镜 */}
      <group>
        <mesh scale={[0.32, 1, 1]}>
          <sphereGeometry args={[LENS_R, 48, 32]} />
          <meshPhysicalMaterial
            color="#e0f2fe"
            metalness={0.05}
            roughness={0.05}
            transmission={0.9}
            thickness={0.5}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[LENS_R, 0.025, 12, 64]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* F / 2F 标记 */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * f, -0.32, 0]}>
            <boxGeometry args={[0.06, 0.35, 0.06]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
          </mesh>
          <sprite position={[side * f, -0.78, 0]} scale={[0.9, 0.45, 1]}>
            <spriteMaterial map={labels.F} transparent depthTest={false} />
          </sprite>
          <mesh position={[side * 2 * f, -0.32, 0]}>
            <boxGeometry args={[0.06, 0.35, 0.06]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
          </mesh>
          <sprite position={[side * 2 * f, -0.78, 0]} scale={[0.9, 0.45, 1]}>
            <spriteMaterial map={labels.twoF} transparent depthTest={false} />
          </sprite>
        </group>
      ))}

      {/* 物体（浮空发光箭头） */}
      <group position={[-u, 0, 0]}>
        <GlowArrow height={OBJECT_H} color="#f59e0b" emissiveIntensity={1.3} />
      </group>
      <sprite position={[-u, OBJECT_H + 0.55, 0]} scale={[1.0, 0.5, 1]}>
        <spriteMaterial map={labels.object} transparent depthTest={false} />
      </sprite>

      {/* 悬浮基座光斑：让「浮空」呈现全息投影的观感 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-u, STAGE_Y + 0.02, 0]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshBasicMaterial
          map={glowTex}
          color="#f59e0b"
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STAGE_Y + 0.02, 0]}>
        <planeGeometry args={[3.6, 2.0]} />
        <meshBasicMaterial
          map={glowTex}
          color="#22d3ee"
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 像（实像：青·倒立；虚像：紫·正立·半透明） */}
      {imageVisible && kind !== "none" && (
        <group position={[v, 0, 0]}>
          <GlowArrow
            height={hImg}
            color={imageColor}
            emissiveIntensity={1.5}
            opacity={(kind === "virtual" ? 0.62 : 1) * optics.imageFade}
          />
          <mesh position={[0, hImg, 0]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial
              color={imageColor}
              emissive={imageColor}
              emissiveIntensity={2.4}
              transparent
              opacity={optics.imageFade}
            />
          </mesh>
          <sprite
            position={[0, hImg + (hImg >= 0 ? 0.55 : -0.55), 0]}
            scale={[1.0, 0.5, 1]}
          >
            <spriteMaterial
              map={labels.image}
              transparent
              depthTest={false}
              opacity={optics.imageFade}
            />
          </sprite>
        </group>
      )}

      {imageVisible && kind !== "none" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[v, STAGE_Y + 0.02, 0]}>
          <planeGeometry args={[2.1, 1.4]} />
          <meshBasicMaterial
            map={glowTex}
            color={imageColor}
            transparent
            opacity={0.4 * optics.imageFade}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* 光路：两条特征光线（平行光、过光心） */}
      {showRays &&
        optics.rays.map((ray, i) => (
          <group key={i}>
            <Line
              points={ray.pre}
              color={ray.color}
              lineWidth={2}
              transparent
              opacity={0.85}
            />
            <Line
              points={ray.post}
              color={ray.color}
              lineWidth={2}
              transparent
              opacity={0.85}
            />
          </group>
        ))}

      {/* 虚像反向延长线（虚线） */}
      {showRays &&
        kind === "virtual" &&
        optics.extensions.map((seg, i) => (
          <Line
            key={`ext-${i}`}
            points={seg}
            color={RAY_COLORS.extension}
            lineWidth={1.5}
            dashed
            dashSize={0.18}
            gapSize={0.14}
            transparent
            opacity={0.55 * optics.imageFade}
          />
        ))}

      {/* 光子流 */}
      <instancedMesh ref={photonRef} args={[undefined, undefined, 2 * PHOTON_COUNT_PER_RAY]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.2} />
      </instancedMesh>
    </group>
  );
}

export default ConvexLensSceneComponent;
