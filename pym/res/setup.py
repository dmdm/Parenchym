import os
import logging
from pym.auth.const import SYSTEM_UID, WHEEL_RID
import pym.models
from .models import ResourceNode
from .const import *


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    scripts = (
        ('pym', 'vw_resource_acl_browse'),
    )
    for scr in scripts:
        if pym.models.exists(sess, name=scr[1], schema=scr[0]):
            continue
        fn = os.path.join(rc.root_dir, 'install', 'db',
            scr[0] + '.' + scr[1] + '.sql')
        mlgg.debug('Running SQL script: {}'.format(fn))
        with open(fn, 'rt', encoding='utf-8') as fh:
            q = fh.read()
        sess.execute(q)


def _setup_resources(sess):
    n_root = ResourceNode.create_root(sess=sess, owner=SYSTEM_UID, kind="res",
        name=NODE_NAME_ROOT, title='Root',
        iface='pym.res.models.IRootNode')
    return n_root


def _setup_acl(sess, n_root):
    # Grant group 'wheel' all permissions on resource 'root'.
    n_root.allow(sess, SYSTEM_UID, '*', group=WHEEL_RID)


def create_schema(sess, rc):
    pass


def setup(sess, rc):
    _create_views(sess, rc)
    n_root = _setup_resources(sess)
    _setup_acl(sess, n_root)
