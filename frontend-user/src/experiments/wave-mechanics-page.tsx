"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { WaveMechanicsSceneComponent } from "@/experiments/wave-mechanics-scene";
import type { WaveSnapshot, ViewMode } from "@/experiments/wave-mechanics/shared-wave-utils";
import { calculateWaveSpeed } from "@/utils/physics";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  compare: "左右对比",
  transverse: "横波视图",
  longitudinal: "纵波视图",
  overlay: "同轴叠加",
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || values.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values, color]);

  if (values.length < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={48}
      className="w-full h-12 rounded bg-black/30 mt-2"
    />
  );
}

export default function WaveMechanicsPage() {
  const [data, setData] = useState<WaveSnapshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [frequency, setFrequency] = useState(2);
  const [amplitude, setAmplitude] = useState(1);
  const [wavelength, setWavelength] = useState(4);
  const [viewMode, setViewMode] = useState<ViewMode>("compare");

  const [focusTarget, setFocusTarget] = useState<
    "center" | "transverse" | "longitudinal" | null
  >(null);
  const [particleHistory, setParticleHistory] = useState<number[]>([]);
  const [selectedSide, setSelectedSide] = useState<
    "transverse" | "longitudinal" | null
  >(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<"transverse" | "longitudinal">(
    "transverse"
  );
  const waveSpeed = calculateWaveSpeed(frequency, wavelength);

  const paramsRef = useRef({ frequency, amplitude, wavelength, viewMode });
  paramsRef.current = { frequency, amplitude, wavelength, viewMode };
  const dataRef = useRef<WaveSnapshot | null>(null);
  const isMobileRef = useRef(false);
  isMobileRef.current = isMobile;
  const userEditHandlerRef = useRef<(() => void) | null>(null);
  const demoApplyingRef = useRef(false);

  const notifyUserEdit = useCallback(() => {
    if (demoApplyingRef.current) return;
    userEditHandlerRef.current?.();
  }, []);

  const onDataChange = useCallback((d: WaveSnapshot) => {
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
          time: d.time,
          frequency: d.frequency,
          amplitude: d.amplitude,
          wavelength: d.wavelength,
          waveSpeed: d.waveSpeed,
          k: d.k,
          omega: d.omega,
          transverseYMax: d.transverseYMax,
          transverseYMin: d.transverseYMin,
          longitudinalRhoMax: d.longitudinalRhoMax,
          longitudinalRhoMin: d.longitudinalRhoMin,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.frequency === "number") setFrequency(params.frequency);
          else if (params.frequency != null) setFrequency(Number(params.frequency));
          if (typeof params.amplitude === "number") setAmplitude(params.amplitude);
          else if (params.amplitude != null) setAmplitude(Number(params.amplitude));
          if (typeof params.wavelength === "number") setWavelength(params.wavelength);
          else if (params.wavelength != null) setWavelength(Number(params.wavelength));
          const vm = params.viewMode;
          if (vm === "compare" || vm === "transverse" || vm === "longitudinal" || vm === "overlay") {
            setViewMode(vm);
            if (isMobileRef.current && (vm === "transverse" || vm === "longitudinal")) {
              setMobileTab(vm);
            }
          }
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectiveViewMode: ViewMode = useMemo(() => {
    if (!isMobile) return viewMode;
    return mobileTab === "transverse" ? "transverse" : "longitudinal";
  }, [isMobile, viewMode, mobileTab]);

  const handlePlayPause = () => setIsPlaying((p) => !p);

  const handleReset = () => {
    notifyUserEdit();
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setParticleHistory([]);
    setSelectedSide(null);
    setFrequency(2);
    setAmplitude(1);
    setWavelength(4);
    setViewMode("compare");
  };

  const parameterControls = (
    <div className="space-y-4 pb-1">
      <ControlGroup
        title="波动参数"
        icon="fa-solid fa-water"
        status="实时计算就绪"
      >
        <ControlSlider
          label="频率 f"
          value={frequency}
          unit="Hz"
          min={0.5}
          max={4}
          step={0.1}
          color="#38bdf8"
          onChange={(v) => {
            notifyUserEdit();
            setFrequency(v);
          }}
          decimals={1}
          demoId="frequency"
        />
        <ControlSlider
          label="振幅 A"
          value={amplitude}
          unit=""
          min={0.2}
          max={2}
          step={0.1}
          color="#c084fc"
          onChange={(v) => {
            notifyUserEdit();
            setAmplitude(v);
          }}
          decimals={1}
          demoId="amplitude"
        />
        <ControlSlider
          label="波长 λ"
          value={wavelength}
          unit="m"
          min={2}
          max={8}
          step={0.1}
          color="#34d399"
          onChange={(v) => {
            notifyUserEdit();
            setWavelength(v);
          }}
          decimals={2}
          demoId="wavelength"
        />
      </ControlGroup>

      {!isMobile && (
        <ControlGroup
          title="视图模式"
          icon="fa-solid fa-table-columns"
          tone="amber"
          status={VIEW_MODE_LABELS[viewMode]}
          statusTone="sky"
        >
          <div className="exp-option-switch" role="group" aria-label="视图模式" data-demo-id="viewMode">
            {(
              [
                ["compare", "对比", "fa-solid fa-table-columns", "#38bdf8"],
                ["transverse", "横波", "fa-solid fa-wave-square", "#67e8f9"],
                ["longitudinal", "纵波", "fa-solid fa-bars-staggered", "#c084fc"],
                ["overlay", "叠加", "fa-solid fa-layer-group", "#fbbf24"],
              ] as const
            ).map(([id, label, icon, iconColor]) => (
              <button
                key={id}
                type="button"
                className={`exp-option${viewMode === id ? " is-on" : ""}`}
                onClick={() => {
                  notifyUserEdit();
                  setViewMode(id);
                }}
                aria-pressed={viewMode === id}
              >
                <i className={icon} style={{ color: iconColor }} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </ControlGroup>
      )}

      <ControlGroup
        title="原理说明"
        icon="fa-solid fa-square-root-variable"
        tone="pink"
        status="动态同步"
      >
        <div className="exp-theory">
          <div className="exp-theory__row">
            <span className="exp-theory__label">横波（位移垂直传播方向）：</span>
            <span className="exp-theory__eq">y = A sin(kx − ωt)</span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">纵波（压缩沿传播方向）：</span>
            <span className="exp-theory__eq">Δx = A sin(kx − ωt)</span>
          </div>
          <div className="exp-theory__dp">
            <span>v = λf</span>
            <strong>{data ? `${data.waveSpeed.toFixed(1)} m/s` : "—"}</strong>
          </div>
          {selectedSide && particleHistory.length > 1 ? (
            <div>
              <p className="exp-theory__note" style={{ marginBottom: 4 }}>
                {selectedSide === "transverse" ? "质点位移 y(t)" : "质点压缩度 ρ(t)"}
              </p>
              <Sparkline
                values={particleHistory}
                color={selectedSide === "transverse" ? "#c084fc" : "#f59e0b"}
              />
            </div>
          ) : (
            <p className="exp-theory__note">点击场景中的质点可查看位移/压缩度时序。</p>
          )}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/wave-mechanics/details">进入实验原理</DetailsLinkButton>
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        时间: { value: data.time, unit: "s", color: "#67e8f9", decimals: 2 },
        频率: { value: data.frequency, unit: "Hz", color: "#38bdf8", decimals: 1 },
        波长: { value: data.wavelength, unit: "m", color: "#34d399", decimals: 2 },
        波速: { value: data.waveSpeed, unit: "m/s", color: "#fbbf24", decimals: 1 },
        波数k: { value: data.k, unit: "rad/m", color: "#c084fc", decimals: 2 },
        角频率ω: { value: data.omega, unit: "rad/s", color: "#f472b6", decimals: 2 },
        横波ymax: { value: data.transverseYMax, unit: "m", color: "#7dd3fc", decimals: 2 },
        横波ymin: { value: data.transverseYMin, unit: "m", color: "#c084fc", decimals: 2 },
        纵波ρmax: { value: data.longitudinalRhoMax, unit: "", color: "#f59e0b", decimals: 2 },
        纵波ρmin: { value: data.longitudinalRhoMin, unit: "", color: "#f9a8d4", decimals: 2 },
      }}
    />
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="横波与纵波"
        description="左右分屏对比横波与纵波的传播与振动差异"
        experimentRoute="wave-mechanics"
        cameraPosition={[0, 8, 18]}
        backgroundColor="#000000"
        enableFog={false}
        consoleSubtitle="调节频率、振幅与波长"
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
        <WaveMechanicsSceneComponent
          frequency={frequency}
          amplitude={amplitude}
          wavelength={wavelength}
          medium="rope"
          viewMode={effectiveViewMode}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
          isMobile={isMobile}
          focusTarget={focusTarget}
          selectedParticle={null}
          onDataChange={onDataChange}
          onParticleHistory={(side, vals) => {
            setParticleHistory(vals);
            setSelectedSide(side);
          }}
          onFocusComplete={() => setFocusTarget(null)}
          onRequestFocus={(target) => setFocusTarget(target)}
        />
      </ExperimentContainer>

      {isMobile && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex gap-1 glass rounded-lg p-1"
          data-demo-id="viewMode"
        >
          {(
            [
              ["transverse", "横波"],
              ["longitudinal", "纵波"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                notifyUserEdit();
                setMobileTab(id);
              }}
              className={`px-4 py-2 text-xs rounded-md ${
                mobileTab === id ? "bg-cyan-600/40 text-white" : "text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
