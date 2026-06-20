"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  DataGrid,
  FloatingControlPanel,
  SimulationController,
  DataPanel,
} from "@/components/experiment-ui";

export default function BernoulliVenturiPage() {
  const router = useRouter();
  const [data, setData] = useState<BernoulliData | null>(null);
  const [showDataPanel, setShowDataPanel] = useState(true);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [v1, setV1] = useState(2.0);
  const [areaRatio, setAreaRatio] = useState(0.5);
  const [fluid, setFluid] = useState<FluidType>("water");

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setV1(2.0);
    setAreaRatio(0.5);
    setFluid("water");
  };

  const fluidPresets = [
    { label: "水", value: "water", emoji: "💧" },
    { label: "甘油", value: "glycerol", emoji: "🧪" },
  ];

  const fluidLabel = useMemo(
    () => fluidPresets.find((p) => p.value === fluid)?.label || fluid,
    [fluid]
  );

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
          onChange={setV1}
          decimals={1}
        />
        <ControlSlider
          label="截面积比 A₂/A₁"
          value={areaRatio}
          unit=""
          min={0.2}
          max={2.0}
          step={0.05}
          color="#8b5cf6"
          onChange={setAreaRatio}
          decimals={2}
        />
      </ControlGroup>

      <ControlGroup title="流体介质">
        <ControlPresetButtons
          label="当前介质"
          value={fluid}
          presets={fluidPresets}
          onChange={(value) => setFluid(value as FluidType)}
          displayValue={() => fluidLabel}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-900">
          <span>当前密度 ρ</span>
          <span className="font-mono text-gray-900">
            {FLUID_DENSITIES[fluid].toFixed(1)} kg/m³
          </span>
        </div>
      </ControlGroup>

      <button
        onClick={() => router.push("/experiments/bernoulli-venturi/details")}
        className="w-full py-2.5 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 font-medium text-sm rounded-lg transition-all border border-blue-300/50 flex items-center justify-center gap-2"
      >
        📖 查看实验详情
      </button>
    </div>
  );

  const dataPanelContent = data ? (
    <>
      <DataGrid
        data={{
          v1: { value: data.v1, unit: "m/s", color: "#3b82f6", decimals: 2 },
          v2: { value: data.v2, unit: "m/s", color: "#8b5cf6", decimals: 2 },
          rho: { value: data.rho, unit: "kg/m³", color: "#06d6a0", decimals: 1 },
          deltaP: { value: data.deltaP, unit: "Pa", color: "#ec4899", decimals: 2 },
        }}
        columns={2}
      />
      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-blue-400">连续性方程：</strong>
          A₁v₁ = A₂v₂ → v₂ = v₁ / (A₂/A₁)
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-purple-400">伯努利方程：</strong>
          P₁ + ½ρv₁² = P₂ + ½ρv₂²
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-pink-400">压强差：</strong>
          ΔP = ½ρ(v₂² − v₁²) = {data.deltaP.toFixed(2)} Pa
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-emerald-400">测压说明：</strong>
          左管固定为参考液面，右管液面随 ΔP 升降；两侧液面高度差正比于压强差。
        </p>
        <p
          className={`text-xs font-medium leading-relaxed ${
            data.deltaP > 0 ? "text-blue-400" : data.deltaP < 0 ? "text-purple-400" : "text-gray-400"
          }`}
        >
          {data.deltaP > 0
            ? "收缩管：A₂/A₁ < 1，v₂ > v₁，P₂ < P₁，右管液面低于左管"
            : data.deltaP < 0
            ? "扩张管：A₂/A₁ > 1，v₂ < v₁，P₂ > P₁，右管液面高于左管"
            : "等径管：A₂/A₁ = 1，v₂ = v₁，P₂ = P₁，两侧液面齐平"}
        </p>
      </div>
    </>
  ) : (
    <div className="text-center text-gray-500 text-sm py-8">正在加载仿真数据...</div>
  );

  return (
    <>
      <ExperimentContainer
        title="伯努利原理（文丘里管）"
        description="调节流速、截面积与流体介质，观察流速与压强的反比关系"
        cameraPosition={[22, 12, 22]}
        backgroundColor="#050510"
        controls={null}
        dataPanel={null}
      >
        <BernoulliVenturiSceneComponent
          v1={v1}
          areaRatio={areaRatio}
          fluid={fluid}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
          onDataChange={setData}
        />
      </ExperimentContainer>

      <SimulationController
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        speed={simulationSpeed}
        onSpeedChange={setSimulationSpeed}
      />

      <FloatingControlPanel title="⚙️ 实验参数" initialPosition={{ x: 20, y: 80 }}>
        {parameterControls}
      </FloatingControlPanel>

      <DataPanel
        isVisible={showDataPanel}
        onToggle={() => setShowDataPanel(!showDataPanel)}
      >
        {dataPanelContent}
      </DataPanel>
    </>
  );
}
