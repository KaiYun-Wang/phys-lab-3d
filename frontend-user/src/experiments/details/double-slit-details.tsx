"use client";

import Link from "next/link";

export default function DoubleSlitDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-purple-400">
              🔬 双缝实验
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              实验详情
            </p>
          </div>
          <Link
            href="/experiments/double-slit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            ← 返回实验
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            📖 关于本实验
          </h2>
          <p className="text-gray-300 leading-relaxed">
            双缝实验展示了波粒二象性——量子力学中最基本也最令人困惑的现象之一。当光（或粒子）通过两条间距很近的狭缝时，
            会在屏幕上形成干涉条纹，即使粒子是一个一个通过的也是如此。
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            该实验最初由托马斯·杨于 1801 年完成，帮助确立了光的波动理论。在现代量子力学中，
            它揭示了叠加原理和测量问题。
          </p>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            📐 核心公式
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 font-semibold">条纹间距：</span>
                <code className="text-cyan-300 font-mono">Δy = λL/d</code>
              </div>
              <p className="text-xs text-gray-400">屏幕上相邻亮条纹之间的距离</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 font-semibold">光程差：</span>
                <code className="text-cyan-300 font-mono">Δr = dsin(θ)</code>
              </div>
              <p className="text-xs text-gray-400">两缝到观察点的路径长度之差</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 font-semibold">相长干涉：</span>
                <code className="text-cyan-300 font-mono">Δr = mλ (m = 0, 1, 2, ...)</code>
              </div>
              <p className="text-xs text-gray-400">亮条纹（极大值）的条件</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 font-semibold">相消干涉：</span>
                <code className="text-cyan-300 font-mono">Δr = (m + ½)λ</code>
              </div>
              <p className="text-xs text-gray-400">暗条纹（极小值）的条件</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            💡 核心概念
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-purple-400 text-xl">•</span>
              <div>
                <strong className="text-white">波粒二象性：</strong>
                光和物质既表现出波动性，也表现出粒子性，具体取决于观测方式。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 text-xl">•</span>
              <div>
                <strong className="text-white">干涉：</strong>
                两列波叠加时，相长叠加形成亮纹，相消叠加形成暗纹。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 text-xl">•</span>
              <div>
                <strong className="text-white">叠加态：</strong>
                量子系统在未被测量前，同时处于所有可能状态的叠加中。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 text-xl">•</span>
              <div>
                <strong className="text-white">衍射：</strong>
                光通过与其波长相当的开口时会发生扩散。
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            🏛️ 历史意义
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-yellow-400">1801</span>
              <span><strong className="text-white">托马斯·杨：</strong>完成原始双缝实验，证明光具有波动性。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-yellow-400">1909</span>
              <span><strong className="text-white">G.I. 泰勒：</strong>用单个光子演示了干涉现象。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-yellow-400">1961</span>
              <span><strong className="text-white">克劳斯·荣松：</strong>首次完成电子双缝实验。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-yellow-400">2012</span>
              <span><strong className="text-white">单分子实验：</strong>观察到单个分子的干涉条纹。</span>
            </li>
          </ul>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            🔬 实际应用
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-green-400">▸</span>
              <span><strong className="text-white">全息术：</strong>利用干涉图样生成三维图像。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400">▸</span>
              <span><strong className="text-white">光谱分析：</strong>通过分析光谱确定物质的化学成分。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400">▸</span>
              <span><strong className="text-white">光学镀膜：</strong>增透膜利用相消干涉减少反射。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400">▸</span>
              <span><strong className="text-white">相控阵天线：</strong>利用干涉实现定向发射。</span>
            </li>
          </ul>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            🎮 操作说明
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-cyan-400">1.</span>
              <span>调节 <strong className="text-pink-400">缝间距</strong>，观察干涉条纹如何变化。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">2.</span>
              <span>调整 <strong className="text-green-400">缝宽</strong>，观察衍射效应。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">3.</span>
              <span>切换 <strong className="text-purple-400">观测模式</strong>，对比粒子行为与波动干涉。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">4.</span>
              <span>开启 <strong className="text-blue-400">理论曲线</strong>，查看干涉强度分布。</span>
            </li>
          </ul>
        </section>

        <div className="flex justify-center pt-4 pb-8">
          <Link
            href="/experiments/double-slit"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 text-lg"
          >
            🚀 启动实验
          </Link>
        </div>
      </div>
    </div>
  );
}
