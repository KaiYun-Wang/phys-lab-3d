"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  SpecialRelativitySceneComponent,
  SpecialRelativityData,
} from "@/experiments/special-relativity-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

export default function SpecialRelativityPage() {
  const [data, setData] = useState<SpecialRelativityData | null>(null);
  const dataRef = useRef<SpecialRelativityData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [velocity, setVelocity] = useState(0);

  const paramsRef = useRef({ velocity });
  paramsRef.current = { velocity };
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
    setVelocity(0);
  };

  const onDataChange = useCallback((d: SpecialRelativityData) => {
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
          velocity: d.velocity,
          gamma: d.gamma,
          lengthPercent: d.lengthPercent,
          relativisticMass: d.relativisticMass,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.velocity === "number") setVelocity(params.velocity);
          else if (params.velocity != null) setVelocity(Number(params.velocity));
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

  const velocityPercent = velocity * 100;

  const statusLine = data
    ? velocityPercent < 0.05
      ? "飞船静止：γ = 1，时间、长度与质量均回到经典值。"
      : `v = ${velocityPercent.toFixed(1)}% c：γ = ${data.gamma.toFixed(3)}，运动方向长度收缩至 ${data.lengthPercent.toFixed(1)}%，1 kg 静质量等效 ${data.relativisticMass.toFixed(2)} kg。`
    : null;

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup
        title="相对论参数"
        icon="fa-solid fa-rocket"
        status="实时计算就绪"
      >
        <ControlSlider
          label="飞船速度 v"
          value={velocity * 100}
          unit="% c"
          min={0}
          max={99.5}
          step={0.1}
          color="#38bdf8"
          onChange={(v) => {
            notifyUserEdit();
            setVelocity(v / 100);
          }}
          decimals={1}
          demoId="velocity"
          presets={[
            { label: "静止", value: 0 },
            { label: "0.5c", value: 50 },
            { label: "0.9c", value: 90 },
            { label: "0.95c", value: 95 },
            { label: "0.99c", value: 99 },
            { label: "0.995c", value: 99.5 },
          ]}
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
            <span className="exp-theory__label">时间膨胀：</span>
            <span className="exp-theory__eq">
              Δt′ = γΔt₀ → 飞船上 1 s ≈ 地面 {data ? data.gamma.toFixed(2) : "—"} s
            </span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">长度收缩：</span>
            <span className="exp-theory__eq">
              L′ = L₀ / γ → 运动方向剩 {data ? data.lengthPercent.toFixed(1) : "—"}% 原长
            </span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">相对论质量：</span>
            <span className="exp-theory__eq exp-theory__eq--amber">
              m = γm₀ → 增至 {data ? data.relativisticMass.toFixed(2) : "—"}× 静质量
            </span>
          </div>
          <div className="exp-theory__dp">
            <span>γ = 1 / √(1 − v²/c²)</span>
            <strong>{data ? data.gamma.toFixed(3) : "—"}</strong>
          </div>
          {statusLine ? <p className="exp-theory__note">{statusLine}</p> : null}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/special-relativity/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        velocity: { value: velocityPercent, unit: "% c", color: "#38bdf8", decimals: 1 },
        gamma: { value: data.gamma, unit: "", color: "#c084fc", decimals: 3 },
        length: { value: data.lengthPercent, unit: "%", color: "#34d399", decimals: 1 },
        mass: { value: data.relativisticMass, unit: "×", color: "#fbbf24", decimals: 2 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="狭义相对论实验室"
        description="调节飞船速度，观察长度收缩、时间膨胀与相对论质量效应"
        experimentRoute="special-relativity"
        cameraPosition={[18, 8, 18]}
        backgroundColor="#000000"
        consoleSubtitle="调节飞船速度，观察相对论效应"
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
        <SpecialRelativitySceneComponent
          velocity={velocity}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
          onDataChange={onDataChange}
        />
      </ExperimentContainer>
    </>
  );
}
