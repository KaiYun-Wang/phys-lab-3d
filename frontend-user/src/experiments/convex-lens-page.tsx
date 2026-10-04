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
  ControlCheckbox,
  ControlPresetButtons,
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
      { label: "照相机", value: presetU(3), emoji: "📷" },
      { label: "等大", value: presetU(2), emoji: "⚖️" },
      { label: "投影仪", value: presetU(1.5), emoji: "📽️" },
      { label: "放大镜", value: presetU(0.7), emoji: "🔍" },
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
      <ControlGroup title="光学参数">
        <ControlSlider
          label="焦距 f"
          value={fCm}
          unit="cm"
          min={6}
          max={16}
          step={0.1}
          color="#22d3ee"
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

      <ControlGroup title="成像场景">
        <ControlPresetButtons
          label="快速切换"
          value={uCm}
          presets={scenePresets}
          onChange={(value) => {
            notifyUserEdit();
            setUCm(Number(value));
          }}
          displayValue={() => ""}
          demoId="scenePreset"
        />
      </ControlGroup>

      <ControlGroup title="显示选项">
        <ControlCheckbox
          label="显示光路"
          checked={showRays}
          color="#4ade80"
          onChange={(checked) => {
            notifyUserEdit();
            setShowRays(checked);
          }}
        />
      </ControlGroup>

      <ControlGroup title="原理说明">
        <div className="space-y-2 text-xs text-[#8d90a0] leading-relaxed">
          <p>
            <strong className="text-[#dfe2f1]">薄透镜成像公式：</strong>
            1/f = 1/u + 1/v
          </p>
          <p>
            <strong className="text-[#dfe2f1]">像距：</strong>
            v = uf/(u − f)，虚像时 v 为负，像与物同侧
          </p>
          <p>
            <strong className="text-[#dfe2f1]">放大率：</strong>
            m = |v|/u = |h′|/h
          </p>
          <p>
            <strong className="text-[#dfe2f1]">规律：</strong>
            一倍焦距分虚实，二倍焦距分大小；物近像远像变大。
          </p>
          {statusLine ? <p className="text-[#c4c4ce]">{statusLine}</p> : null}
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
          color: data.kind === "real" ? "#7dd3fc" : "#c4b5fd",
        },
        物距: { value: data.uCm, unit: "cm", color: "#fbbf24", decimals: 1 },
        焦距: { value: data.fCm, unit: "cm", color: "#22d3ee", decimals: 1 },
        像距: {
          value: data.kind === "none" ? "∞" : data.vCm,
          unit: "cm",
          color: "#7dd3fc",
          decimals: 1,
        },
        放大率: {
          value: data.kind === "none" ? "—" : data.magnification,
          unit: "×",
          color: "#c4b5fd",
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
