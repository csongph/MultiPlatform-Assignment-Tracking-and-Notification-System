-- ====================================================================================
-- FULL MIGRATION PATCH v3 — รวมทุก migration ที่ยังค้างอยู่
-- Project: MultiPlatform Assignment Tracking and Notification System
-- รันไฟล์นี้บน Neon SQL Console หรือ Supabase SQL Editor
-- ====================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 1: migration 7a8b9c0d1e2f (ถ้ายังไม่ได้รัน)
-- ─────────────────────────────────────────────────────────────────────────────────

-- 1a. เพิ่ม description + instructor_name ในตาราง courses
ALTER TABLE public.courses 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(150);

-- 1b. เพิ่ม reminder_intervals ใน notification_settings
ALTER TABLE public.notification_settings 
    ADD COLUMN IF NOT EXISTS reminder_intervals JSONB;

-- 1c. เพิ่ม lead_time_minutes ที่ขาดหายใน notification_settings (ORM model มีแล้ว)
ALTER TABLE public.notification_settings
    ADD COLUMN IF NOT EXISTS lead_time_minutes INTEGER NOT NULL DEFAULT 60;

-- 1d. เพิ่ม tier ใน notifications + unique constraint
ALTER TABLE public.notifications 
    ADD COLUMN IF NOT EXISTS tier SMALLINT NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_notification_user_ass_type_tier'
    ) THEN
        ALTER TABLE public.notifications 
        ADD CONSTRAINT uq_notification_user_ass_type_tier 
        UNIQUE (user_id, assignment_id, type, tier);
    END IF;
END $$;

-- 1e. สร้างตาราง password_recovery_tokens
CREATE TABLE IF NOT EXISTS public.password_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_password_recovery_tokens_user_id 
    ON public.password_recovery_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_password_recovery_tokens_token_hash 
    ON public.password_recovery_tokens(token_hash);

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 2: migration a1b2c3d4e5f6 (ใหม่ — missing columns + indexes)
-- ─────────────────────────────────────────────────────────────────────────────────

-- 2a. ตารางนี้อาจไม่อยู่ใน Neon รุ่นเก่า: สถานะงานเฉพาะบุคคล
CREATE TABLE IF NOT EXISTS public.user_assignment_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_assignment_status UNIQUE (user_id, assignment_id)
);

-- 2b. ตารางกฎช่วงเวลาแจ้งเตือนของผู้ใช้แต่ละคน
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type VARCHAR(20) NOT NULL DEFAULT 'due_soon',
    lead_time_minutes INTEGER NOT NULL,
    sequence_order SMALLINT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_rule_user_type_seq UNIQUE (user_id, type, sequence_order)
);

-- 2a. เพิ่ม columns ใน user_assignment_status
ALTER TABLE public.user_assignment_status
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2b. เพิ่ม columns ใน notification_rules
ALTER TABLE public.notification_rules
    ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'due_soon',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2c. เพิ่ม unique constraint บน notification_rules
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_notification_rule_user_type_seq'
    ) THEN
        ALTER TABLE public.notification_rules
        ADD CONSTRAINT uq_notification_rule_user_type_seq
        UNIQUE (user_id, type, sequence_order);
    END IF;
END $$;

-- 2d. Performance Indexes บน user_id ของตารางหลัก
CREATE INDEX IF NOT EXISTS ix_notifications_user_id 
    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_courses_user_id 
    ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS ix_uas_user_id 
    ON public.user_assignment_status(user_id);
CREATE INDEX IF NOT EXISTS ix_uas_assignment_id 
    ON public.user_assignment_status(assignment_id);
CREATE INDEX IF NOT EXISTS ix_oauth_connections_user_id 
    ON public.oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS ix_sync_logs_user_id 
    ON public.sync_logs(user_id);

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 3: Backfill notification_settings สำหรับ users ที่ยังไม่มี (existing users)
-- ─────────────────────────────────────────────────────────────────────────────────
INSERT INTO public.notification_settings (id, user_id, lead_time_minutes, new_assignment_enabled, due_soon_enabled, overdue_enabled, channel)
SELECT 
    gen_random_uuid(),
    u.id,
    60,    -- lead_time_minutes default
    TRUE,  -- new_assignment_enabled
    TRUE,  -- due_soon_enabled
    TRUE,  -- overdue_enabled
    'push' -- channel
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_settings ns WHERE ns.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 4: migration b2c3d4e5f6a — สถานะงานรายบุคคลและการเชื่อม Notification Rule
-- ─────────────────────────────────────────────────────────────────────────────────

-- 4a. รหัสรายวิชา
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS course_code VARCHAR(50);

