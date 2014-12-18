import sqlalchemy as sa
import sqlalchemy.orm
from sqlalchemy.ext.hybrid import hybrid_property
import pyramid.i18n
import zope.interface
from pym.auth import Group
from pym.auth.const import GROUP_KIND_TENANT

from pym.models import (
    DbBase, DefaultMixin
)
from pym.models.types import CleanUnicode
import pym.lib
import pym.exc
import pym.auth.models as pam
from .const import DEFAULT_TENANT_NAME


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


class ITenantMgrNode(zope.interface.Interface):
    """
    This node is for the tenant manager.

    The tenant manager is located within the authentication manager.
    """
    pass


class ITenantNode(zope.interface.Interface):
    """
    This node is for the home page of a tenant.
    """
    pass


class Tenant(DbBase, DefaultMixin):
    """
    A tenant.
    """
    __tablename__ = "tenant"
    __table_args__ = (
        sa.UniqueConstraint('name', name='tenant_ux'),
        {'schema': 'pym'}
    )

    name = sa.Column(CleanUnicode(255), nullable=False)
    _title = sa.Column('title', CleanUnicode(255), nullable=True)
    # Load description only if needed
    descr = sa.orm.deferred(sa.Column(sa.UnicodeText, nullable=True))
    """Optional description."""

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

    @hybrid_property
    def title(self):
        """
        Title of this node.

        Uses ``name`` if not set.
        """
        return self._title if self._title else self.name

    @title.setter
    def title(self, v):
        self._title = v

    def __repr__(self):
        return "<{name}(id={id}, name='{n}'>".format(
            id=self.id, n=self.name, name=self.__class__.__name__)
