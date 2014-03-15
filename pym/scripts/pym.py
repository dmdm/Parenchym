# -*- coding: utf-8 -*-

"""
``pym`` has several subcommands to manage your Pym setup: you can
manage principals (users), roles and role memberships as well as install new
sites and check the integrity of existing sites.

The subcommands are::

    list-principals     List principals
    create-principal       Create principal
    update-principal    Update principal with given ID
    delete-principal    Delete principal with given ID
    list-roles          List roles
    create-role            Create role
    update-role         Update role with given ID
    delete-role         Delete role with given ID
    list-rolemembers    List rolemembers
    create-rolemember      Create rolemember
    delete-rolemember   Delete rolemember with given ID

Type ``pym -h`` for general help and a list of the subcommands,
``pym subcommand -h`` to get help for that subcommand.

``pym`` allows you to use different formats for input and output.
Choices are json, yaml (default) and tsv.

Tsv is handy if you want to review the output in a spreadsheet::

    pym -c production.ini --format tsv list-principals > a && gnumeric a

Both, json and yaml allow inline-style. Here is an example of inline YAML::

    pym -c production.ini --format yaml create-principal \\
        '{principal: FOO5, email: foo5@here, pwd: FOO, roles: [foo, bar]}'
    TTY? True
    Locale? en_GB UTF-8
    id: 106
    display_name: FOO5
    email: foo5@here
    first_name: null
    gui_token: null
    identity_url: null
    is_blocked: false
    is_enabled: false
    last_name: null
    login_time: null
    notes: null
    prev_login_time: null
    principal: FOO5
    pwd: FOO
    owner: 2
    ctime: '2012-12-07 07:47:23'
    editor: null
    mtime: null
    role_names:
    - foo
    - bar
    - users
    Done.

Here is an example of creating a new site::

    pym -c production.ini --format yaml create-site '{sitename: www.new-site.com, principal: {principal: sally, email: sally@example.com, pwd: FOO, first_name: Sally, last_name: Müller-Lüdenscheidt, roles: [some_role, other_role]}, title: Neue Site, site_template: default}'
    TTY? True
    Locale? en_GB UTF-8
    Proceed to create a site in /tmp/sites (yes/NO)? yes
    Copied template [...]/var/site-templates/default
    Createed role 'www.new-site.com' (108)
    Createed principal 'sally' (111)
    Set principal 'sally' as member of role 'www.new-site.com'
    Done.

To get an overview, which user is in which role, and if there are orphans (should not),
do::

    pym -c production.ini --format tsv list-rolemembers > a && gnumeric a

"""

import os
import sys
import transaction
import argparse
import yaml
from pprint import pprint
from collections import OrderedDict
import json
import datetime

from pyramid.paster import (
    get_appsettings,
    setup_logging,
    )

import pym.models
import pym.lib
import pym.cli
from pym.rc import Rc
import pym.authmgr.manager as usrmanager


# Init YAML to dump an OrderedDict like a regular dict, i.e.
# without creating a specific object tag.
def _represent_ordereddict(self, data):
    return self.represent_mapping('tag:yaml.org,2002:map', data.items())

yaml.add_representer(OrderedDict, _represent_ordereddict)


class PymCli(pym.cli.Cli):

    def __init__(self):
        super().__init__()

    def list_principals(self):
        from pym.authmgr.models import User
        qry = self._build_query(User)
        data = self._db_data_to_list(qry,
            fkmaps=dict(roles=lambda it: it.name))
        self._print(data)

    def create_principal(self):
        data = self._parse(self.args.data)
        data['owner'] = pym.authmgr.const.ROOT_UID
        rs = usrmanager.create_principal(data)
        self._print(self._db_data_to_list([rs],
            fkmaps=dict(role_names=lambda it: it))[0])

    def update_principal(self):
        data = self._parse(self.args.data)
        data['editor'] = pym.authmgr.const.ROOT_UID
        data['mtime'] = datetime.datetime.now()
        rs = usrmanager.update_principal(data)
        self._print(self._db_data_to_list([rs])[0])

    def delete_principal(self):
        rs = usrmanager.delete_principal(self.args.id)

    def list_roles(self):
        from pym.authmgr.models import Group
        qry = self._build_query(Group)
        data = self._db_data_to_list(qry)
        self._print(data)

    def create_role(self):
        data = self._parse(self.args.data)
        data['owner'] = pym.authmgr.const.ROOT_UID
        rs = usrmanager.create_role(data)
        self._print(self._db_data_to_list([rs])[0])

    def update_role(self):
        data = self._parse(self.args.data)
        data['editor'] = pym.authmgr.const.ROOT_UID
        data['mtime'] = datetime.datetime.now()
        rs = usrmanager.update_role(data)
        self._print(self._db_data_to_list([rs])[0])

    def delete_role(self):
        rs = usrmanager.delete_role(self.args.id)

    def list_rolemembers(self):
        from pym.authmgr.models import User, Group, GroupMember
        # Outer join to make orphans visible
        qry = self._build_query(GroupMember) \
            .outerjoin(Group) \
            .outerjoin(User, GroupMember.principal_id == User.id) \
            .create_columns(
                GroupMember.id,
                Group.id,
                Group.name,
                User.id,
                User.principal,
                User.is_enabled,
                User.is_blocked,
                GroupMember.owner,
                GroupMember.ctime
            )
        fields = ['id', 'role_id', 'role', 'principal_id', 'principal',
            'is_enabled', 'is_blocked', 'owner', 'ctime']
        data = []
        for row in qry.all():
            data.append(OrderedDict(zip(fields, row[1:])))
        self._print(data)

    def create_rolemember(self):
        data = self._parse(self.args.data)
        data['owner'] = pym.authmgr.const.ROOT_UID
        rs = usrmanager.create_rolemember(data)
        self._print(self._db_data_to_list([rs])[0])

    def delete_rolemember(self):
        rs = usrmanager.delete_rolemember(self.args.id)

    def create_model(self):
        # Import all modules with models here, so that
        # create_all() notices them.
        import pym.models
        import pym.vmailmgr.models
        pym.models.create_all()


