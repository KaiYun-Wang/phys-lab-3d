"use client";

import { useState } from "react";
import {
  DoubleSlitSceneComponent,
  DoubleSlitData,
} from "@/experiments/double-slit-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  DataGrid,
  FloatingControlPanel,
  SimulationController,
  DataPanel,
  DetailsLinkButton,
} from "@/components/experiment-ui";

export default function DoubleSlitPage() {
  const [data, setData] = useState<DoubleSlitData | null>(null);
  const [showDataPanel, setShowDataPanel] = useState(true);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const wavelength = 500;
  const [slitSeparation, setSlitSeparation] = useState(2);
  const [slitWidth, setSlitWidth] = useState(0.3);
  const [particleRate, setParticleRate] = useState(3);

  const [showParticles, setShowParticles] = useState(true);
  const [showWaveView, setShowWaveView] = useState(false);
  const [observerMode, setObserverMode] = useState(true);

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
  };

  const wavelengthColor = `hsl(${540 - wavelength * 0.6}, 100%, 50%)`;

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="量子参数">
        <ControlSlider
          label="缝间距 (d)"
          value={slitSeparation}
          unit="mm"
          min={0.5}
          max={5}
          step={0.1}
          color="#ec4899"
          onChange={setSlitSeparation}
          decimals={1}
        />
        <ControlSlider
          label="缝宽 (a)"
          value={slitWidth}
          unit="mm"
          min={0.1}
          max={1}
          step={0.05}
          color="#22c55e"
          onChange={setSlitWidth}
          decimals={2}
        />
        <ControlSlider
          label="发射速率"
          value={particleRate}
          unit="个/秒"
          min={1}
          max={10}
          step={1}
          color="#8b5cf6"
          onChange={setParticleRate}
          decimals={0}
        />
      </ControlGroup>

      <ControlGroup title="显示选项">
        <div className="p-3 rounded-lg border-2 transition-all" style={{
          borderColor: observerMode ? "#ef4444" : "#22c55e",
          backgroundColor: observerMode ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
        }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold" style={{ color: observerMode ? "#ef4444" : "#22c55e" }}>
                {observerMode ? "📹 观测开启" : "🌊 波动模式"}
              </span>
              <p className="text-xs mt-0.5" style={{ color: observerMode ? "#f87171" : "#4ade80" }}>
                {observerMode ? "粒子行为（波函数坍缩）" : "波干涉（量子叠加态）"}
              </p>
            </div>
            <button
              onClick={() => setObserverMode(!observerMode)}
              className="relative w-12 h-6 rounded-full transition-all duration-300"
              style={{ backgroundColor: observerMode ? "#ef4444" : "#22c55e" }}
            >
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
                style={{ transform: observerMode ? "translateX(24px)" : "translateX(0)" }} />
            </button>
          </div>
        </div>
        {[
          { label: "显示粒子", checked: showParticles, onChange: setShowParticles },
          { label: "理论曲线", checked: showWaveView, onChange: setShowWaveView },
        ].map((opt) => (
          <label key={opt.label} className="sx-control-row cursor-pointer">
            <span>{opt.label}</span>
            <input
              type="checkbox"
              checked={opt.checked}
              onChange={(e) => opt.onChange(e.target.checked)}
              className="w-4 h-4 rounded accent-white"
            />
          </label>
        ))}
      </ControlGroup>

      <DetailsLinkButton href="/experiments/double-slit/details" />
    </div>
  );

  const dataPanelContent = data ? (
    <>
      <DataGrid
        data={{
          "波长": { value: data.wavelength, unit: "nm", color: wavelengthColor, decimals: 0 },
          "条纹间距": { value: data.fringeSpacing, unit: "mm", color: "#a855f7", decimals: 3 },
          "缝间距": { value: data.slitSeparation, unit: "mm", color: "#ec4899", decimals: 2 },
          "粒子数": { value: data.particleCount, unit: "", color: "#22c55e", decimals: 0 },
        }}
        columns={2}
      />
      <div className="mt-3 sx-note-box">
        <p className="text-xs text-[#e8e8f0]/80 leading-relaxed">
          <strong className="text-white">波粒二象性：</strong>
          {observerMode
            ? "开启观测时，粒子逐个通过狭缝——波函数坍缩为粒子行为。"
            : "无观测时，每个粒子同时处于通过两缝的叠加态——形成波干涉条纹。"}
        </p>
        <p className="text-xs text-[#8a8a96] mt-2 font-mono">
          I(y) = cos²(π·d·y/λ·L) · sinc²(π·a·y/λ·L)
        </p>
      </div>
    </>
  ) : (
    <div className="text-center text-[#8a8a96] text-sm py-8">
      正在启动模拟…
    </div>
  );

  return (
    <>
      <ExperimentContainer
        title="双缝实验"
        description="量子力学：粒子逐点累积出波干涉条纹"
        cameraPosition={[25, 15, 25]}
        backgroundColor="#000000"
        controls={null}
        dataPanel={null}
      >
        <DoubleSlitSceneComponent
          observerMode={observerMode}
          onDataChange={setData}
          wavelength={wavelength}
          slitSeparation={slitSeparation}
          slitWidth={slitWidth}
          particleRate={particleRate}
          showParticles={showParticles}
          showWaveView={showWaveView}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
        />
      </ExperimentContainer>

      <SimulationController
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        speed={simulationSpeed}
        onSpeedChange={setSimulationSpeed}
        timeLabel="时间"
        speedLabel="速度"
      />

      <FloatingControlPanel
        title="⚛️ 量子参数"
        initialPosition={{ x: 20, y: 80 }}
      >
        {parameterControls}
      </FloatingControlPanel>

      <DataPanel
        isVisible={showDataPanel}
        onToggle={() => setShowDataPanel(!showDataPanel)}
        title="📊 实时数据"
      >
        {dataPanelContent}
      </DataPanel>
    </>
  );
}
