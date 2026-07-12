"use client";

import { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { ArrowLeft, Settings, BarChart3 } from "lucide-react";
import * as THREE from "three";

function CanvasResizeHandler() {
  const { gl, camera } = useThree();

  useEffect(() => {
    const handleResize = () => {
      gl.setSize(window.innerWidth, window.innerHeight);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [gl, camera]);

  return null;
}

export interface SimulationBarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export interface ExperimentContainerProps {
  children: ReactNode;
  title: string;
  description?: string;
  controls?: ReactNode;
  dataPanel?: ReactNode;
  details?: ReactNode;
  cameraPosition?: [number, number, number];
  enableFog?: boolean;
  backgroundColor?: string;
  toneMappingExposure?: number;
  simulationBar?: SimulationBarProps;
}

export function ExperimentContainer({
  children,
  title,
  description,
  controls,
  dataPanel,
  details,
  cameraPosition = [10, 7, 10],
  enableFog = true,
  backgroundColor = "#000000",
  toneMappingExposure = 1.2,
  simulationBar,
}: ExperimentContainerProps) {
  const [showControls, setShowControls] = useState(true);
  const [showData, setShowData] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();

    const handleResize = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(checkDevice, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimeoutRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasRef.current) {
          canvasRef.current.style.width = `${width}px`;
          canvasRef.current.style.height = `${height}px`;
          window.dispatchEvent(new Event("resize"));
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => { resizeObserver.disconnect(); };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const [canRender, setCanRender] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w > 0 && h > 0) setCanRender(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!canRender) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full overflow-hidden" style={{ background: backgroundColor }}>
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
        resize={{ debounce: 0, scroll: false }}
      >
        <CanvasResizeHandler />
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
          enablePan={true}
          panSpeed={isMobile ? 0.8 : 0.5}
          rotateSpeed={isMobile ? 0.8 : 1}
          zoomSpeed={isMobile ? 1.0 : 1.2}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />

        {/* Enhanced Lighting */}
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

        {enableFog && (
          <fog attach="fog" args={[backgroundColor, 120, 350]} />
        )}

        <group>{children}</group>
      </Canvas>

      <div className="absolute top-0 left-0 right-0 z-10 bg-black/90 border-b border-[#45454f] backdrop-blur-sm">
        <div className="page-shell flex items-center gap-3 py-3">
          <button
            onClick={() => router.push("/")}
            className="btn-ghost !min-h-[36px] !py-2 !px-4 !text-[11px] shrink-0"
          >
            <ArrowLeft size={14} className="sm:mr-1" />
            <span className="hidden sm:inline">返回</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white truncate">
              {title}
            </h1>
            {description && (
              <p className="text-[11px] text-[#5a5a5f] mt-0.5 hidden sm:block truncate uppercase tracking-wide">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className={`
        absolute top-16 sm:top-20 right-2 sm:right-4 z-20
        flex flex-row sm:flex-col gap-1 sm:gap-2
      `}>
        {controls && (
          <button
            onClick={() => setShowControls(!showControls)}
            className={`
              px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider border transition-colors
              ${showControls
                ? "border-white text-white bg-white/10"
                : "border-[#45454f] text-[#f0f0fa] bg-black/60 hover:border-white"}
            `}
          >
            <Settings size={14} className="hidden sm:inline" />
            {showControls ? "✓" : ""} <span className="hidden sm:inline">Controls</span>
          </button>
        )}
        {dataPanel && (
          <button
            onClick={() => setShowData(!showData)}
            className={`
              px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider border transition-colors
              ${showData
                ? "border-white text-white bg-white/10"
                : "border-[#45454f] text-[#f0f0fa] bg-black/60 hover:border-white"}
            `}
          >
            <BarChart3 size={14} className="hidden sm:inline" />
            {showData ? "✓" : ""} <span className="hidden sm:inline">Data</span>
          </button>
        )}
      </div>

      {/* Controls Panel */}
      {controls && showControls && (
        <div
          className="absolute top-0 right-0 z-30 h-full w-full sm:w-80 md:w-96 sx-overlay border-l border-[#62626e] overflow-y-auto text-white"
          style={{ WebkitOverflowScrolling: "touch", maxHeight: "100vh" }}
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 sx-overlay-header py-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">控制</h2>
              <button onClick={() => setShowControls(false)} className="text-[#5a5a5f] hover:text-white transition-colors text-xl p-1">✕</button>
            </div>
            {controls}
          </div>
        </div>
      )}

      {/* Data Panel */}
      {dataPanel && showData && (
        <div className={`
          absolute bottom-16 sm:bottom-20 left-2 sm:left-4 z-20
          sx-overlay
          border border-[#62626e]
          p-2 sm:p-4 max-w-full sm:max-w-sm text-white
          ${isMobile ? "max-h-[40vh] overflow-y-auto" : ""}
        `}>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-[#45454f]">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">实时数据</h3>
          </div>
          {dataPanel}
        </div>
      )}

      {/* Details Panel */}
      {details && showDetails && (
        <div className="absolute top-20 right-4 z-40 w-80 sm:w-96 max-h-[70vh] sx-overlay overflow-hidden text-white">
          <div className="sticky top-0 sx-overlay-header p-3 sm:p-4 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider">实验详情</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-[#5a5a5f] hover:text-white text-lg transition-colors p-1"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(70vh-60px)] text-sm text-[#e8e8f0]/90">
            {details}
          </div>
        </div>
      )}

      {/* FLOATING SIMULATION BAR */}
      {simulationBar && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3 sx-overlay rounded-full px-3 sm:px-5 py-2 sm:py-2.5">
          <button
            onClick={simulationBar.onPlayPause}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-white text-white text-sm hover:bg-white hover:text-black transition-colors"
            title={simulationBar.isPlaying ? "Pause" : "Play"}
          >
            {simulationBar.isPlaying ? "⏸" : "▶"}
          </button>

          <button
            onClick={simulationBar.onReset}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-[#45454f] text-white text-sm hover:border-white transition-colors"
            title="Reset"
          >
            🔄
          </button>

          <div className="w-px h-6 bg-[#45454f]" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] text-[#5a5a5f] hidden sm:inline uppercase tracking-wider">速度</span>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={simulationBar.speed}
              onChange={(e) => simulationBar.onSpeedChange(parseFloat(e.target.value))}
              className="w-16 sm:w-24 h-1 bg-[#45454f] rounded-full appearance-none cursor-pointer touch-none"
              style={{ accentColor: "#ffffff" }}
            />
            <span className="text-xs font-mono text-white min-w-10 text-center">
              {simulationBar.speed.toFixed(1)}x
            </span>
          </div>
        </div>
      )}

      {/* Instructions hint */}
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-10 text-[10px] text-[#5a5a5f] uppercase tracking-wider hidden sm:block">
        <span>拖拽旋转 · 滚轮缩放 · 右键平移</span>
      </div>
    </div>
  );
}

export default ExperimentContainer;
