-- 仪表盘演示数据（可重复执行）
-- 依赖：已有 PUBLISHED 实验；密码统一 demo123（BCrypt 与 seed 中 admin123 同哈希时可改）
-- 用法：在目标库执行本文件即可。再次执行会先清理 demo_* 用户及其产生的行为数据。

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. 清理上次演示数据（按用户名前缀 demo_）
-- ---------------------------------------------------------------------------
DELETE FROM experiment_comment_likes
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM experiment_comments
WHERE owner_type = 0
  AND owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM experiment_favorites
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM experiment_views
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%')
   OR (user_id IS NULL AND viewed_at >= CURRENT_DATE - INTERVAL '35 days'
       AND experiment_id IN (SELECT id FROM experiments WHERE status = 'PUBLISHED'));

DELETE FROM ai_chat_messages
WHERE session_id IN (
    SELECT s.id FROM ai_chat_sessions s
    WHERE s.owner_type = 0
      AND s.owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%')
);

DELETE FROM ai_chat_sessions
WHERE owner_type = 0
  AND owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM users WHERE username LIKE 'demo_%';

-- ---------------------------------------------------------------------------
-- 1. 模拟用户：近 30 日分批注册（约 48 人），密码 demo123
--    hash = $2b$10$jG2XPZAy/x2pb.ApwLzAQ.5xtYUWjubLgjaTW7b8K.FmVOKaU2R2i （同 admin123）
-- ---------------------------------------------------------------------------
INSERT INTO users (username, password_hash, nickname, status, create_time, update_time)
SELECT
    'demo_' || lpad(g::text, 2, '0') AS username,
    '$2b$10$jG2XPZAy/x2pb.ApwLzAQ.5xtYUWjubLgjaTW7b8K.FmVOKaU2R2i',
    (ARRAY[
        '小物理', '量子猫', '波粒酱', '相对论人', '光行者', '声学控',
        '伯努利', '干涉迷', '测地线', '红移君', '双缝粉', '文丘里'
    ])[1 + ((g - 1) % 12)] || g::text,
    -- 约每 10 人禁用 1 个，方便管理端演示
    CASE WHEN g % 10 = 0 THEN 'DISABLED' ELSE 'ENABLED' END,
    -- 注册时间：前 30 天不均匀分布，周末略多，近几天更密
    (CURRENT_DATE - ((30 - ((g * 7 + 3) % 30)) || ' days')::interval)
        + ((8 + (g % 12)) || ' hours')::interval
        + ((g * 11) % 50 || ' minutes')::interval,
    CURRENT_TIMESTAMP
FROM generate_series(1, 48) AS g;

-- ---------------------------------------------------------------------------
-- 2. 实验访问日志（访客趋势 + 今日访问）
-- ---------------------------------------------------------------------------
WITH demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM users WHERE username LIKE 'demo_%'
),
exps AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn, COUNT(*) OVER () AS n
    FROM experiments WHERE status = 'PUBLISHED'
),
days AS (
    SELECT d::date AS day,
           -- 日访问量：工作日 18~35，周末 28~55，今天再抬一截
           CASE
               WHEN d::date = CURRENT_DATE THEN 42 + (EXTRACT(DOW FROM d)::int % 5)
               WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 28 + (EXTRACT(DAY FROM d)::int % 20)
               ELSE 18 + (EXTRACT(DAY FROM d)::int % 15)
           END AS visits
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') AS d
),
expanded AS (
    SELECT
        days.day,
        gs AS slot,
        days.visits
    FROM days
    CROSS JOIN LATERAL generate_series(1, days.visits) AS gs
)
INSERT INTO experiment_views (experiment_id, user_id, viewed_at)
SELECT
    e.id,
    CASE WHEN (x.slot % 7) = 0 THEN NULL ELSE u.id END,
    x.day
        + ((9 + (x.slot % 12)) || ' hours')::interval
        + (((x.slot * 17) % 55) || ' minutes')::interval
        + (((x.slot * 3) % 50) || ' seconds')::interval
FROM expanded x
JOIN exps e ON e.rn = 1 + ((x.slot + EXTRACT(DAY FROM x.day)::int) % e.n)
JOIN demo_users u ON u.rn = 1 + ((x.slot * 3 + EXTRACT(DAY FROM x.day)::int) % 48);

