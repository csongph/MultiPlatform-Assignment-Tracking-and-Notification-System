"""Allow providers to omit an assignment link.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b
"""

from alembic import op


revision = "d4e5f6a7b8c9"
down_revision = "d3c4e5f6a7b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("assignments", "source_url", nullable=True)


def downgrade() -> None:
    # Old rows produced by earlier versions can have a NULL source URL. Give
    # them the empty value expected by the old schema before making it strict.
    op.execute("UPDATE assignments SET source_url = '' WHERE source_url IS NULL")
    op.alter_column("assignments", "source_url", nullable=False)
