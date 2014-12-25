import logging
from pym.auth.const import SYSTEM_UID, USERS_RID
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
    n_me = ResourceNode.find(sess, parent=n_root,
        name=NODE_NAME_ME)
    if not n_me:
        n_me = n_root.add_child(sess=sess, owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_ME, title='Me',
            iface='pym.me.models.IMeNode')
    # Grant group 'users' permission 'write' on resource 'me'.
    n_me.allow(sess, SYSTEM_UID, Permissions.write.value, group=USERS_RID)

    n = ResourceNode.find(sess, parent=n_me,
        name=NODE_NAME_ME_PROFILE)
    if not n:
        n_me.add_child(sess=sess, owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_ME_PROFILE, title='Profile',
            iface='pym.me.models.IMeProfileNode')


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
