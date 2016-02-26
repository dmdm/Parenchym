import os
import re
import logging
import colander

import passlib.context
import pyramid.security
import pyramid.session
import pyramid.i18n
from pyramid.httpexceptions import HTTPForbidden, HTTPNotFound, HTTPMovedPermanently
from pyramid.view import forbidden_view_config, notfound_view_config
from pyramid.events import subscriber, NewRequest, NewResponse
import slugify as python_slugify
from pym.i18n import _
import Crypto


mlgg = logging.getLogger(__name__)

RE_INVALID_FS_CHARS = re.compile(r'[\x00-\x1f\x7f]+')
"""
Invalid characters for a filename in OS filesystem, e.g. ext3.

- NULL byte
- Control characters 0x01..0x1f (01..31)
- Escape Character 0x7f (127)
"""
RE_BLANKS = re.compile('\s+')
RE_LEADING_BLANKS = re.compile('^\s+')
RE_TRAILING_BLANKS = re.compile('\s+$')


class Encryptor(object):

    def __init__(self, secret):
        self._secret = secret.encode('utf-8')
        if not len(self._secret) in (16, 24, 32):
            self._secret += (32 - len(self._secret)) * b'}'

    def encrypt(self, plaintext):
        if plaintext is None or plaintext == '':
            return plaintext
        iv = os.urandom(16)
        encobj = self.create_enc_object(iv, self._secret)
        ciphertext = iv
        ciphertext += encobj.encrypt(plaintext)
        return ciphertext

    def decrypt(self, ciphertext):
        if ciphertext is None or ciphertext == '':
            return ciphertext
        iv = ciphertext[:16]
        encobj = self.create_enc_object(iv, self._secret)
        plaintext = encobj.decrypt(ciphertext[16:])
        return plaintext.decode('utf-8')

    @classmethod
    def create_enc_object(cls, iv, secret):
        return Crypto.Cipher.AES.new(
            secret,
            Crypto.Cipher.AES.MODE_CFB,
            iv
        )


pwd_context = passlib.context.CryptContext(
    schemes=[
        'pbkdf2_sha512',
        'sha512_crypt',
        # LDAP schemes are for Dovecot
        'ldap_salted_sha1',
        # Set plaintext last, otherwise passlib does not identify a hash
        # correctly
        'ldap_plaintext'
    ],
    default='pbkdf2_sha512'
)


class EmailValidator(colander.Regex):

    def __init__(self, msg=None):
        if msg is None:
            msg = _("Invalid email address")
        super().__init__(
            '(?i)^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$',
            msg=msg
        )

    def __call__(self, node, value):
        lcv = value.lower()
        if lcv.endswith('@localhost') or lcv.endswith('@localhost.localdomain'):
            return
        super().__call__(node, value)


def normpath(path):
    """
    Returns normalised version of user defined path.

    Normalised means, relative path segments like '..' are resolved and leading
    '..' are removed. Leading '/' is also removed, returning only relative path.
    E.g.::
        "/../../foo/../../bar"  --> "bar"
        "/../../foo/bar"        --> "foo/bar"
        "/foo/bar"              --> "foo/bar"

    :param path: The path to normalise
    :return: The normalised path
    """
    return os.path.normpath(os.path.join(os.path.sep, path)).lstrip(
        os.path.sep)


def safepath(path, split=True, sep=os.path.sep):
    """
    Returns safe version of path.

    Safe means, path is normalised with func:`normpath`, and all parts are
    sanitised like this:

    - cannot start with dash ``-``
    - cannot start with dot ``.``
    - cannot have control characters: 0x01..0x1F (0..31) and 0x7F (127)
    - cannot contain null byte 0x00
    - cannot start or end with whitespace
    - cannot contain '/', '\', ':' (slash, backslash, colon)
    - consecutive whitespace are folded to one blank

    See also:

    - http://www.dwheeler.com/essays/fixing-unix-linux-filenames.html
    - http://www.dwheeler.com/secure-programs/Secure-Programs-HOWTO/file-names.html

    :param path: String with path to make safe
    :param split: If True (default), we split ``path`` at ``sep``, process each
        part individually, and then join the parts to a string again. If False,
        we treat path as having only one part. With this method you ensure that
        path contains only a basename without leading directories.
    :param sep: Char as path separator. Defaults to ``os.path.sep``.
    """
    path = RE_INVALID_FS_CHARS.sub('', path)
    path = RE_BLANKS.sub(' ', path)
    aa = path.split(sep) if split else [path]
    bb = []
    for a in aa:
        if a == '':
            continue
        if a == '.' or a == '..':
            b = a
        else:
            b = a.strip().lstrip('.-').replace('/', '').replace('\\', '') \
                .replace(':', '')
        bb.append(b)
    res = normpath(sep.join(bb))
    return res


