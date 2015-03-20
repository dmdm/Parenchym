import logging
import functools
from pprint import pprint
import random
import tempfile

from pyramid.location import lineage
import sqlalchemy as sa
import sqlalchemy.orm
from pyramid.view import view_config, view_defaults
import pyramid.response

from pym.fs.tools import Sentry, UploadCache, UploadedFile, Uploader
from pym.lib import json_serializer
from ...models import IFsNode, FsNode, WriteModes
from ...const import MIME_TYPE_DIRECTORY
import pym.exc
import pym.fs.manager
import pym.security
import pym.validator
from pym.i18n import _
from pym.auth.models import Permissions
from pym.models import DbSession, dictate_iter, dictate


class Validator(pym.validator.Validator):

    def __init__(self, inp, fs_root):
        super().__init__(inp)
        self.fs_root = fs_root

    @property
    def path(self):
        p = self.fetch('path', required=True, multiple=False)
        return pym.security.safepath(p)

    @property
    def write_mode(self):
        v = self.fetch('write_mode', required=True, multiple=False)
        try:
            x = WriteModes.by_val(v)
        except KeyError:
            raise pym.exc.ValidationError("Invalid write mode: '{}".format(v))
        return v

    @property
    def key(self):
        return self.fetch('key', required=True, multiple=False)

    @property
    def size(self):
        return self.fetch_int('size', required=True, multiple=False)

    @property
    def ids(self):
        v = self.fetch_int('ids', required=True, multiple=True)
        return v

    @property
    def names(self):
        if hasattr(self.inp, 'getall'):
            # from multidict
            v = self.fetch('names', required=True, multiple=True)
        else:
            # from json_body, that is a regular dict
            v = self.fetch('names', required=True, multiple=False)
        return v

    @property
    def name(self):
        v = self.fetch('name', required=True, multiple=False)
        return pym.security.safepath(v, split=False)

    @property
    def reason(self):
        v = self.fetch('reason', required=True, multiple=False)
        return v

    @property
    def fil(self):
        v = self.fetch('filter', required=True, multiple=False)
        if v not in ('dirs', 'all'):
            raise pym.exc.ValidationError("Invalid filter: '{}".format(v))
        return v

    @property
    def include_deleted(self):
        return self.fetch_bool('incdel', required=True, multiple=False)

    @property
    def files(self):
        return self.fetch('files', required=True, multiple=False)


