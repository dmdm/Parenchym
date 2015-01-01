import logging
from pym.auth.const import SYSTEM_UID, WHEEL_RID
from pym.auth.models import Permissions
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from .const import *


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)

    # Check that these resource nodes are not already present
    n_fs = ResourceNode.find(sess, parent=n_root,
        name=NODE_NAME_FS)
    if not n_fs:
        n_fs = n_root.add_child(sess=sess, owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_FS, title='Filesystem',
            iface='pym.fs.models.IFsNode')
    # Grant group 'wheel' permission 'write' on resource 'fs'.
    n_fs.allow(sess, SYSTEM_UID, Permissions.write.value, group=WHEEL_RID)


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
