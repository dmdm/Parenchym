import io
from lxml import html
import subprocess
import requests
import pym.lib
from .const import TIKA_CMD


def fetch_meta(fn, lgg, encoding, cmd=TIKA_CMD):
    m = {}

    s = subprocess.check_output([cmd, '-r', '-m', '-J', fn]).decode(encoding)
    m['meta_json'] = pym.lib.json_deserializer(s) if s else None

    s = subprocess.check_output([cmd, '--xmp', fn]).decode(encoding)
    m['meta_xmp'] = s if s else None

    s = subprocess.check_output([cmd, fn])
    # Split head and body
    root = html.fromstring(s)
    # Our XML always has UTF-8
    m['data_html_head'] = html.tostring(root.head).decode('utf-8')
    m['data_html_body'] = html.tostring(root.body).decode('utf-8')

    s = subprocess.check_output([TIKA_CMD, '--text', fn]).decode(encoding)
    m['data_text'] = s if s else None

    return m


class TikaServer():

    TYPE_MAP = {
        'text': {'accept': 'text/plain'},
        'html': {'accept': 'text/html'},
        'json': {'accept': 'application/json'},
        'xmp': {'accept': 'application/rdf+xml'},
        'csv': {'accept': 'text/csv'},
    }

    def __init__(self, host='localhost', port=9998):
        self.host = host
        self.port = port
        self.url = 'http://{}:{}'.format(host, port)

    def fetch_meta(self, fn):
        """
        Fetches a bundle of meta information about given file.

        Returned dict has these keys: ``content-type``, ``meta_json``,
        ``meta_xmp``, ``data_text``, ``data_html_head``, ``data_html_body``.

        Some keys such as ``meta_json`` may already contain a key
        ``content-type``. Still, we provide the top-level key ``content-type``,
         which is more accurate (and may differ from the others).

        :param fn: Filename.
        :return: Dict with meta info.
        """
        m = {}

        ct = self.detect(fn)

        s = self.meta(fn, 'json')
        m['meta_json'] = s if s else None

        s = self.meta(fn, 'xmp')
        m['meta_xmp'] = s if s else None

        s = self.tika(fn, 'html')
        # Split head and body
        root = html.fromstring(s)
        # Our XML always has UTF-8
        m['data_html_head'] = html.tostring(root.head).decode('utf-8')
        m['data_html_body'] = html.tostring(root.body).decode('utf-8')

        s = self.tika(fn, 'text')
        m['data_text'] = s if s else None

        m['content-type'] = ct
        return m

    def detect(self, fn):
        """
        Returns accurate content-type.

        :param fn: Filename.
        :returns: The content-type.
        :rtype: string
        """
        hh = {}
        url = self.url + '/detect/stream'
        r = self._send(url, fn, hh)
        return r.text

    def rmeta(self, fn):
        """
        Returns recursive meta info about compound document.

        :param fn: Filename.
        :returns: List of dicts. Each dict has meta info about one of the
            compound documents. Key ``X-TIKA:content`` contains text document.
        :rtype: List of dicts
        """
        hh = {}
        url = self.url + '/rmeta'
        r = self._send(url, fn, hh)
        return r.json()

    def unpack(self, fn, all=False):
        """
        Unpacks compound document and returns ZIP archive.

        :param fn: Filename
        :param all: Get all compound documents.
        :return: File-like bytestream.
        """
        hh = {
            'content-type': 'application/zip'
        }
        url = self.url + '/unpack'
        if all:
            url += '/all'
        r = self._send(url, fn, hh)
        return io.BytesIO(r.content) if r.content else None

    def meta(self, fn, type_='json'):
        """
        Returns meta info.
        :param fn: Filename.
        :param type_: 'csv', 'json' or 'xmp'
        :return:
        """
        hh = self.__class__.TYPE_MAP[type_]
        url = self.url + '/meta'
        r = self._send(url, fn, hh)
        if type_ == 'json':
            return r.json()
        else:
            return r.text

    def tika(self, fn, type_='text'):
        """
        Returns text or HTML of content.

        :param fn: Filename.
        :param type_: 'text', 'html'
        :return: HTML or text
        """
        hh = self.__class__.TYPE_MAP[type_]
        url = self.url + '/tika'
        r = self._send(url, fn, hh)
        return r.text

    def _send(self, url, fn, hh):
        """
        PUTs given file to URL.

        Also sets header content-disposition.

        :param url: Destination URL.
        :param fn: Filename
        :param hh: Dict of HTTP headers.
        :return: `request.Response`
        """
        hh['content-disposition'] = 'attachment; filename={}'.format(fn)
        with open(fn, 'rb') as fh:
            return requests.put(url, data=fh, headers=hh)
