## 1. 核心样式体系
本项目采用 **Tailwind CSS v4** 作为主要的原子化 CSS 框架，配合原生 **CSS 自定义属性 (CSS Variables)** 实现全局主题管理。样式架构遵循“实用优先”原则，绝大多数 UI 组件通过 `className` 直接应用 Tailwind 工具类，同时利用 `globals.css` 定义设计令牌（Design Tokens）和全局基础样式。

### 技术栈组合
- **CSS 框架**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **动画库**: Framer Motion (用于复杂的交互动画、页面过渡)
- **图标库**: Lucide React
- **字体**: Inter (Google Fonts)
- **3D 渲染**: Three.js / React Three Fiber (Canvas 元素独立于 DOM 样式流，但受容器控制)

## 2. 主题与设计令牌 (Design Tokens)
项目在 `src/app/globals.css` 中定义了完整的深色/浅色模式设计令牌，通过 `.light` 类名切换主题。

### 颜色系统
- **深色模式 (默认)**: 
  - 背景: `--bg-primary: #0a0a1a` (深蓝黑), `--bg-card: #1a1a3e`
  - 文本: `--text-primary: #e8e8ff`, `--text-secondary: #a0a0c8`
  - 强调色: Blue (`#4f8fff`), Purple (`#8b5cf6`), Cyan (`#06d6a0`)
- **浅色模式**:
  - 背景: `--bg-primary: #f8f9fc` (灰白), `--bg-card: #ffffff`
  - 文本: `--text-primary: #111827`, `--text-secondary: #4b5563`

### 视觉效果令牌
- **光晕 (Glow)**: 定义了 `--glow-blue`, `--glow-purple` 等阴影变量，用于营造科技感。
- **玻璃拟态 (Glassmorphism)**: `.glass` 类是核心 UI 容器样式，使用 `backdrop-filter: blur(12px)` 和半透明背景，在深色模式下呈现磨砂玻璃效果，浅色模式下增加饱和度。
- **阴影与过渡**: 统一定义了 `shadow-sm/md/lg` 和 `transition-fast/base/slow`。

## 3. 布局与响应式策略
- **布局**: 基于 Flexbox 和 Grid。首页实验卡片使用 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` 实现自适应网格。
- **Canvas 处理**: 3D 实验场景强制填满视口或容器 (`width: 100vw; height: 100vh`)，并通过 `.canvas-container` 确保相对定位上下文。
- **移动端适配**: 
  - 导航栏在移动端隐藏分类链接，保留汉堡菜单或简化导航。
  - 信息面板在移动端限制最大高度并允许滚动 (`max-height: 50vh; overflow-y: auto`)。
  - 隐藏滚动条工具类 `.scrollbar-hide` 用于保持界面整洁。

## 4. 开发规范与约定
1. **主题切换**: 通过切换 `<html>` 或 `<body>` 上的 `.light` 类名实现。状态持久化在 `localStorage`。
2. **组件样式**: 
   - 优先使用 Tailwind 类名。
   - 复杂动态样式（如根据实验类别改变边框颜色）使用内联 `style` 属性结合 CSS 变量或 JS 计算值。
   - 通用 UI 模式（如卡片、按钮）应复用 `.glass` 类。
3. **动画**: 
   - 简单 hover 效果使用 Tailwind 的 `transition-all`, `hover:scale-105`。
   - 复杂入场动画使用 `framer-motion` 的 `initial`, `animate`, `whileInView`。
   - 关键帧动画（如脉冲光晕）在 `globals.css` 中定义 (`@keyframes pulse-glow`)。
4. **字体**: 统一使用 'Inter' 字体族，确保跨平台一致性。
5. **无障碍**: 定义了 `:focus-visible` 样式，使用紫色轮廓线 (`--accent-purple`) 提高键盘导航可见性。