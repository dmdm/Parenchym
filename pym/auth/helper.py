from pym.sys.const import NODE_NAME_SYS
from .const import (
    NODE_NAME_SYS_AUTH_MGR,
    NODE_NAME_SYS_AUTH_USER_MGR,
    NODE_NAME_SYS_AUTH_GROUP_MGR,
    NODE_NAME_SYS_AUTH_GROUP_MEMBER_MGR,
    NODE_NAME_SYS_AUTH_PERMISSION_MGR
)


def linkto_auth(request, path, *elements, **kw):
    elements = list(elements)
    dst_node = request.root
    if path == 'login':
        elements = ['@@login'] + elements
    elif path == 'logout':
        elements = ['logout'] + elements
    elif path == '':
        dst_node = dst_node[NODE_NAME_SYS][NODE_NAME_SYS_AUTH_MGR]
    elif path == 'user_mgr':
        dst_node = dst_node[NODE_NAME_SYS][NODE_NAME_SYS_AUTH_MGR][NODE_NAME_SYS_AUTH_USER_MGR]
    elif path == 'group_mgr':
        dst_node = dst_node[NODE_NAME_SYS][NODE_NAME_SYS_AUTH_MGR][NODE_NAME_SYS_AUTH_GROUP_MGR]
    elif path == 'group_member_mgr':
        dst_node = dst_node[NODE_NAME_SYS][NODE_NAME_SYS_AUTH_MGR][NODE_NAME_SYS_AUTH_GROUP_MEMBER_MGR]
    elif path == 'permission_mgr':
        dst_node = dst_node[NODE_NAME_SYS][NODE_NAME_SYS_AUTH_MGR][NODE_NAME_SYS_AUTH_PERMISSION_MGR]
    return request.resource_url(dst_node, *elements, **kw)
