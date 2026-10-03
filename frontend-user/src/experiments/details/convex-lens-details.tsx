import {
  ExperimentDetailsLayout,
  DetailsSection,
  DetailsFormulaCard,
  DetailsLaunchButton,
} from "@/components/experiment-ui/ExperimentDetailsLayout";

export default function ConvexLensDetailsPage() {
  return (
    <ExperimentDetailsLayout title="凸透镜成像" backHref="/experiments/convex-lens">
      <DetailsSection title="关于本实验">
        <p>
          凸透镜成像规律是几何光学的核心内容，也是照相机、投影仪、放大镜等光学仪器的工作原理。
          当物体位于凸透镜不同距离时，成像的性质（正立或倒立、放大或缩小、实像或虚像）会随之改变。
          本实验通过 3D 光路图直观呈现两条特征光线与成像位置，帮助理解「物距—像距」的定量关系。
        </p>
      </DetailsSection>

      <DetailsSection title="核心公式">
        <div className="space-y-3">
          <DetailsFormulaCard
            label="薄透镜成像公式"
            formula="1/f = 1/u + 1/v"
            description="物距 u、像距 v、焦距 f 的定量关系"
          />
          <DetailsFormulaCard
            label="像距表达式"
            formula="v = uf/(u − f)"
            description="u > f 时 v 为正（实像）；u < f 时 v 为负（虚像，与物同侧）"
          />
          <DetailsFormulaCard
            label="放大率"
            formula="m = |v|/u = |h′|/h"
            description="像高 h′ 与物高 h 之比，决定像被放大还是缩小"
          />
        </div>
      </DetailsSection>

      <DetailsSection title="成像规律">
        <ul className="space-y-3 list-none">
          {[
            ["u > 2f", "倒立、缩小的实像，像位于 f 与 2f 之间，与物异侧——照相机原理。"],
            ["u = 2f", "倒立、等大的实像，像距 v = 2f，与物异侧。"],
            ["f < u < 2f", "倒立、放大的实像，像距 v > 2f，与物异侧——投影仪原理。"],
            ["u = f", "物体在焦点上，出射光平行，不成像。"],
            ["u < f", "正立、放大的虚像，像与物同侧——放大镜原理。"],
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
            ["一倍焦距分虚实", "物体在焦点以外成实像，在焦点以内成虚像。"],
            ["二倍焦距分大小", "物体在二倍焦距以外成缩小的像，在二倍焦距以内成放大的像。"],
            ["物近像远像变大", "成实像时物体靠近透镜，像距增大、像变大。"],
            ["两条特征光线", "平行于主光轴的光线经透镜后过另一侧焦点；过光心的光线方向不变。两条光线的交点（或反向延长线的交点）即像的位置。"],
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
            "调节焦距 f，观察 F 与 2F 标记位置随之移动。",
            "调节物距 u，观察像的位置、大小、正倒与虚实变化。",
            "使用「成像场景」预设快速切换照相机、等大、投影仪、放大镜四种典型情形。",
            "虚像情形下，注意观察紫色虚线——那是出射光线的反向延长线，虚像无法被光屏承接。",
          ].map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="text-white shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </DetailsSection>

      <DetailsLaunchButton href="/experiments/convex-lens" />
    </ExperimentDetailsLayout>
  );
}
