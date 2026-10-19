"""Merge the role/sync-log and assignment/notification migration branches.

Revision ID: d3c4e5f6a7b
Revises: c3d4e5f6a7b, 4c69d2592829
"""

from typing import Sequence, Union


revision: str = "d3c4e5f6a7b"
down_revision: Union[str, Sequence[str], None] = ("c3d4e5f6a7b", "4c69d2592829")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
