import json
import mimetypes
import threading
import magic
import os
import sqlalchemy as sa
import fs.base
from fs.base import synchronize
import fs.errors
import transaction

from .models import FsNode
import pym.exc
from pym.models import DbSession


class PymFs(fs.base.FS):

    _meta = {
        'read_only': False,
        'thread_safe': True,
        'network': True,
        'unicode_paths': True,
        'case_insensitive_paths': False,
        'atomic.makedir': True,
        'atomic.rename': True,
        'atomic.setcontents': True,
        'free_space': None,
        'total_space': None,
        'virtual': False,
        'invalid_path_chars': None  # Too many to list. Use pym.security.safepath()
    }

    def __init__(self, lgg, sess, fs_root, actor):
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
        self.lgg = lgg
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
            path=FsNode.SEP,
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
        return (x.get_path() if full else x.name for x in qry)

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
            n = self.fs_root.find_by_path(path, include_deleted=delete_from_db)
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

    def rename(self, src, dst):
        """
        Renames a file or directory

        :param src: path to rename
        :type src: string
        :param dst: new name
        :type dst: string

        :raises ResourceInvalidError:
            - if dst is empty
            - if dst is a child of src
        :raises ResourceNotFoundError:
            - if the src path does not exist
            - if the path to dst does not exist
        :raises OperationFailedError:
            - if src is root node (root cannot be renamed or moved)
            - if src and dst are the same
        """
        try:
            n = self.fs_root.find_by_path(src)
            n.rename(editor=self.actor, dst=dst)
        except ValueError as exc:
            raise fs.errors.ResourceInvalidError(str(exc))
        except FileNotFoundError as exc:
            raise fs.errors.ResourceNotFoundError(str(exc))
        except pym.exc.ItemExistsError as exc:
            raise fs.errors.DestinationExistsError(str(exc))
        except pym.exc.PymError as exc:
            raise fs.errors.OperationFailedError(str(exc))

    def move(self, src, dst, overwrite=False, chunk_size=1024 * 64):
        """
        Moves a node from src to dst.

        :param src: The source path
        :type src: string
        :param dst: The destination path
        :type dst: string
        :param overwrite: If dst exists, allow to overwrite
        :type overwrite: bool
        :param chunk_size: size of chunks to use if a simple copy is required
        (defaults to 64K). *NOT APPLICABLE IN PymFS*
        :type chunk_size: int
        """
        try:
            n = self.fs_root.find_by_path(src)
            n.move(editor=self.actor, dst=dst, overwrite=overwrite)
        except ValueError as exc:
            raise fs.errors.ResourceInvalidError(str(exc))
        except FileNotFoundError as exc:
            raise fs.errors.ResourceNotFoundError(str(exc))
        except pym.exc.ItemExistsError as exc:
            raise fs.errors.DestinationExistsError(str(exc))
        except pym.exc.PymError as exc:
            raise fs.errors.OperationFailedError(str(exc))

    def movedir(self, src, dst, overwrite=False, ignore_errors=False,
            chunk_size=16384):
        """
        Moves a directory from one location to another.

        In PymFs this is the same as :meth:`.move`.
        """
        return self.move(src=src, dst=dst, overwrite=overwrite,
            chunk_size=chunk_size)

    def copy(self, src, dst, overwrite=False, chunk_size=1024 * 64):
        """
        Copies a node from src to dst.

        :param src: the source path
        :type src: string
        :param dst: the destination path
        :type dst: string
        :param overwrite: if True, then an existing file at the destination may
        be overwritten; If False then DestinationExistsError
        will be raised.
        :type overwrite: bool
        :param chunk_size: size of chunks to use if a simple copy is required
        (defaults to 64K). *NOT APPLICABLE IN PymFS*
        :type chunk_size: int
        """
        raise NotImplementedError('TODO')

    def copydir(self, src, dst, overwrite=False, ignore_errors=False,
            chunk_size=16384):
        """
        Copies a directory from one location to another.

        In PymFs this is the same as :meth:`.copy`.
        """
        return self.copy(src=src, dst=dst, overwrite=overwrite,
            chunk_size=chunk_size)

    def get_size(self, path):
        try:
            n = self.fs_root.find_by_path(path)
        except FileNotFoundError as exc:
            raise fs.errors.ResourceNotFoundError(str(exc))
        return n.size

    def getinfo(self, path):
        """
        Returns information for a node as a dictionary.

        * "size" - Number of bytes
        * "created_time" - A datetime object containing the time the resource was created
        * "accessed_time" - A datetime object containing the time the resource was last accessed
        * "modified_time" - A datetime object containing the time the resource was modified
        * ``rev`` - Revision
        * ``mime_type`` - Mime-Type
        * ``ctime``, ``mtime``, ``dtime``
        * ``n_children``

        :param path: A path to retrieve information for
        :type path: string

        :rtype: dict

        :raises `fs.errors.ResourceNotFoundError`: if the path does not exist
        """
        try:
            n = self.fs_root.find_by_path(path)
        except FileNotFoundError as exc:
            raise fs.errors.ResourceNotFoundError(str(exc))
        return {
            'size': n.size,
            'rev': n.rev,
            'mime_type': n.mime_type,
            'created_time': n.ctime,
            'accessed_time': n.mtime,
            'modified_time': n.mtime,
            'ctime': n.ctime,
            'mtime': n.mtime,
            'dtime': n.dtime,
            'n_children': n.count_children(),
            'is_file': n.is_file(),
            'is_directory': n.is_directory()
        }

    def _setcontents(self,
            path,
            data,
            command='add',
            meta=None,
            encoding=None,
            errors=None,
            chunk_size=1024 * 64,
            progress_callback=None,
            finished_callback=None):
        """
        Creates a new node or updates or revises an existing one.

        :param path: Path of the destination. Depending on ``command``, we create
            its leaf, or update or revise it.
        :param data: File-like object. *Strings or bytes are not yet supported.*
        :param command: One of 'add', 'update' or 'revise'.
        :param meta: Callable that returns dict with metadata or that dict
            itself.
        :param encoding: *Not used*
        :param errors: *Not used*.
        :param chunk_size: *Not used*.
        :param progress_callback: *Not used*
        :param finished_callback: Callable that is called when we are finished.
        """
        if progress_callback is None:
            progress_callback = lambda bytes_written: None
        if finished_callback is None:
            finished_callback = lambda: None
        bytes_written = 0
        progress_callback(bytes_written)

        # 1/ Prepare source

        # Treat data as filename
        src_fn = data

        # Get mime-type
        # Try Python's native lib first
        mt, enc = mimetypes.guess_type(src_fn)
        # It may not find all types, e.g. it returns None for 'text/plain', so
        # fallback on python-magic.
        if not mt:
            m = magic.Magic(mime=True, mime_encoding=True, keep_going=True)
            mt = m.from_file(src_fn).decode('ASCII')
        if not enc:
            enc = 'UTF-8'
        # Get size
        sz = os.path.getsize(src_fn)

        # 2/ Prepare destination
        dst_path = path
        dst_fn = os.path.basename(src_fn)

        # 3/ build general args
        args = {
            'filename': dst_fn,
            'mime_type': mt,
            'size': sz
        }

        # 4/ process command
        if command == 'add':
            pn = self.fs_root.find_by_path(dst_path)
            args['owner'] = self.actor
            n = pn.add_file(**args)
        elif command == 'update':
            args['editor'] = self.actor
            n = self.fs_root.find_by_path(dst_path + FsNode.SEP + dst_fn)
            n.update(**args)
        elif command == 'revise':
            args['editor'] = self.actor
            n = self.fs_root.find_by_path(dst_path + FsNode.SEP + dst_fn)
            n.revise(**args)
        else:
            raise ValueError("Unknown command: '{}'".format(command))

        # 5/ Store the content data
        attr = n.content.data_attr
        if attr == 'data_bin':
            with open(src_fn, 'rb') as fh:
                setattr(n.content, attr, fh.read())
        else:
            with open(src_fn, 'rt', encoding=enc) as fh:
                if attr == 'data_json':
                    setattr(n.content, attr,
                        json.load(fh, cls=pym.lib.JsonDecoder))
                else:
                    setattr(n.content, attr, fh.read())
        bytes_written += sz

        # Store the meta data
        if meta:
            if callable(meta):
                self.lgg.debug('Fetching meta data')
                meta = meta(src_fn)
            kk = 'meta_json meta_xmp data_text data_html_head data_html_body'.split(' ')
            for k in kk:
                setattr(n.content, k, meta.get(k, None))
            if isinstance(meta['meta_json'], list):
                x = meta['meta_json'][0]
            else:
                x = meta['meta_json']
            if 'title' in x:
                n.title = x['title']

        finished_callback()
        return bytes_written

    def setcontents(self,
            path,
            data,
            command='add',
            meta=None,
            encoding=None,
            errors=None,
            chunk_size=1024 * 64,
            progress_callback=None,
            finished_callback=None):
        """
        Creates a new node or updates or revises an existing one.

        :param path: Path of the destination. Depending on ``command``, we create
            its leaf, or update or revise it.
        :param data: File-like object. *Strings or bytes are not yet supported.*
        :param command: One of 'add', 'update' or 'revise'.
        :param meta: Meta data
        :param encoding: *Not used*
        :param errors: *Not used*.
        :param chunk_size: *Not used*.
        :param progress_callback: *Not used*
        :param finished_callback: Callable that is called when we are finished.
        """
        self._setcontents(
            path=path,
            data=data,
            command=command,
            meta=meta,
            encoding=encoding,
            errors=errors,
            chunk_size=chunk_size,
            progress_callback=progress_callback,
            finished_callback=finished_callback
        )

    def setcontents_async(self,
            path,
            data,
            command='add',
            meta=None,
            encoding=None,
            errors=None,
            chunk_size=1024 * 64,
            progress_callback=None,
            finished_callback=None,
            error_callback=None):
        """
        Creates a new node or updates or revises an existing one.

        :param path: Path of the destination. Depending on ``command``, we create
            its leaf, or update or revise it.
        :param data: File-like object. *Strings or bytes are not yet supported.*
        :param command: One of 'add', 'update' or 'revise'.
        :param meta: Meta data
        :param encoding: *Not used*
        :param errors: *Not used*.
        :param chunk_size: *Not used*.
        :param progress_callback: *Not used*
        :param finished_callback: Callable that is called when we are finished.
        :param error_callback: A function that is called with an exception
            object if any error occurs during the copy process.
        :returns: An event object that is set when the copy is complete, call
            the `wait` method of this object to block until the data is written.
        """
        finished_event = threading.Event()

        def do_setcontents():
            try:
                # New thread needs new transaction and db session
                with transaction.manager:
                    self.reinit()
                    self._setcontents(
                        path=path,
                        data=data,
                        command=command,
                        meta=meta,
                        encoding=encoding,
                        errors=errors,
                        chunk_size=chunk_size,
                        progress_callback=progress_callback,
                        finished_callback=finished_callback
                    )
            except Exception as exc:
                if error_callback:
                    error_callback(exc)
                else:
                    raise
            finally:
                finished_event.set()

        threading.Thread(target=do_setcontents).start()
        return finished_event