-- ---------------------------------------------------------------------------
-- 3. 收藏（热度不均，方便 Top 榜）
-- ---------------------------------------------------------------------------
WITH demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users WHERE username LIKE 'demo_%'
),
exps AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn, COUNT(*) OVER () AS n
    FROM experiments WHERE status = 'PUBLISHED'
),
pairs AS (
    -- 热门实验多收藏：按实验序号加权
    SELECT
        u.id AS user_id,
        e.id AS experiment_id,
        (CURRENT_DATE - ((u.rn + e.rn) % 28 || ' days')::interval)
            + ((10 + (u.rn % 8)) || ' hours')::interval AS create_time
    FROM demo_users u
    CROSS JOIN exps e
    WHERE
        -- 第 1 热：约 70% 用户收藏；第 2：55%；第 3：40%；其余更少
        (e.rn = 1 AND (u.rn % 10) < 7)
        OR (e.rn = 2 AND (u.rn % 10) < 6)
        OR (e.rn = 3 AND (u.rn % 10) < 4)
        OR (e.rn = 4 AND (u.rn % 10) < 3)
        OR (e.rn >= 5 AND (u.rn % (3 + e.rn)) = 0)
)
INSERT INTO experiment_favorites (user_id, experiment_id, create_time)
SELECT user_id, experiment_id, create_time
FROM pairs
ON CONFLICT (user_id, experiment_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. 评论（一级评论为主）
-- ---------------------------------------------------------------------------
WITH demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users WHERE username LIKE 'demo_%'
),
exps AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn, COUNT(*) OVER () AS n
    FROM experiments WHERE status = 'PUBLISHED'
),
texts AS (
    SELECT * FROM (VALUES
        (1, '这个实验可视化效果太棒了，终于看懂干涉条纹了！'),
        (2, '建议再加一个参数对比面板，会更好用。'),
        (3, '老师课堂上演示过，自己动手调一遍印象更深。'),
        (4, '3D 场景很沉浸，手机端也能流畅运行吗？'),
        (5, '知识库问答答得挺准，和实验联动不错。'),
        (6, '收藏了，期末复习用。'),
        (7, '希望能导出实验数据曲线。'),
        (8, '界面简洁，操作直觉，赞一个。')
    ) AS t(i, content)
)
INSERT INTO experiment_comments (
    experiment_id, owner_id, owner_type, root_id, reply_to_id,
    content, like_count, status, create_time, update_time
)
SELECT
    e.id,
    u.id,
    0,
    NULL,
    NULL,
    t.content,
    (u.rn % 6),
    'VISIBLE',
    (CURRENT_DATE - ((u.rn + e.rn) % 25 || ' days')::interval)
        + ((14 + (u.rn % 6)) || ' hours')::interval,
    CURRENT_TIMESTAMP
FROM demo_users u
JOIN exps e ON e.rn = 1 + ((u.rn + 1) % e.n)
JOIN texts t ON t.i = 1 + ((u.rn + e.rn) % 8)
WHERE (u.rn % 3) <> 0;  -- 约 2/3 用户各发一条

