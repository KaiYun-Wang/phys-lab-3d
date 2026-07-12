"use client";

import { useState, useMemo } from "react";
import {
  GeneralRelativitySceneComponent,
  GeneralRelativityData,
} from "@/experiments/general-relativity-scene";
import {
  schwarzschildRadius,
  schwarzschildCircularVelocity,
  schwarzschildEscapeVelocity,
  schwarzschildPlungePreset,
  schwarzschildEscapePreset,
  timelikeOrbitEnergy,
  classifySchwarzschildOrbit,
} from "@/utils/physics";
import {
  ExperimentContainer,
  ControlGroup,
  ControlSlider,
  FloatingControlPanel,
  SimulationController,
  DataPanel,
  DetailsLinkButton,
} from "@/components/experiment-ui";

function DataRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-100/10 rounded-lg border border-gray-600/30">
      <span className="text-xs text-gray-300">{label}</span>
      <span className="text-xs font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

export default function GeneralRelativityPage() {
  const [data, setData] = useState<GeneralRelativityData | null>(null);
  const [showDataPanel, setShowDataPanel] = useState(true);
  const [showGuide, setShowGuide] = useState(true);

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(3);
  const [resetTrigger, setResetTrigger] = useState(0);

  const [blackHoleMass, setBlackHoleMass] = useState(5);
  const [particleLaunchRadius, setParticleLaunchRadius] = useState(() => schwarzschildPlungePreset(10).r);
  const [particleTangentialVelocity, setParticleTangentialVelocity] = useState(() => schwarzschildPlungePreset(10).vt);
  const [particleRadialVelocity, setParticleRadialVelocity] = useState(() => schwarzschildPlungePreset(10).vr);
  const [photonImpactParam, setPhotonImpactParam] = useState(25);

  const rs = useMemo(() => schwarzschildRadius(blackHoleMass), [blackHoleMass]);
  const minR = useMemo(() => Math.ceil(rs * 1.08), [rs]);
  const vCirc = useMemo(() => schwarzschildCircularVelocity(particleLaunchRadius, rs), [particleLaunchRadius, rs]);
  const vEsc = useMemo(() => schwarzschildEscapeVelocity(particleLaunchRadius, rs), [particleLaunchRadius, rs]);
  const orbitE = useMemo(
    () => timelikeOrbitEnergy(particleLaunchRadius, particleTangentialVelocity, rs, particleRadialVelocity),
    [particleLaunchRadius, particleTangentialVelocity, particleRadialVelocity, rs]
  );
  const orbitKind = useMemo(
    () => classifySchwarzschildOrbit(particleLaunchRadius, particleTangentialVelocity, rs, particleRadialVelocity),
    [particleLaunchRadius, particleTangentialVelocity, particleRadialVelocity, rs]
  );
  const orbitKindZh: Record<string, string> = {
    Bound: "束缚轨道",
    Escape: "逃逸轨道",
    Plunge: "坠入视界",
    Circular: "圆轨道",
  };
  const isco = useMemo(() => 3 * rs, [rs]);

  const particlePresets = useMemo(
    () => [
      { label: "坠入", ...schwarzschildPlungePreset(rs) },
      { label: "逃逸", ...schwarzschildEscapePreset(rs) },
    ],
    [rs]
  );

  const [showSpacetimeGrid, setShowSpacetimeGrid] = useState(true);
  const [showAccretionDisk, setShowAccretionDisk] = useState(true);
  const [showStarfield, setShowStarfield] = useState(true);
  const [showPhotonPaths, setShowPhotonPaths] = useState(true);
  const [showParticleTrails, setShowParticleTrails] = useState(true);

  const [launchParticleTrigger, setLaunchParticleTrigger] = useState(0);
  const [launchPhotonTrigger, setLaunchPhotonTrigger] = useState(0);

  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleReset = () => {
    setResetTrigger((n) => n + 1);
    setIsPlaying(true);
    setSimulationSpeed(3);
  };

  const parameterControls = (
    <div className="space-y-4">
      <ControlGroup title="黑洞参数">
        <ControlSlider
          label="质量 M"
          value={blackHoleMass}
          unit="M☉"
          min={2}
          max={12}
          step={0.5}
          color="#ff6600"
          onChange={setBlackHoleMass}
          decimals={1}
        />
      </ControlGroup>

      <ControlGroup title="测试粒子（测地线轨道）">
        <p className="text-xs text-gray-400 mb-2">
          圆轨道 ≈ {vCirc.toFixed(2)}c，切向逃逸 ≈ {vEsc.toFixed(2)}c（均随 r 与 M 变化）。
          当前 <strong className="text-cyan-300">E = {orbitE.toFixed(3)}</strong>
          （{orbitKindZh[orbitKind]}），ISCO = {isco.toFixed(0)}。
          改质量 M 后预设会自动按 rs 缩放。
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {particlePresets.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setParticleLaunchRadius(p.r);
                setParticleTangentialVelocity(p.vt);
                setParticleRadialVelocity(p.vr);
              }}
              className="py-1.5 text-xs bg-gray-700/80 hover:bg-gray-600 text-gray-200 rounded-lg"
            >
              {p.label}
            </button>
          ))}
        </div>
        <ControlSlider
          label="发射距离 r"
          value={Math.max(particleLaunchRadius, minR)}
          unit=""
          min={minR}
          max={80}
          step={1}
          color="#88ccff"
          onChange={(v) => setParticleLaunchRadius(Math.max(v, minR))}
        />
        <ControlSlider
          label="切向速度"
          value={particleTangentialVelocity}
          unit="c"
          min={0.05}
          max={1.0}
          step={0.01}
          color="#44aaff"
          onChange={setParticleTangentialVelocity}
          decimals={2}
        />
        <ControlSlider
          label="径向速度（负=向内）"
          value={particleRadialVelocity}
          unit="c"
          min={-0.3}
          max={0.3}
          step={0.01}
          color="#ff8866"
          onChange={setParticleRadialVelocity}
          decimals={2}
        />
        <button
          onClick={() => setLaunchParticleTrigger((n) => n + 1)}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium text-sm rounded-lg transition-all shadow-md"
        >
          发射粒子
        </button>
      </ControlGroup>

      <ControlGroup title="引力透镜（光子路径）">
        <p className="text-xs text-gray-400 mb-2">光子从左侧飞来，白点沿路径移动。被吸入视界时轨迹变红。</p>
        <ControlSlider
          label="碰撞参数 b"
          value={photonImpactParam}
          unit=""
          min={8}
          max={50}
          step={1}
          color="#ffffff"
          onChange={setPhotonImpactParam}
        />
        <button
          onClick={() => setLaunchPhotonTrigger((n) => n + 1)}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-medium text-sm rounded-lg transition-all shadow-md"
        >
          发射光子
        </button>
      </ControlGroup>

      <ControlGroup title="显示图层">
        {[
          { label: "时空弯曲网格", val: showSpacetimeGrid, set: setShowSpacetimeGrid },
          { label: "吸积盘", val: showAccretionDisk, set: setShowAccretionDisk },
          { label: "星野背景", val: showStarfield, set: setShowStarfield },
          { label: "光子路径", val: showPhotonPaths, set: setShowPhotonPaths },
          { label: "粒子轨迹", val: showParticleTrails, set: setShowParticleTrails },
        ].map(({ label, val, set }) => (
          <label key={label} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-orange-500" />
            {label}
          </label>
        ))}
      </ControlGroup>

      <DetailsLinkButton href="/experiments/general-relativity/details">查看原理说明</DetailsLinkButton>
    </div>
  );

  const dataPanelContent = data ? (
    <>
      <div className="mb-3 p-3 bg-gray-800/80 rounded-lg border border-gray-700">
        <div className="text-xs text-gray-400">轨道类型</div>
        <div className="text-lg font-bold text-green-400">{data.orbitType}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DataRow label="史瓦西半径 rs" value={data.rs.toFixed(2)} color="#ff6600" />
        <DataRow label="r / rs" value={data.rOverRs.toFixed(2)} color="#88ccff" />
        <DataRow label="引力红移 z" value={data.redshift.toFixed(3)} color="#ff6666" />
        <DataRow label="光子偏折角" value={`${((data.deflectionAngle * 180) / Math.PI).toFixed(2)}°`} color="#ffffff" />
        <DataRow label="近日点进动" value={`${((data.precessionRate * 180) / Math.PI).toFixed(4)}°/圈`} color="#aabbff" />
        <DataRow label="ISCO (3rs)" value={data.isco.toFixed(1)} color="#6688ff" />
        <DataRow label="光子球 (1.5rs)" value={data.photonSphere.toFixed(1)} color="#ccbbaa" />
        <DataRow label="活跃粒子数" value={String(data.activeParticles)} color="#88ccff" />
      </div>
    </>
  ) : null;

  return (
    <>
      <ExperimentContainer
        title="广义相对论 · 史瓦西黑洞"
        description="观察时空弯曲、测地线轨道、引力透镜与引力红移。拖动旋转视角，滚轮缩放。"
        controls={null}
        cameraPosition={[48, 32, 48]}
        backgroundColor="#000000"
        enableFog={false}
      >
        <GeneralRelativitySceneComponent
          onDataChange={setData}
          blackHoleMass={blackHoleMass}
          particleLaunchRadius={Math.max(particleLaunchRadius, minR)}
          particleTangentialVelocity={particleTangentialVelocity}
          particleRadialVelocity={particleRadialVelocity}
          photonImpactParam={photonImpactParam}
          showSpacetimeGrid={showSpacetimeGrid}
          showAccretionDisk={showAccretionDisk}
          showStarfield={showStarfield}
          showPhotonPaths={showPhotonPaths}
          showParticleTrails={showParticleTrails}
          launchParticleTrigger={launchParticleTrigger}
          launchPhotonTrigger={launchPhotonTrigger}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          resetTrigger={resetTrigger}
        />
      </ExperimentContainer>

      {/* 中文引导卡片 */}
      {showGuide && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92%] sm:w-[480px]">
          <div className="sx-overlay text-sm text-[#e8e8f0]/90 leading-relaxed">
            <div className="sx-overlay-header">
              <h3 className="font-bold text-white">🕳️ 你在看什么？</h3>
              <button onClick={() => setShowGuide(false)} className="text-[#8a8a96] hover:text-white text-lg leading-none p-1">×</button>
            </div>
            <div className="sx-overlay-body-scroll max-h-[60vh]">
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><span className="text-[#8a8a96]">蓝色网格</span> — Flamm 抛物面嵌入图</li>
                <li><span className="text-[#8a8a96]">中心黑球</span> — 事件视界，坐在网格漏斗底部</li>
                <li><span className="text-[#8a8a96]">橙色薄环</span> — 吸积盘（赤道面内旋转）</li>
                <li><span className="text-white font-medium">青色曲线</span> — <strong>有质量粒子</strong>的测地线轨道（应绕黑洞弯成椭圆，贴网格表面）</li>
                <li><span className="text-white font-medium">白色曲线</span> — <strong>光子</strong>路径（无质量，飞过黑洞时被弯向中心 = 引力透镜）</li>
              </ul>
              <div className="pt-3 mt-1 border-t border-[#45454f] text-xs text-[#8a8a96] space-y-2">
                <p><strong className="text-[#e8e8f0]">粒子 vs 光子：</strong>粒子有质量，受引力束缚可形成轨道；光子没有质量，只能直线传播但被时空弯曲，路径呈弧线偏折。</p>
                <p><strong className="text-[#e8e8f0]">坠入不必贴视界：</strong>r &lt; 3×rs（ISCO）时轨道在真实 GR 中不稳定，会螺旋落入；远处 r 要坠入需切向速度低于圆轨道速度，或给负径向速度。</p>
                <p><strong className="text-[#e8e8f0]">时间尺度：</strong>画面为教学加速，非真实秒表；远距自由落体在坐标时间上本就很慢，可用底部速度滑块再加快。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <SimulationController
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        speed={simulationSpeed}
        onSpeedChange={setSimulationSpeed}
      />

      <FloatingControlPanel title="⚙️ 实验控制" initialPosition={{ x: 20, y: 80 }}>
        {parameterControls}
      </FloatingControlPanel>

      <DataPanel
        title="📊 实时数据"
        isVisible={showDataPanel}
        onToggle={() => setShowDataPanel(!showDataPanel)}
      >
        {dataPanelContent}
      </DataPanel>
    </>
  );
}
