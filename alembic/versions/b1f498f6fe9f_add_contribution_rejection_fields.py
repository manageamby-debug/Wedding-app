"""add contribution rejection fields

Revision ID: b1f498f6fe9f
Revises: 3f517cef0cfe
Create Date: 2026-10-05 17:09:42.092521

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f498f6fe9f'
down_revision: Union[str, Sequence[str], None] = '3f517cef0cfe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'contributions',
        sa.Column('rejection_reason', sa.String(), nullable=True),
    )
    op.add_column(
        'contributions',
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contributions', 'rejected_at')
    op.drop_column('contributions', 'rejection_reason')
