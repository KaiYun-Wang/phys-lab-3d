import BernoulliVenturiPage from "@/experiments/bernoulli-venturi-page";

export const dynamic = 'force-dynamic';

export default function BernoulliVenturiRoute() {
  return <BernoulliVenturiPage />;
}

export const metadata = {
  title: "伯努利原理 - 文丘里管 - Interactive Physics Lab",
  description: "交互式 3D 文丘里管实验，演示伯努利原理与连续性方程。",
};
