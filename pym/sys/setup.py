import logging
from pym.auth.const import SYSTEM_UID
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from .const import *


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)

    # Check that these resource nodes are not already present
    n_sys = ResourceNode.find(sess, parent=n_root,
        name=NODE_NAME_SYS)
    if not n_sys:
        n_sys = n_root.add_child(sess=sess, owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_SYS, title='Sys',
            iface='pym.sys.models.ISysNode')

    n = ResourceNode.find(sess, parent=n_sys,
        name=NODE_NAME_SYS_CACHE_MGMT)
    if not n:
        n_sys.add_child(sess=sess, owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_SYS_CACHE_MGMT, title='CacheMgmt',
            iface='pym.sys.models.ISysCacheMgmtNode')


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
