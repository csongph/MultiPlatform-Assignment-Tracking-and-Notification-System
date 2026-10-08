"""add_missing_user_roles_sync_logs

Revision ID: 4c69d2592829
Revises: 0f9f537f2d5a
Create Date: 2026-10-08 20:59:04.375511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c69d2592829'
down_revision: Union[str, Sequence[str], None] = '0f9f537f2d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy.dialects import postgresql


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Create user_roles if not exists
    if "user_roles" not in tables:
        op.create_table(
            "user_roles",
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("role_id", sa.SmallInteger(), nullable=False),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id", "role_id"),
        )

    # 2. Populate user_roles from existing users.role_id if present
    user_cols = [c["name"] for c in inspector.get_columns("users")]
    if "role_id" in user_cols:
        op.execute(
            """
            INSERT INTO user_roles (user_id, role_id)
            SELECT id, role_id FROM users
            WHERE role_id IS NOT NULL
            ON CONFLICT (user_id, role_id) DO NOTHING;
            """
        )

    # 3. Create sync_logs if not exists
    if "sync_logs" not in tables:
        op.create_table(
            "sync_logs",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("platform_id", sa.SmallInteger(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("items_synced", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_detail", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["platform_id"], ["platforms.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # 4. Add lead_time_minutes to notification_settings if missing
    if "notification_settings" in tables:
        ns_cols = [c["name"] for c in inspector.get_columns("notification_settings")]
        if "lead_time_minutes" not in ns_cols:
            op.add_column(
                "notification_settings",
                sa.Column("lead_time_minutes", sa.Integer(), nullable=False, server_default="60"),
            )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "notification_settings" in tables:
        ns_cols = [c["name"] for c in inspector.get_columns("notification_settings")]
        if "lead_time_minutes" in ns_cols:
            op.drop_column("notification_settings", "lead_time_minutes")

    if "sync_logs" in tables:
        op.drop_table("sync_logs")

    if "user_roles" in tables:
        op.drop_table("user_roles")

