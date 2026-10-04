"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import type { DemoAdapter } from "@/components/demo/DemoPanel";

export default function DopplerPage() {
  const [data, setData] = useState<DopplerData | null>(null);
  const dataRef = useRef<DopplerData | null>(null);

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

  const paramsRef = useRef({
    sourceFrequency,
    sourceVelocity,
    waveSpeed,
    autoOscillate,
    sourceDirection,
    observerPosition,
  });
  paramsRef.current = {
    sourceFrequency,
    sourceVelocity,
    waveSpeed,
    autoOscillate,
    sourceDirection,
    observerPosition,
  };
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
    setTimeElapsed(0);
  };

  const onDataChange = useCallback((d: DopplerData) => {
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
          sourceFrequency: d.sourceFrequency,
          observedFrequency: d.observedFrequency,
          dopplerShiftRatio: d.dopplerShiftRatio,
          machNumber: d.machNumber,
          waveSpeed: d.waveSpeed,
          shiftType: d.shiftType,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.sourceFrequency === "number") setSourceFrequency(params.sourceFrequency);
          else if (params.sourceFrequency != null) setSourceFrequency(Number(params.sourceFrequency));
          if (typeof params.sourceVelocity === "number") setSourceVelocity(params.sourceVelocity);
          else if (params.sourceVelocity != null) setSourceVelocity(Number(params.sourceVelocity));
          if (typeof params.waveSpeed === "number") setWaveSpeed(params.waveSpeed);
          else if (params.waveSpeed != null) setWaveSpeed(Number(params.waveSpeed));
          if (typeof params.sourceDirection === "number") setSourceDirection(params.sourceDirection);
          else if (params.sourceDirection != null) setSourceDirection(Number(params.sourceDirection));
          if (typeof params.observerPosition === "number") setObserverPosition(params.observerPosition);
          else if (params.observerPosition != null) setObserverPosition(Number(params.observerPosition));
          if (typeof params.autoOscillate === "boolean") setAutoOscillate(params.autoOscillate);
        } finally {
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
          onChange={(v) => {
            notifyUserEdit();
            setSourceFrequency(v);
          }}
          decimals={1}
          demoId="sourceFrequency"
        />
        <ControlSlider
          label="源速度 (vₛ)"
          value={sourceVelocity}
          unit="m/s"
          min={0}
          max={15}
          step={0.1}
          color="#3b82f6"
          onChange={(v) => {
            notifyUserEdit();
            setSourceVelocity(v);
          }}
          decimals={1}
          demoId="sourceVelocity"
        />
        <ControlSlider
          label="波速 (v)"
          value={waveSpeed}
          unit="m/s"
          min={5}
          max={20}
          step={0.1}
          color="#22c55e"
          onChange={(v) => {
            notifyUserEdit();
            setWaveSpeed(v);
          }}
          decimals={1}
          demoId="waveSpeed"
        />
      </ControlGroup>

      <ControlGroup title="声源运动">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#dfe2f1]/90">模式</span>
          <div className="flex gap-2" data-demo-id="autoOscillate">
            <button
              onClick={() => {
                notifyUserEdit();
                setAutoOscillate(true);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                autoOscillate
                  ? "border-white bg-white/15 text-white"
                  : "border-[#232838] text-[#8d90a0] hover:border-[#3a4256] hover:text-white"
              }`}
            >
              自动
            </button>
            <button
              onClick={() => {
                notifyUserEdit();
                setAutoOscillate(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                !autoOscillate
                  ? "border-white bg-white/15 text-white"
                  : "border-[#232838] text-[#8d90a0] hover:border-[#3a4256] hover:text-white"
              }`}
            >
              手动
            </button>
          </div>
        </div>

        {!autoOscillate && (
          <div className="mb-3 sx-note-box">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8d90a0]">方向</span>
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
              onChange={(v) => {
                notifyUserEdit();
                setSourceDirection(v);
              }}
              decimals={1}
              demoId="sourceDirection"
            />
          </div>
        )}

        <ControlSlider
          label="观察者位置"
          value={observerPosition}
          unit="m"
          min={-20}
          max={20}
          step={0.1}
          color="#8b5cf6"
          onChange={(v) => {
            notifyUserEdit();
            setObserverPosition(v);
          }}
          decimals={1}
          demoId="observerPosition"
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
        <div className="space-y-2 text-xs text-[#8d90a0] leading-relaxed">
          {data ? (
            <>
              <p>
                <strong className="text-[#dfe2f1]">频移类型：</strong>
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
        demoAdapter={demoAdapter}
        simulationBar={{
          isPlaying,
          onPlayPause: handlePlayPause,
          onReset: handleReset,
          speed: simulationSpeed,
          onSpeedChange: setSimulationSpeed,
        }}
      >
        <DopplerSceneComponent
          onDataChange={onDataChange}
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
