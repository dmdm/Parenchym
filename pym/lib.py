import datetime
import enum
import functools
from json.decoder import WHITESPACE
import re
import json
import decimal
import colander

import sqlalchemy as sa
import yaml

import pym.exc


ENV_DEVELOPMENT = 'development'
ENV_PRODUCTION = 'production'


def match_mime_types(a, b):
    """
    Tells whether at least one mime-type in ``a`` matches one of ``b``.

    :param a: Str or list of str. Mime-types to match.
    :param b: Str or list of str. Patterns of mime-types to match against.
    :return: True if at least one mime-type in ``a`` matches at least one
        pattern in ``b``. False otherwise.
    """
    # Compile patterns in b
    if isinstance(b, str):
        b = [b]
    rr = []
    star = re.compile(r'(?<!\.)\*')
    for pat in b:
        # replace '*' with '.*' but don't touch '.*'
        pat = star.sub('.*', pat)
        pat = pat.split('/')
        rr.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
    # Prepare a
    if isinstance(a, str):
        a = [a]
    for i in range(len(a)):
        a[i] = a[i].split('/')
    # Match
    for r in rr:
        for x in a:
            if r[0].search(x[0]) and r[1].search(x[1]):
                return True
    return False


class Enum(enum.Enum):
    @classmethod
    def as_choices(cls, translate=None):
        """
        Returns members as list of 2-tuples suitable as choices for HTML select
        lists.

        Tuple[0] is the name of the member as string, and tuple[1] is its value.

        :param translate: Optional translation function. Assumes, member's value
            is a translation string.
        :return: Members as list of 2-tuples
        """
        if translate:
            return [(name, translate(member.value))
                for name, member in cls.__members__.items()]
        else:
            return [(name, member.value)
                for name, member in cls.__members__.items()]

    @classmethod
    def by_val(cls, v):
        for m in cls.__members__.values():
            if m.value == v:
                return m
        raise KeyError("Member with value '{}' not found".format(v))


class JsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        if isinstance(obj, decimal.Decimal):
            return str(obj)
        if isinstance(obj, datetime.timedelta):
            return str(obj)
        if isinstance(obj, colander._null):
            return '<colander.null>'
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)


class JsonDecoder(json.JSONDecoder):

    def __init__(self):
        json.JSONDecoder.__init__(self, object_hook=self.dict_to_object)

    def dict_to_object(self, d):
        for k in d.keys():
            if d[k] == '<colander.null>':
                d[k] = colander.null
        return d


json_serializer = functools.partial(
    json.dumps,
    sort_keys=False,
    indent=2,
    ensure_ascii=False,
    cls=JsonEncoder
)

# json_deserializer = json.loads
json_deserializer = functools.partial(
    json.loads,
    cls=JsonDecoder
)

dump_yaml = functools.partial(
    yaml.dump,
    default_flow_style=False,
    allow_unicode=True
)


# # Init YAML to dump an OrderedDict like a regular dict, i.e.
# # without creating a specific object tag.
# def _represent_ordereddict(self, data):
#     return self.represent_mapping('tag:yaml.org,2002:map', data.items())
#
# yaml.add_representer(collections.OrderedDict, _represent_ordereddict)


RE_INTERVAL_DATETIME = re.compile(
    r'P'
    r'(?:(?P<years>\d+(?:[.]\d+)?)Y)?'
    r'(?:(?P<months>\d+(?:[.]\d+)?)M)?'
    r'(?:(?P<weeks>\d+(?:[.]\d+)?)W)?'
    r'(?:(?P<days>\d+(?:[.]\d+)?)D)?'
    r'(?:T'
    r'(?:(?P<hours>\d+(?:[.]\d+)?)H)?'
    r'(?:(?P<minutes>\d+(?:[.]\d+)?)M)?'
    r'(?:(?P<seconds>\d+(?:[.]\d+)?)S)?'
    r')?'
    r'$'
)


