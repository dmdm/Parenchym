import json
import logging
import os
import re
import shutil
import uuid
import fcntl
import magic
from pyramid.view import view_config, view_defaults
import pyramid.i18n
import yaml
from pym.lib import json_serializer
from ...models import IFsNode
import pym.i18n
import pym.exc
from pym.auth.models import Permissions
from pym.models import DbSession
from pprint import pprint


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


class UploadCache():

    def __init__(self):
        self.root_dir = '/tmp/upload_cache'
        os.makedirs(self.root_dir, exist_ok=True)

        self.min_size = 1
        self.max_size = 1024 * 1024 * 2
        self.magic = magic.Magic(mime=True, mime_encoding=True)
        self._allow = ['image/*', 'application/pdf']
        self._allow_pat = []
        self._deny = []
        self._deny_pat = []

        self._files = []
        self.init_mime_pattern()

    def init_mime_pattern(self):
        pp = []
        for pat in self._allow:
            if '*' in pat and '.*' not in pat:
                pat = pat.replace('*', '.*')
            pat = pat.split('/')
            pp.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
        self._allow_pat = pp
        pp = []
        for pat in self._deny:
            if '*' in pat and '.*' not in pat:
                pat = pat.replace('*', '.*')
            pat = pat.split('/')
            pp.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
        self._deny_pat = pp

    def create_file(self, f, local_filename=None):
        if not local_filename:
            local_filename = str(uuid.uuid4()).replace('-', os.path.sep)
        self._files.append(UploadedFile(self, f, local_filename))

    def save(self, lgg, resp):
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

    @property
    def allow(self):
        return self._allow

    @allow.setter
    def allow(self, v):
        self._allow = v
        self.init_mime_pattern()

    @property
    def allow_pat(self):
        return self._allow_pat

    @property
    def deny(self):
        return self._deny

    @deny.setter
    def deny(self, v):
        self._deny = v
        self.init_mime_pattern()

    @property
    def deny_pat(self):
        return self._deny_pat

    @property
    def files(self):
        return self._files


class UploadedFile():

    def __init__(self, cache, f, local_filename):
        self.cache = cache
        self.f = f
        self._local_filename = local_filename

        self._size = None
        self._local_mime_type = None
        self._exc = None

        self.check()

    def check(self):
        try:
            self.check_mime_type()
            self.check_size()
            return True
        except pym.exc.UploadDeniedError as exc:
            self._exc = exc
        return False

    def check_mime_type(self):
        good = False
        ty = self.local_mime_type

        pat = self.cache.allow_pat
        for p in pat:
            if p[0].search(ty) and p[1].search(ty):
                good = True
                break
        if not good:
            raise pym.exc.UploadDeniedError("Mime-type not allowed: '{}'".format(ty))

        pat = self.cache.deny_pat
        for p in pat:
            if p[0].search(ty) or p[1].search(ty):
                good = False
                break
        if not good:
            raise pym.exc.UploadDeniedError("Mime-type denied: '{}'".format(ty))
        return True

    def check_size(self):
        return self.cache.min_size <= self.size <= self.cache.max_size

    def save_content(self, fout):
        while True:
            data = self.f.file.read(8192)
            if not data:
                break
            fout.write(data)

    def save_meta(self, fout):
        if not self.is_ok:
            raise self._exc
        yaml.dump(self.meta, fout)

    @property
    def is_ok(self):
        return self._exc is None

    @property
    def exc(self):
        return self._exc

    @property
    def meta(self):
        return {
            'size': self.size,
            'client_filename': self.client_filename,
            'client_mime_type': self.client_mime_type,
            'local_mime_type': self.local_mime_type,
        }

    @property
    def size(self):
        if not self._size:
            self.f.file.seek(0, 2)  # Seek to the end of the file
            self._size = self.f.file.tell()  # Get the position of EOF
            self.f.file.seek(0)  # Reset the file position to the beginning
        return self._size

    @property
    def client_filename(self):
        return self.f.filename

    @property
    def local_filename(self):
        return self._local_filename

    @property
    def client_mime_type(self):
        return self.f.type

    @property
    def local_mime_type(self):
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
        View 'me' (personal pages).
        """
        self.context = context
        self.request = request
        self.sess = DbSession()
        self.lgg = logging.getLogger(__name__)

        self.cache = UploadCache()

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
