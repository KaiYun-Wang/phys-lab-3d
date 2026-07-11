import DopplerPage from "@/experiments/doppler-page";

export const dynamic = 'force-dynamic';

export default function DopplerRoute() { return <DopplerPage />; }

export const metadata = { title: "多普勒效应 - 交互式物理实验室", description: "交互式 3D 多普勒效应模拟，实时可视化频率变化。" };
