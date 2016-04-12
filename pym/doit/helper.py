from .const import *


def linkto_doit(request, path, *elements, **kw):
    dst_node = request.root
    if path == '':
        dst_node = dst_node[NODE_NAME_DOIT]
    return request.resource_url(dst_node, *elements, **kw)
