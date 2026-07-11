"use client";

import Link from "next/link";

export default function DopplerDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-orange-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-orange-400">
              🔊 多普勒效应
            </h1>
            <p className="text-sm text-gray-400 mt-1">实验详情</p>
          </div>
          <Link href="/experiments/doppler" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-all flex items-center gap-2">
            ← 返回实验
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">📖 关于本实验</h2>
          <p className="text-gray-300 leading-relaxed">
            多普勒效应是指波源与观察者相对运动时，观察者接收到的波的频率发生变化的现象。
            当声源靠近观察者时，波被压缩（蓝移）；远离时，波被拉伸（红移）。
          </p>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">📐 核心公式</h2>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <code className="text-cyan-300 font-mono">f&apos; = f × (v / (v ± vₛ))</code>
            <p className="text-xs text-gray-400 mt-2">靠近时取减号，远离时取加号</p>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">🔬 实际应用</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3"><span className="text-green-400">▸</span><span>交警测速雷达</span></li>
            <li className="flex gap-3"><span className="text-green-400">▸</span><span>医学超声诊断</span></li>
            <li className="flex gap-3"><span className="text-green-400">▸</span><span>天文红移（宇宙膨胀）</span></li>
            <li className="flex gap-3"><span className="text-green-400">▸</span><span>气象雷达</span></li>
          </ul>
        </section>

        <div className="flex justify-center pt-4 pb-8">
          <Link href="/experiments/doppler" className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all shadow-lg text-lg">
            🚀 启动实验
          </Link>
        </div>
      </div>
    </div>
  );
}