def is_path_safe(path, split=True, sep=os.path.sep, raise_error=True):
    sp = safepath(path, split, sep)
    if path == sp:
        return True
    if raise_error:
        raise ValueError("Path is not safe: '{}' (should be '{}')".format(
            path, sp))
    else:
        return False


def trim_blanks(s):
    """
    Removes leading and trailing whitespace from string.
    """
    s = RE_LEADING_BLANKS.sub('', s)
    s = RE_TRAILING_BLANKS.sub('', s)
    return s


def clean_string(s):
    """
    Cleans string by removing leading and trailing whitespace, illegal chars and
    folding consecutive whitespace to a single space char.
    """
    s = trim_blanks(s)
    s = RE_BLANKS.sub(' ', s)
    s = RE_INVALID_FS_CHARS.sub('', s)
    return s


def is_string_clean(s, raise_error=True):
    """
    Checks whether string has leading/trailing whitespace or illegal chars.

    :param s: The string to check
    :param raise_error: Whether to raise an exception (default) or to return
        True/False.
    :rtype: bool

    :raises ValueError: if string is not clean.
    """
    cs = clean_string(s)
    if s == cs:
        return True
    if raise_error:
        raise ValueError("String is not clean: '{}' (should be '{}')".format(
            s, cs))
    else:
        return False


def slugify(s, force_ascii=False, **kw):
    """
    Converts string into a 'slug' for use in URLs.

    Since nowadays we can use UTF-8 characters in URLs, we keep those intact,
    and just replace white space with a dash, except when you force ASCII by
    setting that parameter.

    If you ``force_ascii``, we use
    `python-slugify <https://github.com/un33k/python-slugify>`_ to convert the
    string. Additional keyword arguments are passed.

    We do not encode unicode in UTF-8 here, since most web frameworks do that
    transparently themselves.

    :param s: The string to slugify.
    :param force_ascii: If False (default) we allow unicode chars.
    :param **kw: Additional keyword arguments are passed to python-slugify.
    :return: The slug, still a unicode string but maybe just containing ASCII
        chars.
    """
    s = clean_string(s)
    s = RE_BLANKS.sub('-', s)
    if force_ascii:
        s = python_slugify.slugify(s, **kw)
    return s


# ====================================================
#   Views
# ====================================================


# noinspection PyUnusedLocal
@forbidden_view_config(xhr=True)
def xhr_forbidden_view(request):
    """
    Forbidden view for AJAX requests.

    To properly signal clients the forbidden status, we must not redirect to
    a login view. (1) AJAX clients cannot login by such a view, (2) AJAX client
    may expect a JSON response, and the client JavaScript will crash if it
    gets some HTML.
    """
    return HTTPForbidden()


# noinspection PyUnusedLocal
@forbidden_view_config(
    renderer='pym:templates/forbidden.mako',
)
def forbidden_view(request):
    return dict()


# noinspection PyUnusedLocal
@notfound_view_config(xhr=True)
def xhr_not_found_view(request):
    """
    NotFound view for AJAX requests.
    """
    return HTTPNotFound()


# noinspection PyUnusedLocal
@notfound_view_config(
    renderer='pym:templates/not_found.mako',
)
def not_found_view(request):
    request.response.status = 404
    return dict()


# ====================================================
#   Event Handler
# ====================================================


@subscriber(NewRequest)
def validate_csrf_token(event):
    """Validates CSRF token for XHR (AJAX) and POST requests.

    POST requests must send the token in (hidden) field ``XSRF_TOKEN``.

    XHR requests must send the token as HTML header ``X-XSRF-TOKEN``.
    On the client side, application PYM initialises jQuery ajax calls to
    automatically send this header.

    The benefit is that a CSRF token is sent also from 3rd-party widgets
    that do not allow to modify the sent data.

    The name of field and header are compliant with AngularJS, and alas differ
    from Pyramid's default.
    """
    request = event.request
    if request.is_xhr or request.method.upper() in ('POST', 'PUT', 'DELETE'):
        pyramid.session.check_csrf_token(request, token='XSRF_TOKEN',
            header='X-XSRF-TOKEN', raises=True)


@subscriber(NewResponse)
def set_csrf_token_cookie(event):
    request = event.request
    resp = request.response
    token = request.session.get_csrf_token()
    cookie_token = request.cookies.get('XSRF-TOKEN', None)
    if cookie_token != token:
        resp.set_cookie('XSRF-TOKEN', value=token,
            max_age=30 * 3600, overwrite=True)
