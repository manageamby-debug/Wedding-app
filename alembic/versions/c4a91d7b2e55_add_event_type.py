"""Add event type (wedding, birthday, graduation).

Revision ID: c4a91d7b2e55
Revises: b8e2a649f341
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a91d7b2e55"
down_revision: Union[str, Sequence[str], None] = "b8e2a649f341"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing_columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("events")
    }
    if "event_type" not in existing_columns:
        # Every event that exists today is a wedding.
        op.add_column(
            "events",
            sa.Column(
                "event_type",
                sa.String(length=20),
                nullable=False,
                server_default="wedding",
            ),
        )


def downgrade() -> None:
    existing_columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("events")
    }
    if "event_type" in existing_columns:
        with op.batch_alter_table("events") as batch_op:
            batch_op.drop_column("event_type")
