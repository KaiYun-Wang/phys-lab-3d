"use client";

import {
  useState,
  useRef,
  useEffect,
  ReactNode,
  useCallback,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { ArrowLeft } from "lucide-react";
import * as THREE from "three";
import { CommentsPanel } from "./CommentsPanel";
import { fetchExperiment } from "@/lib/api";

const LEFT_W_KEY = "physlab.rail.leftWidth";
const RIGHT_W_KEY = "physlab.rail.rightWidth";
const DEFAULT_W = 340;
const MIN_W = 240;

function maxW() {
  if (typeof window === "undefined") return 560;
  return Math.min(560, Math.floor(window.innerWidth * 0.45));
}

function clampW(n: number) {
  return Math.max(MIN_W, Math.min(maxW(), n));
}

function readStoredWidth(key: string) {
  if (typeof window === "undefined") return DEFAULT_W;
  const raw = localStorage.getItem(key);
  const n = raw ? parseFloat(raw) : DEFAULT_W;
  return Number.isFinite(n) ? clampW(n) : DEFAULT_W;
}

function CanvasResizeHandler({ suspend }: { suspend: boolean }) {
  const { gl, camera, size } = useThree();
  const lastSize = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (suspend) return;
    const w = Math.max(1, Math.floor(size.width));
    const h = Math.max(1, Math.floor(size.height));
    if (w === lastSize.current.w && h === lastSize.current.h) return;
    lastSize.current = { w, h };
    // updateStyle=false：只改 drawing buffer，避免和 CSS 布局互相抢
    gl.setSize(w, h, false);
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }, [gl, camera, size.width, size.height, suspend]);

  return null;
}

export interface SimulationBarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  timeElapsed?: number;
}

export interface ExperimentContainerProps {
  children: ReactNode;
  title: string;
  description?: string;
  controls?: ReactNode;
  dataPanel?: ReactNode;
  details?: ReactNode;
  experimentRoute?: string;
  cameraPosition?: [number, number, number];
  enableFog?: boolean;
  backgroundColor?: string;
  toneMappingExposure?: number;
  simulationBar?: SimulationBarProps;
}

type RightPanel = "data" | "comments" | null;

