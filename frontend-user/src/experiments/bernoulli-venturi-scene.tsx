"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { lerp, clamp } from "@/utils/physics";

export type FluidType = "water" | "glycerol";

export interface BernoulliData {
  v1: number;
  v2: number;
  areaRatio: number;
  rho: number;
  deltaP: number;
}

interface BernoulliVenturiSceneProps {
  v1?: number;
  areaRatio?: number;
  fluid?: FluidType;
  isPlaying?: boolean;
  simulationSpeed?: number;
  resetTrigger?: number;
  onDataChange?: (data: BernoulliData) => void;
}

export const FLUID_DENSITIES: Record<FluidType, number> = {
  water: 1000,
  glycerol: 1260,
};

const FLUID_COLORS: Record<FluidType, THREE.Color> = {
  water: new THREE.Color("#2563eb"),
  glycerol: new THREE.Color("#fbbf24"),
};

const PIPE_LENGTH = 16;
const PIPE_HALF_LENGTH = PIPE_LENGTH / 2;
const R1 = 1.5;
const STRAIGHT_LENGTH = 4;
const TRANSITION_HALF = (PIPE_LENGTH - 2 * STRAIGHT_LENGTH) / 2;
const PARTICLE_COUNT = 400;

function radiusAt(x: number, r2: number): number {
  if (x <= -TRANSITION_HALF) return R1;
  if (x >= TRANSITION_HALF) return r2;
  const t = (x + TRANSITION_HALF) / (2 * TRANSITION_HALF);
  const smooth = t * t * (3 - 2 * t);
  return R1 + (r2 - R1) * smooth;
}

function speedAt(x: number, v1: number, r2: number): number {
  const r = radiusAt(x, r2);
  return v1 * (R1 / r) ** 2;
}

