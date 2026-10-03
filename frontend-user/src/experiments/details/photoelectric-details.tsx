import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function PhotoelectricDetailsPage() {
  return (
    <ExperimentDetailsLayout title="光电效应" backHref="/experiments/photoelectric">
      <DetailsSection title="关于本实验">
        <p>
          光电效应是光的量子性的直接证据：当频率足够高的光照射金属表面时，
          金属中的电子吸收光子能量后逸出，形成光电流。经典波动理论无法解释
          「存在极限波长」「最大初动能只由频率决定」等实验事实，爱因斯坦提出
          光量子假说才给出了完整的解释，并因此获得诺贝尔物理学奖。
          本实验通过 3D 真空管装置直观呈现光子吸收、电子逸出与光电流随电压的变化。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard
            label="光子能量"
            formula="E = hν = 1239.84 / λ"
            description="λ 用 nm，E 直接用 eV 计算：波长越短，单个光子能量越大"
          />
          <DetailsFormulaCard
            label="爱因斯坦光电方程"
            formula="Kmax = E − φ"
            description="逸出功 φ 是电子脱离金属表面所需的最小能量；E < φ 时无光电子逸出"
          />
          <DetailsFormulaCard
            label="截止电压"
            formula="eUc = Kmax"
            description="反向电压增大到 Uc 时光电流恰为零，Uc 只由频率与材料决定，与光强无关"
          />
          <DetailsFormulaCard
            label="极限波长"
            formula="λ₀ = 1239.84 / φ"
            description="入射波长超过 λ₀ 时，无论光强多大都不会发生光电效应"
          />
        </div>
      </DetailsSection>

      <DetailsSection title="实验规律">
        <ul className="space-y-3 list-none">
          {[
            ["存在极限波长", "对每种金属都有一个极限波长 λ₀：λ > λ₀ 时光强再大也无光电子逸出——光的能量是一份一份的。"],
            ["最大初动能只由频率决定", "Kmax = E − φ 与光强无关：延长光照时间或增大光强，只会增加电子数量，不会让单个电子的动能变大。"],
            ["饱和光电流与光强成正比", "正向电压足够大时所有逸出电子都被阳极收集，光电流达到饱和；光强加倍，饱和电流加倍。"],
            ["反向截止电压测最大初动能", "反向电压使光电流从饱和值线性减小，达到 Uc 时恰为零：eUc = Kmax。"],
            ["响应几乎瞬时", "光电子逸出时间在纳秒量级，无需「能量积累」——单个光子与单个电子的一次性作用。"],
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

      <DetailsSection title="关键概念">
        <ul className="space-y-3 list-none">
          {[
            ["逸出功 φ", "将电子从金属表面移出所需的最小能量，由材料决定：铯约 2.10 eV（最易逸出），铂约 5.60 eV（最难）。"],
            ["光子与光强", "光的能量以光子为单位（E = hν）：波长决定单个光子的能量，光强决定单位时间到达的光子数。"],
            ["截止电压 Uc", "使光电流恰好为零的反向电压，数值等于最大初动能对应的电压，是测量 Kmax 的实验手段。"],
            ["饱和光电流", "正向电压下单位时间逸出的光电子全部到达阳极，电流不再随电压增大。"],
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
            "选择一种阴极材料（如钠，φ = 2.40 eV），记住它的逸出功与极限波长。",
            "把波长从 500 nm 慢慢调大：越过极限波长后，阴极边缘的闪光与电子流会消失——红光无法逸出光电子。",
            "把波长调到紫外（如 255 nm），观察电子流变强、最大初动能与截止电压增大。",
            "保持波长不变，改变光强：饱和光电流随之变化，但截止电压不变。",
            "把电压推向负值：光电流逐渐减小，在 Uc 处恰好归零；继续减小则始终为零。",
            "使用「典型场景」预设快速切换红光截止、紫外激发、反向拦截与饱和电流四种情形。",
          ].map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="text-white shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </DetailsSection>

      <DetailsSection title="实际应用">
        <ul className="space-y-3 list-none">
          {[
            ["光电倍增管", "利用光电效应把微弱光信号转换为可放大的电流，用于天文观测与粒子探测。"],
            ["光电池与光敏元件", "太阳能电池、照相机测光元件均基于光生伏特效应与光电效应。"],
            ["光电传感器", "自动门、烟雾报警器、光纤通信接收端都依赖光电子转换。"],
            ["光谱与量子效率研究", "通过测量不同波长下的光电流，可以测定材料的逸出功与能带结构。"],
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

      <DetailsLaunchButton href="/experiments/photoelectric" />
    </ExperimentDetailsLayout>
  );
}
