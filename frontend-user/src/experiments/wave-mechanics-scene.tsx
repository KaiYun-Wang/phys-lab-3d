"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { TransverseWave } from "./wave-mechanics/transverse-wave";
import { LongitudinalWave } from "./wave-mechanics/longitudinal-wave";
import { PhaseLines } from "./wave-mechanics/phase-lines";
import { WaveSprite } from "./wave-mechanics/wave-label";
import { XAxis } from "./wave-mechanics/x-axis";
import {
  WAVE_COLORS,
  getWavePhysics,
  createShockRingPool,
  easeInOutCubic,
  MEDIUM_PRESETS,
  type WaveMedium,
  type ViewMode,
  type WaveSnapshot,
} from "./wave-mechanics/shared-wave-utils";

/** 波的平衡位置在底座上方 */
const WAVE_LIFT = 1.2;

function wavePos(x: number, z = 0): [number, number, number] {
  return [x, WAVE_LIFT, z];
}

export interface WaveMechanicsSceneProps {
  frequency: number;
  amplitude: number;
  wavelength: number;
  medium: WaveMedium;
  viewMode: ViewMode;
  isPlaying: boolean;
  simulationSpeed: number;
  resetTrigger: number;
  isMobile: boolean;
  focusTarget: "center" | "transverse" | "longitudinal" | null;
  onRequestFocus?: (target: "transverse" | "longitudinal") => void;
  selectedParticle: {
    side: "transverse" | "longitudinal";
    index: number;
    x0: number;
  } | null;
  onDataChange?: (data: WaveSnapshot) => void;
  onParticleHistory?: (side: "transverse" | "longitudinal", values: number[]) => void;
  onFocusComplete?: () => void;
}

