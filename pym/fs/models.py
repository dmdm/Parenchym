import pyramid.util
import pyramid.i18n
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.ext.mutable import MutableDict
import zope.interface
import sqlalchemy as sa
import sqlalchemy.orm
import sqlalchemy.event
import pym.res.models


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
    rc = sa.orm.deferred(sa.Column(MutableDict.as_mutable(JSON()),
        nullable=True))
    """Settings

    Expected settings for the :class:`pym.cache.UploadCache` are:

    - ``min_size``: Minimum size of content in bytes, default 1
    - ``max_size``: Maximum size of content in bytes, default 2 MB
    - ``max_total_size``: Max size of content plus children in bytes. If not
      specified, is not checked (default).
    - ``max_children``: Max number children. If not specified, is not checked
      (default).
    - ``allow``: List of mime-types (RegEx pattern) that are allowed. If empty,
      all mime-types are allowed (default).
    - ``deny``: List of mime-types (RegEx pattern) that are denied. If empty,
      no mime-types are denied (default).
    """
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
