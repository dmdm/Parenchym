import logging
import functools

from pyramid.location import lineage
import sqlalchemy as sa
import sqlalchemy.orm
from pyramid.view import view_config, view_defaults
import pyramid.response

from pym.fs.tools import Sentry, UploadCache, UploadedFile
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

    def __init__(self, lgg, sess, owner_id, cache, has_permission, fs_root):
        self.lgg = lgg
        self.sess = sess
        self.owner_id = owner_id
        self.cache = cache
        self.has_permission = has_permission
        self.fs_root = fs_root
        self.fc_col_map = {}

        self.upload_cache = None
        self.fs_sentry = None

    def init_upload_cache(self, root_dir='/tmp/pym/upload_cache'):
        if not self.upload_cache:
            self.upload_cache = UploadCache(root_dir=root_dir)

    def del_cached_children(self, parent_id):
        for k in self.cache.keys("ResourceNode:children:*{}".format(parent_id)):
            self.cache.delete(k)

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
                'permissions': uf.get_permissions(),
                'validation_msg': uf.validation_msg
            }
        resp.data = rr
        return u_files

    def upload(self, resp, path, data, request, write_mode):
        self.init_upload_cache()
        upload_cache = self.upload_cache

        # Use path to find destination node. We may change that later on, in
        # case the provided file names already have existing nodes. Then those
        # will become destinations.
        path_node = self.fs_root.find_by_path(path)
        path_sentry = Sentry(path_node)

        # Create instances of UploadedFile
        for name, fieldStorage in data.items():
            if not (hasattr(fieldStorage, 'file') and fieldStorage.file):
                continue
            uf = upload_cache.create_file(fieldStorage)
            # Without actually having saved the data to a file yet, we can do
            # some pre-checks with the meta data as provided by the client.
            meta = uf.get_client_meta()
            try:
                path_sentry.check_file_meta(meta)
            except (PermissionError, ValueError) as exc:
                uf.exc = exc

        # For all files that are ok, determine if a node with their name already
        # exists.
        for uf in upload_cache.files:
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
            # Now that each file knows its destination node, it's time to
            # check permission to write
            try:
                uf.sentry.check_permission(request, write_mode)
            except PermissionError as exc:
                uf.exc = exc

        # Save all survivors as real files in the cache, and check against
        # the cache meta data. If the file still is ok, extract more meta via
        # TIKA and finally store all in the DB.

        # TODO





        # # Save uploaded data only if needed. To just store it in the DB, it is
        # # not needed. On the other hand we need a real file if we want to
        # # extract xattr e.g. with TIKA. This should explicitly be requested by
        # # client.
        # # self.cache.save(self.lgg, resp)
        #
        # actor = self.owner_id
        # # Store the uploaded data in DB
        # for c in upload_cache.files:
        #     if not c.is_ok:
        #         resp.error("{}: {}".format(c.client_filename, c.exc))
        #         continue
        #
        #     name = c.client_filename
        #     # Shall we trust the mime-type the client told us, or use the one we
        #     # determined our own?
        #     # At least in case of a JSON file, our detection says wrongly
        #     # 'text/plain', but the client told correctly 'application/json'
        #     # mime = c.cache_mime_type
        #     mime = c.client_mime_type
        #
        #     try:
        #         child_fs_node = path_node[name]
        #     except KeyError:
        #         child_fs_node = pym.fs.manager.create_fs_node(
        #             self.sess,
        #             owner=actor,
        #             parent_id=path_node.id,
        #             name=name
        #         )
        #     else:
        #         if overwrite:
        #             # Need write permission on child to overwrite
        #             if not self.has_permission(Permissions.write.value,
        #                     context=child_fs_node):
        #                 resp.error(_("Forbidden to overwrite '{}'").format(name))
        #                 continue
        #             child_fs_node = pym.fs.manager.update_fs_node(
        #                 self.sess,
        #                 fs_node=child_fs_node,
        #                 editor=actor
        #             )
        #         else:
        #             resp.warn(_('{} already exists').format(name))
        #             continue
        #     child_fs_node.mime_type = mime
        #     child_fs_node.cache_filename = c.cache_filename
        #     child_fs_node.size = c.meta['size']
        #     child_fs_node.xattr = c.meta.get('xattr')
        #     # Read data directly from fieldStorage, we might have no physically
        #     # cached file.
        #     attr = child_fs_node.content_attr
        #     if attr == 'content_bin':
        #         setattr(child_fs_node, attr, c.f.file.read())
        #     else:
        #         setattr(child_fs_node, attr, c.f.file.read().decode('UTF-8'))
        #     for k in ('content_bin', 'content_text', 'content_json'):
        #         if k != attr:
        #             setattr(child_fs_node, k, None)

            self.del_cached_children(path_node.id)

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
                'rc': lambda it: dict(it.rc),
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

        self.tr = self.request.localizer.translate
        self.sess = DbSession()
        self.validator = Validator(request.GET, fs_root=self.fs_root)
        self.worker = Worker(
            lgg=self.lgg,
            sess=self.sess,
            owner_id=request.user.uid,
            cache=request.redis,
            has_permission=request.has_permission,
            fs_root=self.fs_root
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
        return 'ok'
        # data = self.request.POST
        # self.validator.inp = data
        # overwrite = data.get('overwrite', False)
        # keys = ('path', )
        # func = functools.partial(
        #     self.worker.upload,
        #     data=data,
        #     request=self.request,
        #     overwrite=overwrite
        # )
        # resp = pym.resp.build_json_response(
        #     lgg=self.lgg,
        #     validator=self.validator,
        #     keys=keys,
        #     func=func,
        #     request=self.request,
        #     die_on_error=False
        # )
        # return json_serializer(resp.resp)

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
