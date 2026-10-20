"""align personal task state and notification links with the Neon schema

Revision ID: b2c3d4e5f6a
Revises: a1b2c3d4e5f6
Create Date: 2026-09-17 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b2c3d4e5f6a"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the fields required for user-specific task tracking and rules."""
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code VARCHAR(50)")

    op.execute(
        "ALTER TABLE user_assignment_status "
        "ADD COLUMN IF NOT EXISTS submitted BOOLEAN NOT NULL DEFAULT FALSE"
    )
    op.execute("ALTER TABLE user_assignment_status ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ")
    op.execute(
        "ALTER TABLE user_assignment_status "
        "ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT FALSE"
    )
    op.execute("ALTER TABLE user_assignment_status ADD COLUMN IF NOT EXISTS personal_note TEXT")

    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_rule_id UUID")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'notifications_rule_id_fkey'
            ) THEN
                ALTER TABLE notifications
                    ADD CONSTRAINT notifications_rule_id_fkey
                    FOREIGN KEY (notification_rule_id) REFERENCES notification_rules(id);
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_user_assignment_submission_time'
            ) THEN
                ALTER TABLE user_assignment_status
                    ADD CONSTRAINT ck_user_assignment_submission_time
                    CHECK (submitted = TRUE OR submitted_at IS NULL);
            END IF;
        END $$;
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_uas_user_pending "
        "ON user_assignment_status(user_id, assignment_id) WHERE submitted = FALSE"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_uas_user_overdue "
        "ON user_assignment_status(user_id, assignment_id) WHERE is_overdue = TRUE"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_notification_rule_id ON notifications(notification_rule_id)")
    # notification_rules may already use the value/unit schema even when the
    # Alembic version is behind. Ensure both the legacy calculation column and
    # current UI columns exist before seeding a default rule.
    op.execute(
        "ALTER TABLE notification_rules "
        "ADD COLUMN IF NOT EXISTS lead_time_minutes INTEGER NOT NULL DEFAULT 60"
    )
    op.execute("ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS lead_time_value INTEGER")
    op.execute("ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS lead_time_unit VARCHAR(10)")
    op.execute("""
        UPDATE notification_rules
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
        WHERE lead_time_value IS NULL OR lead_time_unit IS NULL
    """)
    op.execute("""
        INSERT INTO notification_rules (
            id, user_id, type, lead_time_minutes, lead_time_value, lead_time_unit,
            sequence_order, is_enabled, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            users.id,
            'due_soon',
            COALESCE(notification_settings.lead_time_minutes, 60),
            CASE
                WHEN COALESCE(notification_settings.lead_time_minutes, 60) % 1440 = 0
                    THEN COALESCE(notification_settings.lead_time_minutes, 60) / 1440
                WHEN COALESCE(notification_settings.lead_time_minutes, 60) % 60 = 0
                    THEN COALESCE(notification_settings.lead_time_minutes, 60) / 60
                ELSE COALESCE(notification_settings.lead_time_minutes, 60)
            END,
            CASE
                WHEN COALESCE(notification_settings.lead_time_minutes, 60) % 1440 = 0 THEN 'day'
                WHEN COALESCE(notification_settings.lead_time_minutes, 60) % 60 = 0 THEN 'hour'
                ELSE 'minute'
            END,
            1,
            TRUE,
            now(),
            now()
        FROM users
        LEFT JOIN notification_settings ON notification_settings.user_id = users.id
        WHERE NOT EXISTS (
            SELECT 1
            FROM notification_rules rules
            WHERE rules.user_id = users.id
              AND rules.type = 'due_soon'
              AND rules.sequence_order = 1
        )
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_notifications_notification_rule_id")
    op.execute("DROP INDEX IF EXISTS ix_uas_user_overdue")
    op.execute("DROP INDEX IF EXISTS ix_uas_user_pending")
    op.execute("ALTER TABLE user_assignment_status DROP CONSTRAINT IF EXISTS ck_user_assignment_submission_time")
    op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_rule_id_fkey")
    op.execute("ALTER TABLE notifications DROP COLUMN IF EXISTS notification_rule_id")
    op.execute("ALTER TABLE user_assignment_status DROP COLUMN IF EXISTS personal_note")
    op.execute("ALTER TABLE user_assignment_status DROP COLUMN IF EXISTS is_overdue")
    op.execute("ALTER TABLE user_assignment_status DROP COLUMN IF EXISTS submitted_at")
    op.execute("ALTER TABLE user_assignment_status DROP COLUMN IF EXISTS submitted")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS course_code")
