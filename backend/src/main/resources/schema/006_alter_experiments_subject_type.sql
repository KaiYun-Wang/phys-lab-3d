-- 实验表增加 subject_type_id 外键，保留 subject_type 冗余 code 字段

ALTER TABLE experiments
    ADD COLUMN IF NOT EXISTS subject_type_id BIGINT;

UPDATE experiments e
SET subject_type_id = st.id
FROM subject_types st
WHERE e.subject_type = st.code
  AND e.subject_type_id IS NULL;

ALTER TABLE experiments
    ALTER COLUMN subject_type_id SET NOT NULL;

ALTER TABLE experiments
    ADD CONSTRAINT fk_experiments_subject_type
        FOREIGN KEY (subject_type_id) REFERENCES subject_types (id);

ALTER TABLE experiments
    DROP CONSTRAINT IF EXISTS ck_experiments_subject_type;

COMMENT ON COLUMN experiments.subject_type_id IS '物理子学科 ID，FK → subject_types(id)';
COMMENT ON COLUMN experiments.subject_type IS '物理子学科 code 冗余字段（与 subject_types.code 同步，便于查询）';
