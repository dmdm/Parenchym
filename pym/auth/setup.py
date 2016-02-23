import logging
import os
import pym.models
import pym.lib
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from pym.sys.const import NODE_NAME_SYS
from .manager import AuthMgr
from .const import *
from .models import Permission, Permissions


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    scripts = (
        ('pym', 'vw_user_browse'),
        ('pym', 'vw_group_browse'),
        ('pym', 'vw_group_member_browse'),
        ('pym', 'vw_permissions_with_children'),
        ('pym', 'vw_permission_tree'),
        #('pym', 'vw_resource_acl_browse'),
    )
    root_dir = os.path.join(os.path.dirname(__file__), '..', '..')
    pym.lib.install_db_scripts(mlgg, sess, root_dir, scripts)


def _setup_users(authmgr, root_pwd):
    # 1// Create user system
    u_system = authmgr.create_user(
        owner=SYSTEM_UID,
        id=SYSTEM_UID,
        is_enabled=False,
        principal='system',
        pwd=None,
        email='system@localhost',
        first_name='system',
        display_name='System',
        # Groups do not exist yet. Do not auto-create them
        groups=False
    )

    # 2// Create groups
    # This group should not have members.
    # Not-authenticated users are automatically member of 'everyone'
    authmgr.create_group(
        owner=SYSTEM_UID,
        id=EVERYONE_RID,
        name='everyone',
        descr='Everyone (incl. unauthenticated users)',
        kind=GROUP_KIND_SYSTEM
    )
    authmgr.create_group(
        owner=SYSTEM_UID,
        id=SYSTEM_RID,
        name='system',
    )
    g_wheel = authmgr.create_group(
        owner=SYSTEM_UID,
        id=WHEEL_RID,
        name='wheel',
        descr='Site Admins',
        kind=GROUP_KIND_SYSTEM
    )
    g_users = authmgr.create_group(
        owner=SYSTEM_UID,
        id=USERS_RID,
        name='users',
        descr='Authenticated Users',
        kind=GROUP_KIND_SYSTEM
    )
    g_unit_testers = authmgr.create_group(
        owner=SYSTEM_UID,
        id=UNIT_TESTERS_RID,
        name='unit testers',
        descr='Unit Testers',
        kind=GROUP_KIND_SYSTEM
    )

    # 3// Put 'system' into its groups
    authmgr.create_group_member(
        owner=SYSTEM_UID,
        group=g_users,
        member_user=u_system,
    )
    authmgr.create_group_member(
        owner=SYSTEM_UID,
        group=g_wheel,
        member_user=u_system
    )

    # 4// Create users

    # root
    u = authmgr.create_user(
        owner=SYSTEM_UID,
        id=ROOT_UID,
        principal='root',
        email='root@localhost',
        first_name='root',
        display_name='Root',
        pwd=root_pwd,
        is_enabled=True,
        groups=[g_wheel.name, g_users.name]
    )

    # nobody
    authmgr.create_user(
        owner=SYSTEM_UID,
        id=NOBODY_UID,
        principal='nobody',
        pwd=None,
        email='nobody@localhost',
        first_name='Nobody',
        display_name='Nobody',
        is_enabled=False,
        # Not-authenticated users are automatically 'nobody'
        groups=['everyone']
    )

    # sample data
    authmgr.create_user(
        owner=SYSTEM_UID,
        id=SAMPLE_DATA_UID,
        principal='sample_data',
        pwd=None,
        email='sample_data@localhost',
        first_name='Sample Data',
        display_name='Sample Data',
        is_enabled=False,
        # This user is not member of any group
        groups=False
    )

    # unit_tester
    authmgr.create_user(
        owner=SYSTEM_UID,
        id=UNIT_TESTER_UID,
        principal='unit_tester',
        pwd=None,
        email='unit_tester@localhost',
        first_name='Unit-Tester',
        display_name='Unit-Tester',
        is_enabled=False,
        user_type='System',
        groups=[g_unit_testers.name]
    )

    # 5// Set sequence counter for user-created things
    # XXX PostgreSQL only
    # Regular users have ID > 100
    authmgr.sess.execute('ALTER SEQUENCE pym.user_id_seq RESTART WITH 101')
    # Regular groups have ID > 100
    authmgr.sess.execute('ALTER SEQUENCE pym.group_id_seq RESTART WITH 101')
    authmgr.sess.flush()


