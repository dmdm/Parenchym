#!/usr/bin/env python
from collections import OrderedDict
import getpass
import textwrap
import dateutil.tz
from sqlalchemy.engine import reflection
import sqlparse

import transaction
import time
import argparse
import logging
import sys
import os
import datetime
import redis
import sqlalchemy as sa
import sqlalchemy.sql.expression
import sqlalchemy.orm
import sqlalchemy.orm.exc
import alembic.command
import alembic.config
from zope.sqlalchemy import mark_changed
from pym.auth.const import SYSTEM_UID
import pym.cli
import pym.exc
import pym.auth.models
import pym.auth.manager
from pym.fs.api import PymFs
from pym.fs.const import NODE_NAME_FS
import pym.res.const
import pym.res.models
import pym.tenants.models
from pprint import pprint
from pym.models import dictate_iter, dictate, DbEngine
import pym.fs.models
import pym.fs.manager


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
        self.fs = PymFs(self.sess, self.fs_root, self.actor)

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
        with transaction.manager:
            self.fs.reinit()
            self.fs.save(self.args.src, self.args.dst)









    #
    # def _cmd_ls_resources(self):
    #     e = self.__class__.ENTITIES[self.args.entity]
    #     qry = self.sess.query(e)
    #     qry = self._build_query(qry, e)
    #     data = dictate_iter(qry)
    #     self.print(data)
    #
    # def cmd_create(self):
    #     ent = self.args.entity
    #     data = self.parse(self.args.data)
    #     if 'owner_id' in data:
    #         del data['owner_id']
    #     data['owner'] = self._actor
    #     with transaction.manager:
    #         if ent == 'user':
    #             e = authmgr.create_user(sess=self.sess, **data)
    #         elif ent == 'group':
    #             e = authmgr.create_group(sess=self.sess, **data)
    #         elif ent == 'group-member':
    #             e = authmgr.create_group_member(sess=self.sess, **data)
    #         elif ent == 'tenant':
    #             self._cmd_create_tenant()
    #         elif ent == 'permission':
    #             self._cmd_create_permission()
    #         elif ent == 'resource':
    #             self._cmd_create_resource()
    #         else:
    #             raise ValueError("Unknown entity: '{}'".format(ent))
    #         self.lgg.info("{} created with ID {}".format(ent, e.id))
    #
    # def cmd_update(self):
    #     ent = self.args.entity
    #     id_ = self.args.id
    #     data = self.parse(self.args.data)
    #     if 'editor_id' in data:
    #         del data['editor_id']
    #     data['editor'] = self._actor
    #     with transaction.manager:
    #         if ent == 'user':
    #             self._cmd_update_user()
    #         elif ent == 'group':
    #             self._cmd_update_group()
    #         elif ent == 'group-member':
    #             self._cmd_update_group_members()
    #         elif ent == 'tenant':
    #             self._cmd_update_tenant()
    #         elif ent == 'permission':
    #             self._cmd_update_permission()
    #         elif ent == 'resource':
    #             self._cmd_update_resource()
    #         elif ent == 'ace':
    #             self._cmd_update_ace()
    #         else:
    #             raise ValueError("Unknown entity: '{}'".format(ent))
    #         self.lgg.info('{} {} updated'.format(ent, id_))
    #
    # def cmd_delete(self):
    #     ent = self.args.entity
    #     id_ = self.args.id
    #     answer = 'y' if self.args.yes else input(
    #         "Are you sure to delete {} {} (y/n)? ".format(ent, id_)).lower()
    #     if answer == 'y':
    #         with transaction.manager:
    #             if ent == 'user':
    #                 authmgr.delete_user(
    #                     sess=self.sess,
    #                     user=id_,
    #                     deleter=self._actor,
    #                     deletion_reason=self.args.deletion_reason,
    #                     delete_from_db=self.args.delete_from_db
    #                 )
    #             elif ent == 'group':
    #                 authmgr.delete_group(
    #                     sess=self.sess,
    #                     group=id_,
    #                     deleter=self._actor,
    #                     deletion_reason=self.args.deletion_reason,
    #                     delete_from_db=self.args.delete_from_db
    #                 )
    #             elif ent == 'group-member':
    #                 authmgr.delete_group_member(
    #                     sess=self.sess,
    #                     group_member=id_
    #                 )
    #             elif ent == 'ace':
    #                 authmgr.delete_ace(
    #                     sess=self.sess,
    #                     ace_id=id_,
    #                     deleter=self._actor,
    #                     delete_from_db=self.args.delete_from_db
    #                 )
    #             else:
    #                 raise ValueError("Unknown entity: '{}'".format(ent))
    #             self.lgg.info('{} {} deleted'.format(ent, id_))

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

    # # Parser cmd create
    # p_create = subparsers.add_parser('create',
    #     formatter_class=argparse.RawDescriptionHelpFormatter,
    #     help="Create an entity",
    #     description=textwrap.dedent('''\
    #     Examples of data:
    #
    #     user: '{is_enabled: bool, principal: str, pwd: str, email: str, display_name: str, groups: [group-names|IDs]}'
    #     group: '{name: str, tenant_id: None|ID, kind=None|str, descr: str}'
    #     group-member: '{group: ID|name, member_user|member_group: ID|principal|name}'
    #
    #     ''')
    # )
    # p_create.set_defaults(func=app.cmd_create)
    # p_create.add_argument(
    #     'entity',
    #     help='Entity',
    #     choices=list(sorted(Runner.ENTITIES.keys()))
    # )
    # p_create.add_argument(
    #     'data',
    #     help='Data as YAML or JSON, as set with --format'
    # )
    #
    # # Parser cmd update
    # p_update = subparsers.add_parser('update',
    #     help="Update an entity")
    # p_update.set_defaults(func=app.cmd_update)
    # p_update.add_argument(
    #     '--id',
    #     help='ID of the entity to update',
    #     required=True
    # )
    # p_update.add_argument(
    #     'entity',
    #     help='Entity',
    #     choices=list(sorted(Runner.ENTITIES.keys()))
    # )
    # p_update.add_argument(
    #     'data',
    #     help='Data as YAML or JSON, as set with --format'
    # )
    #
    # # Parser cmd delete
    # p_delete = subparsers.add_parser('delete',
    #     help="Delete an entity")
    # p_delete.set_defaults(func=app.cmd_delete)
    # p_delete.add_argument(
    #     '--delete-from-db',
    #     action='store_true',
    #     default=False,
    #     help='If given, entities are deleted from database, else only marked as'
    #          ' deleted'
    # )
    # p_delete.add_argument(
    #     '--deletion-reason',
    #     help='Reason for the deletion',
    #     default=None
    # )
    # ee = sorted(list(Runner.ENTITIES.keys()) + ['ace'])
    # p_delete.add_argument(
    #     'entity',
    #     help='Entity',
    #     choices=ee
    # )
    # p_delete.add_argument(
    #     'id',
    #     help='ID of the entity to delete'
    # )
    #
    # # Parser cmd allow
    # p_allow = subparsers.add_parser('allow',
    #     help="Allow a permission")
    # p_allow.set_defaults(func=app.cmd_allow)
    # p_allow.add_argument(
    #     'resource_id',
    #     help='Allow permission on this resource (ID)'
    # )
    # p_allow.add_argument(
    #     'permission',
    #     help='Allow this permission (name or ID)'
    # )
    # p_allow.add_argument(
    #     'who',
    #     help='Allow to this group (name or ID) or user (principal or ID). Prefix'
    #          'group with "g:" and user with "u:"'
    # )

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
