"""Add event name, couple names and contribution target.

Revision ID: 58a1c7d92e40
Revises: 919d5e683505
Create Date: 2026-10-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "58a1c7d92e40"
down_revision: Union[str, Sequence[str], None] = "919d5e683505"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("events")
    }
    additions = {
        "name": sa.Column(
            "name", sa.String(length=255), nullable=False, server_default=""
        ),
        "couple_names": sa.Column(
            "couple_names", sa.String(length=203), nullable=False, server_default=""
        ),
        "target_contribution": sa.Column(
            "target_contribution",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default=sa.text("0"),
        ),
    }

    for column_name, column in additions.items():
        if column_name not in existing_columns:
            op.add_column("events", column)

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
    existing_columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("events")
    }
    for column_name in ("target_contribution", "couple_names", "name"):
        if column_name in existing_columns:
            op.drop_column("events", column_name)
