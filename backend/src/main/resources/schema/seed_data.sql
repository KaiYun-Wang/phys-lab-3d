-- 种子数据（从 002 / 003 / 005 抽出）
-- 依赖：admins / subject_types / experiments 表已存在
-- 建议顺序：先 subject_types，再 experiments（需 subject_type_id），admins 可任意

-- 默认管理员：admin / admin123
INSERT INTO admins (username, password_hash, display_name)
VALUES (
    'admin',
    '$2b$10$jG2XPZAy/x2pb.ApwLzAQ.5xtYUWjubLgjaTW7b8K.FmVOKaU2R2i',
    '管理员'
)
ON CONFLICT (username) DO NOTHING;

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

-- 实验种子：与 frontend-user registry 一致；subject_type_id 从 subject_types 解析
INSERT INTO experiments (route, title, subject_type, subject_type_id, description, cover_url, topics, status)
SELECT v.route, v.title, v.subject_type, st.id, v.description, v.cover_url, v.topics::jsonb, v.status
FROM (VALUES
    (
        'double-slit',
        '双缝实验',
        'QUANTUM',
        '见证波粒二象性。让光子通过双缝，观察证明量子力学的干涉图样。',
        '',
        '["量子", "波粒二象性", "干涉", "光子"]',
        'PUBLISHED'
    ),
    (
        'wave-mechanics',
        '横波与纵波',
        'WAVE',
        '左右分屏对比横波与纵波，同步调节频率、振幅、波长，可视化波前、疏密与相位。',
        '',
        '["横波", "纵波", "波长", "频率"]',
        'PUBLISHED'
    ),
    (
        'general-relativity',
        '广义相对论 · 史瓦西黑洞',
        'RELATIVITY',
        '潜入史瓦西黑洞周围的弯曲时空。在华丽的 3D 场景中观察测地线轨道、引力透镜、引力红移与发光吸积盘。',
        '',
        '["广义相对论", "黑洞", "测地线", "引力透镜"]',
        'PUBLISHED'
    ),
    (
        'doppler',
        '多普勒效应',
        'ACOUSTICS',
        '在3D中移动声源和观察者。观看波前压缩和膨胀，实时感受频率变化。',
        '',
        '["声波", "频移", "波前", "相对论"]',
        'PUBLISHED'
    ),
    (
        'bernoulli-venturi',
        '伯努利原理（文丘里管）',
        'FLUID_MECHANICS',
        '通过文丘里管探索伯努利原理：调节流速与截面积，观察流速与压强的反比关系。',
        '',
        '["伯努利方程", "连续性方程", "压强", "流体力学"]',
        'PUBLISHED'
    ),
    (
        'special-relativity',
        '狭义相对论实验室',
        'RELATIVITY',
        '驾驶飞船逼近光速，实时观察长度收缩、时间膨胀与相对论质量增大的经典效应。',
        '',
        '["洛伦兹因子", "时间膨胀", "长度收缩", "相对论质量"]',
        'PUBLISHED'
    )
) AS v(route, title, subject_type, description, cover_url, topics, status)
JOIN subject_types st ON st.code = v.subject_type
ON CONFLICT (route) DO NOTHING;
