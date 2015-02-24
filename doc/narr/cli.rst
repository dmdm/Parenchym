Parenchym On The Console
========================

Parenchym contains a command-line tool ``pym`` (``pym/scripts/pym.py``).

It understands various commands to manage the basic entites of Parenchym, like
users, groups, tenants, resources etc.

It works like ``git`` in that you call ``pym`` with sub-commands. There are global options,
to be written before the sub-command, and options specific to that sub-command.

Help is available as::

    pym --help
    pym SUB-COMMAND --help

You need to always tell ``pym`` which configuration to load.


Displaying Information
----------------------

Parenchym has various entites in a tree structure. For example, display the
resource-tree::

    pym -c development.ini resource-tree

::

    root (4)
      default (13)
        journals (24)
      __fs__ (29)
      me (16)
        profile (28)
      sys (5)
        auth_mgr (7)
          group_member_mgr (10)
          group_mgr (9)
          permission_mgr (11)
          tenant_mgr (12)
          user_mgr (8)
        cache_mgmt (6)

The number in brackets is the ID in the database, i.e. their primary key.

To get more information and also show the ACL for each resource, type::

    pym -c development.ini  resource-tree -v --with-acl

::

    +-----------------------------+------------------------------+-------------------------------------+------+----------------------+----------------------+------------------+
    | Resource                    | ACL                          | Interface                           | Kind | Title                | Short Title          | Slug             |
    +-----------------------------+------------------------------+-------------------------------------+------+----------------------+----------------------+------------------+
    | root (4)                    | g:users ALLOW visit (4)      | pym.res.models.IRootNode            | res  | Root                 | Root                 | root             |
    |                             | g:wheel ALLOW * (3)          |                                     |      |                      |                      |                  |
    |   default (13)              |                              | pym.tenants.models.ITenantNode      | res  | Default              | Default              | default          |
    |     journals (24)           | g:users ALLOW read (9)       | pym.journals.models.IJournalsNode   | res  | Journals             | Journals             | journals         |
    |   __fs__ (29)               | g:fs_writer ALLOW write (13) | pym.fs.models.IFsNode               | res  | Filesystem           | Filesystem           | __fs__           |
    |                             | g:wheel ALLOW write (10)     |                                     |      |                      |                      |                  |
    |   me (16)                   | g:users ALLOW write (6)      | pym.me.models.IMeNode               | res  | Me                   | Me                   | me               |
    |     profile (28)            |                              | pym.me.models.IMeProfileNode        | res  | Profile              | Profile              | profile          |
    |   sys (5)                   |                              | pym.sys.models.ISysNode             | res  | Sys                  | Sys                  | sys              |
    |     auth_mgr (7)            |                              | pym.auth.models.IAuthMgrNode        | res  | AuthManager          | AuthManager          | auth_mgr         |
    |       group_member_mgr (10) |                              | pym.auth.models.IGroupMemberMgrNode | res  | Group Member Manager | Group Member Manager | group_member_mgr |
    |       group_mgr (9)         |                              | pym.auth.models.IGroupMgrNode       | res  | Group Manager        | Group Manager        | group_mgr        |
    |       permission_mgr (11)   |                              | pym.auth.models.IPermissionMgrNode  | res  | Permission Manager   | Permission Manager   | permission_mgr   |
    |       tenant_mgr (12)       |                              | pym.tenants.models.ITenantMgrNode   | res  | Tenant Manager       | Tenant Manager       | tenant_mgr       |
    |       user_mgr (8)          |                              | pym.auth.models.IUserMgrNode        | res  | User Manager         | User Manager         | user_mgr         |
    |     cache_mgmt (6)          |                              | pym.sys.models.ISysCacheMgmtNode    | res  | CacheMgmt            | CacheMgmt            | cache_mgmt       |
    +-----------------------------+------------------------------+-------------------------------------+------+----------------------+----------------------+------------------+

