该仓库（STEM 3D 仿真实验平台）是一个基于 Next.js 和 Three.js 的前端交互式应用，**没有建立统一的、系统级的错误处理架构**。错误处理主要表现为零散的、防御性的编程实践，缺乏全局错误边界（Error Boundaries）、自定义错误类型或集中的错误日志服务。

### 1. 核心策略：静默失败与防御性编程
代码中极少使用 `try...catch` 块，也未见 `throw new Error()` 的主动抛出模式。主要的错误处理逻辑集中在对浏览器 API（如 `localStorage`）的访问上，采用“尝试-捕获-回退”的模式，确保在存储不可用或数据损坏时应用不会崩溃。

*   **LocalStorage 安全访问**：在 `src/app/page.tsx` 中，读取用户收藏状态时使用了 `try...catch` 块。如果解析 JSON 失败（例如数据损坏），则捕获异常并返回空数组 `[]`，防止页面渲染中断。
    ```typescript
    function getFavorites(): string[] {
      if (typeof window === "undefined") return [];
      try {
        return JSON.parse(localStorage.getItem("favorites") || "[]");
      } catch {
        return []; // 静默失败，回退到默认值
      }
    }
    ```

### 2. 路由与 UI 错误呈现
*   **404 处理**：项目实现了自定义的 `not-found.tsx` 页面。当用户访问不存在的路由（如未定义的实验 ID）时，Next.js 会自动渲染此组件。该组件提供了友好的 UI 提示（"Experiment Not Found"）和导航链接，属于用户体验层面的错误恢复，而非技术层面的异常捕获。
*   **缺失全局错误页**：未发现 `error.tsx` 或 `global-error.tsx` 文件。这意味着如果在 React 组件树中发生未捕获的运行时错误（Runtime Error），Next.js 将回退到其默认的开发者错误覆盖层（Dev Overlay）或生产环境的通用错误页，缺乏定制化的错误报告或重试机制。

### 3. 物理计算与业务逻辑
*   **无异常抛出**：在 `src/utils/physics.ts` 等核心计算模块中，函数直接执行数学运算。即使输入非法（如除以零、负数开方），代码也倾向于依赖 JavaScript 的原生行为（返回 `Infinity`、`NaN` 或 `null`），而不是抛出异常。例如，`calculateRefractionAngle` 在全反射发生时返回 `null`，调用方需自行检查返回值。
*   **隐式错误传播**：由于缺乏显式的错误类型定义，错误状态通常通过 `null` 或 `undefined` 在组件间传播，增加了调用方进行空值检查的负担。

### 4. 开发规范建议
鉴于当前现状，建议开发者遵循以下约定：
1.  **外部交互必包**：所有涉及 `localStorage`、网络请求（如有）或浏览器特有 API 的代码，必须包裹在 `try...catch` 中。
2.  **返回值契约**：纯计算函数应通过返回 `null` 或特定标志位来表示无效状态，避免抛出异常，以保持渲染循环的稳定性。
3.  **UI 容错**：在加载 3D 模型或复杂场景时，应在组件内部实现局部的错误状态管理（如 `useState` 标记 `hasError`），并在 UI 上显示降级内容，防止整个页面白屏。