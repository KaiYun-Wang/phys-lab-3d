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
  ControlPresetButtons,
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
  /** 单帧步进信号；自增即让场景推进一个固定步长（1/60 s） */
  const [stepSignal, setStepSignal] = useState(0);

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

  /** 单帧步进：自动暂停后推进一帧，便于逐帧观察粒子输运 */
  const handleStep = () => {
    setIsPlaying(false);
    setStepSignal((n) => n + 1);
  };

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

  const fluidPresets = [
    { label: "水", value: "water", emoji: "💧" },
    { label: "甘油", value: "glycerol", emoji: "🧪" },
  ];

  const fluidLabel = useMemo(
    () => fluidPresets.find((p) => p.value === fluid)?.label || fluid,
    [fluid],
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
      <ControlGroup title="流体参数">
        <ControlSlider
          label="入口流速 v₁"
          value={v1}
          unit="m/s"
          min={0}
          max={5}
          step={0.1}
          color="#3b82f6"
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
          color="#8b5cf6"
          onChange={(v) => {
            notifyUserEdit();
            setAreaRatio(v);
          }}
          decimals={2}
          demoId="areaRatio"
        />
      </ControlGroup>

      <ControlGroup title="流体介质">
        <ControlPresetButtons
          label="当前介质"
          value={fluid}
          presets={fluidPresets}
          onChange={(value) => {
            notifyUserEdit();
            setFluid(value as FluidType);
          }}
          displayValue={() => fluidLabel}
          demoId="fluid"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-900">
          <span>当前密度 ρ</span>
          <span className="font-mono text-gray-900">
            {FLUID_DENSITIES[fluid].toFixed(1)} kg/m³
          </span>
        </div>
      </ControlGroup>

      <ControlGroup title="原理说明">
        <div className="space-y-2 text-xs text-[#8d90a0] leading-relaxed">
          <p>
            <strong className="text-[#dfe2f1]">连续性方程：</strong>
            A₁v₁ = A₂v₂ → v₂ = v₁ / (A₂/A₁)
          </p>
          <p>
            <strong className="text-[#dfe2f1]">伯努利方程：</strong>
            P₁ + ½ρv₁² = P₂ + ½ρv₂²
          </p>
          <p>
            <strong className="text-[#dfe2f1]">压强差：</strong>
            ΔP = ½ρ(v₂² − v₁²)
            {data ? ` = ${data.deltaP.toFixed(2)} Pa` : ""}
          </p>
          <p>
            <strong className="text-[#dfe2f1]">测压说明：</strong>
            左管固定为参考液面，右管液面随 ΔP 升降；两侧液面高度差正比于压强差。
          </p>
          {statusLine ? <p className="text-[#c4c4ce]">{statusLine}</p> : null}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/bernoulli-venturi/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        v1: { value: data.v1, unit: "m/s", color: "#7dd3fc", decimals: 2 },
        v2: { value: data.v2, unit: "m/s", color: "#c4b5fd", decimals: 2 },
        rho: { value: data.rho, unit: "kg/m³", color: "#6ee7b7", decimals: 1 },
        deltaP: { value: data.deltaP, unit: "Pa", color: "#f9a8d4", decimals: 2 },
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
      consoleTag="VENTURI"
      consoleSubtitle="调节流速、截面比与流体介质"
      coordinateSystem="绝对流场"
      controls={parameterControls}
      dataPanel={hud}
      demoAdapter={demoAdapter}
      chatContext={chatContext}
      simulationBar={{
        isPlaying,
        onPlayPause: handlePlayPause,
        onReset: handleReset,
        onStep: handleStep,
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
        stepSignal={stepSignal}
        onDataChange={onDataChange}
      />
    </ExperimentContainer>
  );
}
