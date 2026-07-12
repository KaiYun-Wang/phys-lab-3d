import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function WaveMechanicsDetailsPage() {
  return (
    <ExperimentDetailsLayout title="横波与纵波" backHref="/experiments/wave-mechanics">
      <DetailsSection title="实验简介">
        <p>
          波可以在介质中传播能量，但介质质点本身并不随波整体迁移。根据质点振动方向与波传播方向的关系，波分为
          <strong className="text-white">横波</strong>和
          <strong className="text-white">纵波</strong>两类。
        </p>
        <p>
          <strong className="text-white">横波</strong>中，质点振动方向垂直于传播方向，例如绳上的波、水面的波。
          波峰与波谷交替出现，视觉上表现为上下（或左右）往复运动。
        </p>
        <p>
          <strong className="text-white">纵波</strong>中，质点振动方向与传播方向平行，例如声波在空气中的传播。
          介质出现周期性的疏密（压缩与稀疏）区域，能量沿传播方向传递。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard label="横波位移" formula="y = A·sin(kx − ωt)" description="垂直于传播方向" />
          <DetailsFormulaCard label="纵波位移" formula="Δx = A·sin(kx − ωt)" description="沿传播方向" />
          <DetailsFormulaCard label="波速关系" formula="v = fλ = ω/k" description="波速、频率、波长之间的关系" />
          <DetailsFormulaCard label="压缩度" formula="ρ = d₀/dᵢ" description="纵波局部压缩度（大于 1 为密区，小于 1 为疏区）" />
        </div>
      </DetailsSection>

      <DetailsSection title="横波与纵波的对比">
        <div className="overflow-x-auto rounded-xl border border-[#45454f]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#45454f] bg-black/30 text-left">
                <th className="py-2.5 px-4 text-white">对比项</th>
                <th className="py-2.5 px-4 text-white">横波</th>
                <th className="py-2.5 px-4 text-white">纵波</th>
              </tr>
            </thead>
            <tbody className="text-[#e8e8f0]/85">
              <tr className="border-b border-[#45454f]/60">
                <td className="py-2.5 px-4">振动方向</td>
                <td className="py-2.5 px-4">⊥ 传播方向</td>
                <td className="py-2.5 px-4">∥ 传播方向</td>
              </tr>
              <tr className="border-b border-[#45454f]/60">
                <td className="py-2.5 px-4">典型实例</td>
                <td className="py-2.5 px-4">绳波、电磁波</td>
                <td className="py-2.5 px-4">声波、弹簧疏密波</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4">主要视觉特征</td>
                <td className="py-2.5 px-4">波峰 / 波谷</td>
                <td className="py-2.5 px-4">密区 / 疏区</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DetailsSection>

      <DetailsSection title="操作说明">
        <ul className="space-y-2 list-none">
          {[
            "调节频率、振幅、波长，两侧波形同步变化，波速 v = fλ 自动联动。",
            "默认「对比」模式：左侧横波，右侧纵波。",
            "暂停后可观察相位线在两侧的同步位置。",
            "点击质点可在数据面板查看该点的位移或压缩度变化曲线。",
            "可切换「横波」「纵波」「叠加」等视图模式深入观察。",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-white shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/wave-mechanics" />
    </ExperimentDetailsLayout>
  );
}
