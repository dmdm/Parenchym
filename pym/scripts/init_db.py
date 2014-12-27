#!/usr/bin/env python

import transaction
import time
import argparse
import logging
import sys
import os
import datetime
import redis
import alembic.command
import alembic.config
from zope.sqlalchemy import mark_changed
from pym.auth.const import SYSTEM_UID
import pym.cli
import pym.exc
from pym.models import DbSession
import pym.cache
import pym.res.setup
import pym.sys.setup
import pym.auth.setup
import pym.tenants.setup
import pym.me.setup
import pym.journals.setup


class Runner(pym.cli.Cli):
    def __init__(self):
        super().__init__()
        self.cache = None

    def init_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        super().init_app(args=args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)
        self.cache = redis.StrictRedis.from_url(
            **self.rc.get_these('cache.redis'))

    def run(self):
        root_pwd = self.rc.g('auth.user_root.pwd')
        sess = self._sess
        self._config.scan('pym')
        # Create schema
        # Make sure, views etc are also created here. In the next block we call
        # SA's create_all(), and SA creates a table for each class whose view
        # (__tablename__) does not exist yet!
        with transaction.manager:
            self._create_schema(sess)
            # pym.res.setup.create_schema(sess, rc=self.rc)
            # pym.sys.setup.create_schema(sess, rc=self.rc)
            # pym.auth.setup.create_schema(sess, rc=self.rc)
            # pym.tenants.setup.create_schema(sess, rc=self.rc)
            # pym.me.setup.create_schema(sess, rc=self.rc)
            # pym.journals.setup.create_schema(sess, rc=self.rc)
            mark_changed(sess)
        with transaction.manager:
            # Create all models
            pym.models.create_all()
            # Users and stuff we need to setup the modules
            # pym.auth.setup.populate(sess, root_pwd=root_pwd, rc=self.rc)
            if not self.args.schema_only:
                pass
                # pym.res.setup.setup(sess, rc=self.rc)
                # sess.flush()  # Need ID
                # pym.sys.setup.setup(sess, rc=self.rc)
                # sess.flush()  # Need ID
                # pym.auth.setup.setup(sess, rc=self.rc)
                # sess.flush()  # Need ID
                # pym.tenants.setup.setup(sess, rc=self.rc)
                # sess.flush()  # Need ID
                # pym.me.setup.setup(sess, rc=self.rc)
                # sess.flush()  # Need ID
                # pym.journals.setup.setup(sess, rc=self.rc)
                # sess.flush()  # Need ID

            if self.args.alembic_config:
                alembic_cfg = alembic.config.Config(self.args.alembic_config)
                alembic.command.stamp(alembic_cfg, "head")

            mark_changed(sess)
        # Clear redis cache
        self.cache.flushall()

    @staticmethod
    def _create_schema(sess):
        sess.execute('CREATE SCHEMA IF NOT EXISTS pym')


def parse_args(app):
    # Main parser
    parser = argparse.ArgumentParser(
        description="InitialiseDb command-line interface."
    )
    app.add_parser_args(parser, (('config', True),
        ('locale', False), ('alembic-config', False)))
    parser.add_argument(
        '--schema-only',
        action='store_true',
        help="""Create only schema without inserting users etc."""
    )
    return parser.parse_args()


def main(argv=None):
    start_time = time.time()
    if not argv:
        argv = sys.argv

    app_name = os.path.basename(argv[0])
    lgg = logging.getLogger('cli.' + app_name)

    # noinspection PyBroadException
    try:
        runner = Runner()
        args = parse_args(runner)
        runner.init_app(args, lgg=lgg, setup_logging=True)
        if hasattr(args, 'func'):
            args.func()
        else:
            runner.run()
    except Exception as exc:
        lgg.exception(exc)
        lgg.fatal('Program aborted!')
    else:
        lgg.info('Finished.')
    finally:
        lgg.info('Time taken: {}'.format(
            datetime.timedelta(seconds=time.time() - start_time))
        )


if __name__ == '__main__':
    main(sys.argv)
