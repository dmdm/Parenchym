import datetime
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.sql import and_

from pym.exc import AuthError
import pym.security
from pym.cache import FromCache

from .models import (Group, GroupMember)
from .const import SYSTEM_UID, NOBODY_UID
from .events import BeforeUserLoggedIn, UserLoggedIn, UserLoggedOut


def group_finder(userid, request):
    """
    Returns list of security principals of the currently logged in user.

    A principal starting with ``u:`` denotes the user, with ``g:`` denotes
    a group. We use the IDs as identifier.

    Nobody has no principals.

    Param 'userid' must match principal of current user, else throws error.
    """
    usr = request.user
    # unauthenticated_userid becomes authenticated_userid if groupfinder
    # returns not None.
    if userid != usr.principal:
        # This should not happen (tm)
        raise Exception("Userid '{0}' does not match current "
            "user.principal '{1}'".format(
                userid, usr.principal))
    # Not authenticated users have no groups
    if usr.uid == NOBODY_UID:
        return []
    # Insert current user
    gg = ['u:' + str(usr.uid)]
    # That's all if she is not member of any group.
    if not usr.groups:
        return gg
    # Append groups
    gg += ['g:' + str(g[0]) for g in usr.groups]
    return gg


class AuthProvider():

    def __init__(self, sess, user_class):
        self.sess = sess
        self.user_class = user_class

    def load_by_principal(self, principal):
        """
        Loads a user instance by principal.
        """
        try:
            p = self.sess.query(self.user_class).options(
                FromCache("auth_short_term",
                    cache_key='auth:user:{}'.format(principal))
            ).filter(
                self.user_class.principal == principal
            ).one()
        except NoResultFound:
            raise AuthError("User not found by principal '{}'".format(principal))
        return p

    def _login(self, request, filter_, pwd, remote_addr):
        """
        Performs login.

        If ``pwd`` is True, we do not check the password. This is necessary if
        user logs in via third-party OpenID and we use only his email address.

        Called by the ``login_by...`` functions which initialise the filter.
        """
        filter_.append(self.user_class.is_enabled == True)
        filter_.append(self.user_class.is_blocked == False)
        try:
            u = self.sess.query(self.user_class).filter(and_(*filter_)).one()
        except NoResultFound:
            raise AuthError('User not found')
        # We have found the requested user, now broadcast this info so that
        # preparations can take place before we actually log him in.
        request.registry.notify(BeforeUserLoggedIn(request, u))
        # Now log user in
        if pwd is not True:
            if not pym.security.pwd_context.verify(pwd, u.pwd):
                raise AuthError('Wrong credentials')
        # And save some stats
        u.login_time = datetime.datetime.now()
        u.login_ip = remote_addr
        u.logout_time = None
        u.editor_id = SYSTEM_UID
        request.registry.notify(
            UserLoggedIn(request, u)
        )
        return u

    def logout(self, request, uid):
        """
        Performs logout.
        """
        u = self.sess.query(self.user_class).filter(self.user_class.id == uid).one()
        u.login_ip = None
        u.login_time = None
        u.access_time = None
        u.logout_time = datetime.datetime.now()
        u.editor_id = SYSTEM_UID
        request.registry.notify(UserLoggedOut(request, u))
        key = 'auth:user:{}'.format(u.principal)
        request.redis.delete(key)
        return u

    def _check_credentials(*args):
        """
        Ensures that given credentials are not empty.

        This ensures that login fails with empty password or empty
        identity URL.
        """
        for a in args:
            if not a:
                raise AuthError('Missing credentials')

    def login_by_principal(self, request, principal, pwd, remote_addr):
        """
        Logs user in by principal and password, returns principal instance.

        Raises exception :class:`pym.exc.AuthError` if user is not found.
        """
        self._check_credentials(principal, pwd)
        filter_ = [self.user_class.principal == principal]
        return self._login(request, filter_, pwd, remote_addr)

    def login_by_email(self, request, email, pwd, remote_addr):
        """
        Logs user in by email and password, returns principal instance.

        Raises exception :class:`pym.exc.AuthError` if user is not found.
        """
        self._check_credentials(email, pwd)
        filter_ = [self.user_class.email == email]
        return self._login(request, filter_, pwd, remote_addr)

    # noinspection PyUnusedLocal
    def login_by_identity_url(self, request, identity_url, remote_addr):
        """
        Logs user in by identity URL (OpenID), returns principal instance.

        Raises exception :class:`pym.exc.AuthError` if user is not found.
        """
        raise NotImplementedError()


