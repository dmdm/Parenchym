from pyramid.view import view_config, view_defaults
from ..models import ISysNode, ISysCacheMgmtNode


@view_defaults(
    permission='view'
)
class SysView(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request
        self.urls = {}

    @view_config(
        name='',
        context=ISysNode,
        renderer='index.mako',
        request_method='GET'
    )
    def index(self):
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc,
        }

    @view_config(
        name='',
        context=ISysCacheMgmtNode,
        renderer='cache_mgmt.mako',
        request_method='GET'
    )
    def cache_mgmt(self):
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc,
        }
