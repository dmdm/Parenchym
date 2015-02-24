"""auth.user: add cols for g+ and profile

Revision ID: 26e7eb357d4
Revises: None
Create Date: 2014-12-23 22:38:26.562393

"""

# revision identifiers, used by Alembic.
revision = '26e7eb357d4'
down_revision = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON



def upgrade(rc):
    op.add_column('user', sa.Column('gplus_id', sa.Unicode(255), nullable=True), schema='pym')
    op.create_unique_constraint('user_gplus_id_ux', 'user', ['gplus_id'], schema='pym')

    op.add_column('user', sa.Column('profile', JSON(), nullable=True), schema='pym')
    op.add_column('user', sa.Column('rc', JSON(), nullable=True), schema='pym')
    op.add_column('user', sa.Column('sessionrc', JSON(), nullable=True), schema='pym')


def downgrade(rc):
    op.drop_column('user', 'sessionrc', schema='pym')
    op.drop_column('user', 'rc', schema='pym')
    op.drop_column('user', 'profile', schema='pym')

    op.drop_constraint('user_gplus_id_ux', schema='pym')
    op.drop_column('user', 'gplus_id', schema='pym')