function createPipeGeometry(r2: number): THREE.BufferGeometry {
  const segmentsLength = 120;
  const segmentsRadial = 32;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentsLength; i++) {
    const t = i / segmentsLength;
    const x = -PIPE_HALF_LENGTH + t * PIPE_LENGTH;
    const r = radiusAt(x, r2);
    for (let j = 0; j <= segmentsRadial; j++) {
      const theta = (j / segmentsRadial) * Math.PI * 2;
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      positions.push(x, y, z);
      normals.push(0, Math.cos(theta), Math.sin(theta));
    }
  }

  for (let i = 0; i < segmentsLength; i++) {
    for (let j = 0; j < segmentsRadial; j++) {
      const a = i * (segmentsRadial + 1) + j;
      const b = a + segmentsRadial + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const r = 16;
  const w = 220;
  const h = 52;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
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

  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function BernoulliVenturiSceneComponent({
  v1 = 2.0,
  areaRatio = 0.5,
  fluid = "water",
  isPlaying = true,
  simulationSpeed = 1,
  resetTrigger = 0,
  onDataChange,
}: BernoulliVenturiSceneProps) {
  const rho = FLUID_DENSITIES[fluid];
  const r2 = R1 * Math.sqrt(areaRatio);

  const v2 = v1 / areaRatio;
  const deltaP = 0.5 * rho * (v2 * v2 - v1 * v1);

  const pipeGeo = useMemo(() => createPipeGeometry(r2), [r2]);
  const pipeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: FLUID_COLORS[fluid],
        metalness: 0.15,
        roughness: 0.15,
        transmission: 0.35,
        thickness: 0.6,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        clearcoat: 0.8,
        emissive: FLUID_COLORS[fluid],
        emissiveIntensity: 0.1,
      }),
    [fluid]
  );

  const liquidMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: FLUID_COLORS[fluid],
        metalness: 0.1,
        roughness: 0.25,
        transmission: 0.15,
        thickness: 0.4,
        transparent: true,
        opacity: 0.9,
        clearcoat: 0.5,
        emissive: FLUID_COLORS[fluid],
        emissiveIntensity: 0.35,
      }),
    [fluid]
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e0f2fe",
        metalness: 0.05,
        roughness: 0.05,
        transmission: 0.8,
        thickness: 0.25,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    []
  );

  const particleRef = useRef<THREE.InstancedMesh>(null);
  const leftLiquidRef = useRef<THREE.Mesh>(null);
  const rightLiquidRef = useRef<THREE.Mesh>(null);
  const leftConnectorRef = useRef<THREE.Mesh>(null);
  const rightConnectorRef = useRef<THREE.Mesh>(null);
  const deltaLabelRef = useRef<THREE.Sprite>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        t: Math.random(),
        offsetR: Math.sqrt(Math.random()) * (R1 * 0.75),
        offsetTheta: Math.random() * Math.PI * 2,
        speedJitter: 0.85 + Math.random() * 0.3,
      })),
    []
  );

  const targetHeights = useRef({ left: 5, right: 5 });
  const currentHeights = useRef({ left: 5, right: 5 });

  useEffect(() => {
    const scale = 0.00015;
    const referenceHeight = 4.5;
    targetHeights.current.left = referenceHeight;
    targetHeights.current.right = clamp(
      referenceHeight - deltaP * scale,
      0.2,
      5.8
    );

    onDataChange?.({ v1, v2, areaRatio, rho, deltaP });
  }, [v1, areaRatio, fluid, rho, v2, deltaP, onDataChange]);

  useEffect(() => {
    currentHeights.current.left = targetHeights.current.left;
    currentHeights.current.right = targetHeights.current.right;
  }, [resetTrigger]);

  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles[i].t = (i + Math.random()) / PARTICLE_COUNT;
    }
  }, [fluid]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033) * simulationSpeed;

    currentHeights.current.left = lerp(
      currentHeights.current.left,
      targetHeights.current.left,
      0.08
    );
    currentHeights.current.right = lerp(
      currentHeights.current.right,
      targetHeights.current.right,
      0.08
    );

    if (leftLiquidRef.current) {
      const h = currentHeights.current.left;
      leftLiquidRef.current.scale.set(1, h, 1);
      leftLiquidRef.current.position.y = h / 2;
    }
    if (rightLiquidRef.current) {
      const h = currentHeights.current.right;
      rightLiquidRef.current.scale.set(1, h, 1);
      rightLiquidRef.current.position.y = h / 2;
    }
    if (leftConnectorRef.current) {
      const h = currentHeights.current.left;
      const connectorH = Math.min(h, radiusAt(-5, r2));
      leftConnectorRef.current.scale.set(1, connectorH, 1);
      leftConnectorRef.current.position.y = -connectorH / 2;
    }
    if (rightConnectorRef.current) {
      const h = currentHeights.current.right;
      const connectorH = Math.min(h, radiusAt(5, r2));
      rightConnectorRef.current.scale.set(1, connectorH, 1);
      rightConnectorRef.current.position.y = -connectorH / 2;
    }

    const positions = deltaLine.geometry.attributes.position.array as Float32Array;
    const hL = currentHeights.current.left;
    const hR = currentHeights.current.right;
    const baseL = radiusAt(-5, r2);
    const baseR = radiusAt(5, r2);
    const hL_world = baseL + hL;
    const hR_world = baseR + hR;
    positions[0] = -5;
    positions[1] = hL_world;
    positions[2] = 0;
    positions[3] = 5.6;
    positions[4] = hL_world;
    positions[5] = 0;
    positions[6] = 5.6;
    positions[7] = hL_world;
    positions[8] = 0;
    positions[9] = 5.6;
    positions[10] = hR_world;
    positions[11] = 0;
    deltaLine.geometry.attributes.position.needsUpdate = true;
    deltaLine.computeLineDistances();
    if (deltaLabelRef.current) {
      deltaLabelRef.current.position.set(5.9, (hL_world + hR_world) / 2, 0);
    }

    if (particleRef.current && isPlaying) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.t +=
          (speedAt(-PIPE_HALF_LENGTH + p.t * PIPE_LENGTH, v1, r2) *
            p.speedJitter *
            dt) /
          PIPE_LENGTH;
        if (p.t > 1) p.t -= 1;

        const x = -PIPE_HALF_LENGTH + p.t * PIPE_LENGTH;
        const r = radiusAt(x, r2);
        const localV = speedAt(x, v1, r2);
        const y = p.offsetR * Math.cos(p.offsetTheta) * (r / R1);
        const z = p.offsetR * Math.sin(p.offsetTheta) * (r / R1);

        dummy.position.set(x, y, z);
        const size = 0.12;
        dummy.scale.set(size, size, size);
        dummy.updateMatrix();
        particleRef.current.setMatrixAt(i, dummy.matrix);

        const speedNorm = clamp(localV / 10, 0, 1);
        const baseColor = FLUID_COLORS[fluid];
        const color = new THREE.Color().lerpColors(
          baseColor,
          new THREE.Color("#ffffff"),
          speedNorm
        );
        particleRef.current.setColorAt(i, color);
      }
      particleRef.current.instanceMatrix.needsUpdate = true;
      if (particleRef.current.instanceColor) {
        particleRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  const labelP1 = useMemo(() => createLabelTexture("P₁"), []);
  const labelP2 = useMemo(() => createLabelTexture("P₂"), []);
  const labelV1 = useMemo(() => createLabelTexture("v₁"), []);
  const labelV2 = useMemo(() => createLabelTexture("v₂"), []);
  const labelDeltaP = useMemo(() => createLabelTexture("ΔP"), []);

  const deltaLine = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(12);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineDashedMaterial({
      color: "#f87171",
      dashSize: 0.3,
      gapSize: 0.15,
      scale: 1,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, []);



  return (
    <group>
      <EffectComposer>
        <Bloom intensity={0.45} luminanceThreshold={0.5} luminanceSmoothing={0.6} mipmapBlur />
        <Vignette offset={0.2} darkness={0.45} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 12, 8]} intensity={1.6} color="#ffffff" castShadow />
      <pointLight position={[-6, 2, 0]} intensity={1.2} color="#60a5fa" distance={30} decay={1.5} />
      <pointLight position={[0, -2, 6]} intensity={0.8} color="#a78bfa" distance={25} decay={1.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7, 0]} receiveShadow>
        <planeGeometry args={[40, 25]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.08} />
      </mesh>
      <gridHelper args={[40, 40, "#1e3a8a", "#0f172a"]} position={[0, -6.99, 0]} />

      <mesh position={[0, -7.2, 0]} receiveShadow>
        <boxGeometry args={[22, 0.4, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.3} />
      </mesh>

      <mesh geometry={pipeGeo} material={pipeMat} castShadow receiveShadow />

      {[-5, 5].map((x, idx) => {
        const isLeft = idx === 0;
        return (
          <group key={x} position={[x, radiusAt(x, r2), 0]}>
            <mesh position={[0, 3, 0]} material={glassMat}>
              <cylinderGeometry args={[0.5, 0.5, 6, 24]} />
            </mesh>
            <mesh
              ref={isLeft ? leftLiquidRef : rightLiquidRef}
              position={[0, 0.5, 0]}
              material={liquidMat}
            >
              <cylinderGeometry args={[0.38, 0.38, 1, 24]} />
            </mesh>
            <mesh position={[0, -radiusAt(x, r2) / 2, 0]} material={glassMat}>
              <cylinderGeometry args={[0.18, 0.18, radiusAt(x, r2), 16]} />
            </mesh>
            <mesh
              ref={isLeft ? leftConnectorRef : rightConnectorRef}
              position={[0, -radiusAt(x, r2) / 2, 0]}
              material={liquidMat}
            >
              <cylinderGeometry args={[0.1, 0.1, radiusAt(x, r2), 16]} />
            </mesh>
            <sprite position={[0, 7, 0]} scale={[2.2, 1.0, 1]}>
              <spriteMaterial map={isLeft ? labelP1 : labelP2} transparent depthTest={false} />
            </sprite>
          </group>
        );
      })}

      <sprite position={[-5, -2.5, 0]} scale={[3, 1.4, 1]}>
        <spriteMaterial map={labelV1} transparent depthTest={false} />
      </sprite>
      <sprite position={[5, -2.5, 0]} scale={[3, 1.4, 1]}>
        <spriteMaterial map={labelV2} transparent depthTest={false} />
      </sprite>

      <primitive object={deltaLine} />
      <sprite ref={deltaLabelRef} position={[5.9, 5.5, 0]} scale={[1.6, 0.8, 1]}>
        <spriteMaterial map={labelDeltaP} transparent depthTest={false} />
      </sprite>

      <instancedMesh ref={particleRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial vertexColors metalness={0.3} roughness={0.4} />
      </instancedMesh>

      <mesh position={[-9, -5.8, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.4, 4]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[9, -5.8, 0]}>
        <boxGeometry args={[0.4, 0.4, 4]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default BernoulliVenturiSceneComponent;
