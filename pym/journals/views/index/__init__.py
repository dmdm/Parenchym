import logging
from pyramid.view import view_config, view_defaults
import pyramid.i18n
from pym.lib import json_serializer
from pym.journals.models import IJournalsNode
from pym.journals.const import Journals
import pym.i18n
from pym.auth.models import Permissions
from pym.models import DbSession


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


@view_defaults(
    context=IJournalsNode,
    permission=Permissions.visit.name
)
class JournalsView(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request
        self.sess = DbSession()
        self.lgg = logging.getLogger(__name__)

        self.urls = dict(
            index=request.resource_url(context)
        )

    @view_config(
        name='',
        renderer='index.mako',
        request_method='GET'
    )
    def index(self):
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc,
            'Journals': Journals
        }

    @view_config(
        name='proceedings_of_foo',
        renderer='proceedings_of_foo.mako',
        request_method='GET'
    )
    def proceedings_of_foo(self):
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc,
        }

    @view_config(
        name='the_bar',
        renderer='the_bar.mako',
        request_method='GET'
    )
    def the_bar(self):
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc
        }
