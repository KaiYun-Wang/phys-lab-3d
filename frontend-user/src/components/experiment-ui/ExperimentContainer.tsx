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
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ArrowLeft, Crosshair, Maximize, Minimize, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import * as THREE from "three";
import { CommentsPanel } from "./CommentsPanel";
import { DemoPanel, type DemoAdapter, type DemoStageUi } from "@/components/demo/DemoPanel";
import { DemoSpotlight } from "@/components/demo/DemoSpotlight";
import { DemoCaptionBar } from "@/components/demo/DemoCaptionBar";
import { unlockMedia } from "@/lib/demoSpeech";
import AiChatWidget from "@/components/AiChatWidget";
import { fetchExperiment, type AiChatContext } from "@/lib/api";

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
  /**
   * 单帧步进。仅当实验场景真正支持定步长推进时才传：
   * 传了才渲染「单帧步进」按钮，避免出现按了没反应的假控件。
   */
  onStep?: () => void;
  /** 速度档位预设，默认 [0.5, 1, 2, 5] */
  speedPresets?: number[];
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
  /** 有适配器时右栏出现「对话 / AI 演示」 */
  demoAdapter?: DemoAdapter;
  /** 追加到对话上下文（参数快照等） */
  chatContext?: Partial<AiChatContext>;
  /** 左控制台标题下的副标题，默认用 description */
  consoleSubtitle?: string;
  /** 控制台右上角标识 chip，如 route 大写「VENTURI」 */
  consoleTag?: string;
  /** 左下角坐标系说明，如「绝对流场」 */
  coordinateSystem?: string;
  /** 左下角「恢复标准参数」的文案，传 null 隐藏 */
  resetLabel?: string | null;
}

type RightPanel = "chat" | "demo" | "comments" | null;

