from .const import *


def linkto_me(request, path, *elements, **kw):
    dst_node = request.root
    if path == '':
        dst_node = dst_node[NODE_NAME_ME]
    elif path == 'profile':
        dst_node = dst_node[NODE_NAME_ME][NODE_NAME_ME_PROFILE]
    return request.resource_url(dst_node, *elements, **kw)