With the sub-command ``ls`` you basically dump the contents of the
corresponding table.  ``pym`` can generate the output as YAML, JSON, TSV
(tab-separated) or, formatted as a table like above (TXT).  For example::

    pym -c development.ini --format txt ls group

::

    +-----+-----------+---------+--------------+--------+----------------------------------------+----------+----------------------------+-----------+-------+------------+-------+-----------------+
    | id  | tenant_id | tenant  | name         | kind   | descr                                  | owner_id | ctime                      | editor_id | mtime | deleter_id | dtime | deletion_reason |
    +-----+-----------+---------+--------------+--------+----------------------------------------+----------+----------------------------+-----------+-------+------------+-------+-----------------+
    | 1   | None      | None    | system       | None   | None                                   | 1        | 2014-12-24 21:01:27.996209 | None      | None  | None       | None  | None            |
    | 2   | None      | None    | wheel        | system | Site Admins                            | 1        | 2014-12-24 21:01:27.996209 | None      | None  | None       | None  | None            |
    | 10  | None      | None    | users        | system | Authenticated Users                    | 1        | 2014-12-24 21:01:27.996209 | None      | None  | None       | None  | None            |
    | 98  | None      | None    | unit testers | system | Unit Testers                           | 1        | 2014-12-24 21:01:27.996209 | None      | None  | None       | None  | None            |
    | 99  | None      | None    | everyone     | system | Everyone (incl. unauthenticated users) | 1        | 2014-12-24 21:01:27.996209 | None      | None  | None       | None  | None            |
    | 101 | None      | None    | default      | tenant | All members of tenant default          | 1        | 2014-12-24 21:01:27.996209 | None      | None  | None       | None  | None            |
    | 106 | 1         | default | fs_writer    | system | Can write files via FS                 | 107      | 2015-01-01 00:54:15.962160 | None      | None  | None       | None  | None            |
    +-----+-----------+---------+--------------+--------+----------------------------------------+----------+----------------------------+-----------+-------+------------+-------+-----------------+

If you like to get a full list of your user accounts and want them to edit in
your favourite spreadsheet program, type this::

    pym -c development.ini --format tsv ls user > /tmp/a.txt && gnumeric /tmp/a.txt


Editing Entities
----------------

``pym`` can handle the basic CRUD operations, CREATE, UPDATE and DELETE. It performs each
of these commands on behalf of an user, an actor. By default ``pym`` uses the user
account with which you are currently logged in the console. You *must* have an
entry in Parenchym's user table with a corresponding principal, then.

Alternatively, you may specify a different user with the ``--actor`` option.

To create and update an entity, you have to tell ``pym`` about the involved data, either
in YAML format or in JSON, both in in-line style. Quote this string to avoid the shell
interpreting special characters, and tell ``pym`` with the ``--format`` option which
format you use.


Some Examples
-------------

**Create a group**

We create a group that belongs to the default tenant (ID 1)::

    pym -c development.ini --format yaml --actor 107 create group '{name: fs_writer, descr: Can write files via FS, tenant_id: 1}'

107 is the ID of the user record who will become the owner of the group record.

**Create Access Control Entry**

An Access Control Entry (ACE) is attached to a specific resource and tells who
(group, user) is allowed or denied a specific permission::

    pym -c development.ini --actor 107 allow 13 write g:106

Here we allow group with ID 106 the write permission on resource with ID 13.

Resources, and groups too, are structured hierachically and their name has
to be unique only on the same hierarchy level. Therefore they cannot be easily
uniquely identified by their name, and we must use their ID here.

**Filter Output**

With the ``--filter`` option you can define an arbitrary SQL WHERE clause as a string.
Some table or column names must be quoted to avoid clashing with SQL words.

Show all members of group "wheel"::

    pym -c development.ini --format txt --actor 107 --show-sql ls group-member --filter "\"group\".name = 'wheel'"

The option ``--show-sql`` here prints out the used SQL query. This helps you
to identify the correct column names, especially for columns of tables that are joined
with an alias.

