"""add checked in timestamp

Revision ID: 3f517cef0cfe
Revises: 1ad35aec3c9c
Create Date: 2026-10-05 15:57:05.159855

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f517cef0cfe'
down_revision: Union[str, Sequence[str], None] = '1ad35aec3c9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('guests', sa.Column('checked_in_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('guests') as batch_op:
        batch_op.drop_column('checked_in_at')
