"""
This complete module is published for all renderers as variable ``h``.
"""
import datetime
import sqlalchemy as sa
import sqlalchemy.exc
import sqlalchemy.orm.exc
from pym.models import DbSession
from pym.lib import json_serializer  # Keep this import for use in templates
from pym.i18n import wanted_languages  # Keep this import for use in templates


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


def js_value(v, none_val='null'):
    if v is None:
        return none_val
    if isinstance(v, str):
        return "'" + v + "'"
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, datetime.time):
        return "new Date('0000-01-01T' + '{}')".format(v.isoformat())
    if hasattr(v, 'isoformat'):
        return "new Date('{}')".format(v.isoformat())
    if hasattr(v, '__iter__'):
        return json_serializer(v)
    return str(v)
