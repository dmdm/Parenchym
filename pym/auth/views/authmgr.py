from pyramid.view import view_defaults, view_config

from ..models import IAuthMgrNode


@view_defaults(
    context=IAuthMgrNode,
    permission='visit'
)
class AuthMgr(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @view_config(
        name='',
        renderer='authmgr.mako'
    )
    def index(self):
        return dict()
