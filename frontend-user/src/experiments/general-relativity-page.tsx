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
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [blackHoleMass, setBlackHoleMass] = useState(5);
  const [particleLaunchRadius, setParticleLaunchRadius] = useState(() => schwarzschildPlungePreset(10).r);
  const [particleTangentialVelocity, setParticleTangentialVelocity] = useState(() => schwarzschildPlungePreset(10).vt);
  const [particleRadialVelocity, setParticleRadialVelocity] = useState(() => schwarzschildPlungePreset(10).vr);
  const [photonImpactParam, setPhotonImpactParam] = useState(25);
  const [launchParticleTrigger, setLaunchParticleTrigger] = useState(0);
  const [launchPhotonTrigger, setLaunchPhotonTrigger] = useState(0);

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
      ensurePlaying: () => setIsPlaying(true),
      runAction: (action) => {
        if (action === "launchParticle") setLaunchParticleTrigger((n) => n + 1);
        else if (action === "launchPhoton") setLaunchPhotonTrigger((n) => n + 1);
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

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    notifyUserEdit();
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setBlackHoleMass(5);
    const preset = schwarzschildPlungePreset(10);
    setParticleLaunchRadius(preset.r);
    setParticleTangentialVelocity(preset.vt);
    setParticleRadialVelocity(preset.vr);
    setPhotonImpactParam(25);
  };

  /** 预设是否与当前工况一致（用于选项卡选中态） */
  const activePreset = (p: { r: number; vt: number; vr: number }) =>
    Math.abs(p.r - particleLaunchRadius) < 0.05 &&
    Math.abs(p.vt - particleTangentialVelocity) < 0.005 &&
    Math.abs(p.vr - particleRadialVelocity) < 0.005;

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup
        title="黑洞参数"
        icon="fa-solid fa-circle-dot"
        tone="amber"
        status={`rs = ${rs.toFixed(2)}`}
        statusTone="emerald"
      >
        <ControlSlider
          label="质量 M"
          value={blackHoleMass}
          unit="M☉"
          min={2}
          max={12}
          step={0.1}
          color="#f59e0b"
          onChange={(v) => {
            notifyUserEdit();
            setBlackHoleMass(v);
          }}
          decimals={1}
          demoId="blackHoleMass"
        />
      </ControlGroup>

      <ControlGroup
        title="测试粒子（测地线轨道）"
        icon="fa-solid fa-satellite"
        status={orbitKindZh[orbitKind]}
        statusTone={orbitKind === "Plunge" ? "muted" : "emerald"}
      >
        <div className="exp-option-switch" role="group" aria-label="轨道预设">
          {particlePresets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`exp-option${activePreset(p) ? " is-on" : ""}`}
              onClick={() => {
                notifyUserEdit();
                setParticleLaunchRadius(p.r);
                setParticleTangentialVelocity(p.vt);
                setParticleRadialVelocity(p.vr);
              }}
              aria-pressed={activePreset(p)}
            >
              <i
                className={i === 0 ? "fa-solid fa-arrow-down-long" : "fa-solid fa-arrow-up-right-from-square"}
                style={{ color: i === 0 ? "#fb923c" : "#34d399" }}
                aria-hidden
              />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <ControlSlider
          label="发射距离 r"
          value={Math.max(particleLaunchRadius, minR)}
          unit=""
          min={minR}
          max={80}
          step={0.1}
          color="#38bdf8"
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
          color="#67e8f9"
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
          color="#fbbf24"
          onChange={(v) => {
            notifyUserEdit();
            setParticleRadialVelocity(v);
          }}
          decimals={2}
          demoId="particleRadialVelocity"
        />
        <button
          onClick={() => setLaunchParticleTrigger((n) => n + 1)}
          className="exp-action-btn"
        >
          <i className="fa-solid fa-satellite" aria-hidden />
          发射粒子
        </button>
      </ControlGroup>

      <ControlGroup
        title="引力透镜（光子路径）"
        icon="fa-solid fa-bolt"
        tone="amber"
        status={`b = ${photonImpactParam.toFixed(1)}`}
      >
        <ControlSlider
          label="碰撞参数 b"
          value={photonImpactParam}
          unit=""
          min={8}
          max={50}
          step={0.1}
          color="#67e8f9"
          onChange={(v) => {
            notifyUserEdit();
            setPhotonImpactParam(v);
          }}
          demoId="photonImpactParam"
        />
        <button
          onClick={() => setLaunchPhotonTrigger((n) => n + 1)}
          className="exp-action-btn"
        >
          <i className="fa-solid fa-bolt" aria-hidden />
          发射光子
        </button>
      </ControlGroup>

      <ControlGroup
        title="原理说明"
        icon="fa-solid fa-square-root-variable"
        tone="pink"
        status="动态同步"
      >
        <div className="exp-theory">
          <div className="exp-theory__row">
            <span className="exp-theory__label">圆轨道与切向逃逸（随 r、M 变化）：</span>
            <span className="exp-theory__eq">
              v_circ ≈ {vCirc.toFixed(2)}c · v_esc ≈ {vEsc.toFixed(2)}c
            </span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">测地线轨道能量：</span>
            <span className="exp-theory__eq exp-theory__eq--amber">
              E/mc² = {orbitE.toFixed(3)} → {orbitKindZh[orbitKind]}
            </span>
          </div>
          <div className="exp-theory__dp">
            <span>ISCO = 3 rs</span>
            <strong>{isco.toFixed(0)}</strong>
          </div>
          <p className="exp-theory__note">
            r &lt; 3rs（ISCO）时有质量轨道不稳定；光子从左侧飞来，被吸入视界时轨迹变红。改质量 M 后预设会自动按 rs 缩放。
          </p>
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/general-relativity/details">查看原理说明</DetailsLinkButton>
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        轨道: { value: data.orbitType, color: "#34d399" },
        "rs": { value: data.rs, unit: "", color: "#fb923c", decimals: 2 },
        "r/rs": { value: data.rOverRs, unit: "", color: "#38bdf8", decimals: 2 },
        红移z: { value: data.redshift, unit: "", color: "#fca5a5", decimals: 3 },
        偏折角: {
          value: (data.deflectionAngle * 180) / Math.PI,
          unit: "°",
          color: "#c084fc",
          decimals: 2,
        },
        ISCO: { value: data.isco, unit: "", color: "#67e8f9", decimals: 1 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="广义相对论 · 史瓦西黑洞"
        description="观察时空弯曲、测地线轨道、引力透镜与引力红移。拖动旋转视角，滚轮缩放。"
        experimentRoute="general-relativity"
        consoleSubtitle="调节黑洞质量与粒子轨道参数"
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
