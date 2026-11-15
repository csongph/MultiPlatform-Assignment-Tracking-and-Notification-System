"""Remove duplicate provider connections and enforce one per user/platform.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
"""

from alembic import op


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep the active/newest token row. oauth_connections has no dependent
    # records, so removing duplicate token rows does not delete coursework.
    op.execute(
        """
        WITH ranked AS (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY user_id, platform_id
                       ORDER BY (status = 'connected') DESC, connected_at DESC, id DESC
                   ) AS row_number
            FROM oauth_connections
        )
        DELETE FROM oauth_connections AS connection
        USING ranked
        WHERE connection.id = ranked.id AND ranked.row_number > 1
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_user_platform "
        "ON oauth_connections (user_id, platform_id)"
    )


def downgrade() -> None:
    # Preserve a pre-existing unique constraint/index if this migration did
    # not create the index itself; leaving the invariant in place is safe.
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('uq_oauth_user_platform') IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1 FROM pg_constraint
                   WHERE conindid = to_regclass('uq_oauth_user_platform')
               ) THEN
                DROP INDEX uq_oauth_user_platform;
            END IF;
        END $$
        """
    )