def main(argv=sys.argv):
    cli = PymCli()

    # Main parser
    parser = argparse.ArgumentParser(description="""Pym command-line
        interface.""",
        epilog="""
        Samples:

        pym -c production.ini --format tsv list-rolemembers --order
        'role_name, principal_principal' > /tmp/a.txt && gnumeric /tmp/a.txt
        """)
    parser.add_argument('-l', '--locale', help="""Set the desired locale.
        If omitted and output goes directly to console, we automatically use
        the console's locale.""")
    parser.add_argument('-c', '--config', required=True,
        help="""Path to INI file with configuration,
            e.g. 'production.ini'""")
    parser.add_argument('-f', '--format', default='yaml',
        choices=['yaml', 'json', 'tsv', 'txt'],
        help="Set format for input and output")
    parser.add_argument('--dry-run', action="store_true",
        help="The database changes will be rolled back.")
    subparsers = parser.add_subparsers(title="Commands", dest="subparser_name",
        help="""Type 'pym COMMAND --help'""")

    # Parent parser for DB editing
    parser_db_edit = argparse.ArgumentParser(description="Database editing",
        add_help=False)
    parser_db_edit.add_argument('data',
        help="The data. For updates, field ID must be present.")

    # Parent parser for DB deleting
    parser_db_delete = argparse.ArgumentParser(description="Database deleting",
        add_help=False)
    parser_db_delete.add_argument('id', type=int,
        help="The ID")

    # Parent parser for DB listers
    parser_db_lister = argparse.ArgumentParser(description="Database lister",
        add_help=False)
    parser_db_lister.add_argument('idlist', nargs='*', type=int, metavar='ID',
        help="""Filter by these IDs""")
    parser_db_lister.add_argument('--filter',
        help="""Define filter with literal SQL (WHERE clause, e.g. 'id between
        200 and 300')""")
    parser_db_lister.add_argument('--order',
        help="""Define sort order with literal SQL (ORDER BY clause, e.g. 'name
        DESC')""")

    # Parser cmd list-principals
    parser_list_principals = subparsers.add_parser('list-principals',
        parents=[parser_db_lister],
        help="List principals")
    parser_list_principals.set_defaults(func=cli.list_principals)

    # Parser cmd create-principal
    parser_create_principal = subparsers.add_parser('create-principal',
        parents=[parser_db_edit],
        help="Create principal",
        epilog="""You might want to try command 'list-principals'
            to see which fields are available."""
    )
    parser_create_principal.set_defaults(func=cli.create_principal)

    # Parser cmd update-principal
    parser_update_principal = subparsers.add_parser('update-principal',
        parents=[parser_db_edit],
        help="Update principal with given ID",
        epilog="""You might want to try command 'list-principals'
            to see which fields are available."""
    )
    parser_update_principal.set_defaults(func=cli.update_principal)

    # Parser cmd delete-principal
    parser_delete_principal = subparsers.add_parser('delete-principal',
        parents=[parser_db_delete],
        help="Delete principal with given ID",
    )
    parser_delete_principal.set_defaults(func=cli.delete_principal)

    # Parser cmd list-roles
    parser_list_roles = subparsers.add_parser('list-roles',
        parents=[parser_db_lister],
        help="List roles")
    parser_list_roles.set_defaults(func=cli.list_roles)

    # Parser cmd create-role
    parser_create_role = subparsers.add_parser('create-role',
        parents=[parser_db_edit],
        help="Create role")
    parser_create_role.set_defaults(func=cli.create_role)

    # Parser cmd update-role
    parser_update_role = subparsers.add_parser('update-role',
        parents=[parser_db_edit],
        help="Update role with given ID")
    parser_update_role.set_defaults(func=cli.update_role)

    # Parser cmd delete-role
    parser_delete_role = subparsers.add_parser('delete-role',
        parents=[parser_db_delete],
        help="Delete role with given ID")
    parser_delete_role.set_defaults(func=cli.delete_role)

    # Parser cmd list-rolemembers
    parser_list_rolemembers = subparsers.add_parser('list-rolemembers',
        parents=[parser_db_lister],
        help="List rolemembers")
    parser_list_rolemembers.set_defaults(func=cli.list_rolemembers)

    # Parser cmd create-rolemember
    parser_create_rolemember = subparsers.add_parser('create-rolemember',
        parents=[parser_db_edit],
        help="Create rolemember")
    parser_create_rolemember.set_defaults(func=cli.create_rolemember)

    # Parser cmd delete-rolemember
    parser_delete_rolemember = subparsers.add_parser('delete-rolemember',
        parents=[parser_db_delete],
        help="Delete rolemember with given ID")
    parser_delete_rolemember.set_defaults(func=cli.delete_rolemember)

    # Parser cmd create-model
    parser_create_model = subparsers.add_parser('create-model',
        help="Create the DB model")
    parser_create_model.set_defaults(func=cli.create_model)

    # Parse args and run command
    args = parser.parse_args()
    ###pprint(args); sys.exit()
    pym.lib.init_cli_locale(args.locale, print_info=True)
    cli.init_app(args)
    transaction.begin()
    try:
        args.func()
        if args.dry_run:
            transaction.abort()
        else:
            transaction.commit()
    except:
        transaction.abort()
        raise
    print("Done.", file=sys.stderr)