def interval2timedelta(v):
    v = v.replace(',', '.').upper()
    m = RE_INTERVAL_DATETIME.match(v)
    if not m:
        raise ValueError
    if not m.groups():
        raise ValueError
    d = m.groupdict()

    def g(x):
        v = d.get(x, 0)
        if v is None:
            v = 0
        else:
            v = float(v)
        return v

    days = g('years') * 365.25 \
        + g('months') * (365.25 / 12.0) \
        + g('weeks') * 7 \
        + g('days')
    hours = g('hours')
    minutes = g('minutes')
    seconds = g('seconds')
    return datetime.timedelta(
        days=days, hours=hours, minutes=minutes, seconds=seconds
    )


# Stolen from Pelican
def truncate_html_words(s, num, end_text='&hellip;'):
    """Truncates HTML to a certain number of words (not counting tags and
    comments). Closes opened tags if they were correctly closed in the given
    html. Takes an optional argument of what should be used to notify that the
    string has been truncated, defaulting to ellipsis (...).

    Newlines in the HTML are preserved.
    From the django framework.
    """
    length = int(num)
    if length <= 0:
        return ''
    html4_singlets = ('br', 'col', 'link', 'base', 'img', 'param', 'area',
                      'hr', 'input')

    # Set up regular expressions
    re_words = re.compile(r'&.*?;|<.*?>|(\w[\w-]*)', re.U)
    re_tag = re.compile(r'<(/)?([^ ]+?)(?: (/)| .*?)?>')
    # Count non-HTML words and keep note of open tags
    pos = 0
    end_text_pos = 0
    words = 0
    open_tags = []
    while words <= length:
        m = re_words.search(s, pos)
        if not m:
            # Checked through whole string
            break
        pos = m.end(0)
        if m.group(1):
            # It's an actual non-HTML word
            words += 1
            if words == length:
                end_text_pos = pos
            continue
        # Check for tag
        tag = re_tag.match(m.group(0))
        if not tag or end_text_pos:
            # Don't worry about non tags or tags after our truncate point
            continue
        closing_tag, tagname, self_closing = tag.groups()
        tagname = tagname.lower()  # Element names are always case-insensitive
        if self_closing or tagname in html4_singlets:
            pass
        elif closing_tag:
            # Check for match in open tags list
            try:
                i = open_tags.index(tagname)
            except ValueError:
                pass
            else:
                # SGML: An end tag closes, back to the matching start tag,
                # all unclosed intervening start tags with omitted end tags
                open_tags = open_tags[i + 1:]
        else:
            # Add it to the start of the open tags list
            open_tags.insert(0, tagname)
    if words <= length:
        # Don't try to close tags if we don't need to truncate
        return s
    out = s[:end_text_pos]
    if end_text:
        out += ' ' + end_text
    # Close any tags still open
    for tag in open_tags:
        out += '</%s>' % tag
    # Return string
    return out


def rreplace(s, old, new, occurrence):
    """
    Replaces the last n occurrences of a thing.

    >>> s = '1232425'
    '1232425'
    >>> rreplace(s, '2', ' ', 2)
    '123 4 5'
    >>> rreplace(s, '2', ' ', 3)
    '1 3 4 5'
    >>> rreplace(s, '2', ' ', 4)
    '1 3 4 5'
    >>> rreplace(s, '2', ' ', 0)
    '1232425'

    http://stackoverflow.com/a/2556252

    :param s: Haystack
    :param old: Needle
    :param new: Replacement
    :param occurrence: How many
    :returns: The resulting string
    """
    li = s.rsplit(old, occurrence)
    return new.join(li)


class BaseNode(dict):
    __parent__ = None
    __name__ = None
    __acl__ = []

    def __init__(self, parent):
        super().__init__()
        self.__parent__ = parent
        self._title = None

    def __setitem__(self, name, other):
        other.__parent__ = self
        other.__name__ = name
        super().__setitem__(name, other)

    def __delitem__(self, name):
        other = self[name]
        if hasattr(other, '__parent__'):
            del other.__parent__
        if hasattr(other, '__name__'):
            del other.__name__
        super().__delitem__(name)
        return other

    def __str__(self):
        s = self.__name__ if self.__name__ else '/'
        o = self.__parent__
        while o:
            s = (o.__name__ if o.__name__ else '') + '/' + s
            o = o.__parent__
        return str(type(self)).replace('>', ": '{}'>".format(s))

    @property
    def title(self):
        return self._title if self._title else self.__name__


