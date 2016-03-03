from pyramid.view import view_defaults, view_config

from ..models import IPermissionMgrNode


@view_defaults(
    context=IPermissionMgrNode,
    permission='visit'
)
class UserMgr(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @view_config(
        name='',
        renderer='permission_mgr.mako'
    )
    def index(self):
        return dict()
