## 1. 系统概述
该项目采用 **Next.js** 框架的默认配置体系，结合 **TypeScript** 进行类型安全的配置管理。整体配置策略呈现为“轻量级”和“静态化”特征：
- **构建配置**：通过 `next.config.ts` 进行极简的框架层配置。
- **环境配置**：未检测到显式的环境变量（`.env`）使用逻辑，应用行为主要依赖代码内常量或客户端状态。
- **业务配置**：核心实验数据、分类及元数据以静态 TypeScript 数组形式存在于 `src/data/experiments.ts` 中，充当了应用的“内容配置中心”。
- **国际化配置**：采用自定义的 React Context (`LocaleProvider`) 配合 JSON 字典文件实现多语言支持，而非依赖复杂的 i18n 路由中间件。

## 2. 关键文件与职责
| 文件路径 | 职责描述 |
| :--- | :--- |
| `next.config.ts` | Next.js 框架入口配置，定义了严格模式及第三方包转译规则。 |
| `package.json` | 定义项目依赖、脚本命令及版本覆盖（overrides）。 |
| `src/data/experiments.ts` | **核心业务配置**。定义了所有 3D 实验的元数据（ID、标题、分类、难度、描述等），是驱动页面路由和内容展示的核心数据源。 |
| `src/lib/i18n/locales.ts` | 国际化基础配置，定义支持的语言列表及默认语言。 |
| `src/lib/i18n/locale-context.tsx` | 国际化运行时逻辑，处理语言切换、本地存储持久化及字典加载。 |
| `src/app/layout.tsx` | 全局布局配置，包含 SEO 元数据（Metadata）、视口设置及结构化数据（JSON-LD）。 |

## 3. 架构与设计决策
### 3.1 静态数据驱动 (Static Data-Driven)
应用没有采用后端 API 或动态 CMS 来获取实验列表，而是直接在 `src/data/experiments.ts` 中硬编码了所有实验的配置。这种设计简化了部署架构，提高了首屏加载性能，但要求新增实验时必须修改代码并重新构建。

### 3.2 客户端状态持久化
国际化配置（`locale-context.tsx`）展示了典型的客户端配置管理模式：
- **初始化**：优先从 `localStorage` 读取用户偏好。
- **回退机制**：若无本地存储，则使用 `defaultLocale`。
- **同步更新**：切换语言时同步更新 `document.documentElement.lang` 属性以符合无障碍标准。

### 3.3 框架约定优于配置
项目遵循 Next.js 15+ 的 App Router 约定。例如，路由结构直接映射到 `src/app` 目录下的文件夹结构，无需额外的路由配置文件。SEO 配置直接通过 `export const metadata` 在布局文件中声明，利用了 Next.js 的静态生成能力。

## 4. 开发者规范与建议
1. **新增实验配置**：若需添加新的 3D 实验，必须在 `src/data/experiments.ts` 的 `experiments` 数组中添加对应的元数据对象，并确保 `id` 与 `src/experiments/` 下的组件文件名保持一致。
2. **环境变量使用**：目前代码中未发现 `process.env` 的使用。若未来需要接入 API 密钥或区分开发/生产环境行为，应创建 `.env.local` 文件，并通过 `next.config.ts` 或直接在组件中通过 `process.env.NEXT_PUBLIC_*` 访问。
3. **国际化扩展**：新增翻译词条时，需同时在 `src/lib/i18n/dictionaries/en.json` 和 `zh-CN.json` 中保持键值对同步，以避免运行时出现 undefined 错误。
4. **配置类型安全**：所有配置数据（如实验分类、难度等级）均使用了 TypeScript 的 `const` 断言或联合类型，开发时应严格遵循这些类型定义，避免硬编码字符串导致的类型不匹配。