-- ---------------------------------------------------------------------------
-- 5. AI 会话与问答（含 rag_hit_count，撑起 AI 辅导卡片）
-- ---------------------------------------------------------------------------
WITH demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users WHERE username LIKE 'demo_%'
),
exps AS (
    SELECT id, title, row_number() OVER (ORDER BY id) AS rn, COUNT(*) OVER () AS n
    FROM experiments WHERE status = 'PUBLISHED'
),
session_plan AS (
    -- 每人 1~2 个会话，时间散落近 30 天，近一周更密
    SELECT
        u.id AS owner_id,
        u.rn,
        s.slot,
        (CASE
            WHEN s.slot = 1 THEN CURRENT_DATE - ((u.rn % 12) || ' days')::interval
            ELSE CURRENT_DATE - ((7 + (u.rn % 18)) || ' days')::interval
         END)
            + ((10 + (u.rn % 10)) || ' hours')::interval AS created_at,
        e.id AS experiment_id,
        e.title AS experiment_title
    FROM demo_users u
    CROSS JOIN (VALUES (1), (2)) AS s(slot)
    JOIN exps e ON e.rn = 1 + ((u.rn + s.slot) % e.n)
    WHERE s.slot = 1 OR (u.rn % 2 = 0)
),
ins_sessions AS (
    INSERT INTO ai_chat_sessions (owner_id, owner_type, title, create_time, update_time)
    SELECT
        owner_id,
        0,
        left('关于「' || experiment_title || '」的提问', 200),
        created_at,
        created_at + INTERVAL '3 minutes'
    FROM session_plan
    RETURNING id, owner_id, create_time, title
)
INSERT INTO ai_chat_messages (session_id, role, content, context_json, create_time, rag_hit_count)
SELECT * FROM (
    SELECT
        s.id AS session_id,
        'user'::varchar AS role,
        (ARRAY[
            '这个实验的核心物理原理是什么？',
            '参数调大后图像为什么会这样变化？',
            '和课堂上讲的公式怎么对应？',
            '有没有相关的知识库资料？',
            '怎样理解波粒二象性在这个场景里的体现？'
        ])[1 + (s.owner_id % 5)] AS content,
        jsonb_build_object(
            'pageType', 'experiment',
            'experimentTitle', s.title
        ) AS context_json,
        s.create_time + INTERVAL '5 seconds' AS create_time,
        NULL::integer AS rag_hit_count
    FROM ins_sessions s
    UNION ALL
    SELECT
        s.id,
        'assistant',
        '根据知识库与实验上下文：该现象可用对应物理模型解释。调节参数时请观察关键观测量的变化趋势；如需更细公式推导，可继续追问。',
        NULL,
        s.create_time + INTERVAL '25 seconds',
        -- 约 75% 命中（1~4 条），其余 0
        CASE WHEN (s.owner_id % 4) = 0 THEN 0 ELSE 1 + (s.owner_id % 4) END
    FROM ins_sessions s
    UNION ALL
    -- 约一半会话再追问一轮，抬高会话深度
    SELECT
        s.id,
        'user',
        '能再举一个和生活相关的例子吗？',
        jsonb_build_object('pageType', 'experiment'),
        s.create_time + INTERVAL '2 minutes',
        NULL
    FROM ins_sessions s
    WHERE (s.owner_id % 2) = 0
    UNION ALL
    SELECT
        s.id,
        'assistant',
        '可以。例如在日常生活中，你也能观察到类似的干涉、频移或压强变化现象；把课堂公式和实验旋钮一一对应，会更容易记住。',
        NULL,
        s.create_time + INTERVAL '2 minutes 20 seconds',
        CASE WHEN (s.owner_id % 5) = 0 THEN 0 ELSE 2 END
    FROM ins_sessions s
    WHERE (s.owner_id % 2) = 0
) q;

-- ---------------------------------------------------------------------------
-- 6. 同步实验冗余计数（收藏 / 评论 / 浏览）
-- ---------------------------------------------------------------------------
UPDATE experiments e
SET
    favorite_count = COALESCE((
        SELECT COUNT(*) FROM experiment_favorites f WHERE f.experiment_id = e.id
    ), 0),
    comment_count = COALESCE((
        SELECT COUNT(*) FROM experiment_comments c
        WHERE c.experiment_id = e.id AND c.status = 'VISIBLE'
    ), 0),
    view_count = COALESCE((
        SELECT COUNT(*) FROM experiment_views v WHERE v.experiment_id = e.id
    ), 0),
    visitor_count = COALESCE((
        SELECT COUNT(DISTINCT COALESCE(v.user_id, -v.id))
        FROM experiment_views v WHERE v.experiment_id = e.id
    ), 0),
    update_time = CURRENT_TIMESTAMP
WHERE e.status = 'PUBLISHED';

-- 序列对齐
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('experiment_views_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_views));
SELECT setval('experiment_favorites_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_favorites));
SELECT setval('experiment_comments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_comments));
SELECT setval('ai_chat_sessions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_chat_sessions));
SELECT setval('ai_chat_messages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_chat_messages));

COMMIT;

-- 快速自检（可选）
-- SELECT COUNT(*) AS demo_users FROM users WHERE username LIKE 'demo_%';
-- SELECT COUNT(*) AS views_30d FROM experiment_views WHERE viewed_at >= CURRENT_DATE - 29;
-- SELECT COUNT(*) AS favorites FROM experiment_favorites;
-- SELECT COUNT(*) AS ai_sessions FROM ai_chat_sessions WHERE owner_type = 0;
-- SELECT COUNT(*) AS ai_questions FROM ai_chat_messages WHERE role = 'user';
