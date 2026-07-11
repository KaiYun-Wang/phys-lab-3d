"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { clamp } from "@/utils/physics";

export interface SpecialRelativityData {
  velocity: number;
  gamma: number;
  lengthPercent: number;
  clockPeriod: number;
  relativisticMass: number;
}

interface SpecialRelativitySceneProps {
  velocity?: number;
  isPlaying?: boolean;
  simulationSpeed?: number;
  resetTrigger?: number;
  onDataChange?: (data: SpecialRelativityData) => void;
}

const STAR_COUNT = 1200;
const TUBE_LENGTH = 120;
const SHIP_LENGTH = 8;

function createLabelTexture(text: string, options: { fontSize?: number; color?: string; bg?: string; padding?: number } = {}): THREE.CanvasTexture {
  const { fontSize = 28, color = "#ffffff", bg = "rgba(2,6,23,0.65)", padding = 10 } = options;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width + padding * 2);
  const h = Math.ceil(fontSize * 1.4 + padding);
  canvas.width = w;
  canvas.height = h;

  // Background pill
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 8);
  ctx.fill();

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function SpecialRelativitySceneComponent({
  velocity = 0,
  isPlaying = true,
  simulationSpeed = 1,
  resetTrigger = 0,
  onDataChange,
}: SpecialRelativitySceneProps) {
  const shipGroupRef = useRef<THREE.Group>(null);
  const clockHandRef = useRef<THREE.Mesh>(null);
  const engineGlowRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const gamma = useMemo(() => 1 / Math.sqrt(Math.max(0.0001, 1 - velocity * velocity)), [velocity]);
  const lengthPercent = useMemo(() => 100 / gamma, [gamma]);
  const clockPeriod = useMemo(() => 2 * gamma, [gamma]);
  const relativisticMass = useMemo(() => gamma, [gamma]);

  // Report data upstream
  useEffect(() => {
    onDataChange?.({
      velocity,
      gamma,
      lengthPercent,
      clockPeriod,
      relativisticMass,
    });
  }, [velocity, gamma, lengthPercent, clockPeriod, relativisticMass, onDataChange]);

  // Starfield: long white streaks along x
  const starsGeo = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * TUBE_LENGTH;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      sizes[i] = 0.03 + Math.random() * 0.08;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const starsMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.12,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  // Lorentz curve line (γ vs v/c) — always visible as reference
  // Chart origin shifted up-left and further back so it is not blocked by the ship
  const CX0 = -22;
  const CY0 = 1;
  const CZ = -18;
  const lorentzCurve = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 120; i++) {
      const vv = i / 120;
      if (vv >= 0.999) continue;
      const gg = 1 / Math.sqrt(1 - vv * vv);
      pts.push([vv * 14 + CX0, gg * 0.9 + CY0, CZ]);
    }
    return pts;
  }, []);

  const currentPoint = useMemo(() => {
    const gg = gamma;
    const vv = velocity;
    return [
      [vv * 14 + CX0, gg * 0.9 + CY0, CZ],
      [vv * 14 + CX0, CY0, CZ],
    ] as [number, number, number][];
  }, [velocity, gamma]);

  // Reset effect
  useEffect(() => {
    timeRef.current = 0;
  }, [resetTrigger]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033) * simulationSpeed;
    if (isPlaying) {
      timeRef.current += dt;
    }

    // Length contraction: scale the whole ship group along x
    if (shipGroupRef.current) {
      const targetScaleX = clamp(1 / gamma, 0.08, 1);
      shipGroupRef.current.scale.x = THREE.MathUtils.lerp(shipGroupRef.current.scale.x, targetScaleX, 0.12);
    }

    // Clock hand: ticks slower by gamma
    if (clockHandRef.current) {
      const baseAngularSpeed = Math.PI;
      const handAngle = timeRef.current * (baseAngularSpeed / gamma);
      clockHandRef.current.rotation.z = -handAngle;
    }

    // Engine glow pulsing/intensity tied to speed
    if (engineGlowRef.current) {
      const pulse = 1 + 0.15 * Math.sin(timeRef.current * 10);
      const intensityScale = 0.6 + velocity * 2.2;
      engineGlowRef.current.scale.setScalar(pulse * intensityScale);
    }

    // Stars stream past faster as v approaches c
    if (starsRef.current && isPlaying) {
      const positions = starsRef.current.geometry.attributes.position.array as Float32Array;
      const speedFactor = 2 + velocity * 80;
      for (let i = 0; i < STAR_COUNT; i++) {
        const idx = i * 3;
        positions[idx] -= speedFactor * dt;
        if (positions[idx] < -TUBE_LENGTH / 2) {
          positions[idx] = TUBE_LENGTH / 2;
          positions[idx + 1] = (Math.random() - 0.5) * 40;
          positions[idx + 2] = (Math.random() - 0.5) * 40;
        }
      }
      starsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const shipColor = "#e2e8f0";
  const cockpitColor = "#06b6d4";
  const clockColor = "#a855f7";
  const engineColor = "#f59e0b";

  return (
    <group>
      <EffectComposer>
        <Bloom intensity={0.45} luminanceThreshold={0.5} luminanceSmoothing={0.6} mipmapBlur />
        <Vignette offset={0.2} darkness={0.45} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      {/* Ambient starfield glow */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 12, 8]} intensity={1.6} color="#ffffff" castShadow />
      <pointLight position={[-6, 2, 0]} intensity={1.2} color="#60a5fa" distance={30} decay={1.5} />
      <pointLight position={[0, -2, 6]} intensity={0.8} color="#a78bfa" distance={25} decay={1.5} />

      {/* Streaming stars */}
      <points ref={starsRef} geometry={starsGeo} material={starsMat} />

      {/* Floor grid for spatial reference */}
      <gridHelper args={[80, 80, "#1e1b4b", "#0f0f25"]} position={[0, -10, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.05, 0]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <meshStandardMaterial color="#050510" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Speed lane rails */}
      <mesh position={[0, -9.8, -6]}>
        <boxGeometry args={[60, 0.08, 0.08]} />
        <meshBasicMaterial color="#1e3a8a" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, -9.8, 6]}>
        <boxGeometry args={[60, 0.08, 0.08]} />
        <meshBasicMaterial color="#1e3a8a" transparent opacity={0.4} />
      </mesh>

      {/* ═══ Spaceship group ═══ */}
      {/* Ship is built along +X; length contraction scales along X */}
      <group ref={shipGroupRef} position={[0, 0, 0]}>
        {/* Main fuselage (horizontal along X) */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.1, 1.1, SHIP_LENGTH, 32]} />
          <meshPhysicalMaterial
            color={shipColor}
            metalness={0.55}
            roughness={0.25}
            clearcoat={0.6}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Nose cone at +X */}
        <mesh castShadow position={[SHIP_LENGTH / 2 + 1.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[1.1, 2.3, 32]} />
          <meshPhysicalMaterial
            color={shipColor}
            metalness={0.55}
            roughness={0.25}
            clearcoat={0.6}
          />
        </mesh>

        {/* Cockpit window */}
        <mesh position={[1.2, 0.9, 0]}>
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshPhysicalMaterial
            color={cockpitColor}
            metalness={0.1}
            roughness={0.05}
            transmission={0.35}
            thickness={0.5}
            emissive={cockpitColor}
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Tail fins */}
        {[-1, 1].map((sign) => (
          <mesh key={sign} position={[-SHIP_LENGTH / 2 + 0.3, sign * 1.2, 0]} rotation={[0, 0, sign * 0.35]}>
            <boxGeometry args={[2.0, 0.12, 1.4]} />
            <meshPhysicalMaterial color="#94a3b8" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        {/* Engine nozzle at -X */}
        <mesh position={[-SHIP_LENGTH / 2 - 0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.65, 0.45, 1.2, 24]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
        </mesh>

        {/* Engine glow */}
        <mesh ref={engineGlowRef} position={[-SHIP_LENGTH / 2 - 1.5, 0, 0]}>
          <sphereGeometry args={[0.65, 24, 24]} />
          <meshBasicMaterial color={engineColor} transparent opacity={0.75} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight position={[-SHIP_LENGTH / 2 - 1.8, 0, 0]} color={engineColor} intensity={3} distance={10} decay={2} />

        {/* ═══ On-ship clock ═══ */}
        {/* Face vertical (XY plane), hand rotates in plane aligned with ship motion */}
        <group position={[2.5, 1.25, 0.8]}>
          {/* Clock rim */}
          <mesh>
            <torusGeometry args={[0.42, 0.06, 16, 32]} />
            <meshStandardMaterial color={clockColor} metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Clock face */}
          <mesh>
            <circleGeometry args={[0.4, 32]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0.02]}
              >
                <boxGeometry args={[0.04, 0.08, 0.01]} />
                <meshBasicMaterial color="#e2e8f0" />
              </mesh>
            );
          })}
          {/* Clock hand — pivot group at clock center, hand mesh offset so bottom stays at center */}
          <group ref={clockHandRef}>
            <mesh position={[0, 0.16, 0.03]}>
              <boxGeometry args={[0.05, 0.32, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </group>
          {/* Clock center dot */}
          <mesh position={[0, 0, 0.04]}>
            <circleGeometry args={[0.06, 16]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
        </group>
      </group>

      {/* ═══ Floating labels / reference frame markers ═══ */}
      {/* Lorentz factor γ curve in 3D space */}
      <group position={[0, 0, 0]}>
        <Line points={lorentzCurve} color="#8b5cf6" lineWidth={2} opacity={0.5} />
        <Line points={[[CX0, CY0, CZ], [-8, CY0, CZ]]} color="#334155" lineWidth={1} opacity={0.4} />
        <Line points={[[CX0, CY0, CZ], [CX0, 10, CZ]]} color="#334155" lineWidth={1} opacity={0.4} />
        <Line points={currentPoint} color="#22d3ee" lineWidth={2} dashed />
        {/* Current point marker */}
        <mesh position={[velocity * 14 + CX0, gamma * 0.9 + CY0, CZ]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>

        {/* Chart title */}
        <sprite position={[-15, 11.6, CZ]} scale={[6.5, 1.3, 1]}>
          <spriteMaterial map={createLabelTexture("洛伦兹因子 γ 曲线", { fontSize: 32, color: "#c4b5fd" })} transparent depthTest={false} />
        </sprite>

        {/* Axis labels */}
        <sprite position={[-15, -0.5, CZ]} scale={[2.4, 0.8, 1]}>
          <spriteMaterial map={createLabelTexture("v / c", { fontSize: 26, color: "#22d3ee" })} transparent depthTest={false} />
        </sprite>
        <sprite position={[-24.2, 5.5, CZ]} scale={[1.3, 0.8, 1]}>
          <spriteMaterial map={createLabelTexture("γ", { fontSize: 28, color: "#a855f7" })} transparent depthTest={false} />
        </sprite>

        {/* X-axis ticks */}
        <sprite position={[-22, -0.1, CZ]} scale={[1.2, 0.55, 1]}>
          <spriteMaterial map={createLabelTexture("0", { fontSize: 20, color: "#94a3b8" })} transparent depthTest={false} />
        </sprite>
        <sprite position={[-15, -0.1, CZ]} scale={[1.2, 0.55, 1]}>
          <spriteMaterial map={createLabelTexture("0.5", { fontSize: 20, color: "#94a3b8" })} transparent depthTest={false} />
        </sprite>
        <sprite position={[-8, -0.1, CZ]} scale={[1.2, 0.55, 1]}>
          <spriteMaterial map={createLabelTexture("1", { fontSize: 20, color: "#94a3b8" })} transparent depthTest={false} />
        </sprite>

        {/* Y-axis ticks */}
        <sprite position={[-23.2, 1.9, CZ]} scale={[1.2, 0.55, 1]}>
          <spriteMaterial map={createLabelTexture("1", { fontSize: 20, color: "#94a3b8" })} transparent depthTest={false} />
        </sprite>
        <sprite position={[-23.2, 5.5, CZ]} scale={[1.2, 0.55, 1]}>
          <spriteMaterial map={createLabelTexture("5", { fontSize: 20, color: "#94a3b8" })} transparent depthTest={false} />
        </sprite>
        <sprite position={[-23.2, 10, CZ]} scale={[1.4, 0.55, 1]}>
          <spriteMaterial map={createLabelTexture("10", { fontSize: 20, color: "#94a3b8" })} transparent depthTest={false} />
        </sprite>
      </group>

      {/* Speed streaks for high velocity */}
      {velocity > 0.3 && (
        <mesh position={[-20, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[velocity * 0.08, velocity * 0.08, 50, 8]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.06} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}

export default SpecialRelativitySceneComponent;
