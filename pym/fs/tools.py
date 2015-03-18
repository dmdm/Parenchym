import fcntl
import io
import logging
import mimetypes
import os
from pathlib import PurePath
import re
import subprocess
import time
import uuid

from lxml import html
import magic
from pyramid.decorator import reify
import requests
import yaml

import pym.auth.models
import pym.fs
from pym.i18n import _
from .models import FsNode, WriteModes
import pym.lib
from pym.security import is_path_safe
import pym.security


mlgg = logging.getLogger(__name__)


class Sentry():

    def __init__(self, dst_node):
        """
        Sentry checks whether user is allowed to save the file or not.

        To do this, Sentry needs the quota settings and the ACL.

        - 'destination': Node to create or update/revise
        - 'parent': Parent node of destination

        If target does not exist, caller will create it as a child of given
        destination (``write_mode="create"``). Sentry here needs quota and ACL
        from destination only.

        If target does exist, caller will either update or revise it
        (``write_mode="update"`` or ``write_mode="revise"``). To resolve either
        case, Sentry needs quota and ACL from the destination and its parent.

        Quota and ACL are inherited from ancestors, so in all three cases it
        will be sufficient to ask the destination about it. Sentry also need not
        to know which write mode applies.

        :param dst_node: The destination node
        :type dst_node: FsNode
        """
        self._allowed_re = []
        self._denied_re = []

        self.file_meta = None
        self.dst_node = dst_node
        self.init_mime_pattern()

    def init_mime_pattern(self):
        """
        Compiles regular expressions for the mime-type patterns.
        """

        def _compile(mm):
            rr = []
            if isinstance(mm, str):
                mm = [mm]
            for pat in mm:
                # replace '*' with '.*' but don't touch '.*'
                pat = star.sub('.*', pat)
                pat = pat.split('/')
                rr.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
            return rr

        star = re.compile(r'(?<!\.)\*')
        self._allowed_re = _compile(self.allowed_mimes)
        self._denied_re = _compile(self.denied_mimes)

    def check_file_meta(self, file_meta: dict):
        """
        Approves the file by checking its meta data against the quota.

        :param file_meta: Dict with meta info ``size``, ``mime_type``, ``name``.
        :raises PermissionError: if a check fails.
        """
        self.file_meta = file_meta
        self.check_filename()
        self.check_max_size()
        self.check_max_total_size()
        self.check_max_total_items()
        self.check_mime_type()

    def check_filename(self):
        is_path_safe(self.file_meta['filename'])

    def check_permission(self, request, write_mode):
        """
        Checks whether given user has permission to write to destination node.

        ``write_mode`` tells what is required: "create" to add a child to
        current node, or to "update" or "revise" it.

        First, we check for the general write permission. If
        ``write_mode`` is "create" or "revise", this is sufficient. If
        "update" is given, we also check the quota for ``force_revision``.
        If ``force_revision`` is True, we deny updating the node.

        :param request: Current request. We call its method
            :meth:`pyramid.security.request.Request.has_permission`. It is able
            to determine the current effective security principals by asking the
            current authentication policy.
        :param write_mode: One of "create", "update" or "revise"
        :raises PermissionError: if permission is denied.
        """
        p = request.has_permission(pym.auth.models.Permissions.write.value, self.dst_node)
        if not p:
            raise PermissionError(str(p))
        if write_mode == 'update' and self.force_revision:
            raise PermissionError(str(p))

    def check_max_size(self):
        if self.file_meta['size'] > self.max_size:
            raise PermissionError(_("File is too large"))

    def check_max_total_size(self):
        ts = self.file_meta['size'] + self.fs_total_size
        if ts > self.max_total_size:
            raise PermissionError(_("File exceeds capacity of filesystem"))

    def check_max_total_items(self):
        if self.max_total_items == -1:
            return True
        cnt = self.fs_total_items
        if cnt + 1 > self.max_total_items:
            raise PermissionError(_("Filesystem is full"))

    def check_mime_type(self):
        """
        Mime-type is allowed if it matches one of the allowed and matches none
        of the denied types. Both are checked in this order.

        :raises PermissionError: if mime-type is not allowed.
        """
        mt = self.file_meta['mime_type'].split('/')
        for r in self._allowed_re:
            if r[0].search(mt[0]) and r[1].search(mt[1]):
                break
        else:
            raise PermissionError(_("Mime-type not allowed"))
        for r in self._denied_re:
            if r[0].search(mt[0]) and r[1].search(mt[1]):
                raise PermissionError(_("Mime-type not allowed"))
        return True

    def quota(self, key):
        n = self.dst_node
        v = None
        while n and v is None:
            if n.rc:
                v = n.rc.get(key, None)
            if v is None:
                n = n.__parent__ \
                    if n.__parent__ and isinstance(n.__parent__, FsNode) \
                    else None
        if v is None:
            raise KeyError("No quota setting '{}' found".format(key))
        return v

    @reify
    def force_revision(self):
        """If True, we enforce revising existing content, effectively denying
        updates."""
        return self.quota('force_revision')

    @reify
    def max_size(self):
        """Max file size in bytes. Cannot be switched off!"""
        return self.quota('max_size')

    @reify
    def max_total_size(self):
        """Max size in bytes of all stored items. Cannot be switched off."""
        return self.quota('max_total_size')

    @reify
    def max_total_items(self):
        """Max qty of items in the whole filesystem.  -1 to switch off."""
        return self.quota('max_total_items')

    @reify
    def allowed_mimes(self):
        """
        Iterable of allowed mime-types.

        A type specification may be a literal string (``text/plain``), a pattern
        (``image/*``) or a regular expression. (Patterns are internally
        converted to regular expressions.)
        """
        return self.quota('allowed_mimes')

    @reify
    def denied_mimes(self):
        """
        Iterable of denied mime-types.

        A type specification may be a literal string (``text/plain``), a pattern
        (``image/*``) or a regular expression. (Patterns are internally
        converted to regular expressions.)
        """
        return self.quota('denied_mimes')

    @reify
    def fs_total_size(self):
        return self.dst_node.fs_total_size

    @reify
    def fs_total_items(self):
        return self.dst_node.fs_total_items


