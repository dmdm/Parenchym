import logging
import functools
from pyramid.httpexceptions import HTTPNotFound
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


class Worker(object):

    def __init__(self, lgg, sess, owner_id, cache, upload_cache=None):
        self.lgg = lgg
        self.sess = sess
        self.owner_id = owner_id
        self.cache = cache
        self.upload_cache = upload_cache
        self.fc_col_map = {
        }

    @staticmethod
    def init_upload_cache(root_dir='/tmp/upload_cache'):
        cache = UploadCache(root_dir=root_dir)
        cache.allow = '*/*'
        return cache

    def del_cached_children(self, parent_id):
        for k in self.cache.keys("ResourceNode:children:*{}".format(parent_id)):
            self.cache.delete(k)

    def upload(self, resp, cur_node, data, overwrite):
        if not self.upload_cache:
            self.upload_cache = self.__class__.init_upload_cache()
        self.upload_cache.fs_node = cur_node

        # Create instances of UploadedFile which also checks if we accept it or
        # not.
        for name, fieldStorage in data.items():
            if not (hasattr(fieldStorage, 'file') and fieldStorage.file):
                continue
            self.upload_cache.create_file(fieldStorage)

        # Save uploaded data only if needed. To just store it in the DB, it is
        # not needed. On the other hand we need a real file if we want to
        # extract xattr e.g. with TIKA. This should explicitly be requested by
        # client.
        # self.cache.save(self.lgg, resp)

        # Load names of existing children
        existing = {k: v for k, v in cur_node.children.items()}

        actor = self.owner_id
        # Store the uploaded data in DB
        for c in self.upload_cache.files:
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
            id_ = existing.get(name)

            if id_:
                if overwrite:
                    # TODO only if we have 'delete' permission or are owner or wheel
                    child_fs_node = pym.fs.manager.update_fs_node(
                        self.sess,
                        fs_node=id_,
                        editor=actor
                    )
                else:
                    resp.warn('{} already exists'.format(name))
                    continue
            else:
                child_fs_node = pym.fs.manager.create_fs_node(
                    self.sess,
                    owner=actor,
                    parent_id=cur_node.id,
                    name=name
                )
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
        rs = self.sess.query(FsNode).filter(FsNode.parent_id == cur_node.id)
        excl = ('content_bin', 'content_text', 'content_json', '_slug',
                '_title', '_short_title')
        resp.data = {'rows': dictate_iter(rs, excludes=excl)}

    def rm(self, resp, cur_node, names):
        for n in names:
            print('deleting', n)
        # remove cache keys for children of cur_node
        self.del_cached_children(cur_node.id)


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
        self.fs_root = [x for x in lineage(context) if isinstance(x, FsNode)][-1]

        self.tr = self.request.localizer.translate
        self.sess = DbSession()
        self.validator = Validator(request.GET, fs_root=self.fs_root)
        self.worker = Worker(
            lgg=self.lgg,
            sess=self.sess,
            owner_id=request.user.uid,
            cache=request.redis,
        )

        self.urls = dict(
            index=request.resource_url(context),
            upload=request.resource_url(context, '@@_ul_'),
            ls=request.resource_url(context, '@@_ls_'),
            rm=request.resource_url(context, '@@_rm_'),
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
        rc['urls'] = self.urls,
        rc['path'] = path,
        return {
            'rc': rc,
        }

    @view_config(
        name='_ul_',
        renderer='string',
        request_method='POST'
    )
    def upload(self):
        data = self.request.param,
        overwrite = data.get('overwrite', False)
        if overwrite:
            # TODO Check if we have permission 'delete', are owner or wheel. If so, allow overwrite, else set overwrite=False
            pass
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

        # resp = pym.resp.JsonResp()
        # # TODO determine parent ID from requested path
        # parent_id = self.context.id
        # rs = self.sess.query(FsNode).filter(FsNode.parent_id == parent_id)
        # excl = ('content_bin', 'content_text', 'content_json', '_slug',
        #         '_title', '_short_title')
        # resp.data = {'rows': dictate_iter(rs, excludes=excl)}
        # return json_serializer(resp.resp)

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
