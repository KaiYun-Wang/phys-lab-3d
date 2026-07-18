"use client";

import { useState } from "react";
import {
  SpecialRelativitySceneComponent,
  SpecialRelativityData,
} from "@/experiments/special-relativity-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  DataGrid,
  DetailsLinkButton,
} from "@/components/experiment-ui";

export default function SpecialRelativityPage() {
  const [data, setData] = useState<SpecialRelativityData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [velocity, setVelocity] = useState(0);

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setVelocity(0);
  };

  const gamma = data?.gamma ?? 1;
  const velocityPercent = velocity * 100;

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="相对论参数">
        <ControlSlider
          label="飞船速度 v"
          value={velocity * 100}
          unit="% c"
          min={0}
          max={99.5}
          step={0.1}
          color="#22d3ee"
          onChange={(v) => setVelocity(v / 100)}
          decimals={1}
        />
      </ControlGroup>

      <ControlGroup title="快速预设">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "静止", v: 0 },
            { label: "0.5c", v: 0.5 },
            { label: "0.9c", v: 0.9 },
            { label: "0.95c", v: 0.95 },
            { label: "0.99c", v: 0.99 },
            { label: "0.995c", v: 0.995 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => setVelocity(preset.v)}
              className={`px-2 py-1.5 text-xs rounded-md border transition-all ${
                Math.abs(velocity - preset.v) < 0.005
                  ? "bg-cyan-600/30 border-cyan-500 text-cyan-700"
                  : "bg-gray-200/50 border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/special-relativity/details" />
    </div>
  );

  const dataPanelContent = data ? (
    <>
      <DataGrid
        data={{
          velocity: { value: velocityPercent, unit: "% c", color: "#22d3ee", decimals: 1 },
          gamma: { value: data.gamma, unit: "", color: "#8b5cf6", decimals: 3 },
          length: { value: data.lengthPercent, unit: "%", color: "#06d6a0", decimals: 1 },
          mass: { value: data.relativisticMass, unit: "×", color: "#f59e0b", decimals: 2 },
        }}
        columns={2}
      />

      <div className="mt-3 space-y-2">
        <EffectCard
          icon="🕐"
          title="时间膨胀"
          formula="Δt' = γ Δt₀"
          value={`${data.gamma.toFixed(2)}× 变慢`}
          color="#a855f7"
          desc="飞船上 1 秒 ≈ 地球上 γ 秒"
        />
        <EffectCard
          icon="↔️"
          title="长度收缩"
          formula="L' = L₀ / γ"
          value={`${data.lengthPercent.toFixed(1)}% 原长`}
          color="#06d6a0"
          desc="运动方向长度按 1/γ 收缩"
        />
        <EffectCard
          icon="⚖️"
          title="相对论质量"
          formula="m = γ m₀"
          value={`${data.relativisticMass.toFixed(2)}× 增重`}
          color="#f59e0b"
          desc="速度趋近光速，质量趋于无穷"
        />
      </div>
    </>
  ) : (
    <div className="text-center text-gray-500 text-sm py-8">正在加载相对论数据...</div>
  );

  return (
    <>
      <ExperimentContainer
        title="狭义相对论实验室"
        description="调节飞船速度，观察长度收缩、时间膨胀与相对论质量效应"
        experimentRoute="special-relativity"
        cameraPosition={[18, 8, 18]}
        backgroundColor="#000000"
        controls={parameterControls}
        dataPanel={dataPanelContent}
        simulationBar={{
          isPlaying,
          onPlayPause: handlePlayPause,
          onReset: handleReset,
          speed: simulationSpeed,
          onSpeedChange: setSimulationSpeed,
        }}
      >
        <SpecialRelativitySceneComponent
          velocity={velocity}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
          onDataChange={setData}
        />
      </ExperimentContainer>
    </>
  );
}

function EffectCard({
  icon,
  title,
  formula,
  value,
  color,
  desc,
}: {
  icon: string;
  title: string;
  formula: string;
  value: string;
  color: string;
  desc: string;
}) {
  return (
    <div
      className="p-3 rounded-lg border transition-all"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <code className="text-xs font-mono text-gray-300">{formula}</code>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}
