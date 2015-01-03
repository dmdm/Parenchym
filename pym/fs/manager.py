import datetime
import sqlalchemy as sa
import sqlalchemy.orm.exc
import pym.exc
from pym.auth.models import User
from pym.res.models import ResourceNode
from .models import FsNode


def create_fs_node(sess, owner, parent_id, name, raise_if_exists=False, **kwargs):
    """
    Creates a new FsNode record.

    :param sess: A DB session instance.
    :param owner: ID, ``principal``, or instance of a user.
    :param name: Name.
    :param raise_if_exists: If True and a node with same name and parent exists,
        raises ``ItemExistsError``. If False (default), creates a new revision.
    :param kwargs: See :class:`~pym.auth.models.FsNode`.
    :return: Instance of created fs_node.
    """
    owner_id = User.find(sess, owner).id
    n_parent = sess.query(ResourceNode).get(parent_id)
    if not n_parent:
        raise sa.orm.exc.NoResultFound(
            "Failed to load parent resource with ID {}".format(parent_id))
    try:
        o = sess.query(FsNode).filter(
            FsNode.parent_id == parent_id,
            FsNode.name == name
        ).one()
        if raise_if_exists:
            raise pym.exc.ItemExistsError("Fs node already exists: parent={},"
                " name='{}'".format(o.parent_id, o.name))
    except sa.orm.exc.NoResultFound:
        kwargs['rev'] = 1
    else:
        kwargs['rev'] = o.rev + 1
    fsn = FsNode(owner_id, name, **kwargs)
    n_parent.children[name] = fsn
    sess.flush()
    return fsn


def update_fs_node(sess, fs_node, editor, replace=False, **kwargs):
    """
    Updates a FsNode.

    If ``replace`` is True, the node is updated in-place, else we create a
    new revision, i.e. a new node. The latter is default.

    :param sess: A DB session instance.
    :param fs_node: ID, or instance of a FsNode.
    :param editor: ID, ``principal``, or instance of a user.
    :param replace: Whether to update in-place or create a new revision (default).
    :return: Instance of updated fs_node.
    """
    fsn = fs_node.find(sess, fs_node)
    if replace:
        fsn.editor_id = User.find(sess, editor).id
        fsn.mtime = datetime.datetime.now()
        for k, v in kwargs.items():
            setattr(fsn, k, v)
        sess.flush()
        return fsn
    else:
        new_fsn = create_fs_node(sess, editor, parent_id=fsn.parent_id,
            name=fsn.name, raise_if_exists=False, **kwargs)
        return new_fsn


def delete_fs_node(sess, fs_node, deleter, deletion_reason=None, delete_from_db=False):
    """
    Deletes a FsNode.

    :param sess: A DB session instance.
    :param fs_node: ID, or instance of a FsNode.
    :param deleter: ID, ``principal``, or instance of a user.
    :param deletion_reason: Optional. Reason for deletion.
    :param delete_from_db: Optional. Defaults to just tag as deleted (False),
        set True to physically delete record from DB.
    :return: None if really deleted, else instance of tagged FsNode.
    """
    fsn = fs_node.find(sess, fs_node)
    if delete_from_db:
        sess.delete(fsn)
        fsn = None
    else:
        fsn.deleter_id = User.find(sess, deleter).id
        fsn.deletion_reason = deletion_reason
        fsn.dtime = datetime.datetime.now()
        # TODO Replace content of unique fields
    sess.flush()
    return fsn
