"""Add synced platform announcements.

Revision ID: i9d0e1f2a3b
Revises: h8c9d0e1f2a
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "i9d0e1f2a3b"
down_revision = "h8c9d0e1f2a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "announcements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("external_announcement_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("course_id", "external_announcement_id", name="uq_announcement_course_external"),
    )


def downgrade() -> None:
    op.drop_table("announcements")
