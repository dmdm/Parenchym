import logging
import pyramid.testing

import pym.cli
import pym.testing
import pym.models


class App(pym.cli.Cli):
    pass


def before_all(context):
    lgg = logging.getLogger('testing')
    args = pym.testing.TestingArgs
    app = App()
    #app.init_app(args, lgg=lgg, setup_logging=True)
    app.init_web_app(args, lgg=lgg, setup_logging=True)
    context.app = app
    pass


# noinspection PyUnusedLocal
def before_scenario(context, scenario):
    context.configurator = pyramid.testing.setUp(
        request=context.app.request,
        settings=context.app.settings
    )
    pass


# noinspection PyUnusedLocal
def after_scenario(context, scenario):
    pyramid.testing.tearDown()
    #context.sess.remove()
    pass