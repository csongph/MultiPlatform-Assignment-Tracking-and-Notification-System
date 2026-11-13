"""Allow user registration with the normalized user_roles schema.

Revision ID: h8c9d0e1f2a
Revises: g7b8c9d0e1
"""

from alembic import op


revision = "h8c9d0e1f2a"
down_revision = "g7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Older deployed databases may still have a required users.role_id column,
    # although current code stores roles in the user_roles association table.
    # Keep the legacy column for compatibility, but let new user inserts omit it.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'users'
                  AND column_name = 'role_id'
                  AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE users ALTER COLUMN role_id DROP NOT NULL;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # Do not restore NOT NULL: users created after this migration intentionally
    # rely on user_roles and have no value in the legacy column.
    pass
