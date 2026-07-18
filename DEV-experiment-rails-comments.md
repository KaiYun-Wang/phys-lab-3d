# 开发文档：实验侧栏重构 · 评论 · 管理端运营能力

> 面向开发工程师的需求与实现说明。UI 交互以仓库根目录 `comment-design.html` 为准（浏览器直接打开预览）。  
> 表设计风格对齐 `backend/src/main/resources/schema/` 现有脚本。

---

## 1. 背景与目标

### 现状问题

| 区域 | 现状 | 问题 |
|------|------|------|
| 用户端实验页 | 多数实验用 `FloatingControlPanel`（可拖浮层）+ `DataPanel`（浮层）叠在 3D 画布上；`ExperimentContainer` 内另有一套 Controls/Data 覆盖层，两套并存 | 参数面板挡住画面；布局不统一 |
| 评论 | `experiments.comment_count` 已预留，无评论表 / API / UI | 无法讨论 |
| 管理端 | 已有实验、学科分类；收藏仅有用户端 API（`/api/users/me/favorites`），无后台管理；评论相关为零 | 运营无法审核与排查 |

### 本次交付目标

1. **重构实验页布局**：控制在左、数据/评论在右，推挤画布（非遮罩），侧栏可拖拽调宽。  
2. **上线评论**：用户发帖、回复、点赞；同步维护 `comment_count` / 评论 `like_count`。  
3. **管理端补齐**：收藏管理、评论管理、评论点赞管理。

---

## 2. 用户端 UI 重构（控制 / 数据）

### 2.1 交互规格（必须对齐设计稿）

参考：`comment-design.html`

| 侧栏 | 入口按钮位置 | 内容 | 互斥关系 |
|------|--------------|------|----------|
| **左栏 · 控制** | 画布左上 | 各实验参数控件（现有 `controls` / `FloatingControlPanel` 内的内容迁入） | 独立开关，可与右栏同时打开 |
| **右栏 · 数据** | 画布右上 | 实时读数（现有 `DataPanel` 内容迁入） | 与「评论」同属右栏，**互斥**（点数据开数据，点评论切评论） |
| **右栏 · 评论** | 画布右上（带评论数角标） | 评论列表 + 发帖 | 同上 |

共性要求：

- 打开侧栏时：**主 3D 区域被 flex 压缩**，不是 `absolute` 盖在画布上。  
- 左右可同时打开，便于「左边调参、中间看画面、右边看数据」。  
- 侧栏宽度可拖：鼠标悬停在侧栏**靠画布一侧**的边缘，`col-resize` 拖动。  
  - 建议范围：最小 **240px**，最大 **min(560px, 45vw)**；双击边缘恢复默认 **340px**。  
  - 左右宽度独立记忆（可用 `localStorage`，key 如 `physlab.rail.leftWidth` / `physlab.rail.rightWidth`）。  
- 侧栏内内容随宽度自适应（数据区 `auto-fit` 网格；窄栏时评论缩进收紧等，设计稿已有 container query 参考）。  
- 窄屏（建议 `<900px`）：侧栏可改为 overlay，避免双栏把画布压没；交互仍可用。  
- Esc：优先关闭右栏，再关闭左栏（与设计稿一致）。  
- 底部播放/速度条（`simulationBar`）保留在画布底部居中，不进侧栏。

### 2.2 代码层面重构要求

**目标结构**：以 `ExperimentContainer` 为唯一壳，统一管理左/右栏；各实验页只传入内容，不再自己挂浮动面板。

建议 API 形态（实现时可微调命名，但职责需等价）：

```tsx
<ExperimentContainer
  title="..."
  description="..."
  controls={<>...</>}      // → 左栏
  dataPanel={<>...</>}     // → 右栏「数据」
  // comments 由 Container 内按 experimentId 自行拉取，或预留 comments slot
  simulationBar={...}
>
  {/* R3F 场景 */}
</ExperimentContainer>
```

**必须完成：**

1. 改造 `ExperimentContainer`：实现左右推挤侧栏 + 拖宽 + 按钮状态。  
2. 迁移全部实验页（至少）：  
   - `doppler-page`  
   - `double-slit-page`  
   - `wave-mechanics-page`  
   - `bernoulli-venturi-page`  
   - `special-relativity-page`  
   - `general-relativity-page`  
