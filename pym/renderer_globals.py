"""
This complete module is published for all renderers as variable ``h``.
"""

import sqlalchemy as sa
import sqlalchemy.exc
import sqlalchemy.orm.exc
from pym.models import DbSession
from pym.lib import json_serializer  # Keep this import for use in templates


def url_help(request):
    try:
        sess = sa.inspect(request.root).session
    except sa.exc.NoInspectionAvailable:
        sess = None
    if not sess:
        sess = DbSession()
        try:
            request.root = sess.merge(request.root)
        except sa.orm.exc.UnmappedInstanceError:
            return None
    return request.resource_url(request.root['help'])
