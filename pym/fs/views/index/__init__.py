import logging
import os
from pathlib import PurePath
import re
import uuid
import fcntl
import magic
from pyramid.view import view_config, view_defaults
import time
import yaml
from pym.lib import json_serializer
from ...models import IFsNode
from pym.i18n import _
import pym.exc
import pym.security
from pym.lib import dump_yaml
from pym.auth.models import Permissions
from pym.models import DbSession


class UploadCache():

    def __init__(self, root_dir='/tmp/upload_cache', fs_node=None):
        """
        Class to manage a cache for uploaded files.

        :param root_dir: Root directory for the cache, default '/tmp'. As a
            precaution, ``root_dir`` must be '/tmp' or have at least 3 elements,
            like '/home/professor_xavier/foo'.
        :param fs_node: :class:`~pym.fs.models.FsNode` of current request, if
            available
        """
        self.root_dir = root_dir
        """Root directory for the cache"""
        os.makedirs(self.root_dir, exist_ok=True)

        self.fs_node = fs_node
        """:class:`~pym.fs.models.FsNode` of current request, if available"""
        self.min_size = 1
        """Minimum file size in bytes"""
        self.max_size = 1024 * 1024 * 2
        """Maximum file size in bytes"""
        self.max_total_size = None
        """Maximum size of this node plus children in bytes"""
        self.max_children = None
        """Maximum amount of children"""
        self.timeout = 60 * 60 * 24  # 1 day
        """Files older than this are purged from cache [seconds]"""
        self.chunk_size = 8192
        """Chunk size for copy operations"""
        self.magic = magic.Magic(mime=True, mime_encoding=True)
        """Instance of mime-type resolver, e.g. :class:`magic.Magic`"""
        self._allow = ['image/*', 'application/pdf']
        self._allow_re = []
        self._deny = []
        self._deny_re = []

        self._files = []
        self.init_mime_pattern()

    def _check_root_dir(self):
        # root_dir must have at least 3 parts, e.g. '/home/dm/foo' or be '/tmp'
        if self.root_dir != '/tmp' and len(self.root_dir.split(os.path.sep)) < 3:
            raise pym.exc.PymError("Invalid root dir: '{}'".format(self.root_dir))

    def init_mime_pattern(self):
        """Compiles regexps for the mime-type patterns."""
        rr = []
        for pat in self._allow:
            if '*' in pat and '.*' not in pat:
                pat = pat.replace('*', '.*')
            pat = pat.split('/')
            rr.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
        self._allow_re = rr
        rr = []
        for pat in self._deny:
            if '*' in pat and '.*' not in pat:
                pat = pat.replace('*', '.*')
            pat = pat.split('/')
            rr.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
        self._deny_re = rr

    def create_file(self, f, local_filename=None):
        """
        Factory for :class:`UploadedFile`.

        Does not store uploaded file in cache yet, just creates instance and
        checks the data. Call :meth:`save` to save file in cache.
        """
        if not local_filename:
            local_filename = str(uuid.uuid4())  # .replace('-', os.path.sep)
        self._files.append(UploadedFile(self, f, local_filename))

    def save(self, lgg, resp):
        """
        Saves uploaded data in cache.

        Two files are created: 1 for the data, 2 with ext '.yaml' with metadata.

        :param lgg: Instance of logger
        :param resp: Instance of a response :class:`pym.resp.JsonResp`.
        :return:
        """
        self._check_root_dir()
        resp.data = {}
        for f in self._files:
            if not f.is_ok:
                resp.error("{}: {}".format(f.client_filename, f.exc))
                continue
            fn = os.path.join(self.root_dir, f.local_filename)
            if os.path.exists(fn):
                raise FileExistsError("Cache file exists: '{}'".format(fn))
            d = os.path.dirname(fn)
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=False)
            fh = open(fn, 'wb')
            try:
                fcntl.flock(fh, fcntl.LOCK_EX)
                f.save_content(fh)
            except OSError as exc:
                lgg.exception(exc)
                resp.data = {f.client_filename: _("Failed to save content")}
            finally:
                fh.close()
            fn += '.yaml'
            fh = open(fn, 'wt', encoding='utf-8')
            try:
                fcntl.flock(fh, fcntl.LOCK_EX)
                f.save_meta(fh)
            except OSError as exc:
                lgg.exception(exc)
                resp.data = {f.client_filename: _("Failed to save meta")}
            finally:
                fh.close()
            resp.data[f.client_filename] = _("Uploaded.")

    def load(self, fn):
        """
        Loads the whole (!) file and returns content as string.

        :param fn: Filename
        :return: Content as string
        """
        fn_data = os.path.join(self.root_dir, fn)
        with open(fn_data, 'rb') as fh:
            x = fh.read()
        return x

    def open(self, fn):
        """
        Returns settings and an opened file handle

        DO NOT FORGET TO CLOSE THE FILE HANDLE AFTER USE!

        :param fn: Filename
        :return: 2-tuple: (meta data, file handle)
        """
        fn_data = os.path.join(self.root_dir, fn)
        fn_rc = os.path.join(self.root_dir, fn) + '.yaml'
        with open(fn_rc, 'rt', encoding='utf-8') as fh:
            rc = yaml.load(fh)
        fh = open(fn_data, 'rb')
        return rc, fh

    def delete(self, fn):
        """
        Deletes this file from cache, incl. metadata file.
        """
        self._check_root_dir()
        fn_data = os.path.join(self.root_dir, fn)
        fn_rc = os.path.join(self.root_dir, fn) + '.yaml'
        try:
            os.remove(fn_data)
        except OSError:
            pass
        try:
            os.remove(fn_rc)
        except OSError:
            pass

    def purge(self, timeout=None):
        """
        Deletes all files from cache older than ``timeout`` in seconds.
        """
        if not timeout:
            timeout = self.timeout
        rp = PurePath(self.root_dir)
        threshold = time.time() - timeout
        for root, dirs, files in os.walk(self.root_dir):
            for f in files:
                fn = PurePath(root, f)
                if fn.name.endswith('.yaml'):
                    continue
                if os.path.getctime(str(fn)) < threshold:
                    self.delete(str(fn.relative_to(rp)))

    @property
    def allow(self):
        """
        List of mime-type patterns that are allowed. If empty, all mime-types
        are allowed.
        """
        return self._allow

    @allow.setter
    def allow(self, v):
        self._allow = v
        self.init_mime_pattern()

    @property
    def allow_re(self):
        """Compiled regex"""
        return self._allow_re

    @property
    def deny(self):
        """
        List of mime-type patterns that are denied. If empty, no mime-types
        are denied.
        """
        return self._deny

    @deny.setter
    def deny(self, v):
        self._deny = v
        self.init_mime_pattern()

    @property
    def deny_re(self):
        """Compiled regex"""
        return self._deny_re

    @property
    def files(self):
        """List of file instances"""
        return self._files


