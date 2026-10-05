"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ConvexLensSceneComponent,
  ConvexLensData,
} from "@/experiments/convex-lens-scene";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  HudReadings,
  DetailsLinkButton,
} from "@/components/experiment-ui";
import type { DemoAdapter } from "@/components/demo/DemoPanel";

const DEFAULT_U = 30;
const DEFAULT_F = 10;

function zoneLabel(u: number, f: number): string {
  if (Math.abs(u - f) < 0.01) return "u = f（不成像）";
  if (u < f) return "u < f（放大镜）";
  if (Math.abs(u - 2 * f) < 0.01) return "u = 2f（等大）";
  if (u < 2 * f) return "f < u < 2f（投影仪）";
  return "u > 2f（照相机）";
}

export default function ConvexLensPage() {
  const [data, setData] = useState<ConvexLensData | null>(null);
  const dataRef = useRef<ConvexLensData | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  const [uCm, setUCm] = useState(DEFAULT_U);
  const [fCm, setFCm] = useState(DEFAULT_F);
  const [showRays, setShowRays] = useState(true);

  const paramsRef = useRef({ uCm, fCm, showRays });
  paramsRef.current = { uCm, fCm, showRays };
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
    setUCm(DEFAULT_U);
    setFCm(DEFAULT_F);
    setShowRays(true);
  };

  const onDataChange = useCallback((d: ConvexLensData) => {
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
          uCm: d.uCm,
          fCm: d.fCm,
          vCm: d.vCm,
          magnification: d.magnification,
        };
      },
      applyParams: (params) => {
        demoApplyingRef.current = true;
        try {
          if (typeof params.uCm === "number") setUCm(params.uCm);
          else if (params.uCm != null) setUCm(Number(params.uCm));
          if (typeof params.fCm === "number") setFCm(params.fCm);
          else if (params.fCm != null) setFCm(Number(params.fCm));
          if (typeof params.showRays === "boolean") setShowRays(params.showRays);
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

  // 预设物距按当前焦距计算并量化到 0.1 cm（与滑块步长一致）
  const presetU = useCallback(
    (k: number) => {
      const raw = Math.min(48, Math.max(3, k * fCm));
      return Math.round(raw * 10) / 10;
    },
    [fCm],
  );

  const scenePresets = useMemo(
    () => [
      { label: "照相机", value: presetU(3), icon: "fa-solid fa-camera", iconColor: "#38bdf8" },
      { label: "等大", value: presetU(2), icon: "fa-solid fa-scale-balanced", iconColor: "#34d399" },
      { label: "投影仪", value: presetU(1.5), icon: "fa-solid fa-film", iconColor: "#c084fc" },
      { label: "放大镜", value: presetU(0.7), icon: "fa-solid fa-magnifying-glass", iconColor: "#fbbf24" },
    ],
    [presetU],
  );

  const statusLine = useMemo(() => {
    if (!data) return null;
    if (data.kind === "none") {
      return `u = ${data.uCm.toFixed(1)} cm = f：物体在焦点上，出射光平行，不成像。`;
    }
    const zone = zoneLabel(data.uCm, data.fCm);
    const nature =
      data.kind === "real"
        ? `${data.orientation}、${data.sizeRelation}的实像（与物异侧）`
        : `${data.orientation}、${data.sizeRelation}的虚像（与物同侧）`;
    return `u = ${data.uCm.toFixed(1)} cm，f = ${data.fCm.toFixed(1)} cm → ${zone}：成${nature}。`;
  }, [data]);

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup
        title="光学参数"
        icon="fa-solid fa-glasses"
        status="实时计算就绪"
      >
        <ControlSlider
          label="焦距 f"
          value={fCm}
          unit="cm"
          min={6}
          max={16}
          step={0.1}
          color="#38bdf8"
          onChange={(v) => {
            notifyUserEdit();
            setFCm(v);
          }}
          decimals={1}
          demoId="fCm"
        />
        <ControlSlider
          label="物距 u"
          value={uCm}
          unit="cm"
          min={3}
          max={48}
          step={0.1}
          color="#fbbf24"
          onChange={(v) => {
            notifyUserEdit();
            setUCm(v);
          }}
          decimals={1}
          demoId="uCm"
        />
      </ControlGroup>

      <ControlGroup
        title="成像场景"
        icon="fa-solid fa-camera"
        tone="amber"
        status={data ? zoneLabel(data.uCm, data.fCm) : "快速切换"}
        statusTone={data ? "sky" : "muted"}
      >
        <div className="exp-option-switch" role="group" aria-label="成像场景" data-demo-id="scenePreset">
          {scenePresets.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`exp-option${Math.abs(uCm - p.value) < 0.05 ? " is-on" : ""}`}
              onClick={() => {
                notifyUserEdit();
                setUCm(Number(p.value));
              }}
              aria-pressed={Math.abs(uCm - p.value) < 0.05}
            >
              <i className={p.icon} style={{ color: p.iconColor }} aria-hidden />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </ControlGroup>

      <ControlGroup
        title="显示选项"
        icon="fa-solid fa-eye"
        tone="emerald"
        status={showRays ? "光路已显示" : "光路已隐藏"}
        statusTone={showRays ? "emerald" : "muted"}
      >
        <label className="exp-switch-row">
          <span className="exp-switch-row__label">
            <i className="fa-solid fa-bezier-curve" style={{ color: "#34d399" }} aria-hidden />
            显示光路
          </span>
          <input
            type="checkbox"
            checked={showRays}
            onChange={(e) => {
              notifyUserEdit();
              setShowRays(e.target.checked);
            }}
          />
          <span className="exp-switch" aria-hidden />
        </label>
      </ControlGroup>

      <ControlGroup
        title="原理说明"
        icon="fa-solid fa-square-root-variable"
        tone="pink"
        status="动态同步"
      >
        <div className="exp-theory">
          <div className="exp-theory__row">
            <span className="exp-theory__label">薄透镜成像公式：</span>
            <span className="exp-theory__eq">1/f = 1/u + 1/v</span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">像距与放大率：</span>
            <span className="exp-theory__eq">v = uf/(u − f) · m = |v|/u，虚像时 v 为负</span>
          </div>
          <div className="exp-theory__row">
            <span className="exp-theory__label">规律：</span>
            <span className="exp-theory__eq exp-theory__eq--amber">一倍焦距分虚实，二倍焦距分大小；物近像远像变大</span>
          </div>
          <div className="exp-theory__dp">
            <span>m = |v| / u</span>
            <strong>{data && data.kind !== "none" ? `${data.magnification.toFixed(2)} ×` : "—"}</strong>
          </div>
          {statusLine ? <p className="exp-theory__note">{statusLine}</p> : null}
        </div>
      </ControlGroup>

      <DetailsLinkButton href="/experiments/convex-lens/details" />
    </div>
  );

  const hud = data ? (
    <HudReadings
      data={{
        成像: {
          value:
            data.kind === "none"
              ? "不成像"
              : `${data.orientation}·${data.sizeRelation}·${data.kind === "real" ? "实像" : "虚像"}`,
          color: data.kind === "real" ? "#34d399" : "#c084fc",
        },
        物距: { value: data.uCm, unit: "cm", color: "#fbbf24", decimals: 1 },
        焦距: { value: data.fCm, unit: "cm", color: "#38bdf8", decimals: 1 },
        像距: {
          value: data.kind === "none" ? "∞" : data.vCm,
          unit: "cm",
          color: "#67e8f9",
          decimals: 1,
        },
        放大率: {
          value: data.kind === "none" ? "—" : data.magnification,
          unit: "×",
          color: "#c084fc",
          decimals: 2,
        },
      }}
    />
  ) : null;

  return (
    <ExperimentContainer
      title="凸透镜成像"
      description="调节物距与焦距，在 3D 光路中观察成像规律与像距变化"
      experimentRoute="convex-lens"
      cameraPosition={[10, 9, 15]}
      backgroundColor="#000000"
      consoleSubtitle="调节物距与焦距，观察成像规律"
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
      <ConvexLensSceneComponent
        uCm={uCm}
        fCm={fCm}
        showRays={showRays}
        isPlaying={isPlaying}
        simulationSpeed={simulationSpeed}
        onDataChange={onDataChange}
      />
    </ExperimentContainer>
  );
}
