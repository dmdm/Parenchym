import logging
import functools
from pprint import pprint
import random
import re
import tempfile

from pyramid.location import lineage
import sqlalchemy as sa
import sqlalchemy.orm
import sqlalchemy.sql.operators as sqlop
from pyramid.view import view_config, view_defaults
import pyramid.response

from pym.fs.tools import Sentry, UploadCache, UploadedFile, Uploader
from pym.lib import json_serializer
from ...models import IFsNode, FsNode, WriteModes, FsContent
from ...const import MIME_TYPE_DIRECTORY
import pym.exc
import pym.fs.manager
from pym.res.models import VwParents
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
    def item_id(self):
        return self.fetch_int('id', required=True, multiple=False)

    @property
    def attr(self):
        return self.fetch('attr', required=True, multiple=False)

    @property
    def new_value(self):
        return self.fetch('nv', required=False, multiple=False)

    @property
    def old_value(self):
        return self.fetch('ov', required=False, multiple=False)

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
    def search_area(self):
        v = self.fetch('sarea', required=False, multiple=False)
        if v is None:
            return 'here'
        if v not in ('here', 'everywhere'):
            raise pym.exc.ValidationError("Invalid sarea: '{}".format(v))
        return v

    @property
    def search_fields(self):
        v = self.fetch('sfields', required=False, multiple=False)
        if v is None:
            return 'name'
        if v not in ('name', 'all'):
            raise pym.exc.ValidationError("Invalid sfields: '{}".format(v))
        return v

    @property
    def search(self):
        return self.fetch('s', required=False, multiple=False)

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

    def edit_item(self, resp, item_id, attr, new_value, old_value):
        try:
            if attr not in ('_name', '_title'):
                raise pym.exc.ValidationError(
                    _("Unknown attribute: '{}'".format(attr)))
            if attr == '_name':
                if not new_value:
                    raise pym.exc.ValidationError(
                        _("Name must not be empty."))
                if not pym.security.is_path_safe(new_value, split=False,
                        raise_error=False):
                    raise pym.exc.ValidationError(
                        _("Name contains invalid characters."))
            n = self.sess.query(FsNode).get(item_id)
            if not n:
                # This is serious, do not catch it but let it kill the request
                raise FileNotFoundError(
                    'Node with ID {} not found.'.format(item_id))
            if not self.has_permission(Permissions.write.value, context=n):
                raise PermissionError(_("You have no write permission."))
        except (pym.exc.ValidationError, PermissionError) as exc:
            resp.error(str(exc))
            return
        setattr(n, attr, new_value)

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
        files = [{
            'key': key,
            'filename': file.filename,
            'size': size,
            'mime_type': file.type
        }]

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

    def ls(self, resp, path, include_deleted, search_area, search_fields,
            search):

        # Aliases and sub-selects we need in any case
        owner = sa.orm.aliased(pym.auth.models.User, name='owner')
        editor = sa.orm.aliased(pym.auth.models.User, name='editor')
        deleter = sa.orm.aliased(pym.auth.models.User, name='deleter')
        nchildren = self.sess.query(FsNode.parent_id, sa.func.count('*').label(
            'nchildren')).group_by(FsNode.parent_id).subquery()

        # Base query
        q = self.sess.query(
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
        )

        # Init filter
        fil = []
        if not include_deleted:
            fil.append(FsNode.deleter_id == None)

        # If a search expression is present...
        if search:
            # Join VwParents from resources to obtain the location
            q = q.add_entity(VwParents)
            q = q.outerjoin(
                VwParents, VwParents.id == FsNode.id
            )
            # Init op and expression
            search = '%' + re.sub(r'\s+', '%', search) + '%'
            op = sqlop.ilike_op

            # 1. Apply search area
            #    a) We search here: init vanilla ls on current node
            if search_area == 'here':
                cur_node = self.fs_root.find_by_path(path, include_deleted=include_deleted)
                if not self.has_permission(Permissions.read.value, context=cur_node):
                    resp.error("Forbidden to list")
                    return
                fil.append(FsNode.parent_id == cur_node.id)
            #   b) We search everywhere:  I) No filter by parent_id
            #                            II) Check read permission of each
            #                                single node that we selected
            #                                (see below)
            elif search_area == 'everywhere':
                pass
            else:
                raise ValueError("Invalid search area: '{}'".format(search_area))

            # 2. Apply search fields
            #    a) name: we look into name and title fields
            if search_fields == 'name':
                fil.append(sa.or_(
                    op(FsNode.name, search),
                    op(FsNode.title, search),
                ))
            #    b) all: we look into name, title, meta_json, data_text fields
            #       To do that, we must join with FsContent
            elif search_fields == 'all':
                q = q.outerjoin(
                    FsContent, FsContent.id == FsNode.fs_content_id
                )
                fil.append(sa.or_(
                    op(FsNode.name, search),
                    op(FsNode.title, search),
                    op(sa.cast(FsContent.meta_json, sa.UnicodeText), search),
                    op(FsContent.data_text, search),
                ))
            else:
                raise ValueError("Invalid search fields: '{}'".format(search_fields))

        # No search expression present: perform vanilla ls on current node
        else:
            cur_node = self.fs_root.find_by_path(path, include_deleted=include_deleted)
            if not self.has_permission(Permissions.read.value, context=cur_node):
                resp.error("Forbidden to list")
                return
            fil.append(FsNode.parent_id == cur_node.id)

        q = q.filter(*fil)
        excl = {
            'FsNode': ('content_bin', 'content_text', 'content_json', '_slug'),
            'VwParents': ('id', '_parents')
        }
        rows = []
        no_perm = 0
        fs_root_id = self.fs_root.id
        for r in q:
            # We had searched everywhere, so each individual row needs to be
            # checked for read permission
            if search and search_area == 'everywhere':
                n = r.FsNode
                vwp = r.VwParents
                if self.has_permission(Permissions.read.value, context=n):
                    x = dictate(r, excludes=excl, objects_as='flat')
                    if vwp.parents:
                        pp = []
                        for p in vwp.parents:
                            pp.append(p[1])
                            if p[0] == fs_root_id:
                                break
                        x['location'] = '/'.join(reversed(pp))
                    else:
                        x['location'] = '/'
                    rows.append(x)
                else:
                    no_perm += 1
                if no_perm:
                    resp.warn("{} rows skipped because you have no read permission")
            # Vanilla: just append the row
            else:
                x = dictate(r, excludes=excl, objects_as='flat')
                pp = []
                nr = cur_node.class_root
                while True:
                    pp.append(cur_node._name)
                    if cur_node != nr and cur_node.__parent__:
                        cur_node = cur_node.__parent__
                    else:
                        break
                x['location'] = '/'.join(reversed(pp))
                rows.append(x)
        resp.data = {'rows': rows}

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
        # Skip fs_root, it is already there
        resp.data = data[0]['nodes']

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
            extract_meta=request.resource_url(context, '@@_extract_meta_'),
            edit_item=request.resource_url(context, '@@_edit_item_'),
            help_href=request.resource_url(context.root['help'], '@@userman', 'filesystem')
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
        # This node will bee root for the tree
        n = self.context
        rc['this_node'] = {'id': n.id, 'title': n.title, 'name': n.name, 'nodes': [],
                'sortix': n.sortix, 'is_deleted': n.is_deleted(), 'parent': None}
        rc['search_node'] = {'id': -1000, 'title': _("Search Results"), 'name': 'search', 'nodes': [],
                'sortix': 5000, 'is_deleted': False, 'parent': None}
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
        keys = ('path', 'include_deleted', 'search_area', 'search_fields',
            'search')
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

    @view_config(
        name='_edit_item_',
        renderer='string',
        request_method='PUT'
    )
    def edit_item(self):
        self.validator.inp = self.request.json_body
        keys = ('item_id', 'attr', 'new_value', 'old_value')
        func = functools.partial(
            self.worker.edit_item
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
