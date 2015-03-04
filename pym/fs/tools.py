from lxml import html
import subprocess
import pym.lib
from .const import TIKA_CMD


def fetch_meta(fn, lgg, encoding):
    m = {}

    s = subprocess.check_output([TIKA_CMD, '-r', '-m', '-J', fn]).decode(encoding)
    m['meta_json'] = pym.lib.json_deserializer(s) if s else None

    s = subprocess.check_output([TIKA_CMD, '--xmp', fn]).decode(encoding)
    m['meta_xmp'] = s if s else None

    s = subprocess.check_output([TIKA_CMD, fn])
    # Split head and body
    root = html.fromstring(s)
    # Our XML always has UTF-8
    m['data_html_head'] = html.tostring(root.head).decode('utf-8')
    m['data_html_body'] = html.tostring(root.body).decode('utf-8')

    s = subprocess.check_output([TIKA_CMD, '--text', fn]).decode(encoding)
    m['data_text'] = s if s else None

    return m
