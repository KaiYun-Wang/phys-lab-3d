"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DoubleSlitSceneComponent,
  DoubleSlitData,
} from "@/experiments/double-slit-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

/** 发射速率默认值（个/秒），同时作为参数重置的基准 */
const DEFAULT_PARTICLE_RATE = 300;

export default function DoubleSlitPage() {
  const [data, setData] = useState<DoubleSlitData | null>(null);
  const dataRef = useRef<DoubleSlitData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const wavelength = 500;
  const [slitSeparation, setSlitSeparation] = useState(0.8);
  const [slitWidth, setSlitWidth] = useState(0.15);
  const [particleRate, setParticleRate] = useState(DEFAULT_PARTICLE_RATE);

  const [observerMode, setObserverMode] = useState(true);

  const paramsRef = useRef({ slitSeparation, slitWidth, particleRate, observerMode });
  paramsRef.current = { slitSeparation, slitWidth, particleRate, observerMode };
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
    setSlitSeparation(0.8);
    setSlitWidth(0.15);
    setParticleRate(DEFAULT_PARTICLE_RATE);
    setObserverMode(true);
  };

  const onDataChange = useCallback((d: DoubleSlitData) => {
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
          wavelength: d.wavelength,
          slitSeparation: d.slitSeparation,
          slitWidth: d.slitWidth,
          fringeSpacing: d.fringeSpacing,
          particleCount: d.particleCount,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.slitSeparation === "number")
            setSlitSeparation(Math.min(1, Math.max(0.5, params.slitSeparation)));
          else if (params.slitSeparation != null)
            setSlitSeparation(Math.min(1, Math.max(0.5, Number(params.slitSeparation))));
          if (typeof params.slitWidth === "number")
            setSlitWidth(Math.min(0.2, Math.max(0.1, params.slitWidth)));
          else if (params.slitWidth != null)
            setSlitWidth(Math.min(0.2, Math.max(0.1, Number(params.slitWidth))));
          if (typeof params.particleRate === "number")
            setParticleRate(Math.min(1000, Math.max(100, params.particleRate)));
          else if (params.particleRate != null)
            setParticleRate(Math.min(1000, Math.max(100, Number(params.particleRate))));
          if (typeof params.observerMode === "boolean") setObserverMode(params.observerMode);
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
    ? `λ = ${data.wavelength} nm、d = ${data.slitSeparation.toFixed(1)} mm：中心亮纹最亮，条纹间距 Δy ≈ ${data.fringeSpacing.toFixed(3)} mm（与缝间距 d 成反比）。`
    : null;

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup
        title="量子参数"
        icon="fa-solid fa-atom"
        status="实时计算就绪"
      >
        <ControlSlider
          label="缝间距 (d)"
          value={slitSeparation}
          unit="mm"
          min={0.5}
          max={1}
          step={0.05}
          color="#38bdf8"
          onChange={(v) => {
            notifyUserEdit();
            setSlitSeparation(v);
          }}
          decimals={1}
          demoId="slitSeparation"
        />
        <ControlSlider
          label="缝宽 (a)"
          value={slitWidth}
          unit="mm"
          min={0.1}
          max={0.2}
          step={0.01}
          color="#c084fc"
          onChange={(v) => {
            notifyUserEdit();
            setSlitWidth(v);
          }}
          decimals={2}
          demoId="slitWidth"
        />
        {observerMode && (
          <ControlSlider
            label="发射速率"
            value={particleRate}
            unit="个/秒"
            min={100}
            max={1000}
            step={5}
            color="#34d399"
            onChange={(v) => {
              notifyUserEdit();
              setParticleRate(v);
            }}
            decimals={0}
            demoId="particleRate"
          />
        )}
      </ControlGroup>

      <ControlGroup
        title="观测模式"
        icon="fa-solid fa-eye"
        status={observerMode ? "粒子行为（坍缩）" : "波干涉（叠加）"}
        statusTone={observerMode ? "muted" : "sky"}
      >
        <div className="exp-option-switch" role="group" aria-label="观测模式" data-demo-id="observerMode">
          <button
            type="button"
            className={`exp-option${!observerMode ? " is-on" : ""}`}
            onClick={() => {
              notifyUserEdit();
              setObserverMode(false);
            }}
            aria-pressed={!observerMode}
            data-tooltip="无观测：粒子处于双缝叠加态"
          >
            <i className="fa-solid fa-water" style={{ color: "#38bdf8" }} aria-hidden />
            <span>波动模式</span>
          </button>
          <button
            type="button"
            className={`exp-option${observerMode ? " is-on" : ""}`}
            onClick={() => {
              notifyUserEdit();
              setObserverMode(true);
            }}
            aria-pressed={observerMode}
            data-tooltip="开启观测：波函数坍缩，粒子行为"
          >
            <i className="fa-solid fa-eye" style={{ color: "#f472b6" }} aria-hidden />
            <span>观测坍缩</span>
          </button>
        </div>
      </ControlGroup>

      <ControlGroup
        title="原理说明"
        icon="fa-solid fa-square-root-variable"
        tone="pink"
        status="动态同步"
      >
        <div className="exp-theory">
          <div className="exp-theory__row">
            <span className="exp-theory__label">波粒二象性：</span>
            <span className="exp-theory__eq">
              {observerMode
                ? "开启观测 → 波函数坍缩，粒子逐个通过狭缝"
                : "无观测 → 每个粒子同时通过双缝，形成干涉条纹"}
            </span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">双缝干涉强度分布：</span>
            <span className="exp-theory__eq">I(y) = cos²(π·d·y/λL) · sinc²(π·a·y/λL)</span>
          </div>
          <div className="exp-theory__dp">
            <span>Δy = λL / d</span>
            <strong>{data ? `${data.fringeSpacing.toFixed(3)} mm` : "—"}</strong>
          </div>
          {statusLine ? <p className="exp-theory__note">{statusLine}</p> : null}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/double-slit/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        lambda: { value: data.wavelength, unit: "nm", color: "#67e8f9", decimals: 0 },
        fringe: { value: data.fringeSpacing, unit: "mm", color: "#c084fc", decimals: 3 },
        d: { value: data.slitSeparation, unit: "mm", color: "#38bdf8", decimals: 2 },
        N: { value: data.particleCount, unit: "", color: "#34d399", decimals: 0 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="双缝实验"
        description="量子力学：粒子逐点累积出波干涉条纹"
        experimentRoute="double-slit"
        cameraPosition={[25, 15, 25]}
        backgroundColor="#000000"
        consoleSubtitle="调节缝间距、缝宽与粒子发射速率"
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
        <DoubleSlitSceneComponent
          observerMode={observerMode}
          onDataChange={onDataChange}
          wavelength={wavelength}
          slitSeparation={slitSeparation}
          slitWidth={slitWidth}
          particleRate={particleRate}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
        />
      </ExperimentContainer>
    </>
  );
}
