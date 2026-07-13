-- 管理员表（PostgreSQL）
-- 时间字段 create_time / update_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS admins (
    id              BIGSERIAL    PRIMARY KEY,
    username        VARCHAR(20)  NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(40)  NOT NULL,
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_admins_username UNIQUE (username)
);

COMMENT ON TABLE admins IS '管理员表';

COMMENT ON COLUMN admins.id IS '管理员 ID，自增主键';
COMMENT ON COLUMN admins.username IS '登录用户名，唯一';
COMMENT ON COLUMN admins.password_hash IS '密码哈希（BCrypt）';
COMMENT ON COLUMN admins.display_name IS '后台展示名';
COMMENT ON COLUMN admins.create_time IS '创建时间，插入时自动填充';
COMMENT ON COLUMN admins.update_time IS '更新时间，插入/更新时自动填充';

-- 默认管理员：admin / admin123
INSERT INTO admins (username, password_hash, display_name)
VALUES (
    'admin',
    '$2b$10$jG2XPZAy/x2pb.ApwLzAQ.5xtYUWjubLgjaTW7b8K.FmVOKaU2R2i',
    '管理员'
)
ON CONFLICT (username) DO NOTHING;
