import pyramid.security
import pyramid.util
import sqlalchemy as sa
import sqlalchemy.event
import zope.interface
from pyramid.decorator import reify
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import (relationship, backref)
from sqlalchemy.orm.collections import attribute_mapped_collection
from sqlalchemy.orm.exc import NoResultFound

import pym.auth.models as pam
import pym.cache
import pym.exc
import pym.lib
from pym.models import (DbBase, DefaultMixin, DbSession)
from pym.models.types import CleanUnicode
from pym.security import is_string_clean, is_path_safe


class IRootNode(zope.interface.Interface):
    pass


class IHelpNode(zope.interface.Interface):
    pass


class ISystemNode(zope.interface.Interface):
    pass


def root_factory(request):
    # return root_node
    sess = DbSession()
    n = ResourceNode.load_root(sess, 'root', use_cache=True)
    return n


# =========================


class ResourceNode(DbBase, DefaultMixin):
    __tablename__ = "resource_tree"
    # XXX Cannot use this unique constraint, because we might have child
    # XXX resources that have other unique requirements, e.g.
    # XXX fs.models.FsNode that discriminates by revision.
    #sa.UniqueConstraint('parent_id', 'name'),
    __table_args__ = (
        {'schema': 'pym'}
    )
    __mapper_args__ = {
        'polymorphic_on': 'kind',
        'polymorphic_identity': 'res'
    }

    IDENTITY_COL = None
    """Resource nodes do not have single-column identities other than ID."""
    SEP = '/'
    """In materialised paths, separate nodes with this."""

    # Root resource has parent_id NULL
    parent_id = sa.Column(
        sa.Integer(),
        sa.ForeignKey(
            'pym.resource_tree.id',
            onupdate='CASCADE',
            ondelete='CASCADE',
            name='resource_tree_parent_id_fk'
        ),
        nullable=True
    )
    tenant_id = sa.Column(
        sa.Integer(),
        sa.ForeignKey(
            'pym.resource_tree.id',
            onupdate="CASCADE",
            ondelete="CASCADE",
            name='resource_tree_tenant_id_fk',
        ),
        nullable=True
    )
    """
    Optional reference to the tenant to which this resource belongs.
    Remember, tenant is a resource too!
    """
    _name = sa.Column('name', CleanUnicode(255), nullable=False)
    """
    Name of the resource.
    Will be used in traversal as ``__name__``. May be set even for root
    resources, roots are recognized by ``parent_id`` being None.
    """
    _title = sa.Column('title', CleanUnicode(255), nullable=True)
    """
    Title of the resource.

    Used as the title of a page.
    """
    _short_title = sa.Column('short_title', CleanUnicode(255), nullable=True)
    """
    Short title of the resource.

    Used in breadcrumbs and menus.
    """
    _slug = sa.Column('slug', CleanUnicode(255), nullable=True)
    """
    Slug of the resource.

    Used in URLs.
    """
    kind = sa.Column(CleanUnicode(255), nullable=False)
    """
    Kind of resource. Default is 'res'. Discriminates resources in polymorphic
    tables.
    """
    sortix = sa.Column(sa.Integer(), nullable=True, server_default='5000')
    """
    Sort index; if equal, sort by name.
    """
    iface = sa.Column(CleanUnicode(255), nullable=True)
    """
    Dotted Python name of the interface this node implements.

    Specifying the interface here is useful when you do not have a separate
    class for your resource. You may use the default class :class:`Res` and
    still be able to attach your views to an interface (view config
    ``context``).

    E.g. 'pym.res:IRes'
    """
    # Load description only if needed
    descr = sa.orm.deferred(sa.Column(sa.UnicodeText, nullable=True))
    """Optional description."""
    meta = sa.orm.deferred(
        sa.Column(JSONB(none_as_null=True), nullable=True))
    """Optional meta information as JSON"""

    children = relationship("ResourceNode",
        order_by=lambda: [ResourceNode.sortix, ResourceNode.name],
        # cascade deletions
        cascade="all, delete-orphan",
        # Let the DB cascade deletions to children
        passive_deletes=True,
        # Typically, a resource is loaded during traversal. Maybe traversal
        # needs a specific child, but never the whole set. So load the children
        # individually.
        lazy='select',
        ##lazy='joined',
        join_depth=1,

        # many to one + adjacency list - remote_side
        # is required to reference the 'remote'
        # column in the join condition.
        backref=backref("parent", lazy="select", remote_side="ResourceNode.id"),

        # children will be represented as a dictionary
        # on the "name" attribute.
        collection_class=attribute_mapped_collection('name'),

        # Use these fields to construct the join
        foreign_keys=[parent_id]
    )
    """
    Children of this node.

    The parent node is inserted as well as a backref, and used in traversal
    as ``__parent__``.

    .. warning::

        Accessing this attribute will pull **all children** from the database
        **at once**, across all polymorphic tables. The result may be
        overwhelming!

        Use this attribute only if you *really* need a *complete* sorted list
        of all children.

        Don't even try ``len(res.children)`` to count them!
    """

    acl = relationship(pam.Ace,
        order_by=[pam.Ace.allow, pam.Ace.sortix],
        # cascade deletions
        cascade="all, delete-orphan",
        # Let the DB cascade deletions to children
        passive_deletes=True,
        # Typically, a resource is loaded during traversal. We need its full ACL
        # then.
        ##lazy='select',
        lazy='joined',
        ##join_depth=1,
    )

    def __init__(self, owner_id, name, kind, **kwargs):
        self.owner_id = owner_id,
        self.name = name
        self.kind = kind
        for k, v in kwargs.items():
            setattr(self, k, v)

    def _set_ace(self, owner, allow, permission, user=None, group=None,
            **kwargs):
        if not user and not group:
            raise pym.exc.PymError("Ace must reference either user or group.")
        if user and group:
            raise pym.exc.PymError("Ace cannot reference user and group "
                                   "simultaneously.")

        sess = sa.inspect(self).session
        owner = pam.User.find(sess, owner)
        if isinstance(permission, pam.Permissions):
            permission = permission.value
        permission = pam.Permission.find(sess, permission)
        fil = [
            pam.Ace.resource_id == self.id,
            pam.Ace.allow == allow,
            pam.Ace.permission_id == permission.id
        ]
        if user:
            user = pam.User.find(sess, user)
            fil.append(pam.Ace.user_id == user.id)
        if group:
            group = pam.Group.find(sess, group)
            fil.append(pam.Ace.group_id == group.id)

        try:
            ace = sess.query(pam.Ace).filter(*fil).one()
            raise pym.exc.ItemExistsError("Ace exists. See attribute 'item'.",
                item=ace)
        except NoResultFound:
            ace = pam.Ace()
            ace.owner_id = owner.id
            if user:
                ace.user_id = user.id
            if group:
                ace.group_id = group.id
            if permission:
                ace.permission_id = permission.id

        ace.allow = allow

        for k, v in kwargs.items():
            setattr(ace, k, v)

        self.acl.append(ace)
        return ace

    def allow(self, owner, permission, user=None, group=None,
            **kwargs):
        """
        Allows a permission on this resource to user or group.

        Parameters ``owner``, ``permission``, ``user``, and ``group`` may be
        given as integer (ID), as string (principal or name), or as objects.

        Either ``user`` or ``group`` must be given, but not both.

        :param owner: Owner of this ACE.
        :param permission: Permission to set.
        :param user: Set permission for this user.
        :param group: Set permission for this group.
        :param kwargs: Other parameters suitable for :class:`pym.auth.models.Ace`.
        """
        return self._set_ace(owner=owner, allow=True, permission=permission,
            user=user, group=group, **kwargs)

    def deny(self, owner, permission, user=None, group=None,
            **kwargs):
        """
        Denies a permission on this resource from user or group.

        Parameters ``owner``, ``permission``, ``user``, and ``group`` may be
        given as integer (ID), as string (principal or name), or as objects.

        Either ``user`` or ``group`` must be given, but not both.

        :param owner: Owner of this ACE.
        :param permission: Permission to set.
        :param user: Set permission for this user.
        :param group: Set permission for this group.
        :param kwargs: Other parameters suitable for :class:`pym.auth.models.Ace`.
        """
        return self._set_ace(owner=owner, allow=False, permission=permission,
            user=user, group=group, **kwargs)

    def add_child(self, owner, kind, name, **kwargs):
        """
        Adds child node of given kind.

        :param owner: ID, principal or instance of a user.
        :param kind: Kind of the new child node.
        :param name: Name of the new child node.
        :param kwargs: Stuff.
        :return: Instance of the new child node.

        :raises ValueError: if name is not clean.
        :raises pym.exc.ItemExistsError: if a child with this name exists.
        """
        is_string_clean(name, raise_error=True)
        try:
            n = self[name]
            raise pym.exc.ItemExistsError("Child '{}' exists.".format(name),
                item=n)
        except KeyError:
            sess = sa.inspect(self).session
            owner = pam.User.find(sess, owner)
            n = ResourceNode(owner_id=owner.id, kind=kind, name=name, **kwargs)
            n.parent = self
            return n

    def delete(self, deleter, deletion_reason=None, delete_from_db=False,
            recursive=False):
        """
        Deletes current node.

        .. todo:: Implement recursively flagging children as deleted

        :param deleter: ID, ``principal``, or instance of a user.
        :param deletion_reason: Optional. Reason for deletion.
        :param delete_from_db: Optional. Defaults to just tag as deleted,
            set True to physically delete record from DB.
        :param recursive: If True and node is not empty, deletes also all
            children.

        :raises OSError: if node is not empty and recursive is False.
        """
        if self.has_children(include_deleted=False) and not recursive:
            raise OSError("FsNode not empty: {}".format(self))
        sess = sa.inspect(self).session
        if delete_from_db:
            # DB schema must cascade deletion to children
            sess.delete(self)
        else:
            # Do nothing if this node already is deleted.
            # May occur if we delete a node and a child had been deleted some
            # time before. We want to keep those timestamp and reason.
            if self.deleter_id is not None:
                return
            deleter = pym.auth.models.User.find(sess, deleter)
            self.deleter_id = deleter.id
            self.deletion_reason = deletion_reason
            # TODO Replace content of unique fields
            if recursive:
                for n in self.children.values():
                    n.delete(
                        deleter=deleter,
                        deletion_reason=deletion_reason,
                        delete_from_db=False,
                        recursive=True
                    )

    def undelete(self, editor, recursive=False):
        """
        Undeletes current node and, if it has children, them too.

        :param recursive: If True and node is not empty, undeletes also all
            children.
        """
        # Do nothing if this node is not deleted
        if not self.deleter_id:
            return
        sess = sa.inspect(self).session
        editor = pym.auth.models.User.find(sess, editor)
        self.editor_id = editor.id
        self.deleter_id = None
        self.deletion_reason = None
        if self.has_children(include_deleted=True) and recursive:
            for n in self.children.values():
                n.undelete(editor, recursive)

    def rename(self, editor, dst):
        """
        Renames current node.

        Takes leaf of ``dst`` as new name, and any preceding parts as path to
        destination. ``dst`` must not, path to dst, however, must exist.

        If path to dst is the same as the current,

        :param editor: ID, principal or instance of a user.
        :param dst: Name or path of destination

        :raises pym.exc.PymError:
            - if current node is root node
            - if src (current node) and dst are the same
        :raises pym.exc.ItemExistsError: if dst points to an existing node.
        :raises ValueError: if dst is invalid.
        :raises FileNotFoundError: if path to dst does not exist.
        """
        root_node = self.class_root()
        if self == root_node:
            raise pym.exc.PymError("Root node cannot be renamed or moved")
        cls = self.__class__
        dst = dst.strip(cls.SEP)
        if not dst:
            raise ValueError("Dst is empty")
        is_path_safe(dst, split=True, sep=cls.SEP, raise_error=True)
        # Ensure, dst does not exist
        try:
            n = root_node.find_by_path(dst)
            raise pym.exc.ItemExistsError("Destination node exists: '{}'"
                .format(dst), item=n)
        except FileNotFoundError:
            pass
        # Determine src path, dst path and new name
        dst_pp = dst.split(cls.SEP)
        dst_path = cls.SEP.join(dst_pp[:-1])
        new_name = dst_pp[-1]
        full_src_path = self.class_path()  # path incl. name
        src_pp = full_src_path.split(cls.SEP)
        src_path = cls.SEP.join(src_pp[:-1])  # path excl. name
        dirty = False
        # Ensure, src is not a parent of dst
        if dst_path.startswith(full_src_path):
            raise ValueError('Dst cannot be a child of src')
        # Move
        if dst_path != src_path:
            dst_n = root_node.find_by_path(dst_path)
            self.parent = dst_n
            dirty = True
        # Rename
        if new_name != self._name:
            self._name = new_name
            dirty = True
        # Set editor
        if dirty:
            sess = sa.inspect(self).session
            editor = pym.auth.models.User.find(sess, editor)
            self.editor_id = editor.id
        else:
            raise pym.exc.PymError('Src and dst are the same')

    def move(self, editor, dst, overwrite=False):
        root_node = self.class_root()
        dst += self.__class__.SEP + self.name
        try:
            n_dst = root_node.find_by_path(dst, include_deleted=False)
            if overwrite:
                n_dst.delete(deleter=editor)
            else:
                raise pym.exc.ItemExistsError('Dst node exists', item=n_dst)
        except FileNotFoundError:
            pass
        self.rename(editor, dst)

    def copy(self, owner, path, overwrite=False):
        # TODO Use links instead of copies
        raise NotImplementedError('TODO')

    def has_children(self, include_deleted=False):
        cnt = self.count_children(include_deleted)
        return cnt > 0

    def count_children(self, include_deleted=False):
        sess = sa.inspect(self).session
        cls = self.__class__
        fil = [
            cls.parent_id == self.id
        ]
        if not include_deleted:
            fil.append(cls.deleter_id == None)
        return sess.query(cls.id).filter(*fil).count()

    def find_by_path(self, path, include_deleted=False):
        """
        Returns node at given path.

        Uses current node as root for path.

        :param path: Path to wanted node.
        :type path: string

        :raises FileNotFoundError: if path does not exist.
        :raises ValueError: if path is not safe.
        """
        cls = self.__class__
        if path == cls.SEP:
            return self
        path = path.strip(cls.SEP)
        is_path_safe(path=path, split=True, sep=cls.SEP, raise_error=True)
        if not path:
            return self
        pp = path.split(cls.SEP)
        # Shortcut in case first node in path is us
        try:
            if pp[0] == self.name:
                # Error if we are deleted and should not be included
                if self.is_deleted() and not include_deleted:
                    raise KeyError(pp[0])
                else:
                    # Just us
                    if len(pp) == 1:
                        return self
                    # Process remaining path starting with our children
                    else:
                        pp = pp[1:]
            n = self
            for p in pp:
                n = n[p]
                if n.is_deleted() and not include_deleted:
                    raise KeyError(p)
        except KeyError:
            raise FileNotFoundError("{}: '{}'".format(n, p))
        return n

    def path_exists(self, path, include_deleted=False):
        """
        Checks whether given path exists.

        Uses current node as root for path.

        :param path: Path to check.
        :type path: string

        :rtype: bool

        :raises ValueError: if path is not safe.
        """
        try:
            self.find_by_path(path, include_deleted=False)
            return True
        except FileNotFoundError:
            return False

    @reify
    def class_root(self):
        """
        Returns the root node of the resource tree.

        Override in child classes if they have a different meaning of 'root',
        e.g. as :class:`pym.fs.models.FsNode`.

        N.B.: Our property ``root`` *always* points to the root node of the
        resource tree.
        """
        n = self
        while n.parent:
            n = n.parent
        return n

    @reify
    def class_path(self):
        """
        Path to the root node of the resource tree.

        N.B.: If you need the path to a different 'root' in a child class,
        override :method:`.class_path`.
        """
        pp = []
        n = self
        while n.parent:
            pp.append(n.name)
            n = n.parent
        if not pp:
            return self.__class__.SEP
        return self.__class__.SEP.join(reversed(pp))

    @classmethod
    def create_root(cls, sess, owner, name, kind, **kwargs):
        owner_id = pam.User.find(sess, owner).id
        try:
            r = cls.load_root(sess, name, use_cache=False)
        except sa.orm.exc.NoResultFound:
            r = cls(owner_id, name, kind, **kwargs)
            sess.add(r)
        else:
            if r.kind == kind:
                return r
            else:
                raise ValueError("Root node '{}' already exists, but kind"
                    " differs: is='{}' wanted='{}'".format(
                    name, r.kind, kind))
        return r

    @classmethod
    def children_key(cls, query):
        return '{}:children:{}'.format(cls.__name__, pym.cache.key_from_query(query))

    @classmethod
    def load_root(cls, sess, name='root', use_cache=True):
        """
        Loads root resource of resource tree.

        Since we allow several trees in the same table, argument ``name`` tells
        which one we want.

        :param sess: A DB session
        :param name: Name of the wanted root node
        :return: Instance of the root node or, None if not found
        """

        # CAVEAT: Setup fails if we use cache here!
        ##if use_cache:
        if False:
            r = sess.query(
                cls
            ).options(
                pym.cache.FromCache("auth_long_term",
                cache_key='resource:{}:None'.format(name))
            ).options(
                # CAVEAT: don't use our own cache_key. It's not specific enough
                # to discriminate different instances of Res: it would load
                # children from root's cache key also for children etc.!
                pym.cache.RelationshipCache(cls.children, "auth_long_term",
                cache_key=cls.children_key)
                #cache_key='resource:{}:None:children'.format(name))
            ).options(
                # CAVEAT: Program hangs if we use our own cache key here!
                pym.cache.RelationshipCache(cls.acl, "auth_long_term")  # ,
                #cache_key='resource:{}:None:acl'.format(name))
            ).filter(
                sa.and_(cls.parent_id == None, cls.name == name)
            ).one()
        else:
            r = sess.query(
                cls
            ).filter(
                sa.and_(cls.parent_id == None, cls.name == name)
            ).one()
        return r

    def is_root(self):
        return self.parent_id is None

    def dumps(self, _indent=0):
        return "   " * _indent \
            + repr(self) + "\n" \
            + "".join([c.dumps(_indent + 1) for c in self.children.values()])

    def __acl__(self):
        """
        ACL for Pyramid's authorization policy.
        """
        sess = sa.inspect(self).session
        # Bind ourselves to a new session in case we'd lost our session. This
        # may happen if the current request created an exception, which closes
        # the current session, and Pyramid redirects to an error page. That
        # error page again uses DB objects, but since the session had been
        # closed, it fails with a DetachedInstanceError, or and object's session
        # being None.
        if not sess:
            sess = DbSession()
            sess.add(self)
        acl = []
        perms = pam.Permission.load_all(sess)
        # Convert self.acl into Pyramid's ACL
        for ace in self.acl:
            pyr_ace = ace.to_pyramid_ace(perms)
            acl.append(pyr_ace)
            # If allow, allow all parents
            if ace.allow:
                if perms[ace.permission_id]['parents']:
                    for p in perms[ace.permission_id]['parents']:
                        pyr_ace2 = (pyr_ace[0], pyr_ace[1], p[1])
                        acl.append(pyr_ace2)
            # If deny, deny all children
            else:
                for ch in perms[ace.permission_id]['children']:
                    pyr_ace2 = (pyr_ace[0], pyr_ace[1], ch[1])
                    acl.append(pyr_ace2)
        return acl

    # def load_child(self, sess, id_or_name, use_cache=True):
    #     cls = self.__class__
    #     if isinstance(id_or_name, int):
    #         fil = [cls.id == id_or_name]
    #     else:
    #         fil = [
    #             cls.parent_id == self.id,
    #             cls.name == id_or_name,
    #         ]
    #     print('Res load child filter:', fil)
    #     if use_cache:
    #         return sess.query(
    #             cls
    #         ).options(
    #             pym.cache.FromCache("auth_long_term")  # ,
    #                 #cache_key='resource:{}:{}'.format(
    #                 #    id_or_name, parent_id))
    #         ).options(
    #             pym.cache.RelationshipCache(cls.children, "auth_long_term")  # ,
    #                 #cache_key='resource:{}:{}:children'.format(
    #                 #    id_or_name, parent_id))
    #         ).options(
    #             pym.cache.RelationshipCache(cls.acl, "auth_long_term")  # ,
    #                 #cache_key='resource:{}:{}:acl'.format(
    #                 #    id_or_name, parent_id))
    #         ).options(
    #             pym.cache.RelationshipCache(cls.parent, "auth_long_term")  # ,
    #                 #cache_key='presource:{}:{}:parent'.format(
    #                 #    id_or_name, parent_id))
    #         ).filter(
    #             sa.and_(*fil)
    #         ).one()
    #     else:
    #         return sess.query(
    #             cls
    #         ).filter(
    #             sa.and_(*fil)
    #         ).one()

    def __getitem__(self, item):
        return self.children[item]
        # sess = sa.inspect(self).session
        # try:
        #     child = self.load_child(sess, id_or_name=item,
        #                            use_cache=True)
        # except sa.orm.exc.NoResultFound as exc:
        #     raise KeyError("Child resource not found: '{}'".format(item))
        # return child

    def __contains__(self, item):
        try:
            self.children[item]
            return True
        except KeyError:
            return False

    def __repr__(self):
        return "<{cls}(id={0}, parent_id='{1}', name='{2}', kind='{3}')>".format(
            self.id, self.parent_id, self.name, self.kind, cls=self.__class__.__name__)

    @property
    def __name__(self):
        """
        Used for traversal.
        """
        if self.parent_id is None:
            return None
        return self.name

    @property
    def __parent__(self):
        """
        Used for traversal.
        """
        if self.parent_id is None:
            return None
        return self.parent

    @hybrid_property
    def name(self):
        """
        Name of this node.
        """
        return self._name

    @name.setter
    def name(self, v):
        self._name = v

    @hybrid_property
    def title(self):
        """
        Title of this node.

        Uses ``name`` if not set.
        """
        return self._title if self._title else self.name

    @title.setter
    def title(self, v):
        self._title = v

    @hybrid_property
    def short_title(self):
        """
        Short title of this node.

        Uses ``title`` if not set.
        """
        return self._short_title if self._short_title else self.title

    @short_title.setter
    def short_title(self, v):
        self._short_title = v

    @hybrid_property
    def slug(self):
        """
        Slug of this node.

        Slugs are used in URLs.

        Uses ``name`` if not set.
        """
        return self._slug if self._slug else self.name

    @slug.setter
    def slug(self, v):
        self._slug = v

    @property
    def root(self):
        """
        Root node of the resource tree.

        N.B.: If you need a different 'root' in a child class, override
        :method:`.get_root`.
        """
        n = self
        while n.parent:
            n = n.parent
        return n

    @property
    def path(self):
        """
        Path to the root node of the resource tree.

        N.B.: If you need the path to a different 'root' in a child class,
        override :method:`.get_path`.
        """
        pp = []
        n = self
        while n.parent:
            pp.append(n.name)
            n = n.parent
        if not pp:
            return self.__class__.SEP
        return self.__class__.SEP.join(reversed(pp))

    @property
    def user(self):
        if self.parent_id is None:
            return self.__user__
        return self.root.__user__


