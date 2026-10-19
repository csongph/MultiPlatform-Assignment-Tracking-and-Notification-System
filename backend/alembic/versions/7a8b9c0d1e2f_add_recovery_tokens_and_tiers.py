"""add recovery tokens and notification tiers

Revision ID: 7a8b9c0d1e2f
Revises: 0f9f537f2d5a
Create Date: 2026-08-31 09:33:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, Sequence[str], None] = '0f9f537f2d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add description and instructor_name to courses
    op.add_column('courses', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('courses', sa.Column('instructor_name', sa.String(length=150), nullable=True))

    # 2. Add reminder_intervals to notification_settings
    op.add_column('notification_settings', sa.Column('reminder_intervals', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # 3. Add tier to notifications and unique constraint
    op.add_column('notifications', sa.Column('tier', sa.SmallInteger(), server_default='1', nullable=False))
    op.create_unique_constraint('uq_notification_user_ass_type_tier', 'notifications', ['user_id', 'assignment_id', 'type', 'tier'])

    # 4. Create password_recovery_tokens table
    op.create_table('password_recovery_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_recovery_tokens_user_id'), 'password_recovery_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_password_recovery_tokens_token_hash'), 'password_recovery_tokens', ['token_hash'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_password_recovery_tokens_token_hash'), table_name='password_recovery_tokens')
    op.drop_index(op.f('ix_password_recovery_tokens_user_id'), table_name='password_recovery_tokens')
    op.drop_table('password_recovery_tokens')
    op.drop_constraint('uq_notification_user_ass_type_tier', 'notifications', type_='unique')
    op.drop_column('notifications', 'tier')
    op.drop_column('notification_settings', 'reminder_intervals')
    op.drop_column('courses', 'instructor_name')
    op.drop_column('courses', 'description')
