# 伯努利原理 - 文丘里管物理仿真实验开发计划

## 1. 摘要

在现有 **ScienceLab 3D** 项目中新增一个物理实验：**伯努利原理（文丘里管）**。实验以水平变径圆管为演示载体，通过 Three.js 实时渲染管道变形、流体粒子运动、两根直立测压管内蓝色液面高度变化，并在浮动控制面板与数据面板中实时展示 `v₂`、`ΔP` 等计算结果。全部 UI 与场景标注使用中文。

## 2. 现状分析

### 2.1 项目架构

- **框架**：Next.js 15 + React 19 + TypeScript + Tailwind CSS v4
- **3D 栈**：Three.js r184 + `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing`
- **实验目录结构**（已确认）：
  - 主页面组件：`src/experiments/<id>-page.tsx`
  - 3D 场景组件：`src/experiments/<id>-scene.tsx`
  - 路由入口：`src/app/experiments/<id>/page.tsx`
  - 详情页：`src/app/experiments/<id>/details/page.tsx`
  - 实验注册：`src/data/experiments.ts`
  - 中文翻译：`src/lib/i18n/dictionaries/zh-CN.json`

### 2.2 可参考的现有实现

- **双缝实验** `src/experiments/double-slit-page.tsx` / `double-slit-scene.tsx`：使用 `ExperimentContainer + FloatingControlPanel + SimulationController + DataPanel` 组合，是本实验 UI 布局的主要参考。
- **气体定律** `src/experiments/gas-laws-scene.tsx`：展示了 `InstancedMesh` 粒子系统与 `useFrame` 动画更新模式，可直接借鉴用于流体粒子模拟。
- **通用控件** `src/components/experiment-ui/ExperimentControls.tsx`：提供 `ControlSlider`、`ControlPresetButtons`、`DataGrid` 等，无需新增 UI 组件。

### 2.3 物理工具函数

`src/utils/physics.ts` 已提供通用数学函数（`lerp`、`clamp`、`mapRange` 等），可用于液面平滑过渡与粒子位置插值。

## 3. 变更方案

### 3.1 新增文件

#### 3.1.1 `src/experiments/bernoulli-venturi-page.tsx`

实验主页面，负责状态管理、控件布局与数据展示。

- **状态**：
  - `v1`：入口流速，默认 `2.0`，范围 `0~5 m/s`
  - `areaRatio`：截面积比 `A₂/A₁`，默认 `0.5`，范围 `0.2~2.0`
  - `fluid`：流体介质，默认 `"water"`，可选 `"air"` / `"water"` / `"glycerol"`
  - `isPlaying`、`simulationSpeed`、`resetTrigger`：播放控制
  - `data`：来自场景组件的实时计算数据
  - `showDataPanel`：数据面板显隐

- **物理计算（页面层，用于展示）**：
  - `v2 = v1 / areaRatio`
  - `rho = { air: 1.2, water: 1000, glycerol: 1260 }`
  - `deltaP = 0.5 * rho * (v2² - v1²)`

- **UI 结构**：
  - 使用 `ExperimentContainer` 作为 3D 画布容器
  - 使用 `FloatingControlPanel` 放置参数控件（参考双缝实验）
  - 使用 `SimulationController` 放置播放/重置/速度控制
  - 使用 `DataPanel` 展示实时数据与公式说明
  - 控件分组：
    - **流体参数**：入口流速滑块、截面积比滑块
    - **流体介质**：三个预设按钮（空气 / 水 / 甘油）
  - 数据面板：
    - `DataGrid` 展示 `v1`、`v2`、`ΔP`、`ρ`
    - 公式说明区：连续性方程、伯努利方程、压强差公式
    - 状态说明：根据 `ΔP` 正负显示“收缩管：左侧液面高于右侧”或“扩张管：右侧液面高于左侧”

#### 3.1.2 `src/experiments/bernoulli-venturi-scene.tsx`

