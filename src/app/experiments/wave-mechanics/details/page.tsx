"use client";

import Link from "next/link";

export default function WaveMechanicsDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-blue-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-blue-400">横波与纵波</h1>
            <p className="text-sm text-gray-400 mt-1">实验原理</p>
          </div>
          <Link
            href="/experiments/wave-mechanics"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            ← 返回实验
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4">实验简介</h2>
          <p className="text-gray-300 leading-relaxed">
            波可以在介质中传播能量，但介质质点本身并不随波整体迁移。根据质点振动方向与波传播方向的关系，波分为
            <strong className="text-blue-300">横波</strong>和
            <strong className="text-orange-300">纵波</strong>两类。
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <strong className="text-blue-300">横波</strong>中，质点振动方向垂直于传播方向，例如绳上的波、水面的波。
            波峰与波谷交替出现，视觉上表现为上下（或左右）往复运动。
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <strong className="text-orange-300">纵波</strong>中，质点振动方向与传播方向平行，例如声波在空气中的传播。
            介质出现周期性的疏密（压缩与稀疏）区域，能量沿传播方向传递。
          </p>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4">核心公式</h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">y = A·sin(kx − ωt)</code>
              <p className="text-xs text-gray-400 mt-2">横波位移（垂直于传播方向）</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">Δx = A·sin(kx − ωt)</code>
              <p className="text-xs text-gray-400 mt-2">纵波位移（沿传播方向）</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">v = fλ = ω/k</code>
              <p className="text-xs text-gray-400 mt-2">波速、频率、波长之间的关系</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <code className="text-cyan-300 font-mono">ρ = d₀/dᵢ</code>
              <p className="text-xs text-gray-400 mt-2">纵波局部压缩度（大于 1 为密区，小于 1 为疏区）</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4">横波与纵波的对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="py-2 pr-4 text-blue-300">对比项</th>
                  <th className="py-2 pr-4 text-blue-300">横波</th>
                  <th className="py-2 text-orange-300">纵波</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">振动方向</td>
                  <td className="py-2 pr-4">⊥ 传播方向</td>
                  <td className="py-2">∥ 传播方向</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">典型实例</td>
                  <td className="py-2 pr-4">绳波、电磁波</td>
                  <td className="py-2">声波、弹簧疏密波</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">主要视觉特征</td>
                  <td className="py-2 pr-4">波峰 / 波谷</td>
                  <td className="py-2">密区 / 疏区</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-blue-400 mb-4">操作说明</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>调节频率、振幅、波长，两侧波形同步变化，波速 v = fλ 自动联动。</li>
            <li>默认「对比」模式：左侧横波（蓝紫色），右侧纵波（橙粉色）。</li>
            <li>暂停后可观察青色相位线在两侧的同步位置。</li>
            <li>点击质点可在数据面板查看该点的位移或压缩度变化曲线。</li>
            <li>可切换「横波」「纵波」「叠加」等视图模式深入观察。</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
