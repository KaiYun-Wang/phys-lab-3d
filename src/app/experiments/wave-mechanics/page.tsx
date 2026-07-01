import WaveMechanicsPage from "@/experiments/wave-mechanics-page";

export const dynamic = "force-dynamic";

export default function WaveMechanicsRoute() {
  return <WaveMechanicsPage />;
}

export const metadata = {
  title: "横波与纵波 - 交互式物理实验",
  description: "3D 对比横波与纵波：同步调节频率、振幅、波长，观察波前、疏密区与相位关系。",
};
