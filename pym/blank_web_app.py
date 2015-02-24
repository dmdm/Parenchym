"""
Import this module e.g. in ``ipython3`` and execute::

    app = pym.blank_web_app.main(['foo', '-c', 'development.ini'])

``app`` then is a fully initialised Parenchym web application. Read the settings
via ``app.rc``, the WSGI environment via ``app.env`` and a request, the root
resource and the context via ``app.request``, ``app.request.root``,
``app.request.context`` respectively.
"""

import time
import argparse
import logging
import sys
import os
import datetime
import redis
import pym.cli
import pym.exc
import pym.auth.models
import pym.auth.manager
import pym.res.models
import pym.tenants.models


class Runner(pym.cli.Cli):

    def __init__(self):
        super().__init__()
        self.cache = None

    def init_web_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        super().init_web_app(args=args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)
        self.cache = redis.StrictRedis.from_url(
            **self.rc.get_these('cache.redis'))

    def run(self):
        self.lgg.debug("This app is empty")


def parse_args(app, argv):
    # Main parser
    parser = argparse.ArgumentParser(
        description="""A blank but fully initialised web app."""
    )
    app.add_parser_args(parser, (('config', True),
        ('locale', False), ('alembic-config', False), ('format', False)))

    return parser.parse_args(argv)


def main(argv=None):
    start_time = time.time()
    if not argv:
        argv = sys.argv

    app_name = os.path.basename(argv[0])
    lgg = logging.getLogger('cli.' + app_name)

    # noinspection PyBroadException
    try:
        runner = Runner()
        args = parse_args(runner, argv[1:])
        runner.init_web_app(args, lgg=lgg, setup_logging=True)
        if hasattr(args, 'func'):
            args.func()
        else:
            runner.run()
    except Exception as exc:
        lgg.exception(exc)
        lgg.fatal('Program aborted!')
    else:
        # Clear redis cache
        runner.cache.flushall()
        lgg.info('Finished.')
        return runner
    finally:
        lgg.info('Time taken: {}'.format(
            datetime.timedelta(seconds=time.time() - start_time))
        )

if __name__ == '__main__':
#    main(sys.argv)
    main(['blank_web_app', '-c', 'development.ini'])