/** 径向渐变光晕纹理：柔光地场用 */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.45)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 柔光地场：暗网格 + 中心蓝色柔光，填掉"虚空感"，不抢波形 */
function GroundGlow() {
  const tex = useMemo(makeGlowTexture, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[0, -0.06, 0]}>
      <gridHelper args={[64, 32, "#1c2a52", "#101a38"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[58, 34]} />
        <meshBasicMaterial
          map={tex}
          color="#3b82f6"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(520 * 3);
    for (let i = 0; i < 520; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 70;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 34;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 46 - 10;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#cfe0ff" transparent opacity={0.4} depthWrite={false} />
    </points>
  );
}

function GlassPlatform({
  position,
  width,
  accent,
  chainLength,
  showAxisLabel = true,
  showAxisArrow = true,
}: {
  position: [number, number, number];
  width: number;
  accent: string;
  chainLength: number;
  showAxisLabel?: boolean;
  showAxisArrow?: boolean;
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(width, 4), [width]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);

  return (
    <group position={position}>
      {/* 底板不做成半透明实体面：正/背面受光差很大，会出现"一面网格、一面黑板"。
          现在只留极薄的一层色 + 描边，底板实际上由网格和柔光地场表达。 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, 4]} />
        <meshBasicMaterial
          color="#0d1430"
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <primitive object={edges} attach="geometry" />
        <lineBasicMaterial color={accent} transparent opacity={0.6} />
      </lineSegments>
      <XAxis length={chainLength} showLabel={showAxisLabel} showArrow={showAxisArrow} />
    </group>
  );
}

export function WaveMechanicsSceneComponent({
  frequency,
  amplitude,
  wavelength,
  medium,
  viewMode,
  isPlaying,
  simulationSpeed,
  resetTrigger,
  isMobile,
  focusTarget,
  selectedParticle,
  onDataChange,
  onParticleHistory,
  onFocusComplete,
  onRequestFocus,
}: WaveMechanicsSceneProps) {
  const { camera, controls } = useThree();
  const timeRef = useRef(0);
  const frameRef = useRef(0);
  const lastShockCheck = useRef(-999);
  void lastShockCheck;
  const compressionTextureRef = useRef<THREE.DataTexture | null>(null);

  const transverseStats = useRef({ yMax: 0, yMin: 0 });
  const longitudinalStats = useRef({ rhoMax: 1, rhoMin: 1 });
  const transverseFrameRef = useRef(0);
  const longitudinalFrameRef = useRef(0);
  const particleHistoryRef = useRef<number[]>([]);
  const selectedValueRef = useRef<number>(0);

  const [hoveredT, setHoveredT] = useState<number | null>(null);
  const [hoveredL, setHoveredL] = useState<number | null>(null);
  const [selectedT, setSelectedT] = useState<number | null>(null);
  const [selectedL, setSelectedL] = useState<number | null>(null);

  const preset = useMemo(() => {
    const base = MEDIUM_PRESETS[medium];
    if (!isMobile) return base;
    return {
      ...base,
      particleCount: Math.min(30, base.particleCount),
    };
  }, [medium, isMobile]);
  const physics = useMemo(
    () => getWavePhysics({ frequency, amplitude, wavelength }),
    [frequency, amplitude, wavelength]
  );
  const { k, omega, waveSpeed } = physics;

  const shockPool = useMemo(() => createShockRingPool(5), []);
  void shockPool;


  const focusAnim = useRef<{
    active: boolean;
    start: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    timeRef.current = 0;
    frameRef.current = 0;
    lastShockCheck.current = -999;
    particleHistoryRef.current = [];
    setSelectedT(null);
    setSelectedL(null);
  }, [resetTrigger]);

  useEffect(() => {
    if (controls && "enablePan" in controls) {
      const c = controls as THREE.EventDispatcher & {
        enablePan: boolean;
        minDistance: number;
        maxDistance: number;
        maxPolarAngle: number;
      };
      // 原来这里把 enablePan 关掉了，右键平移在这个实验里就失效了
      c.enablePan = true;
      c.minDistance = 8;
      c.maxDistance = 60;
      c.maxPolarAngle = Math.PI / 2.2;
    }
  }, [controls]);

  useEffect(() => {
    if (!focusTarget) return;
    const targets: Record<string, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
      center: {
        pos: new THREE.Vector3(0, 8, 18),
        look: new THREE.Vector3(0, 0, 0),
      },
      transverse: {
        pos: new THREE.Vector3(-9, 7, 14),
        look: new THREE.Vector3(-9, 0, 0),
      },
      longitudinal: {
        pos: new THREE.Vector3(9, 7, 14),
        look: new THREE.Vector3(9, 0, 0),
      },
    };
    const t = targets[focusTarget];
    focusAnim.current = {
      active: true,
      start: performance.now(),
      from: camera.position.clone(),
      to: t.pos,
      targetFrom:
        controls && "target" in controls
          ? (controls as THREE.EventDispatcher & { target: THREE.Vector3 }).target.clone()
          : new THREE.Vector3(),
      targetTo: t.look,
    };
  }, [focusTarget, camera, controls]);

  useEffect(() => {
    if (selectedParticle?.side === "transverse") {
      setSelectedT(selectedParticle.index);
      setSelectedL(null);
    } else if (selectedParticle?.side === "longitudinal") {
      setSelectedL(selectedParticle.index);
      setSelectedT(null);
    }
  }, [selectedParticle]);

  const layout = useMemo(() => {
    switch (viewMode) {
      case "transverse":
        return {
          transverseOffset: wavePos(0),
          longitudinalOffset: wavePos(0),
          transverseOpacity: 1,
          longitudinalOpacity: 0,
        };
      case "longitudinal":
        return {
          transverseOffset: wavePos(0),
          longitudinalOffset: wavePos(0),
          transverseOpacity: 0,
          longitudinalOpacity: 1,
        };
      case "overlay":
        return {
          transverseOffset: wavePos(0),
          longitudinalOffset: wavePos(0, 0.45),
          transverseOpacity: 1,
          longitudinalOpacity: 0.55,
        };
      default:
        return {
          transverseOffset: wavePos(-9),
          longitudinalOffset: wavePos(9),
          transverseOpacity: 1,
          longitudinalOpacity: 1,
        };
    }
  }, [viewMode]);

  const labelVisibility = useMemo(() => {
    switch (viewMode) {
      case "transverse":
        return { transverse: true, longitudinal: false };
      case "longitudinal":
        return { transverse: false, longitudinal: true };
      case "overlay":
        // 叠加视图不用单场景那两块"横波/纵波"标签（会叠在一起），
        // 它有自己的说明牌，见下方 viewMode === "overlay" 分支
        return { transverse: false, longitudinal: false };
      default:
        return { transverse: true, longitudinal: true };
    }
  }, [viewMode]);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * simulationSpeed;
    }
    frameRef.current++;

    if (focusAnim.current?.active) {
      const elapsed = (performance.now() - focusAnim.current.start) / 1200;
      const t = easeInOutCubic(Math.min(elapsed, 1));
      camera.position.lerpVectors(
        focusAnim.current.from,
        focusAnim.current.to,
        t
      );
      if (controls && "target" in controls) {
        (controls as THREE.EventDispatcher & { target: THREE.Vector3 }).target.lerpVectors(
          focusAnim.current.targetFrom,
          focusAnim.current.targetTo,
          t
        );
      }
      if (elapsed >= 1) {
        focusAnim.current.active = false;
        onFocusComplete?.();
      }
    }

    if ((selectedT != null || selectedL != null) && frameRef.current % 4 === 0) {
      particleHistoryRef.current.push(selectedValueRef.current);
      if (particleHistoryRef.current.length > 120) {
        particleHistoryRef.current.shift();
      }
      onParticleHistory?.(selectedT != null ? "transverse" : "longitudinal", [
        ...particleHistoryRef.current,
      ]);
    }

    if (frameRef.current % 8 === 0) {
      onDataChange?.({
        time: timeRef.current,
        frequency,
        amplitude,
        wavelength,
        waveSpeed,
        k,
        omega,
        transverseYMax: transverseStats.current.yMax,
        transverseYMin: transverseStats.current.yMin,
        longitudinalRhoMax: longitudinalStats.current.rhoMax,
        longitudinalRhoMin: longitudinalStats.current.rhoMin,
      });
    }
  });

  const bloomIntensity = isMobile ? 0.35 : 0.65;

  return (
    <>
      <ambientLight intensity={0.55} color="#c8d6ff" />
      <directionalLight position={[5, 10, 5]} intensity={1.15} castShadow />
      <pointLight position={[-8, 3, 0]} color={WAVE_COLORS.transverseCrest} intensity={1.6} />
      <pointLight position={[8, 3, 0]} color={WAVE_COLORS.transverseTrough} intensity={0.9} />
      <pointLight position={[0, 12, 0]} intensity={0.8} color="#ffffff" />
      <pointLight position={[9, 2, 0]} color={WAVE_COLORS.longitudinalDense} intensity={1.3} />
      <pointLight position={[9, 2, 5]} color={WAVE_COLORS.longitudinalSparse} intensity={0.7} />
      {/* 冷色环境补光，压掉"纯黑虚空" */}
      <hemisphereLight args={["#8fb0ff", "#101a38", 0.5]} />
      <pointLight position={[-16, 6, -12]} intensity={0.7} color="#4f6bff" distance={60} decay={1.6} />

      <GroundGlow />
      <Starfield />

      {viewMode === "compare" && !isMobile && (
        <>
          <GlassPlatform
            position={[-9, 0, 0]}
            width={preset.chainLength + 2}
            chainLength={preset.chainLength}
            accent={WAVE_COLORS.platformEdge}
            showAxisLabel
          />
          <GlassPlatform
            position={[9, 0, 0]}
            width={preset.chainLength + 2}
            chainLength={preset.chainLength}
            accent={WAVE_COLORS.platformEdge}
            showAxisLabel
          />
        </>
      )}

      {(viewMode !== "compare" || isMobile) && (
        <GlassPlatform
          position={[0, 0, 0]}
          width={preset.chainLength + 2}
          chainLength={preset.chainLength}
          accent={WAVE_COLORS.platformEdge}
          showAxisLabel={labelVisibility.transverse || labelVisibility.longitudinal}
          // 叠加时波形自身也带箭头，轴上的箭头会重合，只留波形的
          showAxisArrow={viewMode !== "overlay"}
        />
      )}

      {labelVisibility.transverse && (
        <WaveSprite
          text="横波"
          color={WAVE_COLORS.transverseCrest}
          position={[
            layout.transverseOffset[0],
            layout.transverseOffset[1] + 1.6,
            0.6,
          ]}
          interactive
          onClick={() => onRequestFocus?.("transverse")}
        />
      )}
      {labelVisibility.longitudinal && (
        <WaveSprite
          text="纵波"          color={WAVE_COLORS.longitudinalDense}
          position={[
            layout.longitudinalOffset[0],
            layout.longitudinalOffset[1] + 1.6,
            0.6,
          ]}
          interactive
          onClick={() => onRequestFocus?.("longitudinal")}
        />
      )}

      {/* 叠加视图：两种波叠在同一位置，各挂一块说明牌区分（不用单场景的"横波/纵波"标签） */}
      {viewMode === "overlay" && (
        <>
          <WaveSprite
            text="横波 · 上下振动 ⊥ 传播"
            color={WAVE_COLORS.transverseCrest}
            position={[-3.4, 2.4, 0.6]}
            size={0.42}
          />
          <WaveSprite
            text="纵波 · 沿传播方向疏密相间"
            color={WAVE_COLORS.longitudinalDense}
            position={[-5.2, -1.7, 0.6]}
            size={0.42}
          />
        </>
      )}

      <TransverseWave
        offset={layout.transverseOffset}
        opacity={layout.transverseOpacity}
        showLabels={labelVisibility.transverse}
        viewMode={viewMode}
        amplitude={amplitude}
        k={k}
        omega={omega}
        timeRef={timeRef}
        preset={preset}
        selectedIndex={selectedT}
        hoveredIndex={hoveredT}
        selectedSampleRef={selectedValueRef}
        onHover={setHoveredT}
        onSelect={(index, x0, y, vy) => {
          setSelectedT(index);
          setSelectedL(null);
          selectedValueRef.current = y;
          particleHistoryRef.current = [y];
          onParticleHistory?.("transverse", [y]);
          void x0;
          void vy;
        }}
        statsRef={transverseStats}
        frameCounterRef={transverseFrameRef}
      />

      <LongitudinalWave
        offset={layout.longitudinalOffset}
        opacity={layout.longitudinalOpacity}
        showLabels={labelVisibility.longitudinal}
        frequency={frequency}
        amplitude={amplitude}
        wavelength={wavelength}
        k={k}
        omega={omega}
        timeRef={timeRef}
        preset={preset}
        isPlaying={isPlaying}
        showSprings={preset.showSprings}
        selectedIndex={selectedL}
        hoveredIndex={hoveredL}
        selectedSampleRef={selectedValueRef}
        onHover={setHoveredL}
        onSelect={(index, x0, rho) => {
          setSelectedL(index);
          setSelectedT(null);
          selectedValueRef.current = rho;
          particleHistoryRef.current = [rho];
          onParticleHistory?.("longitudinal", [rho]);
          void x0;
        }}
        statsRef={longitudinalStats}
        compressionTextureRef={compressionTextureRef}
        frameCounterRef={longitudinalFrameRef}
      />

      {/* Phase sync lines */}
      <PhaseLines
        timeRef={timeRef}
        k={k}
        omega={omega}
        chainLength={preset.chainLength}
        transverseOffset={layout.transverseOffset}
        longitudinalOffset={layout.longitudinalOffset}
        transverseOpacity={layout.transverseOpacity}
        longitudinalOpacity={layout.longitudinalOpacity}
        particleCount={preset.particleCount}
      />

      <EffectComposer multisampling={isMobile ? 0 : 4}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Vignette offset={0.25} darkness={0.3} />
      </EffectComposer>
    </>
  );
}

export default WaveMechanicsSceneComponent;
