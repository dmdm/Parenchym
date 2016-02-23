import functools
import pyramid.location

from pym.i18n import _
from pym.tenants.const import DEFAULT_TENANT_NAME
from pym.sys.const import NODE_NAME_SYS, NODE_NAME_SYS_CACHE_MGMT
from pym.me.const import NODE_NAME_ME, NODE_NAME_ME_PROFILE
from pym.fs.const import NODE_NAME_FS
from pym.journals.const import NODE_NAME_JOURNALS, Journals
from pym.help.const import NODE_NAME_HELP
from pym.auth.const import (NODE_NAME_SYS_AUTH_MGR, NODE_NAME_SYS_AUTH_USER_MGR,
                            NODE_NAME_SYS_AUTH_GROUP_MGR,
                            NODE_NAME_SYS_AUTH_GROUP_MEMBER_MGR,
                            NODE_NAME_SYS_AUTH_PERMISSION_MGR)
from pym.tenants.manager import TenantMgr


# TODO Build menus from table pym.resource_tree


# def foo_menu(root_node, url_to, tenant=DEFAULT_TENANT_NAME,
#         translate=lambda s: s):
#     home_node = root_node[tenant]
#     # Foo
#     node0 = home_node[NODE_NAME_FOO]
#     id_ = resource_path(node0)
#     menu = {
#         'id': id_,
#         'text': translate(_("Foo")),
#         'href': url_to(node0),
#         'children': []
#     }
#     # Foo / Bar
#     node = node0[NODE_NAME_FOO_BAR]
#     id_ = resource_path(node)
#     menu['children'].append({
#         'id': id_,
#         'text': translate(_("Bar")),
#         'href': url_to(node)
#     })
#     return menu


def help_menu(request, root_node, url_to, tenant=DEFAULT_TENANT_NAME,
        translate=lambda s: s):
    # Help
    node_help = root_node[NODE_NAME_HELP]
    id_ = resource_path(node_help)
    menu_help = {
        'id': id_,
        'text': translate(_("Help")),
        'href': url_to(node_help),
        'children': []
    }
    return menu_help


def fs_menu(request, root_node, url_to, tenant=DEFAULT_TENANT_NAME,
        translate=lambda s: s):
    ten = TenantMgr.find_tenant_node(request.context)
    # Me
    node_fs = ten[NODE_NAME_FS]
    id_ = resource_path(node_fs)
    menu_fs = {
        'id': id_,
        'text': translate(_("Filesystem")),
        'href': url_to(node_fs, '@@_br_'),
        'children': []
    }
    return menu_fs


def journals_menu(root_node, url_to, tenant=DEFAULT_TENANT_NAME,
        translate=lambda s: s):
    # Journals
    node_journals = root_node[tenant][NODE_NAME_JOURNALS]
    id_ = resource_path(node_journals)
    menu_journals = {
        'id': id_,
        'text': translate(_("Journals")),
        'href': url_to(node_journals),
        'children': []
    }
    # Individual journals
    for j in Journals:
        node_j = node_journals
        id_ = resource_path(node_j)
        menu_journals['children'].append({
            'id': id_,
            'text': j.value['title'],
            'href': url_to(node_j, j.value['name']),
            'children': []
        })
    return menu_journals


def me_menu(root_node, url_to, tenant=DEFAULT_TENANT_NAME,
        translate=lambda s: s):
    # Me
    node_me = root_node[NODE_NAME_ME]
    id_ = resource_path(node_me)
    menu_me = {
        'id': id_,
        'text': translate(_("Me")),
        'href': url_to(node_me),
        'children': []
    }
    # Me / Profile
    node_profile = node_me[NODE_NAME_ME_PROFILE]
    id_ = resource_path(node_profile)
    menu_me['children'].append({
        'id': id_,
        'text': translate(_("Profile")),
        'href': url_to(node_profile),
        'children': []
    })
    return menu_me


def sys_menu(root_node, url_to, tenant=DEFAULT_TENANT_NAME,
        translate=lambda s: s):
    # Sys
    node_sys = root_node[NODE_NAME_SYS]
    id_ = resource_path(node_sys)
    menu_sys = {
        'id': id_,
        'text': translate(_("System")),
        'href': url_to(node_sys),
        'children': []
    }
    # Sys / AuthMgr
    node_auth_mgr = node_sys[NODE_NAME_SYS_AUTH_MGR]
    id_ = resource_path(node_auth_mgr)
    menu_sys['children'].append({
        'id': id_,
        'text': translate(_("AuthMgmt")),
        'href': url_to(node_auth_mgr),
        'children': []
    })
    # Sys / AuthMgr / Users
    node = node_auth_mgr[NODE_NAME_SYS_AUTH_USER_MGR]
    id_ = resource_path(node)
    menu_sys['children'][-1]['children'].append({
        'id': id_,
        'text': translate(_("Users")),
        'href': url_to(node)
    })
    # Sys / AuthMgr / Groups
    node = node_auth_mgr[NODE_NAME_SYS_AUTH_GROUP_MGR]
    id_ = resource_path(node)
    menu_sys['children'][-1]['children'].append({
        'id': id_,
        'text': translate(_("Groups")),
        'href': url_to(node)
    })
    # Sys / AuthMgr / GroupMembers
    node = node_auth_mgr[NODE_NAME_SYS_AUTH_GROUP_MEMBER_MGR]
    id_ = resource_path(node)
    menu_sys['children'][-1]['children'].append({
        'id': id_,
        'text': translate(_("Group Members")),
        'href': url_to(node)
    })
    # Sys / AuthMgr / Perms
    node = node_auth_mgr[NODE_NAME_SYS_AUTH_PERMISSION_MGR]
    id_ = resource_path(node)
    menu_sys['children'][-1]['children'].append({
        'id': id_,
        'text': translate(_("Permissions")),
        'href': url_to(node)
    })
    # Sys / CacheMgmt
    node = node_sys[NODE_NAME_SYS_CACHE_MGMT]
    id_ = resource_path(node)
    menu_sys['children'].append({
        'id': id_,
        'text': translate(_("Cache Management")),
        'href': url_to(node)
    })
    return menu_sys


def main_menu(request, root_node, url_to, tenant=DEFAULT_TENANT_NAME,
        translate=lambda s: s):
    menu = [
        me_menu(root_node, url_to, tenant, translate),
        journals_menu(root_node, url_to, tenant, translate),
        sys_menu(root_node, url_to, tenant, translate),
        fs_menu(request, root_node, url_to, tenant, translate),
        help_menu(request, root_node, url_to, tenant, translate)
    ]
    return menu


def resource_path(resource, *elements):
    """
    Works as ``pyramid.traversal.resource_path()`` except does not quote
    or escape elements.
    """
    # joining strings is a bit expensive so we delegate to a function
    # which caches the joined result for us.
    # Borrowed from pyramid.traversal.
    return _join_tuple(resource_path_tuple(resource, *elements))


def resource_path_tuple(resource, *elements):
    """
    Borrowed from ``pyramid.traversal.resource_path_tuple()``.
    """
    return tuple(_resource_path_list(resource, *elements))


def _resource_path_list(resource, *elements):
    """ Implementation detail shared by resource_path and resource_path_tuple"""
    path = [loc.__name__ or '' for loc in pyramid.location.lineage(resource)]
    path.reverse()
    path.extend(elements)
    return path


@functools.lru_cache(maxsize=128)
def _join_tuple(some_tuple):
    return some_tuple and '/'.join([x for x in some_tuple]) or '/'
