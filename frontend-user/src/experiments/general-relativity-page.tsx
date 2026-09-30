"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  GeneralRelativitySceneComponent,
  GeneralRelativityData,
} from "@/experiments/general-relativity-scene";
import {
  schwarzschildRadius,
  schwarzschildCircularVelocity,
  schwarzschildEscapeVelocity,
  schwarzschildPlungePreset,
  schwarzschildEscapePreset,
  timelikeOrbitEnergy,
  classifySchwarzschildOrbit,
} from "@/utils/physics";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

export default function GeneralRelativityPage() {
  const [data, setData] = useState<GeneralRelativityData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(3);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [blackHoleMass, setBlackHoleMass] = useState(5);
  const [particleLaunchRadius, setParticleLaunchRadius] = useState(() => schwarzschildPlungePreset(10).r);
  const [particleTangentialVelocity, setParticleTangentialVelocity] = useState(() => schwarzschildPlungePreset(10).vt);
  const [particleRadialVelocity, setParticleRadialVelocity] = useState(() => schwarzschildPlungePreset(10).vr);
  const [photonImpactParam, setPhotonImpactParam] = useState(25);

  const paramsRef = useRef({
    blackHoleMass,
    particleLaunchRadius,
    particleTangentialVelocity,
    particleRadialVelocity,
    photonImpactParam,
  });
  paramsRef.current = {
    blackHoleMass,
    particleLaunchRadius,
    particleTangentialVelocity,
    particleRadialVelocity,
    photonImpactParam,
  };
  const dataRef = useRef<GeneralRelativityData | null>(null);
  const userEditHandlerRef = useRef<(() => void) | null>(null);
  const demoApplyingRef = useRef(false);

  const notifyUserEdit = useCallback(() => {
    if (demoApplyingRef.current) return;
    userEditHandlerRef.current?.();
  }, []);

  const onDataChange = useCallback((d: GeneralRelativityData) => {
    dataRef.current = d;
    setData(d);
  }, []);

  const demoAdapter: DemoAdapter = useMemo(
    () => ({
      experimentId: null,
      getParams: () => ({ ...paramsRef.current }),
      getReadings: () => {
        const d = dataRef.current;
        if (!d) return null;
        return {
          rs: d.rs,
          rOverRs: d.rOverRs,
          redshift: d.redshift,
          orbitType: d.orbitType,
          deflectionAngle: d.deflectionAngle,
          precessionRate: d.precessionRate,
          isco: d.isco,
          photonSphere: d.photonSphere,
          activeParticles: d.activeParticles,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.blackHoleMass === "number") setBlackHoleMass(params.blackHoleMass);
          else if (params.blackHoleMass != null) setBlackHoleMass(Number(params.blackHoleMass));
          if (typeof params.particleLaunchRadius === "number") setParticleLaunchRadius(params.particleLaunchRadius);
          else if (params.particleLaunchRadius != null) setParticleLaunchRadius(Number(params.particleLaunchRadius));
          if (typeof params.particleTangentialVelocity === "number") setParticleTangentialVelocity(params.particleTangentialVelocity);
          else if (params.particleTangentialVelocity != null) setParticleTangentialVelocity(Number(params.particleTangentialVelocity));
          if (typeof params.particleRadialVelocity === "number") setParticleRadialVelocity(params.particleRadialVelocity);
          else if (params.particleRadialVelocity != null) setParticleRadialVelocity(Number(params.particleRadialVelocity));
          if (typeof params.photonImpactParam === "number") setPhotonImpactParam(params.photonImpactParam);
          else if (params.photonImpactParam != null) setPhotonImpactParam(Number(params.photonImpactParam));
        } finally {
          queueMicrotask(() => {
            demoApplyingRef.current = false;
          });
        }
      },
      setOnUserEdit: (fn) => {
        userEditHandlerRef.current = fn;
      },
    }),
    [],
  );

  const rs = useMemo(() => schwarzschildRadius(blackHoleMass), [blackHoleMass]);
  const minR = useMemo(() => Math.ceil(rs * 1.08), [rs]);
  const vCirc = useMemo(() => schwarzschildCircularVelocity(particleLaunchRadius, rs), [particleLaunchRadius, rs]);
  const vEsc = useMemo(() => schwarzschildEscapeVelocity(particleLaunchRadius, rs), [particleLaunchRadius, rs]);
  const orbitE = useMemo(
    () => timelikeOrbitEnergy(particleLaunchRadius, particleTangentialVelocity, rs, particleRadialVelocity),
    [particleLaunchRadius, particleTangentialVelocity, particleRadialVelocity, rs]
  );
  const orbitKind = useMemo(
    () => classifySchwarzschildOrbit(particleLaunchRadius, particleTangentialVelocity, rs, particleRadialVelocity),
    [particleLaunchRadius, particleTangentialVelocity, particleRadialVelocity, rs]
  );
  const orbitKindZh: Record<string, string> = {
    Bound: "束缚轨道",
    Escape: "逃逸轨道",
    Plunge: "坠入视界",
    Circular: "圆轨道",
  };
  const isco = useMemo(() => 3 * rs, [rs]);

  const particlePresets = useMemo(
    () => [
      { label: "坠入", ...schwarzschildPlungePreset(rs) },
      { label: "逃逸", ...schwarzschildEscapePreset(rs) },
    ],
    [rs]
  );

  const [showSpacetimeGrid, setShowSpacetimeGrid] = useState(true);
  const [showAccretionDisk, setShowAccretionDisk] = useState(true);
  const [showStarfield, setShowStarfield] = useState(true);
  const [showPhotonPaths, setShowPhotonPaths] = useState(true);
  const [showParticleTrails, setShowParticleTrails] = useState(true);

  const [launchParticleTrigger, setLaunchParticleTrigger] = useState(0);
  const [launchPhotonTrigger, setLaunchPhotonTrigger] = useState(0);

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    notifyUserEdit();
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(3);
  };

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="黑洞参数">
        <ControlSlider
          label="质量 M"
          value={blackHoleMass}
          unit="M☉"
          min={2}
          max={12}
          step={0.5}
          color="#ff6600"
          onChange={(v) => {
            notifyUserEdit();
            setBlackHoleMass(v);
          }}
          decimals={1}
          demoId="blackHoleMass"
        />
      </ControlGroup>

      <ControlGroup title="测试粒子（测地线轨道）">
        <p className="text-xs text-gray-400 mb-2">
          圆轨道 ≈ {vCirc.toFixed(2)}c，切向逃逸 ≈ {vEsc.toFixed(2)}c（均随 r 与 M 变化）。
          当前 <strong className="text-cyan-300">E = {orbitE.toFixed(3)}</strong>
          （{orbitKindZh[orbitKind]}），ISCO = {isco.toFixed(0)}。
          改质量 M 后预设会自动按 rs 缩放。
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {particlePresets.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                notifyUserEdit();
                setParticleLaunchRadius(p.r);
                setParticleTangentialVelocity(p.vt);
                setParticleRadialVelocity(p.vr);
              }}
              className="py-1.5 text-xs bg-gray-700/80 hover:bg-gray-600 text-gray-200 rounded-lg"
            >
              {p.label}
            </button>
          ))}
        </div>
        <ControlSlider
          label="发射距离 r"
          value={Math.max(particleLaunchRadius, minR)}
          unit=""
          min={minR}
          max={80}
          step={1}
          color="#88ccff"
          onChange={(v) => {
            notifyUserEdit();
            setParticleLaunchRadius(Math.max(v, minR));
          }}
          demoId="particleLaunchRadius"
        />
        <ControlSlider
          label="切向速度"
          value={particleTangentialVelocity}
          unit="c"
          min={0.05}
          max={1.0}
          step={0.01}
          color="#44aaff"
          onChange={(v) => {
            notifyUserEdit();
            setParticleTangentialVelocity(v);
          }}
          decimals={2}
          demoId="particleTangentialVelocity"
        />
        <ControlSlider
          label="径向速度（负=向内）"
          value={particleRadialVelocity}
          unit="c"
          min={-0.3}
          max={0.3}
          step={0.01}
          color="#ff8866"
          onChange={(v) => {
            notifyUserEdit();
            setParticleRadialVelocity(v);
          }}
          decimals={2}
          demoId="particleRadialVelocity"
        />
        <button
          onClick={() => setLaunchParticleTrigger((n) => n + 1)}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium text-sm rounded-lg transition-all shadow-md"
        >
          发射粒子
        </button>
      </ControlGroup>

      <ControlGroup title="引力透镜（光子路径）">
        <p className="text-xs text-gray-400 mb-2">光子从左侧飞来，白点沿路径移动。被吸入视界时轨迹变红。</p>
        <ControlSlider
          label="碰撞参数 b"
          value={photonImpactParam}
          unit=""
          min={8}
          max={50}
          step={1}
          color="#ffffff"
          onChange={(v) => {
            notifyUserEdit();
            setPhotonImpactParam(v);
          }}
          demoId="photonImpactParam"
        />
        <button
          onClick={() => setLaunchPhotonTrigger((n) => n + 1)}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-medium text-sm rounded-lg transition-all shadow-md"
        >
          发射光子
        </button>
      </ControlGroup>

      <ControlGroup title="显示图层">
        {[
          { label: "时空弯曲网格", val: showSpacetimeGrid, set: setShowSpacetimeGrid },
          { label: "吸积盘", val: showAccretionDisk, set: setShowAccretionDisk },
          { label: "星野背景", val: showStarfield, set: setShowStarfield },
          { label: "光子路径", val: showPhotonPaths, set: setShowPhotonPaths },
          { label: "粒子轨迹", val: showParticleTrails, set: setShowParticleTrails },
        ].map(({ label, val, set }) => (
          <label key={label} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-orange-500" />
            {label}
          </label>
        ))}
      </ControlGroup>

      <ControlGroup title="读数提示">
        <p className="text-xs text-[#8a8a96] leading-relaxed">
          左上角为实时轨道与红移读数。r &lt; 3rs（ISCO）时有质量轨道不稳定；光子路径偏折体现引力透镜。
        </p>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/general-relativity/details">查看原理说明</DetailsLinkButton>
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        轨道: { value: data.orbitType, color: "#86efac" },
        "rs": { value: data.rs, unit: "", color: "#fb923c", decimals: 2 },
        "r/rs": { value: data.rOverRs, unit: "", color: "#7dd3fc", decimals: 2 },
        红移z: { value: data.redshift, unit: "", color: "#fca5a5", decimals: 3 },
        偏折角: {
          value: (data.deflectionAngle * 180) / Math.PI,
          unit: "°",
          color: "#e8e8f0",
          decimals: 2,
        },
        进动: {
          value: (data.precessionRate * 180) / Math.PI,
          unit: "°/圈",
          color: "#c4b5fd",
          decimals: 4,
        },
        ISCO: { value: data.isco, unit: "", color: "#93c5fd", decimals: 1 },
        光子球: { value: data.photonSphere, unit: "", color: "#d6d3d1", decimals: 1 },
        粒子数: { value: data.activeParticles, unit: "", color: "#7dd3fc", decimals: 0 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="广义相对论 · 史瓦西黑洞"
        description="观察时空弯曲、测地线轨道、引力透镜与引力红移。拖动旋转视角，滚轮缩放。"
        experimentRoute="general-relativity"
        controls={parameterControls}
        dataPanel={hud}
        demoAdapter={demoAdapter}
        simulationBar={{
          isPlaying,
          onPlayPause: handlePlayPause,
          onReset: handleReset,
          speed: simulationSpeed,
          onSpeedChange: setSimulationSpeed,
        }}
        cameraPosition={[48, 32, 48]}
        backgroundColor="#000000"
        enableFog={false}
      >
        <GeneralRelativitySceneComponent
          onDataChange={onDataChange}
          blackHoleMass={blackHoleMass}
          particleLaunchRadius={Math.max(particleLaunchRadius, minR)}
          particleTangentialVelocity={particleTangentialVelocity}
          particleRadialVelocity={particleRadialVelocity}
          photonImpactParam={photonImpactParam}
          showSpacetimeGrid={showSpacetimeGrid}
          showAccretionDisk={showAccretionDisk}
          showStarfield={showStarfield}
          showPhotonPaths={showPhotonPaths}
          showParticleTrails={showParticleTrails}
          launchParticleTrigger={launchParticleTrigger}
          launchPhotonTrigger={launchPhotonTrigger}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
        />
      </ExperimentContainer>

    </>
  );
}