class UploadedFile():

    def __init__(self, cache, f, local_filename):
        """
        Instance of an uploaded file.

        :param cache: Instance of the cache where this file will be stored.
        :param f: A ``cgi.fieldStorage``
        :param local_filename: Save file with this name in cache. If None, we
            use a UUID. Original name is available as ``client_filename``.
        """
        self.cache = cache
        self.f = f
        self._local_filename = local_filename

        self._size = None
        self._local_mime_type = None
        self._exc = None
        self._xattr = None

        self.check()

    def check(self):
        """
        Determines whether we accept this file or not.

        Currently performs checks on mime-types and sizes.

        If file is not accepted, we return False, and the corresponding
        exception is available in attribute ``exc``.
        """
        try:
            self.check_mime_type()
            self.check_size()
            return True
        except pym.exc.UploadDeniedError as exc:
            self._exc = exc
        return False

    def check_mime_type(self):
        """Performs checks on mime-types."""
        good = False
        ty = self.local_mime_type

        rr = self.cache.allow_re
        for r in rr:
            if r[0].search(ty) and r[1].search(ty):
                good = True
                break
        if not good:
            raise pym.exc.UploadDeniedError("Mime-type not allowed: '{}'".format(ty))

        rr = self.cache.deny_re
        for r in rr:
            if r[0].search(ty) or r[1].search(ty):
                good = False
                break
        if not good:
            raise pym.exc.UploadDeniedError("Mime-type denied: '{}'".format(ty))

    def check_size(self):
        """Performs checks on sizes."""
        ok = self.cache.min_size <= self.size <= self.cache.max_size
        if not ok:
            raise pym.exc.UploadDeniedError("File too large")
        if self.cache.fs_node:
            if self.cache.max_total_size:
                ok = self.cache.max_size >= (self.cache.fs_node.total_size
                                             + self.size)
                if not ok:
                    raise pym.exc.UploadDeniedError("File too large")
            if self.cache.max_children:
                ok = self.cache.fs_node.cnt_children < self.cache.max_children
                if not ok:
                    raise pym.exc.UploadDeniedError("Too many files")

    def save_content(self, fout):
        """
        Saves content in given file handle.

        Caller should have opened file as binary for writing.
        """
        while True:
            data = self.f.file.read(self.cache.chunk_size)
            if not data:
                break
            fout.write(data)

    def save_meta(self, fout):
        """
        Saves meta data as YAML in given file handle.

        Caller should have opened file a text with encoding 'utf-8' for writing.
        """
        if not self.is_ok:
            raise self._exc
        dump_yaml(self.meta, fout)

    @property
    def is_ok(self):
        """Is True, if checks did not produce an exception. False otherwise."""
        return self._exc is None

    @property
    def exc(self):
        """Exception produced by checks or None."""
        return self._exc

    @property
    def xattr(self):
        """Extended attributes, e.g. determined with TIKA"""
        return self._xattr

    @property
    def meta(self):
        """
        Meta data as determined from uploaded data:

            {
                'size': self.size,
                'client_filename': self.client_filename,
                'client_mime_type': self.client_mime_type,
                'local_mime_type': self.local_mime_type,
                'xattr': self.xattr
            }
        """
        return {
            'size': self.size,
            'client_filename': self.client_filename,
            'client_mime_type': self.client_mime_type,
            'local_mime_type': self.local_mime_type,
            'xattr': self.xattr
        }

    @property
    def size(self):
        """Size of uploaded data in bytes"""
        if not self._size:
            self.f.file.seek(0, 2)  # Seek to the end of the file
            self._size = self.f.file.tell()  # Get the position of EOF
            self.f.file.seek(0)  # Reset the file position to the beginning
        return self._size

    @property
    def client_filename(self):
        """Filename as given by client, sanitised with
        :func:`pym.security.safepath`."""
        return pym.security.safepath(self.f.filename)

    @property
    def local_filename(self):
        """Filename used locally in cache"""
        return self._local_filename

    @property
    def client_mime_type(self):
        """Mime-type as given by client"""
        return self.f.type

    @property
    def local_mime_type(self):
        """Mime-type as locally determined from uploaded data."""
        if not self._local_mime_type:
            self.f.file.seek(0)
            self._local_mime_type = self.cache.magic.from_buffer(
                self.f.file.read(1024)).decode('ASCII')
            self.f.file.seek(0)
        return self._local_mime_type