class TikaPymMixin():

    def pym(self, fn):
        """
        Fetches a bundle of meta information about given file.

        Returned dict has these keys: ``content-type``, ``meta_json``,
        ``meta_xmp``, ``data_text``, ``data_html_head``, ``data_html_body``.

        Some keys such as ``meta_json`` may already contain a key
        ``content-type``. Still, we provide the top-level key ``content-type``,
         which is more accurate (and may differ from the others).

        :param fn: Filename.
        :return: Dict with meta info.
        """
        m = {}

        ct = self.detect(fn)

        s = self.meta(fn, 'json')
        m['meta_json'] = s if s else None

        s = self.meta(fn, 'xmp')
        m['meta_xmp'] = s if s else None

        s = self.tika(fn, 'html')
        if s:
            # Split head and body
            root = html.fromstring(s)
            # Our XML always has UTF-8
            m['data_html_head'] = html.tostring(root.head).decode('utf-8')
            m['data_html_body'] = html.tostring(root.body).decode('utf-8')
        else:
            m['data_html_head'] = None
            m['data_html_body'] = None

        s = self.tika(fn, 'text')
        m['data_text'] = s if s else None

        m['mime_type'] = ct
        return m


class TikaCli(TikaPymMixin):

    def __init__(self, tika_cmd='tika', encoding='utf-8'):
        """
        Communicate with TIKA via command-line.

        :param tika_cmd: Command to start the TIKA app. By default we assume
            you have created a shell wrapper named ``tika`` to start
            the appropriate jar. It must be in the path, e.g. in
            ``/usr/local/bin`` or ``~/bin``.

            E.g.:: bash

                #!/bin/sh

                java -jar /opt/tika/tika-app-1.7.jar "$@"

        :param encoding: Default UTF-8. Tells TIKA how to encode its output.
            Output read from the console is then decoded using this setting.
            Should match the encoding of the console (STDOUT).
        """
        self.tika_cmd = tika_cmd
        self.encoding = encoding

    def detect(self, fn):
        """
        Returns content-type.

        :param fn: Filename.
        :returns: The content-type.
        :rtype: string
        """
        switches = ['--detect']
        return self._run_cmd(fn, switches, decode=True)

    def rmeta(self, fn):
        """
        Returns recursive meta info about compound document.

        :param fn: Filename.
        :returns: List of dicts. Each dict has meta info about one of the
            compound documents. Key ``X-TIKA:content`` contains text document.
        :rtype: List of dicts
        """
        switches = ['--metadata', '--jsonRecursive']
        return self._run_cmd(fn, switches, decode=True)

    def unpack(self, fn, all_=False):
        raise NotImplementedError('Unpack not implemented for CLI')

    def meta(self, fn, type_='json'):
        """
        Returns meta info.
        :param fn: Filename.
        :param type_: 'json' or 'xmp'
        :return:
        """
        switches = ['--metadata']
        if type_ == 'xmp':
            switches.append('--xmp')
        else:
            switches.append('--json')
        return self._run_cmd(fn, switches, decode=True)

    def tika(self, fn, type_='text'):
        """
        Returns text or HTML of content.

        :param fn: Filename.
        :param type_: 'text', 'html'
        :return: HTML or text
        """
        switches = []
        if type_ == 'html':
            switches.append('--html')
        else:
            switches.append('--text')
        return self._run_cmd(fn, switches, decode=True)

    def _run_cmd(self, fn, switches, decode=True):
        a = [self.tika_cmd, '--encoding={}'.format(self.encoding)] + switches + [fn]
        try:
            s = subprocess.check_output(a, stderr=subprocess.STDOUT)
        except subprocess.CalledProcessError as exc:
            mlgg.error(exc.output.decode(self.encoding))
            raise
        else:
            s = s.strip()
            return s.decode(self.encoding) if decode else s


