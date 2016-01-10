import configparser
import getpass
import locale
import logging
import logging.config
import subprocess
import sys
import redis
import yaml
import pyramid.paster
import pyramid.config
import pyramid.request
import pyramid.testing
import json
import os
from prettytable import PrettyTable
import sqlalchemy as sa
import sqlalchemy.orm.exc
import pym.exc
from pym.security import safepath
import pym.auth.models
from pym.rc import Rc
import pym.models
import pym.lib
from pym.resp import JsonResp
import pym.testing
import pym.cache.configure


mlgg = logging.getLogger(__name__)


CMD_SASSC = os.path.abspath(os.path.join(os.path.dirname(__file__),
    '..', 'bin', 'sassc'))
"""
Command-line to call sassc.
"""


class DummyArgs(object):
    pass


class Cli(object):

    def __init__(self):
        self.dump_opts_json = dict(
            sort_keys=False,
            indent=4,
            ensure_ascii=False,
            cls=pym.lib.JsonEncoder
        )
        self.dump_opts_yaml = dict(
            allow_unicode=True,
            default_flow_style=False
        )
        self.lgg = mlgg
        self.rc = None
        self.rc_key = None
        self.args = None
        self.env = None
        self.request = pyramid.testing.DummyRequest()
        self.unit_tester = None
        self.settings = None
        self.lang_code = None
        self.encoding = None
        self.cache = None

        self._config = None
        self._sess = None
        self.actor = None
        self.parser = None
        """:type: pym.auth.models.User"""

    @staticmethod
    def add_parser_args(parser, which=None):
        """
        Adds default arguments to given parser instance.

        :param parser: Instance of a parser
        :param which: List of 2-Tuples. 1st elem tells which argument to add,
            2nd elem tells requiredness.
        """
        parser.add_argument(
            '--root-dir',
            default=os.getcwd(),
            help="Use this directory as root/work"
        )
        parser.add_argument(
            '--etc-dir',
            help="Directory with config, defaults to ROOT_DIR/etc"
        )
        if not which:
            which = [('config', True), ('locale', False), ('actor', True),
                ('verbose', False)]
        for x in which:
            if x[0] == 'config':
                parser.add_argument(
                    '-c',
                    '--config',
                    required=x[1],
                    help="""Path to INI file with configuration,
                        e.g. 'production.ini'"""
                )
            elif x[0] == 'locale':
                parser.add_argument(
                    '-l',
                    '--locale',
                    required=x[1],
                    help="""Set the desired locale.
                        If omitted and output goes directly to console, we
                        automatically use the console's locale."""
                )
            elif x[0] == 'alembic-config':
                parser.add_argument(
                    '--alembic-config',
                    required=x[1],
                    help="Path to alembic's INI file"
                )
            elif x[0] == 'format':
                parser.add_argument('-f', '--format', default='yaml',
                    choices=['yaml', 'json', 'tsv', 'txt'],
                    required=x[1],
                    help="Set format for input and output"
                )
            elif x[0] == 'actor':
                parser.add_argument(
                    '--actor',
                    required=x[1],
                    help="""Principal or ID of user who performs this command.
                        Becomes OWNER on creates, EDITOR on updates and, DELETER
                        on deletes. If omitted, we use the login name of the
                        console user."""
                )
            elif x[0] == 'verbose':
                parser.add_argument(
                    '-v', '--verbose',
                    action='count',
                    default=0,
                    help="""Sets logging level and shows more details, can be
                        stacked; e.g. -vvv. Typically we log only level warnings
                        and higher, -v also logs level info, and -vv logs level
                        debug."""
                )
            else:
                raise ValueError("Unknown: '{}'".format(x[0]))

    def base_init(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        """
        Initialises base for CLI apps: logger, console, rc, Pyramid Configurator

        Used by :meth:`init_app` and :meth:`init_web_app`.

        :param args: Namespace of parsed CLI arguments
        :param lgg: Inject a logger, or keep the default module logger
        :param rc: Inject a RC instance, or keep the loaded one.
        :param rc_key: *obsolete*
        :param setup_logging: Whether or not to setup logging as configured in
            rc. Default is True.
        """
        self.args = args
        fn_config = os.path.abspath(args.config)
        self.rc_key = rc_key
        if setup_logging:
            logging.config.fileConfig(
                fn_config,
                dict(
                    __file__=fn_config,
                    here=os.path.dirname(fn_config)
                ),
                # Keep module loggers
                disable_existing_loggers=False
            )
        if lgg:
            self.lgg = lgg

        if hasattr(args, 'verbose'):
            if args.verbose > 1:
                lgg.setLevel(logging.DEBUG)
            elif args.verbose > 0:
                lgg.setLevel(logging.INFO)

        p = configparser.ConfigParser()
        p.read(fn_config)
        settings = dict(p['app:main'])
        if 'environment' not in settings:
            raise KeyError('Missing key "environment" in config. Specify '
                'environment in INI file "{}".'.format(args.config))

        self.lang_code, self.encoding = init_cli_locale(
            args.locale if hasattr(args, 'locale') else None,
            detach_stdout=settings['environment'] != 'testing'
        )
        self.lgg.debug("TTY? {}".format(sys.stdout.isatty()))
        self.lgg.debug("Locale? {}, {}".format(self.lang_code, self.encoding))

        if not rc:
            if not args.etc_dir:
                args.etc_dir = os.path.join(args.root_dir, 'etc')
            rc = Rc(
                environment=settings['environment'],
                root_dir=args.root_dir,
                etc_dir=args.etc_dir
            )
            rc.load()
        settings.update(rc.data)
        self.rc = rc
        self.settings = settings
        self._config = pyramid.config.Configurator(
            settings=settings
        )
        self._config.registry['rc'] = rc
        self._config.scan('pym')

    def base_init2(self):
        self._sess = pym.models.DbSession()
        # if hasattr(self.args, 'actor') and self.args.actor:
        #     actor = self.args.actor
        #     try:
        #         try:
        #             actor = int(actor)
        #         except ValueError:
        #             self.actor = self._sess.query(pym.auth.models.User).filter(pym.auth.models.User.principal == actor).one()
        #         else:
        #             self.actor = self._sess.query(pym.auth.models.User).get(actor)
        #             if not self.actor:
        #                 raise sa.orm.exc.NoResultFound("Actor '{}' not found".format(actor))
        #     except sa.orm.exc.NoResultFound:
        #         raise sa.orm.exc.NoResultFound("Actor '{}' not found".format(actor))
        # else:
        #     self.actor = getpass.getuser()
        if hasattr(self.args, 'actor') and self.args.actor:
            actor = self.args.actor
        else:
            actor = getpass.getuser()
        if hasattr(self.args, 'actor'):
            try:
                self.actor = pym.auth.models.User.find(self._sess, actor)
            except sa.orm.exc.NoResultFound:
                raise sa.orm.exc.NoResultFound("Actor '{}' not found".format(actor))
            self.lgg.debug('Actor: {}'.format(self.actor))

    def init_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        """
        Initialises Pyramid application for command-line use.

        Additional to :meth:`base_init`, initialises SQLAlchemy and a DB
        session, authentication module and the cache.

        :param args: Namespace of parsed CLI arguments
        :param lgg: Inject a logger, or keep the default module logger
        :param rc: Inject a RC instance, or keep the loaded one.
        :param rc_key: *obsolete*
        :param setup_logging: Whether or not to setup logging as configured in
            rc. Default is True.
        """
        self.base_init(args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)

        pym.models.init(self.settings, 'db.pym.sa.')
        self.cache = redis.StrictRedis.from_url(
            **self.rc.get_these('cache.redis'))
        pym.cache.configure.configure_cache_regions(self.rc)

        self.base_init2()

    def init_web_app(self, args, lgg=None, rc=None, rc_key=None, setup_logging=True):
        """
        Initialises the full web application.

        Additional to :meth:`base_init`, lets Paster bootstrap a complete
        WSGI application. Its environment will then be in attribute ``env``,
        and an initialised request in attribute ``request``.
        """
        self.base_init(args, lgg=lgg, rc=rc, rc_key=rc_key,
            setup_logging=setup_logging)

        req = pyramid.request.Request.blank('/',
            base_url='http://localhost:6543')
        # paster.bootstrap calls the entry point configured in the INI which also
        # initialises models, session, and cache
        self.env = pyramid.paster.bootstrap(
            os.path.join(
                self.rc.root_dir,
                args.config
            ),
            request=req
        )
        self.request = self.env['request']
        self.request.root = self.env['root']
        self.base_init2()

    def run(self):
        """Override in child class if necessary"""
        self.parser.print_help()

    def impersonate_root(self):
        self.request.user.impersonate('root')

    def impersonate_unit_tester(self):
        sess = pym.models.DbSession()
        ut = pym.testing.create_unit_tester(self.lgg, sess)
        self.request.user.impersonate(ut)
        self.unit_tester = ut

    def print(self, data):
        """
        Prints data according to given format.

        Format is specified via command-line argument ``--format`` and may be
        ``JSON``, ``YAML``, or ``TXT``

        :param data: Some data, e.g. a list of dicts.
        """
        fmt = self.args.format.lower()
        if fmt == 'json':
            self.print_json(data)
        elif fmt == 'tsv':
            self.print_tsv(data)
        elif fmt == 'txt':
            if data:
                self.print_txt(data)
            else:
                print('No data')
        else:
            self.print_yaml(data)

    def print_json(self, data):
        """
        Prints data as JSON.

        JSON options are given in attribute ``dump_opts_json``.
        """
        print(json.dumps(data, **self.dump_opts_json))

    @staticmethod
    def print_tsv(data):
        """
        Prints data as TSV text (tab-separated).

        :param data: If data is a list of dicts, uses keys of first row as
            column headers. If data is just a dict, uses its keys. If data is
            a list, no column headers are written.
        """
        try:
            hh = data[0].keys()
            print("\t".join(hh))
        except KeyError:  # missing data[0]
            # Data was not a list, maybe a dict
            hh = data.keys()
            print("\t".join(hh))
            print("\t".join([str(v) for v in data.values()]))
        except AttributeError:  # missing data.keys()
            # Data is just a list
            print("\t".join(data))
        else:
            # Data is list of dicts (like resultset from DB)
            for row in data:
                print("\t".join([str(v) for v in row.values()]))

    @staticmethod
    def print_txt(data):
        """
        Prints data as a table.

        Uses ``prettytable``. You may want to use
        :class:`~collections.OrderedDict` for the dicts in the data to define
        a consistent sequence of columns.

        :param data: If data is a list of dicts, uses keys of first row as
            column headers. If data is just a dict, uses its keys. If data is
            a list, column headers are just the indices.
        :return:
        """
        # We need a list of hh for prettytable, otherwise we get
        # TypeError: 'KeysView' object does not support indexing
        try:
            hh = data[0].keys()
        except KeyError:  # missing data[0]
            # Data was not a list, maybe a dict
            hh = data.keys()
            t = PrettyTable(list(hh))
            t.align = 'l'
            t.add_row([data[h] for h in hh])
            print(t)
        except AttributeError:  # missing data.keys()
            # Just a simple list
            # PrettyTable *must* have column headers and the headers *must*
            # be str, not int or else!
            t = PrettyTable([str(i) for i in range(len(data))])
            t.align = 'l'
            t.add_row(data)
            print(t)
        else:
            # Data is list of dicts (like resultset from DB)
            t = PrettyTable(list(hh))
            t.align = 'l'
            for row in data:
                t.add_row([row[h] for h in hh])
            print(t)

    def print_yaml(self, data):
        """
        Prints data as YAML.

        Options are given in attribute ``dump_opts_yaml``.
        """
        yaml.dump(data, sys.stdout, **self.dump_opts_yaml)

    def parse(self, data):
        """
        Parses data according to given format and returns Python data structure.

        Format is specified by command-line argument ``--format``.

        :param data:
        :return: Parsed data as Python data structure
        """
        fmt = self.args.format.lower()
        if fmt == 'json':
            return self.parse_json(data)
        if fmt == 'tsv':
            return self.parse_tsv(data)
        if fmt == 'txt':
            raise NotImplementedError("Reading data from pretty ASCII tables"
                "is not implemented")
        else:
            return self.parse_yaml(data)

    @staticmethod
    def parse_json(data):
        """
        Parses data as JSON.
        """
        return json.loads(data)

    @staticmethod
    def parse_tsv(s):
        """
        Parses data as TSV (tab-separated).
        """
        data = []
        for row in "\n".split(s):
            data.append([x.strip() for x in "\t".split(row)])
        return data

    @staticmethod
    def parse_yaml(data):
        """
        Parses data as YAML.
        """
        return yaml.load(data)

    @property
    def sess(self):
        """
        Initialised DB session.

        The session is created from the web app's default settings and therefore
        is in most cases a scoped session with transaction extension. If you need
        a different session, caller may create one itself and set this property.
        """
        return self._sess

    @sess.setter
    def sess(self, v):
        self._sess = v


def compile_sass_file(infile, outfile, output_style='nested'):
    try:
        _ = subprocess.check_output([CMD_SASSC, '-t',
            output_style, infile, outfile],
            stderr=subprocess.STDOUT)
        return True
    except subprocess.CalledProcessError as exc:
        raise pym.exc.SassError("Compilation failed: {}".format(
            exc.output.decode('utf-8')))


def compile_sass(in_, out):
    resp = JsonResp()
    # in_ is string, so we have one input file
    # Convert it into list
    if isinstance(in_, str):
        infiles = [safepath(in_)]
        # in_ is str and out is string, so treat out as file:
        # Build list of out filenames.
        if isinstance(out, str):
            outfiles = [safepath(out)]
    else:
        infiles = [safepath(f) for f in in_]
        # in_ is list and out is string, so treat out as directory:
        # Build list of out filenames.
        if isinstance(out, str):
            outfiles = []
            out = safepath(out)
            for f in in_:
                bn = os.path.splitext(os.path.basename(f))[0]
                outfiles.append(os.path.join(out, bn) + '.css')
        # in_ and out are lists
        else:
            outfiles = [safepath(f) for f in out]
    for i, inf in enumerate(infiles):
        # noinspection PyUnboundLocalVariable
        outf = outfiles[i]
        if not os.path.exists(inf):
            raise pym.exc.SassError("Sass infile '{0}' does not exist.".format(inf))
        result = compile_sass_file(inf, outf)
        if result is not True:
            resp.error("Sass compilation failed for file '{0}'".format(inf))
            resp.add_msg(dict(kind="error", title="Sass compilation failed",
                text=result))
            continue
        resp.ok("Sass compiled to outfile '{0}'".format(outf))
    if not resp.is_ok:
        raise pym.exc.SassError("Batch compilation failed. See resp.", resp)
    return resp


def init_cli_locale(locale_name, detach_stdout=True):
    """
    Initialises CLI locale and encoding.

    Sets a certain locale. Ensures that output is correctly encoded, whether
    it is send directly to a console or piped.

    :param locale_name: A locale name, e.g. "de_DE.utf8".
    :param detach_stdout: If True (default), and we are not in a TTY (meaning,
        output is piped somewhere), we replace original STDOUT with a writer
        from the codecs module. If you do not want that (e.g. in PyCharm test
        runner), set this to False.
    :return: active locale as 2-tuple (lang_code, encoding)
    """
    # Set the locale
    if locale_name:
        locale.setlocale(locale.LC_ALL, locale_name)
    else:
        if sys.stdout.isatty():
            locale.setlocale(locale.LC_ALL, '')
        else:
            locale.setlocale(locale.LC_ALL, 'en_GB.utf8')
    # lang_code, encoding = locale.getlocale(locale.LC_ALL)
    lang_code, encoding = locale.getlocale(locale.LC_CTYPE)
    # If output goes to pipe, detach stdout to allow writing binary data.
    # See http://docs.python.org/3/library/sys.html#sys.stdout
    global PREV_STDOUT
    if detach_stdout and not sys.stdout.isatty():
        import codecs
        sys.stdout = codecs.getwriter(encoding)(sys.stdout.detach())
    return lang_code, encoding