3. 去掉各页对 `FloatingControlPanel` / 独立 `DataPanel` 浮层的依赖（内容迁到 `controls` / `dataPanel` props）。  
4. `FloatingControlPanel`、旧式绝对定位 Controls 覆盖层：迁移完成后可删除或标 `@deprecated` 并停止导出使用。  
5. Canvas 需随容器尺寸变化正确 resize（现有 `ResizeObserver` / `CanvasResizeHandler` 逻辑保留并验证：开关侧栏、拖宽时画面不拉伸错乱）。

**非目标（本迭代不做）：**

- 不改各实验物理逻辑 / 场景内容。  
- 不强制统一各实验控件内部样式组件（`ControlSlider` 等可沿用）。

---

## 3. 评论功能（用户端 + 后端）

### 3.1 功能范围

| 能力 | 说明 |
|------|------|
| 列表 | 按实验拉取评论；支持一级评论 + 一层回复（`parent_id`）；默认按时间倒序 |
| 发表 | 登录用户对已发布实验发评论；可回复某条评论 |
| 点赞 | 登录用户对评论点赞 / 取消；一人一条，不可重复 |
| 角标 | 右上「评论」按钮展示该实验 `comment_count`（或未读可不做，本迭代只做总数） |
| 权限 | 未登录：可浏览列表；发帖/点赞跳转登录或提示登录 |
| 删除 | 用户可删除**自己的**评论；管理员删除见 §4 |

筛选 Tab（设计稿有「全部 / 提问 / 我的」）：

- **全部**：该实验全部可见评论  
- **我的**：当前用户发出的评论（未登录隐藏或提示登录）  
- **提问**：本迭代可先用简单规则（例如内容含 `？`/`?`），或暂时只做 UI Tab +「全部/我的」，提问过滤可列为可选增强，需在实现时写清选型

### 3.2 业务规则

- 仅 `status = PUBLISHED` 的实验可评论。  
- 评论内容：非空，建议长度 **1–1000** 字符（前后 trim）。  
- 回复：`parent_id` 必须属于同一 `experiment_id`；**只允许回复一级评论**（`parent.parent_id IS NULL`），避免无限嵌套。  
- 删除评论：  
  - 软删或硬删二选一，推荐 **软删**（`status` 字段），便于管理端审计；软删后不计入列表，并递减 `experiments.comment_count`（仅当原状态为可见时）。  
  - 删除一级评论时：其子回复一并不可见（级联软删或查询时过滤）。  
- 点赞：写入点赞表成功后 `like_count + 1`；取消则 `- 1`（`GREATEST(like_count - 1, 0)`，与收藏计数写法一致）。  
- `experiments.comment_count`：发可见评论 `+1`，删除/隐藏可见评论 `-1`（与 `favorite_count` 维护方式一致，见 `ExperimentFavoriteServiceImpl`）。

### 3.3 用户端 API（建议）

统一前缀，风格对齐现有 `/api/experiments`、`/api/users/me/favorites`。

```
GET    /api/experiments/{experimentId}/comments
       ?page=1&size=20&filter=all|mine|question
       → 分页列表；每条含作者昵称/头像、likeCount、liked（当前用户是否已赞）、replies[]

POST   /api/experiments/{experimentId}/comments
       Body: { "content": "...", "parentId": null | number }
       → 需登录；201 + 评论 DTO

DELETE /api/experiments/{experimentId}/comments/{commentId}
       → 需登录；仅作者可删（或管理员走管理端接口）

POST   /api/experiments/{experimentId}/comments/{commentId}/likes
       → 需登录；点赞；幂等（已赞则 204）

DELETE /api/experiments/{experimentId}/comments/{commentId}/likes
       → 需登录；取消点赞；幂等
```

列表响应字段建议：`id, experimentId, userId, nickname, avatarUrl, parentId, content, likeCount, liked, createTime, replies[]`。

---

## 4. 数据库设计

文件位置：`backend/src/main/resources/schema/`  
命名续号：`007_...`、`008_...`（以目录内实际最大序号为准）。  
风格要求：与 `004_create_experiment_favorites.sql` 一致——`BIGSERIAL`、`TIMESTAMP` + MP 自动填充说明、`COMMENT ON`、外键 `ON DELETE CASCADE`、必要唯一约束。

### 4.1 评论表 `experiment_comments`

