"""create rsvp table

Revision ID: 1ad35aec3c9c
Revises: b78b35c7de73
Create Date: 2026-10-05 14:39:23.960470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ad35aec3c9c'
down_revision: Union[str, Sequence[str], None] = 'b78b35c7de73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rsvps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("guest_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["guest_id"],
            ["guests.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("guest_id"),
    )
    op.create_index(
        op.f("ix_rsvps_id"),
        "rsvps",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_rsvps_id"),
        table_name="rsvps",
    )
    op.drop_table("rsvps")
