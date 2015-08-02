"""
This complete module is published for all renderers as variable ``h``.
"""

import sqlalchemy as sa
from pym.lib import json_serializer
from pym.models import DbSession


def url_help(request):
    sess = sa.inspect(request.root).session
    if not sess:
        sess = DbSession()
        request.root = sess.merge(request.root)
    return request.resource_url(request.root['help'])