```sql
-- 实验评论表（PostgreSQL）
-- 时间字段 create_time / update_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS experiment_comments (
    id              BIGSERIAL    PRIMARY KEY,
    experiment_id   BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    parent_id       BIGINT,
    content         VARCHAR(1000) NOT NULL,
    like_count      BIGINT       NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'VISIBLE',
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_experiment_comments_experiment
        FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_comments_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_comments_parent
        FOREIGN KEY (parent_id) REFERENCES experiment_comments (id) ON DELETE CASCADE,
    CONSTRAINT ck_experiment_comments_status
        CHECK (status IN ('VISIBLE', 'HIDDEN', 'DELETED'))
);

COMMENT ON TABLE experiment_comments IS '实验评论表（含一级回复）';

COMMENT ON COLUMN experiment_comments.id IS '评论 ID，自增主键';
COMMENT ON COLUMN experiment_comments.experiment_id IS '实验 ID，FK → experiments(id)';
COMMENT ON COLUMN experiment_comments.user_id IS '作者用户 ID，FK → users(id)';
COMMENT ON COLUMN experiment_comments.parent_id IS '父评论 ID；为空表示一级评论；非空则必须指向同实验的一级评论';
COMMENT ON COLUMN experiment_comments.content IS '评论正文，1–1000 字';
COMMENT ON COLUMN experiment_comments.like_count IS '点赞数（冗余统计）';
COMMENT ON COLUMN experiment_comments.status IS '可见状态：VISIBLE / HIDDEN / DELETED';
COMMENT ON COLUMN experiment_comments.create_time IS '创建时间，插入时自动填充';
COMMENT ON COLUMN experiment_comments.update_time IS '更新时间，插入/更新时自动填充';

CREATE INDEX IF NOT EXISTS idx_experiment_comments_experiment_created
    ON experiment_comments (experiment_id, create_time DESC);

CREATE INDEX IF NOT EXISTS idx_experiment_comments_user
    ON experiment_comments (user_id);
```

说明：

- `experiments.comment_count` **已存在**，无需改表结构；业务写入时维护即可。可另补 migration 注释把「预留」改为正式启用（可选）。  
- `HIDDEN`：管理员隐藏（用户端不可见，管理端仍可见）；`DELETED`：用户自删或管理删除。

### 4.2 评论点赞表 `experiment_comment_likes`

```sql
-- 实验评论点赞表（PostgreSQL）
-- 时间字段 create_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS experiment_comment_likes (
    id              BIGSERIAL    PRIMARY KEY,
    comment_id      BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_experiment_comment_likes_comment
        FOREIGN KEY (comment_id) REFERENCES experiment_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_comment_likes_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_experiment_comment_likes_comment_user UNIQUE (comment_id, user_id)
);

COMMENT ON TABLE experiment_comment_likes IS '用户评论点赞表';

COMMENT ON COLUMN experiment_comment_likes.id IS '点赞记录 ID，自增主键';
COMMENT ON COLUMN experiment_comment_likes.comment_id IS '评论 ID，FK → experiment_comments(id)';
COMMENT ON COLUMN experiment_comment_likes.user_id IS '用户 ID，FK → users(id)';
COMMENT ON COLUMN experiment_comment_likes.create_time IS '点赞时间，插入时自动填充';

CREATE INDEX IF NOT EXISTS idx_experiment_comment_likes_user
    ON experiment_comment_likes (user_id);
```

对齐现有收藏表：`004_create_experiment_favorites.sql` 的「用户 × 目标」唯一约束模式。

---

## 5. 管理端

导航建议挂在 `AdminShell` 的「内容」或新建「运营」分组（与现有实验管理、学科分类并列）。

### 5.1 收藏管理

**背景**：表 `experiment_favorites` 与用户 API 已有；管理端从零做。

| 能力 | 说明 |
|------|------|
| 列表 | 分页；展示：收藏 ID、用户（id/用户名/昵称）、实验（id/标题/route）、收藏时间 |
| 筛选 | 按用户名/昵称、实验标题/route、时间范围 |
| 删除 | 管理员删除某条收藏记录，并同步 `experiments.favorite_count - 1`（与用户取消收藏同一套计数逻辑） |
| 只读跳转 | 可链到实验编辑页（可选） |

建议 API：

```
GET    /api/admin/favorites?page=&size=&keyword=&experimentId=&userId=
DELETE /api/admin/favorites/{id}
```

### 5.2 评论管理

| 能力 | 说明 |
|------|------|
| 列表 | 分页；评论内容、作者、所属实验、父评论 ID、点赞数、状态、时间 |
| 筛选 | 实验、用户、状态（VISIBLE/HIDDEN/DELETED）、关键字（内容） |
| 隐藏 / 恢复 | VISIBLE ↔ HIDDEN；切换时维护 `comment_count` |
| 删除 | 置 `DELETED`（或硬删）；维护计数；级联处理回复 |
| 无需在后台发评论 | 本迭代不做管理员代发 |

