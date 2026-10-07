"""Add event name, couple names and contribution target.

Revision ID: 58a1c7d92e40
Revises: fff9f9a0b5f5
Create Date: 2026-10-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "58a1c7d92e40"
down_revision: Union[str, Sequence[str], None] = "fff9f9a0b5f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("name", sa.String(length=255), nullable=False, server_default=""),
    )
    op.add_column(
        "events",
        sa.Column("couple_names", sa.String(length=203), nullable=False, server_default=""),
    )
    op.add_column(
        "events",
        sa.Column(
            "target_contribution",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.execute(
        """
        UPDATE events
        SET couple_names = TRIM(groom_name) || ' & ' || TRIM(bride_name)
        WHERE couple_names = ''
        """
    )
    op.execute(
        """
        UPDATE events
        SET name = couple_names || ' Wedding'
        WHERE name = ''
        """
    )


def downgrade() -> None:
    op.drop_column("events", "target_contribution")
    op.drop_column("events", "couple_names")
    op.drop_column("events", "name")