def _setup_permissions(sess):
    """
    Sets up permission tree as follows:

        visit:                  visit a node
         |
         +-- read:              read an object
         |    +-- write:        write an object
         +-- delete:            delete an object
         |
         +-- admin
              +-- admin_auth:   admin users, groups, permissions, ACL
              +-- admin_res:    admin resources
    """
    p_all = Permission()
    p_all.owner_id = SYSTEM_UID
    p_all.name = Permissions.all.value
    p_all.descr = "All permissions."

    p_visit = Permission()
    p_visit.owner_id = SYSTEM_UID
    p_visit.name = Permissions.visit.value
    p_visit.descr = "Permission to visit this node. This is weaker than 'read'."

    p_read = Permission()
    p_read.owner_id = SYSTEM_UID
    p_read.name = Permissions.read.value
    p_read.descr = "Permission to read this resource."

    p_write = Permission()
    p_write.owner_id = SYSTEM_UID
    p_write.name = Permissions.write.value
    p_write.descr = "Permission to write this resource."

    p_delete = Permission()
    p_delete.owner_id = SYSTEM_UID
    p_delete.name = Permissions.delete.value
    p_delete.descr = "Permission to delete this resource."

    p_admin = Permission()
    p_admin.owner_id = SYSTEM_UID
    p_admin.name = Permissions.admin.value
    p_admin.descr = "Permission to administer in general."

    p_admin_auth = Permission()
    p_admin_auth.owner_id = SYSTEM_UID
    p_admin_auth.name = Permissions.admin_auth.value
    p_admin_auth.descr = "Permission to administer authentication and "\
        "authorization, like users, groups, permissions and ACL on resources."

    p_admin_res = Permission()
    p_admin_res.owner_id = SYSTEM_UID
    p_admin_res.name = Permissions.admin_res.value
    p_admin_res.descr = "Permission to administer resources."

    p_visit.add_child(p_read)
    p_visit.add_child(p_delete)
    p_visit.add_child(p_admin)

    p_read.add_child(p_write)

    p_admin.add_child(p_admin_auth)
    p_admin.add_child(p_admin_res)

    sess.add(p_all)
    sess.add(p_visit)


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    n_sys = n_root[NODE_NAME_SYS]

    n_sys_auth = n_sys.add_child(owner=SYSTEM_UID, kind="res",
        name=NODE_NAME_SYS_AUTH_MGR, title='AuthManager',
        iface='pym.auth.models.IAuthMgrNode')

    n_sys_auth.add_child(owner=SYSTEM_UID,
        kind="res", name=NODE_NAME_SYS_AUTH_USER_MGR, title='User Manager',
        iface='pym.auth.models.IUserMgrNode')

    n_sys_auth.add_child(owner=SYSTEM_UID,
        kind="res", name=NODE_NAME_SYS_AUTH_GROUP_MGR, title='Group Manager',
        iface='pym.auth.models.IGroupMgrNode')

    n_sys_auth.add_child(owner=SYSTEM_UID,
        kind="res", name=NODE_NAME_SYS_AUTH_GROUP_MEMBER_MGR,
        title='Group Member Manager',
        iface='pym.auth.models.IGroupMemberMgrNode')

    n_sys_auth.add_child(owner=SYSTEM_UID,
        kind="res", name=NODE_NAME_SYS_AUTH_PERMISSION_MGR, title='Permission Manager',
        iface='pym.auth.models.IPermissionMgrNode')


def create_schema(sess, rc):
    pass


def populate(sess, authmgr, root_pwd, rc):
    _setup_users(authmgr, root_pwd)
    _setup_permissions(sess)


def setup(sess, rc):
    _create_views(sess, rc)
    _setup_resources(sess)
