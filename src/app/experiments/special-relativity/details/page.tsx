import Link from "next/link";

export default function SpecialRelativityDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-cyan-400">
              ⚡ 狭义相对论实验室
            </h1>
            <p className="text-sm text-gray-400 mt-1">实验详情</p>
          </div>
          <Link
            href="/experiments/special-relativity"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            ← 返回实验
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            📖 关于本实验
          </h2>
          <p className="text-gray-300 leading-relaxed">
            本实验以一艘高速飞行的宇宙飞船为模型，直观展示爱因斯坦狭义相对论的三大经典效应：
            长度收缩、时间膨胀和相对论质量。当飞船速度趋近光速时，这些效应会急剧增强，
            这也是任何有质量物体都无法达到光速的根本原因。
          </p>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            📐 核心公式
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">γ = 1 / √(1 − v²/c²)</code>
              <p className="text-xs text-gray-400 mt-2">洛伦兹因子：描述相对论效应强度的核心量</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-purple-300 font-mono">Δt' = γ Δt₀</code>
              <p className="text-xs text-gray-400 mt-2">时间膨胀：运动参考系中的时间流逝更慢</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-emerald-300 font-mono">L' = L₀ / γ</code>
              <p className="text-xs text-gray-400 mt-2">长度收缩：沿运动方向的长度缩短</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-amber-300 font-mono">m = γ m₀</code>
              <p className="text-xs text-gray-400 mt-2">相对论质量：速度越大，惯性质量越大</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            💡 关键概念
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-cyan-400 text-xl">•</span>
              <div>
                <strong className="text-white">光速不变原理：</strong>
                真空中的光速对所有惯性参考系都相同，是狭义相对论的基本假设。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-400 text-xl">•</span>
              <div>
                <strong className="text-white">时间膨胀：</strong>
                地球上的观察者会看到飞船上的时钟走得比自己的慢，低速时效应微弱，高速时显著。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 text-xl">•</span>
              <div>
                <strong className="text-white">长度收缩：</strong>
                运动物体在其运动方向上的长度会缩短，但垂直于运动方向的尺寸不变。
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 text-xl">•</span>
              <div>
                <strong className="text-white">质量发散：</strong>
                当 v → c 时，γ → ∞，推动物体继续加速所需的能量也趋于无穷，因此有质量物体无法超光速。
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            🎮 操作说明
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-cyan-400">1.</span>
              <span>拖动 <strong className="text-cyan-400">飞船速度 v</strong> 滑块，改变飞船速度（以光速 c 的百分比表示）。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">2.</span>
              <span>点击 <strong className="text-purple-400">快速预设</strong> 按钮，跳转到典型速度（0.5c、0.9c、0.99c 等）。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">3.</span>
              <span>观察 3D 场景中飞船的 <strong className="text-emerald-400">长度收缩</strong> 和时钟的 <strong className="text-purple-400">变慢</strong>。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400">4.</span>
              <span>查看数据面板中的 <strong className="text-amber-400">洛伦兹因子曲线</strong> 与实时物理量。</span>
            </li>
          </ul>
        </section>

        <div className="flex justify-center pt-4 pb-8">
          <Link
            href="/experiments/special-relativity"
            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
          >
            🚀 启动实验
          </Link>
        </div>
      </div>
    </div>
  );
}
