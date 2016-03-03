import logging
from pyramid.view import view_config, view_defaults
import pyramid.i18n
from pym.lib import json_serializer
from pym.me.models import IMeProfileNode
from pym.i18n import _
import pym.auth.models as pam
from pym.models import DbSession, todict


@view_defaults(
    context=IMeProfileNode,
    permission=pam.Permissions.visit.name
)
class ProfileView(object):

    def __init__(self, context, request):
        """
        View for user's profile.
        """
        self.context = context
        self.request = request
        self.sess = DbSession()
        self.lgg = logging.getLogger(__name__)

        self.urls = dict(
            index=request.resource_url(context),
        )

    @view_config(
        name='',
        renderer='profile.mako',
        request_method='GET'
    )
    def profile(self):
        u = self.sess.query(pam.User).get(self.request.user.uid)
        if not u:
            raise ValueError("Failed to load user with ID {}".format(
                self.request.user.uid))
        rc = {
            'urls': self.urls,
            'profile': u.profile.get_all(),
            'account': todict(u, excludes=('pwd', 'profile', 'rc'))
        }
        return {
            'rc': rc,
        }
