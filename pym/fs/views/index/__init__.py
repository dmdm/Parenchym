import logging
import functools
import os
from pyramid.httpexceptions import HTTPNotFound, HTTPForbidden
from pyramid.location import lineage

from pyramid.view import view_config, view_defaults
import pyramid.response
from pym.cache import UploadCache
from pym.lib import json_serializer
from ...models import IFsNode, FsNode
import pym.exc
import pym.fs.manager
import pym.security
import pym.validator
from pym.i18n import _
from pym.auth.models import Permissions
from pym.models import DbSession, dictate_iter


class Validator(pym.validator.Validator):

    def __init__(self, inp, fs_root):
        super().__init__(inp)
        self.fs_root = fs_root

    @property
    def cur_node(self):
        v = self.fetch('path', required=True, multiple=False)
        pp = v.split('/')
        n = self.fs_root
        for i, p in enumerate(pp):
            if i == 0:
                if n.name != p:
                    raise pym.exc.ValidationError(
                        "Wrong root node in path: '{}".format(p))
            else:
                try:
                    n = n[p]
                except KeyError:
                    raise pym.exc.ValidationError(
                        "Unknown node in path: '{}".format(p))
        return n

    @property
    def ids(self):
        v = self.fetch_int('ids', required=True, multiple=True)
        return v

    @property
    def names(self):
        v = self.fetch('names', required=True, multiple=True)
        return v

    @property
    def name(self):
        v = self.fetch('name', required=True, multiple=False)
        return pym.security.safepath(v, split=False)


class Worker(object):

    def __init__(self, lgg, sess, owner_id, cache, has_permission):
        self.lgg = lgg
        self.sess = sess
        self.owner_id = owner_id
        self.cache = cache
        self.has_permission = has_permission
        self.fc_col_map = {
        }

    @staticmethod
    def init_upload_cache(root_dir='/tmp/upload_cache'):
        cache = UploadCache(root_dir=root_dir)
        return cache

    def del_cached_children(self, parent_id):
        for k in self.cache.keys("ResourceNode:children:*{}".format(parent_id)):
            self.cache.delete(k)

    def upload(self, resp, cur_node, data, overwrite):
        upload_cache = self.__class__.init_upload_cache()
        upload_cache.fs_node = cur_node

        # Create instances of UploadedFile which also checks if we accept it or
        # not.
        for name, fieldStorage in data.items():
            if not (hasattr(fieldStorage, 'file') and fieldStorage.file):
                continue
            upload_cache.create_file(fieldStorage)

        # Save uploaded data only if needed. To just store it in the DB, it is
        # not needed. On the other hand we need a real file if we want to
        # extract xattr e.g. with TIKA. This should explicitly be requested by
        # client.
        # self.cache.save(self.lgg, resp)

        actor = self.owner_id
        # Store the uploaded data in DB
        for c in upload_cache.files:
            if not c.is_ok:
                resp.error("{}: {}".format(c.client_filename, c.exc))
                continue

            name = c.client_filename
            # Shall we trust the mime-type the client told us, or use the one we
            # determined our own?
            # At least in case of a JSON file, our detection says wrongly
            # 'text/plain', but the client told correctly 'application/json'
            # mime = c.local_mime_type
            mime = c.client_mime_type

            try:
                child_fs_node = cur_node[name]
            except KeyError:
                child_fs_node = pym.fs.manager.create_fs_node(
                    self.sess,
                    owner=actor,
                    parent_id=cur_node.id,
                    name=name
                )
            else:
                if overwrite:
                    # Need write permission on child to overwrite
                    if not self.has_permission(Permissions.write.value,
                            context=child_fs_node):
                        resp.error(_("Forbidden to overwrite '{}'").format(name))
                        continue
                    child_fs_node = pym.fs.manager.update_fs_node(
                        self.sess,
                        fs_node=child_fs_node,
                        editor=actor
                    )
                else:
                    resp.warn(_('{} already exists').format(name))
                    continue
            child_fs_node.mime_type = mime
            child_fs_node.local_filename = c.local_filename
            child_fs_node.size = c.meta['size']
            child_fs_node.xattr = c.meta.get('xattr')
            # Read data directly from fieldStorage, we might have no physically
            # cached file.
            attr = child_fs_node.content_attr
            if attr == 'content_bin':
                setattr(child_fs_node, attr, c.f.file.read())
            else:
                setattr(child_fs_node, attr, c.f.file.read().decode('UTF-8'))
            for k in ('content_bin', 'content_text', 'content_json'):
                if k != attr:
                    setattr(child_fs_node, k, None)

            self.del_cached_children(cur_node.id)

    def ls(self, resp, cur_node):
        if not self.has_permission(Permissions.read.value, context=cur_node):
            resp.error("Forbidden to list")
            return
        rs = self.sess.query(FsNode).filter(FsNode.parent_id == cur_node.id)
        excl = ('content_bin', 'content_text', 'content_json', '_slug',
                '_title', '_short_title')
        resp.data = {'rows': dictate_iter(rs, excludes=excl)}

    def rm(self, resp, cur_node, names):
        for n in names:
            this_node = cur_node[n]
            if not self.has_permission(Permissions.delete.value, context=this_node):
                resp.error(_("Forbidden to delete '{}'").format(n))
                continue
            pym.fs.manager.delete_fs_node(
                self.sess,
                fs_node=this_node,
                deleter=self.owner_id,
                delete_from_db=True
            )
        # remove cache keys for children of cur_node
        self.del_cached_children(cur_node.id)

    def create_directory(self, resp, cur_node, name):
        if not self.has_permission(Permissions.write.value, context=cur_node):
            resp.error(_("Forbidden to create directory '{}'").format(name))
            return
        try:
            pym.fs.manager.create_fs_node(
                self.sess,
                owner=self.owner_id,
                parent_id=cur_node.id,
                name=name,
                mime_type=FsNode.MIME_TYPE_DIRECTORY
            )
        except pym.exc.ItemExistsError:
            resp.error(_("Directory '{}' already exists").format(name))
        # remove cache keys for children of cur_node
        self.del_cached_children(cur_node.id)


