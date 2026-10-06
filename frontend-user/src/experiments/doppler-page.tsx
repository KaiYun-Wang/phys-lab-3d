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
  const [observerPosition, setObserverPosition] = useState(15);

  const paramsRef = useRef({
    sourceFrequency,
    sourceVelocity,
    waveSpeed,
    observerPosition,
  });
  paramsRef.current = {
    sourceFrequency,
    sourceVelocity,
    waveSpeed,
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
    setSourceFrequency(2);
    setSourceVelocity(5);
    setWaveSpeed(10);
    setObserverPosition(15);
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
          if (typeof params.observerPosition === "number") setObserverPosition(params.observerPosition);
          else if (params.observerPosition != null) setObserverPosition(Number(params.observerPosition));
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

  const statusLine = data
    ? data.shiftType === "none"
      ? "声源速度远小于波速：频移可忽略。"
      : `${data.shiftType === "blueshift" ? "蓝移（靠近）：观测频率比源频率高" : "红移（远离）：观测频率比源频率低"} ${Math.abs((data.dopplerShiftRatio - 1) * 100).toFixed(1)}%${data.machNumber >= 1 ? ` · 超音速，马赫数 ${data.machNumber.toFixed(2)}` : ""}。`
    : null;

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup
        title="波参数"
        icon="fa-solid fa-wave-square"
        status="实时计算就绪"
      >
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
          color="#38bdf8"
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
          color="#34d399"
          onChange={(v) => {
            notifyUserEdit();
            setWaveSpeed(v);
          }}
          decimals={1}
          demoId="waveSpeed"
        />
      </ControlGroup>

      <ControlGroup
        title="观察者"
        icon="fa-solid fa-location-crosshairs"
        tone="amber"
        status={`${observerPosition.toFixed(1)} m`}
      >
        <ControlSlider
          label="观察者位置"
          value={observerPosition}
          unit="m"
          min={-20}
          max={20}
          step={0.1}
          color="#c084fc"
          onChange={(v) => {
            notifyUserEdit();
            setObserverPosition(v);
          }}
          decimals={1}
          demoId="observerPosition"
        />
      </ControlGroup>

      <ControlGroup
        title="原理说明"
        icon="fa-solid fa-square-root-variable"
        tone="pink"
        status="动态同步"
      >
        <div className="exp-theory">
          <div className="exp-theory__row">
            <span className="exp-theory__label">多普勒公式（声源靠近观察者）：</span>
            <span className="exp-theory__eq">f′ = f₀ · v / (v − vₛ) → 频率升高</span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">远离观察者：</span>
            <span className="exp-theory__eq exp-theory__eq--amber">f′ = f₀ · v / (v + vₛ) → 频率降低</span>
          </div>
          <div className="exp-theory__dp">
            <span>f′ / f₀ = {data ? data.dopplerShiftRatio.toFixed(3) : "—"}</span>
            <strong>{data ? `${data.observedFrequency.toFixed(2)} Hz` : "—"}</strong>
          </div>
          {statusLine ? <p className="exp-theory__note">{statusLine}</p> : null}
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
        多普勒比: { value: data.dopplerShiftRatio, unit: "×", color: "#c084fc", decimals: 2 },
        马赫数: { value: data.machNumber, unit: "", color: "#67e8f9", decimals: 2 },
        波速: { value: data.waveSpeed, unit: "m/s", color: "#34d399", decimals: 0 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="多普勒效应"
        description="观察运动声源引起的频率变化"
        experimentRoute="doppler"
        cameraPosition={[0, 19, 42]}
        backgroundColor="#000000"
        consoleSubtitle="调节声源频率、速度与观察者位置"
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
          observerPosition={observerPosition}
          resetTrigger={resetTrigger}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
        />
      </ExperimentContainer>
    </>
  );
}
