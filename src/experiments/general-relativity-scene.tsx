"use client";

import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import {
  schwarzschildRadius,
  gravitationalRedshift,
  spacetimeEmbeddingY,
  iscoRadius,
  photonSphereRadius,
  createTimelikeGeodesic,
  timelikeGeodesicStep,
  classifySchwarzschildOrbit,
  nullGeodesicDeflection,
  tracePhotonPath,
  perihelionPrecessionRate,
  type TimelikeGeodesicState,
} from "@/utils/physics";

export interface GeneralRelativityData {
  rs: number;
  rOverRs: number;
  redshift: number;
  orbitType: string;
  deflectionAngle: number;
  precessionRate: number;
  isco: number;
  photonSphere: number;
  activeParticles: number;
}

interface GeneralRelativitySceneProps {
  onDataChange?: (data: GeneralRelativityData) => void;
  blackHoleMass?: number;
  particleLaunchRadius?: number;
  particleTangentialVelocity?: number;
  particleRadialVelocity?: number;
  photonImpactParam?: number;
  showSpacetimeGrid?: boolean;
  showAccretionDisk?: boolean;
  showStarfield?: boolean;
  showPhotonPaths?: boolean;
  showParticleTrails?: boolean;
  launchParticleTrigger?: number;
  launchPhotonTrigger?: number;
  isPlaying?: boolean;
  simulationSpeed?: number;
  resetTrigger?: number;
}

interface TestParticle {
  state: TimelikeGeodesicState;
  active: boolean;
  absorbed: boolean;
  trail: THREE.Vector3[];
}

interface AnimatedPhoton {
  points: [number, number, number][];
  progress: number;
  absorbed: boolean;
  done: boolean;
}

const starVS = `attribute float aSize;attribute float aAlpha;attribute vec3 aColor;varying float vAlpha;varying vec3 vCol;uniform float uPixelRatio;
void main(){vAlpha=aAlpha;vCol=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);
gl_PointSize=aSize*uPixelRatio*(200.0/-mv.z);gl_PointSize=clamp(gl_PointSize,1.0,40.0);gl_Position=projectionMatrix*mv;}`;
const starFS = `varying float vAlpha;varying vec3 vCol;
void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;
float core=smoothstep(0.5,0.0,d);float glow=exp(-d*5.0)*0.7;
gl_FragColor=vec4(vCol*(core+glow),vAlpha*(core+glow));}`;

const particleVS = `attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float uPixelRatio;
void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);
gl_PointSize=aSize*uPixelRatio*(180.0/-mv.z);gl_PointSize=clamp(gl_PointSize,3.0,60.0);gl_Position=projectionMatrix*mv;}`;
const particleFS = `varying float vAlpha;uniform vec3 uColor;
void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;
float core=smoothstep(0.5,0.0,d);float glow=exp(-d*4.0)*0.8;
gl_FragColor=vec4(mix(uColor,vec3(1.0),core*0.4),(core+glow)*vAlpha);}`;

