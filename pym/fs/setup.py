import logging

from pym.auth.const import SYSTEM_UID, WHEEL_RID
from pym.auth.models import Permissions
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from pym.tenants.const import DEFAULT_TENANT_NAME
from .models import FsNode


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess, authmgr):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    # Attach filesystem to default tenant
    n_tenant = n_root[DEFAULT_TENANT_NAME]

    n_fs = FsNode.create_root(sess, SYSTEM_UID, n_tenant)
    # Create group 'fs_writer' with write and delete access to this node
    g = authmgr.create_group(SYSTEM_UID, 'fs_writer', tenant_id=n_tenant.id)
    n_fs.allow(SYSTEM_UID, Permissions.write.value, group=g)
    n_fs.allow(SYSTEM_UID, Permissions.delete.value, group=g)
    # Make group wheel a member of this group
    authmgr.create_group_member(SYSTEM_UID, g, member_group=WHEEL_RID)


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc, authmgr):
    _setup_resources(sess, authmgr)
