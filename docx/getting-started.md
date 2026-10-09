# PhysLab 3D 本地启动

在本地把项目跑起来的步骤；项目介绍见 [README](../README.md)。

> 基础设施命令为 Linux 写法（续行符 `\`）；Windows PowerShell 下把续行符换成反引号即可。

## 一、环境要求

| 项目 | 版本 |
| --- | --- |
| JDK | 17 |
| Maven | 3.9+ |
| Node.js | 20+ |
| PostgreSQL | 16 |
| Redis | 7 |
| MinIO | RELEASE.2025-09-07 |

## 二、基础设施（PostgreSQL / MinIO / Redis）

用 Docker 可参考以下命令。

```bash
# PostgreSQL（连接：localhost:5432，postgres / postgres；建库 phys_lab_3d）
docker run -d \
  --name postgres \
  --restart unless-stopped \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e TZ=Asia/Shanghai \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16

# MinIO（控制台 http://localhost:9001，minioadmin / minioadmin；登录后建 Bucket phys-lab）
docker run -d \
  --name minio \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin\
  -v minio_data:/data \
  quay.m.daocloud.io/minio/minio:RELEASE.2025-09-07T16-13-09Z server /data --console-address ":9001"

# Redis
docker run -d \
  --name redis \
  --restart unless-stopped \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7.4.11-alpine \
```

## 三、数据库

`backend/src/main/resources/schema/` 下按顺序执行：

1. `phys_lab_3d.sql` — 建表
2. `seed_data.sql` — 种子数据（含默认管理员 `admin` / `admin123`）
3. `dashboard_demo_seed.sql` — 数据面板演示数据（可选）

## 四、启动

### 后端

复制 `backend/src/main/resources/application-example.yml` 为 `application-aliyun.yml`，按文件内注释填写。

```powershell
cd backend
mvn spring-boot:run
```

### 用户端 / 管理端

```powershell
cd frontend-user
npm install
npm run dev

cd frontend-admin
npm install
npm run dev
```
