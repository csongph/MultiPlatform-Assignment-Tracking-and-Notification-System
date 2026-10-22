"""Add OTP state and attempt tracking to password recovery tokens."""

from alembic import op
import sqlalchemy as sa


revision = "g7b8c9d0e1"
down_revision = "f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "password_recovery_tokens",
        sa.Column("token_type", sa.String(length=10), server_default="otp", nullable=False),
    )
    op.add_column(
        "password_recovery_tokens",
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.alter_column("password_recovery_tokens", "token_type", server_default=None)
    op.alter_column("password_recovery_tokens", "attempt_count", server_default=None)


def downgrade() -> None:
    op.drop_column("password_recovery_tokens", "attempt_count")
    op.drop_column("password_recovery_tokens", "token_type")
