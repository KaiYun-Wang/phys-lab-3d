"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { WAVE_COLORS } from "./shared-wave-utils";
import { WaveHtml, WaveLabel } from "./wave-label";

export function XAxis({ length, showLabel = true }: { length: number; showLabel?: boolean }) {
  const half = length / 2;
  const ext = half + 0.6;

  const ticks = useMemo(() => {
    const pts: [number, number, number][][] = [];
    const step = 2;
    for (let x = -half; x <= half + 0.01; x += step) {
      pts.push([
        [x, 0.1, 0],
        [x, 0.32, 0],
      ]);
    }
    return pts;
  }, [half]);

  return (
    <group>
      <Line
        points={[
          [-ext, 0.12, 0],
          [ext, 0.12, 0],
        ]}
        color={WAVE_COLORS.propagation}
        lineWidth={4}
      />
      <Line
        points={[
          [-ext, 0.12, 0],
          [ext, 0.12, 0],
        ]}
        color="#ffffff"
        lineWidth={1.5}
        transparent
        opacity={0.35}
      />
      {ticks.map((seg, i) => (
        <Line key={`tick-${i}`} points={seg} color={WAVE_COLORS.propagation} lineWidth={2.5} />
      ))}
      <mesh position={[ext + 0.18, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.42, 8]} />
        <meshBasicMaterial color={WAVE_COLORS.propagation} />
      </mesh>
      {showLabel && (
        <WaveHtml position={[ext + 1.1, 0.55, 0]}>
          <WaveLabel color={WAVE_COLORS.propagation}>x 传播方向 →</WaveLabel>
        </WaveHtml>
      )}
    </group>
  );
}
