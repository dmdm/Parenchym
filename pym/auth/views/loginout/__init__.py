import functools
import json
import logging
import random
import string
import oauth2client.client
import sqlalchemy as sa
import sqlalchemy.orm.exc
from pprint import pprint
from pyramid.exceptions import BadCSRFToken
from pyramid.httpexceptions import HTTPFound
from pyramid.security import NO_PERMISSION_REQUIRED, remember, forget
from pyramid.view import view_config, view_defaults
import pyramid.i18n
from pym.models import DbSession
from pym.lib import json_serializer
from pym.res.models import IRootNode
import pym.i18n
import pym.exc
import pym.resp
import pym.google.oauth
import pym.auth.models as pam
from pym.auth.manager import AuthMgr
import pym.tenants
from pym.me.const import NODE_NAME_ME, NODE_NAME_ME_PROFILE
from pym.tenants.manager import TenantMgr


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


@view_defaults(
    context=IRootNode,
    permission=NO_PERMISSION_REQUIRED
)
class LoginOutView(object):

    def __init__(self, context, request):
        """
        View to log in and out.

        After successful login, user is redirected to the referring page (where
        she came from). Referrer is looked up in the HTTP ``referer``, the
        session ``login.referrer``, and the GET parameter ``referrer``. If no
        suitable referrer could be determined, we redirect to the home page.

        After logout, user is always redirected to the home page.
        """
        self.context = context
        self.request = request
        self.sess = DbSession()
        self.lgg = logging.getLogger(__name__)

        self.urls = dict(
            index=request.resource_url(context),
            profile=request.resource_url(context.root, 'profile'),
            login=request.resource_url(context.root, 'login'),
            connect_gplus=request.resource_url(context.root, 'xhr_connect_gplus')
        )
        referrer = request.params.get('referrer',
                                      request.session.get('login.referrer',
                                                          request.headers.get(
                                                              'referer', None)))
        if not referrer:
            referrer = request.url
            if referrer == self.urls['login']:
                # never use the login form itself as came_from
                referrer = request.resource_url(request.root)
        self.referrer = referrer
        request.session['login.referrer'] = referrer

        self.oidc_clients = {
            'google': pym.google.oauth.OpenIdConnectClient(
                request.registry['rc'], request.session)
        }

    @view_config(
        name='login',
        renderer='login.mako',
        request_method='GET'
    )
    def login(self):
        rc = {
            'urls': self.urls
        }
        cc = {}
        for k, c in self.oidc_clients.items():
            cc[k] = c.gplus_button_data
            cc[k]['state'] = self.request.session.get_csrf_token()
        return {
            'rc': rc,
            'referrer': self.referrer,
            'oidc_clients': cc
        }

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

    @view_config(
        name='xhr_connect_gplus',
        renderer='string'
    )
    def xhr_connect_gplus(self):
        authmgr = AuthMgr.factory(lgg=self.lgg, sess=self.sess,
            rc=self.request.registry['rc'])
        tenmgr = TenantMgr.factory(lgg=self.lgg, sess=self.sess,
            rc=self.request.registry['rc'])
        resp = pym.resp.JsonResp()
        cl = self.oidc_clients['google']

        auth_result = self.request.json_body.get('auth_result')
        # print('---[ auth result ]-------')
        # pprint(auth_result)
        # Parenchym already checks a CSRF token for AJAX requests in general.
        # Here we check the CSRF token that came back from a round-trip to Google.
        state = auth_result.get('state')
        if state != self.request.session.get_csrf_token():
            raise BadCSRFToken()
        cl.auth_result = auth_result
        code = self.request.json_body.get('code')

        def _handle_error():
            self.request.user.logout()
            m = _("Oops, something went wrong. We cleared our cookies, please "
                  "try again. If the problem persists, contact our "
                  "administrator.")
            self.lgg.error(m)
            resp.error(m)
            # Do not go back to login page to avoid possible infinite loops
            # (e.g. if deleting cookies does not resolve the problem).
            return self.urls['index']

        def _login_by_gplus_id(gplus_id, profile):
            """
            Logs in user identified by Google+ ID.

            Loads account from database identified by Google+ ID. Then uses its
            ``email`` attribute to proceed with standard login.

            :param gplus_id: The Google+ ID
            :return: False if no account found, else redirection URL
            """
            self.lgg.debug('Trying to login with G+ ID')
            try:
                u = self.sess.query(pam.User).filter(
                    pam.User.gplus_id == gplus_id
                ).one()
                _update_gplus_profile(u, profile)
            except sa.orm.exc.NoResultFound:
                self.lgg.debug(
                    "No account associated with given G+ ID: '{}'".format(
                        gplus_id))
                return False
            try:
                self.request.user.login(login=u.principal, pwd=True,
                remote_addr=self.request.remote_addr)
            except pym.exc.AuthError:
                m = _("Failed to login with your Google ID. Maybe your account "
                      "is disabled. Please contact administrator!")
                self.lgg.error(m)
                resp.error(m)
                # Do not return to login page. If user is already logged in
                # Google, it would result in infinite loop.
                return self.urls['index']
            # We do not set response headers here, so remembering only works with
            # SessionAuthenticationPolicy (which Parenchym uses by default),
            # not cookies.
            self.lgg.info('Logging in {} ({})'.format(u.principal, u.id))
            remember(self.request, self.request.user.principal)
            resp.ok(_("User {} logged in.").format(u.display_name))
            return self.request.session['login.referrer']

        def _login_by_email(email):
            self.lgg.debug('Trying to login with email')
            try:
                u = self.sess.query(pam.User).filter(
                    pam.User.email == email
                ).one()
            except sa.orm.exc.NoResultFound:
                self.lgg.debug(
                    "No account with given email found: '{}'".format(email))
                return False
            try:
                self.request.user.login(login=u.email, pwd=True,
                remote_addr=self.request.remote_addr)
            except pym.exc.AuthError:
                m = _("Failed to login with your email. Maybe your account "
                      "is disabled. Please contact administrator!")
                self.lgg.error(m)
                resp.error(m)
                # Do not return to login page. If user is already logged in
                # Google, it would result in infinite loop.
                return self.urls['index']
            # We do not set response headers here, so remembering only works with
            # SessionAuthenticationPolicy (which Parenchym uses by default),
            # not cookies.
            self.lgg.info('Logging in {} ({})'.format(u.principal, u.id))
            remember(self.request, self.request.user.principal)
            resp.ok(_("User {} logged in.").format(u.display_name))
            return self.request.session['login.referrer']

        def _update_gplus_profile(user, profile):
            user.profile.gplus.picture_url = profile['picture']
            user.profile.gplus.profile_url = profile['profile']
            user.profile.locale_name = profile['locale']
            user.profile.gender = profile['gender']
            user.editor_id = self.request.user.uid

        def _register(gplus_id, email, p):
            # Use email as principal
            principal = email
            # Create long password, user may change it in his profile later
            pwd = ''.join(random.choice(string.ascii_letters + string.digits)
                          for x in range(32))
            # FIXME Must we handle situations in which one or more of the following fields are not supplied in the profile?
            first_name = p['given_name']
            last_name = p['family_name']
            display_name = p['name']
            # Apart from group 'users' (which is the default) we put this account
            # into the current tenant's group.
            groups = [
                # FIXME Do not use current context, which always is root, but context of referrer. Then we get tenant of the place the user came from.
                tenmgr.find_tenant(self.context).group
            ]
            self.lgg.info("About to create account for principal '{principal}',"
                " email '{email}', display name '{display_name}'".format(
                    principal=principal, email=email, display_name=display_name
                )
            )
            u = authmgr.create_user(
                owner=self.request.user.uid,
                is_enabled=True,
                principal=principal,
                pwd=pwd,
                email=email,
                groups=groups,
                first_name=first_name,
                last_name=last_name,
                display_name=display_name
            )
            u.profile.gplus.id = gplus_id
            _update_gplus_profile(u, p)
            m = _("Created account for user {display_name}. If you later wish to"
                " login directly with this account, enter your own password in"
                " the profile settings.".format(display_name=u.display_name))
            resp.ok(m)
            if u.display_name != display_name:
                self.lgg.info("Had to change display name from '{}' to "
                    "'{}'".format(display_name, u.display_name))
            try:
                self.request.user.login(login=u.principal, pwd=True,
                remote_addr=self.request.remote_addr)
            except pym.exc.AuthError:
                m = _("Failed to login with your new account. This should not"
                      " happen(tm). Please contact administrator!")
                self.lgg.error(m)
                resp.error(m)
                # Do not return to login page. If user is already logged in
                # Google, it would result in infinite loop.
                return self.urls['index']
            self.lgg.info('Logging in {} ({})'.format(u.principal, u.id))
            remember(self.request, self.request.user.principal)
            resp.ok(_("User {} logged in.").format(u.display_name))
            return self.request.resource_url(
                self.request.context.root[NODE_NAME_ME][NODE_NAME_ME_PROFILE])

        def _deny(email, email_verified):
            if not email:
                m = _("We could not obtain your email address from Google. "
                      "Please make sure it is available for the Google+ "
                      "Login and try again.")
                self.lgg.warn(m)
                resp.warn(m)
                return self.urls['index']
            if email and not email_verified:
                m = _("Google says, your email address is not verified. Please "
                      "verify it with Google in order to register here.")
                self.lgg.warn(m + ': ' + email)
                resp.warn(m)
                return self.urls['index']
            raise Exception("WTF am I doing here?")

        def _process(gplus_id, p):
            """
            - p has an error
              -> delete our cookies and try to sign in again
            - we have an account associated with retrieved gplus_id
              -> login
            - p contains email:
              - we have account with that email
                -> store gplus_id in our account and login
                -> redirect to referrer
              - email not known
                - verified?
                  -> create account, store gplus_id, login
                  -> redirect to profile page
                - not verified
                  -> redirect to registration-denied page
            - p contains no email
              -> redirect to registration-denied page

            Sample error struct::

                {'error': {'code': 401,
                           'errors': [{'domain': 'global',
                                       'location': 'Authorization',
                                       'locationType': 'header',
                                       'message': 'Invalid Credentials',
                                       'reason': 'authError'}],
                           'message': 'Invalid Credentials'}}
            """
            if 'error' in p:
                # raise pym.exc.AuthError("Failed to fetch profile: {}".format(p))
                return _handle_error()
            r = _login_by_gplus_id(gplus_id, p)
            if r is not False:
                return r
            email = p.get('email')
            email_verified = p.get('email_verified')
            if not email or not email_verified:
                return _deny(email, email_verified)
            r = _login_by_email(email)
            if r is not False:
                return r
            return _register(gplus_id, email, p)

        def doit(resp):
            r = cl.connect(code)
            if r == pym.google.oauth.OpenIdConnectClient.ALREADY_CONNECTED:
                self.lgg.debug('User was already connected')
            elif r == pym.google.oauth.OpenIdConnectClient.CONNECTED:
                self.lgg.debug('User connected')
            gplus_id = str(cl.gplus_id)
            # print('---[ gplus id ]-------')
            # print(gplus_id)
            # print('---[ credentials access token ]-------')
            # print(cl.credentials.access_token)
            # print('---[ credentials id token ]-------')
            # pprint(cl.credentials.id_token)
            # # Fetch name and email address from gplus
            # print('---[ profile ]-------')
            self.lgg.debug('Fetching profile')
            p = cl.fetch_profile()
            # pprint(p)
            r = _process(gplus_id, p)
            # We had scheduled any growl messages in response. This is okay as
            # long as we stay on the same page. If we redirect elsewhere, that
            # JavaScript data is lost. So schedule the messages as flashes.
            if not r.endswith('login'):
                for m in resp.msgs:
                    pym.lib.flash(self.request, **m)
            return r

        f = functools.partial(doit)
        resp.call_wrapped(lgg=self.lgg, f=f, respond_full_exception=None)
        return json_serializer(resp.resp)