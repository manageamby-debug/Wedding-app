"""create payment audit logs

Revision ID: 919d5e683505
Revises: b1f498f6fe9f
Create Date: 2026-10-05 17:16:47.772574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '919d5e683505'
down_revision: Union[str, Sequence[str], None] = 'b1f498f6fe9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the audit table if metadata.create_all already created it."""
    if not sa.inspect(op.get_bind()).has_table('payment_audits'):
        op.create_table(
            'payment_audits',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('contribution_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('action', sa.String(), nullable=False),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['contribution_id'], ['contributions.id']),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(
            'ix_payment_audits_id',
            'payment_audits',
            ['id'],
            unique=False,
        )


def downgrade() -> None:
    """Drop the payment audit table."""
    op.drop_table('payment_audits')
