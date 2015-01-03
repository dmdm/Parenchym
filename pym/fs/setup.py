import logging
from sqlalchemy.orm.exc import NoResultFound
from pym.auth.const import SYSTEM_UID, WHEEL_RID
from pym.auth.models import Permissions
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from .const import *
from pym.tenants.const import DEFAULT_TENANT_NAME
from . import manager as mgr


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    # Attach filesystem to default tenant
    n_tenant = n_root[DEFAULT_TENANT_NAME]

    # Check that these resource nodes are not already present
    try:
        n_fs = ResourceNode.find(sess, None, parent_id=n_tenant.id, name=NODE_NAME_FS)
    except NoResultFound:
        n_fs = mgr.create_fs_node(sess, SYSTEM_UID, parent_id=n_tenant.id,
            name=NODE_NAME_FS, raise_if_exists=True, title='Filesystem')
    # Grant group 'wheel' permission 'write' on resource 'fs'.
    n_fs.allow(sess, SYSTEM_UID, Permissions.write.value, group=WHEEL_RID)


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
