# PhysLab 3D

3D 交互物理实验平台，包含用户端、管理端与统一后端 API。

基于 [ScienceLab 3D](https://github.com/rudra496/sciencelab3d) 二次开发。

## 项目简介

| 应用  | 目录               | 端口   | 角色                       |
| --- | ---------------- | ---- | ------------------------ |
| 用户端 | `frontend-user`  | 3000 | 浏览与操作 3D 物理实验；注册/登录、个人资料 |
| 管理端 | `frontend-admin` | 3001 | 后台登录与运营首页（当前为壳，业务功能待扩展）  |
| 后端  | `backend`        | 8080 | 用户端与管理端共用 API 服务         |

**技术栈**

| 模块   | 技术                                      |
| ---- | --------------------------------------- |
| 用户端  | Next.js 15 · React 19 · Three.js        |
| 管理端  | Next.js 15 · React 19 · 纯 CSS           |
| 后端   | Spring Boot 3.5 · JDK 17 · MyBatis-Plus |
| 数据库  | PostgreSQL 16                           |
| 对象存储 | MinIO（用户头像）                             |

## 架构

```
phys-lab-3d/
├── backend/                 # Spring Boot API
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-local.yml   # 本地连接配置（数据库、MinIO）
│       └── schema/                 # SQL 迁移脚本
├── frontend-user/           # 3D 实验 + 用户中心
├── frontend-admin/          # 管理后台
├── admin-design.html        # 管理端 UI 设计稿（Shopify 事务型风格）
├── DESIGN-shopify.md        # 管理端设计 token 说明
├── DESIGN-spacex.md         # 用户端部分页面参考风格
└── PROMPT-admin.md          # 管理端开发提示词（架构与交付范围）
```

## 环境准备

### 前置依赖

- **JDK 17**、**Maven 3.9+**
- **Node.js 20+**、npm
- **Docker**（推荐，用于 PostgreSQL 与 MinIO）

### PostgreSQL

```powershell
cd D:\docker-home\postgresql-16
mkdir data -ErrorAction SilentlyContinue

docker run -d `
  --name postgresql-16 `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  -v ${PWD}/data:/var/lib/postgresql/data `
  --restart unless-stopped `
  postgres:16
```

连接信息：`localhost:5432`，用户/密码 `postgres` / `postgres`。

创建项目库并执行迁移：

```sql
CREATE DATABASE phys_lab_3d;
\c phys_lab_3d
```

按顺序执行 `backend/src/main/resources/schema/` 下的脚本：

1. `001_create_users.sql` — 用户表
2. `002_create_admins.sql` — 管理员表（含默认账号种子）

默认管理员：`admin` / `admin123`（见 `002_create_admins.sql`）。

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

## 启动

确保 PostgreSQL、MinIO 已运行，且 schema 已迁移。

```powershell
# 1. 后端
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
