import collections
import json
import logging
from pyramid.decorator import reify
from pyramid.location import lineage
import pyramid.util
import pyramid.i18n
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
import zope.interface
import sqlalchemy as sa
import sqlalchemy.orm
import sqlalchemy.event

import pym.exc
import pym.auth.models
from pym.models import DbBase, DefaultMixin
from pym.models.types import CleanUnicode
import pym.res.models
from pym.security import is_path_safe
import pym.tenants.models
from .const import NODE_NAME_FS, MIME_TYPE_DEFAULT, MIME_TYPE_DIRECTORY


mlgg = logging.getLogger(__name__)


class IFsNode(zope.interface.Interface):
    """
    Default interface for a filesystem node. Used as context to connect to a
    specific view.
    """
    pass


class FsContent(DbBase, DefaultMixin):
    __tablename__ = "fs_content"
    __table_args__ = (
        {'schema': 'pym'}
    )

    IDENTITY_COL = None
    """Has no single-column identities other than ID."""

    fs_node_id = sa.Column(
        sa.Integer(),
        sa.ForeignKey(
            'pym.fs_node.id',
            onupdate='CASCADE',
            ondelete='CASCADE',
            name='fs_content_fs_node_id_fk'
        ),
        nullable=False
    )
    """ID of the containing FsNode"""
    filename = sa.Column(CleanUnicode(255), nullable=False)
    """
    Original filename.

    If the node and content is created for the first time, use this as name of
    the node.
    """
    local_filename = sa.Column(CleanUnicode(255), nullable=True)
    """
    Name of the file locally on the server, e.g. in the cache, relative to the
    cache's root dir.
    """
    mime_type = sa.Column(sa.Unicode(255), nullable=False,
        server_default=sa.text("'" + MIME_TYPE_DEFAULT + "'"))
    """Mime type. Reflect this in FsNode.mime_type."""
    encoding = sa.Column(sa.Unicode(255), nullable=True)
    """Encoding, if content is text."""

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
    """Size of the content in bytes. Reflect this in FsNode.size."""
    xattr = sa.orm.deferred(
        sa.Column(MutableDict.as_mutable(JSONB(none_as_null=True)),
        nullable=True))
    """Extended attributes"""
    meta_json = sa.orm.deferred(
        sa.Column(JSONB(none_as_null=True), nullable=True))
    """Extracted meta information as JSON"""
    meta_xmp = sa.orm.deferred(
        sa.Column(sa.UnicodeText(), nullable=True))
    """Extracted meta information as XMP"""
    data_bin = sa.orm.deferred(sa.Column(sa.LargeBinary(), nullable=True))
    """By default, content is stored binarily."""
    data_text = sa.orm.deferred(sa.Column(sa.UnicodeText(), nullable=True))
    """Certain mime-types allow storing content as text. Also the text rendering
    of uploaded office documents is stored here."""
    data_json = sa.orm.deferred(
        sa.Column(JSONB(none_as_null=True), nullable=True))
    """Certain mime-types allow storing content as JSON"""
    data_html_head = sa.orm.deferred(sa.Column(sa.UnicodeText(), nullable=True))
    """Head of HTML rendering of office documents."""
    data_html_body = sa.orm.deferred(sa.Column(sa.UnicodeText(), nullable=True))
    """Body of HTML rendering of office documents."""

    def from_file(self, fn):
        attr = self.data_attr
        if attr == 'data_bin':
            with open(fn, 'rb') as fh:
                setattr(self, attr, fh.read())
        else:
            try:
                with open(fn, 'rt', encoding=self.encoding) as fh:
                    if attr == 'data_json':
                        setattr(self, attr,
                            json.load(fh, cls=pym.lib.JsonDecoder))
                    else:
                        setattr(self, attr, fh.read())
            except UnicodeDecodeError as exc:
                mlgg.exception(exc)
                mlgg.warn("Saving file as binary: '{}'".format(fn))
                with open(fn, 'rb') as fh:
                    setattr(self, 'data_bin', fh.read())

    def set_meta(self, meta):
        kk = 'meta_json meta_xmp data_text data_html_head data_html_body'.split(' ')
        mj = meta.get('meta_json', None)
        if mj:
            s = pym.lib.json_serializer(mj)
            s = s.replace("\0", '').replace("\x00", '').replace("\u0000", '').replace("\\u0000", '')
            meta['meta_json'] = pym.lib.json_deserializer(s)
        for k in kk:
            setattr(self, k, meta.get(k, None))

    @property
    def data_attr(self):
        """
        Attribute that contains the data according to the mime-type.
        """
        if pym.lib.match_mime_types(self.mime_type,
                ['text/*', '*/.*yaml']):
            return 'data_text'
        elif pym.lib.match_mime_types(self.mime_type,
                ['application/json', 'text/x-json']):
            return 'data_json'
        else:
            return 'data_bin'

    @property
    def data(self):
        """
        The data. Internally gets/sets the attribute specific to the mime-type.
        """
        if pym.lib.match_mime_types(self.mime_type,
                ['text/*', '*/.*yaml']):
            return self.data_text
        elif pym.lib.match_mime_types(self.mime_type,
                ['application/json', 'text/x-json']):
            return self.data_json
        else:
            return self.data_bin

    @data.setter
    def data(self, v):
        if pym.lib.match_mime_types(self.mime_type,
                ['text/*', '*/.*yaml']):
            self.data_text = v
        elif pym.lib.match_mime_types(self.mime_type,
                ['application/json', 'text/x-json']):
            self.data_json = v
        else:
            self.data_bin = v


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
    rev = sa.Column(sa.Integer(), nullable=False, default=1)
    """Latest revision."""
    # http://docs.sqlalchemy.org/en/latest/orm/relationship_persistence.html#rows-that-point-to-themselves-mutually-dependent-rows
    fs_content_id = sa.Column(
        sa.Integer(),
        sa.ForeignKey(
            'pym.fs_content.id',
            onupdate='CASCADE',
            ondelete='CASCADE',
            name='fs_node_fs_content_id_fk',
            use_alter=True
        ),
        nullable=True
    )
    """ID of a FsContent record that has content of current revision. May be
    None if this node/rev has no content, e.g. if it is a directory."""
    content_rows = sa.orm.relationship(
        FsContent,
        primaryjoin=id == FsContent.fs_node_id,
        cascade="all, delete-orphan"
    )
    """List of content rows of all revisions. Relationship from here (1) to
    there (n)."""
    content = sa.orm.relationship(
        FsContent,
        primaryjoin=fs_content_id == FsContent.id,
        post_update=True
    )
    """FsContent record that has content of current revision. May be
    None if this node/rev has no content, e.g. if it is a directory.
    Relationship from here (1) to there (1)."""
    mime_type = sa.Column(sa.Unicode(255), nullable=False,
        server_default=sa.text("'" + MIME_TYPE_DEFAULT + "'"))
    """
    Mime type.

    If it's a directory, use 'inode/directory' and ``size``=0. Also directories
    do not have a FsContent record.
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
    encoding = sa.Column(sa.Unicode(255), nullable=True)
    """Encoding, if content is text."""
    # Load only if needed
    # TODO Convert rc column into TypedJson
    _rc = sa.orm.deferred(sa.Column('rc', MutableDict.as_mutable(
        JSONB(none_as_null=True)),
        nullable=True))
    # Load description only if needed
    descr = sa.orm.deferred(sa.Column(sa.UnicodeText, nullable=True))
    """Optional description."""

    def __init__(self, owner_id, name, **kwargs):
        super().__init__(owner_id=owner_id, name=name, kind='fs', **kwargs)
        self.iface = __name__ + '.' + IFsNode.__name__

    def is_dir(self):
        return self.mime_type == self.MIME_TYPE_DIRECTORY

    @classmethod
    def create_root(cls, sess, owner, tenant):
        """
        Creates fs root node for given tenant.

        If given tenant already has a fs root node, that one is returned.

        :param sess: A DB session
        :param owner: ID, principal or instance of a user.
        :param tenant: Instance, name or ID of a tenant.
        :return: The fs root node.
        """
        owner = pym.auth.models.User.find(sess, owner)
        tenant = pym.tenants.models.Tenant.find(sess, tenant)
        try:
            n = pym.res.models.ResourceNode.find(
                sess, None, parent_id=tenant.id, name=NODE_NAME_FS)
        except sa.orm.exc.NoResultFound:
            n = cls(owner_id=owner.id, parent_id=tenant.id,
                name=NODE_NAME_FS, title='Filesystem', mime_type=MIME_TYPE_DIRECTORY)
            sess.add(n)
        return n

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
        """
        Generic method to add a child node.

        It does not handle node content!

        :param owner: ID, principal or instance of a user.
        :param name: Name of the new node.
        :param kwargs: Additional attributes.
        :return: Instance of the new node.
        """
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
        """
        Adds a directory as child node.

        A directory is a plain FsNode without content and mime-type
        'inode/directory'.

        :param owner: ID, principal or instance of a user.
        :param name: Name of the new node.
        :param kwargs: Additional attributes.
        :return: Instance of the new node.
        """
        return self.add_child(owner, name,
            mime_type=MIME_TYPE_DIRECTORY, **kwargs)

    def add_file(self, owner, filename, mime_type, size, encoding=None, **kwargs):
        """
        Adds a file as child node.

        A file is a FsNode with corresponding content. This method creates the
        node and and the content entity, but does not upload the content data.
        The returned node instance will have an initialised attribute
        ``content`` (:class:`~pym.fs.models.FsContent`). Use its methods and
        attributes to handle the data and additional properties like ``xattr``
        and ``local_file_name``.

        We throw an exception if a node with this name already exists. Use
        :meth:`.update_file` in this case.

        :param owner: ID, principal or instance of a user.
        :param name: Name of the new node.
        :param kwargs: Additional attributes.
        :return: Instance of the new node.
        """
        n = self.add_child(owner, name=filename, mime_type=mime_type,
            size=size, encoding=encoding, **kwargs)
        c = FsContent()
        c.owner_id = n.owner_id
        c.filename = filename
        c.mime_type = mime_type
        c.size = size
        n.content_rows = [c]
        n.content = c
        n.set_meta(kwargs, keep_content=False)
        return n

    def set_meta(self, meta, keep_content):
        if self.content and not keep_content:
            self.content.set_meta(meta)
        if 'meta_json' in meta:
            if isinstance(meta['meta_json'], list):
                x = meta['meta_json'][0]
            else:
                x = meta['meta_json']
            if x is not None and 'title' in x:
                self.title = x['title']

    def update(self, editor, **kwargs):
        """
        Updates current node.

        Updates current node with new settings and/or content. We here apply
        the kwargs to the attributes of the current node, and, if present,
        ``filename``, ``mime_type``, ``size`` of the content entity. We also set
        its editor. Caller may additionally apply new data to the content.

        The revision counter ``rev`` is kept as-is.

        To create a new revision, use :meth:`.revise`.

        :param editor: ID, principal or instance of a user.
        :param kwargs: Additional attributes.
        """
        sess = sa.inspect(self).session
        editor = pym.auth.models.User.find(sess, editor)

        for k, v in kwargs.items():
            setattr(self, k, v)
        self.editor_id = editor.id

        if self.content:
            for k in ('filename', 'mime_type', 'encoding', 'size'):
                if k in kwargs:
                    setattr(self.content, k, kwargs[k])
            self.content.editor_id = editor.id

        self.set_meta(kwargs, keep_content=False)

    def revise(self, keep_content, editor, **kwargs):
        """
        Revises current node.

        Revises current node with new settings and/or content. We increment the
        revision counter ``rev`` and apply the kwargs to the attributes of the
        current node.

        .. todo:: Keep history of the FsNode

        If ``keep_content`` is True, we keep the content of the previous
        revision. That means, all attributes mentioned in ``kwargs`` are
        only applied to the node itself, not the content.

        If ``keep_content`` is False, we then add a new, empty instance of
        FsContent to the collection ``content_rows``, and let attribute
        ``content`` point to it. If kwargs contain ``filename``, ``mime_type``
        and ``size``, we apply them to the new content entity. We also set its
        owner. Caller may additionally set data to the content.

        To update a node in-place, use :meth:`.update`.

        :param editor: ID, principal or instance of a user.
        :param kwargs: Additional attributes.
        """
        sess = sa.inspect(self).session
        editor = pym.auth.models.User.find(sess, editor)

        for k, v in kwargs.items():
            setattr(self, k, v)
        self.rev += 1
        self.editor_id = editor.id

        # If we had a content entry, create a new one for the new revision
        if self.content and not keep_content:
            c = FsContent()
            self.content_rows.append(c)
            self.content = c

            for k in ('filename', 'mime_type', 'encoding', 'size'):
                if k in kwargs:
                    setattr(self.content, k, kwargs[k])
            c.owner_id = editor.id

        self.set_meta(kwargs, keep_content)

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
            if not isinstance(n.parent, FsNode):
                break
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
