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
  spawnShockRing,
  type ShockRing,
  type MediumPreset,
} from "./shared-wave-utils";
import { WaveLabel, WaveHtml } from "./wave-label";

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
  showBreathField: boolean;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  selectedSampleRef?: React.MutableRefObject<number>;
  onHover: (index: number | null) => void;
  onSelect: (index: number, x0: number, rho: number) => void;
  shockPool: ShockRing[];
  lastShockCheck: React.MutableRefObject<number>;
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
  showBreathField,
  selectedIndex,
  hoveredIndex,
  selectedSampleRef,
  onHover,
  onSelect,
  shockPool,
  lastShockCheck,
  statsRef,
  compressionTextureRef,
  frameCounterRef,
  showLabels = true,
}: LongitudinalWaveProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const breathRef = useRef<THREE.Mesh>(null);
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

  const breathMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: null as THREE.DataTexture | null },
          uOpacity: { value: 0.18 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uMap;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float rho = texture2D(uMap, vec2(vUv.x, 0.5)).r;
            vec3 dense = vec3(1.0, 0.42, 0.21);
            vec3 sparse = vec3(0.93, 0.28, 0.6);
            vec3 c = mix(sparse, dense, clamp((rho - 0.85) / 0.3, 0.0, 1.0));
            float a = abs(rho - 1.0) * uOpacity;
            gl_FragColor = vec4(c, a);
          }
        `,
      }),
    []
  );

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
    breathMaterial.uniforms.uMap.value = tex;
    return () => {
      tex.dispose();
    };
  }, [count, compressionData, compressionTextureRef, breathMaterial]);

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

    if (isPlaying) {
      const observerX = 0;
      const idx = xPositions.findIndex((x, i) => {
        if (i === 0) return false;
        return xPositions[i - 1] <= observerX && x >= observerX;
      });
      if (idx > 0 && rhos[idx] > 1.08 && t - lastShockCheck.current > 0.4) {
        spawnShockRing(shockPool, t, observerX);
        lastShockCheck.current = t;
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
      {showBreathField && (
        <mesh ref={breathRef} position={[0, 0, -0.4]} rotation={[0, 0, 0]}>
          <planeGeometry args={[preset.chainLength, 2.5]} />
          <shaderMaterial attach="material" {...breathMaterial} />
        </mesh>
      )}

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
              lineWidth={compressed ? 2.5 : 1.5}
              transparent
              opacity={0.7 * opacity}
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
          metalness={0.7}
          roughness={0.15}
          clearcoat={1}
          emissive={WAVE_COLORS.longitudinalDense}
          emissiveIntensity={0.15}
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

      {Array.from({ length: count }).map((_, i) => {
        const rho = rhoArr[i] ?? 1;
        if (rho < 1.12) return null;
        const h = Math.min(0.35, (rho - 1) * 0.5);
        return (
          <mesh key={`bar-${i}`} position={[xPositions[i], 0.12 + h / 2, 0]}>
            <boxGeometry args={[0.05, h, 0.05]} />
            <meshBasicMaterial
              color={WAVE_COLORS.longitudinalDense}
              transparent
              opacity={0.35 * opacity}
            />
          </mesh>
        );
      })}

      <Line
        points={envelopeLinePoints}
        color={WAVE_COLORS.longitudinalDense}
        lineWidth={2}
        transparent
        opacity={0.75 * opacity}
      />

      {shockPool.map((ring, i) => {
        if (!ring.active) return null;
        const age = timeRef.current - ring.startTime;
        if (age > 0.5) {
          ring.active = false;
          return null;
        }
        const radius = THREE.MathUtils.lerp(0.2, 1, age / 0.5);
        const op = (1 - age / 0.5) * opacity;
        return (
          <mesh
            key={`shock-${i}`}
            position={[ring.x, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[radius - 0.05, radius, 32]} />
            <meshBasicMaterial
              color={WAVE_COLORS.longitudinalDense}
              transparent
              opacity={op * 0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

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
        <WaveHtml position={[-preset.chainLength / 2 - 0.3, 1.2, 0]}>
          <WaveLabel color={WAVE_COLORS.longitudinalSparse}>↔ 振动方向</WaveLabel>
        </WaveHtml>
      )}
    </group>
  );
}
