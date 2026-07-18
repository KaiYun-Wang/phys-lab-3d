-- 实验评论表（PostgreSQL）
-- 时间字段 create_time / update_time 由 MyBatis-Plus MetaObjectHandler 自动填充
--
-- root_id：所属一级评论（楼）；一级评论自身为 NULL
-- reply_to_id：直接回复的目标评论；一级评论为 NULL
-- 回复一级：root_id = 一级.id，reply_to_id = 一级.id
-- 回复楼内任意评论：root_id = 该楼一级.id，reply_to_id = 被回复评论.id

CREATE TABLE IF NOT EXISTS experiment_comments (
    id              BIGSERIAL    PRIMARY KEY,
    experiment_id   BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    root_id         BIGINT,
    reply_to_id     BIGINT,
    content         VARCHAR(1000) NOT NULL,
    like_count      BIGINT       NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'VISIBLE',
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_experiment_comments_experiment
        FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_comments_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_comments_root
        FOREIGN KEY (root_id) REFERENCES experiment_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_comments_reply_to
        FOREIGN KEY (reply_to_id) REFERENCES experiment_comments (id) ON DELETE CASCADE,
    CONSTRAINT ck_experiment_comments_status
        CHECK (status IN ('VISIBLE', 'HIDDEN', 'DELETED'))
);

COMMENT ON TABLE experiment_comments IS '实验评论表（一级楼 + 楼内扁平回复）';

COMMENT ON COLUMN experiment_comments.id IS '评论 ID，自增主键';
COMMENT ON COLUMN experiment_comments.experiment_id IS '实验 ID，FK → experiments(id)';
COMMENT ON COLUMN experiment_comments.user_id IS '作者用户 ID，FK → users(id)';
COMMENT ON COLUMN experiment_comments.root_id IS '所属一级评论 ID；一级评论为 NULL；楼内回复均指向该楼一级评论';
COMMENT ON COLUMN experiment_comments.reply_to_id IS '直接回复的评论 ID；一级评论为 NULL；可指向一级或同楼任意回复';
COMMENT ON COLUMN experiment_comments.content IS '评论正文，1–1000 字';
COMMENT ON COLUMN experiment_comments.like_count IS '点赞数（冗余统计）';
COMMENT ON COLUMN experiment_comments.status IS '可见状态：VISIBLE / HIDDEN / DELETED';
COMMENT ON COLUMN experiment_comments.create_time IS '创建时间，插入时自动填充';
COMMENT ON COLUMN experiment_comments.update_time IS '更新时间，插入/更新时自动填充';

CREATE INDEX IF NOT EXISTS idx_experiment_comments_experiment_created
    ON experiment_comments (experiment_id, create_time DESC);

CREATE INDEX IF NOT EXISTS idx_experiment_comments_root
    ON experiment_comments (root_id, create_time ASC);

CREATE INDEX IF NOT EXISTS idx_experiment_comments_user
    ON experiment_comments (user_id);
