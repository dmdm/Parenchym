import json
import os
from pprint import pprint
import requests
import requests.exceptions
from requests_oauthlib import OAuth2Session
from oauth2client import clientsecrets
from oauth2client.client import (OAuth2WebServerFlow,
    UnknownClientSecretsFlowError, TokenRevokeError)
from pym.cache import region_default


class OpenIdConnectClient(object):

    SESSION_KEY = 'auth:OpenIdConnect:google:{app_name}'
    ALREADY_CONNECTED = 1
    CONNECTED = 2

    def __init__(self, rc, session, app_name='Parenchym',
                 app_type=clientsecrets.TYPE_WEB):
        """Glues Google's lib ``oauth2client`` to ``Parenchym``.

        Some code adapted from Google's sample code ``gplus-quickstart-python``.

        Some stuff needs to be configured in the rc-file::

            oidc.me.google.{app_name}:
              # Path to JSON file with secrets as downloaded from Google Developers Console
              secret_file: ~/google-client_secret.json
              # override settings from secret file with these
              redirect_uri: http://localhost:6543/oauth2callback
              javascript_origin: http://localhost:6543
              response_type: code
              scope: ["openid", "profile", "email", "address", "phone"]

            # URL to retrieve Google's Discovery Document
            oidc.discovery.google: https://accounts.google.com/.well-known/openid-configuration

        If the application is connected to Google+, we store the credentials
        and the Google+ ID in the HTTP session with keys :attr:`credentials_key`
        and :attr:`gplus_id_key`.

        See also:

        - https://developers.google.com/+/web/signin/server-side-flow
        - https://developers.google.com/api-client-library/python/guide/aaa_oauth
        - https://developers.google.com/+/photohunt/

        :param rc: The run-control object
        :param session: The HTTP session object
        :param app_name: Name of the application, defaults to 'Parenchym'. Also
            used as ``{app_name}`` in rc-file.
        :param app_type: One of ``oauth2client.clientsecrets.TYPE_WEB``,
            ``oauth2client.clientsecrets.TYPE_INSTALLED``
        """
        self.rc = rc
        self.session = session
        self.app_name = app_name
        self.app_type = app_type

        self.session_key = self.__class__.SESSION_KEY.format(app_name=app_name)
        self.credentials_key = self.session_key + ':credentials'
        self.gplus_id_key = self.session_key + ':gplus_id'
        self.auth_result_key = self.session_key + ':auth_result'

        self._discovery_url = rc.g('oidc.discovery.google')
        self._token_info_url = rc.g('oidc.token_info.google')
        self._me = {}
        self._discovered_data = None

        me = rc.g('oidc.me.google.' + app_name)
        with open(os.path.expanduser(me['secret_file']), 'rt', encoding='utf-8') as fh:
            self._me = json.load(fh)
        for k, v in me.items():
            self._me[k] = v

    def discover(self, use_cache=True):
        """
        Fetches data from discovery URL.

        Cache uses "region_default".

        :param use_cache: Whether to use cached values or not.

        :returns: Dict with discovered data, also set in property
            ``discovered_data``.

        :raises requests.exceptions.HTTPError: If sending the discover request
            fails.
        """

        def fetch():
            r = requests.get(self._discovery_url)
            r.raise_for_status()
            return r.json()

        if use_cache:
            k = __name__ + ':' + self.__class__.__name__ \
                + ':' + self.discover.__name__
            dd = region_default.get_or_create(k, fetch)
        else:
            dd = fetch()
        self._discovered_data = dd
        return dd

    def create_flow(self, scope, redirect_uri=None,
            login_hint=None, device_uri=None):
        """
        Creates a flow object for exchanging the one-time code for an access
        token.

        :param scope:
        :param redirect_uri:
        :param login_hint:
        :param device_uri:

        :returns oauth2client.client.OAuth2WebServerFlow: The flow object

        :raises oauth2client.clientsecrets.InvalidClientSecretsError:
        :raises oauth2client.client.UnknownClientSecretsFlowError:
        """
        try:
            client_type, client_info = self.app_type, self._me[self.app_type]
            if client_type in (clientsecrets.TYPE_WEB, clientsecrets.TYPE_INSTALLED):
                constructor_kwargs = {
                    'redirect_uri': redirect_uri,
                    'auth_uri': client_info['auth_uri'],
                    'token_uri': client_info['token_uri'],
                    'login_hint': login_hint,
                    'approval_prompt': self.approval_prompt
                }
                revoke_uri = client_info.get('revoke_uri')
                if revoke_uri is not None:
                    constructor_kwargs['revoke_uri'] = revoke_uri
                if device_uri is not None:
                    constructor_kwargs['device_uri'] = device_uri
                return OAuth2WebServerFlow(
                    client_info['client_id'], client_info['client_secret'],
                    scope, **constructor_kwargs)
        except clientsecrets.InvalidClientSecretsError:
            raise
        else:
            raise UnknownClientSecretsFlowError(
                'This OAuth 2.0 flow is unsupported: %r' % client_type)

    def connect(self, code):
        """Connects the application with Google+.

        Exchanges the one-time authorization code with Google+ and retrieves the
        ID token. Stores the resulting credentials and the Google+ ID in the
        session.

        Hint: Application retrieves the code from client after user pressed the
        'login with Google+' button by an AJAX call. Application must check
        GET parameter ``state`` of the request for XSRF, and not call
        :meth:`connect` if sth. is wrong.

        CAVEAT (quoted from gplus-quickstart-python):

            An ID Token is a cryptographically-signed JSON object encoded in base 64.
            Normally, it is critical that you validate an ID Token before you use it,
            but since you are communicating directly with Google over an
            intermediary-free HTTPS channel and using your Client Secret to
            authenticate yourself to Google, you can be confident that the token you
            receive really comes from Google and is valid. If your server passes the
            ID Token to other components of your app, it is extremely important that
            the other components validate the token before using it.

        :param code: The one-time authorization code for a token

        :returns: ALREADY_CONNECTED (1) if user was already connected,
            CONNECTED (2) if user is connected now.

        :raises oauth2client.client.FlowExchangeError: If exchange of the code
            for an ID token fails.
        :raises: See :meth:`create_flow` for more exceptions that may occur.
        """

        # Upgrade the authorization code into a credentials object
        oauth_flow = self.create_flow(scope=' '.join(self.scope))
        oauth_flow.redirect_uri = 'postmessage'
        # exchange may rise oauth2client.client.FlowExchangeError
        credentials = oauth_flow.step2_exchange(code)
        gplus_id = credentials.id_token['sub']

        # # Check that the access token is valid.
        # access_token = credentials.access_token
        # url = ('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s'
        #        % access_token)
        # h = httplib2.Http()
        # result = json.loads(h.request(url, 'GET')[1])
        # # If there was an error in the access token info, abort.
        # if result.get('error') is not None:
        #   response = make_response(json.dumps(result.get('error')), 500)
        #   response.headers['Content-Type'] = 'application/json'
        #   return response
        # # Verify that the access token is used for the intended user.
        # if result['user_id'] != gplus_id:
        #   response = make_response(
        #       json.dumps("Token's user ID doesn't match given user ID."), 401)
        #   response.headers['Content-Type'] = 'application/json'
        #   return response
        # # Verify that the access token is valid for this app.
        # if result['issued_to'] != CLIENT_ID:
        #   response = make_response(
        #       json.dumps("Token's client ID does not match app's."), 401)
        #   response.headers['Content-Type'] = 'application/json'
        #   return response
        # stored_credentials = session.get('credentials')
        # stored_gplus_id = session.get('gplus_id')
        # if stored_credentials is not None and gplus_id == stored_gplus_id:
        #   response = make_response(json.dumps('Current user is already connected.'),
        #                            200)
        #   response.headers['Content-Type'] = 'application/json'
        #   return response

        # Check if we are already connected
        stored_credentials = self.session.get(self.credentials_key)
        stored_gplus_id = self.session.get(self.gplus_id_key)
        if stored_credentials is not None and gplus_id == stored_gplus_id:
            return self.__class__.ALREADY_CONNECTED

        # Store the access token in the session for later use.
        self.session[self.credentials_key] = credentials
        self.session[self.gplus_id_key] = gplus_id
        return self.__class__.CONNECTED

    def disconnect(self):
        """Revoke current user's token and reset his session.

        :returns: True if application could be disconnected, False if application
            was not connected in the first place.

        :raises requests.exceptions.HTTPError: If sending the revocation request
            fails.
        :raises oauth2client.client.TokenRevokeError: If revocation fails.
        """
        # Only disconnect a connected user.
        credentials = self.session.get(self.credentials_key)
        if credentials is None:
            return False

        # Execute HTTP GET request to revoke current token.
        access_token = credentials.access_token
        r = requests.get(self.revocation_endpoint, token=access_token)
        r.raise_for_status()

        if r.status_code == '200':
            # Reset the user's session.
            del self.session[self.credentials_key]
            del self.session[self.gplus_id_key]
            return True
        else:
            # For whatever reason, the given token was invalid.
            raise TokenRevokeError('Failed to revoke token for current user.')

    def fetch_profile(self):
        google = OAuth2Session(
            self.credentials.client_id,
            token={
                'access_token': self.credentials.access_token,
                'token_type': self.token_type
            }
        )
        url = self.userinfo_endpoint
        # url = 'https://www.googleapis.com/plus/v1/people/me'
        p = google.get(url).json()
        return p

    @property
    def auth_result(self):
        return self.session.get(self.auth_result_key)

    @auth_result.setter
    def auth_result(self, v):
        self.session[self.auth_result_key] = v
        ti = requests.get(self._token_info_url + v['id_token']).json()
        from pprint import pprint
        pprint(ti)

    @property
    def token_type(self):
        return self.auth_result['token_type']

    @property
    def credentials(self):
        return self.session.get(self.credentials_key)

    @property
    def gplus_id(self):
        return self.session.get(self.gplus_id_key)

    @property
    def authorization_endpoint(self):
        """From discovered_data"""
        return self.discovered_data['authorization_endpoint']

    @property
    def id_token_alg_values_supported(self):
        """From discovered_data"""
        return self.discovered_data['id_token_alg_values_supported']

    @property
    def issuer(self):
        """From discovered_data"""
        return self.discovered_data['issuer']

    @property
    def jwks_uri(self):
        """From discovered_data"""
        return self.discovered_data['jwks_uri']

    @property
    def response_types_supported(self):
        """From discovered_data"""
        return self.discovered_data['response_types_supported']

    @property
    def revocation_endpoint(self):
        """From discovered_data"""
        return self.discovered_data['revocation_endpoint']

    @property
    def subject_types_supported(self):
        """From discovered_data"""
        return self.discovered_data['subject_types_supported']

    @property
    def token_endpoint(self):
        """From discovered_data"""
        return self.discovered_data['token_endpoint']

    @property
    def token_endpoint_auth_methods_supported(self):
        """From discovered_data"""
        return self.discovered_data['token_endpoint_auth_methods_supported']

    @property
    def userinfo_endpoint(self):
        """From discovered_data"""
        return self.discovered_data['userinfo_endpoint']

    @property
    def me(self):
        """Data struct given in client_secret.json file"""
        return self._me

    @property
    def discovery_url(self):
        """Defined in RC with key ``oidc.discovery.google``"""
        return self._discovery_url

    @property
    def discovered_data(self):
        """Data struct retrieved from discovery URL"""
        if not self._discovered_data:
            self.discover(use_cache=True)
        return self._discovered_data

    @property
    def auth_provider_x509_cert_url(self):
        """From client_secret.json"""
        return self._me[self.app_type]['auth_provider_x509_cert_url']

    @property
    def client_x509_cert_url(self):
        """From client_secret.json"""
        return self._me[self.app_type]['client_x509_cert_url']

    @property
    def client_id(self):
        """From client_secret.json"""
        return self._me[self.app_type]['client_id']

    @property
    def client_secret(self):
        """From client_secret.json"""
        return self._me[self.app_type]['client_secret']

    @property
    def client_email(self):
        """From client_secret.json"""
        return self._me[self.app_type]['client_email']

    @property
    def redirect_uris(self):
        """From client_secret.json"""
        return self._me[self.app_type]['redirect_uris']

    @property
    def redirect_uri(self):
        """Redirect URI used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.redirect_uri``.
        Must be one of :attr:`redirect_uris`.
        """
        return self._me['redirect_uri']

    @property
    def javascript_origins(self):
        """From client_secret.json"""
        return self._me[self.app_type]['javascript_origins']

    @property
    def javascript_origin(self):
        """JavaScript origin used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.javascript_origin``.
        Must be one of :attr:`javascript_origins`.
        """
        return self._me['javascript_origin']

    @property
    def token_uri(self):
        """From client_secret.json"""
        return self._me[self.app_type]['token_uri']

    @property
    def auth_uri(self):
        """From client_secret.json"""
        return self._me[self.app_type]['auth_uri']

    @property
    def scope(self):
        """Scope used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.scope``.
        """
        return self._me['scope']

    @property
    def response_type(self):
        """response_type used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.response_type``.
        """
        return self._me['response_type']

    @property
    def access_type(self):
        """access_type used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.access_type``.
        """
        return self._me['access_type']

    @property
    def cookie_policy(self):
        """cookie_policy used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.cookie_policy``.
        """
        return self._me['cookie_policy']

    @property
    def request_visible_actions(self):
        """request_visible_actions used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.request_visible_actions``.
        """
        return self._me['request_visible_actions']

    @property
    def theme(self):
        """theme used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.theme``.
        """
        return self._me['theme']

    @property
    def approval_prompt(self):
        """approval_prompt used by this client instance.
        Defined in RC with key ``oidc.me.google.{app_name}.approval_prompt``.
        """
        return self._me['approval_prompt']

    @property
    def gplus_button_data(self):
        return {
            'clientid': self.client_id,
            'requestvisibleactions': self.request_visible_actions,
            'scope': self.scope if isinstance(self.scope, str) else ' '.join(self.scope),
            'apppackagename': self.app_name,
            'cookiepolicy': self.cookie_policy,
            'accesstype': self.access_type,
            'discovered_data': self.discovered_data,
            'approval_prompt': self.approval_prompt,
            'state': '?'
        }