const diskVS = `varying vec2 vUv;varying vec3 vPos;
void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const diskFS = `uniform float uTime;uniform float uRs;varying vec2 vUv;varying vec3 vPos;
void main(){
  float r=length(vPos.xz);float ang=atan(vPos.z,vPos.x);
  float inner=uRs*2.0;float outer=uRs*7.0;
  float t=clamp((r-inner)/(outer-inner),0.0,1.0);
  float turb=sin(ang*8.0+uTime*1.5)*0.06;
  float doppler=0.5+0.5*sin(ang+uTime*0.4);
  vec3 innerCol=vec3(1.0,0.85,0.6);
  vec3 outerCol=vec3(0.9,0.25,0.05);
  vec3 col=mix(innerCol,outerCol,t+turb);
  col=mix(col,vec3(0.4,0.55,1.0),doppler*0.2*(1.0-t*0.5));
  float alpha=smoothstep(outer,inner,r)*0.55*smoothstep(inner*0.9,inner*1.05,r);
  if(alpha<0.01)discard;
  gl_FragColor=vec4(col,alpha);}`;

const MAX_STARS = 4500;
const STAR_SKY_MIN = 140;
const STAR_SKY_SPAN = 220;
const MAX_PARTICLES = 8;
const MAX_TRAIL = 2500;
const GEO_DT_SCALE = 28;
const GRID_SEG = 80;
const GRID_SIZE = 140;
const GRID_RIM = (GRID_SIZE / 2) * Math.SQRT2;
const FUNNEL_SCALE = 2.4;

function funnelY(r: number, rs: number) {
  return spacetimeEmbeddingY(r, rs, FUNNEL_SCALE, GRID_RIM);
}

function isValidPoint(x: number, y: number, z: number) {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}

function toTrailPoints(trail: THREE.Vector3[]): [number, number, number][] {
  return trail
    .filter((v) => isValidPoint(v.x, v.y, v.z))
    .map((v) => [v.x, v.y, v.z] as [number, number, number]);
}

/** 粒子/光子贴在弯曲网格表面上 */
function surfaceY(r: number, rs: number) {
  return funnelY(r, rs) + 0.12;
}

function redshiftToColor(z: number): THREE.Color {
  const t = Math.min(z / 2, 1);
  return new THREE.Color().setHSL(0.08 - t * 0.08, 1, 0.5 + t * 0.2);
}

export function GeneralRelativitySceneComponent({
  onDataChange,
  blackHoleMass = 5,
  particleLaunchRadius = 40,
  particleTangentialVelocity = 0.4,
  particleRadialVelocity = 0,
  photonImpactParam = 25,
  showSpacetimeGrid = true,
  showAccretionDisk = true,
  showStarfield = true,
  showPhotonPaths = true,
  showParticleTrails = true,
  launchParticleTrigger = 0,
  launchPhotonTrigger = 0,
  isPlaying = true,
  simulationSpeed = 1,
  resetTrigger,
}: GeneralRelativitySceneProps) {
  const rs = useMemo(() => schwarzschildRadius(blackHoleMass), [blackHoleMass]);
  // 黑洞球心 = 网格漏斗中心最深处 + 半径（与吸积盘同一赤道面）
  const holeCenterY = useMemo(() => funnelY(rs * 1.05, rs) + rs * 0.48, [rs]);

  const particlesRef = useRef<TestParticle[]>([]);
  const photonsRef = useRef<AnimatedPhoton[]>([]);
  const diskSpinRef = useRef<THREE.Group>(null);
  const gridRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const frameCountRef = useRef(0);
  const lastParticleTrigger = useRef(launchParticleTrigger);
  const lastPhotonTrigger = useRef(launchPhotonTrigger);
  const primaryParticleRef = useRef<TestParticle | null>(null);
  const [trailRender, setTrailRender] = useState<[number, number, number][][]>([]);
  const [photonRender, setPhotonRender] = useState<{ pts: [number, number, number][]; absorbed: boolean; head: [number, number, number] | null }[]>([]);

  const pixelRatio = useMemo(() => (typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1), []);

  const starfieldRef = useRef<THREE.Group>(null);
  const starTwinkleRef = useRef<Float32Array | null>(null);
  const starBaseAlphaRef = useRef<Float32Array | null>(null);

  // ─── Starfield buffers ─────────────────────────────────────────
  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX_STARS * 3);
    const sizes = new Float32Array(MAX_STARS);
    const alphas = new Float32Array(MAX_STARS);
    const colors = new Float32Array(MAX_STARS * 3);
    const twinkle = new Float32Array(MAX_STARS);
    for (let i = 0; i < MAX_STARS; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rad = STAR_SKY_MIN + Math.random() * STAR_SKY_SPAN;
      pos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = rad * Math.cos(phi);
      pos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
      const bright = Math.random();
      sizes[i] = 0.35 + bright * bright * 2.2;
      alphas[i] = 0.35 + bright * 0.65;
      twinkle[i] = Math.random() * Math.PI * 2;
      const hue = 0.52 + Math.random() * 0.18;
      const c = new THREE.Color().setHSL(hue, 0.15 + Math.random() * 0.45, 0.55 + bright * 0.4);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    starTwinkleRef.current = twinkle;
    starBaseAlphaRef.current = alphas.slice();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  const starMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: starVS, fragmentShader: starFS,
    uniforms: { uPixelRatio: { value: pixelRatio } },
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  }), [pixelRatio]);

  // ─── Test particle buffers ─────────────────────────────────────
  const pGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
    return g;
  }, []);
  const pMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVS, fragmentShader: particleFS,
    uniforms: { uColor: { value: new THREE.Color("#88ccff") }, uPixelRatio: { value: pixelRatio } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [pixelRatio]);

  // ─── Spacetime grid geometry ───────────────────────────────────
  const gridGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SEG, GRID_SEG);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const diskMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: diskVS, fragmentShader: diskFS,
    uniforms: { uTime: { value: 0 }, uRs: { value: rs } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [rs]);

  // ─── Dust instanced ────────────────────────────────────────────
  const dustCount = 120;
  const dustDummy = useMemo(() => new THREE.Object3D(), []);

  const launchParamsRef = useRef({
    r: particleLaunchRadius,
    vTang: particleTangentialVelocity,
    vRad: particleRadialVelocity,
    rs,
  });
  launchParamsRef.current = {
    r: particleLaunchRadius,
    vTang: particleTangentialVelocity,
    vRad: particleRadialVelocity,
    rs,
  };

  const photonParamsRef = useRef({ b: photonImpactParam, rs });
  photonParamsRef.current = { b: photonImpactParam, rs };

  const doLaunchParticle = useCallback(() => {
    const { r, vTang, vRad, rs: r0 } = launchParamsRef.current;
    const state = createTimelikeGeodesic(r, vTang, r0, 0, vRad);
    const p: TestParticle = { state, active: true, absorbed: false, trail: [] };
    particlesRef.current = [p];
    primaryParticleRef.current = p;
    setTrailRender([]);
  }, []);

  const doLaunchPhoton = useCallback(() => {
    const { b, rs: r0 } = photonParamsRef.current;
    const { points, absorbed } = tracePhotonPath(-70, b, r0);
    const mapped: [number, number, number][] = points
      .map((p) => {
        const rad = Math.sqrt(p.x * p.x + p.y * p.y);
        return [p.x, surfaceY(rad, r0), p.y] as [number, number, number];
      })
      .filter((p) => isValidPoint(p[0], p[1], p[2]));
    photonsRef.current = [{ points: mapped, progress: 0, absorbed, done: false }];
    setPhotonRender([]);
  }, []);

  const clearAll = useCallback(() => {
    particlesRef.current = [];
    photonsRef.current = [];
    primaryParticleRef.current = null;
    setTrailRender([]);
    setPhotonRender([]);
  }, []);

  useEffect(() => { clearAll(); }, [resetTrigger, clearAll]);

  useEffect(() => {
    if (launchParticleTrigger !== lastParticleTrigger.current) {
      lastParticleTrigger.current = launchParticleTrigger;
      doLaunchParticle();
    }
  }, [launchParticleTrigger, doLaunchParticle]);

  useEffect(() => {
    if (launchPhotonTrigger !== lastPhotonTrigger.current) {
      lastPhotonTrigger.current = launchPhotonTrigger;
      doLaunchPhoton();
    }
  }, [launchPhotonTrigger, doLaunchPhoton]);

  useEffect(() => { diskMat.uniforms.uRs.value = rs; }, [rs, diskMat]);

  // Photon sphere ring
  const photonRing = useMemo(() => {
    const pts: [number, number, number][] = [];
    const r = photonSphereRadius(rs);
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push([r * Math.cos(a), surfaceY(r, rs), r * Math.sin(a)]);
    }
    return pts;
  }, [rs]);

  const iscoRing = useMemo(() => {
    const pts: [number, number, number][] = [];
    const r = iscoRadius(rs);
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push([r * Math.cos(a), surfaceY(r, rs), r * Math.sin(a)]);
    }
    return pts;
  }, [rs]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033) * simulationSpeed;
    const t = state.clock.elapsedTime;
    diskMat.uniforms.uTime.value = t;
    // 绕世界 Y 轴自转（像木星环），避免在已倾斜 mesh 上转本地轴导致环翻面
    if (diskSpinRef.current) diskSpinRef.current.rotation.y = t * 0.22;

    // Starfield — 缓慢自转 + 星点闪烁
    if (showStarfield && starfieldRef.current) {
      starfieldRef.current.rotation.y = t * 0.012;
      starfieldRef.current.rotation.x = Math.sin(t * 0.04) * 0.02;
      const twinkle = starTwinkleRef.current;
      const baseAlpha = starBaseAlphaRef.current;
      const aAttr = starGeo.attributes.aAlpha as THREE.BufferAttribute;
      if (twinkle && baseAlpha) {
        for (let i = 0; i < MAX_STARS; i++) {
          aAttr.setX(
            i,
            baseAlpha[i] * (0.72 + 0.28 * Math.sin(t * (0.6 + (i % 5) * 0.15) + twinkle[i]))
          );
        }
        aAttr.needsUpdate = true;
      }
    }

    // Spacetime grid — 向下漏斗形弯曲
    if (showSpacetimeGrid && gridRef.current) {
      const pos = gridGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r = Math.sqrt(x * x + z * z);
        pos.setY(i, funnelY(r, rs));
      }
      pos.needsUpdate = true;
      gridGeo.computeVertexNormals();
    }

    // 吸积盘尘埃 — 在 XZ 赤道面内公转，随盘组一起绕 Y 轴转
    if (showAccretionDisk && dustRef.current) {
      const spin = diskSpinRef.current?.rotation.y ?? 0;
      for (let i = 0; i < dustCount; i++) {
        const ang = spin + (i / dustCount) * Math.PI * 2;
        const rad = rs * 2.2 + (i / dustCount) * rs * 5.5;
        dustDummy.position.set(Math.cos(ang) * rad, 0.08, Math.sin(ang) * rad);
        dustDummy.scale.setScalar(0.06 + (i % 5) * 0.015);
        dustDummy.updateMatrix();
        dustRef.current.setMatrixAt(i, dustDummy.matrix);
      }
      dustRef.current.instanceMatrix.needsUpdate = true;
    }

    // 光子逐帧绘制（与播放状态无关，发射后持续延伸）
    for (const ph of photonsRef.current) {
      if (!ph.done && isPlaying) {
        ph.progress += dt * 140;
        if (ph.progress >= ph.points.length - 1) {
          ph.progress = ph.points.length - 1;
          ph.done = true;
        }
      }
    }

    if (!isPlaying) {
      if (frameCountRef.current % 2 === 0) {
        setTrailRender(
          particlesRef.current
            .map((p) => toTrailPoints(p.trail))
            .filter((pts) => pts.length >= 2)
        );
        setPhotonRender(
          photonsRef.current.map((ph) => {
            const n = Math.max(2, Math.floor(ph.progress) + 1);
            const pts = ph.points.slice(0, n).filter((p) => isValidPoint(p[0], p[1], p[2]));
            const head = pts.length > 0 ? pts[pts.length - 1] : null;
            return { pts, absorbed: ph.absorbed && ph.done, head };
          }).filter((ph) => ph.pts.length >= 2 || ph.head !== null)
        );
      }
      return;
    }

    const geoDt = dt * GEO_DT_SCALE;

    // Integrate test particles
    for (const p of particlesRef.current) {
      if (!p.active) continue;
      for (let step = 0; step < 6; step++) {
        p.state = timelikeGeodesicStep(p.state, rs, geoDt / 6);
      }
      if (p.state.r <= rs * 1.002) {
        p.active = false;
        p.absorbed = true;
        const x = rs * 1.01 * Math.cos(p.state.phi);
        const z = rs * 1.01 * Math.sin(p.state.phi);
        const y = surfaceY(rs * 1.01, rs);
        if (isValidPoint(x, y, z)) p.trail.push(new THREE.Vector3(x, y, z));
        continue;
      }
      if (p.state.r > GRID_SIZE * 0.95) {
        p.active = false;
        continue;
      }
      const x = p.state.r * Math.cos(p.state.phi);
      const z = p.state.r * Math.sin(p.state.phi);
      const y = surfaceY(p.state.r, rs);
      if (isValidPoint(x, y, z)) {
        p.trail.push(new THREE.Vector3(x, y, z));
        if (p.trail.length > MAX_TRAIL) p.trail.shift();
      }
    }

    // Update particle draw buffers
    const pA = pGeo.attributes.position as THREE.BufferAttribute;
    const sA = pGeo.attributes.aSize as THREE.BufferAttribute;
    const aA = pGeo.attributes.aAlpha as THREE.BufferAttribute;
    let pi = 0;
    for (const p of particlesRef.current) {
      if (!p.active || pi >= MAX_PARTICLES) continue;
      const x = p.state.r * Math.cos(p.state.phi);
      const z = p.state.r * Math.sin(p.state.phi);
      const y = surfaceY(p.state.r, rs);
      pA.setXYZ(pi, x, y, z);
      sA.setX(pi, 1.2);
      aA.setX(pi, 0.95);
      const zShift = gravitationalRedshift(p.state.r, rs);
      pMat.uniforms.uColor.value.copy(redshiftToColor(zShift));
      pi++;
    }
    for (let i = pi; i < MAX_PARTICLES; i++) aA.setX(i, 0);
    pA.needsUpdate = sA.needsUpdate = aA.needsUpdate = true;
    pGeo.setDrawRange(0, pi);

    // Data panel + trail render update
    frameCountRef.current++;
    if (frameCountRef.current % 2 === 0) {
      setTrailRender(
        particlesRef.current
          .map((p) => toTrailPoints(p.trail))
          .filter((pts) => pts.length >= 2)
      );
      setPhotonRender(
        photonsRef.current.map((ph) => {
          const n = Math.max(2, Math.floor(ph.progress) + 1);
          const pts = ph.points.slice(0, n).filter((p) => isValidPoint(p[0], p[1], p[2]));
          const head = pts.length > 0 ? pts[pts.length - 1] : null;
          return { pts, absorbed: ph.absorbed && ph.done, head };
        }).filter((ph) => ph.pts.length >= 2 || ph.head !== null)
      );
    }
    if (frameCountRef.current % 8 === 0) {
      const pp = primaryParticleRef.current;
      const r = pp?.active ? pp.state.r : particleLaunchRadius;
      const zShift = gravitationalRedshift(r, rs);
      const orbitType = classifySchwarzschildOrbit(
        particleLaunchRadius,
        particleTangentialVelocity,
        rs,
        particleRadialVelocity
      );
      const orbitTypeZh: Record<string, string> = {
        Bound: "束缚轨道", Escape: "逃逸轨道", Plunge: "坠入视界", Circular: "圆轨道",
      };
      const defl = nullGeodesicDeflection(photonImpactParam, rs);
      const precess = perihelionPrecessionRate(particleLaunchRadius, 0.3, rs);
      const data: GeneralRelativityData = {
        rs, rOverRs: r / rs, redshift: zShift === Infinity ? 99 : zShift,
        orbitType: orbitTypeZh[orbitType] ?? orbitType, deflectionAngle: defl, precessionRate: precess,
        isco: iscoRadius(rs), photonSphere: photonSphereRadius(rs),
        activeParticles: particlesRef.current.filter((p) => p.active).length,
      };
      onDataChange?.(data);
    }
  });

  return (
    <group>
      <EffectComposer>
        <Bloom intensity={0.42} luminanceThreshold={0.55} luminanceSmoothing={0.5} mipmapBlur />
        <Vignette offset={0.35} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>

      <ambientLight intensity={0.08} color="#0a0a22" />

      {/* Starfield — 全天空球壳 */}
      {showStarfield && (
        <group ref={starfieldRef}>
          <points geometry={starGeo} material={starMat} frustumCulled={false} renderOrder={-10} />
        </group>
      )}

      {/* Spacetime grid — 向下漏斗形弯曲时空 */}
      {showSpacetimeGrid && (
        <mesh ref={gridRef} geometry={gridGeo}>
          <meshStandardMaterial
            color="#152040"
            wireframe
            emissive="#3344aa"
            emissiveIntensity={0.35}
            transparent
            opacity={0.65}
          />
        </mesh>
      )}

      {/* 参考环：光子球 & ISCO */}
      <Line points={photonRing} color="#ffaa44" lineWidth={1} opacity={0.3} transparent dashed />
      <Line points={iscoRing} color="#556688" lineWidth={0.8} opacity={0.2} transparent dashed />

      {/* 吸积盘 + 黑洞：同一赤道高度 */}
      <group position={[0, holeCenterY, 0]}>
        {showAccretionDisk && (
          <group ref={diskSpinRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[rs * 4.2, rs * 0.2, 2, 96]} />
              <primitive object={diskMat} attach="material" />
            </mesh>
            <instancedMesh ref={dustRef} args={[undefined, undefined, dustCount]}>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color="#ffaa66" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
            </instancedMesh>
          </group>
        )}

        <mesh renderOrder={1}>
          <sphereGeometry args={[rs * 0.99, 64, 64]} />
          <meshBasicMaterial color="#000000" depthWrite />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[rs * 1.5, rs * 0.05, 8, 96]} />
          <meshBasicMaterial color="#eeddcc" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[rs * 1.5, rs * 0.12, 8, 96]} />
          <meshBasicMaterial color="#ff8844" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* Test particles */}
      <points geometry={pGeo} material={pMat} />

      {/* Particle trails — 保留完整轨道，消失后轨迹不删 */}
      {showParticleTrails && trailRender.map((pts, idx) => (
        pts.length >= 2 ? (
          <Line key={`trail-${idx}`} points={pts}
            color="#66bbff" lineWidth={2.5} opacity={0.85} transparent />
        ) : null
      ))}

      {/* Photon paths — 逐帧延伸 + 光点 */}
      {showPhotonPaths && photonRender.map((ph, idx) => (
        <group key={`photon-${idx}`}>
          {ph.pts.length >= 2 && (
            <>
              <Line points={ph.pts} color="#aaddff" lineWidth={5} opacity={0.15} transparent />
              <Line points={ph.pts} color={ph.absorbed ? "#ff6644" : "#ffffee"} lineWidth={1.8} opacity={0.95} transparent />
            </>
          )}
          {ph.head && (
            <mesh position={ph.head}>
              <sphereGeometry args={[0.35, 8, 8]} />
              <meshBasicMaterial color={ph.absorbed ? "#ff4422" : "#ffffff"} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export default GeneralRelativitySceneComponent;
