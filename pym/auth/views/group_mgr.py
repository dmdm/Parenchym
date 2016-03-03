from pyramid.view import view_defaults, view_config

from ..models import IGroupMgrNode


@view_defaults(
    context=IGroupMgrNode,
    permission='visit'
)
class GroupMgr(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @view_config(
        name='',
        renderer='group_mgr.mako'
    )
    def index(self):
        return dict()