Three.js 场景组件，负责管道建模、测压管液面、粒子系统与实时数据回传。

- **接口**：
  ```ts
  interface BernoulliVenturiSceneProps {
    v1?: number;
    areaRatio?: number;
    fluid?: "air" | "water" | "glycerol";
    isPlaying?: boolean;
    simulationSpeed?: number;
    resetTrigger?: number;
    onDataChange?: (data: BernoulliData) => void;
  }

  export interface BernoulliData {
    v1: number;
    v2: number;
    areaRatio: number;
    rho: number;
    deltaP: number;
  }
  ```

- **管道建模**：
  - 管道沿 X 轴水平放置，长度约 `16` 单位，中心在 `(0,0,0)`。
  - 入口段（左侧）半径 `r1 = 1.5`，出口段（右侧）半径 `r2 = r1 * sqrt(areaRatio)`。
  - 中间过渡段长度约 `6`，使用 `CatmullRomCurve3` 生成中心轴线上半径变化的曲线，再用 `TubeGeometry` 或自定义 `LatheGeometry` 生成平滑变径圆管。
  - 管道材质：半透明蓝色玻璃质感（`meshPhysicalMaterial`，`transmission`/`roughness`/`transparent`）。
  - 管道外形随 `areaRatio` 变化时重新生成几何体；通过 `useMemo` 避免不必要的重算。

- **测压装置**：
  - 在入口段（`x = -5`）和出口段（`x = 5`）正上方各安装一根透明直立测压管。
  - 测压管为竖直圆柱，高度约 `6`，半径 `0.4`，材质为透明玻璃。
  - 管内蓝色液体使用圆柱体表示，液面高度 `h` 与静压成正比：
    - 取基准压强 `P0`，令 `P1 = P0 + 0.5*rho*(vRef² - v1²)`，避免负高度。
    - `h1 = baseHeight + scale * P1`
    - `h2 = baseHeight + scale * P2`
    - 或者更直观：以 `ΔP` 为基准，将 `h1` 固定为某一高度，`h2 = h1 - ΔP * scale`，保证收缩时右侧液面下降、扩张时右侧液面上升。
  - 参数变化时，使用 `lerp` 在 `useFrame` 中平滑过渡液面高度与液体圆柱缩放，避免跳变。

- **流体粒子模拟**：
  - 使用 `InstancedMesh` 创建约 `200` 个粒子小球。
  - 每个粒子沿管道中心轴线的参数 `t ∈ [0,1]` 运动，`t=0` 为入口，`t=1` 为出口。
  - 当地截面积由沿管道的半径插值函数 `radiusAt(t)` 给出，流速 `v(t) = v1 * (r1 / radiusAt(t))²`。
  - 每帧更新：`t += v(t) * dt * simulationSpeed / pipeLength`。
  - 粒子离开出口后重置到入口，并带一点随机径向偏移（在管道截面内均匀分布），避免所有粒子重叠。
  - 粒子颜色根据速度映射：低速偏蓝、高速偏红/白。

- **实时数据回传**：
  - 在 `useEffect` 或 `useFrame` 中当 `v1`、`areaRatio`、`fluid` 变化时，通过 `onDataChange` 回传 `BernoulliData`。

- **场景装饰**：
  - 地面与网格（与双缝/气体实验一致）。
  - 适当的灯光与阴影。
  - 在管道上方或旁边添加中文标注："入口截面 1"、"出口截面 2"。

#### 3.1.3 `src/app/experiments/bernoulli-venturi/page.tsx`

Next.js 路由包装：

```tsx
import BernoulliVenturiPage from "@/experiments/bernoulli-venturi-page";
export const dynamic = 'force-dynamic';
export default function BernoulliVenturiRoute() { return <BernoulliVenturiPage />; }
export const metadata = { title: "伯努利原理 - 文丘里管 - Interactive Physics Lab", description: "..." };
```

#### 3.1.4 `src/app/experiments/bernoulli-venturi/details/page.tsx`

