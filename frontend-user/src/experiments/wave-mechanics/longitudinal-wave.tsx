"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import {
  WAVE_COLORS,
  longitudinalDisplacement,
  colorForLongitudinal,
  buildEquilibriumPositions,
  computeCompressionRatios,
  type MediumPreset,
} from "./shared-wave-utils";
import { WaveSprite } from "./wave-label";

export interface LongitudinalWaveProps {
  offset?: [number, number, number];
  opacity?: number;
  frequency: number;
  amplitude: number;
  wavelength: number;
  k: number;
  omega: number;
  timeRef: React.MutableRefObject<number>;
  preset: MediumPreset;
  isPlaying: boolean;
  showSprings: boolean;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  selectedSampleRef?: React.MutableRefObject<number>;
  onHover: (index: number | null) => void;
  onSelect: (index: number, x0: number, rho: number) => void;
  statsRef: React.MutableRefObject<{ rhoMax: number; rhoMin: number }>;
  compressionTextureRef: React.MutableRefObject<THREE.DataTexture | null>;
  frameCounterRef: React.MutableRefObject<number>;
  showLabels?: boolean;
}

export function LongitudinalWave({
  offset = [0, 0, 0],
  opacity = 1,
  amplitude,
  k,
  omega,
  timeRef,
  preset,
  isPlaying,
  showSprings,
  selectedIndex,
  hoveredIndex,
  selectedSampleRef,
  onHover,
  onSelect,
  statsRef,
  compressionTextureRef,
  frameCounterRef,
  showLabels = true,
}: LongitudinalWaveProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const count = preset.particleCount;
  const A = amplitude;
  const x0Arr = useMemo(
    () => buildEquilibriumPositions(count, preset.chainLength),
    [count, preset.chainLength]
  );
  const d0 = preset.chainLength / (count - 1);
  const xPositions = useMemo(() => new Float32Array(count), [count]);
  const rhoArr = useMemo(() => new Float32Array(count), [count]);
  const [, setRenderTick] = useState(0);

  const compressionData = useMemo(() => new Float32Array(count * 4), [count]);


  useEffect(() => {
    const tex = new THREE.DataTexture(
      compressionData,
      count,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    tex.needsUpdate = true;
    compressionTextureRef.current = tex;
    return () => {
      tex.dispose();
    };
  }, [count, compressionData, compressionTextureRef]);

  const springSegments = useMemo(() => {
    const segs: { a: number; b: number }[] = [];
    for (let i = 0; i < count - 1; i++) segs.push({ a: i, b: i + 1 });
    return segs;
  }, [count]);

  const envelopePoints = useMemo(() => new Float32Array(count * 3), [count]);
  const springLinePoints = useMemo(
    () =>
      springSegments.map(() => ({
        a: [0, 0, 0] as [number, number, number],
        b: [0, 0, 0] as [number, number, number],
      })),
    [springSegments]
  );

  useFrame(() => {
    if (!meshRef.current) return;
    const t = timeRef.current;
    let rhoMax = -Infinity;
    let rhoMin = Infinity;

    for (let i = 0; i < count; i++) {
      const x0 = x0Arr[i];
      const dx = longitudinalDisplacement(x0, t, A, k, omega);
      xPositions[i] = x0 + dx;
    }

    const rhos = computeCompressionRatios(xPositions, d0);
    for (let i = 0; i < count; i++) {
      rhoArr[i] = rhos[i];
      rhoMax = Math.max(rhoMax, rhos[i]);
      rhoMin = Math.min(rhoMin, rhos[i]);

      const { scale } = colorForLongitudinal(rhos[i], color);
      const hoverScale = hoveredIndex === i || selectedIndex === i ? 1.25 : 1;
      const s = preset.particleRadius * 2 * scale * hoverScale;

      dummy.position.set(xPositions[i], 0, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, color);

      if (selectedIndex === i && selectedSampleRef) {
        selectedSampleRef.current = rhos[i];
      }

      compressionData[i * 4] = rhos[i];
      compressionData[i * 4 + 1] = rhos[i];
      compressionData[i * 4 + 2] = rhos[i];
      compressionData[i * 4 + 3] = 1;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (compressionTextureRef.current) {
      compressionTextureRef.current.needsUpdate = true;
    }

    statsRef.current = { rhoMax, rhoMin };

    frameCounterRef.current++;
    if (frameCounterRef.current % 2 === 0) {
      for (let i = 0; i < count; i++) {
        envelopePoints[i * 3] = xPositions[i];
        envelopePoints[i * 3 + 1] = 0.35 + (rhos[i] - 1) * 0.5;
        envelopePoints[i * 3 + 2] = 0.05;
      }
    }

    if (frameCounterRef.current % 8 === 0) {
      setRenderTick((n) => n + 1);
    }

    for (let si = 0; si < springSegments.length; si++) {
      const { a, b } = springSegments[si];
      springLinePoints[si].a = [xPositions[a], 0, 0];
      springLinePoints[si].b = [xPositions[b], 0, 0];
    }
  });

  const envelopeLinePoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      pts.push([
        envelopePoints[i * 3],
        envelopePoints[i * 3 + 1],
        envelopePoints[i * 3 + 2],
      ]);
    }
    return pts;
  }, [count, envelopePoints]);

  return (
    <group position={offset} visible={opacity > 0}>
      {showSprings &&
        springLinePoints.map((seg, i) => {
          const di =
            Math.abs(seg.b[0] - seg.a[0]) - d0;
          const compressed = di < 0;
          return (
            <Line
              key={`spring-${i}`}
              points={[seg.a, seg.b]}
              color={
                compressed
                  ? WAVE_COLORS.longitudinalDense
                  : WAVE_COLORS.longitudinalSparse
              }
              lineWidth={compressed ? 1.4 : 1}
              transparent
              opacity={(compressed ? 0.4 : 0.2) * opacity}
            />
          );
        })}

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId != null) onHover(e.instanceId);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId == null) return;
          onSelect(e.instanceId, x0Arr[e.instanceId], rhoArr[e.instanceId]);
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhysicalMaterial
          metalness={0.35}
          roughness={0.12}
          clearcoat={1}
          emissive={WAVE_COLORS.longitudinalDense}
          emissiveIntensity={0.85}
          vertexColors
          transparent
          opacity={opacity}
        />
      </instancedMesh>

      {(hoveredIndex != null || selectedIndex != null) && (
        <mesh
          position={[xPositions[hoveredIndex ?? selectedIndex ?? 0], 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.22, 0.28, 32]} />
          <meshBasicMaterial
            color={WAVE_COLORS.propagation}
            transparent
            opacity={0.7 * opacity}
          />
        </mesh>
      )}

      <Line
        points={envelopeLinePoints}
        color={WAVE_COLORS.longitudinalDense}
        lineWidth={2}
        transparent
        opacity={0.75 * opacity}
      />

      <group position={[preset.chainLength / 2 + 1, 0, 0]}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.2, 0.5, 8]} />
          <meshStandardMaterial
            color={WAVE_COLORS.propagation}
            emissive={WAVE_COLORS.propagation}
            emissiveIntensity={
              isPlaying ? 0.4 + 0.4 * Math.sin(omega * timeRef.current) : 0.15
            }
          />
        </mesh>
      </group>

      {showLabels && (
        <WaveSprite
          text="↔ 振动方向"
          color={WAVE_COLORS.longitudinalSparse}
          position={[-preset.chainLength / 2 - 0.3, 1.2, 0]}
        />
      )}
    </group>
  );
}
