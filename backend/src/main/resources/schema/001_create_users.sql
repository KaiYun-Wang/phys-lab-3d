-- 用户表（PostgreSQL）
-- 时间字段 create_time / update_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL    PRIMARY KEY,
    username        VARCHAR(20)  NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(20)  NOT NULL,
    avatar_url      VARCHAR(512),
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_username UNIQUE (username)
);

COMMENT ON TABLE users IS '用户表';

COMMENT ON COLUMN users.id IS '用户 ID，自增主键';
COMMENT ON COLUMN users.username IS '登录用户名，唯一，长度 3–20';
COMMENT ON COLUMN users.password_hash IS '密码哈希（BCrypt）';
COMMENT ON COLUMN users.nickname IS '显示昵称；注册时默认写入 username';
COMMENT ON COLUMN users.avatar_url IS '头像地址，可选；为空时前端取 username 前 2 个字符展示文字头像';
COMMENT ON COLUMN users.create_time IS '创建时间，插入时自动填充';
COMMENT ON COLUMN users.update_time IS '更新时间，插入/更新时自动填充';
