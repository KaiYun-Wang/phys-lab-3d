# PhysLab 3D

3D 交互物理实验平台（用户端 + 后端）。

## 版本

| 模块 | 技术栈 |
|------|--------|
| 用户端 `frontend-user` | Next.js 15 · React 19 · Three.js |
| 后端 `backend` | Spring Boot 3.5.16 · JDK 17 · MyBatis-Plus 3.5.9 |
| 数据库 | PostgreSQL 16 |

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
