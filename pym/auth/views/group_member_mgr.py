from pyramid.view import view_defaults, view_config

from ..models import IGroupMemberMgrNode


@view_defaults(
    context=IGroupMemberMgrNode,
    permission='visit'
)
class GroupMemberMgr(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request

    @view_config(
        name='',
        renderer='group_member_mgr.mako'
    )
    def index(self):
        return dict()
