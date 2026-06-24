## 1. 构建系统概述
本项目采用 **Next.js (v15)** 作为核心构建与运行框架，基于 **React 19** 和 **TypeScript**。构建过程完全依赖 Next.js 内置的 CLI 工具链，未引入额外的构建脚本（如 Makefile）或容器化配置（如 Dockerfile）。

### 核心技术栈
- **框架**: Next.js 15.4.4 (App Router)
- **语言**: TypeScript 5.8
- **样式**: Tailwind CSS v4 + PostCSS
- **3D 引擎**: Three.js + @react-three/fiber/drei
- **包管理**: npm (通过 `package-lock.json` 锁定版本)

## 2. 关键配置文件
构建逻辑分散在以下标准配置文件中：

- **`package.json`**: 定义了项目的生命周期脚本。
  - `dev`: 启动开发服务器 (`next dev`)，并禁用遥测。
  - `build`: 执行生产环境构建 (`next build`)，生成静态资源和服务端代码。
  - `start`: 启动生产服务器 (`next start`)。
- **`next.config.ts`**: Next.js 的核心配置。目前启用了 `reactStrictMode` 并配置了 `transpilePackages: ["three"]`，以确保 Three.js 库在 Next.js 环境中正确编译和兼容。
- **`tsconfig.json`**: TypeScript 编译器配置。启用了严格模式 (`strict: true`)，配置了路径别名 `@/*` 指向 `./src/*`，并集成了 Next.js 插件以支持类型检查。
- **`postcss.config.mjs`**: 配置了 `@tailwindcss/postcss` 插件，用于处理 Tailwind CSS v4 的样式构建。

## 3. 架构与约定
### 目录结构与构建产物
- **源码位置**: 所有业务逻辑位于 `src/` 目录下。
  - `src/app/`: 遵循 Next.js App Router 规范，包含页面路由和布局。
  - `src/experiments/`: 存放具体的 3D 实验场景组件（`*-scene.tsx`）和页面包装器（`*-page.tsx`）。
- **构建输出**: 执行 `npm run build` 后，产物默认生成在 `.next/` 目录中。该目录包含服务端渲染所需的服务器块、静态资源缓存以及类型定义。

### 依赖管理
- 使用 `npm` 进行依赖安装和管理。
- `package-lock.json` 确保了团队间依赖版本的一致性。
- `overrides` 字段在 `package.json` 中用于强制指定 `postcss` 版本，解决潜在的依赖冲突。

## 4. 开发者指南
### 本地开发流程
1. **环境准备**: 确保安装 Node.js 18+ 和 npm。
2. **安装依赖**: 运行 `npm install`。
3. **启动开发**: 运行 `npm run dev`，访问 `http://localhost:3000`。
4. **代码规范**: 
   - 使用 TypeScript 函数式组件。
   - 文件命名采用 kebab-case，组件命名采用 PascalCase。
   - 新增实验需在 `src/data/experiments.ts` 注册元数据，并在 `src/app/experiments/` 和 `src/experiments/` 下创建对应文件。

### 构建与部署
- **生产构建**: 运行 `npm run build` 进行预渲染和代码优化。
- **部署方式**: 项目未提供特定的 CI/CD 配置文件（如 GitHub Actions 或 Dockerfile）。通常此类 Next.js 项目可部署于 Vercel、Netlify 或支持 Node.js 的云服务器。部署前务必执行 `npm run build` 确保无编译错误。

### 注意事项
- **Three.js 兼容性**: 由于配置了 `transpilePackages: ["three"]`，在升级 Three.js 相关依赖时需特别注意构建日志，确保没有模块解析错误。
- **静态资源**: 公共静态文件（如 3D 模型）应放置在 `public/` 目录下，构建时会自动复制到输出目录。