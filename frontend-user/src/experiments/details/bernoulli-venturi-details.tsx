import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function BernoulliVenturiDetailsPage() {
  return (
    <ExperimentDetailsLayout title="伯努利原理（文丘里管）" backHref="/experiments/bernoulli-venturi">
      <DetailsSection title="关于本实验">
        <p>
          文丘里管是一种用于测量流体流速和流量的装置，同时也是展示伯努利原理的经典模型。
          当流体流经截面变小的管道时，流速增大、静压降低；反之，截面扩大时流速减小、静压升高。
          本实验通过 3D 可视化直观呈现这一物理规律。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard label="连续性方程" formula="A₁v₁ = A₂v₂" description="不可压缩流体质量守恒" />
          <DetailsFormulaCard label="伯努利方程" formula="P₁ + ½ρv₁² = P₂ + ½ρv₂²" description="水平管伯努利方程：重力势能项抵消" />
          <DetailsFormulaCard label="压强差" formula="ΔP = P₁ − P₂ = ½ρ(v₂² − v₁²)" description="压强差可正可负，决定测压管液面高低" />
        </div>
      </DetailsSection>

      <DetailsSection title="关键概念">
        <ul className="space-y-3 list-none">
          {[
            ["流速与压强反比", "在稳定流动的水平管中，截面积越小，流速越大，静压越低。"],
            ["连续性方程", "流体通过不同截面时，体积流量保持不变。"],
            ["流体密度影响", "在相同流速下，密度越大的流体产生的压强差越大。"],
            ["文丘里效应", "广泛应用于流量计、喷雾器、航空升力原理等领域。"],
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
            "调节入口流速 v₁ 改变流体进入管道的速度。",
            "调节截面积比 A₂/A₁：小于 1 为收缩管，大于 1 为扩张管。",
            "切换流体介质（水 / 甘油），观察密度对压强差的影响。",
            "查看数据面板中的实时计算结果与液面高度变化。",
          ].map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="text-white shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/bernoulli-venturi" />
    </ExperimentDetailsLayout>
  );
}
