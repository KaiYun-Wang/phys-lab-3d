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
