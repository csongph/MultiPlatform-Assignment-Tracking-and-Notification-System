"""add recovery tokens and notification tiers

Revision ID: 7a8b9c0d1e2f
Revises: 0f9f537f2d5a
Create Date: 2026-08-31 09:33:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, Sequence[str], None] = '0f9f537f2d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add description and instructor_name to courses
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(150)")

    # 2. Add reminder_intervals to notification_settings
    op.execute("ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS reminder_intervals JSONB")

    # 3. Add tier to notifications and unique constraint
    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tier SMALLINT NOT NULL DEFAULT 1")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_notification_user_ass_type_tier'
                  AND conrelid = 'notifications'::regclass
            ) THEN
                ALTER TABLE notifications
                    ADD CONSTRAINT uq_notification_user_ass_type_tier
                    UNIQUE (user_id, assignment_id, type, tier);
            END IF;
        END $$
    """)

    # 4. Create password_recovery_tokens table
    op.execute("""
        CREATE TABLE IF NOT EXISTS password_recovery_tokens (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            is_used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_password_recovery_tokens_user_id ON password_recovery_tokens(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_password_recovery_tokens_token_hash ON password_recovery_tokens(token_hash)")


def downgrade() -> None:
    op.drop_index(op.f('ix_password_recovery_tokens_token_hash'), table_name='password_recovery_tokens')
    op.drop_index(op.f('ix_password_recovery_tokens_user_id'), table_name='password_recovery_tokens')
    op.drop_table('password_recovery_tokens')
    op.drop_constraint('uq_notification_user_ass_type_tier', 'notifications', type_='unique')
    op.drop_column('notifications', 'tier')
    op.drop_column('notification_settings', 'reminder_intervals')
    op.drop_column('courses', 'instructor_name')
    op.drop_column('courses', 'description')