/** 在 Canvas 内注册「视角重置」能力（相机 + OrbitControls 都需复位） */
function CameraResetBinding({
  position,
  controlsRef,
  register,
}: {
  position: [number, number, number];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  register: (fn: (() => void) | null) => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const reset = () => {
      camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    };
    register(reset);
    return () => register(null);
  }, [camera, position, controlsRef, register]);

  return null;
}

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
  demoAdapter,
  chatContext,
  consoleSubtitle,
  consoleTag,
  coordinateSystem,
  resetLabel = "恢复标准参数",
}: ExperimentContainerProps) {
  const hasLeft = !!controls;
  const [leftOpen, setLeftOpen] = useState(hasLeft);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_W);
  const [rightWidth, setRightWidth] = useState(DEFAULT_W);
  const [commentCount, setCommentCount] = useState(0);
  const [experimentId, setExperimentId] = useState<number | null>(null);
  /** 顶栏面包屑用的学科名 */
  const [subjectLabel, setSubjectLabel] = useState<string | null>(null);
  const [webgl2, setWebgl2] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<number | null>(null);
  const [demoUi, setDemoUi] = useState<DemoStageUi>({
    highlightId: null,
    caption: "",
    captionLabel: "",
    voiceOn: true,
    canSkip: false,
    canPrev: false,
    nextLabel: "下一步 ›",
    prevLabel: "‹ 上一步",
  });
  const skipFnRef = useRef<(() => void) | null>(null);
  const prevFnRef = useRef<(() => void) | null>(null);
  const stopFnRef = useRef<(() => void) | null>(null);
  const pauseFnRef = useRef<(() => void) | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const [resizing, setResizing] = useState<"left" | "right" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragRef = useRef({ startX: 0, startW: 0, currentW: 0 });
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraResetRef = useRef<(() => void) | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  const registerCameraReset = useCallback((fn: (() => void) | null) => {
    cameraResetRef.current = fn;
  }, []);

  const resetView = useCallback(() => {
    cameraResetRef.current?.();
  }, []);

  // 全屏：只把主视口区域放大，左右栏保持
  const toggleFullscreen = useCallback(async () => {
    const el = mainRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* 用户拒绝或浏览器不支持时静默降级 */
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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
        setSubjectLabel(
          exp.subjectTypeLabel ?? exp.subjectType ?? null,
        );
      })
      .catch(() => {
        setExperimentId(null);
      });
  }, [experimentRoute]);

  // 顶栏的 WebGL2 能力徽章
  useEffect(() => {
    try {
      setWebgl2(!!document.createElement("canvas").getContext("webgl2"));
    } catch {
      setWebgl2(false);
    }
  }, []);

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

  const toggleRight = (panel: Exclude<RightPanel, null>) => {
    setRightPanel((cur) => (cur === panel ? null : panel));
  };

  const openDemo = (demoId: number) => {
    setActiveDemoId(demoId);
    setRightPanel("demo");
  };

  const railTitle =
    rightPanel === "chat" ? "对话" : rightPanel === "demo" ? "AI 演示" : "评论";
  const railMeta = rightPanel === "comments" ? `${commentCount} 条讨论 · ${title}` : null;

  const mergedChatContext: AiChatContext = {
    path: experimentRoute ? `/experiments/${experimentRoute}` : undefined,
    pageType: "experiment",
    experimentId: experimentId ?? undefined,
    experimentTitle: title,
    experimentRoute,
    ...chatContext,
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
            <div className="exp-rail-header__title">
              <h2>实验控制台</h2>
              {consoleTag && <span className="exp-rail-tag">{consoleTag}</span>}
              <div className="exp-rail-meta">
                {consoleSubtitle ?? description ?? "调节实验参数"}
              </div>
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
          {(coordinateSystem || resetLabel) && (
            <div className="exp-console-foot">
              {coordinateSystem ? (
                <span className="exp-console-coord">
                  <span className="exp-console-coord__badge" aria-hidden>
                    N
                  </span>
                  坐标系：{coordinateSystem}
                </span>
              ) : (
                <span />
              )}
              {resetLabel && (
                <button
                  type="button"
                  className="exp-console-reset"
                  onClick={simulationBar?.onReset}
                >
                  {resetLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <section ref={mainRef} className="exp-main">
        {/* 视口背景：光斑 + 透视网格（画布 alpha 透明，故需垫在下面） */}
        <div className="exp-viewport-bg" aria-hidden>
          <span className="exp-viewport-bg__glow exp-viewport-bg__glow--a" />
          <span className="exp-viewport-bg__glow exp-viewport-bg__glow--b" />
          <span className="exp-viewport-bg__grid" />
        </div>

        <div className="exp-canvas-layer">
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
          <CameraResetBinding
            position={cameraPosition}
            controlsRef={controlsRef}
            register={registerCameraReset}
          />
          <PerspectiveCamera
            makeDefault
            position={cameraPosition}
            fov={isMobile ? 55 : isTablet ? 50 : 50}
            near={0.1}
            far={1000}
          />
          <OrbitControls
            ref={controlsRef}
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
            screenSpacePanning
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
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
        </div>

        <header className="exp-topbar">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="exp-topbar-back"
            title="返回实验大厅"
          >
            <ArrowLeft size={14} aria-hidden />
            <span className="hidden sm:inline">返回大厅</span>
          </button>

          <div className="exp-topbar-title">
            {subjectLabel && (
              <nav className="exp-topbar-crumb" aria-label="位置">
                <a href="/" className="exp-topbar-crumb__link">
                  {subjectLabel}实验室
                </a>
                <span className="exp-topbar-crumb__sep" aria-hidden>
                  ›
                </span>
                <span className="exp-topbar-crumb__here">{title}</span>
              </nav>
            )}
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>

          <div className="exp-topbar-status">
            <span
              className={`exp-runstate${simulationBar?.isPlaying ? " is-live" : ""}`}
              title={simulationBar?.isPlaying ? "仿真正在运行" : "仿真已暂停"}
            >
              <span className="exp-runstate__dot" aria-hidden />
              {simulationBar?.isPlaying ? "仿真进行中" : "已暂停"}
            </span>
            {webgl2 && <span className="exp-topbar-badge">WebGL2</span>}
          </div>
        </header>

        {dataPanel ? <div className="exp-scene-hud">{dataPanel}</div> : null}

        {hasLeft && (
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
          {experimentRoute && (
            <button
              type="button"
              className={`exp-chip${rightPanel === "chat" ? " active" : ""}`}
              onClick={() => toggleRight("chat")}
            >
              对话
            </button>
          )}
          {demoAdapter && (
            <button
              type="button"
              className={`exp-chip${rightPanel === "demo" ? " active" : ""}`}
              onClick={() => toggleRight("demo")}
            >
              AI 演示
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
            {/* 单帧步进：仅在场景支持定步长推进时出现 */}
            {simulationBar.onStep && (
              <button
                type="button"
                onClick={simulationBar.onStep}
                className="exp-sim-btn"
                title="单帧前进一步（自动暂停）"
                aria-label="单帧步进"
              >
                <SkipForward size={14} aria-hidden />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                // Pausing the experiment also soft-pauses an active demo narration.
                if (simulationBar.isPlaying) pauseFnRef.current?.();
                simulationBar.onPlayPause();
              }}
              className="exp-sim-btn primary"
              title={simulationBar.isPlaying ? "暂停" : "播放"}
              aria-label={simulationBar.isPlaying ? "暂停" : "播放"}
            >
              {simulationBar.isPlaying ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
            </button>

            <button
              type="button"
              onClick={simulationBar.onReset}
              className="exp-sim-btn muted"
              title="重新播放 / 恢复初始状态"
              aria-label="重新播放"
            >
              <RotateCcw size={14} aria-hidden />
            </button>

            <span className="exp-sim-sep" />

            {/* 速度档位预设；「其他」时保留滑块微调 */}
            <div className="exp-speed-presets" role="group" aria-label="播放速度">
              {(simulationBar.speedPresets ?? [0.5, 1, 2, 5]).map((p) => {
                const on = Math.abs(simulationBar.speed - p) < 1e-9;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`exp-speed-preset${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => simulationBar.onSpeedChange(p)}
                  >
                    {p.toFixed(1)}x
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min="0.1"
              max={Math.max(...(simulationBar.speedPresets ?? [0.5, 1, 2, 5]))}
              step="0.1"
              value={simulationBar.speed}
              onChange={(e) => simulationBar.onSpeedChange(parseFloat(e.target.value))}
              className="exp-sim-range"
              aria-label="速度微调"
            />
            <span className="exp-sim-speed">{simulationBar.speed.toFixed(1)}x</span>

            <span className="exp-sim-sep" />

            <button
              type="button"
              onClick={resetView}
              className="exp-sim-btn muted"
              title="视角重置为默认中心"
              aria-label="重置视角"
            >
              <Crosshair size={14} aria-hidden />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="exp-sim-btn muted"
              title={isFullscreen ? "退出全屏" : "全屏视口"}
              aria-label={isFullscreen ? "退出全屏" : "全屏视口"}
            >
              {isFullscreen ? <Minimize size={14} aria-hidden /> : <Maximize size={14} aria-hidden />}
            </button>
          </div>
        )}

        <div className="exp-sim-hint">按住左键拖拽旋转 · 滚轮缩放 · 右键平移</div>
      </section>

      <DemoSpotlight demoId={demoUi.highlightId} />
      <DemoCaptionBar
        label={demoUi.captionLabel}
        text={demoUi.caption}
        visible={!!demoUi.caption}
        showPrev={demoUi.canPrev}
        showNext={demoUi.canSkip}
        nextLabel={demoUi.nextLabel}
        prevLabel={demoUi.prevLabel}
        onPrev={() => {
          unlockMedia();
          prevFnRef.current?.();
        }}
        onNext={() => {
          unlockMedia();
          skipFnRef.current?.();
        }}
        onStop={() => stopFnRef.current?.()}
      />

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
              <h2>{railTitle}</h2>
              {railMeta ? <div className="exp-rail-meta">{railMeta}</div> : null}
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

          {rightPanel === "chat" && (
            <div className="exp-rail-chat">
              <AiChatWidget
                mode="rail"
                contextOverride={mergedChatContext}
                onOpenDemo={demoAdapter ? openDemo : undefined}
                onClose={() => setRightPanel(null)}
              />
            </div>
          )}

          {demoAdapter && (
            <div className={`exp-panel-scroll${rightPanel === "demo" ? "" : " hidden"}`}>
              <DemoPanel
                adapter={{ ...demoAdapter, experimentId }}
                activeDemoId={activeDemoId}
                onActiveDemoChange={setActiveDemoId}
                onStageUi={setDemoUi}
                onEnsureLeftOpen={() => setLeftOpen(true)}
                onSkipReady={(fn) => {
                  skipFnRef.current = fn;
                }}
                onPrevReady={(fn) => {
                  prevFnRef.current = fn;
                }}
                onStopReady={(fn) => {
                  stopFnRef.current = fn;
                }}
                onPauseReady={(fn) => {
                  pauseFnRef.current = fn;
                }}
              />
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
              <p className="text-sm text-[#8d90a0]">评论暂不可用</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default ExperimentContainer;
