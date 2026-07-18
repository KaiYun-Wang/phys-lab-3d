"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WaveMechanicsSceneComponent } from "@/experiments/wave-mechanics-scene";
import type { WaveSnapshot, ViewMode } from "@/experiments/wave-mechanics/shared-wave-utils";
import { calculateWaveSpeed } from "@/utils/physics";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  DataGrid,
  DetailsLinkButton,
} from "@/components/experiment-ui";

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

function OnboardingOverlay({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const messages = [
    { title: "这是横波", hint: "质点沿 Y 方向振动，垂直于传播方向 →" },
    { title: "这是纵波", hint: "质点沿 X 方向疏密振动，平行于传播方向 →" },
    { title: "拖动频率滑块", hint: "调节 f，观察两侧波形同步变化" },
  ];
  const msg = messages[step] ?? messages[0];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/70"
        style={{
          clipPath:
            step === 0
              ? "polygon(45% 0, 100% 0, 100% 100%, 45% 100%)"
              : step === 1
                ? "polygon(0 0, 55% 0, 55% 100%, 0 100%)"
                : "polygon(0 0, 100% 0, 100% 55%, 0 55%)",
        }}
      />
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 glass rounded-xl p-6 max-w-md text-center border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-2">{msg.title}</h3>
        <p className="text-sm text-gray-300 mb-4">{msg.hint}</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            跳过
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
          >
            {step >= 2 ? "开始探索" : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaveMechanicsPage() {
  const [data, setData] = useState<WaveSnapshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [resetFlash, setResetFlash] = useState(false);

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
  const [onboardStep, setOnboardStep] = useState<number | null>(null);

  const waveSpeed = calculateWaveSpeed(frequency, wavelength);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setOnboardStep(0);
    setSimulationSpeed(0.35);
  }, []);

  const effectiveViewMode: ViewMode = useMemo(() => {
    if (!isMobile) return viewMode;
    return mobileTab === "transverse" ? "transverse" : "longitudinal";
  }, [isMobile, viewMode, mobileTab]);

  const handleWaveSpeedChange = useCallback(
    (v: number) => {
      if (frequency > 0) setWavelength(v / frequency);
    },
    [frequency]
  );

  const handlePlayPause = () => setIsPlaying((p) => !p);

  const handleReset = () => {
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(1);
    setResetFlash(true);
    setTimeout(() => setResetFlash(false), 500);
    setParticleHistory([]);
    setSelectedSide(null);
  };

  useEffect(() => {
    if (onboardStep === 0) {
      setViewMode("compare");
      if (isMobile) setMobileTab("transverse");
    } else if (onboardStep === 1) {
      setViewMode("compare");
      if (isMobile) setMobileTab("longitudinal");
    }
  }, [onboardStep, isMobile]);

  const startOnboarding = useCallback(() => {
    setOnboardStep(0);
    setSimulationSpeed(0.35);
    setViewMode("compare");
    setMobileTab("transverse");
  }, []);

  const finishOnboarding = useCallback(() => {
    setOnboardStep(null);
    setSimulationSpeed(1);
  }, []);

  const handleOnboardNext = () => {
    if (onboardStep == null) return;
    if (onboardStep >= 2) finishOnboarding();
    else setOnboardStep(onboardStep + 1);
  };

  const parameterControls = (
    <div className="space-y-4 pb-1">
      <ControlGroup title="波动参数">
        <ControlSlider
          label="频率 f"
          value={frequency}
          unit="Hz"
          min={0.5}
          max={4}
          step={0.1}
          color="#4f8fff"
          onChange={setFrequency}
          decimals={1}
        />
        <ControlSlider
          label="振幅 A"
          value={amplitude}
          unit=""
          min={0.2}
          max={2}
          step={0.1}
          color="#8b5cf6"
          onChange={setAmplitude}
          decimals={1}
        />
        <ControlSlider
          label="波长 λ"
          value={wavelength}
          unit="m"
          min={2}
          max={8}
          step={0.25}
          color="#06d6a0"
          onChange={setWavelength}
          decimals={2}
        />
        <ControlSlider
          label="波速 v"
          value={waveSpeed}
          unit="m/s"
          min={1}
          max={32}
          step={0.5}
          color="#06d6a0"
          onChange={handleWaveSpeedChange}
          decimals={1}
        />
      </ControlGroup>

      <ControlGroup title="帮助">
        <button
          type="button"
          onClick={startOnboarding}
          className="w-full py-2 text-xs rounded-lg border border-cyan-500/40 text-cyan-700 hover:bg-cyan-500/10"
        >
          重新观看教学引导
        </button>
      </ControlGroup>

      {!isMobile && (
        <ControlGroup title="视图模式">
          <motion.div
            className="grid grid-cols-2 gap-2"
            layout
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {(
              [
                ["compare", "对比"],
                ["transverse", "横波"],
                ["longitudinal", "纵波"],
                ["overlay", "叠加"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`py-2 text-xs rounded-lg border ${
                  viewMode === id
                    ? "border-white bg-white/15 text-white"
                    : "border-[#45454f] text-[#8a8a96] hover:border-[#62626e] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>
        </ControlGroup>
      )}

      <DetailsLinkButton href="/experiments/wave-mechanics/details">进入实验原理</DetailsLinkButton>
    </div>
  );

  const dataPanelContent = data ? (
    <div className="space-y-3">
      <DataGrid
        data={{
          时间: { value: data.time, unit: "s", color: "#06d6a0", decimals: 2 },
          频率: { value: data.frequency, unit: "Hz", color: "#4f8fff", decimals: 1 },
          波长: { value: data.wavelength, unit: "m", color: "#06d6a0", decimals: 2 },
          波速: { value: data.waveSpeed, unit: "m/s", color: "#06d6a0", decimals: 1 },
          波数k: { value: data.k, unit: "rad/m", color: "#8b5cf6", decimals: 2 },
          角频率ω: { value: data.omega, unit: "rad/s", color: "#8b5cf6", decimals: 2 },
          横波ymax: { value: data.transverseYMax, unit: "m", color: "#4f8fff", decimals: 2 },
          横波ymin: { value: data.transverseYMin, unit: "m", color: "#8b5cf6", decimals: 2 },
          纵波ρmax: { value: data.longitudinalRhoMax, unit: "", color: "#ff6b35", decimals: 2 },
          纵波ρmin: { value: data.longitudinalRhoMin, unit: "", color: "#ec4899", decimals: 2 },
        }}
        columns={2}
      />
      <div className="text-xs font-mono text-gray-400 border-t border-gray-700 pt-2 space-y-1">
        <p>横波：y = A sin(kx − ωt)</p>
        <p>纵波：Δx = A sin(kx − ωt)</p>
      </div>
      {selectedSide && particleHistory.length > 1 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">
            {selectedSide === "transverse" ? "质点位移 y(t)" : "质点压缩度 ρ(t)"}
          </p>
          <Sparkline
            values={particleHistory}
            color={selectedSide === "transverse" ? "#4f8fff" : "#ff6b35"}
          />
        </div>
      )}
    </div>
  ) : (
    <div className="text-center text-gray-500 text-sm py-8">正在初始化模拟…</div>
  );

  return (
    <>
      <ExperimentContainer
        title="横波与纵波"
        description="左右分屏对比横波与纵波的传播与振动差异"
        experimentRoute="wave-mechanics"
        cameraPosition={[0, 8, 18]}
        backgroundColor="#000000"
        enableFog={false}
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
          onDataChange={setData}
          onParticleHistory={(side, vals) => {
            setParticleHistory(vals);
            setSelectedSide(side);
          }}
          onFocusComplete={() => setFocusTarget(null)}
          onRequestFocus={(target) => setFocusTarget(target)}
        />
      </ExperimentContainer>

      {!isMobile && effectiveViewMode === "compare" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, #8b5cf6, transparent 30%, transparent 70%, #ff6b35)",
          }}
        />
      )}

      <AnimatePresence>
        {resetFlash && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-white z-[90] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {isMobile && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex gap-1 glass rounded-lg p-1">
          {(
            [
              ["transverse", "横波"],
              ["longitudinal", "纵波"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`px-4 py-2 text-xs rounded-md ${
                mobileTab === id ? "bg-cyan-600/40 text-white" : "text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {onboardStep != null && (
        <OnboardingOverlay
          step={onboardStep}
          onNext={handleOnboardNext}
          onSkip={finishOnboarding}
        />
      )}
    </>
  );
}
