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
import { WaveLabel, WaveHtml } from "./wave-mechanics/wave-label";
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

function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#ffffff" transparent opacity={0.15} />
    </points>
  );
}

function GlassPlatform({
  position,
  width,
  accent,
  chainLength,
  showAxisLabel = true,
}: {
  position: [number, number, number];
  width: number;
  accent: string;
  chainLength: number;
  showAxisLabel?: boolean;
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(width, 4), [width]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, 4]} />
        <meshPhysicalMaterial
          color="#111128"
          transparent
          opacity={0.35}
          metalness={0.4}
          roughness={0.3}
          clearcoat={0.8}
        />
      </mesh>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <primitive object={edges} attach="geometry" />
        <lineBasicMaterial color={accent} transparent opacity={0.6} />
      </lineSegments>
      <XAxis length={chainLength} showLabel={showAxisLabel} />
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
      c.enablePan = false;
      c.minDistance = 12;
      c.maxDistance = 30;
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
      <ambientLight intensity={0.25} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-8, 3, 0]} color={WAVE_COLORS.transverseCrest} intensity={1.2} />
      <pointLight position={[8, 3, 0]} color={WAVE_COLORS.transverseTrough} intensity={0.6} />
      <pointLight position={[0, 12, 0]} intensity={0.5} color="#ffffff" />
      <pointLight position={[9, 2, 0]} color={WAVE_COLORS.longitudinalDense} intensity={1} />
      <pointLight position={[9, 2, 5]} color={WAVE_COLORS.longitudinalSparse} intensity={0.5} />

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
        />
      )}

      {labelVisibility.transverse && (
        <WaveHtml
          position={[
            layout.transverseOffset[0],
            layout.transverseOffset[1] + 1.6,
            0.6,
          ]}
          center={viewMode !== "compare"}
        >
          <button
            type="button"
            className="bg-transparent border-0 p-0 cursor-pointer pointer-events-auto"
            onClick={() => onRequestFocus?.("transverse")}
          >
            <WaveLabel color={WAVE_COLORS.transverseCrest} interactive>
              横波
            </WaveLabel>
          </button>
        </WaveHtml>
      )}
      {labelVisibility.longitudinal && (
        <WaveHtml
          position={[
            layout.longitudinalOffset[0],
            layout.longitudinalOffset[1] + 1.6,
            0.6,
          ]}
          center={viewMode !== "compare"}
        >
          <button
            type="button"
            className="bg-transparent border-0 p-0 cursor-pointer pointer-events-auto"
            onClick={() => onRequestFocus?.("longitudinal")}
          >
            <WaveLabel color={WAVE_COLORS.longitudinalDense} interactive>
              纵波
            </WaveLabel>
          </button>
        </WaveHtml>
      )}

      <TransverseWave
        offset={layout.transverseOffset}
        opacity={layout.transverseOpacity}
        showLabels={labelVisibility.transverse}
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
        showBreathField
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
        shockPool={shockPool}
        lastShockCheck={lastShockCheck}
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
