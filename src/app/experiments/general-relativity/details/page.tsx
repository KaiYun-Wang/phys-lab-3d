"use client";

import Link from "next/link";

export default function GeneralRelativityDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-purple-400">
              🕳️ 广义相对论 · 史瓦西黑洞
            </h1>
            <p className="text-sm text-gray-400 mt-1">实验原理说明</p>
          </div>
          <Link
            href="/experiments/general-relativity"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            ← 返回实验
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4">📖 实验简介</h2>
          <p className="text-gray-300 leading-relaxed">
            广义相对论认为，引力不是&quot;力&quot;，而是质量使时空弯曲。物体沿弯曲时空中的<strong>测地线</strong>（最短路径）运动。
            本实验模拟最简单的黑洞解——<strong>史瓦西黑洞</strong>（不旋转）。你可以发射粒子观察轨道、发射光子观察引力透镜效应，
            并通过蓝色网格直观看到时空被&quot;压&quot成漏斗形。
          </p>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4">🔭 画面中各元素</h2>
          <ul className="space-y-3 text-gray-300">
            <li><strong className="text-gray-200">黑色球体</strong> — 事件视界（r = rs），进入后任何物质和光都无法逃出</li>
            <li><strong className="text-gray-200">细光环</strong> — 光子球（r = 1.5 rs），光可以在此不稳定地绕行</li>
            <li><strong className="text-gray-200">橙色薄环</strong> — 吸积盘，落入黑洞的高温气体</li>
            <li><strong className="text-gray-200">蓝色网格</strong> — 时空嵌入图，展示质量如何把空间弯曲</li>
            <li><strong className="text-gray-200">青色粒子</strong> — 沿测地线运动的测试质量</li>
            <li><strong className="text-gray-200">白色光线</strong> — 被引力弯曲的光子路径（引力透镜）</li>
          </ul>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4">📐 核心公式</h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">ds² = -(1 - rs/r) dt² + (1 - rs/r)⁻¹ dr² + r² dφ²</code>
              <p className="text-gray-400 text-sm mt-2">史瓦西度规（自然单位 G = c = 1）</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">rs = 2M</code>
              <p className="text-gray-400 text-sm mt-2">史瓦西半径，决定视界大小</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">z = 1/√(1 - rs/r) - 1</code>
              <p className="text-gray-400 text-sm mt-2">引力红移：越靠近黑洞，光越偏红</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-purple-400 mb-4">⚖️ 与「引力轨道」实验的区别</h2>
          <p className="text-gray-300 leading-relaxed">
            本站的<strong>引力轨道</strong>实验使用牛顿万有引力，适合行星运动等弱引力场景。
            本实验使用爱因斯坦的测地线方程，在远离黑洞时结果接近牛顿，但在视界附近差异巨大：
            轨道会发生进动、光子偏折是牛顿预测的两倍、时间也会变慢。
          </p>
        </section>

        <div className="flex justify-center pt-4 pb-8">
          <Link
            href="/experiments/general-relativity"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
          >
            🚀 开始实验
          </Link>
        </div>
      </div>
    </div>
  );
}
