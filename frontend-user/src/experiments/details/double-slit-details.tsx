import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function DoubleSlitDetailsPage() {
  return (
    <ExperimentDetailsLayout title="双缝实验" backHref="/experiments/double-slit">
      <DetailsSection title="关于本实验">
        <p>
          双缝实验展示了波粒二象性——量子力学中最基本也最令人困惑的现象之一。当光（或粒子）通过两条间距很近的狭缝时，
          会在屏幕上形成干涉条纹，即使粒子是一个一个通过的也是如此。
        </p>
        <p>
          该实验最初由托马斯·杨于 1801 年完成，帮助确立了光的波动理论。在现代量子力学中，
          它揭示了叠加原理和测量问题。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard label="条纹间距" formula="Δy = λL/d" description="屏幕上相邻亮条纹之间的距离" />
          <DetailsFormulaCard label="光程差" formula="Δr = dsin(θ)" description="两缝到观察点的路径长度之差" />
          <DetailsFormulaCard label="相长干涉" formula="Δr = mλ (m = 0, 1, 2, ...)" description="亮条纹（极大值）的条件" />
          <DetailsFormulaCard label="相消干涉" formula="Δr = (m + ½)λ" description="暗条纹（极小值）的条件" />
        </div>
      </DetailsSection>

      <DetailsSection title="核心概念">
        <ul className="space-y-3 list-none">
          {[
            ["波粒二象性", "光和物质既表现出波动性，也表现出粒子性，具体取决于观测方式。"],
            ["干涉", "两列波叠加时，相长叠加形成亮纹，相消叠加形成暗纹。"],
            ["叠加态", "量子系统在未被测量前，同时处于所有可能状态的叠加中。"],
            ["衍射", "光通过与其波长相当的开口时会发生扩散。"],
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

      <DetailsSection title="历史意义">
        <ul className="space-y-3 list-none">
          {[
            ["1801", "托马斯·杨：完成原始双缝实验，证明光具有波动性。"],
            ["1909", "G.I. 泰勒：用单个光子演示了干涉现象。"],
            ["1961", "克劳斯·荣松：首次完成电子双缝实验。"],
            ["2012", "单分子实验：观察到单个分子的干涉条纹。"],
          ].map(([year, text]) => (
            <li key={year} className="flex gap-3">
              <span className="text-[#8a8a96] shrink-0 w-12">{year}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </DetailsSection>

      <DetailsSection title="实际应用">
        <ul className="space-y-2 list-none">
          {[
            "全息术：利用干涉图样生成三维图像。",
            "光谱分析：通过分析光谱确定物质的化学成分。",
            "光学镀膜：增透膜利用相消干涉减少反射。",
            "相控阵天线：利用干涉实现定向发射。",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-white shrink-0">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </DetailsSection>

      <DetailsSection title="操作说明">
        <ol className="space-y-3 list-none">
          {[
            "调节缝间距，观察干涉条纹如何变化。",
            "调整缝宽，观察衍射效应。",
            "切换观测模式，对比粒子行为与波动干涉。",
            "开启理论曲线，查看干涉强度分布。",
          ].map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="text-white shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/double-slit" />
    </ExperimentDetailsLayout>
  );
}
