"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WAVE_COLORS, phaseLineX, wrapPhaseLineX } from "./shared-wave-utils";

interface PhaseLinesProps {
  timeRef: React.MutableRefObject<number>;
  k: number;
  omega: number;
  chainLength: number;
  transverseOffset: [number, number, number];
  longitudinalOffset: [number, number, number];
  transverseOpacity: number;
  longitudinalOpacity: number;
  particleCount: number;
}

function makeDashedLine(color: string, opacity: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const material = new THREE.LineDashedMaterial({
    color,
    transparent: true,
    opacity,
    dashSize: 0.15,
    gapSize: 0.1,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function PhaseLines({
  timeRef,
  k,
  omega,
  chainLength,
  transverseOffset,
  longitudinalOffset,
  transverseOpacity,
  longitudinalOpacity,
  particleCount,
}: PhaseLinesProps) {
  const tRingRef = useRef<THREE.Mesh>(null);
  const lRingRef = useRef<THREE.Mesh>(null);

  const tLine = useMemo(
    () => makeDashedLine(WAVE_COLORS.propagation, transverseOpacity * 0.8),
    [transverseOpacity]
  );
  const lLine = useMemo(
    () => makeDashedLine(WAVE_COLORS.propagation, longitudinalOpacity * 0.8),
    [longitudinalOpacity]
  );

  useEffect(() => {
    return () => {
      tLine.geometry.dispose();
      (tLine.material as THREE.Material).dispose();
      lLine.geometry.dispose();
      (lLine.material as THREE.Material).dispose();
    };
  }, [tLine, lLine]);

  useFrame(() => {
    const phaseX = wrapPhaseLineX(phaseLineX(timeRef.current, k, omega), chainLength);
    const highlightIndex = Math.round(
      ((phaseX + chainLength / 2) / chainLength) * (particleCount - 1)
    );
    const particleX =
      -chainLength / 2 +
      (highlightIndex / Math.max(particleCount - 1, 1)) * chainLength;

    const setLine = (line: THREE.Line, ox: number, oy: number, oz: number, px: number) => {
      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, ox + px, oy - 1.2, oz);
      pos.setXYZ(1, ox + px, oy + 1.2, oz);
      pos.needsUpdate = true;
      line.computeLineDistances();
    };

    if (transverseOpacity > 0) {
      setLine(tLine, transverseOffset[0], transverseOffset[1], transverseOffset[2], phaseX);
      tRingRef.current?.position.set(
        transverseOffset[0] + particleX,
        transverseOffset[1],
        transverseOffset[2] + 0.15
      );
    }
    if (longitudinalOpacity > 0) {
      setLine(lLine, longitudinalOffset[0], longitudinalOffset[1], longitudinalOffset[2], phaseX);
      lRingRef.current?.position.set(
        longitudinalOffset[0] + particleX,
        longitudinalOffset[1],
        longitudinalOffset[2] + 0.15
      );
    }
  });

  return (
    <>
      {transverseOpacity > 0 && (
        <>
          <primitive object={tLine} />
          <mesh ref={tRingRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshBasicMaterial
              color={WAVE_COLORS.propagation}
              transparent
              opacity={0.5}
            />
          </mesh>
        </>
      )}
      {longitudinalOpacity > 0 && (
        <>
          <primitive object={lLine} />
          <mesh ref={lRingRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshBasicMaterial
              color={WAVE_COLORS.propagation}
              transparent
              opacity={0.5}
            />
          </mesh>
        </>
      )}
    </>
  );
}
