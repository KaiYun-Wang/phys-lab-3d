"use client";

import { useState } from "react";
import {
  DopplerSceneComponent,
  DopplerData,
} from "@/experiments/doppler-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";

export default function DopplerPage() {
  const [data, setData] = useState<DopplerData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const [sourceFrequency, setSourceFrequency] = useState(2);
  const [sourceVelocity, setSourceVelocity] = useState(5);
  const [waveSpeed, setWaveSpeed] = useState(10);
  const [showWavefronts, setShowWavefronts] = useState(true);

  const [autoOscillate, setAutoOscillate] = useState(true);
  const [sourceDirection, setSourceDirection] = useState(0);
  const [observerPosition, setObserverPosition] = useState(15);

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setTimeElapsed(0);
  };

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="波参数">
        <ControlSlider
          label="源频率 (f₀)"
          value={sourceFrequency}
          unit="Hz"
          min={0.5}
          max={5}
          step={0.1}
          color="#f59e0b"
          onChange={setSourceFrequency}
          decimals={1}
        />
        <ControlSlider
          label="源速度 (vₛ)"
          value={sourceVelocity}
          unit="m/s"
          min={0}
          max={15}
          step={0.5}
          color="#3b82f6"
          onChange={setSourceVelocity}
          decimals={1}
        />
        <ControlSlider
          label="波速 (v)"
          value={waveSpeed}
          unit="m/s"
          min={5}
          max={20}
          step={1}
          color="#22c55e"
          onChange={setWaveSpeed}
          decimals={0}
        />
      </ControlGroup>

      <ControlGroup title="声源运动">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#e8e8f0]/90">模式</span>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoOscillate(true)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                autoOscillate
                  ? "border-white bg-white/15 text-white"
                  : "border-[#45454f] text-[#8a8a96] hover:border-[#62626e] hover:text-white"
              }`}
            >
              自动
            </button>
            <button
              onClick={() => setAutoOscillate(false)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                !autoOscillate
                  ? "border-white bg-white/15 text-white"
                  : "border-[#45454f] text-[#8a8a96] hover:border-[#62626e] hover:text-white"
              }`}
            >
              手动
            </button>
          </div>
        </div>

        {!autoOscillate && (
          <div className="mb-3 sx-note-box">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8a8a96]">方向</span>
              <span className="text-xs font-mono text-white">
                {sourceDirection > 0.1 ? "→ 向右" : sourceDirection < -0.1 ? "← 向左" : "● 静止"}
              </span>
            </div>
            <ControlSlider
              label=""
              value={sourceDirection}
              unit=""
              min={-1}
              max={1}
              step={0.1}
              color="#f59e0b"
              onChange={setSourceDirection}
              decimals={1}
            />
          </div>
        )}

        <ControlSlider
          label="观察者位置"
          value={observerPosition}
          unit="m"
          min={-20}
          max={20}
          step={1}
          color="#8b5cf6"
          onChange={setObserverPosition}
          decimals={0}
        />
      </ControlGroup>

      <ControlGroup title="显示选项">
        <label className="sx-control-row cursor-pointer">
          <span>显示波前</span>
          <input
            type="checkbox"
            checked={showWavefronts}
            onChange={(e) => setShowWavefronts(e.target.checked)}
            className="w-4 h-4 rounded accent-white"
          />
        </label>
      </ControlGroup>

      <ControlGroup title="原理说明">
        <div className="space-y-2 text-xs text-[#8a8a96] leading-relaxed">
          {data ? (
            <>
              <p>
                <strong className="text-[#e8e8f0]">频移类型：</strong>
                <span
                  className={
                    data.shiftType === "blueshift"
                      ? "text-blue-400"
                      : data.shiftType === "redshift"
                        ? "text-red-400"
                        : "text-green-400"
                  }
                >
                  {data.shiftType === "blueshift"
                    ? "蓝移（靠近）"
                    : data.shiftType === "redshift"
                      ? "红移（远离）"
                      : "无频移（静止）"}
                </span>
              </p>
              {data.machNumber >= 1 ? (
                <p className="text-purple-400">超音速，马赫数 {data.machNumber.toFixed(2)}</p>
              ) : null}
              {data.dopplerShiftRatio !== 1 ? (
                <p>
                  {data.dopplerShiftRatio > 1
                    ? `频率升高 ${((data.dopplerShiftRatio - 1) * 100).toFixed(0)}%`
                    : `频率降低 ${((1 - data.dopplerShiftRatio) * 100).toFixed(0)}%`}
                </p>
              ) : null}
            </>
          ) : (
            <p>声源靠近观察者时频率升高（蓝移），远离时降低（红移）。</p>
          )}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/doppler/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        源频率: { value: data.sourceFrequency, unit: "Hz", color: "#fbbf24", decimals: 1 },
        观测频率: {
          value: data.observedFrequency,
          unit: "Hz",
          color:
            data.shiftType === "blueshift"
              ? "#7dd3fc"
              : data.shiftType === "redshift"
                ? "#fca5a5"
                : "#86efac",
          decimals: 1,
        },
        多普勒比: { value: data.dopplerShiftRatio, unit: "×", color: "#f9a8d4", decimals: 2 },
        马赫数: { value: data.machNumber, unit: "", color: "#c4b5fd", decimals: 2 },
        波速: { value: data.waveSpeed, unit: "m/s", color: "#86efac", decimals: 0 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="多普勒效应"
        description="观察运动声源引起的频率变化"
        experimentRoute="doppler"
        cameraPosition={[0, 30, 40]}
        backgroundColor="#000000"
        controls={parameterControls}
        dataPanel={hud}
        simulationBar={{
          isPlaying,
          onPlayPause: handlePlayPause,
          onReset: handleReset,
          speed: simulationSpeed,
          onSpeedChange: setSimulationSpeed,
        }}
      >
        <DopplerSceneComponent
          onDataChange={setData}
          sourceFrequency={sourceFrequency}
          sourceVelocity={sourceVelocity}
          waveSpeed={waveSpeed}
          autoOscillate={autoOscillate}
          sourceDirection={sourceDirection}
          observerPosition={observerPosition}
          showWavefronts={showWavefronts}
          resetTrigger={resetTrigger}
        />
      </ExperimentContainer>
    </>
  );
}