def build_breadcrumbs(request):
    # Ensure that our context still has a session.
    # It may have lost its session if we are called from an error page after
    # an exception that closed the current session.
    sess = sa.inspect(request.context).session
    if not sess:
        sess = pym.models.DbSession()
        sess.add(request.context)

    from pyramid.location import lineage
    # If context has no session, this raises a DetachedInstanceError:
    linea = list(lineage(request.context))
    bcs = []
    for i, elem in enumerate(reversed(linea)):
        bc = [request.resource_url(elem)]
        if i == 0:
            bc.append('Home')
        else:
            bc.append(elem.title)
        bcs.append(bc)
    if request.view_name:
        bcs.append([None, request.view_name.capitalize()])
    return bcs


def flash_ok(*args, **kw):
    kw['kind'] = 'success'
    if not 'title' in kw:
        kw['title'] = 'Success'
    flash(*args, **kw)


def flash_error(request, text, *args, **kw):
    kw['kind'] = 'error'
    if not request.registry.settings['full_db_errors']:
        text = re.sub(r'DETAIL:.+$', '', text, flags=re.DOTALL)
    flash(request, text, *args, **kw)


def flash(request, text, kind='notice', title=None, status=None):
    """Flashes a message as JSON.

    :param request: Current request
    :param text: The message
    :param kind: Kind of message, one of notice, info, warning, error, fatal
    :param status: A status ID
    """
    kind = kind.lower()
    tt = dict(
        s='Success',
        i='Info',
        w='Warning',
        e='Error'.upper(),
        f='Fatal Error'.upper()
    )
    if not title and kind != 'notice':
        title = tt[kind[0]]
        # JS expects UTC!
    d = dict(text=text, kind=kind, status=status, title=title,
        time=list(datetime.datetime.utcnow().timetuple()))
    request.session.flash(d)


def build_growl_msgs(request):
    mq = []
    for m in request.session.pop_flash():
        if isinstance(m, dict):
            mq.append(json.dumps(m))
        else:
            mq.append(json.dumps(dict(kind="notice", text=m)))
    return mq


def build_growl_msgs_nojs(request):
    from datetime import datetime
    mq = []
    for m in request.session.pop_flash():
        if isinstance(m, dict):
            msg = m
        else:
            msg = dict(kind="notice", text=m)
        if not 'kind' in msg:
            msg['kind'] = 'notice'
        if not 'title' in msg:
            msg['title'] = msg['kind']
        # Put timestamp into title
        # We get time as UTC
        if 'time' in msg:
            dt = datetime(
                msg['time'][0], msg['time'][1], msg['time'][2],
                msg['time'][3], msg['time'][4], msg['time'][5]
            )
        else:
            dt = datetime.now()

        msg['title'] = (
            '<span style="font-weight:normal;font-size:xx-small;">'
            + dt.strftime('%c')
            + '</span>&nbsp;'
            + msg['title'])
        # Setup type, icon and persistence according to kind
        k = msg['kind'][0]
        icon = None
        if k == 'n':
            msg['type'] = 'notice'
            icon = 'ui-icon ui-icon-comment'
        elif k == 'i':
            msg['type'] = 'info'
            icon = 'ui-icon ui-icon-info'
        elif k == 'w':
            msg['type'] = 'warning'
            icon = 'ui-icon ui-icon-notice'
        elif k == 'e':
            icon = 'ui-icon ui-icon-alert'
            msg['type'] = 'error'
        elif k == 'f':
            icon = 'ui-icon ui-icon-alert'
            msg['type'] = 'error'
        elif k == 's':
            icon = 'ui-icon ui-icon-check'
            msg['type'] = 'success'
        if not 'icon' in msg:
            msg['icon'] = icon

        mq.append(msg)
    return mq


def fmt_size(num):
    for x in ['bytes', 'KB', 'MB', 'GB']:
        if 1024.0 > num > -1024.0:
            return "%3.1f %s" % (num, x)
        num /= 1024.0
    return "%3.1f %s" % (num, 'TB')


class SingletonType(type):
    def __call__(cls, *args, **kwargs):
        try:
            return cls.__instance
        except AttributeError:
            cls.__instance = super(SingletonType, cls).__call__(*args, **kwargs)
            return cls.__instance
