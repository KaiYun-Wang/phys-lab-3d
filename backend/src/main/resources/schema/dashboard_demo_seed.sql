-- 仪表盘演示数据（可重复执行，适配 DBX：短语句、无 TEMP、无慢循环）
-- 依赖：已有 PUBLISHED 实验
-- 密码：与 admin123 同哈希（演示账号 demo_01 …）

-- ---------------------------------------------------------------------------
-- 0. 清理上次 demo 数据
-- ---------------------------------------------------------------------------
DELETE FROM experiment_comment_likes
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM experiment_comments
WHERE owner_type = 0
  AND owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM experiment_favorites
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM experiment_views
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM ai_chat_messages
WHERE session_id IN (
    SELECT id FROM ai_chat_sessions
    WHERE owner_type = 0
      AND owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%')
);

DELETE FROM ai_chat_sessions
WHERE owner_type = 0
  AND owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM users WHERE username LIKE 'demo_%';

-- ---------------------------------------------------------------------------
-- 1. 用户（24 人，近 30 日注册）
-- ---------------------------------------------------------------------------
INSERT INTO users (username, password_hash, nickname, status, create_time, update_time)
SELECT
    'demo_' || lpad(g::text, 2, '0'),
    '$2b$10$jG2XPZAy/x2pb.ApwLzAQ.5xtYUWjubLgjaTW7b8K.FmVOKaU2R2i',
    (ARRAY[
        '小物理', '量子猫', '波粒酱', '相对论人', '光行者', '声学控',
        '伯努利', '干涉迷', '测地线', '红移君', '双缝粉', '文丘里'
    ])[1 + ((g - 1) % 12)] || g::text,
    CASE WHEN g % 8 = 0 THEN 'DISABLED' ELSE 'ENABLED' END,
    (CURRENT_DATE - ((g * 7 + 3) % 30 || ' days')::interval)
        + ((9 + g % 10) || ' hours')::interval,
    CURRENT_TIMESTAMP
FROM generate_series(1, 24) AS g;

-- ---------------------------------------------------------------------------
-- 2. 访问日志（每天约 8~14 条，控制体量避免超时）
-- ---------------------------------------------------------------------------
WITH exps AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn, COUNT(*) OVER () AS n
    FROM experiments WHERE status = 'PUBLISHED'
),
demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM users WHERE username LIKE 'demo_%'
),
slots AS (
    SELECT
        d::date AS day,
        gs AS slot
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') AS d
    CROSS JOIN LATERAL generate_series(
        1,
        CASE
            WHEN d::date = CURRENT_DATE THEN 14
            WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 12
            ELSE 8
        END
    ) AS gs
)
INSERT INTO experiment_views (experiment_id, user_id, viewed_at)
SELECT
    e.id,
    CASE WHEN (s.slot % 5) = 0 THEN NULL ELSE u.id END,
    s.day + ((10 + s.slot) || ' hours')::interval + ((s.slot * 7) % 50 || ' minutes')::interval
FROM slots s
JOIN exps e ON e.rn = 1 + ((s.slot + EXTRACT(DAY FROM s.day)::int) % e.n)
JOIN demo_users u ON u.rn = 1 + ((s.slot * 3 + EXTRACT(DAY FROM s.day)::int) % 24);

-- ---------------------------------------------------------------------------
-- 3. 收藏
-- ---------------------------------------------------------------------------
INSERT INTO experiment_favorites (user_id, experiment_id, create_time)
SELECT
    u.id,
    e.id,
    CURRENT_DATE - (((u.rn + e.rn) % 20) || ' days')::interval
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users WHERE username LIKE 'demo_%') u
CROSS JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM experiments WHERE status = 'PUBLISHED') e
WHERE (e.rn = 1 AND u.rn % 10 < 7)
   OR (e.rn = 2 AND u.rn % 10 < 5)
   OR (e.rn = 3 AND u.rn % 10 < 3)
   OR (e.rn >= 4 AND u.rn % (e.rn + 4) = 0)
