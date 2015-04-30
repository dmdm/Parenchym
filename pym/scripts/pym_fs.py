#!/usr/bin/env python
from collections import OrderedDict
from humanfriendly import format_size
import concurrent.futures
import fnmatch
import glob
import pickle
from pprint import pprint
import textwrap
import time
import argparse
import logging
import sys
import os
import datetime
import functools
import zipfile
import io
import collections
import colorama
from elasticsearch import Elasticsearch, RequestsHttpConnection
import magic
import math

import sqlparse
import transaction

import pym.cli
import pym.exc
import pym.security
import pym.auth.models
import pym.auth.manager
from pym.fs.api import PymFs
import pym.res.const
import pym.res.models
import pym.tenants.models
from pym.models import dictate_iter, DbSession
import pym.fs.models
import pym.fs.tools


def _list_to_tree(data, id_field='id', parent_field='parent_id', name_field='name'):
    out = OrderedDict([
        ('root', {id_field: 0, parent_field: 0, name_field: "Root node", 'children': []})
    ])
    for p in data:
        try:
            pid = p[parent_field]
        except KeyError:
            pid = 'root'
        if not pid:
            pid = 'root'
        out.setdefault(pid, {'children': []})
        out.setdefault(p[id_field], {'children': []})
        out[p[id_field]].update(p)
        out[pid]['children'].append(out[p[id_field]])
    return out['root']['children']


