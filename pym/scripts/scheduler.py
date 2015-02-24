#!/usr/bin/env python
from collections import OrderedDict
from pprint import pprint
import textwrap
from sqlalchemy.orm import sessionmaker

import transaction
import time
import argparse
import logging
import sys
import os
import datetime
import yaml
from zope.sqlalchemy import ZopeTransactionExtension
from pym.auth.const import SYSTEM_UID
import pym.cli
import pym.exc
from pym.models import todata, todict, DbEngine, cache_regions, DbSession
import pym.cache


import sqlalchemy as sa
import sqlalchemy.exc
import sqlalchemy.orm.exc
from pym.sched import Scheduler

# CliDbSession = sessionmaker(
#     query_cls=pym.cache.query_callable(cache_regions),
#     extension=ZopeTransactionExtension()
# )


class Runner(pym.cli.Cli):
    def __init__(self):
        super().__init__()

    def init_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        super().init_app(args=args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)
        # CliDbSession.configure(bind=DbEngine)
        # self.sess = CliDbSession()

    def run(self):
        self.lgg.error('Please specify a command')

    def cmd_ls(self):
        rs = self.sess.query(
            Scheduler.id,
            Scheduler.enabled,
            Scheduler.section,
            Scheduler.job,
            Scheduler.state,
            Scheduler.next_time,
            Scheduler.schedule,
            Scheduler.start_time,
            Scheduler.end_time,
            Scheduler.duration,
            Scheduler._caption,
            Scheduler.descr,
            Scheduler.out,
            Scheduler.owner_id,
            Scheduler.ctime,
            Scheduler.editor_id,
            Scheduler.mtime,
            Scheduler.deleter_id,
            Scheduler.dtime,
            Scheduler.deletion_reason
        ).order_by(
            Scheduler.section,
            Scheduler.job,
        )
        data = [OrderedDict(zip(r.keys(), r)) for r in rs]
        self._print(data)

    @staticmethod
    def _parse_job_defs(s):
        if s.startswith('{'):
            return [yaml.safe_load(s)]
        else:
            with open(s, 'rt', encoding='utf-8') as fh:
                return [x for x in yaml.safe_load_all(fh)]

    def cmd_job(self):
        with transaction.manager:
            job_defs = self._parse_job_defs(self.args.job_def)
            for job_def in job_defs:
                try:
                    job = Scheduler.find(self.sess, job_def['job'])
                    job.editor_id = SYSTEM_UID
                    self.lgg.info("Updating existing job '{}'".format(
                        job_def['job']))
                except sa.orm.exc.NoResultFound:
                    job = Scheduler.create(self.sess, job_def['job'],
                                           job_def['func'], SYSTEM_UID)
                    self.lgg.info("Creating new job '{}'".format(job_def['job']))
                for k, v in job_def.items():
                    if k in ('id', 'job'):
                        continue
                    if k == 'caption':
                        k = '_caption'
                    setattr(job, k, v)

    def cmd_delete(self):
        job = self.args.job
        with transaction.manager:
            try:
                j = Scheduler.find(self.sess, job)
            except sa.orm.exc.NoResultFound:
                self.lgg.warn("Job not found: '{}'".format(job))
            else:
                self.sess.delete(j)
                self.lgg.info("Job deleted: '{}'".format(job))

    def cmd_start(self):
        from apscheduler.schedulers.background import BlockingScheduler
        sched = BlockingScheduler()
        with transaction.manager:
            Scheduler.add_all_to_apscheduler(sched, DbSession, user=SYSTEM_UID,
                                             begin_transaction=True)
        sched.start()
        sched.print_jobs()


def parse_args(app):
    # Main parser
    parser = argparse.ArgumentParser()
    app.add_parser_args(parser, (('config', True), ('format', False),
        ('locale', False), ('alembic-config', False)))

    subparsers = parser.add_subparsers(title="Commands", dest="subparser_name")

    parser_ls = subparsers.add_parser('ls',
        parents=[],
        help="List jobs",
        add_help=True
    )
    parser_ls.set_defaults(func=app.cmd_ls)

    parser_job = subparsers.add_parser('job',
        parents=[],
        help="Create/Update job",
        add_help=True,
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=textwrap.dedent("""\
            Creates or updates a job.
            The job definition is either a literal YAML string or the name of
            a YAML file, which may contain several job definitions (one per
            document).
            These fields are used:

            job:       Unique name of the job

            enabled:   true (default)/false

            (section): Name of section

            schedule:  CRONTAB-like mapping, e.g.
                       '{job: foo, schedule: { hour: 2, start_time: 2014-01-01 } }'
                       see https://apscheduler.readthedocs.org/en/latest/modules/triggers/cron.html#module-apscheduler.triggers.cron

            (caption): Name of job as displayed in UI

            (descr):   A description
        """)
    )
    parser_job.set_defaults(func=app.cmd_job)
    parser_job.add_argument('job_def')

    parser_start = subparsers.add_parser('start',
        parents=[],
        help="Adds all jobs to scheduler and starts it",
        add_help=True
    )
    parser_start.set_defaults(func=app.cmd_start)

    parser_delete = subparsers.add_parser('delete',
        parents=[],
        help="Delete job from database",
        add_help=True
    )
    parser_delete.set_defaults(func=app.cmd_delete)
    parser_delete.add_argument('job')

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
