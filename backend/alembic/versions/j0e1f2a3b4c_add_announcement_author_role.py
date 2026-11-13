"""Track the verified author type of each platform announcement.

Revision ID: j0e1f2a3b4c
Revises: i9d0e1f2a3b
"""

from alembic import op

revision = "j0e1f2a3b4c"
down_revision = "i9d0e1f2a3b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS "
        "author_role VARCHAR(20) NOT NULL DEFAULT 'unknown'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE announcements DROP COLUMN IF EXISTS author_role")
