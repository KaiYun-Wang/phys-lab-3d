import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function DopplerDetailsPage() {
  return (
    <ExperimentDetailsLayout title="多普勒效应" backHref="/experiments/doppler">
      <DetailsSection title="关于本实验">
        <p>
          多普勒效应是指波源与观察者相对运动时，观察者接收到的波的频率发生变化的现象。
          当声源靠近观察者时，波被压缩（蓝移）；远离时，波被拉伸（红移）。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <DetailsFormulaCard
          label="多普勒频移"
          formula="f' = f × (v / (v ± vₛ))"
          description="靠近时取减号，远离时取加号"
        />
      </DetailsSection>

      <DetailsSection title="实际应用">
        <ul className="space-y-2 list-none">
          {["交警测速雷达", "医学超声诊断", "天文红移（宇宙膨胀）", "气象雷达"].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-white shrink-0">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/doppler" />
    </ExperimentDetailsLayout>
  );
}