详情页，包含：

- 实验简介
- 核心公式（连续性方程、伯努利方程、压强差公式）
- 关键概念（流速与压强的反比关系、文丘里效应应用）
- 操作说明
- 返回实验按钮

### 3.2 修改文件

#### 3.2.1 `src/data/experiments.ts`

在 PHYSICS 分类下新增实验元数据：

```ts
{
  id: "bernoulli-venturi",
  title: "Bernoulli's Principle (Venturi Tube)", // 注册表保留英文标题
  category: "physics",
  difficulty: "Intermediate",
  description: "Explore Bernoulli's principle with a Venturi tube. Adjust flow speed and cross-sectional area to see how pressure changes with fluid velocity.",
  icon: "💨",
  color: "#4f8fff",
  topics: ["Bernoulli", "Continuity", "Pressure", "Fluid Dynamics"],
},
```

#### 3.2.2 `src/lib/i18n/dictionaries/zh-CN.json`

在 `experiments` 对象中新增：

```json
"bernoulli-venturi": {
  "title": "伯努利原理（文丘里管）",
  "description": "通过文丘里管探索伯努利原理：调节流速与截面积，观察流速与压强的反比关系。",
  "topics": ["伯努利方程", "连续性方程", "压强", "流体力学"]
}
```

## 4. 假设与决策

1. **物理单位**：使用 SI 单位，但在 UI 中简化展示（`m/s`、`kg/m³`、`Pa`）。压强差 `ΔP` 数值可能较大（水在 `v1=2`、`A₂/A₁=0.5` 时约 `3000 Pa`），直接展示 `Pa` 并保留两位小数。
2. **压强基准**：测压管液面高度不展示绝对压强，而是展示相对压强差。决策采用“入口液面高度作为基准，出口液面根据 `ΔP` 偏移”的方式，保证视觉上能清晰体现收缩/扩张差异。
3. **管道形状**：使用基于 `CatmullRomCurve3` 的半径插值生成平滑变径管，支持 `areaRatio < 1`（收缩）和 `areaRatio > 1`（扩张）两种状态。
4. **粒子数量**：默认 `200` 个，既能体现流动感又保证性能。粒子速度严格按当地截面积反比计算，符合连续性方程。
5. **UI 语言**：控件标签、数据面板说明、场景标注全部使用中文，与注册表英文标题并存（注册表保持英文以兼容现有 `experiments.ts` 结构）。
6. **不修改现有实验**：本次只新增文件与注册信息，不改动其他实验。

## 5. 验证步骤

1. **路由可访问**：启动 `npm run dev` 后，访问 `/experiments/bernoulli-venturi`，页面正常加载无白屏。
2. **3D 场景**：
   - 管道水平放置，入口/出口半径随 `A₂/A₁` 滑块实时变化。
   - 收缩管（`A₂/A₁ < 1`）中间变细；扩张管（`A₂/A₁ > 1`）中间变粗。
3. **粒子行为**：粒子在细管段移动更快，粗管段移动更慢；粒子循环移动无卡顿。
4. **测压管液面**：
   - 收缩管：左侧液面高于右侧，`ΔP > 0`。
   - 扩张管：右侧液面高于左侧，`ΔP < 0`。
   - 参数变化时液面平滑过渡，无跳变。
5. **数据面板**：
   - `v2 = v1 / (A₂/A₁)` 计算正确，保留两位小数。
   - `ΔP = 0.5 * ρ * (v2² - v1²)` 计算正确，符号与液面高度一致。
   - 切换空气/水/甘油时，`ρ` 与 `ΔP` 同步更新。
6. **仿真控制**：播放/暂停、重置、速度调节功能正常。
7. **详情页**：`/experiments/bernoulli-venturi/details` 内容完整，返回按钮可用。
8. **首页入口**：首页物理分类下出现新实验卡片，标题与描述显示中文翻译。
9. **构建检查**：运行 `npm run build` 无 TypeScript 错误与构建失败。
