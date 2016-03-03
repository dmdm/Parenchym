import pyramid.security
from .const import NODE_NAME_SYS, NODE_NAME_SYS_CACHE_MGMT


def _find_dst_node(request, path):
    dst_node = request.root
    if path == '':
        dst_node = dst_node[NODE_NAME_SYS]
    elif path == 'cache_mgmt':
        dst_node = dst_node[NODE_NAME_SYS][NODE_NAME_SYS_CACHE_MGMT]
    return dst_node


def linkto_sys(request, path, *elements, **kw):
    dst_node = _find_dst_node(request, path)
    return request.resource_url(dst_node, *elements, **kw)


def execution_permitted_sys(request, path, name=''):
    dst_node = _find_dst_node(request, path)
    return pyramid.security.view_execution_permitted(dst_node, request, name)
