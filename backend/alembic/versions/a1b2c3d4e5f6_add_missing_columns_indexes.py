"""add missing columns indexes and notification defaults

Revision ID: a1b2c3d4e5f6
Revises: 7a8b9c0d1e2f
Create Date: 2026-09-01 08:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─────────────────────────────────────────────────────────────────
    # 1. user_assignment_status — เพิ่ม columns ที่ ORM มีแต่ DB ยังไม่มี
    # ─────────────────────────────────────────────────────────────────
    op.add_column(
        'user_assignment_status',
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'user_assignment_status',
        sa.Column('last_viewed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'user_assignment_status',
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        )
    )
    op.add_column(
        'user_assignment_status',
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        )
    )

    # ─────────────────────────────────────────────────────────────────
    # 2. notification_rules — เพิ่ม columns + unique constraint
    # ─────────────────────────────────────────────────────────────────
    op.add_column(
        'notification_rules',
        sa.Column('type', sa.String(length=20), server_default='due_soon', nullable=False)
    )
    op.add_column(
        'notification_rules',
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        )
    )
    op.add_column(
        'notification_rules',
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        )
    )
    # เพิ่ม unique constraint ป้องกัน duplicate rules ต่อ user+type+order
    op.create_unique_constraint(
        'uq_notification_rule_user_type_seq',
        'notification_rules',
        ['user_id', 'type', 'sequence_order']
    )

    # ─────────────────────────────────────────────────────────────────
    # 3. Performance Indexes บน user_id ของตารางที่ query บ่อย
    # ─────────────────────────────────────────────────────────────────
    op.create_index(
        'ix_notifications_user_id',
        'notifications',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_courses_user_id',
        'courses',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_uas_user_id',
        'user_assignment_status',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_uas_assignment_id',
        'user_assignment_status',
        ['assignment_id'],
        unique=False
    )
    op.create_index(
        'ix_oauth_connections_user_id',
        'oauth_connections',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_sync_logs_user_id',
        'sync_logs',
        ['user_id'],
        unique=False
    )


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
