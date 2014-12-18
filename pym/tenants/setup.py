from pym.auth.models import User
from pym.auth.manager import create_group_member
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from pym.sys.const import NODE_NAME_SYS
from pym.auth.const import SYSTEM_UID, NODE_NAME_SYS_AUTH_MGR
from .const import NODE_NAME_TENANT_MGR, DEFAULT_TENANT_NAME, DEFAULT_TENANT_TITLE
from . import manager as tmgr


def _create_views(sess):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    n_sys_auth = n_root[NODE_NAME_SYS][NODE_NAME_SYS_AUTH_MGR]

    n_sys_auth.add_child(
        sess=sess, owner=SYSTEM_UID,
        kind="res", name=NODE_NAME_TENANT_MGR, title='Tenant Manager',
        iface='pym.auth.models.ITenantMgrNode')


def _setup_tenants(sess):
    # Create tenant. Cascade also creates a resource and a group
    ten = tmgr.create_tenant(sess, SYSTEM_UID, name=DEFAULT_TENANT_NAME,
        title=DEFAULT_TENANT_TITLE, cascade=True)
    # Put all so far existing users into our group
    g = ten.load_my_group()
    uu = sess.query(User)
    for u in uu:
        create_group_member(sess, owner=SYSTEM_UID, group=g, member_user=u)


def create_schema(sess, rc):
    _create_views(sess)


def setup(sess, rc):
    _setup_resources(sess)
    _setup_tenants(sess)
