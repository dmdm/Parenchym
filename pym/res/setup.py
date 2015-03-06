import os
import logging
from pym.auth.const import SYSTEM_UID, WHEEL_RID, USERS_RID
from pym.auth.models import Permissions
import pym.models
from .models import ResourceNode
from .const import *


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    scripts = (
        ('pym', 'vw_resource_tree'),
    )
    pym.lib.install_db_scripts(mlgg, sess, rc.root_dir, scripts)


def _setup_resources(sess):
    n_root = ResourceNode.create_root(sess=sess, owner=SYSTEM_UID, kind="res",
        name=NODE_NAME_ROOT, title='Root',
        iface='pym.res.models.IRootNode')
    return n_root


def _setup_acl(sess, n_root):
    # Grant group 'wheel' all permissions on resource 'root'.
    n_root.allow(SYSTEM_UID, Permissions.all.value, group=WHEEL_RID)
    # Grant group 'users' permission 'visit' on resource 'root'.
    n_root.allow(SYSTEM_UID, Permissions.visit.value, group=USERS_RID)


def create_schema(sess, rc):
    pass


def setup(sess, rc):
    _create_views(sess, rc)
    n_root = _setup_resources(sess)
    _setup_acl(sess, n_root)