class Runner(pym.cli.Cli):

    def __init__(self):
        super().__init__()
        self.fs = None
        ":type: PymFs"
        self.tenant = None
        self.fs_root = None

    def init_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        super().init_app(args=args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)
        n_root = pym.res.models.ResourceNode.load_root(
            self.sess,
            name=pym.res.const.NODE_NAME_ROOT,
            use_cache=False
        )
        self.tenant = n_root[self.args.tenant]
        self.fs_root = pym.fs.models.FsNode.load_root(self.sess, self.tenant)
        self.fs = PymFs(lgg=self.lgg, sess=self.sess, fs_root=self.fs_root,
            actor=self.actor)

    def cmd_ls(self):
        if self.args.long:
            e = pym.fs.models.FsNode
            start_node = self.fs_root.find_by_path(self.args.path)
            qry = self.sess.query(e).filter(e.parent_id == start_node.id)
            qry = self._build_query(qry, e)
            excl = ('content_bin', 'content_text', 'content_json', '_slug')
            data = dictate_iter(qry, excludes=excl)
            self.print(data)
        else:
            for p in self.fs.listdir(
                    path=self.args.path,
                    wildcard=self.args.wildcard
            ):
                print(p)

    def cmd_mkdir(self):
        with transaction.manager:
            self.fs.reinit()
            n = self.fs.makedir(
                path=self.args.path,
                recursive=self.args.recursive,
                allow_recreate=self.args.exist_ok
            )
            print('Created', n)

    def cmd_delete(self):
        with transaction.manager:
            self.fs.reinit()
            if self.args.recursive:
                self.fs.removedir(
                    path=self.args.path,
                    force=True,
                    delete_from_db=self.args.delete_from_db,
                    deletion_reason=self.args.reason
                )
            else:
                self.fs.remove(
                    path=self.args.path,
                    delete_from_db=self.args.delete_from_db,
                    deletion_reason=self.args.reason
                )

    def cmd_undelete(self):
        with transaction.manager:
            self.fs.reinit()
            n = self.fs.fs_root.find_by_path(self.args.path)
            n.undelete(self.fs.actor, recursive=self.args.recursive)

    def cmd_rename(self):
        with transaction.manager:
            self.fs.reinit()
            self.fs.rename(self.args.src, self.args.dst)

    def cmd_save(self):

        def done():
            self.lgg.info('File saved')

        cmd = 'add'
        if self.args.update:
            cmd = 'update'
        if self.args.revise:
            # revise is stronger than update
            cmd = 'revise'
        if self.args.meta:
            host = self.args.meta
            if host == 'pipe':
                meta = functools.partial(
                    pym.fs.tools.fetch_meta,
                    lgg=self.lgg,
                    encoding=self.encoding
                )
            else:
                if ':' in host:
                    host, port = host.split(':')
                else:
                    port = 9998
                srv = pym.fs.tools.TikaServer(host, port)
        else:
            meta = None
        args = {
            'path': self.args.dst,
            'data': self.args.src,
            'command': cmd,
            'meta': meta,
            'finished_callback': done
        }
        with transaction.manager:
            self.fs.reinit()
            if self.args.async:
                self.fs.setcontents_async(**args)
            else:
                self.fs.setcontents(**args)

    def _build_tika_runner(self, host):
        if '/' in host or host == 'tika':
            return pym.fs.tools.TikaCli(host)
        else:
            if ':' in host:
                host, port = host.split(':')
            else:
                port = 9998
            return pym.fs.tools.TikaServer(host, port)

    def cmd_tika(self):
        src = self.args.src
        if isinstance(src, str):
            src = [src]
        host = self.args.host
        res = self.args.resource
        tika = self._build_tika_runner(host)
        for fn in src:
            if res == 'unpack':
                if isinstance(tika, pym.fs.tools.TikaCli):
                    raise NotImplementedError(
                        'Unpack is not implemented using the CLI')
                f = getattr(tika, res)(fn, self.args.type == 'all')
                # If we are in interactive mode, print the TOC of the ZIP
                if sys.stdout.isatty():
                    if f:
                        with zipfile.ZipFile(f) as zh:
                            infs = zh.infolist()
                            for i, inf in enumerate(infs):
                                print(i, inf.filename, inf.compress_size,
                                    inf.file_size)
                    else:
                        self.lgg.warn('Failed to unpack file (maybe no compound'
                                      ' document): {}'.format(fn))
                else:
                    # We are piped into another file: create the ZIP as file.
                    # STDOUT might have been modified by init_cli_locale().
                    # Get the original stream back.
                    sys.stdout = sys.stdout.detach()
                    sys.stdout.write(f.read())
            elif res in ('detect', 'rmeta', 'pym'):
                m = getattr(tika, res)(fn)
                pprint(m)
            else:
                m = getattr(tika, res)(fn, self.args.type)
                pprint(m)

    def cmd_bulk_save(self):
        src = self.args.src
        if isinstance(src, str):
            src = [src]
        root_dir = self.rc.root_dir
        ff = []
        dd = []
        for fn in src:
            root_dir, dd2, ff2 = self._collect_files(root_dir, fn, self.args.recursive)
            ff += ff2
            dd += dd2
        dd.sort()
        ff.sort(key=lambda s: len(s))

        root_node = self.fs.fs_root.find_by_path(self.args.dst)

        kwargs = dict(
            actor=self.fs.actor,
            root_dir=pym.security.safepath(root_dir),
            root_node=root_node,
            update=self.args.update,
            revise=self.args.revise
        )

        self.lgg.info('Loading directories...')
        with transaction.manager:
            for d in dd:
                self._save_thing(filename=d, **kwargs)

        self.lgg.info('Loading files...')
        with concurrent.futures.ThreadPoolExecutor(
                max_workers=self.args.jobs) as executor:
            # Start the load operations and mark each future with its URL
            fut = {executor.submit(self._save_thing, filename=f, **kwargs): f for f in ff}
            for future in concurrent.futures.as_completed(fut):
                fn = fut[future]
                try:
                    data = future.result()
                except Exception as exc:
                    self.lgg.error("Error in future: '{}'".format(future))
                    self.lgg.error("Failed to process file: '{}'".format(fn))
                    self.lgg.exception(exc)
                    raise
                else:
                    self.lgg.debug("Ok: '{}'".format(fn))

    def _save_thing(self, actor, root_dir, filename, root_node, update=False,
            revise=False):

        # print('root dir', root_dir)
        # print(filename)
        # return
        lrd = len(root_dir)
        dst_path = filename.strip('/')[lrd:].strip('/')

        try:
            pym.security.is_path_safe(dst_path, split=True, sep=os.path.sep, raise_error=True)
        except ValueError as exc:
            self.lgg.error(str(exc))
            dst_path = os.path.sep + pym.security.safepath(dst_path)
            self.lgg.warning("Cleaning to: '{}'".format(dst_path))

        with transaction.manager:
            sess = DbSession()
            actor = sess.merge(actor)
            fs_root = sess.query(pym.fs.models.FsNode).filter(pym.fs.models.FsNode.name=='fs').one()
            root_node = fs_root.find_by_path(self.args.dst)
            if os.path.isdir(filename):
                self._save_dir(
                    actor=actor,
                    fn=filename,
                    root_node=root_node,
                    dst_path=dst_path,
                    update=update,
                    revise=revise
                )
            else:
                self._save_file(
                    actor=actor,
                    fn=filename,
                    root_node=root_node,
                    dst_path=dst_path,
                    update=update,
                    revise=revise
                )
            # sess.flush()

    def _save_dir(self, actor, fn, root_node, dst_path, update, revise):
        self.lgg.debug("Trying to save dir '{}'".format(dst_path))
        name = os.path.basename(dst_path)
        try:
            dst_n = root_node.find_by_path(dst_path)
        except FileNotFoundError:
            # Destination does not exist:
            # In parent of destination, add a directory
            dst_n = root_node.find_by_path(os.path.dirname(dst_path))
            self.lgg.debug("Adding subdir '{}' to {}".format(name, dst_n))
            dst_n.add_directory(owner=actor, name=name)
        else:
            # Destination does exist:
            # Set new name, keep all other attributes
            if update:
                self.lgg.debug("Updating name '{}' of {}".format(name, dst_n))
                dst_n.update(editor=actor, name=name)
            elif revise:
                self.lgg.debug("Revising name '{}' of {}".format(name, dst_n))
                dst_n.revise(editor=actor, name=name)
            else:
                raise pym.exc.ItemExistsError(
                    "Destination exists and neither update nor revise were"
                    " allowed: {}".format(dst_path))

    def _save_file(self, actor, fn, root_node, dst_path, update, revise):
        self.lgg.debug("Trying to save file '{}'".format(dst_path))
        name = os.path.basename(dst_path)

        size = os.path.getsize(fn)
        if self.args.tika:
            tika = self._build_tika_runner(self.args.tika)
            meta = tika.pym(fn)
            mime_type = meta['mime_type']
            enc = None
        else:
            meta = None
            mime_type, enc = pym.fs.tools.guess_mime_type(fn)
        kwargs = {
            'size': size,
            'mime_type': mime_type,
            'encoding': enc
        }
        if meta:
            kwargs.update(meta)

        self.lgg.debug("Trying to save file '{}'".format(dst_path))
        try:
            dst_n = root_node.find_by_path(dst_path)
        except FileNotFoundError:
            # Destination does not exist:
            # In parent of destination, add a file
            dst_n = root_node.find_by_path(os.path.dirname(dst_path))
            self.lgg.debug("Adding file '{}' to {}".format(name, dst_n))
            n = dst_n.add_file(owner=actor, filename=name, **kwargs)
        else:
            # Destination does exist:
            # Set new name, keep all other attributes
            if update:
                self.lgg.debug("Updating name '{}' of {}".format(name, dst_n))
                dst_n.update(editor=actor, name=name, **kwargs)
                n = dst_n
            elif revise:
                self.lgg.debug("Revising name '{}' of {}".format(name, dst_n))
                dst_n.revise(editor=actor, name=name, **kwargs)
                n = dst_n
            else:
                raise pym.exc.ItemExistsError(
                    "Destination exists and neither update nor revise were"
                    " allowed: {}".format(dst_path))
        n.content.from_file(fn)

    def _collect_files(self, root_dir, fn, recursive=False):
        start_dir = os.path.sep + pym.security.safepath(os.path.join(root_dir, fn))
        if recursive:
            if any(c in '?*[]{}' for c in start_dir):
                pat = os.path.basename(start_dir)
                start_dir = os.path.dirname(start_dir)
            else:
                pat = '*'
            ff = []
            dd = []
            self.lgg.debug('Recursing {}, pattern {}'.format(start_dir, pat))
            for rd, dirs, files in os.walk(start_dir):
                dd += [os.path.join(rd, x) for x in fnmatch.filter(dirs, pat)]
                ff += [os.path.join(rd, x) for x in fnmatch.filter(files, pat)]
        else:
            self.lgg.debug('Globbing ' + start_dir)
            xx = glob.glob(start_dir)
            dd = []
            ff = []
            for x in xx:
                if os.path.isdir(x):
                    dd.append(x)
                else:
                    ff.append(x)
        return start_dir, dd, ff

    def _build_query(self, qry, entity):
        if not self.args.with_deleted:
            qry = qry.filter(entity.dtime == None)
        qry = qry.order_by(
            entity.id
        )
        if hasattr(self.args, 'filter') and self.args.filter:
            qry = qry.filter(str(self.args.filter))
        if self.args.show_sql:
            print(sqlparse.format(str(qry), reindent=True, keyword_case='upper'))
        return qry

    def cmd_collect_osfs(self):

        def _fetch_info(filename):
            if self.args.tika:
                tika = self._build_tika_runner(self.args.tika)
                meta = tika.meta(fn, type_='json')
                pprint(meta)
                mt = meta['Content-Type'], None
            else:
                meta = None
                mt, enc = pym.fs.tools.guess_mime_type(filename, magic_inst=None)
            sz = os.path.getsize(filename)
            return filename, sz, mt, meta

        ff = []
        root_dir = '/'
        for fn in self.args.start_dirs:
            rd, dd2, ff2 = self._collect_files(root_dir, fn, self.args.recursive)
            ff += ff2
        ff.sort()
        dd = []
        with concurrent.futures.ThreadPoolExecutor(
                max_workers=self.args.jobs) as executor:
            # Start the load operations and mark each future with its URL
            fut = {executor.submit(_fetch_info, filename=f): f for f in ff}
            for future in concurrent.futures.as_completed(fut):
                fn = fut[future]
                try:
                    dd.append(future.result())
                except Exception as exc:
                    self.lgg.error("Error in future: '{}'".format(future))
                    self.lgg.error("Failed to process file: '{}'".format(fn))
                    self.lgg.exception(exc)
                    raise
        if self.args.output:
            with open(self.args.output, 'wb') as fh:
                pickle.dump(dd, file=fh)
        else:
            for d in dd:
                print(d)

    def cmd_es_search(self):
        #colorama.init()
        host, port = self.args.host.split(':')
        port = int(port)
        es = Elasticsearch(hosts=[{'host': host, 'port': port}],
            connection_class=RequestsHttpConnection)
        index = 'fs'
        doc_type = 'fn'
        pg = self.args.page
        ps = self.args.page_size
        body = {
            'highlight': {
                'fields': {
                    'basename': {}
                }
            }
        }
        res = es.search(index=index, doc_type=doc_type, q=self.args.query,
            size=ps, from_=(pg - 1) * ps, sort=['dirname', '_score:desc'],
            _source=False, fields='basename,dirname,filename,size', body=body)
        if self.args.dump:
            pprint(res)
        tab = []
        if self.args.list:
            for h in res['hits']['hits']:
                print('"', h['fields']['filename'][0], '"', sep='')
        else:
            for i, h in enumerate(res['hits']['hits']):
                try:
                    hbn = h['highlight']['basename'][0].replace(
                        '<em>', colorama.Style.BRIGHT).replace(
                        '</em>', colorama.Style.RESET_ALL)
                except KeyError:
                    hbn = h['fields']['basename'][0]
                #print("{} ({:8.7f}): {}".format(hbn, h['_score'], h['fields']['filename'][0]))
                tab.append(collections.OrderedDict([
                    ('#', i + 1),
                    ('basename', hbn),
                    ('size', format_size(h['fields']['size'][0])),
                    ('filename', h['fields']['filename'][0]),
                    ('score', "{:8.7f}".format(h['_score'] or 0.0))
                ]))
            self.print(tab)
        n1 = (pg - 1) * ps + 1
        n2 = pg * ps
        if n2 > res['hits']['total']:
            n2 = res['hits']['total']
        mp = math.ceil(res['hits']['total'] / ps)
        print('{n1}-{n2} of {total} hits, page {pg}/{mp}, {took} ms'.format(
            n1=n1, n2=n2, total=res['hits']['total'], took=res['took'], pg=pg, mp=mp))

    def cmd_es_import(self):
        host, port = self.args.host.split(':')
        port = int(port)
        es = Elasticsearch(hosts=[{'host': host, 'port': port}],
            connection_class=RequestsHttpConnection)
        index = 'fs'
        doc_type = 'fn'
        if self.args.create_index:
            self._create_es_index(es, index, doc_type)

        with open(self.args.file, 'rb') as fh:
            dd = pickle.load(file=fh)
        bulk = []
        for d in dd:
            action = {
                '_index': index,
                '_type': doc_type,
                '_id': d[0]
            }
            body = {
                'filename': d[0],
                'dirname': os.path.dirname(d[0]),
                'basename': os.path.basename(d[0]),
                'size': d[1],
                'mime_type': d[2],
                'meta': d[3]
            }
            bulk.append({'index': action})
            bulk.append(body)
        es.bulk(bulk)

    def _create_es_index(self, es, index, doc_type):
        if es.indices.exists(index=index):
            es.indices.delete(index=index)
        body = {
            'settings': {
                'analysis': {
                    'tokenizer': {
                        'pym_filename_tokenizer': {
                            'type': 'pattern',
                            'pattern': r'[^\p{L}0-9]+'
                        }
                    },
                    'analyzer': {
                        'pym_filename_analyzer': {
                            'type': 'custom',
                            'tokenizer': 'pym_filename_tokenizer',
                            'filter': ['lowercase'],
                        }
                    }
                },
            },
            'mappings': {
                'fn': {
                    'properties': {
                        'filename': {
                            'type': 'string',
                            'analyzer': 'pym_filename_analyzer'
                        },
                        'dirname': {
                            'type': 'string',
                            'analyzer': 'pym_filename_analyzer'
                        },
                        'basename': {
                            'type': 'string',
                            'analyzer': 'pym_filename_analyzer'
                        }
                    }
                }
            }
        }
        res = es.indices.create(index=index, body=body)
        print('Index created:', res)

    def cmd_es(self):
        host, port = self.args.host.split(':')
        port = int(port)
        es = Elasticsearch(hosts=[{'host': host, 'port': port}],
            connection_class=RequestsHttpConnection)

        if self.args.es_cmd.startswith('ix_'):
            cmd = self.args.es_cmd[3:]
            m = getattr(es.indices, cmd)
        else:
            cmd = self.args.es_cmd
            m = getattr(es, cmd)
        aa = self.args.es_args
        args = {aa[i]: aa[i + 1] for i in range(0, len(aa) - 1, 2)}
        pprint(args)
        res = m(**args)
        pprint(res)