class Worker(object):

    def __init__(self, lgg, sess, owner_id, cache, has_permission, fs_root,
            cache_root_dir='/tmp/pym/upload_cache'):
        self.lgg = lgg
        self.sess = sess
        self.owner_id = owner_id
        self.cache = cache
        self.has_permission = has_permission
        self.fs_root = fs_root
        self.cache_root_dir = cache_root_dir

        self.fc_col_map = {}

    def del_cached_children(self, parent_id):
        for k in self.cache.keys("ResourceNode:children:*{}".format(parent_id)):
            self.cache.delete(k)

    def OLD_validate_files(self, resp, path, files, request):
        """
        Validates the given files using their meta data and checks permissions.

        :param resp: Response
        :type resp: :class:`pym.resp.JsonResp`
        :param path: String that identifies path to destination node.
        :param files: Files are given as a list of dicts with meta data. Keys
            'filename', 'size', 'mime_type', optionally key 'encoding'.
        :param request:
        :return: Returns a list of initialised instances of
            :class:`pym.cache.UploadedFile`.
        """
        u_files = []
        # Use path to find destination node. We may change that later on, in
        # case the provided file names already have existing nodes. Then those
        # will become destinations.
        path_node = self.fs_root.find_by_path(path)
        path_sentry = Sentry(path_node)

        # 1. stage checks info provided by client
        for f in files:
            uf = UploadedFile()
            u_files.append(uf)
            uf.key = f['key']
            meta = {
                'filename': f['filename'],
                'size': f['size'],
                'mime_type': f['mime_type'],
            }
            uf.init_by_client_meta(meta)
            try:
                path_sentry.check_file_meta(meta)
            # ValueError if name is not safe, PermissionError in all other cases
            except (PermissionError, ValueError) as exc:
                uf.exc = exc
                uf.validation_msg = str(exc)

        # 1.5 Interlude: setup destination node and corresponding sentry
        for uf in u_files:
            if not uf.is_ok:
                continue
            try:
                file_node = path_node[uf.client_filename]
            except KeyError:
                # File does not yet exist
                file_node = None
                uf.exists = False
                uf.dst_node = path_node
                uf.sentry = path_sentry
            else:
                # File does exist.
                uf.exists = True
                uf.dst_node = file_node
                uf.sentry = Sentry(file_node)

        # 2. stage checks destination's permissions
        for uf in u_files:
            if not uf.is_ok:
                continue
            if not uf.exists:
                # Dst does not exist, so we ask for "create".
                try:
                    uf.sentry.check_permission(request, WriteModes.create)
                    uf.allow_create()
                except PermissionError as exc:
                    uf.exc = exc
                    uf.validation_msg = str(exc)
            else:
                # Dst exists, check both, "update" and "revise"
                e1, e2 = None, None
                try:
                    uf.sentry.check_permission(request, WriteModes.update)
                    uf.allow_update()
                except PermissionError as exc:
                    # Do not set exception to uf, we still may be allowed to
                    # revise...
                    e1 = exc
                try:
                    uf.sentry.check_permission(request, WriteModes.revise)
                    uf.allow_revise()
                except PermissionError as exc:
                    e2 = exc
                # Aww, both permissions denied.
                if e1 and e2:
                    uf.validation_msg = _("Destination exists. Permission denied to update or revise.")
                    uf.exc = e2

        # Epilog: setup response
        rr = {}
        for uf in u_files:
            rr[uf.key] = {
                'ok': uf.is_ok,
                'exists': uf.exists,
                'permissions': uf.get_permissions(),
                'validation_msg': uf.validation_msg
            }
        resp.data = rr
        return u_files

    def validate_files(self, resp, path, files, request):
        """
        Validates the given files using their meta data and checks permissions.

        :param resp: Response
        :type resp: :class:`pym.resp.JsonResp`
        :param path: String that identifies path to destination node.
        :param files: Files are given as a list of dicts with meta data. Keys
            'filename', 'size', 'mime_type', optionally key 'encoding'.
        :param request:
        :return: Returns a list of initialised instances of
            :class:`pym.cache.UploadedFile`.
        """
        path_node = self.fs_root.find_by_path(path)
        uploader = Uploader(path_node, request)
        uploader.add_files(files)
        uploader.check_client_meta()
        uploader.check_permissions()
        resp.data = uploader.get_file_states()

    def upload(self, resp, key, path, size, file, write_mode, request, tika=None):
        files = []
        files.append({
            'key': key,
            'filename': file.filename,
            'size': size,
            'mime_type': file.type
        })

        path_node = self.fs_root.find_by_path(path)
        uploader = Uploader(path_node, request)
        uploader.add_files(files)
        uploader.check_client_meta()
        uploader.check_permissions()
        resp.data = uploader.get_file_states()

        uploader.attach_fh(key, file)
        upload_cache = UploadCache(root_dir=self.cache_root_dir)
        uploader.save_to_cache(lgg=self.lgg, cache=upload_cache, overwrite=False)
        uploader.check_cache_meta()

        # Store the uploaded data in DB
        actor = self.owner_id
        for uf in upload_cache.files:
            if not uf.is_ok:
                continue

            data = dict(
                filename=uf.client_filename,
                mime_type=uf.cache_mime_type,
                size=uf.cache_size,
                encoding=uf.cache_encoding,
            )

            if tika:
                extracted_meta = tika.pym(uf.abs_cache_filename)
            else:
                extracted_meta = {}
            if extracted_meta:
                data.update(extracted_meta)

            if write_mode == WriteModes.create.value:
                self.lgg.debug('Adding file {} to {}, {} bytes'.format(data['filename'], uf.dst_node, data['size']))
                file_node = uf.dst_node.add_file(owner=actor, **data)
            elif write_mode == WriteModes.update.value:
                self.lgg.debug('Updating file {}, {} bytes'.format(uf.dst_node, data['size']))
                file_node = uf.dst_node.update(editor=actor, **data)
            elif write_mode == WriteModes.revise.value:
                self.lgg.debug('Revising file {}, {} bytes'.format(uf.dst_node, data['size']))
                file_node = uf.dst_node.revise(keep_content=False,
                    editor=actor, **data)
            else:
                raise ValueError("Unknown write mode: '{}'".format(write_mode))
            file_node.content.from_file(uf.abs_cache_filename)

        self.del_cached_children(path_node.id)
        resp.data = uploader.get_file_states()

    def extract_meta(self, resp, path, names, tika):
        path_node = self.fs_root.find_by_path(path)
        for name in names:
            n = path_node[name]
            if not n.content:
                continue
            attr = n.content.data_attr
            if attr == 'data_bin':
                mode = 'wb'
                encoding = None
            else:
                mode = 'wt'
                encoding = n.content.encoding or 'utf-8'
            with tempfile.NamedTemporaryFile(mode=mode, encoding=encoding) as fp:
                fp.write(getattr(n.content, attr))
                fp.seek(0)
                # Is it wise to hint TIKA with our stored mime-type?
                # Maybe the reason to extract meta again is, our stored data
                # incl. mime-type is wrong?
                # OTOH, with tmp file, TIKA gets no hint from the filename...
                hh = {'content-type': n.mime_type}
                extracted_meta = tika.pym(fp.name, hh=hh)
            n.set_meta(extracted_meta, keep_content=False)
            n.editor_id = self.owner_id
            n.content.editor_id = n.editor_id

    def ls(self, resp, path, include_deleted):
        cur_node = self.fs_root.find_by_path(path, include_deleted=include_deleted)
        if not self.has_permission(Permissions.read.value, context=cur_node):
            resp.error("Forbidden to list")
            return
        owner = sa.orm.aliased(pym.auth.models.User, name='owner')
        editor = sa.orm.aliased(pym.auth.models.User, name='editor')
        deleter = sa.orm.aliased(pym.auth.models.User, name='deleter')
        fil = [
            FsNode.parent_id == cur_node.id
        ]
        if not include_deleted:
            fil.append(FsNode.deleter_id == None)
        nchildren = self.sess.query(FsNode.parent_id, sa.func.count('*').label(
            'nchildren')).group_by(FsNode.parent_id).subquery()
        rs = self.sess.query(
            FsNode,
            owner.display_name.label('owner'),
            editor.display_name.label('editor'),
            deleter.display_name.label('deleter'),
            nchildren.c.nchildren
        ).outerjoin(
            owner, owner.id == FsNode.owner_id
        ).outerjoin(
            editor, editor.id == FsNode.editor_id
        ).outerjoin(
            deleter, deleter.id == FsNode.deleter_id
        ).outerjoin(
            nchildren, nchildren.c.parent_id == FsNode.id
        ).filter(*fil)
        excl = {
            'FsNode': ('content_bin', 'content_text', 'content_json', '_slug')
        }
        resp.data = {'rows': dictate_iter(rs, excludes=excl, objects_as='flat')}

    def delete_items(self, resp, path, names, reason):
        cur_node = self.fs_root.find_by_path(path, include_deleted=True)
        if reason == 'YES':
            reason = None
        for n in names:
            this_node = cur_node[n]
            if not self.has_permission(Permissions.delete.value, context=this_node):
                resp.error(_("Forbidden to delete '{}'").format(n))
                continue
            this_node.delete(
                deleter=self.owner_id,
                deletion_reason=reason,
                delete_from_db=False,
                recursive=True
            )
        # remove cache keys for children of cur_node
        self.del_cached_children(cur_node.id)

    def undelete_items(self, resp, path, names):
        cur_node =self.fs_root.find_by_path(path, include_deleted=True)
        for n in names:
            this_node = cur_node[n]
            if not self.has_permission(Permissions.write.value, context=this_node):
                resp.error(_("Forbidden to undelete '{}'").format(n))
                continue
            this_node.undelete(
                editor=self.owner_id,
                recursive=True
            )
        # remove cache keys for children of cur_node
        self.del_cached_children(cur_node.id)

    def create_directory(self, resp, path, name):
        cur_node =self.fs_root.find_by_path(path, include_deleted=False)
        if not self.has_permission(Permissions.write.value, context=cur_node):
            resp.error(_("Forbidden to create directory '{}'").format(name))
            return
        try:
            cur_node.add_directory(owner=self.owner_id, name=name)
        except pym.exc.ItemExistsError:
            resp.error(_("Directory '{}' already exists").format(name))
        # remove cache keys for children of cur_node
        self.del_cached_children(cur_node.id)

    def load_tree(self, resp, fil, include_deleted):

        def _load_twig(n, twig):
            # Need at least read permission
            # TODO
            # Filter
            if fil == 'dirs' and n.mime_type != MIME_TYPE_DIRECTORY:
                return
            # Do it
            x = {'id': n.id, 'title': n.title, 'name': n.name, 'nodes': [],
                'sortix': n.sortix, 'is_deleted': n.is_deleted()}
            twig.append(x)
            if n.has_children(include_deleted=include_deleted):
                for cn in n.children.values():
                    if cn.is_deleted() and not include_deleted:
                        continue
                    _load_twig(cn, x['nodes'])
                x['nodes'].sort(key=lambda y: (y['sortix'], y['title']))

        data = []
        cur_node = self.fs_root
        """:type: FsNode"""
        _load_twig(cur_node, data)
        resp.data = data

    def load_fs_properties(self, resp):
        resp.data = dict(self.fs_root.rc)

    def load_item_properties(self, resp, path, name):
        path += '/' + name
        cur_node = self.fs_root.find_by_path(path, include_deleted=False)
        if not self.has_permission(Permissions.read.value, context=cur_node):
            resp.error("Forbidden to read")
            return
        owner = sa.orm.aliased(pym.auth.models.User, name='owner')
        editor = sa.orm.aliased(pym.auth.models.User, name='editor')
        deleter = sa.orm.aliased(pym.auth.models.User, name='deleter')
        fil = [
            FsNode.id == cur_node.id,
            FsNode.deleter_id == None
        ]
        rs = self.sess.query(
            FsNode,
            owner.display_name.label('owner'),
            editor.display_name.label('editor'),
            deleter.display_name.label('deleter')
        ).outerjoin(
            owner, owner.id == FsNode.owner_id
        ).outerjoin(
            editor, editor.id == FsNode.editor_id
        ).outerjoin(
            deleter, deleter.id == FsNode.deleter_id
        ).filter(
            *fil
        ).one()
        excl = {
            'FsNode': ('content_bin', '_slug')
        }
        fmap = {
            'FsNode': {
                'rc': lambda it: dict(it.rc) if it.rc else None,
                'meta_json': lambda it: it.content.meta_json,
                'meta_xmp': lambda it: it.content.meta_xmp,
                'data_text': lambda it: it.content.data_text,
                'data_html_body': lambda it: it.content.data_html_body,
            }
        }
        resp.data = dictate(rs, fmap=fmap, excludes=excl, objects_as='flat')


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
        self.fs_root = context.class_root
        self.upload_cache_root_dir = '/tmp/pym/upload_cache'

        self.tr = self.request.localizer.translate
        self.sess = DbSession()
        self.validator = Validator(request.GET, fs_root=self.fs_root)
        self.worker = Worker(
            lgg=self.lgg,
            sess=self.sess,
            owner_id=request.user.uid,
            cache=request.redis,
            has_permission=request.has_permission,
            fs_root=self.fs_root,
            cache_root_dir=self.upload_cache_root_dir
        )

        self.urls = dict(
            index=request.resource_url(context),
            upload=request.resource_url(context, '@@_ul_'),
            load_items=request.resource_url(context, '@@_ls_'),
            delete_items=request.resource_url(context, '@@_rm_'),
            undelete_items=request.resource_url(context, '@@_unrm_'),
            create_directory=request.resource_url(context, '@@_crd_'),
            load_tree=request.resource_url(context, '@@_load_tree_'),
            load_fs_properties=request.resource_url(context, '@@_load_fs_properties_'),
            load_item_properties=request.resource_url(context, '@@_load_item_properties_'),
            validate_files=request.resource_url(context, '@@_validate_files_'),
            extract_meta=request.resource_url(context, '@@_extract_meta_')
        )

    @view_config(
        name='',
        request_method='GET'
    )
    def index(self):
        disposition = self.request.GET.get('disposition', 'inline')
        if disposition not in ('inline', 'attachment'):
            disposition = 'inline'
        n = self.context
        response = pyramid.response.Response(
            content_type=n.mime_type,
            content_length=n.size,
            content_disposition=disposition + '; filename=' + n.name
        )
        attr = n.content.data_attr
        if attr == 'data_bin':
            response.body = n.content.data
        else:
            response.text = n.content.data
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
        path = '/'.join(list(reversed([x.name for x in lineage(self.context)
            if isinstance(x, FsNode)])))
        rc = {}
        node_rc = self.context.rc
        rc['urls'] = self.urls
        rc['path'] = path
        rc['MIME_TYPE_DIRECTORY'] = MIME_TYPE_DIRECTORY
        return {
            'rc': rc
        }

    @view_config(
        name='_validate_files_',
        renderer='string',
        request_method='POST'
    )
    def validate_files(self):
        self.validator.inp = self.request.json_body
        keys = ('path', 'files')
        func = functools.partial(
            self.worker.validate_files,
            request=self.request
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
        name='_ul_',
        renderer='string',
        request_method='POST'
    )
    def upload(self):
        if random.random() >= 0.7:
            self.lgg.debug('Purging upload cache')
            upload_cache = UploadCache(self.upload_cache_root_dir)
            upload_cache.purge()
        # handle multipart/form-data of a single file
        self.validator.inp = pym.lib.json_deserializer(self.request.POST['data'])
        tika = pym.fs.tools.TikaServer('localhost', 9998)
        keys = ('key', 'path', 'size', 'write_mode')
        func = functools.partial(
            self.worker.upload,
            file=self.request.POST['file'],
            request=self.request,
            tika=tika
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
        keys = ('path', 'include_deleted')
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
    def delete_items(self):
        keys = ('path', 'names', 'reason')
        func = functools.partial(
            self.worker.delete_items
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
        name='_unrm_',
        renderer='string',
        request_method='PUT'
    )
    def undelete_items(self):
        self.validator.inp = self.request.json_body
        keys = ('path', 'names')
        func = functools.partial(
            self.worker.undelete_items
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
        keys = ('path', 'name')
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

    @view_config(
        name='_load_tree_',
        renderer='string',
        request_method='GET'
    )
    def load_tree(self):
        keys = ('fil', 'include_deleted')
        func = functools.partial(
            self.worker.load_tree
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
        name='_load_fs_properties_',
        renderer='string',
        request_method='GET'
    )
    def load_fs_properties(self):
        keys = ()
        func = functools.partial(
            self.worker.load_fs_properties
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
        name='_load_item_properties_',
        renderer='string',
        request_method='GET'
    )
    def load_item_properties(self):
        keys = ('path', 'name')
        func = functools.partial(
            self.worker.load_item_properties
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
        name='_extract_meta_',
        renderer='string',
        request_method='PUT'
    )
    def extract_meta(self):
        self.validator.inp = self.request.json_body
        keys = ('path', 'names')
        tika = pym.fs.tools.TikaServer('localhost', 9998)
        func = functools.partial(
            self.worker.extract_meta,
            tika=tika
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