class TikaServer(TikaPymMixin):

    TYPE_MAP = {
        'text': {'accept': 'text/plain'},
        'html': {'accept': 'text/html'},
        'json': {'accept': 'application/json'},
        'xmp': {'accept': 'application/rdf+xml'},
        'csv': {'accept': 'text/csv'},
    }

    def __init__(self, host='localhost', port=9998):
        self.host = host
        self.port = port
        self.url = 'http://{}:{}'.format(host, port)

    def detect(self, fn):
        """
        Returns accurate content-type.

        :param fn: Filename.
        :returns: The content-type.
        :rtype: string
        """
        hh = {}
        url = self.url + '/detect/stream'
        r = self._send(url, fn, hh)
        return r.text

    def rmeta(self, fn):
        """
        Returns recursive meta info about compound document.

        :param fn: Filename.
        :returns: List of dicts. Each dict has meta info about one of the
            compound documents. Key ``X-TIKA:content`` contains text document.
        :rtype: List of dicts
        """
        hh = {}
        url = self.url + '/rmeta'
        r = self._send(url, fn, hh)
        try:
            return r.json()
        except ValueError:
            return r.text

    def unpack(self, fn, all_=False):
        """
        Unpacks compound document and returns ZIP archive.

        :param fn: Filename
        :param all_: Get all compound documents.
        :return: File-like bytestream.
        """
        hh = {
            'content-type': 'application/zip'
        }
        url = self.url + '/unpack'
        if all_:
            url += '/all'
        r = self._send(url, fn, hh)
        return io.BytesIO(r.content) if r.content else None

    def meta(self, fn, type_='json'):
        """
        Returns meta info.
        :param fn: Filename.
        :param type_: 'csv', 'json' or 'xmp'
        :return:
        """
        if not type_:
            type_ = 'json'
        hh = self.__class__.TYPE_MAP[type_]
        url = self.url + '/meta'
        r = self._send(url, fn, hh)
        if type_ == 'json':
            try:
                return r.json()
            except ValueError:
                return r.text
        else:
            return r.text

    def tika(self, fn, type_='text'):
        """
        Returns text or HTML of content.

        :param fn: Filename.
        :param type_: 'text', 'html'
        :return: HTML or text
        """
        hh = self.__class__.TYPE_MAP[type_]
        url = self.url + '/tika'
        r = self._send(url, fn, hh)
        return r.text

    @staticmethod
    def _send(url, fn, hh):
        """
        PUTs given file to URL.

        Also sets header content-disposition.

        :param url: Destination URL.
        :param fn: Filename
        :param hh: Dict of HTTP headers.
        :return: `request.Response`
        """
        hh['content-disposition'] = 'attachment; filename={}'.format(fn)
        with open(fn, 'rb') as fh:
            return requests.put(url, data=fh, headers=hh)


def guess_mime_type(fn,
        magic_inst=magic.Magic(mime=True, mime_encoding=True, keep_going=True)):
    """
    Guesses mime-type from filename.

    Uses Python's lib ``mimetypes`` first, if no type could be determined, falls
    back to ``python-magic``.

    Returned encoding might be None.

    :param fn: Filename.
    :param magic_inst: Instance of :class:`magic.Magic`. Should be created with
        mime=True, mime_encoding=True, keep_going=True.
    :return: Tuple(mime_type, encoding).
    """
    # Try Python's native lib first
    mt, enc = mimetypes.guess_type(fn)
    # It may not find all types, e.g. it returns None for 'text/plain', so
    # fallback on python-magic.
    if not mt:
        mt = magic_inst.from_file(fn).decode('ASCII')
    if not enc:
        enc = None
    return mt, enc