# When we load a node from DB attach the stored interface to the instance.
# noinspection PyUnusedLocal
def resource_node_load_listener(target, context):
    if target.iface:
        iface = pyramid.util.DottedNameResolver(None).resolve(target.iface)
        zope.interface.alsoProvides(target, iface)

sa.event.listen(ResourceNode, 'load', resource_node_load_listener)


class VwParents(DbBase):
    """
    Excerpt of view ``pym.vw_resource_node`` to map resource ID to parents.

    Parents are given as a single-dimensioned array of strings. Each two
    elements belong together and form the ID and name of a node. Path is
    listed from current node up to root node of the resource tree. ID needs
    to be cast to integer.
    """

    __tablename__ = "vw_resource_tree"
    __table_args__ = (
        {'schema': 'pym'}
    )

    id = sa.Column(sa.Integer(), primary_key=True)
    name = sa.Column(sa.Unicode(255))
    _parents = sa.Column('parents', ARRAY(sa.UnicodeText(), dimensions=1))

    @property
    def parents(self):
        pp = self._parents
        if pp:
            return tuple([(int(pp[i]), pp[i + 1]) for i in range(0, len(pp), 2)])
        else:
            return None

    @property
    def parent_path(self):
        pp = reversed(self.parents)
        if pp:
            return '/'.join(x[1] for x in pp)
        else:
            return '/'