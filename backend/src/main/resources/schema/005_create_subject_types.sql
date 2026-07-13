-- 物理子学科类型表（PostgreSQL）
-- 时间字段 create_time / update_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS subject_types (
    id              BIGSERIAL    PRIMARY KEY,
    code            VARCHAR(40)  NOT NULL,
    label           VARCHAR(40)  NOT NULL,
    description     TEXT,
    sort_order      INT          NOT NULL DEFAULT 0,
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_subject_types_code UNIQUE (code)
);

COMMENT ON TABLE subject_types IS '物理子学科类型表';

COMMENT ON COLUMN subject_types.id IS '学科类型 ID，自增主键';
COMMENT ON COLUMN subject_types.code IS '枚举代码，如 MECHANICS、QUANTUM，与 experiments.subject_type 冗余字段同步';
COMMENT ON COLUMN subject_types.label IS '中文展示名，如 力学、量子';
COMMENT ON COLUMN subject_types.description IS '学科说明（可选）';
COMMENT ON COLUMN subject_types.sort_order IS '排序权重，越小越靠前';
COMMENT ON COLUMN subject_types.create_time IS '创建时间，插入时自动填充';
COMMENT ON COLUMN subject_types.update_time IS '更新时间，插入/更新时自动填充';

INSERT INTO subject_types (code, label, sort_order)
VALUES
    ('MECHANICS',       '力学',     1),
    ('ELECTRICITY',     '电学',     2),
    ('OPTICS',          '光学',     3),
    ('QUANTUM',         '量子',     4),
    ('FLUID_MECHANICS', '流体力学', 5),
    ('RELATIVITY',      '相对论',   6),
    ('WAVE',            '波动',     7),
    ('ACOUSTICS',       '声学',     8)
ON CONFLICT (code) DO NOTHING;
