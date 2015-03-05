import os.path

from pyramid.config import Configurator
from pyramid_beaker import session_factory_from_settings
from pyramid.authentication import SessionAuthenticationPolicy
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid_mailer import Mailer

import pym.duh_view
import pym.i18n
import pym.models
import pym.res
import pym.res.models
import pym.auth.manager
import pym.lib
import pym.resp
from .rc import Rc


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    # Init Rc
    # Get Rc instance like this, then use its methods e.g. g() or s():
    #     request.registry.settings['rc']
    # Rc data is merged directly into settings, so you can retrieve it like
    # this:
    #     request.registry.settings['project']
    # Set Rc's root_dir, which by default is the project dir (not the package
    # dir)
    #     ProjectDir
    #     +-- pym
    #     |   `-- rc.py
    #     `-- PackageDir
    if 'environment' not in settings:
        raise KeyError('Missing key "environment" in config. Specify '
            'environment in paster INI file.')
    rc = Rc(environment=settings['environment'],
        root_dir=os.path.abspath(
            os.path.join(os.path.dirname(__file__), '..')
        )
    )
    rc.load()
    settings.update(rc.data)
    rc.s('environment', settings['environment'])
    # Put rc into config settings
    settings['rc'] = rc

    # Create config
    config = Configurator(
        settings=settings
    )
    config.include(includeme)

    return config.make_wsgi_app()


def includeme(config):
    rc = config.registry.settings['rc']

    # Set some module constants based on RC settings
    init_auth(rc)
    pym.resp.RESPOND_FULL_EXCEPTION = rc.g('debug', False)

    # # Override deform templates
    # # Initialisation must take place from within dom-ready! Else
    # # deform.js and/or jquery is not loaded, because we use requirejs
    # def translator(term):
    #     return get_localizer(get_current_request()).translate(term)
    #
    # deform_templates = resource_filename('deform', 'templates')
    # search_path = (resource_filename('pym', 'deform_templates'),
    #     deform_templates)
    # deform.Form.set_zpt_renderer(search_path, translator=translator)

    # Init resource root
    config.set_root_factory(res.models.root_factory)

    # Init session
    session_factory = session_factory_from_settings(config.registry.settings)
    config.set_session_factory(session_factory)

    from .auth import group_finder
    from .auth.models import get_current_user, Permissions

    # Init Auth and Authz
    auth_pol = SessionAuthenticationPolicy(
        callback=group_finder
    )
    authz_pol = ACLAuthorizationPolicy()
    config.add_request_method(get_current_user, 'user', reify=True)
    config.set_authentication_policy(auth_pol)
    config.set_authorization_policy(authz_pol)
    config.set_default_permission(Permissions.read.value)

    # i18n
    config.add_translation_dirs('pym:locale/')
    # config.add_translation_dirs('deform:locale/')
    # Use Parenchym's locale negotiator
    config.set_locale_negotiator(i18n.locale_negotiator)
    # Pyramid since 1.5 provides ``request.locale_name``.
    # We provide ``locale`` as an instance of ``babel.Locale``.
    config.add_request_method(i18n.get_locale, 'locale', reify=True)
    # Convenience function
    config.add_request_method(i18n.fetch_translated, 'fetch_translated', reify=True)

    # Mailer
    config.registry['mailer'] = Mailer.from_settings(config.registry.settings)

    # Mako
    config.include('pyramid_mako')
    # Chameleon needed if we use deform
    #config.include('pyramid_chameleon')

    # Init DB
    models.init(config.registry.settings, 'db.pym.sa.', invalidate_caches=True)

    # Run scan() which also imports db models
    config.scan('pym')

    # Static assets for this project
    config.add_static_view('static-pym', 'pym:static')
    # config.add_static_view('static-deform', 'deform:static')

    # View predicates from pyramid_duh
    config.include(duh_view)
    # Redis
    config.include('pyramid_redis')
    configure_cache_regions(rc)


def configure_cache_regions(rc):
    import pym.cache
    regions = rc.g('cache.regions')
    for reg in regions:
        backend = rc.g('cache.{}.backend'.format(reg))
        arguments = rc.get_these('cache.{}.arguments.'.format(reg))
        r = getattr(pym.cache, reg)
        r.configure(backend, arguments=arguments)


def init_auth(rc):
    pym.auth.manager.PASSWORD_SCHEME = rc.g('auth.password_scheme',
        pym.auth.manager.PASSWORD_SCHEME).lower()
