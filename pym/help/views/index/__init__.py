import logging
import os
import markdown
import pathlib
from pyramid.view import view_config, view_defaults
from pyramid.response import FileResponse
import pyramid.httpexceptions
from ...models import IHelpNode
from pym.i18n import _
from pym.auth.models import Permissions
from pym.models import DbSession
import pym.security


_MD_EXTENSIONS = [
    'abbr',
    'admonition',
    'attr_list',
    'def_list',
    'fenced_code',
    'footnotes',
    'meta',
    'smart_strong',
    'tables',
    'codehilite',
    'sane_lists',
    'toc'
]

_MD_EXTENSION_CONFIGS = dict()


class Page(object):

    def __init__(self, context, request, root_dir, md):
        self.context = context
        self.request = request
        self.root_dir = root_dir
        self.md = md
        self._output = None
        self._response = None
        self._title = None

    def render(self, path):
        self._response = None
        path = path.strip('/')
        fn = os.path.join(self.root_dir, path)
        if os.path.exists(fn) and os.path.isdir(fn):
            fn = os.path.join(fn, 'index')
        if os.path.exists(fn + '.md'):
            with open(fn + '.md', 'r', encoding='utf8') as fh:
                input_ = fh.read()
            self._output = self.md.convert(input_)
            try:
                self._title = self.md.Meta['title'][0]
            except KeyError:
                self._title = _("Help")
        elif os.path.exists(fn):
            self._response = FileResponse(fn, self.request)
        else:
            self._response = pyramid.httpexceptions.HTTPNotFound(path)

    @property
    def output(self):
        return self._output

    @property
    def response(self):
        return self._response

    @property
    def title(self):
        return self._title


@view_defaults(
    context=IHelpNode,
    permission=Permissions.visit.name
)
class HelpView(object):

    def __init__(self, context, request):
        """
        View 'help'.
        """
        self.context = context
        self.request = request
        self.sess = DbSession()
        self.lgg = logging.getLogger(__name__)

        sep = os.path.sep
        p = ''
        # Path to load is the request's subpath
        if request.subpath:
            p = pym.security.safepath(sep.join(request.subpath), sep=sep)
        # Path to load always starts with the view name, if we have one
        if request.view_name:
            p = os.path.join(request.view_name.replace('@', ''), p)
        if not p:
            p = 'index'
        self.path = p
        self.root_dir = os.path.join(
            request.registry['rc'].root_dir,
            'var', 'help-docs')

        # Do not use safe_mode here to escape raw HTML inside markdown.
        mdopts = dict(
            extensions=_MD_EXTENSIONS,
            extension_configs=_MD_EXTENSION_CONFIGS,
            output_format='html5',
            safe_mode=False
        )
        self.page = Page(context, request, self.root_dir,
            markdown.Markdown(**mdopts))

        self.urls = dict(
            index=request.resource_url(context),
        )

    @view_config(
        name='',
        renderer='page.mako',
        request_method='GET'
    )
    def index(self):
        path = self.path
        self.page.render(path)
        if self.page.response:
            return self.page.response
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc,
            'content': self.page.output,
            'title': self.page.title
        }

    @view_config(
        name='userman',
        renderer='page.mako',
        request_method='GET'
    )
    def userman(self):
        path = self.path
        self.page.render(path)
        if self.page.response:
            return self.page.response
        rc = {
            'urls': self.urls
        }
        return {
            'rc': rc,
            'content': self.page.output,
            'title': self.page.title
        }
