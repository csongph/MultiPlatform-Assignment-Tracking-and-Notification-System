"""store notification-rule lead times as a value and unit

Revision ID: c3d4e5f6a7b
Revises: b2c3d4e5f6a
Create Date: 2026-09-17 00:10:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c3d4e5f6a7b"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep lead_time_minutes as an internal calculation/cache column. The
    # value+unit fields are the source shown to and set by users.
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
    op.execute("ALTER TABLE notification_rules ALTER COLUMN lead_time_value SET NOT NULL")
    op.execute("ALTER TABLE notification_rules ALTER COLUMN lead_time_unit SET NOT NULL")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notification_rule_time_unit') THEN
                ALTER TABLE notification_rules
                    ADD CONSTRAINT ck_notification_rule_time_unit
                    CHECK (lead_time_unit IN ('day', 'hour', 'minute'));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_notification_rule_time_value') THEN
                ALTER TABLE notification_rules
                    ADD CONSTRAINT ck_notification_rule_time_value
                    CHECK (lead_time_value BETWEEN 1 AND 30);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS ck_notification_rule_time_value")
    op.execute("ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS ck_notification_rule_time_unit")
    op.execute("ALTER TABLE notification_rules DROP COLUMN IF EXISTS lead_time_unit")
    op.execute("ALTER TABLE notification_rules DROP COLUMN IF EXISTS lead_time_value")
