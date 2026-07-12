import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function SpecialRelativityDetailsPage() {
  return (
    <ExperimentDetailsLayout title="狭义相对论实验室" backHref="/experiments/special-relativity">
      <DetailsSection title="关于本实验">
        <p>
          本实验以一艘高速飞行的宇宙飞船为模型，直观展示爱因斯坦狭义相对论的三大经典效应：
          长度收缩、时间膨胀和相对论质量。当飞船速度趋近光速时，这些效应会急剧增强，
          这也是任何有质量物体都无法达到光速的根本原因。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard label="洛伦兹因子" formula="γ = 1 / √(1 − v²/c²)" description="描述相对论效应强度的核心量" />
          <DetailsFormulaCard label="时间膨胀" formula="Δt' = γ Δt₀" description="运动参考系中的时间流逝更慢" />
          <DetailsFormulaCard label="长度收缩" formula="L' = L₀ / γ" description="沿运动方向的长度缩短" />
          <DetailsFormulaCard label="相对论质量" formula="m = γ m₀" description="速度越大，惯性质量越大" />
        </div>
      </DetailsSection>

      <DetailsSection title="关键概念">
        <ul className="space-y-3 list-none">
          {[
            ["光速不变原理", "真空中的光速对所有惯性参考系都相同，是狭义相对论的基本假设。"],
            ["时间膨胀", "地球上的观察者会看到飞船上的时钟走得比自己的慢，低速时效应微弱，高速时显著。"],
            ["长度收缩", "运动物体在其运动方向上的长度会缩短，但垂直于运动方向的尺寸不变。"],
            ["质量发散", "当 v → c 时，γ → ∞，推动物体继续加速所需的能量也趋于无穷，因此有质量物体无法超光速。"],
          ].map(([title, text]) => (
            <li key={title} className="flex gap-3">
              <span className="text-white shrink-0">•</span>
              <div>
                <strong className="text-white">{title}：</strong>
                {text}
              </div>
            </li>
          ))}
        </ul>
      </DetailsSection>

      <DetailsSection title="操作说明">
        <ol className="space-y-3 list-none">
          {[
            "拖动飞船速度 v 滑块，改变飞船速度（以光速 c 的百分比表示）。",
            "点击快速预设按钮，跳转到典型速度（0.5c、0.9c、0.99c 等）。",
            "观察 3D 场景中飞船的长度收缩和时钟的变慢。",
            "查看数据面板中的洛伦兹因子曲线与实时物理量。",
          ].map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="text-white shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/special-relativity" />
    </ExperimentDetailsLayout>
  );
}
