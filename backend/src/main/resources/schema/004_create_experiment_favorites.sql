-- 实验收藏表（PostgreSQL）
-- 时间字段 create_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS experiment_favorites (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    experiment_id   BIGINT       NOT NULL,
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_experiment_favorites_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_experiment_favorites_experiment
        FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE,
    CONSTRAINT uk_experiment_favorites_user_experiment UNIQUE (user_id, experiment_id)
);

COMMENT ON TABLE experiment_favorites IS '用户实验收藏表';

COMMENT ON COLUMN experiment_favorites.id IS '收藏记录 ID，自增主键';
COMMENT ON COLUMN experiment_favorites.user_id IS '用户 ID，FK → users(id)';
COMMENT ON COLUMN experiment_favorites.experiment_id IS '实验 ID，FK → experiments(id)';
COMMENT ON COLUMN experiment_favorites.create_time IS '收藏时间，插入时自动填充';
