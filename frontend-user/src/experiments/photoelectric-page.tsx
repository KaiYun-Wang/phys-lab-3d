"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  PhotoelectricSceneComponent,
  PhotoelectricData,
  PHOTO_MATERIALS,
  peMaterialById,
  waveColor,
  waveColorHex,
  rgbToHex,
} from "@/experiments/photoelectric-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  ControlPresetButtons,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

const DEFAULT_WAVELENGTH = 500;
const DEFAULT_INTENSITY = 60;
const DEFAULT_VOLTAGE = 0;
const DEFAULT_MATERIAL = "na";

interface Scenario {
  key: string;
  label: string;
  emoji: string;
  wavelengthNm: number;
  intensityPct: number;
  voltageV: number;
}

/** 典型场景：波长覆盖截止/激发，电压覆盖拦截/饱和 */
const SCENARIOS: Scenario[] = [
  { key: "red", label: "红光截止", emoji: "🔴", wavelengthNm: 660, intensityPct: 60, voltageV: 0 },
  { key: "uv", label: "紫外激发", emoji: "🟣", wavelengthNm: 255, intensityPct: 80, voltageV: 0 },
  { key: "reverse", label: "反向拦截", emoji: "🛑", wavelengthNm: 255, intensityPct: 80, voltageV: -3 },
  { key: "saturation", label: "饱和电流", emoji: "⚡", wavelengthNm: 255, intensityPct: 100, voltageV: 2 },
];

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 波长滑块轨道：UV 段由深紫平滑过渡到可见光谱，可见段颜色与场景光子一致 */
const UV_TRACK_START: [number, number, number] = [0.28, 0.1, 0.46];
const VISIBLE_NM = 380;

function spectrumTrackColor(nm: number): [number, number, number] {
  if (nm >= VISIBLE_NM) return waveColor(nm);
  const target = waveColor(VISIBLE_NM);
  const t = (nm - 200) / (VISIBLE_NM - 200);
  return [
    UV_TRACK_START[0] + (target[0] - UV_TRACK_START[0]) * t,
    UV_TRACK_START[1] + (target[1] - UV_TRACK_START[1]) * t,
    UV_TRACK_START[2] + (target[2] - UV_TRACK_START[2]) * t,
  ];
}