@view_defaults(
    context=IFsNode,
    permission=Permissions.read.name
)
class FsView(object):

    def __init__(self, context, request):
        """
        File System Browser.
        """
        self.context = context
        self.request = request
        self.sess = DbSession()
        self.lgg = logging.getLogger(__name__)

        # context must be FsNode
        self.cache = UploadCache(fs_node=context, root_dir='/tmp/upload_cache')
        rc = context.rc or {}
        kk = ('min_size', 'max_size', 'max_total_size', 'max_children', 'allow',
              'deny')
        for k in kk:
            try:
                setattr(self.cache, k, rc[k])
            except KeyError:
                pass
        self.cache.purge()

        self.urls = dict(
            index=request.resource_url(context),
            upload=request.resource_url(context, '@@ul'),
        )

    @view_config(
        name='',
        renderer='index.mako',
        request_method='GET'
    )
    def index(self):
        rc = {
            'urls': self.urls,
            'min_size': self.cache.min_size,
            'max_size': self.cache.max_size,
            'allow': self.cache.allow,
            'deny': self.cache.deny
        }
        return {
            'rc': rc,
        }

    @view_config(
        name='ul',
        renderer='string',
        request_method='POST'
    )
    def upload(self):
        resp = pym.resp.JsonResp()

        for name, fieldStorage in self.request.POST.items():
            if not (hasattr(fieldStorage, 'file') and fieldStorage.file):
                continue
            self.cache.create_file(fieldStorage)

        self.cache.save(self.lgg, resp)
        return json_serializer(resp.resp)
