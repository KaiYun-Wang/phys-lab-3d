# PhysLab 3D

3D 交互物理实验平台，包含用户端、管理端与统一后端 API。

基于 [ScienceLab 3D](https://github.com/rudra496/sciencelab3d) 二次开发。

## 项目简介

| 应用 | 目录 | 端口 | 角色 |
| --- | --- | --- | --- |
| 用户端 | `frontend-user` | 3000 | 浏览与操作 3D 物理实验；注册/登录、个人资料、收藏、评论、AI 助手 |
| 管理端 | `frontend-admin` | 3001 | 实验/学科/收藏/评论运营；知识库上传；AI 试聊 |
| 后端 | `backend` | 8080 | 用户端与管理端共用 API 服务 |

**技术栈**

| 模块 | 技术 |
| --- | --- |
| 用户端 | Next.js 15 · React 19 · Three.js |
| 管理端 | Next.js 15 · React 19 · 纯 CSS |
| 后端 | Spring Boot 3.5 · JDK 17 · MyBatis-Plus · LangChain4j |
| 数据库 | PostgreSQL 16 + pgvector |
| 对象存储 | MinIO（用户头像、实验封面） |

## 架构

```
phys-lab-3d/
├── backend/                 # Spring Boot API
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-example.yml # 本地配置模板（复制为 application-local.yml）
│       ├── application-local.yml   # 本地密钥/连接（gitignore，勿提交）
│       └── schema/                 # 建表 / 种子 SQL
├── frontend-user/           # 3D 实验 + 用户中心
├── frontend-admin/          # 管理后台
├── knowledge-base/          # 知识库测试文档（可管理端上传）
├── admin-design.html        # 管理端 UI 设计稿
├── comment-design.html      # 实验侧栏 / 评论设计稿
└── DESIGN-*.md              # 设计说明（可选参考）
```

## 环境准备

### 前置依赖

- **JDK 17**、**Maven 3.9+**
- **Node.js 20+**、npm
- **Docker**（推荐，用于 PostgreSQL 与 MinIO）

### PostgreSQL

```powershell
mkdir data -ErrorAction SilentlyContinue

docker run -d `
  --name postgresql-16 `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  -v ${PWD}/data:/var/lib/postgresql/data `
  --restart unless-stopped `
  pgvector/pgvector:pg16
```

连接：`localhost:5432`，用户/密码 `postgres` / `postgres`。库名与本地配置一致即可（默认 `phys_lab_3d`）。

### 数据库脚本

目录：`backend/src/main/resources/schema/`，按顺序执行：

1. `phys_lab_3d.sql` — 建表  
2. `seed_data.sql` — 种子数据  
3. `dashboard_demo_seed.sql` - 一些用户行为数据

默认管理员：`admin` / `admin123`。

### MinIO

```powershell
cd D:\docker-home\minio-2025-09-07
mkdir data -ErrorAction SilentlyContinue

docker run -d `
  --name minio-2025-09-07 `
  -e MINIO_ROOT_USER=minioadmin `
  -e MINIO_ROOT_PASSWORD=minioadmin `
  -p 9000:9000 `
  -p 9001:9001 `
  -v ${PWD}/data:/data `
  --restart unless-stopped `
  minio/minio:RELEASE.2025-09-07T16-13-09Z server /data --console-address ":9001"
```

- 控制台：http://localhost:9001（`minioadmin` / `minioadmin`）
- 创建 Bucket：`phys-lab`

本地后端配置：复制 `application-example.yml` 为 `application-local.yml` 后按文件内注释填写。
`knowledge-base/` 下有知识库文档，管理端「知识库」上传即可。

## 启动

确保 PostgreSQL、MinIO 已运行，且已按上面顺序执行 SQL。

```powershell
# 1. 后端 → http://localhost:8080
cd backend
mvn spring-boot:run

# 2. 用户端 → http://localhost:3000
cd frontend-user
npm install
npm run dev

# 3. 管理端 → http://localhost:3001
cd frontend-admin
npm install
npm run dev
```

管理端使用种子账号 `admin` / `admin123` 登录；用户端可在页面注册新用户。
