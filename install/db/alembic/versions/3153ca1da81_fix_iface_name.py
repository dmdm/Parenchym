"""Fix iface name

Revision ID: 3153ca1da81
Revises: 26e7eb357d4
Create Date: 2014-12-30 12:42:55.570078

"""

# revision identifiers, used by Alembic.
revision = '3153ca1da81'
down_revision = '26e7eb357d4'

from alembic import op
import sqlalchemy as sa


def upgrade(rc):
    op.execute("UPDATE pym.resource_tree SET iface='pym.tenants.models.ITenantMgrNode' WHERE iface='pym.auth.models.ITenantMgrNode'")


def downgrade(rc):
    pass