from pyramid.view import view_config, view_defaults

from ..models import IAuthMgrNode


_ = lambda s: s


@view_defaults(
    context=IAuthMgrNode,
    permission='manage_auth'
)
class UsrMgrView(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @view_config(
        name='',
        renderer='pym:auth/templates/index.mako',
    )
    def index(self):
        return dict()
