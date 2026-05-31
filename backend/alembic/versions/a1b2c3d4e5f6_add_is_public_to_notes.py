"""add_is_public_to_notes

Revision ID: a1b2c3d4e5f6
Revises: (replace with your latest revision ID from `alembic history`)
Create Date: 2026-05-31

Adds a non-nullable Boolean column `is_public` (default FALSE) to the `notes`
table.  Existing rows will be backfilled to FALSE (private) automatically.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = None   # ← replace with your actual previous revision ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add column as nullable so existing rows don't violate NOT NULL
    op.add_column(
        'notes',
        sa.Column('is_public', sa.Boolean(), nullable=True)
    )
    # Step 2: Back-fill all existing rows to FALSE
    op.execute("UPDATE notes SET is_public = FALSE WHERE is_public IS NULL")
    # Step 3: Tighten to NOT NULL with server-level default
    op.alter_column('notes', 'is_public', nullable=False, server_default=sa.text('FALSE'))


def downgrade() -> None:
    op.drop_column('notes', 'is_public')
