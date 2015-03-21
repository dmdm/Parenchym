#!/usr/bin/env python
import datetime
import time
import argparse
import logging
import sys
import os

import pym.cli
from pym.res.models import VwParents


class Runner(pym.cli.Cli):

    def __init__(self):
        super().__init__()

    def run(self):
        rs = self.sess.query(VwParents)
        for r in rs:
            print(r.id, r.name, r.parent_path, r.parents)


def parse_args(app, argv):
    # Main parser
    parser = argparse.ArgumentParser(
        description="""Imports data of product mgmt."""
    )
    app.add_parser_args(parser, (('config', True), ('actor', False),
        ('locale', False), ('format', False), ('verbose', False)))

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
        runner.init_app(args, lgg=lgg, setup_logging=True)
        logging.getLogger().setLevel(logging.WARN)
        lgg.setLevel(logging.WARN)
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
