"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import {
  WAVE_COLORS,
  transverseDisplacement,
  transverseVelocity,
  colorForTransverse,
  buildEquilibriumPositions,
  type MediumPreset,
} from "./shared-wave-utils";
import { WaveLabel, WaveHtml } from "./wave-label";

export interface TransverseWaveProps {
  offset?: [number, number, number];
  opacity?: number;
  amplitude: number;
  k: number;
  omega: number;
  timeRef: React.MutableRefObject<number>;
  preset: MediumPreset;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  selectedSampleRef?: React.MutableRefObject<number>;
  onHover: (index: number | null) => void;
  onSelect: (index: number, x0: number, y: number, vy: number) => void;
  statsRef: React.MutableRefObject<{ yMax: number; yMin: number }>;
  frameCounterRef: React.MutableRefObject<number>;
  showLabels?: boolean;
}

export function TransverseWave({
  offset = [0, 0, 0],
  opacity = 1,
  amplitude,
  k,
  omega,
  timeRef,
  preset,
  selectedIndex,
  hoveredIndex,
  selectedSampleRef,
  onHover,
  onSelect,
  statsRef,
  frameCounterRef,
  showLabels = true,
}: TransverseWaveProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const count = preset.particleCount;
  const A = amplitude * preset.transverseAmplitudeScale;
  const x0Arr = useMemo(
    () => buildEquilibriumPositions(count, preset.chainLength),
    [count, preset.chainLength]
  );

  const envelopePoints = useMemo(
    () => new Float32Array(count * 3),
    [count]
  );

  const firstPeakIndex = useMemo(() => {
    let best = 0;
    let bestY = -Infinity;
    for (let i = 0; i < count; i++) {
      const y = transverseDisplacement(x0Arr[i], 0, A, k, omega);
      if (y > bestY) {
        bestY = y;
        best = i;
      }
    }
    return best;
  }, [count, x0Arr, A, k, omega]);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = timeRef.current;
    let yMax = -Infinity;
    let yMin = Infinity;

    for (let i = 0; i < count; i++) {
      const x0 = x0Arr[i];
      const y = transverseDisplacement(x0, t, A, k, omega);
      yMax = Math.max(yMax, y);
      yMin = Math.min(yMin, y);

      const hoverScale = hoveredIndex === i || selectedIndex === i ? 1.25 : 1;
      dummy.position.set(x0, y, 0);
      dummy.scale.setScalar(preset.particleRadius * 2 * hoverScale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      colorForTransverse(y, A, color);
      meshRef.current.setColorAt(i, color);

      if (selectedIndex === i && selectedSampleRef) {
        selectedSampleRef.current = y;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    statsRef.current = { yMax, yMin };

    frameCounterRef.current++;
    if (frameCounterRef.current % 2 === 0) {
      for (let i = 0; i < count; i++) {
        const x0 = x0Arr[i];
        const y = transverseDisplacement(x0, t, A, k, omega);
        envelopePoints[i * 3] = x0;
        envelopePoints[i * 3 + 1] = y;
        envelopePoints[i * 3 + 2] = 0.05;
      }
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
          const x0 = x0Arr[e.instanceId];
          const t = timeRef.current;
          const y = transverseDisplacement(x0, t, A, k, omega);
          const vy = transverseVelocity(x0, t, A, k, omega);
          onSelect(e.instanceId, x0, y, vy);
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhysicalMaterial
          metalness={0.7}
          roughness={0.15}
          clearcoat={1}
          emissive={WAVE_COLORS.transverseCrest}
          emissiveIntensity={0.15}
          vertexColors
          transparent
          opacity={opacity}
        />
      </instancedMesh>

      {(hoveredIndex != null || selectedIndex != null) && (
        <mesh
          position={[
            x0Arr[hoveredIndex ?? selectedIndex ?? 0],
            transverseDisplacement(
              x0Arr[hoveredIndex ?? selectedIndex ?? 0],
              timeRef.current,
              A,
              k,
              omega
            ),
            0,
          ]}
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
        color={WAVE_COLORS.transverseCrest}
        lineWidth={2}
        transparent
        opacity={0.85 * opacity}
      />

      <group position={[x0Arr[firstPeakIndex], 0, 0.3]}>
        <Line
          points={[
            [0, -0.6, 0],
            [0, 0.6, 0],
          ]}
          color={WAVE_COLORS.transverseTrough}
          lineWidth={2}
          transparent
          opacity={0.5 * opacity}
        />
        {showLabels && (
          <WaveHtml position={[0, 1.5, 0]}>
            <WaveLabel color={WAVE_COLORS.transverseTrough}>↕ 振动方向</WaveLabel>
          </WaveHtml>
        )}
      </group>

      <group position={[preset.chainLength / 2 + 1, 0, 0]}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.2, 0.5, 8]} />
          <meshStandardMaterial
            color={WAVE_COLORS.propagation}
            emissive={WAVE_COLORS.propagation}
            emissiveIntensity={0.4 + 0.4 * Math.sin(omega * timeRef.current)}
          />
        </mesh>
      </group>
    </group>
  );
}
