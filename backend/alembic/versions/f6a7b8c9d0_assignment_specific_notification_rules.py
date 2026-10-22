"""Support per-assignment reminder rules.

Revision ID: f6a7b8c9d0
Revises: e5f6a7b8c9d0
"""

from alembic import op
import sqlalchemy as sa


revision = "f6a7b8c9d0"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_rules",
        sa.Column("assignment_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_notification_rules_assignment_id_assignments",
        "notification_rules",
        "assignments",
        ["assignment_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.execute(
        "ALTER TABLE notification_rules "
        "DROP CONSTRAINT IF EXISTS uq_notification_rule_user_type_seq"
    )
    op.create_index(
        "uq_notification_rule_global_user_type_seq",
        "notification_rules",
        ["user_id", "type", "sequence_order"],
        unique=True,
        postgresql_where=sa.text("assignment_id IS NULL"),
    )
    op.create_index(
        "uq_notification_rule_user_type_assignment",
        "notification_rules",
        ["user_id", "type", "assignment_id"],
        unique=True,
        postgresql_where=sa.text("assignment_id IS NOT NULL"),
    )


def downgrade() -> None:
    # Per-assignment rules cannot be represented by the previous schema.
    op.execute(
        "UPDATE notifications SET notification_rule_id = NULL "
        "WHERE notification_rule_id IN "
        "(SELECT id FROM notification_rules WHERE assignment_id IS NOT NULL)"
    )
    op.execute("DELETE FROM notification_rules WHERE assignment_id IS NOT NULL")
    op.drop_index("uq_notification_rule_user_type_assignment", table_name="notification_rules")
    op.drop_index("uq_notification_rule_global_user_type_seq", table_name="notification_rules")
    op.drop_constraint(
        "fk_notification_rules_assignment_id_assignments",
        "notification_rules",
        type_="foreignkey",
    )
    op.drop_column("notification_rules", "assignment_id")
    op.create_unique_constraint(
        "uq_notification_rule_user_type_seq",
        "notification_rules",
        ["user_id", "type", "sequence_order"],
    )
