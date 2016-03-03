from pyramid.view import view_defaults, view_config

from ..models import IUserMgrNode


@view_defaults(
    context=IUserMgrNode,
    permission='visit'
)
class UserMgr(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @view_config(
        name='',
        renderer='user_mgr.mako'
    )
    def index(self):
        return dict()
