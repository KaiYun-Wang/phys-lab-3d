import Link from "next/link";

export default function BernoulliVenturiDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-blue-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-blue-400">
              💨 伯努利原理（文丘里管）
            </h1>
            <p className="text-sm text-gray-400 mt-1">实验详情</p>
          </div>
          <Link
            href="/experiments/bernoulli-venturi"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            ← 返回实验
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            📖 关于本实验
          </h2>
          <p className="text-gray-300 leading-relaxed">
            文丘里管是一种用于测量流体流速和流量的装置，同时也是展示伯努利原理的经典模型。
            当流体流经截面变小的管道时，流速增大、静压降低；反之，截面扩大时流速减小、静压升高。
            本实验通过 3D 可视化直观呈现这一物理规律。
          </p>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            📐 核心公式
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">A₁v₁ = A₂v₂</code>
              <p className="text-xs text-gray-400 mt-2">连续性方程：不可压缩流体质量守恒</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">P₁ + ½ρv₁² = P₂ + ½ρv₂²</code>
              <p className="text-xs text-gray-400 mt-2">水平管伯努利方程：重力势能项抵消</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">ΔP = P₁ − P₂ = ½ρ(v₂² − v₁²)</code>
              <p className="text-xs text-gray-400 mt-2">压强差：可正可负，决定测压管液面高低</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            💡 关键概念
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-blue-400 text-xl">•</span>
              <div>
                <strong className="text-white">流速与压强反比：</strong>
                在稳定流动的水平管中，截面积越小，流速越大，静压越低。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 text-xl">•</span>
              <div>
                <strong className="text-white">连续性方程：</strong>
                流体通过不同截面时，体积流量保持不变。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 text-xl">•</span>
              <div>
                <strong className="text-white">流体密度影响：</strong>
                在相同流速下，密度越大的流体产生的压强差越大。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 text-xl">•</span>
              <div>
                <strong className="text-white">文丘里效应：</strong>
                广泛应用于流量计、喷雾器、航空升力原理等领域。
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            🎮 操作说明
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-cyan-400">1.</span>
              <span>调节 <strong className="text-blue-400">入口流速 v₁</strong> 改变流体进入管道的速度。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">2.</span>
              <span>调节 <strong className="text-purple-400">截面积比 A₂/A₁</strong>：小于 1 为收缩管，大于 1 为扩张管。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">3.</span>
              <span>切换 <strong className="text-green-400">流体介质</strong>（水 / 甘油），观察密度对压强差的影响。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">4.</span>
              <span>查看右侧 <strong className="text-pink-400">数据面板</strong> 中的实时计算结果与液面高度变化。</span>
            </li>
          </ul>
        </section>

        <div className="flex justify-center pt-4 pb-8">
          <Link
            href="/experiments/bernoulli-venturi"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
          >
            🚀 启动实验
          </Link>
        </div>
      </div>
    </div>
  );
}
