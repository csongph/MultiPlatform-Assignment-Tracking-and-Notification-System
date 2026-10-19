"""add missing columns indexes and notification defaults

Revision ID: a1b2c3d4e5f6
Revises: 7a8b9c0d1e2f
Create Date: 2026-09-01 08:25:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This revision originally assumed that two tables were created by an
    # untracked migration.  Make a clean `alembic upgrade head` reliable by
    # creating the missing tables and then applying every additive change
    # idempotently.  Existing Neon databases already at this revision are
    # unaffected because Alembic will not run it again.
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_assignment_status (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            assignment_id UUID NOT NULL REFERENCES assignments(id),
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            last_viewed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_user_assignment_status UNIQUE (user_id, assignment_id)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS notification_rules (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            type VARCHAR(20) NOT NULL DEFAULT 'due_soon',
            lead_time_minutes INTEGER NOT NULL,
            sequence_order SMALLINT NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_notification_rule_user_type_seq
                UNIQUE (user_id, type, sequence_order)
        )
    """)

    op.execute("ALTER TABLE user_assignment_status ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ")
    op.execute("ALTER TABLE user_assignment_status ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ")
    op.execute("ALTER TABLE user_assignment_status ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("ALTER TABLE user_assignment_status ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'due_soon'")
    op.execute("ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_notification_rule_user_type_seq'
            ) THEN
                ALTER TABLE notification_rules
                    ADD CONSTRAINT uq_notification_rule_user_type_seq
                    UNIQUE (user_id, type, sequence_order);
            END IF;
        END $$;
    """)

    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_courses_user_id ON courses(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_uas_user_id ON user_assignment_status(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_uas_assignment_id ON user_assignment_status(assignment_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_oauth_connections_user_id ON oauth_connections(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_sync_logs_user_id ON sync_logs(user_id)")


def downgrade() -> None:
    # Performance Indexes
    op.drop_index('ix_sync_logs_user_id', table_name='sync_logs')
    op.drop_index('ix_oauth_connections_user_id', table_name='oauth_connections')
    op.drop_index('ix_uas_assignment_id', table_name='user_assignment_status')
    op.drop_index('ix_uas_user_id', table_name='user_assignment_status')
    op.drop_index('ix_courses_user_id', table_name='courses')
    op.drop_index('ix_notifications_user_id', table_name='notifications')

    # notification_rules
    op.drop_constraint('uq_notification_rule_user_type_seq', 'notification_rules', type_='unique')
    op.drop_column('notification_rules', 'updated_at')
    op.drop_column('notification_rules', 'created_at')
    op.drop_column('notification_rules', 'type')

    # user_assignment_status
    op.drop_column('user_assignment_status', 'updated_at')
    op.drop_column('user_assignment_status', 'created_at')
    op.drop_column('user_assignment_status', 'last_viewed_at')
    op.drop_column('user_assignment_status', 'read_at')
