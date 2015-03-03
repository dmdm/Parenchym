import logging
from sqlalchemy.orm.exc import NoResultFound
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
    try:
        n_sys = ResourceNode.find(sess, None, parent_id=n_root.id,
            name=NODE_NAME_SYS)
    except NoResultFound:
        n_sys = n_root.add_child(owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_SYS, title='Sys',
            iface='pym.sys.models.ISysNode')

    try:
        n = ResourceNode.find(sess, None, parent_id=n_sys.id,
            name=NODE_NAME_SYS_CACHE_MGMT)
    except NoResultFound:
        n_sys.add_child(owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_SYS_CACHE_MGMT, title='CacheMgmt',
            iface='pym.sys.models.ISysCacheMgmtNode')


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
