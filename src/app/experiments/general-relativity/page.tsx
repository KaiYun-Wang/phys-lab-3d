import GeneralRelativityPage from "@/experiments/general-relativity-page";

export const dynamic = "force-dynamic";

export default function GeneralRelativityRoute() {
  return <GeneralRelativityPage />;
}

export const metadata = {
  title: "广义相对论 · 史瓦西黑洞 - 交互式物理实验",
  description:
    "在 3D 场景中探索弯曲时空、测地线轨道、引力透镜与引力红移。",
};
