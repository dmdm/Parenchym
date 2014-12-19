from pyramid.httpexceptions import HTTPFound
from pyramid.security import NO_PERMISSION_REQUIRED, remember, forget
from pyramid.view import view_config, view_defaults
import pyramid.i18n
from pym.models import DbSession
from pym.lib import json_serializer
from pym.res.models import IRootNode
import pym.i18n
import pym.exc


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


@view_defaults(
    context=IRootNode,
    permission=NO_PERMISSION_REQUIRED
)
class LoginOutView(object):

    def __init__(self, context, request):
        self.context = context
        self.request = request
        self.sess = DbSession()

        self.urls = dict(
            index=request.resource_url(context),
            login=request.resource_url(context, '@@login')
        )

        referrer = request.params.get('referrer', None)
        if not referrer:
            referrer = request.session.get('login.referrer', None)
        if not referrer:
            referrer = request.url
            if referrer == self.urls['login']:
                # never use the login form itself as came_from
                referrer = request.resource_url(request.root)
        self.referrer = referrer
        request.session['login.referrer'] = referrer

    @view_config(
        name='login',
        renderer='login.mako',
        request_method='GET'
    )
    def login(self):
        rc = {
            'urls': self.urls,
        }
        return {'rc': rc, 'referrer': self.referrer}

    @view_config(
        name='login',
        request_method='POST'
    )
    def login_post(self):
        try:
            login = self.request.POST['login']
            pwd = self.request.POST['pwd']
            self.request.user.login(login=login, pwd=pwd,
                remote_addr=self.request.remote_addr)
        except pym.exc.AuthError:
            msg = _("Wrong credentials!")
            self.request.session.flash(dict(kind="error", text=msg))
            return HTTPFound(location=self.urls['login'])
        else:
            headers = remember(self.request, self.request.user.principal)
            self.request.session.flash(dict(
                kind="info",
                text=_("User {} logged in").format(
                    self.request.user.display_name
                )))
            return HTTPFound(location=self.referrer, headers=headers)

    @view_config(
        name='logout',
    )
    def logout(self):
        name = self.request.user.display_name
        headers = forget(self.request)
        self.request.user.logout()
        # Put the flash message in a pristine session
        self.request.session.flash(dict(
            kind="info",
            text=_("User {} logged out").format(name)))
        return HTTPFound(location=self.urls['index'], headers=headers)
