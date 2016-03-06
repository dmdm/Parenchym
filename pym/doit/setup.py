import logging
from sqlalchemy.orm.exc import NoResultFound
from pym.auth.const import SYSTEM_UID, USERS_RID
from pym.auth.models import Permissions
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from pym.tenants.const import DEFAULT_TENANT_NAME
from .const import *


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    # Attach doit to default tenant
    n_tenant = n_root[DEFAULT_TENANT_NAME]
    # Check that these resource nodes are not already present
    try:
        n_doit = ResourceNode.find(sess, None, parent_id=n_tenant.id,
            name=NODE_NAME_DOIT)
    except NoResultFound:
        n_doit = n_tenant.add_child(owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_DOIT, title='Doit',
            iface='pym.me.models.IDoitNode')
    # Grant group 'users' permission 'visit' on resource 'doit'.
    n_doit.allow(SYSTEM_UID, Permissions.visit.value, group=USERS_RID)


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
