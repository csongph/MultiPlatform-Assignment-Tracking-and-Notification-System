"""add_missing_user_roles_sync_logs

Revision ID: 4c69d2592829
Revises: 0f9f537f2d5a
Create Date: 2026-10-08 20:59:04.375511

"""
from alembic import op
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '4c69d2592829'
down_revision = '0f9f537f2d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role_id SMALLINT NOT NULL REFERENCES roles(id),
            PRIMARY KEY (user_id, role_id)
        )
    """)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'role_id'
            ) THEN
                EXECUTE 'INSERT INTO user_roles (user_id, role_id) '
                     || 'SELECT id, role_id FROM users WHERE role_id IS NOT NULL '
                     || 'ON CONFLICT (user_id, role_id) DO NOTHING';
            END IF;
        END $$
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS sync_logs (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            platform_id SMALLINT NOT NULL REFERENCES platforms(id),
            status VARCHAR(20) NOT NULL,
            items_synced INTEGER NOT NULL DEFAULT 0,
            error_detail JSONB,
            started_at TIMESTAMPTZ NOT NULL,
            finished_at TIMESTAMPTZ
        )
    """)
    op.execute("ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS lead_time_minutes INTEGER NOT NULL DEFAULT 60")


def downgrade() -> None:
    op.execute("ALTER TABLE notification_settings DROP COLUMN IF EXISTS lead_time_minutes")
    op.execute("DROP TABLE IF EXISTS sync_logs")
    op.execute("DROP TABLE IF EXISTS user_roles")