ON CONFLICT (user_id, experiment_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. 一级评论 + 二级回复 + 点赞（单条 SQL，集合写入）
-- ---------------------------------------------------------------------------
WITH demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM users WHERE username LIKE 'demo_%'
),
user_cnt AS (
    SELECT COUNT(*)::int AS n FROM demo_users
),
exps AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM experiments WHERE status = 'PUBLISHED'
),
root_texts AS (
    SELECT * FROM (VALUES
        (0, '这个实验可视化效果太棒了，终于看懂核心现象了！'),
        (1, '建议再加一个参数对比面板，会更好用。'),
        (2, '老师课堂上演示过，自己动手调一遍印象更深。'),
        (3, '3D 场景很沉浸，手机端也能流畅运行吗？'),
        (4, '知识库问答答得挺准，和实验联动不错。'),
        (5, '收藏了，期末复习用。'),
        (6, '希望能导出实验数据曲线。'),
        (7, '界面简洁，操作直觉，赞一个。')
    ) AS t(i, content)
),
reply_texts AS (
    SELECT * FROM (VALUES
        (0, '同感，调参后对照公式一下子就通了。'),
        (1, '手机端我这边也还行，建议开省电模式。'),
        (2, '附议，导出曲线对写实验报告很有用。'),
        (3, '可以问问 AI 助手，它会按当前页面给提示。'),
        (4, '我也收藏了，准备考研复习再用一遍。')
    ) AS t(i, content)
),
ins_roots AS (
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
        rt.content,
        0,
        'VISIBLE',
        CURRENT_TIMESTAMP - (((e.rn - 1) * 4 + s) || ' hours')::interval,
        CURRENT_TIMESTAMP - (((e.rn - 1) * 4 + s) || ' hours')::interval
    FROM exps e
    CROSS JOIN generate_series(0, 3) AS s
    CROSS JOIN user_cnt uc
    JOIN demo_users u ON u.rn = 1 + ((e.rn * 3 + s * 5) % uc.n)
    JOIN root_texts rt ON rt.i = (e.rn + s) % 8
    RETURNING id, experiment_id, owner_id, create_time
),
ins_replies AS (
    INSERT INTO experiment_comments (
        experiment_id, owner_id, owner_type, root_id, reply_to_id,
        content, like_count, status, create_time, update_time
    )
    SELECT
        r.experiment_id,
        u.id,
        0,
        r.id,
        r.id,
        rt.content,
        0,
        'VISIBLE',
        r.create_time + ((25 + s * 30) || ' minutes')::interval,
        r.create_time + ((25 + s * 30) || ' minutes')::interval
    FROM ins_roots r
    CROSS JOIN generate_series(0, 1) AS s
    CROSS JOIN user_cnt uc
    JOIN demo_users u
      ON u.rn = 1 + ((r.id + s * 7) % uc.n)
     AND u.id <> r.owner_id
    JOIN reply_texts rt ON rt.i = (r.id + s) % 5
    WHERE s = 0 OR (r.id % 2 = 0)
    RETURNING id, owner_id, create_time
),
all_comments AS (
    SELECT id, owner_id, create_time FROM ins_roots
    UNION ALL
    SELECT id, owner_id, create_time FROM ins_replies
)
INSERT INTO experiment_comment_likes (comment_id, user_id, create_time)
SELECT DISTINCT
    c.id,
    u.id,
    c.create_time + ((8 + u.rn) || ' minutes')::interval
FROM all_comments c
JOIN demo_users u ON u.id <> c.owner_id
   AND (c.id + u.rn) % 5 < 2
ON CONFLICT (comment_id, user_id) DO NOTHING;

-- 同步 like_count
UPDATE experiment_comments c
SET like_count = COALESCE((
        SELECT COUNT(*) FROM experiment_comment_likes l WHERE l.comment_id = c.id
    ), 0)
WHERE c.owner_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

-- ---------------------------------------------------------------------------
-- 5. AI 会话（精简：12 个用户各 1 会话，避免超时）
-- ---------------------------------------------------------------------------
WITH demo_users AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM users WHERE username LIKE 'demo_%' AND status = 'ENABLED'
),
exps AS (
    SELECT id, title, row_number() OVER (ORDER BY id) AS rn, COUNT(*) OVER () AS n
    FROM experiments WHERE status = 'PUBLISHED'
),
session_plan AS (
    SELECT
        u.id AS owner_id,
        CURRENT_DATE - ((u.rn % 14) || ' days')::interval + INTERVAL '11 hours' AS created_at,
        e.title
    FROM demo_users u
    JOIN exps e ON e.rn = 1 + (u.rn % e.n)
    WHERE u.rn <= 12
),
ins_sessions AS (
    INSERT INTO ai_chat_sessions (owner_id, owner_type, title, create_time, update_time)
    SELECT
        owner_id,
        0,
        left('关于「' || title || '」的提问', 200),
        created_at,
        created_at + INTERVAL '2 minutes'
    FROM session_plan
    RETURNING id, owner_id, create_time, title
)
INSERT INTO ai_chat_messages (session_id, role, content, context_json, create_time, rag_hit_count)
SELECT s.id, 'user',
       '这个实验的核心物理原理是什么？',
       jsonb_build_object('pageType', 'experiment', 'experimentTitle', s.title),
       s.create_time + INTERVAL '5 seconds', NULL
FROM ins_sessions s
UNION ALL
SELECT s.id, 'assistant',
       '根据知识库与实验上下文：该现象可用对应物理模型解释。调节参数时请观察关键观测量的变化趋势。',
       NULL, s.create_time + INTERVAL '20 seconds',
       CASE WHEN s.owner_id % 4 = 0 THEN 0 ELSE 1 + (s.owner_id % 3)::int END
FROM ins_sessions s
UNION ALL
SELECT s.id, 'user',
       '能再举一个和生活相关的例子吗？',
       jsonb_build_object('pageType', 'experiment'),
       s.create_time + INTERVAL '90 seconds', NULL
FROM ins_sessions s
WHERE s.owner_id % 2 = 0
UNION ALL
SELECT s.id, 'assistant',
       '可以。把课堂公式和实验旋钮一一对应，会更容易记住。',
       NULL, s.create_time + INTERVAL '110 seconds', 2
FROM ins_sessions s
WHERE s.owner_id % 2 = 0;

-- ---------------------------------------------------------------------------
-- 6. 同步实验冗余计数
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

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('experiment_views_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_views));
SELECT setval('experiment_favorites_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_favorites));
SELECT setval('experiment_comments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_comments));
SELECT setval('experiment_comment_likes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM experiment_comment_likes));
SELECT setval('ai_chat_sessions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_chat_sessions));
SELECT setval('ai_chat_messages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_chat_messages));
