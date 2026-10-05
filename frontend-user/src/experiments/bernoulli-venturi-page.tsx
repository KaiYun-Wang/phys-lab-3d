"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  BernoulliVenturiSceneComponent,
  BernoulliData,
  FluidType,
  FLUID_DENSITIES,
} from "@/experiments/bernoulli-venturi-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

export default function BernoulliVenturiPage() {
  const [data, setData] = useState<BernoulliData | null>(null);
  const dataRef = useRef<BernoulliData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [v1, setV1] = useState(2.0);
  const [areaRatio, setAreaRatio] = useState(0.5);
  const [fluid, setFluid] = useState<FluidType>("water");

  const paramsRef = useRef({ v1, areaRatio, fluid });
  paramsRef.current = { v1, areaRatio, fluid };
  const userEditHandlerRef = useRef<(() => void) | null>(null);
  const demoApplyingRef = useRef(false);

  const notifyUserEdit = useCallback(() => {
    if (demoApplyingRef.current) return;
    userEditHandlerRef.current?.();
  }, []);

  const handlePlayPause = () => setIsPlaying((p) => !p);

  const handleReset = () => {
    notifyUserEdit();
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setV1(2.0);
    setAreaRatio(0.5);
    setFluid("water");
  };

  const onDataChange = useCallback((d: BernoulliData) => {
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
        const p = paramsRef.current;
        return {
          v1: d.v1,
          v2: d.v2,
          areaRatio: p.areaRatio,
          rho: d.rho,
          deltaP: d.deltaP,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.v1 === "number") setV1(params.v1);
          else if (params.v1 != null) setV1(Number(params.v1));
          if (typeof params.areaRatio === "number") setAreaRatio(params.areaRatio);
          else if (params.areaRatio != null) setAreaRatio(Number(params.areaRatio));
          if (params.fluid === "water" || params.fluid === "glycerol") {
            setFluid(params.fluid);
          }
        } finally {
          // setState is sync for the flag purpose; clear after paint so slider onChange isn't confused
          queueMicrotask(() => {
            demoApplyingRef.current = false;
          });
        }
      },
      ensurePlaying: () => setIsPlaying(true),
      setOnUserEdit: (fn) => {
        userEditHandlerRef.current = fn;
      },
    }),
    [],
  );


  const statusLine = !data
    ? null
    : data.deltaP > 0
      ? "收缩管：A₂/A₁ < 1，v₂ > v₁，P₂ < P₁，右管液面低于左管"
      : data.deltaP < 0
        ? "扩张管：A₂/A₁ > 1，v₂ < v₁，P₂ > P₁，右管液面高于左管"
        : "等径管：A₂/A₁ = 1，v₂ = v₁，P₂ = P₁，两侧液面齐平";

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="流体参数" icon="fa-solid fa-gauge" status="实时计算就绪">
        <ControlSlider
          label="入口流速 v₁"
          value={v1}
          unit="m/s"
          min={0}
          max={5}
          step={0.1}
          color="#38bdf8"
          onChange={(v) => {
            notifyUserEdit();
            setV1(v);
          }}
          decimals={1}
          demoId="v1"
        />
        <ControlSlider
          label="截面积比 A₂/A₁"
          value={areaRatio}
          unit=""
          min={0.2}
          max={2.0}
          step={0.05}
          color="#c084fc"
          onChange={(v) => {
            notifyUserEdit();
            setAreaRatio(v);
          }}
          decimals={2}
          demoId="areaRatio"
        />
      </ControlGroup>

      <ControlGroup
        title="流体介质"
        icon="fa-solid fa-flask-vial"
        tone="emerald"
        status={`ρ = ${FLUID_DENSITIES[fluid].toFixed(0)} kg/m³`}
        statusTone="emerald"
      >
        <div className="venturi-fluid-switch" role="group" aria-label="流体介质">
          <button
            type="button"
            className={`venturi-fluid-option${fluid === "water" ? " is-on" : ""}`}
            onClick={() => {
              notifyUserEdit();
              setFluid("water");
            }}
            aria-pressed={fluid === "water"}
            data-tooltip="水，ρ 998.2 kg/m³"
          >
            <i className="fa-solid fa-droplet" style={{ color: "#38bdf8" }} aria-hidden />
            <span>常温水</span>
          </button>
          <button
            type="button"
            className={`venturi-fluid-option${fluid === "glycerol" ? " is-on" : ""}`}
            onClick={() => {
              notifyUserEdit();
              setFluid("glycerol");
            }}
            aria-pressed={fluid === "glycerol"}
            data-tooltip="甘油，ρ 1260.0 kg/m³"
          >
            <i className="fa-solid fa-oil-well" style={{ color: "#fbbf24" }} aria-hidden />
            <span>甘油 (高密)</span>
          </button>
        </div>
      </ControlGroup>

      <ControlGroup
        title="物理规律联动"
        icon="fa-solid fa-square-root-variable"
        tone="pink"
        status="动态同步"
      >
        <div className="venturi-theory">
          <div className="venturi-theory__row">
            <span className="venturi-theory__label">连续性方程：</span>
            <span className="venturi-theory__eq">
              A₁v₁ = A₂v₂ → v₂ = {data ? data.v2.toFixed(2) : "—"} m/s
            </span>
          </div>
          <div className="venturi-theory__row">
            <span className="venturi-theory__label">伯努利方程（忽略黏性与重力势能）：</span>
            <span className="venturi-theory__eq venturi-theory__eq--amber">
              P₁ + ½ρv₁² = P₂ + ½ρv₂²
            </span>
          </div>
          <div className="venturi-theory__dp">
            <span>ΔP = ½ρ(v₂² - v₁²)</span>
            <strong>{data ? `${data.deltaP.toFixed(0)} Pa` : "—"}</strong>
          </div>
          {statusLine ? <p className="venturi-theory__note">{statusLine}</p> : null}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/bernoulli-venturi/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        v1: { value: data.v1, unit: "m/s", color: "#38bdf8", decimals: 2 },
        v2: { value: data.v2, unit: "m/s", color: "#67e8f9", decimals: 2 },
        rho: { value: data.rho, unit: "kg/m³", color: "#34d399", decimals: 1 },
        deltaP: { value: data.deltaP, unit: "Pa", color: "#f59e0b", decimals: 2 },
      }}
    />
  ) : null;

  /** 实验页：把当前工况作为实时遥测挂给 AI 助教 */
  const chatContext = useMemo(
    () => ({
      telemetry: {
        "v₁": `${v1.toFixed(1)} m/s`,
        "A₂/A₁": areaRatio.toFixed(2),
        "ρ": `${FLUID_DENSITIES[fluid].toFixed(0)} kg/m³`,
        ...(data ? { "ΔP": `${data.deltaP.toFixed(0)} Pa` } : {}),
      },
    }),
    [v1, areaRatio, fluid, data],
  );

  return (
    <ExperimentContainer
      title="伯努利原理（文丘里管）"
      description="调节流速、截面积与流体介质，观察流速与压强的反比关系"
      experimentRoute="bernoulli-venturi"
      cameraPosition={[22, 12, 22]}
      backgroundColor="#000000"
      consoleSubtitle="调节流速、截面比与流体介质"
      controls={parameterControls}
      dataPanel={hud}
      demoAdapter={demoAdapter}
      chatContext={chatContext}
      simulationBar={{
        isPlaying,
        onPlayPause: handlePlayPause,
        onReset: handleReset,
        speed: simulationSpeed,
        onSpeedChange: setSimulationSpeed,
      }}
    >
      <BernoulliVenturiSceneComponent
        v1={v1}
        areaRatio={areaRatio}
        fluid={fluid}
        isPlaying={isPlaying}
        simulationSpeed={simulationSpeed}
        resetTrigger={resetTrigger}
        onDataChange={onDataChange}
      />
    </ExperimentContainer>
  );
}