-- 4b. สถานะ Assignment เฉพาะผู้ใช้
ALTER TABLE public.user_assignment_status
    ADD COLUMN IF NOT EXISTS submitted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS personal_note TEXT;

-- submitted_at จะมีค่าได้ต่อเมื่อผู้ใช้ส่งงานแล้วเท่านั้น
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_user_assignment_submission_time'
    ) THEN
        ALTER TABLE public.user_assignment_status
        ADD CONSTRAINT ck_user_assignment_submission_time
        CHECK (submitted = TRUE OR submitted_at IS NULL);
    END IF;
END $$;

-- 4c. เชื่อม Notification กับ Notification Rule ที่ทำให้เกิดการแจ้งเตือน
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS notification_rule_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_rule_id_fkey'
    ) THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_rule_id_fkey
        FOREIGN KEY (notification_rule_id)
        REFERENCES public.notification_rules(id);
    END IF;
END $$;

-- 4d. Index สำหรับ Dashboard, Task Tracking และ Notification Worker
CREATE INDEX IF NOT EXISTS ix_uas_user_pending
    ON public.user_assignment_status(user_id, assignment_id)
    WHERE submitted = FALSE;

CREATE INDEX IF NOT EXISTS ix_uas_user_overdue
    ON public.user_assignment_status(user_id, assignment_id)
    WHERE is_overdue = TRUE;

CREATE INDEX IF NOT EXISTS ix_notifications_notification_rule_id
    ON public.notifications(notification_rule_id);

-- 4e. สร้าง rule เริ่มต้นรอบที่ 1 ให้ผู้ใช้เดิมที่ยังไม่มี
INSERT INTO public.notification_rules (
    id, user_id, type, lead_time_minutes, sequence_order, is_enabled, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    'due_soon',
    COALESCE(ns.lead_time_minutes, 60),
    1,
    TRUE,
    now(),
    now()
FROM public.users u
LEFT JOIN public.notification_settings ns ON ns.user_id = u.id
WHERE NOT EXISTS (
    SELECT 1
    FROM public.notification_rules r
    WHERE r.user_id = u.id
      AND r.type = 'due_soon'
      AND r.sequence_order = 1
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 5: แสดงช่วงแจ้งเตือนเป็นจำนวน + หน่วยเวลา (day/hour/minute)
-- lead_time_minutes ยังคงไว้สำหรับ worker คำนวณเวลาเดิม
-- ─────────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notification_rules
    ADD COLUMN IF NOT EXISTS lead_time_value INTEGER,
    ADD COLUMN IF NOT EXISTS lead_time_unit VARCHAR(10);

UPDATE public.notification_rules
SET
    lead_time_value = CASE
        WHEN lead_time_minutes % 1440 = 0 THEN lead_time_minutes / 1440
        WHEN lead_time_minutes % 60 = 0 THEN lead_time_minutes / 60
        ELSE lead_time_minutes
    END,
    lead_time_unit = CASE
        WHEN lead_time_minutes % 1440 = 0 THEN 'day'
        WHEN lead_time_minutes % 60 = 0 THEN 'hour'
        ELSE 'minute'
    END
WHERE lead_time_value IS NULL OR lead_time_unit IS NULL;

ALTER TABLE public.notification_rules
    ALTER COLUMN lead_time_value SET NOT NULL,
    ALTER COLUMN lead_time_unit SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notification_rule_time_unit') THEN
        ALTER TABLE public.notification_rules
            ADD CONSTRAINT ck_notification_rule_time_unit
            CHECK (lead_time_unit IN ('day', 'hour', 'minute'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notification_rule_time_value') THEN
        ALTER TABLE public.notification_rules
            ADD CONSTRAINT ck_notification_rule_time_value
            CHECK (lead_time_value BETWEEN 1 AND 30);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 6: Sync Alembic revision
-- แนะนำ: หลังรัน SQL นี้ ให้รัน `alembic upgrade head` จากเครื่องแทน
-- เพราะ migration ถูกเขียนให้รันซ้ำได้และ Alembic จะบันทึก revision ให้อัตโนมัติ
-- ─────────────────────────────────────────────────────────────────────────────────
-- UPDATE public.alembic_version SET version_num = 'c3d4e5f6a7b';

-- ====================================================================================
-- END OF MIGRATION PATCH
-- ตรวจสอบผลลัพธ์:
--   SELECT * FROM alembic_version;               → ควรแสดง c3d4e5f6a7b หลังรัน alembic upgrade head
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'notification_rules';
--   SELECT COUNT(*) FROM notification_settings;  → ควรเท่ากับจำนวน users
-- ====================================================================================
