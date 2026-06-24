## 1. 依赖管理系统
本项目采用 **npm** 作为包管理器，配合 **package-lock.json** (lockfileVersion 3) 进行严格的版本锁定。项目基于 **Next.js 15** 框架构建，使用 **React 19** 和 **Three.js** 生态进行 3D 可视化开发。

## 2. 核心依赖与工具
- **核心框架**: `next` (^15.4.4), `react` (^19.0.0), `react-dom` (^19.0.0)
- **3D 渲染引擎**: `three` (^0.184.0) 及其 React 封装库 `@react-three/fiber` (^9.1.0) 和 `@react-three/drei` (^10.0.0)。
- **UI 与交互**: `framer-motion` (动画), `leva` (调试面板), `lucide-react` (图标)。
- **国际化**: `next-intl` (^4.13.0) 用于多语言支持。
- **样式系统**: `tailwindcss` (^4.0.0) 配合 `@tailwindcss/postcss`。
- **开发工具**: `typescript` (^5.8.0), `cross-env` (跨平台环境变量设置)。

## 3. 架构与约定
- **私有项目声明**: `package.json` 中设置 `"private": true`，防止意外发布到公共 npm 仓库。
- **版本覆盖 (Overrides)**: 通过 `overrides` 字段强制指定 `postcss` 版本为 `^8.5.15`，以解决潜在的依赖冲突或确保 Tailwind CSS v4 的兼容性。
- **Next.js 配置**: 在 `next.config.ts` 中配置了 `transpilePackages: ["three"]`，确保 Three.js 库在 Next.js 环境中能被正确转译和打包。
- **脚本规范**: 
  - `dev`: 使用 `cross-env` 禁用 Next.js 遥测 (`NEXT_TELEMETRY_DISABLED=1`) 并启动开发服务器。
  - `build`: 执行生产环境构建。
  - `start`: 启动生产服务器。

## 4. 开发者准则
- **版本同步**: 修改 `package.json` 后必须运行 `npm install` 以更新 `package-lock.json`，确保团队环境一致。
- **依赖添加**: 使用 `npm install <package>` 添加运行时依赖，使用 `npm install -D <package>` 添加开发依赖。
- **3D 库维护**: 由于 `three`, `@react-three/fiber`, `@react-three/drei` 之间存在紧密的版本对应关系，升级时需查阅官方文档确保兼容性。
- **锁文件管理**: 严禁手动编辑 `package-lock.json`，应始终通过 npm 命令进行管理。