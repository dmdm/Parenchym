import io
import logging
import mimetypes
from lxml import html
import subprocess
import magic
import requests


mlgg = logging.getLogger(__name__)


class TikaPymMixin():

    def pym(self, fn):
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
        if s:
            # Split head and body
            root = html.fromstring(s)
            # Our XML always has UTF-8
            m['data_html_head'] = html.tostring(root.head).decode('utf-8')
            m['data_html_body'] = html.tostring(root.body).decode('utf-8')
        else:
            m['data_html_head'] = None
            m['data_html_body'] = None

        s = self.tika(fn, 'text')
        m['data_text'] = s if s else None

        m['mime_type'] = ct
        return m


class TikaCli(TikaPymMixin):

    def __init__(self, tika_cmd='tika', encoding='utf-8'):
        """
        Communicate with TIKA via command-line.

        :param tika_cmd: Command to start the TIKA app. By default we assume
            you have created a shell wrapper named ``tika`` to start
            the appropriate jar. It must be in the path, e.g. in
            ``/usr/local/bin`` or ``~/bin``.

            E.g.:: bash

                #!/bin/sh

                java -jar /opt/tika/tika-app-1.7.jar "$@"

        :param encoding: Default UTF-8. Tells TIKA how to encode its output.
            Output read from the console is then decoded using this setting.
            Should match the encoding of the console (STDOUT).
        """
        self.tika_cmd = tika_cmd
        self.encoding = encoding

    def detect(self, fn):
        """
        Returns content-type.

        :param fn: Filename.
        :returns: The content-type.
        :rtype: string
        """
        switches = ['--detect']
        return self._run_cmd(fn, switches, decode=True)

    def rmeta(self, fn):
        """
        Returns recursive meta info about compound document.

        :param fn: Filename.
        :returns: List of dicts. Each dict has meta info about one of the
            compound documents. Key ``X-TIKA:content`` contains text document.
        :rtype: List of dicts
        """
        switches = ['--metadata', '--jsonRecursive']
        return self._run_cmd(fn, switches, decode=True)

    def unpack(self, fn, all=False):
        raise NotImplementedError('Unpack not implemented for CLI')

    def meta(self, fn, type_='json'):
        """
        Returns meta info.
        :param fn: Filename.
        :param type_: 'json' or 'xmp'
        :return:
        """
        switches = ['--metadata']
        if type_ == 'xmp':
            switches.append('--xmp')
        else:
            switches.append('--json')
        return self._run_cmd(fn, switches, decode=True)

    def tika(self, fn, type_='text'):
        """
        Returns text or HTML of content.

        :param fn: Filename.
        :param type_: 'text', 'html'
        :return: HTML or text
        """
        switches = []
        if type_ == 'html':
            switches.append('--html')
        else:
            switches.append('--text')
        return self._run_cmd(fn, switches, decode=True)

    def _run_cmd(self, fn, switches, decode=True):
        a = [self.tika_cmd, '--encoding={}'.format(self.encoding)] + switches + [fn]
        try:
            s = subprocess.check_output(a, stderr=subprocess.STDOUT)
        except subprocess.CalledProcessError as exc:
            mlgg.error(exc.output.decode(self.encoding))
            raise
        else:
            s = s.strip()
            return s.decode(self.encoding) if decode else s


class TikaServer(TikaPymMixin):

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
        try:
            return r.json()
        except ValueError:
            return r.text

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
        if not type_:
            type_ = 'json'
        hh = self.__class__.TYPE_MAP[type_]
        url = self.url + '/meta'
        r = self._send(url, fn, hh)
        if type_ == 'json':
            try:
                return r.json()
            except ValueError:
                return r.text
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


def guess_mime_type(fn):
    """
    Guesses mime-type from filename.

    Uses Python's lib first, if no type cpuld be determined, falls back to
    python-magic.

    Returned encoding might be None.

    :param fn: Filename.
    :return: Tuple(mime_type, encoding).
    """
    # Try Python's native lib first
    mt, enc = mimetypes.guess_type(fn)
    # It may not find all types, e.g. it returns None for 'text/plain', so
    # fallback on python-magic.
    if not mt:
        m = magic.Magic(mime=True, mime_encoding=True, keep_going=True)
        mt = m.from_file(fn).decode('ASCII')
    if not enc:
        enc = None
    return mt, enc