const WAVELENGTH_TRACK = (() => {
  const stops: string[] = [];
  for (let nm = 200; nm <= 750; nm += 10) {
    const [r, g, b] = spectrumTrackColor(nm);
    stops.push(`${rgbToHex(r, g, b)} ${(((nm - 200) / 550) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
})();

export default function PhotoelectricPage() {
  const [data, setData] = useState<PhotoelectricData | null>(null);
  const dataRef = useRef<PhotoelectricData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  const [wavelengthNm, setWavelengthNm] = useState(DEFAULT_WAVELENGTH);
  const [intensityPct, setIntensityPct] = useState(DEFAULT_INTENSITY);
  const [voltageV, setVoltageV] = useState(DEFAULT_VOLTAGE);
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL);

  const paramsRef = useRef({ wavelengthNm, intensityPct, voltageV, material: materialId });
  paramsRef.current = { wavelengthNm, intensityPct, voltageV, material: materialId };
  const userEditHandlerRef = useRef<(() => void) | null>(null);
  const demoApplyingRef = useRef(false);

  const notifyUserEdit = useCallback(() => {
    if (demoApplyingRef.current) return;
    userEditHandlerRef.current?.();
  }, []);

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    notifyUserEdit();
    setIsPlaying(true);
    setSimulationSpeed(1);
    setWavelengthNm(DEFAULT_WAVELENGTH);
    setIntensityPct(DEFAULT_INTENSITY);
    setVoltageV(DEFAULT_VOLTAGE);
    setMaterialId(DEFAULT_MATERIAL);
  };

  const onDataChange = useCallback((d: PhotoelectricData) => {
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
          photonEnergyEv: d.photonEnergyEv,
          workFunctionEv: d.workFunctionEv,
          maxKineticEv: d.maxKineticEv,
          stopVoltageV: d.stopVoltageV,
          thresholdNm: d.thresholdNm,
          currentUa: d.currentUa,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (params.wavelengthNm != null) {
            const v = clampNum(Number(params.wavelengthNm), 200, 750);
            setWavelengthNm(Math.round(v));
          }
          if (params.intensityPct != null) {
            setIntensityPct(Math.round(clampNum(Number(params.intensityPct), 0, 100)));
          }
          if (params.voltageV != null) {
            const v = clampNum(Number(params.voltageV), -5, 5);
            setVoltageV(Math.round(v * 10) / 10);
          }
          if (typeof params.material === "string" && PHOTO_MATERIALS.some((m) => m.id === params.material)) {
            setMaterialId(params.material);
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

  // 当前命中哪个典型场景（三项参数同时吻合）
  const activeScenario = useMemo(() => {
    const hit = SCENARIOS.find(
      (s) =>
        Math.abs(s.wavelengthNm - wavelengthNm) < 2.5 &&
        Math.abs(s.intensityPct - intensityPct) < 2 &&
        Math.abs(s.voltageV - voltageV) < 0.15,
    );
    return hit ? hit.key : "";
  }, [wavelengthNm, intensityPct, voltageV]);

  const applyScenario = (key: string | number) => {
    const s = SCENARIOS.find((x) => x.key === key);
    if (!s) return;
    notifyUserEdit();
    setWavelengthNm(s.wavelengthNm);
    setIntensityPct(s.intensityPct);
    setVoltageV(s.voltageV);
  };

  const material = peMaterialById(materialId);
  const waveHex = waveColorHex(wavelengthNm);
  const voltageColor = voltageV >= 0 ? "#53c3ff" : "#ff6b8a";

  const statusLine = useMemo(() => {
    if (!data) return null;
    if (data.emitting) {
      return `λ = ${data.wavelengthNm} nm：E = ${data.photonEnergyEv.toFixed(2)} eV；${data.materialName} φ = ${data.workFunctionEv.toFixed(2)} eV → Kmax = ${data.maxKineticEv.toFixed(2)} eV，Uc = ${data.stopVoltageV.toFixed(2)} V，I = ${data.currentUa.toFixed(2)} μA。`;
    }
    return `E = ${data.photonEnergyEv.toFixed(2)} eV < φ = ${data.workFunctionEv.toFixed(2)} eV：光子能量低于逸出功，无光电子逸出——增大光强也不会产生光电流，需换更短波长的光。`;
  }, [data]);

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="光源参数">
        <ControlSlider
          label="波长 λ"
          value={wavelengthNm}
          unit="nm"
          min={200}
          max={750}
          step={1}
          color={waveHex}
          trackBackground={WAVELENGTH_TRACK}
          onChange={(v) => {
            notifyUserEdit();
            setWavelengthNm(v);
          }}
          decimals={0}
          demoId="wavelengthNm"
        />
        <ControlSlider
          label="光强"
          value={intensityPct}
          unit="%"
          min={0}
          max={100}
          step={1}
          color="#fbbf24"
          onChange={(v) => {
            notifyUserEdit();
            setIntensityPct(v);
          }}
          decimals={0}
          demoId="intensityPct"
        />
      </ControlGroup>

      <ControlGroup title="光电材料（阴极 K）">
        <ControlPresetButtons
          label="材料"
          value={materialId}
          presets={PHOTO_MATERIALS.map((m) => ({ label: m.name, value: m.id }))}
          onChange={(value) => {
            notifyUserEdit();
            setMaterialId(String(value));
          }}
          displayValue={(v) => `φ = ${peMaterialById(String(v)).phi.toFixed(2)} eV`}
          demoId="material"
        />
      </ControlGroup>

      <ControlGroup title="极间电压">
        <ControlSlider
          label="电压 U"
          value={voltageV}
          unit="V"
          min={-5}
          max={5}
          step={0.1}
          color={voltageColor}
          onChange={(v) => {
            notifyUserEdit();
            setVoltageV(v);
          }}
          decimals={1}
          demoId="voltageV"
        />
        <ControlPresetButtons
          label="典型场景"
          value={activeScenario}
          presets={SCENARIOS.map((s) => ({ label: s.label, value: s.key, emoji: s.emoji }))}
          onChange={applyScenario}
          displayValue={() => ""}
          demoId="scenePreset"
        />
      </ControlGroup>

      <ControlGroup title="原理说明">
        <div className="space-y-2 text-xs text-[#8a8a96] leading-relaxed">
          <p>
            <strong className="text-[#e8e8f0]">光子能量：</strong>
            E = hν = 1239.84 / λ（eV·nm）
          </p>
          <p>
            <strong className="text-[#e8e8f0]">光电方程：</strong>
            Kmax = E − φ，只有 E &gt; φ 才能逸出光电子
          </p>
          <p>
            <strong className="text-[#e8e8f0]">截止电压：</strong>
            eUc = Kmax，反向电压达到 Uc 时光电流为零
          </p>
          <p>
            <strong className="text-[#e8e8f0]">极限波长：</strong>
            λ₀ = 1239.84 / φ，λ &gt; λ₀ 时无论光强多大都无逸出
          </p>
          <p>
            <strong className="text-[#e8e8f0]">饱和电流：</strong>
            与光强成正比，与电压无关（正向电压下）
          </p>
          {statusLine ? <p className="text-[#c4c4ce]">{statusLine}</p> : null}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/photoelectric/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        状态: {
          value: data.emitting ? "逸出发生" : "低于阈值·无光电子",
          color: data.emitting ? "#4ade80" : "#ff8fa6",
        },
        "光子能量 E": { value: data.photonEnergyEv, unit: "eV", color: waveHex, decimals: 2 },
        逸出功: { value: data.workFunctionEv, unit: "eV", color: "#f59e0b", decimals: 2 },
        "最大初动能 Kmax": {
          value: data.emitting ? data.maxKineticEv : "0.00",
          unit: "eV",
          color: "#4ade80",
          decimals: 2,
        },
        截止电压: {
          value: data.emitting ? data.stopVoltageV : "—",
          unit: data.emitting ? "V" : undefined,
          color: "#ff8fa6",
          decimals: 2,
        },
        极限波长: { value: data.thresholdNm, unit: "nm", color: "#22d3ee", decimals: 0 },
        光电流: { value: data.currentUa, unit: "μA", color: "#53c3ff", decimals: 2 },
      }}
    />
  ) : null;

  return (
    <ExperimentContainer
      title="光电效应"
      description="调节波长、光强与电压，观察光电子逸出与光电流的量子规律"
      experimentRoute="photoelectric"
      cameraPosition={[2, 6.4, 22]}
      enableFog={false}
      backgroundColor="#030616"
      toneMappingExposure={1.12}
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
      <PhotoelectricSceneComponent
        wavelengthNm={wavelengthNm}
        intensityPct={intensityPct}
        voltageV={voltageV}
        materialId={materialId}
        isPlaying={isPlaying}
        simulationSpeed={simulationSpeed}
        onDataChange={onDataChange}
      />
    </ExperimentContainer>
  );
}
