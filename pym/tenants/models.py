import pyramid.util
import sqlalchemy as sa
import sqlalchemy.orm
import sqlalchemy.event
import zope.interface
from pym.auth import Group
from pym.auth.const import GROUP_KIND_TENANT

import pym.lib
import pym.exc
import pym.res.models
from .const import DEFAULT_TENANT_NAME


class ITenantMgrNode(zope.interface.Interface):
    """
    This node is for the tenant manager.

    The tenant manager is located within the authentication manager.
    """
    pass


class ITenantNode(zope.interface.Interface):
    """
    Default interface for a tenant node. Used as context to connect to a
    specific view, i.e. the home page of this tenant.
    """
    pass


class Tenant(pym.res.models.ResourceNode):
    """
    A tenant.

    By default we have one tenant node, the default tenant as immediate child of
    root. If you create more tenants, more nodes will be created. Still they
    have the same interface and thus connect to the same view. Typically, this
    behaviour is sufficient, but if you want special views for specific tenants,
    change the interface.

    We have a load-listener (:func:`tenant_node_load_listener`) that applies the
    interface to a freshly loaded Tenant.
    """
    __tablename__ = "tenant"
    __table_args__ = (
        {'schema': 'pym'}
    )
    __mapper_args__ = {
        'polymorphic_identity': 'tenant'
    }

    id = sa.Column(
        sa.Integer(),
        sa.ForeignKey(
            'pym.resource_tree.id',
            onupdate='CASCADE',
            ondelete='CASCADE',
            name='tenant_resource_tree_id_fk'
        ),
        primary_key=True,
        nullable=False
    )
    # Load description only if needed
    descr = sa.orm.deferred(sa.Column(sa.UnicodeText, nullable=True))
    """Optional description."""

    def __init__(self, owner_id, name, **kwargs):
        super().__init__(owner_id=owner_id, name=name, kind='tenant', **kwargs)
        self.iface = __name__ + '.' + ITenantNode.__name__

    @classmethod
    def load_default_tenant(cls, sess):
        return sess.query(cls).filter(cls.name == DEFAULT_TENANT_NAME).one()

    def load_my_group(self):
        sess = sa.inspect(self).session
        return sess.query(Group).filter(
            sa.and_(
                Group.tenant_id == None,
                Group.name == self.name,
                Group.kind == GROUP_KIND_TENANT
            )
        ).one()

    def __repr__(self):
        return "<{name}(id={id}, name='{n}'>".format(
            id=self.id, n=self.name, name=self.__class__.__name__)


# When we load a node from DB attach the stored interface to the instance.
# noinspection PyUnusedLocal
def tenant_node_load_listener(target, context):
    if target.iface:
        iface = pyramid.util.DottedNameResolver(None).resolve(target.iface)
        zope.interface.alsoProvides(target, iface)

sa.event.listen(Tenant, 'load', tenant_node_load_listener)
