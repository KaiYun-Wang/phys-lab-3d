# PhysLab 3D

3D 交互物理实验平台（用户端 + 后端）。

基于 [ScienceLab 3D](https://github.com/rudra496/sciencelab3d) 二次开发改造，增加了用户系统、后端 API 等能力。

## 版本

| 模块 | 技术栈 |
|------|--------|
| 用户端 `frontend-user` | Next.js 15 · React 19 · Three.js |
| 后端 `backend` | Spring Boot 3.5.16 · JDK 17 · MyBatis-Plus 3.5.9 |
| 数据库 | PostgreSQL 16 |
| 对象存储 | MinIO（头像） |

## PostgreSQL（Docker）

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

- 默认连接：`localhost:5432`，用户/密码 `postgres` / `postgres`
- 项目库名：`phys_lab_3d`（需自行创建）

## MinIO（Docker）

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

- 控制台：http://localhost:9001 ，账号/密码 `minioadmin` / `minioadmin`
- 创建 Bucket：`phys-lab`
- 后端配置见 `backend/src/main/resources/application-local.yml`
