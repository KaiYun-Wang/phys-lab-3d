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
      setOnUserEdit: (fn) => {
        userEditHandlerRef.current = fn;
      },
    }),
    [],
  );

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
          onChange={(v) => {
            notifyUserEdit();
            setVelocity(v / 100);
          }}
          decimals={1}
          demoId="velocity"
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
              onClick={() => {
                notifyUserEdit();
                setVelocity(preset.v);
              }}
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

      <ControlGroup title="原理说明">
        <div className="space-y-2 text-xs text-[#8a8a96] leading-relaxed">
          <p>
            <strong className="text-[#e8e8f0]">时间膨胀</strong>
            <span className="font-mono text-[#a855f7]"> Δt′ = γ Δt₀</span>
            {data ? ` · ${data.gamma.toFixed(2)}× 变慢` : ""}
            <br />
            飞船上 1 秒 ≈ 地球上 γ 秒
          </p>
          <p>
            <strong className="text-[#e8e8f0]">长度收缩</strong>
            <span className="font-mono text-[#06d6a0]"> L′ = L₀ / γ</span>
            {data ? ` · ${data.lengthPercent.toFixed(1)}% 原长` : ""}
            <br />
            运动方向长度按 1/γ 收缩
          </p>
          <p>
            <strong className="text-[#e8e8f0]">相对论质量</strong>
            <span className="font-mono text-[#f59e0b]"> m = γ m₀</span>
            {data ? ` · ${data.relativisticMass.toFixed(2)}× 增重` : ""}
            <br />
            速度趋近光速，质量趋于无穷
          </p>
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/special-relativity/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        velocity: { value: velocityPercent, unit: "% c", color: "#67e8f9", decimals: 1 },
        gamma: { value: data.gamma, unit: "", color: "#c4b5fd", decimals: 3 },
        length: { value: data.lengthPercent, unit: "%", color: "#6ee7b7", decimals: 1 },
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
