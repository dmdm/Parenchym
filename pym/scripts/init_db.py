#!/usr/bin/env python

import transaction
import time
import argparse
import logging
import sys
import os
import datetime
import alembic.command
import alembic.config
from zope.sqlalchemy import mark_changed
import pym.cli
import pym.exc
import pym.cache
import pym.models
import pym.auth.manager
import pym.auth.models
import pym.res.setup
import pym.sys.setup
import pym.auth.setup
import pym.tenants.manager
import pym.tenants.setup
import pym.me.setup
import pym.fs.setup
import pym.journals.setup
import pym.help.setup


class Runner(pym.cli.Cli):
    def __init__(self):
        super().__init__()
        self.parser = None

    def init_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        super().init_app(args=args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)

    def run(self):
        sess = self._sess
        authmgr = pym.auth.manager.AuthMgr.factory(lgg=self.lgg, sess=sess,
            rc=self.rc)
        tenmgr = pym.tenants.manager.TenantMgr.factory(lgg=self.lgg, sess=self.sess,
            rc=self.rc)
        root_pwd = self.rc.g('auth.user_root.pwd')
        self._config.scan('pym')
        # Create schema
        # Make sure, views etc are also created here. In the next block we call
        # SA's create_all(), and SA creates a table for each class whose view
        # (__tablename__) does not exist yet!
        with transaction.manager:
            self._create_schema(sess)
            pym.res.setup.create_schema(sess, rc=self.rc)
            pym.sys.setup.create_schema(sess, rc=self.rc)
            pym.auth.setup.create_schema(sess, rc=self.rc)
            pym.tenants.setup.create_schema(sess, rc=self.rc)
            pym.me.setup.create_schema(sess, rc=self.rc)
            pym.fs.setup.create_schema(sess, rc=self.rc)
            pym.journals.setup.create_schema(sess, rc=self.rc)
            pym.help.setup.create_schema(sess, rc=self.rc)
            mark_changed(sess)
        with transaction.manager:
            # Create all models
            pym.models.create_all()
            # Users and stuff we need to setup the modules
            pym.auth.setup.populate(sess, authmgr=authmgr, root_pwd=root_pwd, rc=self.rc)
            if not self.args.schema_only:
                pass
                pym.res.setup.setup(sess, rc=self.rc)
                sess.flush()  # Need ID
                pym.sys.setup.setup(sess, rc=self.rc)
                sess.flush()  # Need ID
                pym.auth.setup.setup(sess, rc=self.rc)
                sess.flush()  # Need ID
                pym.tenants.setup.setup(sess, rc=self.rc, tenmgr=tenmgr)
                sess.flush()  # Need ID
                pym.me.setup.setup(sess, rc=self.rc)
                sess.flush()  # Need ID
                pym.fs.setup.setup(sess, rc=self.rc, authmgr=authmgr)
                sess.flush()  # Need ID
                pym.journals.setup.setup(sess, rc=self.rc)
                sess.flush()  # Need ID
                pym.help.setup.setup(sess, rc=self.rc)
                sess.flush()  # Need ID

            if self.args.alembic_config:
                alembic_cfg = alembic.config.Config(self.args.alembic_config)
                alembic.command.stamp(alembic_cfg, "head")

            mark_changed(sess)
        # Clear redis cache
        self.cache.flushdb()

    @staticmethod
    def _create_schema(sess):
        sess.execute('CREATE SCHEMA IF NOT EXISTS pym')


def parse_args(app):
    # Main parser
    parser = argparse.ArgumentParser(
        description="InitialiseDb command-line interface."
    )
    app.parser = parser
    app.add_parser_args(parser, (('config', True), ('locale', False),
        ('alembic-config', False), ('verbose', False)))
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
        lgg.info('Started.')
        if hasattr(args, 'func'):
            args.func()
        else:
            runner.run()
    except Exception as exc:
        lgg.exception(exc)
        lgg.fatal('Aborted!')
    else:
        lgg.info('Finished.')
    finally:
        lgg.info('Time taken: {}'.format(
            datetime.timedelta(seconds=time.time() - start_time))
        )


if __name__ == '__main__':
    main(sys.argv)
