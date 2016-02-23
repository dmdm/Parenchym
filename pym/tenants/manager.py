import datetime
from pyramid.location import lineage
import sqlalchemy as sa
import pyramid.location
from pym.auth.const import SYSTEM_UID, GROUP_KIND_TENANT
from pym.auth.manager import AuthMgr
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from .models import Tenant
from .const import DEFAULT_TENANT_NAME
import pym.exc


class TenantMgr:

    @classmethod
    def factory(cls, lgg, sess, rc,
            authmgr: 'AuthMgr|None'=None):
        if not authmgr:
            authmgr = AuthMgr.factory(lgg=lgg, sess=sess, rc=rc)
        return cls(
            lgg=lgg,
            sess=sess,
            authmgr=authmgr,
            tenant_cls=rc.g('tenants.class.tenant', Tenant)
        )

    def __init__(self, lgg, sess, authmgr: AuthMgr, tenant_cls):
        self.lgg = lgg
        self.sess = sess
        self.authmgr = authmgr
        self.tenant_cls = tenant_cls

    def create_tenant(self, owner, name, **kwargs):
        """
        Creates a new tenant record.
    
        :param owner: ID, ``principal``, or instance of a user.
        :param name: Name.
        :param kwargs: See :class:`~pym.auth.models.Tenant`.
        :return: Instance of created tenant.
        """
        owner_id = self.authmgr.user_cls.find(self.sess, owner).id
        if 'title' not in kwargs:
            kwargs['title'] = name.title()
    
        n_root = ResourceNode.load_root(self.sess, name=NODE_NAME_ROOT, use_cache=False)
        if name in n_root.children:
            raise pym.exc.ItemExistsError("Tenant already exists: '{}'".format(name))
        ten = self.tenant_cls(owner_id, name, **kwargs)

        # Create tenant's group
        gr = self.authmgr.create_group(owner=owner, name=name, kind=GROUP_KIND_TENANT,
            descr="All members of tenant " + name)
        ten.group_id = gr.id
    
        n_root.children[name] = ten
        self.sess.flush()
        return ten

    def update_tenant(self, tenant, editor, **kwargs):
        """
        Updates a tenant.
    
        For details about ``**kwargs``, see :class:`~pym.auth.models.Tenant`.
    
        :param tenant: ID, ``name``, or instance of a tenant.
        :param editor: ID, ``principal``, or instance of a user.
        :return: Instance of updated tenant.
        """
        ten = self.tenant_cls.find(self.sess, tenant)
        ten.editor_id = self.authmgr.user_cls.find(self.sess, editor).id
        ten.mtime = datetime.datetime.now()
        # If tenant is to be renamed, rename its group too.
        if 'name' in kwargs and ten.name != kwargs['name']:
            ten.group.name = kwargs['name']
        for k, v in kwargs.items():
            setattr(ten, k, v)
        self.sess.flush()
        return ten

    def delete_tenant(self, tenant, deleter, deletion_reason=None,
                      delete_from_db=False):
        """
        Deletes a tenant.
    
        :param tenant: ID, ``name``, or instance of a tenant.
        :param deleter: ID, ``principal``, or instance of a user.
        :param deletion_reason: Reason for deletion.
        :param delete_from_db: Optional. Defaults to just tag as deleted (False),
            set True to physically delete record from DB.
        :return: None if really deleted, else instance of tagged tenant.
        """
        ten = self.tenant_cls.find(self.sess, tenant)
        self.authmgr.delete_group(ten.group, deleter, deletion_reason, delete_from_db)
        if delete_from_db:
            self.sess.delete(ten)
            ten = None
        else:
            ten.deleter_id = self.authmgr.user_cls.find(self.sess, deleter).id
            ten.dtime = datetime.datetime.now()
            ten.deletion_reason = delete_from_db
            ten.editor_id = ten.deleter_id
            ten.mtime = ten.dtime
            # TODO Replace content of unique fields
        self.sess.flush()
        return ten

    def collect_my_tenants(self, user_id):
        """
        Returns list of tenants to which given user belongs.
    
        Each tenant has a global group with the same name. Membership in those
        groups determines whether a tenant is listed here or not.
    
        :param user_id: ID of user.
        :return: List of tenants.
        """
        g = self.authmgr.group_cls
        gm = self.authmgr.group_member_cls
        tt = self.sess.query(
            self.tenant_cls
        ).join(
            g, g.name == self.tenant_cls.name
        ).join(
            gm, gm.group_id == g.id
        ).filter(sa.and_(
            gm.member_user_id == user_id,
            g.kind == GROUP_KIND_TENANT,
            g.tenant_id == None
        )).all()
        return tt

    def add_user(self, tenant, user, owner, **kwargs):
        """
        Adds a user to tenant's group.
    
        :param tenant: ID, ``name``, or instance of a tenant.
        :param user: ID, ``principal``, or instance of a user.
        :param owner: ID, ``principal``, or instance of a user.
        """
        ten = self.tenant_cls.find(self.sess, tenant)
        self.authmgr.create_group_member(owner, ten.group, member_user=user, **kwargs)
        self.sess.flush()

    def remove_user(self, tenant, user):
        """
        Removes a user from tenant's group.
    
        Additionally removes user from all groups that belong specifically to this
        tenant.
    
        :param tenant: ID, ``name``, or instance of a tenant.
        :param user: ID, ``principal``, or instance of a user.
        """
        raise NotImplementedError('TODO')  # TODO Implement remove_user()

    @staticmethod
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
    
    def find_tenant(self, resource):
        """
        Finds the tenant in the resource path to which ``resource`` belongs.
    
        :param resource: A resource, e.g. the context of a view.
        :returns: :class:`pym.tenants.models.Tenant` Instance of a tenant loaded
            from DB.
        """
        tenant_node = self.__class__.find_tenant_node(resource)
        tenant = self.sess.query(self.tenant_cls).filter(self.tenant_cls.name == tenant_node.name).one()
        return tenant