def parse_args(app, argv):
    # Main parser
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="""Parenchym command-line interface.""",
        epilog=textwrap.dedent('''\
        Samples:

        pym -c production.ini --format tsv ls group-member > /tmp/a.txt && gnumeric /tmp/a.txt

        pym -c development.ini --format yaml create group '{name: fs_writer, descr: Can write files via FS, tenant_id: 1}'
        '''))
    app.parser = parser
    parser.add_argument(
        '--yes',
        help="Answer all prompts with YES, useful for scripting",
        action='store_true'
    )
    parser.add_argument(
        '--show-sql',
        help="If given, shows SQL query",
        action='store_true'
    )
    app.add_parser_args(parser, (('config', True), ('actor', False),
        ('locale', False), ('format', False), ('verbose', False)))
    parser.add_argument(
        '--tenant',
        required=True,
        help="""A tenant name. All commands work on the filesystem of this
            tenant."""
    )
    subparsers = parser.add_subparsers(title="Commands", dest="subparser_name",
        help="""Type 'pym COMMAND --help'""")

    # Parser cmd ls
    p_ls = subparsers.add_parser('ls',
        help="""List all nodes in given path. Due to a limitation of the API of
            PyFilesystem, the short format does not recognize entries flagged as
            deleted, and shows them unconditionally. Choose long format (-l) to
            see the deleted flag.
        """)
    p_ls.set_defaults(func=app.cmd_ls)
    p_ls.add_argument(
        'path',
        default='/',
        help="Path, default '/'."
    )
    p_ls.add_argument(
        'wildcard',
        nargs='?',
        help="Wildcard to filter output. Treated as regex if starts with '/'"
             " (slash)."
    )
    p_ls.add_argument(
        '--with-deleted',
        help='Show also deleted records',
        action='store_true'
    )
    p_ls.add_argument(
        '--filter',
        help='String to use as WHERE clause'
    )
    p_ls.add_argument(
        '-l', '--long',
        action='store_true',
        help='Long format'
    )

    # Parser cmd mkdir
    p_mkdir = subparsers.add_parser('mkdir',
        help="Creates nodes for given path")
    p_mkdir.set_defaults(func=app.cmd_mkdir)
    p_mkdir.add_argument(
        'path',
        help="Create leaf directory of path."
    )
    p_mkdir.add_argument(
        '-r', '--recursive',
        help='Create all intermediate-level directories needed to contain the'
             ' leaf directory.',
        action='store_true'
    )
    p_mkdir.add_argument(
        '--exist_ok',
        action='store_true',
        help='If exist_ok is False (the default), an FileExistsError is raised'
             ' if the target directory already exists.'
    )

    # Parser cmd delete
    p_delete = subparsers.add_parser('delete',
        help="Removes node at given path")
    p_delete.set_defaults(func=app.cmd_delete)
    p_delete.add_argument(
        'path',
        help="Leaf node of this path is deleted."
    )
    p_delete.add_argument(
        '-r', '--recursive',
        help='Delete also all children',
        action='store_true'
    )
    p_delete.add_argument(
        '--delete-from-db',
        action='store_true',
        help='If set, delete nodes from DB, else they are only flagged as deleted.'
    )
    p_delete.add_argument(
        '--reason',
        required=False,
        help='Optional reason for deletion.'
    )

    # Parser cmd undelete
    p_undelete = subparsers.add_parser('undelete',
        help="Undeletes node at given path")
    p_undelete.set_defaults(func=app.cmd_undelete)
    p_undelete.add_argument(
        'path',
        help="Leaf node of this path is undeleted."
    )
    p_undelete.add_argument(
        '-r', '--recursive',
        help='Undelete also all children',
        action='store_true'
    )

    # Parser cmd rename
    p_rename = subparsers.add_parser('rename',
        help="Renames node at src path to dst")
    p_rename.set_defaults(func=app.cmd_rename)
    p_rename.add_argument(
        'src',
        help="Source path"
    )
    p_rename.add_argument(
        'dst',
        help="Destination path"
    )

    # Parser cmd save
    p_save = subparsers.add_parser('save',
        help="Saves src file to dst path")
    p_save.set_defaults(func=app.cmd_save)
    p_save.add_argument(
        'src',
        help="Source file"
    )
    p_save.add_argument(
        'dst',
        help="Destination path"
    )
    p_save.add_argument(
        '--update',
        action='store_true',
        help='Update existing node'
    )
    p_save.add_argument(
        '--revise',
        action='store_true',
        help='Revise existing node'
    )
    p_save.add_argument(
        '--async',
        action='store_true',
        help='Run asynchronously'
    )
    p_save.add_argument(
        '--meta',
        required=False,
        help='Host:port of TIKA server, or "pipe" to use pipe.'
    )

    # Parser cmd tika
    p_tika = subparsers.add_parser('tika',
        help="Extract meta data and content with TIKA")
    p_tika.set_defaults(func=app.cmd_tika)
    p_tika.add_argument(
        'src',
        help="Source file"
    )
    p_tika.add_argument(
        '--host',
        help='"Host:port" of TIKA server, or path/to/cmd or "tika" to use pipe.'
    )
    p_tika.add_argument(
        '--resource',
        required=True,
        choices=('meta', 'tika', 'rmeta', 'detect', 'unpack', 'pym'),
        help="""Use this resource of TIKA server. If you use 'unpack', we print
            out the TOC of the resulting ZIP file. Pipe to file to save as ZIP
            file. "pym" produces output suitable to store in PymFs."""
    )
    p_tika.add_argument(
        '--type',
        required=False,
        choices=('csv', 'json', 'xmp', 'text', 'html', 'all'),
        help='Resource shall return info in this type.'
    )

    # Parser cmd bulk_save
    p_bulk_save = subparsers.add_parser('bulk-save',
        help="bulk_saves src files to dst path")
    p_bulk_save.set_defaults(func=app.cmd_bulk_save)
    p_bulk_save.add_argument(
        'src',
        help="Source file"
    )
    p_bulk_save.add_argument(
        'dst',
        help="Destination path"
    )
    p_bulk_save.add_argument(
        '--update',
        action='store_true',
        help='Update existing node'
    )
    p_bulk_save.add_argument(
        '--revise',
        action='store_true',
        help='Revise existing node'
    )
    p_bulk_save.add_argument(
        '-j', '--jobs',
        type=int,
        default=1,
        required=False,
        help='Number of concurrent jobs'
    )
    p_bulk_save.add_argument(
        '-r', '--recursive',
        action='store_true',
        help='Recursively collect files'
    )
    p_bulk_save.add_argument(
        '--tika',
        required=False,
        help='"Host:port" of TIKA server, or path/to/cmd or "tika" to use pipe.'
    )

    # Parser collect files from OSFS
    p_collect_osfs = subparsers.add_parser('collect-osfs',
        help="Collect files from OSFS")
    p_collect_osfs.set_defaults(func=app.cmd_collect_osfs)
    p_collect_osfs.add_argument(
        'start_dirs',
        nargs='+',
        help="""List of start directories. Basename may be a glob pattern."""
    )
    p_collect_osfs.add_argument(
        '-j', '--jobs',
        type=int,
        default=1,
        required=False,
        help='Number of concurrent jobs'
    )
    p_collect_osfs.add_argument(
        '-r', '--recursive',
        action='store_true',
        help='Recursively collect files'
    )
    p_collect_osfs.add_argument(
        '--tika',
        required=False,
        help='"Host:port" of TIKA server, or path/to/cmd or "tika" to use pipe.'
    )
    p_collect_osfs.add_argument(
        '-o', '--output',
        required=False,
        help='Write results to this file.'
    )

    # Parser cmd ElasticSearch import
    p_es_import = subparsers.add_parser('es-import',
        help="Import file collection into ElasticSearch server")
    p_es_import.set_defaults(func=app.cmd_es_import)
    p_es_import.add_argument(
        '--host',
        default='localhost:9200',
        help='"Host:port" of es server (default: localhost:9200).'
    )
    p_es_import.add_argument(
        '--create-index',
        action='store_true',
        help='Create index with doc type first.'
    )
    p_es_import.add_argument(
        'file',
        help="""File with pickled data collection, as created e.g. with
            'collect-osfs'."""
    )

    # Parser cmd ElasticSearch
    p_es = subparsers.add_parser('es',
        help="Communicate with ElasticSearch server")
    p_es.set_defaults(func=app.cmd_es)
    p_es.add_argument(
        '--host',
        default='localhost:9200',
        help='"Host:port" of es server (default: localhost:9200).'
    )
    p_es.add_argument(
        'es_cmd',
        help="""Command: Method of the Python ES client. Prefix with 'ix_' to
            use IndicesClient. E.g. "ix_create index foo" to create index "foo".
            See "https://elasticsearch-py.readthedocs.org/en/master/api.html"
            for details."""
    )
    p_es.add_argument(
        'es_args',
        nargs=argparse.REMAINDER,
        help="""Arguments of the given command. Must always be pairs of keyword
         and value."""
    )

    # Parser cmd ElasticSearch search
    p_es_search = subparsers.add_parser('es-search',
        help="Search index 'fs' in ElasticSearch server")
    p_es_search.set_defaults(func=app.cmd_es_search)
    p_es_search.add_argument(
        '--host',
        default='localhost:9200',
        help='"Host:port" of es server (default: localhost:9200).'
    )
    p_es_search.add_argument(
        '-p', '--page',
        type=int,
        default=1,
        required=False,
        help='Page'
    )
    p_es_search.add_argument(
        '--page-size',
        type=int,
        default=50,
        required=False,
        help='Page size'
    )
    p_es_search.add_argument(
        'query',
        help="""Query"""
    )
    p_es_search.add_argument(
        '--dump',
        action='store_true',
        help='Dump raw search results.'
    )
    p_es_search.add_argument(
        '--list',
        action='store_true',
        help='Just list the file names, no tabular display.'
    )

    return parser.parse_args(argv)


def main(argv=None):
    start_time = time.time()
    if not argv:
        argv = sys.argv

    app_name = os.path.basename(argv[0])
    lgg = logging.getLogger('cli.' + app_name)

    # noinspection PyBroadException
    try:
        runner = Runner()
        args = parse_args(runner, argv[1:])
        runner.init_app(args, lgg=lgg, setup_logging=True)
        logging.getLogger().setLevel(logging.WARN)
        lgg.setLevel(logging.WARN)
        if hasattr(args, 'func'):
            args.func()
        else:
            runner.run()
    except Exception as exc:
        lgg.exception(exc)
        lgg.fatal('Program aborted!')
    else:
        lgg.info('Finished.')
    finally:
        lgg.info('Time taken: {}'.format(
            datetime.timedelta(seconds=time.time() - start_time))
        )


if __name__ == '__main__':
    main(sys.argv)