class UploadCache():

    def __init__(self, root_dir='/tmp/upload_cache'):
        """
        Class to manage a cache for uploaded files.

        :param root_dir: Root directory for the cache, default '/tmp'. As a
            precaution, ``root_dir`` must be '/tmp' or have at least 3 elements,
            like '/home/professor_xavier/foo'.
        """
        self.check_path(root_dir)
        self._root_dir = root_dir
        """Root directory for the cache"""
        os.makedirs(self.root_dir, exist_ok=True)

        self.timeout = 60 * 60 * 24  # 1 day
        """Files older than this are purged from cache [seconds]"""
        self.chunk_size = 8 * 8192
        """Chunk size for copy operations"""
        magic_inst = magic.Magic(mime=True, mime_encoding=True, keep_going=True)
        """Instance of :class:magic.Magic"""

        self._files = []

    @staticmethod
    def check_path(path):
        """
        Path must have at least 3 parts, e.g. '/home/dm/foo' or
        start with '/tmp'.

        :raises ValueError: if path is not safe or does not meet above criteria.
        """
        pym.security.is_path_safe(path)
        pp = path.split(os.path.sep)
        if path[0] != 'tmp' and len(pp) < 3:
            raise ValueError("Path in cache must either start with '/tmp' or"
                " have at least 3 segments: '{}'".format(path))

    def build_path(self, fn, check=True):
        """
        Builds absolute filename for cached file and ensures, path exists.

        :param fn: Name of cached file relative to ``root_dir``.
        :param check: Check if file exists and create local path if necessary.
        :returns: Absolute file name.
        :raises FileExistsError: If cache already has a file with this name.
        """
        p = os.path.join(self._root_dir, fn)
        self.check_path(p)
        p = os.path.sep + p
        if check:
            if os.path.exists(p):
                raise FileExistsError("Cache file exists", p)
            # Ensure, path for this file exists
            d = os.path.dirname(p)
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=False)
        return p

    def create_file(self, fh=None, cache_filename=None):
        """
        Factory for :class:`UploadedFile`.

        Does not store uploaded file in cache yet, just creates instance and
        determines some meta data. Call :meth:`save` to save file in cache.

        Determined meta data as attributes available in the created instance is:

        - client_filename
        - client_meta_data
        - size, as read from buffer ``_fh``

        :param fh: A file-like object as created by ``cgi.fieldStorage``.
        :param cache_filename: Save file with this name in cache. If None, we
            use a UUID. Original name is available as attribute
            ``client_filename`` of created instance. This name must be only the
            base name, hence must not contain path sep chars.
        """
        if os.path.sep in cache_filename:
            raise ValueError("Cache filename must only be a basename without "
                "directories: '{}'".format(cache_filename))
        if not cache_filename:
            cache_filename = str(uuid.uuid4())  # .replace('-', os.path.sep)
        u = UploadedFile()
        u.attach_to_cache(cache=self, fh=fh, cache_filename=cache_filename)
        self._files.append(u)
        return u

    def save(self, lgg, overwrite=False):
        """
        Saves uploaded data in cache.

        Two files are created: 1 for the data, 2 with ext '.yaml' with metadata.

        :param lgg: Instance of logger
        :param overwrite: Whether an existing file in cache my be overwritten or
            not.
        """
        for f in self.files:
            # Do not save if check denied this file
            if not f.is_ok:
                continue
            try:
                fn = self.build_path(f.cache_filename, check=True)
            except FileExistsError as exc:
                if overwrite:
                    fn = exc.args[1]
                else:
                    lgg.exception(exc)
                    f.exc = exc
                    continue
            # 1. Save content
            fh = open(fn, 'wb')
            try:
                fcntl.flock(fh, fcntl.LOCK_EX)
                f.save_content(fh)
            except OSError as exc:
                lgg.exception(exc)
                f.exc = exc
                continue
            finally:
                fh.close()
            # 2. Save meta incl. xattr
            fn += '.yaml'
            fh = open(fn, 'wt', encoding='utf-8')
            try:
                fcntl.flock(fh, fcntl.LOCK_EX)
                f.save_meta(fh)
            except OSError as exc:
                lgg.exception(exc)
                f.exc = exc
            finally:
                fh.close()

    def read(self, fn, size=-1):
        """
        Reads the file and returns content as bytes.

        :param fn: Filename
        :param size: Size on bytes to read, if -1 reads all.
        :return: bytes
        """
        fn_data = self.build_path(fn)
        with open(fn_data, 'rb') as fh:
            return fh.read(size)

    def open(self, fn):
        """
        Returns settings and an opened file handle

        DO NOT FORGET TO CLOSE THE FILE HANDLE AFTER USE!

        :param fn: Filename
        :return: 2-tuple: (file handle, meta data)
        """
        fn_data = self.build_path(fn)
        fn_rc = fn_data + '.yaml'
        with open(fn_rc, 'rt', encoding='utf-8') as fh:
            rc = yaml.load(fh)
        fh = open(fn_data, 'rb')
        return fh, rc

    def delete(self, fn):
        """
        Deletes this file from cache, incl. metadata file.

        :param fn: Filename, relative to our root directory.
        """
        fn_data = self.build_path(fn)
        fn_rc = fn_data + '.yaml'
        if os.path.exists(fn_data):
            os.remove(fn_data)
        if os.path.exists(fn_rc):
            os.remove(fn_rc)

    def purge(self, timeout=None):
        """
        Deletes all files from cache older than ``timeout`` in seconds.

        :param timeout: Timeout in seconds. This overrides the instance setting.
        """
        if not timeout:
            timeout = self.timeout
        rp = PurePath(self.root_dir)
        threshold = time.time() - timeout
        for root, dirs, files in os.walk(self.root_dir):
            for f in files:
                # absolute path
                fn = PurePath(root, f)
                if fn.name.endswith('.yaml'):
                    continue
                # make path relative to cache root, because we call delete()
                # which prepends root again.
                if os.path.getctime(str(fn)) < threshold:
                    self.delete(str(fn.relative_to(rp)))

    @property
    def root_dir(self):
        """Root directory of cache."""
        return self._root_dir

    @property
    def files(self):
        """List of file instances"""
        return self._files


