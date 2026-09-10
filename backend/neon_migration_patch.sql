-- ====================================================================================
-- FULL MIGRATION PATCH v2 — รวมทุก migration ที่ยังค้างอยู่
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
-- BLOCK 3: อัพเดต alembic_version ให้ตรงกับ migration head ล่าสุด
-- ─────────────────────────────────────────────────────────────────────────────────
-- (รันหลังจาก BLOCK 1 และ 2 ผ่านทั้งหมด)
UPDATE public.alembic_version SET version_num = 'a1b2c3d4e5f6';

-- ─────────────────────────────────────────────────────────────────────────────────
-- BLOCK 4: Backfill notification_settings สำหรับ users ที่ยังไม่มี (existing users)
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

-- ====================================================================================
-- END OF MIGRATION PATCH
-- ตรวจสอบผลลัพธ์:
--   SELECT * FROM alembic_version;               → ควรแสดง a1b2c3d4e5f6
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'notification_rules';
--   SELECT COUNT(*) FROM notification_settings;  → ควรเท่ากับจำนวน users
-- ====================================================================================