export function ExperimentContainer({
  children,
  title,
  description,
  controls,
  dataPanel,
  experimentRoute,
  cameraPosition = [10, 7, 10],
  enableFog = true,
  backgroundColor = "#000000",
  toneMappingExposure = 1.2,
  simulationBar,
}: ExperimentContainerProps) {
  const [leftOpen, setLeftOpen] = useState(!!controls);
  const [rightPanel, setRightPanel] = useState<RightPanel>(dataPanel ? "data" : null);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_W);
  const [rightWidth, setRightWidth] = useState(DEFAULT_W);
  const [commentCount, setCommentCount] = useState(0);
  const [experimentId, setExperimentId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const [resizing, setResizing] = useState<"left" | "right" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragRef = useRef({ startX: 0, startW: 0, currentW: 0 });
  const router = useRouter();

  const rightOpen = rightPanel !== null;

  useEffect(() => {
    setLeftWidth(readStoredWidth(LEFT_W_KEY));
    setRightWidth(readStoredWidth(RIGHT_W_KEY));
  }, []);

  useEffect(() => {
    if (!experimentRoute) return;
    fetchExperiment(experimentRoute)
      .then((exp) => {
        setExperimentId(exp.id);
        setCommentCount(exp.commentCount ?? 0);
      })
      .catch(() => {
        setExperimentId(null);
      });
  }, [experimentRoute]);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setNarrow(width < 900);
      if (width > 0 && window.innerHeight > 0) setCanRender(true);
    };
    check();
    const onResize = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(check, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(resizeTimeoutRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 把侧栏占位同步给全局 AI 气泡，避免与左右栏重合
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ai-dock-left", leftOpen ? `${leftWidth}px` : "0px");
    root.style.setProperty("--ai-dock-right", rightOpen ? `${rightWidth}px` : "0px");
    return () => {
      root.style.setProperty("--ai-dock-left", "0px");
      root.style.setProperty("--ai-dock-right", "0px");
    };
  }, [leftOpen, rightOpen, leftWidth, rightWidth]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (rightPanel) setRightPanel(null);
      else if (leftOpen) setLeftOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leftOpen, rightPanel]);

  const persistWidth = useCallback((side: "left" | "right", w: number) => {
    const clamped = clampW(w);
    if (side === "left") {
      setLeftWidth(clamped);
      localStorage.setItem(LEFT_W_KEY, String(clamped));
    } else {
      setRightWidth(clamped);
      localStorage.setItem(RIGHT_W_KEY, String(clamped));
    }
  }, []);

  const onResizePointerDown = (side: "left" | "right") => (e: ReactPointerEvent) => {
    if (side === "left" && !leftOpen) return;
    if (side === "right" && !rightOpen) return;
    e.preventDefault();
    const startW = side === "left" ? leftWidth : rightWidth;
    dragRef.current = { startX: e.clientX, startW, currentW: startW };
    setResizing(side);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const next =
        resizing === "left"
          ? clampW(dragRef.current.startW + dx)
          : clampW(dragRef.current.startW - dx);
      dragRef.current.currentW = next;
      if (resizing === "left") setLeftWidth(next);
      else setRightWidth(next);
    };
    const onUp = () => {
      persistWidth(resizing, dragRef.current.currentW);
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizing, persistWidth]);

  const toggleRight = (panel: "data" | "comments") => {
    setRightPanel((cur) => (cur === panel ? null : panel));
  };

  if (!canRender) return null;

  const shellStyle = {
    ["--panel-w-left" as string]: `${leftWidth}px`,
    ["--panel-w-right" as string]: `${rightWidth}px`,
  };

  return (
    <div
      className={`exp-shell${leftOpen ? " open-left" : ""}${rightOpen ? " open-right" : ""}${
        resizing ? " is-resizing" : ""
      }${narrow ? " is-narrow" : ""}`}
      style={{ ...shellStyle, background: backgroundColor }}
    >
      {/* LEFT RAIL */}
      <aside className="exp-rail exp-rail-left" aria-hidden={!leftOpen}>
        <div
          className={`exp-rail-resizer${resizing === "left" ? " active" : ""}`}
          onPointerDown={onResizePointerDown("left")}
          onDoubleClick={() => persistWidth("left", DEFAULT_W)}
          title="拖动调整宽度"
        />
        <div className="exp-rail-inner">
          <div className="exp-rail-header">
            <div>
              <h2>控制</h2>
              <div className="exp-rail-meta">调节实验参数</div>
            </div>
            <button
              type="button"
              className="exp-icon-btn"
              onClick={() => setLeftOpen(false)}
              aria-label="关闭控制"
            >
              ✕
            </button>
          </div>
          <div className="exp-panel-scroll">{controls}</div>
        </div>
      </aside>

      {/* MAIN */}
      <section ref={mainRef} className="exp-main">
        <Canvas
          ref={canvasRef}
          shadows
          gl={{
            antialias: !isMobile,
            alpha: true,
            powerPreference: "high-performance",
            outputColorSpace: THREE.SRGBColorSpace,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure,
          }}
          dpr={isMobile ? 0.75 : [1, 1.5]}
          className="w-full h-full block touch-none"
          style={{ touchAction: "none" }}
          resize={{ debounce: 100, scroll: false }}
        >
          <CanvasResizeHandler suspend={resizing != null} />
          <PerspectiveCamera
            makeDefault
            position={cameraPosition}
            fov={isMobile ? 55 : isTablet ? 50 : 50}
            near={0.1}
            far={1000}
          />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={100}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={0}
            target={[0, 0, 0]}
            enablePan
            panSpeed={isMobile ? 0.8 : 0.5}
            rotateSpeed={isMobile ? 0.8 : 1}
            zoomSpeed={isMobile ? 1.0 : 1.2}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
          />
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[15, 25, 15]}
            intensity={2.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={150}
            shadow-camera-left={-75}
            shadow-camera-right={75}
            shadow-camera-top={75}
            shadow-camera-bottom={-75}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-15, 15, -15]} intensity={1.0} color="#ffffff" />
          <hemisphereLight args={["#ffffff", "#0a0a0a", 0.6]} />
          {enableFog && <fog attach="fog" args={[backgroundColor, 120, 350]} />}
          <group>{children}</group>
        </Canvas>

        <header className="exp-topbar">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-ghost !min-h-[36px] !py-2 !px-4 !text-[11px] shrink-0"
          >
            <ArrowLeft size={14} className="sm:mr-1" />
            <span className="hidden sm:inline">返回</span>
          </button>
          <div className="exp-topbar-title">
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
        </header>

        {controls && (
          <div className="exp-float-stack left">
            <button
              type="button"
              className={`exp-chip${leftOpen ? " active" : ""}`}
              onClick={() => setLeftOpen((v) => !v)}
            >
              控制
            </button>
          </div>
        )}

        <div className="exp-float-stack right">
          {dataPanel && (
            <button
              type="button"
              className={`exp-chip${rightPanel === "data" ? " active" : ""}`}
              onClick={() => toggleRight("data")}
            >
              数据
            </button>
          )}
          {experimentRoute && (
            <button
              type="button"
              className={`exp-chip${rightPanel === "comments" ? " active" : ""}`}
              onClick={() => toggleRight("comments")}
            >
              评论
              {commentCount > 0 && <span className="exp-badge">{commentCount}</span>}
            </button>
          )}
        </div>

        {simulationBar && (
          <div className="exp-sim-bar">
            <button
              type="button"
              onClick={simulationBar.onPlayPause}
              className="exp-sim-btn"
              title={simulationBar.isPlaying ? "Pause" : "Play"}
            >
              {simulationBar.isPlaying ? "⏸" : "▶"}
            </button>
            <button type="button" onClick={simulationBar.onReset} className="exp-sim-btn muted" title="Reset">
              ↺
            </button>
            <span className="exp-sim-sep" />
            <span className="exp-sim-label">速度</span>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={simulationBar.speed}
              onChange={(e) => simulationBar.onSpeedChange(parseFloat(e.target.value))}
              className="exp-sim-range"
            />
            <span className="exp-sim-speed">{simulationBar.speed.toFixed(1)}x</span>
          </div>
        )}

        <div className="exp-sim-hint">拖拽旋转 · 滚轮缩放 · 右键平移</div>
      </section>

      {/* RIGHT RAIL */}
      <aside className="exp-rail exp-rail-right" aria-hidden={!rightOpen}>
        <div
          className={`exp-rail-resizer${resizing === "right" ? " active" : ""}`}
          onPointerDown={onResizePointerDown("right")}
          onDoubleClick={() => persistWidth("right", DEFAULT_W)}
          title="拖动调整宽度"
        />
        <div className="exp-rail-inner">
          <div className="exp-rail-header">
            <div>
              <h2>{rightPanel === "comments" ? "评论" : "数据"}</h2>
              <div className="exp-rail-meta">
                {rightPanel === "comments"
                  ? `${commentCount} 条讨论 · ${title}`
                  : `实时读数 · ${title}`}
              </div>
            </div>
            <button
              type="button"
              className="exp-icon-btn"
              onClick={() => setRightPanel(null)}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          {rightPanel === "data" && dataPanel && (
            <div className="exp-panel-scroll">
              <div className="exp-data-live">
                <span className="exp-data-dot" />
                实时数据
              </div>
              {dataPanel}
            </div>
          )}

          {rightPanel === "comments" && experimentId != null && (
            <CommentsPanel
              experimentId={experimentId}
              onCountChange={(delta) =>
                setCommentCount((n) => Math.max(0, n + delta))
              }
            />
          )}
          {rightPanel === "comments" && experimentId == null && (
            <div className="exp-panel-scroll">
              <p className="text-sm text-[#8a8a96]">评论暂不可用</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default ExperimentContainer;
