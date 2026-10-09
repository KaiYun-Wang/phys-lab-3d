<div align="center">

# PhysLab 3D

**浏览器里的交互式 3D 物理实验平台**

双缝干涉 · 光电效应 · 狭义/广义相对论 · 流体 · 声学

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1.svg)
![Redis](https://img.shields.io/badge/Redis-7-dc382d.svg)

</div>

---

## 项目简介

PhysLab 3D 是一个免费的 3D 交互物理实验平台：打开浏览器就能进入三维实验场景，调节参数、观察现象，随时向 AI 助手提问，也可以收藏实验、发表评论，和其他学习者交流讨论。

项目基于 [ScienceLab 3D](https://github.com/rudra496/sciencelab3d)（MIT）二次开发。

---

## 实验库

| 实验 | 主题 | 看点 |
| --- | --- | --- |
| 双缝实验 | 量子 | 单缝/双缝切换，干涉条纹与强度分布实时可视化 |
| 光电效应 | 量子 | 波长、光强、材料联动，观察截止电压与饱和光电流 |
| 凸透镜成像 | 光学 | 物距与焦距可调，特征光线与成像规律即时呈现 |
| 横波与纵波 | 波动 | 两波并列对比，波前、疏密区与相位关系一目了然 |
| 多普勒效应 | 声学 | 声源运动与观测频率变化实时联动 |
| 伯努利原理（文丘里管） | 流体力学 | 管径与流量变化下的压强分布 |
| 狭义相对论实验室 | 相对论 | 长度收缩、时间膨胀与相对论质量 |
| 广义相对论 · 史瓦西黑洞 | 相对论 | 弯曲时空、测地线轨道、引力透镜与引力红移 |

---

## 核心亮点

- **沉浸式 3D 实验** — 在可旋转、缩放的三维场景里亲手做实验，调节参数、观察现象，比二维示意图直观得多
- **AI 实验助手** — 随时提问、答疑；也可以让 AI 生成带语音讲解的实验演示
- **收藏与讨论** — 收藏感兴趣的实验，发表评论、为优质讨论点赞
- **内容运营后台** — 实验、学科、公告、知识库一站式维护
- **打开就能用** — 无需安装任何软件，免费开源、支持自行部署

---

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 用户端 | Next.js 15 · React 19 · Three.js / R3F · Framer Motion · Tailwind CSS |
| 管理端 | Next.js 15 · React 19 · 纯 CSS |
| 后端 | Spring Boot 3.5 · JDK 17 · MyBatis-Plus · LangChain4j |
| 存储 | PostgreSQL 16 · MinIO · Redis 7 |

---

## 快速开始

```powershell
# 后端 → http://localhost:8080（先准备 PostgreSQL / MinIO / Redis 并执行建表 SQL）
cd backend && mvn spring-boot:run

# 用户端 → http://localhost:3000
cd frontend-user && npm install && npm run dev

# 管理端 → http://localhost:3001（admin / admin123）
cd frontend-admin && npm install && npm run dev
```

环境准备与本地启动的详细步骤见 [Getting Started](docx/getting-started.md)。

---

## License

基于 [MIT License](LICENSE) 开源；3D 实验场景源自 [ScienceLab 3D](https://github.com/rudra496/sciencelab3d)（MIT），版权声明与衍生素源见 LICENSE。