@view_defaults(
    context=IFsNode,
    # We can call any Fs method as long as we have read permission.
    # Whether we are allowed to execute that method on a particular file depends
    # on the permission we have for that file.
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
        self.fs_root = [x for x in lineage(context) if isinstance(x, FsNode)][-1]

        self.tr = self.request.localizer.translate
        self.sess = DbSession()
        self.validator = Validator(request.GET, fs_root=self.fs_root)
        self.worker = Worker(
            lgg=self.lgg,
            sess=self.sess,
            owner_id=request.user.uid,
            cache=request.redis,
            has_permission=request.has_permission
        )

        self.urls = dict(
            index=request.resource_url(context),
            upload=request.resource_url(context, '@@_ul_'),
            ls=request.resource_url(context, '@@_ls_'),
            rm=request.resource_url(context, '@@_rm_'),
            create_directory=request.resource_url(context, '@@_crd_'),
        )

    @view_config(
        name='',
        request_method='GET'
    )
    def index(self):
        disposition = self.request.GET.get('disposition', 'inline')
        n = self.context
        if n.size < 1:
            return HTTPNotFound(n.name)
        response = pyramid.response.Response(
            content_type=n.mime_type,
            content_length=n.size,
            content_disposition=disposition + '; filename=' + n.name
        )
        if isinstance(n.content, str):
            response.text = n.content
        else:
            response.body = n.content
        return response

    @view_config(
        name='dl',
        request_method='GET'
    )
    def download(self):
        return self.index()

    @view_config(
        name='_br_',
        renderer='browse.mako',
        request_method='GET'
    )
    def browse(self):
        path = list(reversed([(x.id, x.name) for x in lineage(self.context)
            if isinstance(x, FsNode)]))
        rc = {}
        node_rc = self.context.rc
        for k in FsNode.RC_KEYS_QUOTA:
            rc[k] = node_rc[k]
        rc['urls'] = self.urls
        rc['path'] = path
        return {
            'rc': rc
        }

    @view_config(
        name='_ul_',
        renderer='string',
        request_method='POST'
    )
    def upload(self):
        data = self.request.POST
        self.validator.inp = data
        overwrite = data.get('overwrite', False)
        keys = ('cur_node', )
        func = functools.partial(
            self.worker.upload,
            data=data,
            overwrite=overwrite
        )
        resp = pym.resp.build_json_response(
            lgg=self.lgg,
            validator=self.validator,
            keys=keys,
            func=func,
            request=self.request,
            die_on_error=False
        )
        return json_serializer(resp.resp)

    @view_config(
        name='_ls_',
        renderer='string',
        request_method='GET'
    )
    def ls(self):
        keys = ('cur_node', )
        func = functools.partial(
            self.worker.ls
        )
        resp = pym.resp.build_json_response(
            lgg=self.lgg,
            validator=self.validator,
            keys=keys,
            func=func,
            request=self.request,
            die_on_error=False
        )
        return json_serializer(resp.resp)

    @view_config(
        name='_rm_',
        renderer='string',
        request_method='DELETE'
    )
    def rm(self):
        keys = ('cur_node', 'names')
        func = functools.partial(
            self.worker.rm
        )
        resp = pym.resp.build_json_response(
            lgg=self.lgg,
            validator=self.validator,
            keys=keys,
            func=func,
            request=self.request,
            die_on_error=False
        )
        return json_serializer(resp.resp)

    @view_config(
        name='_crd_',
        renderer='string',
        request_method='POST'
    )
    def create_directory(self):
        self.validator.inp = self.request.json_body
        keys = ('cur_node', 'name')
        func = functools.partial(
            self.worker.create_directory
        )
        resp = pym.resp.build_json_response(
            lgg=self.lgg,
            validator=self.validator,
            keys=keys,
            func=func,
            request=self.request,
            die_on_error=False
        )
        return json_serializer(resp.resp)