import collections
import datetime
from pyramid.location import lineage
import pyramid.util
import pyramid.i18n
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.ext.mutable import MutableDict
import zope.interface
import sqlalchemy as sa
import sqlalchemy.orm
import sqlalchemy.event
import pym.exc
import pym.auth.models
import pym.res.models
from pym.security import is_path_safe
import pym.tenants.models


class IFsNode(zope.interface.Interface):
    """
    Default interface for a filesystem node. Used as context to connect to a
    specific view.
    """
    pass


# TODO Put file content in separate class and table. Otherwise it might get cached in redis, what is not wanted! Maybe deferred() is sufficient to prevent caching. TEST IT!

class FsNode(pym.res.models.ResourceNode):
    """
    A filesystem node.

    By default we have one filesystem node, as immediate child of tenant. If you
    upload more files, more nodes will be created. Still they have the same
    interface and thus connect to the same view. For files, this behaviour
    typically is sufficient, but if you want special views for specific files,
    change the interface.

    We have a load-listener (:func:`fs_node_load_listener`) that applies the
    interface to a freshly loaded FsNode.
    """

    __tablename__ = "fs_node"
    sa.UniqueConstraint('uuid'),
    __table_args__ = (
        {'schema': 'pym'}
    )
    __mapper_args__ = {
        'polymorphic_identity': 'fs'
    }

    MIME_TYPE_DIRECTORY = 'inode/directory'
    MIME_TYPE_JSON = 'application/json'
    MIME_TYPE_DEFAULT = 'application/octet-stream'

    RC_KEYS_QUOTA = ('min_size', 'max_size', 'max_total_size', 'max_children',
        'allow', 'deny')
    """
    These keys in attribute ``rc`` define the quota of this node. Used e.g.
    by :class:`~pym.cache.UploadCache`.
    """

    id = sa.Column(
        sa.Integer(),
        sa.ForeignKey(
            'pym.resource_tree.id',
            onupdate='CASCADE',
            ondelete='CASCADE',
            name='fs_node_resource_tree_id_fk'
        ),
        primary_key=True,
        nullable=False
    )
    local_filename = sa.Column(sa.Unicode(), nullable=True)
    """
    Name of the file locally on the server, e.g. in the cache, relative to the
    cache's root dir.
    """
    rev = sa.Column(sa.Integer(), nullable=False, default=1)
    """Latest revision."""
    mime_type = sa.Column(sa.Unicode(255), nullable=False,
        server_default=sa.text("'" + MIME_TYPE_DEFAULT + "'"))
    """
    Mime type.

    If it's a directory, use 'inode/directory', ``size``=0 and all content
    fields are empty.
    """

    # noinspection PyUnusedLocal
    @sa.orm.validates('mime_type')
    def validate_mime_type(self, key, mime_type):
        mime_type = mime_type.lower()
        assert '/' in mime_type
        return mime_type

    size = sa.Column(
        sa.Integer(),
        sa.CheckConstraint('size>=0'),
        nullable=False,
        server_default=sa.text('0')
    )
    """Size of the content of this node in bytes."""
    # Load only if needed
    xattr = sa.orm.deferred(sa.Column(MutableDict.as_mutable(JSON()),
        nullable=True))
    """Extended attributes"""
    # Load only if needed
    _rc = sa.orm.deferred(sa.Column('rc', MutableDict.as_mutable(JSON()),
        nullable=True))
    # Load only if needed
    content_text = sa.orm.deferred(sa.Column(sa.UnicodeText(), nullable=True))
    # Load only if needed
    content_json = sa.orm.deferred(sa.Column(JSON(), nullable=True))
    # Load only if needed
    content_bin = sa.orm.deferred(sa.Column(sa.Binary(), nullable=True))
    """Optional description."""
    # Load description only if needed
    descr = sa.orm.deferred(sa.Column(sa.UnicodeText, nullable=True))
    """Optional description."""

    def __init__(self, owner_id, name, **kwargs):
        super().__init__(owner_id=owner_id, name=name, kind='fs', **kwargs)
        self.iface = __name__ + '.' + IFsNode.__name__

    def is_dir(self):
        return self.mime_type == self.MIME_TYPE_DIRECTORY

    @classmethod
    def load_root(cls, sess, tenant):
        """
        Loads fs root node of given tenant.

        :param sess: A DB session
        :param tenant: Instance, name or ID of a tenant
        :return: The fs root node

        :raises FileNotFoundError: if tenant has no filesystem.
        """
        ten = pym.tenants.models.Tenant.find(sess, tenant)
        try:
            return sess.query(FsNode).filter(FsNode.parent_id == ten.id).one()
        except sa.orm.exc.NoResultFound:
            raise FileNotFoundError("Tenant {} has no filesystem".format(ten))

    def add_child(self, owner, name, **kwargs):
        try:
            n = self[name]
            raise pym.exc.ItemExistsError("Child '{}' exists.".format(name),
                item=n)
        except KeyError:
            sess = sa.inspect(self).session
            owner = pym.auth.models.User.find(sess, owner)
            n = FsNode(owner_id=owner.id, name=name, **kwargs)
            n.parent = self
            return n

    def add_directory(self, owner, name, **kwargs):
        return self.add_child(owner, name,
            mime_type=self.__class__.MIME_TYPE_DIRECTORY, **kwargs)

    def makedirs(self, owner, path, recursive=False, exist_ok=False):
        """
        Creates all nodes needed by given path as directories.

        :param path: Path to create.
        :type path: string
        :param recursive: If True, any intermediate directories will also be
            created.
        :type recursive: bool
        :param exist_ok: If False, an existing leaf directory raises an error.
        :type exist_ok: bool

        :returns: Instance of leaf directory
        :rtype: FsNode

        :raises pym.exc.ItemExistsError: if the leaf directory exists and
            exist_ok is False.
        :raises FileNotFoundError: if a containing directory is missing and
            recursive is False.
        """
        cls = self.__class__
        path = path.strip(cls.SEP)
        is_path_safe(path=path, split=True, sep=cls.SEP, raise_error=True)

        if not path:
            return  # Nothing to do

        try:
            n = self.fs_root.find_by_path(path)
        except FileNotFoundError:
            pass
        else:
            if exist_ok:
                return  # Path exists, we're done.
            else:
                raise pym.exc.ItemExistsError("Path exists: '{}'".format(path),
                    item=n)

        sess = sa.inspect(self).session
        owner = pym.auth.models.User.find(sess, owner)
        pp = path.split(cls.SEP)
        pp_max = len(pp) - 1
        n = self.fs_root
        for i, p in enumerate(pp):
            try:
                n = n[p]
            except KeyError:
                if i < pp_max and not recursive:
                    raise FileNotFoundError("{}: '{}'".format(n, p))
                else:
                    n = n.add_directory(owner, p)
        return n

    def get_root(self):
        """
        Returns the root node of the resource tree.

        Override in child classes if they have a different meaning of 'root',
        e.g. as :class:`pym.fs.models.FsNode`.

        N.B.: Our property ``root`` *always* points to the root node of the
        resource tree.
        """
        n = self
        while n.parent:
            if not isinstance(n.parent, FsNode):
                break
            n = n.parent
        return n

    def get_path(self):
        """
        Path to the root node of the resource tree.

        N.B.: If you need the path to a different 'root' in a child class,
        override :method:`.get_path`.
        """
        pp = []
        n = self
        while n.parent:
            if not isinstance(n.parent, FsNode):
                break
            pp.append(n.name)
            n = n.parent
        if not pp:
            return self.__class__.SEP
        return self.__class__.SEP.join(reversed(pp))

    @property
    def rc(self):
        """Settings

        Settings, like ACL, are inherited from ancestors up to the root node of
        the file system (which in most cases is not identical with the root node of
        the resource tree).

        Quota settings as used e.g. in :class:`pym.cache.UploadCache`:

        - ``min_size``: Minimum size of content in bytes, default 1
        - ``max_size``: Maximum size of content in bytes, default 2 MB
        - ``max_total_size``: Max size of content plus children in bytes. If not
          specified, is not checked (default).
        - ``max_children``: Max number children. If not specified, is not checked
          (default).
        - ``allow``: List of mime-types (RegEx pattern) that are allowed. To allow
            all mime-types, set to ``['*/*']``.
        - ``deny``: List of mime-types (RegEx pattern) that are denied. If empty,
          no mime-types are denied (default).
        """
        # Fetch our rc and rc of ancestors
        # We need to access protected '_rc' here!
        maps = [x._rc or {} for x in lineage(self) if isinstance(x, FsNode)]
        if not maps:
            maps = []
        # Append a map with the defaults
        maps.append(dict(
            min_size=1,
            max_size=1024 * 1024 * 2,
            max_total_size=None,
            max_children=None,
            #allow=['image/*', 'application/pdf'],
            allow=['*/*'],
            deny=[]
        ))
        return collections.ChainMap(*maps)

    @property
    def content_attr(self):
        if pym.lib.match_mime_types(self.mime_type,
                ['text/*', '*/.*yaml']):
            return 'content_text'
        elif pym.lib.match_mime_types(self.mime_type,
                ['application/json', 'text/x-json']):
            return 'content_json'
        else:
            return 'content_bin'

    @property
    def content(self):
        if pym.lib.match_mime_types(self.mime_type,
                ['text/*', '*/.*yaml']):
            return self.content_text
        elif pym.lib.match_mime_types(self.mime_type,
                ['application/json', 'text/x-json']):
            return self.content_json
        else:
            return self.content_bin

    @content.setter
    def content(self, v):
        if pym.lib.match_mime_types(self.mime_type,
                ['text/*', '*/.*yaml']):
            self.content_text = v
        elif pym.lib.match_mime_types(self.mime_type,
                ['application/json', 'text/x-json']):
            self.content_json = v
        else:
            self.content_bin = v

    def __repr__(self):
        return "<{name}(id={id}, parent_id={p}, name='{n}', rev={rev}'>".format(
            id=self.id, p=self.parent_id, n=self.name, rev=self.rev,
            name=self.__class__.__name__)

    @property
    def total_size(self):
        """Total size of the content of this node and all children in bytes."""
        sz = self.size
        for k, v in self.children.items():
            sz += v.size
        return sz


# When we load a node from DB attach the stored interface to the instance.
# noinspection PyUnusedLocal
def fs_node_load_listener(target, context):
    if target.iface:
        iface = pyramid.util.DottedNameResolver(None).resolve(target.iface)
        zope.interface.alsoProvides(target, iface)

sa.event.listen(FsNode, 'load', fs_node_load_listener)
