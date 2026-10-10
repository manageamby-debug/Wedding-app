"""Add event committee memberships.

Revision ID: b8e2a649f341
Revises: d8c42e70a1f3
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8e2a649f341"
down_revision: Union[str, Sequence[str], None] = "d8c42e70a1f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_member"),
    )
    op.create_index(op.f("ix_event_members_id"), "event_members", ["id"], unique=False)
    op.create_index(op.f("ix_event_members_event_id"), "event_members", ["event_id"], unique=False)
    op.create_index(op.f("ix_event_members_user_id"), "event_members", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_event_members_user_id"), table_name="event_members")
    op.drop_index(op.f("ix_event_members_event_id"), table_name="event_members")
    op.drop_index(op.f("ix_event_members_id"), table_name="event_members")
    op.drop_table("event_members")
