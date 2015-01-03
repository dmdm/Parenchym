import datetime
from pyramid.location import lineage
import sqlalchemy as sa
import pyramid.location
from pym.auth.models import User, Group, GroupMember
from pym.auth.manager import create_group, create_group_member
from pym.auth.const import SYSTEM_UID, GROUP_KIND_TENANT
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from .models import Tenant
from .const import DEFAULT_TENANT_NAME
import pym.exc


def create_tenant(sess, owner, name, **kwargs):
    """
    Creates a new tenant record.

    :param sess: A DB session instance.
    :param owner: ID, ``principal``, or instance of a user.
    :param name: Name.
    :param kwargs: See :class:`~pym.auth.models.Tenant`.
    :return: Instance of created tenant.
    """
    owner_id = User.find(sess, owner).id
    if 'title' not in kwargs:
        kwargs['title'] = name.title()

    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    if name in n_root.children:
        raise pym.exc.ItemExistsError("Tenant already exists: '{}'".format(name))
    ten = Tenant(owner_id, name, **kwargs)
    n_root.children[name] = ten

    # Create tenant's group
    create_group(sess, owner, name, kind=GROUP_KIND_TENANT,
        descr="All members of tenant " + name)

    sess.flush()
    return ten


def update_tenant(sess, tenant, editor, **kwargs):
    """
    Updates a tenant.

    For details about ``**kwargs``, see :class:`~pym.auth.models.Tenant`.

    :param sess: A DB session instance.
    :param tenant: ID, ``name``, or instance of a tenant.
    :param editor: ID, ``principal``, or instance of a user.
    :return: Instance of updated tenant.
    """

    # TODO Rename tenant's resource
    # TODO Rename tenant's group

    ten = Tenant.find(sess, tenant)
    ten.editor_id = User.find(sess, editor).id
    ten.mtime = datetime.datetime.now()
    for k, v in kwargs.items():
        setattr(ten, k, v)
    sess.flush()
    return ten


def delete_tenant(sess, tenant, deleter, delete_from_db=False):
    """
    Deletes a tenant.

    :param sess: A DB session instance.
    :param tenant: ID, ``name``, or instance of a tenant.
    :param deleter: ID, ``principal``, or instance of a user.
    :param delete_from_db: Optional. Defaults to just tag as deleted (False),
        set True to physically delete record from DB.
    :return: None if really deleted, else instance of tagged tenant.
    """

    # TODO Delete tenant's resource
    # TODO Delete tenant's group

    ten = Tenant.find(sess, tenant)
    if delete_from_db:
        sess.delete(ten)
        ten = None
    else:
        ten.deleter_id = User.find(sess, deleter).id
        ten.dtime = datetime.datetime.now()
        # TODO Replace content of unique fields
    sess.flush()
    return ten


def collect_my_tenants(sess, user_id):
    """
    Returns list of tenants to which given user belongs.

    Each tenant has a global group with the same name. Membership in those
    groups determines whether a tenant is listed here or not.

    :param sess: Instance of a DB session.
    :param user_id: ID of user.
    :return: List of tenants.
    """
    tt = sess.query(
        Tenant
    ).join(
        Group, Group.name == Tenant.name
    ).join(
        GroupMember, GroupMember.group_id == Group.id
    ).filter(sa.and_(
        GroupMember.member_user_id == user_id,
        Group.kind == GROUP_KIND_TENANT,
        Group.tenant_id == None
    )).all()
    return tt


def add_user(sess, tenant, user, owner, **kwargs):
    """
    Adds a user to tenant's group.

    :param sess: A DB session instance.
    :param tenant: ID, ``name``, or instance of a tenant.
    :param user: ID, ``principal``, or instance of a user.
    :param owner: ID, ``principal``, or instance of a user.
    """
    ten = Tenant.find(sess, tenant)
    g_ten = ten.load_my_group()
    create_group_member(sess, owner, g_ten, member_user=user, **kwargs)
    sess.flush()


def find_tenant_node(resource):
    """
    Finds the tenant node in the resource path to which ``resource``
    belongs. The tenant node is the immediate child of root.

    :param resource: A resource, e.g. the context of a view.
    :returns: :class:`pym.res.models.ResourceNode` The node of the default
        tenant if ``resource`` is root, else the tenant node (which may be
        identical to ``resource``).
    """
    lin = list(lineage(resource))
    try:
        # Root is last element (lin[-1]), tenant is 2nd last.
        return lin[-2]
    except IndexError:
        # Given resource is root, so use default tenant
        return resource[DEFAULT_TENANT_NAME]


def find_tenant(sess, resource):
    """
    Finds the tenant in the resource path to which ``resource`` belongs.

    :param sess: DB session
    :param resource: A resource, e.g. the context of a view.
    :returns: :class:`pym.tenants.models.Tenant` Instance of a tenant loaded
        from DB.
    """
    tenant_node = find_tenant_node(resource)
    tenant = sess.query(Tenant).filter(Tenant.name == tenant_node.name).one()
    return tenant