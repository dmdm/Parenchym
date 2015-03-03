import sqlalchemy as sa
import fs.base
from fs.base import synchronize
import fs.errors

from .models import FsNode
import pym.exc
from pym.decorators import savepoint
from pym.models import DbSession


class PymFs(fs.base.FS):

    def __init__(self, sess, fs_root, actor):
        """
        Parenchym Filesystem for use in ``Pyfilesystem``.

        The session instance, fs root node, and the actor user object are created
        within the current transaction. Should a later method call take place
        in a different transaction, because e.g. you encapsulate that method
        call in a ``transaction.manager``, these objects need to be re-initialised
        in the new transaction. Call :meth:`reinit`.

        https://code.google.com/p/pyfilesystem/

        :param sess: Instance of a DB session.
        :param fs_root: Instance of the root node of the filesystem.
        :param fs_root: FsNode
        :param actor: Instance of a user.
        """
        super().__init__(thread_synchronize=True)
        self.sess = sess
        self.fs_root = fs_root
        self.actor = actor

    def reinit(self, sess=None):
        """
        Reinitialises DB session, fs root and actor.

        Sets or creates a new DB session and binds the existing instances of
        fs root and actor to it.

        :param sess: Optional. Instance of a new DB session.
        :type sess: sqlalchemy.orm.session.Session
        """
        self.sess = sess if sess else DbSession()
        self.fs_root = self.sess.merge(self.fs_root)
        self.actor = self.sess.merge(self.actor)

    def cachehint(self, enabled):
        super().cachehint(enabled)

    def close(self):
        super().close()

    def open(self, path, mode='r', buffering=-1, encoding=None, errors=None,
            newline=None, line_buffering=False, **kwargs):
        raise fs.errors.UnsupportedError("open file")

    def isfile(self, path):
        """
        Checks if a path references a file.

        Actually, a path references a filesystem node that can be directory and
        file simultaneously. Here, we consider a node to be file-ish if it has no
        children.

        :param path: A path in the filesystem.
        :rtype: bool
        :raises FileNotFoundError: If path does not exist.
        """
        n = self.fs_root.find_by_path(path)
        return not n.has_children()

    def isdir(self, path):
        """
        Checks if a path references a directory.

        Actually, a path references a filesystem node that can be directory and
        file simultaneously. Here, we consider a node to be directory-ish if it
        has children.

        :param path: A path in the filesystem.
        :rtype: bool
        :raises FileNotFoundError: If path does not exist.
        """
        n = self.fs_root.find_by_path(path)
        return n.has_children()

    def exists(self, path):
        """
        Check if the path references a valid resource.

        :param path: A path in the filesystem.
        :rtype: bool
        """
        return self.fs_root.path_exists(path)

    @synchronize
    def listdir(self,
            path="/",
            wildcard=None,
            full=False,
            absolute=False,
            dirs_only=False,
            files_only=False):
        """
        Lists the the files and directories under a given path.

        The directory contents are returned as a list of unicode paths.

        :param path: root of the path to list
        :type path: string
        :param wildcard: Only returns paths that match this wildcard. We transform
            the wildcard into a PostgreSQL regular expression to let the database
            perform the filtering. If wildcard starts with '/' (slash), we treat
            it as a regular expression and do no transformation.
        :type wildcard: string containing a wildcard, or a callable that accepts a path and returns a boolean
        :param full: returns full paths (relative to the root)
        :type full: bool
        :param absolute: returns absolute paths (paths beginning with /)
        :type absolute: bool
        :param dirs_only: if True, only return directories
        :type dirs_only: bool
        :param files_only: if True, only return files
        :type files_only: bool

        :rtype: iterable of paths

        :raises `fs.errors.ResourceNotFoundError`: if the path is not found

        """
        n = self.fs_root.find_by_path(path)
        fil = [
            FsNode.parent_id == n.id
        ]
        pattern = None
        if wildcard:
            if wildcard.startswith('/'):
                pattern = wildcard.strip('/')
            else:
                pattern = '^' + wildcard.replace('.', r'\.').replace(
                    '*', '.*').replace('?', '.') + '$'
            fil.append(sa.text('name ~* :re'))
        qry = self.sess.query(FsNode._name.label('name')).filter(
            *fil
        ).order_by(FsNode.sortix, FsNode._name)
        if pattern:
            qry = qry.params(re=pattern)
        return (x.name for x in qry)

    @synchronize
    def makedir(self, path, recursive=False, allow_recreate=False):
        """
        Make a directory on the filesystem.

        :param path: Path of directory
        :type path: string
        :param recursive: If True, any intermediate directories will also be
            created.
        :type recursive: bool
        :param allow_recreate: if True, re-creating a directory wont be an error
        :type allow_recreate: bool

        :returns: Instance of leaf directory
        :rtype: FsNode

        :raises `fs.errors.DestinationExistsError`: If the path exists and
            allow_recreate is False.
        :raises `fs.errors.ParentDirectoryMissingError`: If a containing
            directory is missing and recursive is False.
        """
        try:
            n = self.fs_root.makedirs(
                owner=self.actor,
                path=path,
                recursive=recursive,
                exist_ok=allow_recreate
            )
        except pym.exc.ItemExistsError as exc:
            raise fs.errors.DestinationExistsError(str(exc))
        except FileNotFoundError as exc:
            raise fs.errors.ParentDirectoryMissingError(str(exc))
        return n

    @synchronize
    def remove(self, path, deletion_reason=None, delete_from_db=False):
        """
        Removes a resource from the filesystem.

        This method removes empty resources only.

        PymFs does not discern between files and directories, so you can
        remove both with this method. It operates the same as
        :meth:`.removedir`, which has more options.

        Parameters ``deletion_reason`` and ``delete_from_db`` are specific to
        PymFs.

        :param path: Path of the resource to remove
        :type path: string
        :param deletion_reason: Optional description why this resource is
            deleted.
        :type deletion_reason: string
        :param delete_from_db: If True, resource is removed from DB, if False
            (default), it is only flagged as deleted and a reason may be given.
        :type delete_from_db: bool

        :raises `fs.errors.ResourceNotFoundError`: if the path does not exist.
        :raises `fs.errors.DirectoryNotEmptyError`: if the resource is not empty.
        """
        try:
            n = self.fs_root.find_by_path(path)
            n.delete(deleter=self.actor, deletion_reason=deletion_reason,
                delete_from_db=delete_from_db, recursive=False)
        except FileNotFoundError as exc:
            raise fs.errors.ResourceNotFoundError(str(exc))
        except OSError as exc:
            raise fs.errors.DirectoryNotEmptyError(str(exc))

    @synchronize
    def removedir(self, path, recursive=False, force=False,
            deletion_reason=None, delete_from_db=True):
        """
        Removes a resource from the filesystem.

        PymFs does not discern between files and directories, so you can
        remove both with this method.

        Parameters ``deletion_reason`` and ``delete_from_db`` are specific to
        PymFs.

        :param path: Path of the directory to remove
        :type path: string
        :param recursive: If True, empty parent directories will be removed.
            Default is False. *NOT SUPPORTED YET!*
        :type recursive: bool
        :param force: If True, removes resource also if it is not empty, and
            removes *all of its children* in that case.
        :type force: bool
        :param deletion_reason: Optional description why this resource is
            deleted.
        :type deletion_reason: string
        :param delete_from_db: If True (default), resource is removed from DB,
            if False, it is only flagged as deleted and a reason may be given.
        :type delete_from_db: bool

        :raises `fs.errors.DirectoryNotEmptyError`: If the resource is not empty
            and force is False.
        :raises `fs.errors.ResourceNotFoundError`: If the path does not exist.
        """
        assert recursive is False, "Recursively deleting parent dirs is not yet implemented"
        try:
            n = self.fs_root.find_by_path(path)
            n.delete(
                deleter=self.actor,
                deletion_reason=deletion_reason,
                delete_from_db=delete_from_db,
                recursive=force
            )
        except FileNotFoundError as exc:
            raise fs.errors.ResourceNotFoundError(str(exc))
        except OSError as exc:
            raise fs.errors.DirectoryNotEmptyError(str(exc))
