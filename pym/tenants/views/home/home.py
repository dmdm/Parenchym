from pyramid.view import view_config

import pym.tenants.models


# noinspection PyUnusedLocal
@view_config(
    name='',
    context=pym.tenants.models.ITenantNode,
    renderer='home.mako',
    permission='visit'
)
def home(context, request):
    return dict()