建议 API：

```
GET    /api/admin/comments?page=&size=&experimentId=&userId=&status=&keyword=
PATCH  /api/admin/comments/{id}          Body: { "status": "HIDDEN" | "VISIBLE" }
DELETE /api/admin/comments/{id}          → 标记 DELETED 或等价删除
```

### 5.3 评论点赞管理

| 能力 | 说明 |
|------|------|
| 列表 | 分页；点赞 ID、用户、评论摘要（id + 内容截断）、所属实验、点赞时间 |
| 筛选 | 用户、评论 ID、实验 ID、时间 |
| 删除 | 删除点赞记录并 `like_count - 1` |

建议 API：

```
GET    /api/admin/comment-likes?page=&size=&commentId=&userId=&experimentId=
DELETE /api/admin/comment-likes/{id}
```

### 5.4 管理端 UI 约定

- 沿用 `frontend-admin` 现有 Shopify 事务型风格（列表 + 筛选 + 表格 + Toast）。  
- 侧栏导航启用三项（去掉 `disabled`）：收藏管理、评论管理、评论点赞管理。  
- 权限：现有管理员登录即可，本迭代不做细粒度 RBAC。

---

## 6. 实现分层与目录提示

| 层 | 路径提示 |
|----|----------|
| Schema | `backend/src/main/resources/schema/007_create_experiment_comments.sql`、`008_create_experiment_comment_likes.sql` |
| Entity / Mapper / Service | 对齐 `ExperimentFavorite*` 包结构 |
| 用户 API | `controller/user` 或挂在 `ExperimentController` 下的 comments 子资源 |
| 管理 API | `controller/admin/AdminFavoriteController`、`AdminCommentController`、`AdminCommentLikeController` |
| 用户端 UI | `frontend-user/src/components/experiment-ui/ExperimentContainer.tsx` 及评论子组件 |
| 管理端 UI | `frontend-admin/src/app/favorites`、`comments`、`comment-likes` + `AdminShell` 导航 |

---

## 7. 建议开发顺序

1. **Schema + Entity**：评论表、点赞表；本地执行迁移。  
2. **用户评论 API + 点赞 API**：含计数维护；用接口工具自测。  
3. **ExperimentContainer 侧栏重构**：先接入控制/数据，不接评论也能交付布局。  
4. **迁完所有实验页**到新壳；删除浮层用法。  
5. **右栏接入评论 UI**（列表/发帖/回复/点赞）。  
6. **管理端**：收藏管理 → 评论管理 → 评论点赞管理。  
7. **回归**：开关侧栏与拖宽时 WebGL resize；收藏/评论计数与列表一致；权限（未登录/非作者）。

---

## 8. 验收标准

### 用户端布局

- [ ] 控制在左、数据与评论在右；推挤画布，不长期遮挡 3D。  
- [ ] 左右可同时打开；右栏数据/评论互斥。  
- [ ] 侧栏可拖拽调宽，范围内生效；内容不溢出错乱。  
- [ ] 全部已上线实验均使用新壳，无旧浮层挡画。  
- [ ] 拖宽/开关侧栏后 Canvas 比例正常。

### 评论

- [ ] 登录用户可评论、回复（一层）、点赞/取消。  
- [ ] 列表展示正确；`comment_count` / `like_count` 与操作一致。  
- [ ] 未登录可看不可写；非作者不能删他人评论。

### 管理端

- [ ] 可分页查看并删除收藏，计数正确。  
- [ ] 可筛选/隐藏/删除评论，用户端同步不可见，计数正确。  
- [ ] 可查看并删除评论点赞，评论 `like_count` 正确。

---

## 9. 参考文件

| 文件 | 用途 |
|------|------|
| `comment-design.html` | 交互与视觉唯一参照 |
| `backend/src/main/resources/schema/004_create_experiment_favorites.sql` | 关联表写法参照 |
| `backend/src/main/resources/schema/003_create_experiments.sql` | 已含 `comment_count` |
| `backend/.../ExperimentFavoriteServiceImpl.java` | 冗余计数维护参照 |
| `frontend-user/.../ExperimentContainer.tsx` | 重构主入口 |
| `frontend-admin/.../AdminShell.tsx` | 导航挂载点 |

---

## 10. 明确不做（避免扩 scope）

- 评论通知、@用户、富文本/图片评论  
- 多级楼中楼（超过一层回复）  
- 用户端「举报」流程  
- 管理端代发评论、批量导入  
- 改实验物理仿真逻辑  
- 新的权限角色体系
