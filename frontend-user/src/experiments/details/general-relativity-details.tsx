import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function GeneralRelativityDetailsPage() {
  return (
    <ExperimentDetailsLayout title="广义相对论 · 史瓦西黑洞" backHref="/experiments/general-relativity">
      <DetailsSection title="实验简介">
        <p>
          广义相对论认为，引力不是&quot;力&quot;，而是质量使时空弯曲。物体沿弯曲时空中的<strong className="text-white">测地线</strong>（最短路径）运动。
          本实验模拟最简单的黑洞解——<strong className="text-white">史瓦西黑洞</strong>（不旋转）。你可以发射粒子观察轨道、发射光子观察引力透镜效应，
          并通过蓝色网格直观看到时空被&quot;压&quot;成漏斗形。
        </p>
      </DetailsSection>

      <DetailsSection title="画面中各元素">
        <ul className="space-y-2 list-none">
          {[
            ["黑色球体", "事件视界（r = rs），进入后任何物质和光都无法逃出"],
            ["细光环", "光子球（r = 1.5 rs），光可以在此不稳定地绕行"],
            ["橙色薄环", "吸积盘，落入黑洞的高温气体"],
            ["蓝色网格", "时空嵌入图，展示质量如何把空间弯曲"],
            ["青色粒子", "沿测地线运动的测试质量"],
            ["白色光线", "被引力弯曲的光子路径（引力透镜）"],
          ].map(([title, text]) => (
            <li key={title}>
              <strong className="text-white">{title}</strong> — {text}
            </li>
          ))}
        </ul>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard label="史瓦西度规" formula="ds² = -(1 - rs/r) dt² + (1 - rs/r)⁻¹ dr² + r² dφ²" description="自然单位 G = c = 1" />
          <DetailsFormulaCard label="史瓦西半径" formula="rs = 2M" description="决定视界大小" />
          <DetailsFormulaCard label="引力红移" formula="z = 1/√(1 - rs/r) - 1" description="越靠近黑洞，光越偏红" />
        </div>
      </DetailsSection>

      <DetailsSection title="与「引力轨道」实验的区别">
        <p>
          本站的<strong className="text-white">引力轨道</strong>实验使用牛顿万有引力，适合行星运动等弱引力场景。
          本实验使用爱因斯坦的测地线方程，在远离黑洞时结果接近牛顿，但在视界附近差异巨大：
          轨道会发生进动、光子偏折是牛顿预测的两倍、时间也会变慢。
        </p>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/general-relativity" label="开始实验" />
    </ExperimentDetailsLayout>
  );
}