class UploadedFile():

    def __init__(self):
        """
        Instance of an uploaded file.

        Its primary purpose is to store the file's meta data and validation
        states.

        We use it in 2 stages:

        1. During validation of the file's meta data as sent by the client
           and during validation of the permissions.

           This stage only needs an instance of ``UploadedFile`` that is
           initialized by the file's meta data. It does not need to be attached
           to an upload cache and an file handle to the sent payload.

           Call :meth:`init_by_client_meta`.

        2. Attached to an upload cache during saving the payload to the cache
           and during validation of the cached file's meta data. Usually only in
           this stage we actually create a file on the server.

           Call :meth:`attach_to_cache`.
        """

        self._cache = None
        self._fh = None

        self._buffer_size = None

        self._client_filename = None
        self._client_size = None
        self._client_mime_type = None
        self._client_encoding = None

        self._cache_filename = None
        self._cache_size = None
        self._cache_mime_type = None
        self._cache_encoding = None

        self._exc = None

        self._exists = False
        self._dst_node = None
        self._sentry = None

        self._can_create = False
        self._can_update = False
        self._can_revise = False

        self._validation_msg = None
        self._key = None

    def init_by_client_meta(self, meta):
        """
        Initialises by setting meta data.

        :param meta: Meta data as provided by client. Must have keys 'filename',
            'size', 'mime_type'. Key 'encoding' is optional.
        """
        self._client_filename = meta['filename']
        self._client_size = meta['size']
        self._client_mime_type = meta['mime_type']
        self._client_encoding = meta.get('encoding', None)

    def attach_to_cache(self, cache, fh, cache_filename):
        self._cache = cache
        self._fh = fh
        self._cache_filename = cache_filename

    def allow_create(self):
        self._can_create = True

    def allow_update(self):
        self._can_update = True

    def allow_revise(self):
        self._can_revise = True

    def save_content(self, fout):
        """
        Saves content to given file handle.

        We must be attached to an upload cache to use this!

        :param fout: File handle. Caller should have opened file as binary for
            writing.
        """
        while True:
            data = self._fh.file.read(self._cache.chunk_size)
            if not data:
                break
            fout.write(data)

    def save_meta(self, fout):
        """
        Saves meta data as YAML in given file handle.

        We must be attached to an upload cache to use this!

        :param fout: File handle. Caller should have opened file as text with
            encoding 'utf-8' for writing.
        """
        d = {
            'client_meta': self.get_client_meta(),
            'cache_meta': self.get_cache_meta()
        }
        pym.lib.dump_yaml(d, fout)

    def get_client_meta(self):
        """
        Returns dict of meta data as provided by client.

        Keys are 'filename', 'size', 'mime_type' and 'encoding'.
        """
        return {
            'filename': self.client_filename,
            'size': self.client_size,
            'mime_type': self.client_mime_type,
            'encoding': self.client_encoding
        }

    def get_cache_meta(self):
        """
        Returns dict of meta data as locally determined from cached file.

        Keys are 'filename', 'size', 'mime_type' and 'encoding'.
        """
        return {
            'filename': self.cache_filename,
            'size': self.cache_size,
            'mime_type': self.cache_mime_type,
            'encoding': self.cache_encoding
        }

    def get_permissions(self):
        return {
            WriteModes.create.value: self.can_create,
            WriteModes.update.value: self.can_update,
            WriteModes.revise.value: self.can_revise
        }

    @property
    def cache(self):
        """
        Instance of an upload cache to which this file is attached.

        Use :meth:`attach_to_cache`` to set.
        """
        return self._cache

    @property
    def fh(self):
        """
        Handle to a file-like object as provided by ``fieldStorage``.

        Use :meth:`attach_to_cache`` to set.
        """
        return self._cache

    @property
    def buffer_size(self):
        """Size in bytes of data in upload buffer ``fh``"""
        if not self._buffer_size:
            self._fh.file.seek(0, 2)  # Seek to the end of the file
            self._buffer_size = self._fh.file.tell()  # Get the position of EOF
            self._fh.file.seek(0)  # Reset the file position to the beginning
        return self._buffer_size

    @property
    def client_filename(self):
        """
        Filename as given by client.

        It is set by either :meth:`init_by_client_meta``, or by providing an
        upload buffer by :meth:`attach_to_cache`.
        """
        return self._client_filename

    @property
    def client_size(self):
        """
        Size in bytes as given by client.

        It is set by either :meth:`init_by_client_meta``, or by providing an
        upload buffer by :meth:`attach_to_cache`. (In the latter case
        ``client_size`` is identical to ``buffer_size``.)
        """
        if self._fh:
            return self.buffer_size
        return self._client_size

    @property
    def client_mime_type(self):
        """
        Mime-type as given by client.

        It is set by either :meth:`init_by_client_meta``, or by providing an
        upload buffer by :meth:`attach_to_cache`.
        """
        return self._client_mime_type

    @property
    def client_encoding(self):
        """
        Content encoding as given by client.

        Afaik no clients report this, so we always return None.
        """
        return self._client_encoding

    @property
    def cache_filename(self):
        """Filename used locally in cache"""
        return self._cache_filename

    @property
    def cache_size(self):
        """Size in bytes as locally determined from cached file."""
        return self._client_size

    @property
    def cache_mime_type(self):
        """Mime-type as locally determined from cached file."""
        if not self._cache_mime_type:
            fn = self.cache.build_path(self._cache_filename)
            self._cache_mime_type, self._cache_encoding \
                = guess_mime_type(fn, self.cache.magic_inst)
        return self._cache_mime_type

    @property
    def cache_encoding(self):
        """Content encoding as locally determined from cached file."""
        return self._cache_encoding

    @property
    def is_ok(self):
        """Is True, if checks did not produce an exception. False otherwise."""
        return self._exc is None

    @property
    def exc(self):
        """Exception produced by checks or None."""
        return self._exc

    @exc.setter
    def exc(self, v):
        self._exc = v

    @property
    def can_create(self):
        """True, if we are permitted to create file as a new child node."""
        return self._can_create

    @property
    def can_update(self):
        """True, if we are permitted to update existing node. If False, we still
        may be permitted to revise."""
        return self._can_create

    @property
    def can_revise(self):
        """True, if we are permitted to revise existing node. If False, we do
        not have permission to save the node at all."""
        return self._can_revise

    @property
    def validation_msg(self):
        """Message, if a validation check failed."""
        return self._validation_msg

    @validation_msg.setter
    def validation_msg(self, v):
        self._validation_msg = v

    @property
    def key(self):
        """Client uses this key to uniquely identify the file."""
        return self._key

    @key.setter
    def key(self, v):
        self._key = v