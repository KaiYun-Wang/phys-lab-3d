-- 实验表（PostgreSQL）
-- 时间字段 create_time / update_time 由 MyBatis-Plus MetaObjectHandler 自动填充

CREATE TABLE IF NOT EXISTS experiments (
    id              BIGSERIAL    PRIMARY KEY,
    route           VARCHAR(64)  NOT NULL,
    title           VARCHAR(120) NOT NULL,
    subject_type    VARCHAR(40)  NOT NULL,
    description     TEXT         NOT NULL,
    cover_url       VARCHAR(512),
    topics          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED',
    visitor_count   BIGINT       NOT NULL DEFAULT 0,
    favorite_count  BIGINT       NOT NULL DEFAULT 0,
    view_count      BIGINT       NOT NULL DEFAULT 0,
    comment_count   BIGINT       NOT NULL DEFAULT 0,
    create_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_experiments_route UNIQUE (route),
    CONSTRAINT ck_experiments_subject_type CHECK (subject_type IN (
        'MECHANICS', 'ELECTRICITY', 'OPTICS', 'QUANTUM',
        'FLUID_MECHANICS', 'RELATIVITY', 'WAVE', 'ACOUSTICS'
    )),
    CONSTRAINT ck_experiments_status CHECK (status IN ('PUBLISHED', 'DRAFT'))
);

COMMENT ON TABLE experiments IS '实验表';

COMMENT ON COLUMN experiments.id IS '实验 ID，自增主键';
COMMENT ON COLUMN experiments.route IS '路由 slug，唯一，与用户端 3D 页面 registry key 一致';
COMMENT ON COLUMN experiments.title IS '实验标题';
COMMENT ON COLUMN experiments.subject_type IS '物理子学科，枚举名如 MECHANICS、QUANTUM';
COMMENT ON COLUMN experiments.description IS '实验简介';
COMMENT ON COLUMN experiments.cover_url IS '封面 URL（MinIO 或外链）；为空时前端 fallback';
COMMENT ON COLUMN experiments.topics IS '标签数组（JSONB）';
COMMENT ON COLUMN experiments.status IS '发布状态：PUBLISHED / DRAFT';
COMMENT ON COLUMN experiments.visitor_count IS '访客数（冗余统计）';
COMMENT ON COLUMN experiments.favorite_count IS '收藏数（冗余统计）';
COMMENT ON COLUMN experiments.view_count IS '浏览量（冗余统计）';
COMMENT ON COLUMN experiments.comment_count IS '评论数（冗余统计，预留）';
COMMENT ON COLUMN experiments.create_time IS '创建时间，插入时自动填充';
COMMENT ON COLUMN experiments.update_time IS '更新时间，插入/更新时自动填充';

-- 种子数据：与 frontend-user/src/data/experiments.ts 及 registry.ts 一致
INSERT INTO experiments (route, title, subject_type, description, cover_url, topics, status)
VALUES
    (
        'double-slit',
        '双缝实验',
        'QUANTUM',
        '见证波粒二象性。让光子通过双缝，观察证明量子力学的干涉图样。',
        '/covers/experiment-cover.png',
        '["量子", "波粒二象性", "干涉", "光子"]'::jsonb,
        'PUBLISHED'
    ),
    (
        'wave-mechanics',
        '横波与纵波',
        'WAVE',
        '左右分屏对比横波与纵波，同步调节频率、振幅、波长，可视化波前、疏密与相位。',
        '/covers/experiment-cover.png',
        '["横波", "纵波", "波长", "频率"]'::jsonb,
        'PUBLISHED'
    ),
    (
        'general-relativity',
        '广义相对论 · 史瓦西黑洞',
        'RELATIVITY',
        '潜入史瓦西黑洞周围的弯曲时空。在华丽的 3D 场景中观察测地线轨道、引力透镜、引力红移与发光吸积盘。',
        '/covers/experiment-cover.png',
        '["广义相对论", "黑洞", "测地线", "引力透镜"]'::jsonb,
        'PUBLISHED'
    ),
    (
        'doppler',
        '多普勒效应',
        'ACOUSTICS',
        '在3D中移动声源和观察者。观看波前压缩和膨胀，实时感受频率变化。',
        '/covers/experiment-cover.png',
        '["声波", "频移", "波前", "相对论"]'::jsonb,
        'PUBLISHED'
    ),
    (
        'bernoulli-venturi',
        '伯努利原理（文丘里管）',
        'FLUID_MECHANICS',
        '通过文丘里管探索伯努利原理：调节流速与截面积，观察流速与压强的反比关系。',
        '/covers/experiment-cover.png',
        '["伯努利方程", "连续性方程", "压强", "流体力学"]'::jsonb,
        'PUBLISHED'
    ),
    (
        'special-relativity',
        '狭义相对论实验室',
        'RELATIVITY',
        '驾驶飞船逼近光速，实时观察长度收缩、时间膨胀与相对论质量增大的经典效应。',
        '/covers/experiment-cover.png',
        '["洛伦兹因子", "时间膨胀", "长度收缩", "相对论质量"]'::jsonb,
        'PUBLISHED'
    )
ON CONFLICT (route) DO NOTHING;
