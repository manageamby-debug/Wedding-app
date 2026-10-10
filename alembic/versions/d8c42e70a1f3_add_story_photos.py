"""Add organizer story photos.

Revision ID: d8c42e70a1f3
Revises: 58a1c7d92e40
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8c42e70a1f3"
down_revision: Union[str, Sequence[str], None] = "58a1c7d92e40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "story_photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=80), nullable=False),
        sa.Column("chapter", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_name"),
    )
    op.create_index(
        op.f("ix_story_photos_event_id"), "story_photos", ["event_id"], unique=False
    )
    op.create_index(
        op.f("ix_story_photos_id"), "story_photos", ["id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_story_photos_id"), table_name="story_photos")
    op.drop_index(op.f("ix_story_photos_event_id"), table_name="story_photos")
    op.drop_table("story_photos")
