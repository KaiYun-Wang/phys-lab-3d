import SpecialRelativityPage from "@/experiments/special-relativity-page";

export const dynamic = 'force-dynamic';

export default function SpecialRelativityRoute() {
  return <SpecialRelativityPage />;
}

export const metadata = {
  title: "狭义相对论实验室 - Interactive Physics Lab",
  description: "交互式 3D 狭义相对论实验，演示长度收缩、时间膨胀与相对论质量。",
};
