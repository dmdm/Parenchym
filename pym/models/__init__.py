# Interesting reads:
# http://stackoverflow.com/questions/270879/efficiently-updating-database-using-sqlalchemy-orm/278606#278606
# http://stackoverflow.com/questions/9593610/creating-a-temporary-table-from-a-query-using-sqlalchemy-orm
# http://stackoverflow.com/questions/9766940/how-to-create-an-sql-view-with-sqlalchemy
# Materialized view:
# http://stackoverflow.com/questions/11114903/oracle-functional-index-creation
#
# http://stackoverflow.com/questions/4617291/how-do-i-get-a-raw-compiled-sql-query-from-a-sqlalchemy-expression

import collections
import datetime
import sqlalchemy as sa
import sqlalchemy.event
from sqlalchemy import engine_from_config, MetaData
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    ColumnProperty,
    class_mapper
)
import sqlalchemy.orm.query
import sqlalchemy.types
from sqlalchemy.orm.collections import InstrumentedList
from sqlalchemy.ext.declarative import (
    declarative_base,
    declared_attr)
from sqlalchemy.sql import compiler
import sqlalchemy.engine
from psycopg2.extensions import adapt as sqlescape
# or use the appropriate escape function from your db driver
from sqlalchemy.util import KeyedTuple

from zope.sqlalchemy import ZopeTransactionExtension
from zope.deprecation import deprecation
import pym.exc
from pym.i18n import _
import pym.lib
import pym.i18n
import pym.cache
from .types import LocalDateTime


# ===[ DB HELPERS ]=======

naming_convention = {
    "ix": '%(column_0_label)s_ix',
    "uq": "%(table_name)s_%(column_0_name)s_ux",
    "ck": "%(table_name)s_%(constraint_name)s_ck",
    "fk": "%(table_name)s_%(column_0_name)s_%(referred_table_name)s_fk",
    "pk": "%(table_name)s_pk"
}

cache_regions = {}

DbSession = scoped_session(
    sessionmaker(
        query_cls=pym.cache.query_callable(cache_regions),
        extension=ZopeTransactionExtension()
    )
)

"""
Factory for DB session.
"""
metadata = MetaData(
    naming_convention=naming_convention
)

DbBase = declarative_base(metadata=metadata)
"""
Our base class for declarative models.
"""
DbEngine = None
"""
Default DB engine.
"""


# ================================

# import sqlparse
# from pprint import pprint
# @event.listens_for(sqlalchemy.engine.Engine, "before_cursor_execute",
#     retval=True)
# def before_cursor_execute(conn, cursor, statement,
#                 parameters, context, executemany):
#     print("\n", 'v' * 79)
#     print(sqlparse.format(statement, reindent=True, keyword_case='upper'))
#     print('-' * 79, "\n")
#     pprint(parameters)
#     print('^' * 79, "\n")
#     return statement, parameters

# import sqlparse
# from pprint import pprint
# @event.listens_for(sqlalchemy.engine.Engine, "before_cursor_execute",
#     retval=True)
# def before_cursor_execute(conn, cursor, statement,
#                 parameters, context, executemany):
#     sql = cursor.mogrify(statement, parameters).decode('UTF-8')
#     print("\n", 'v' * 79)
#     print(sqlparse.format(sql, reindent=True, keyword_case='upper'))
#     # print('-' * 79, "\n")
#     # from traceback import print_stack
#     # print_stack()
#     print('^' * 79, "\n")
#     return statement, parameters


# ===[ IMPORTABLE SETUP FUNCS ]=======

def init(settings, prefix='', invalidate_caches=False):
    """
    Initializes scoped SQLAlchemy by rc settings.

    Creates engine, binds a scoped session and declarative base.
    Call this function for global initialization of the WebApp.

    Initialises the module globals ``DbEngine``, ``DbSession`` and ``DbBase``.
    The session is joined into the Zope Transaction Manager.

    :param settings: Dict with settings
    :param prefix: Prefix for SQLAlchemy settings
    """
    global DbEngine
    DbEngine = engine_from_config(
        settings, prefix,
        json_serializer=pym.lib.json_serializer,
        json_deserializer=pym.lib.json_deserializer
    )
    DbSession.configure(bind=DbEngine)
    DbBase.metadata.bind = DbEngine

    add_cache_region('default', pym.cache.region_default)
    add_cache_region('auth_short_term', pym.cache.region_auth_short_term)
    add_cache_region('auth_long_term', pym.cache.region_auth_long_term)
    if invalidate_caches:
        pym.cache.region_default.invalidate()
        pym.cache.region_auth_short_term.invalidate()
        pym.cache.region_auth_long_term.invalidate()


def init_unscoped(settings, prefix):
    """
    Initializes unscoped SQLAlchemy by rc settings.

    Creates engine, binds a regular session and declarative base.
    Call this function for global initialization of the WebApp.

    Initialises the module globals ``DbEngine``, ``DbSession`` and ``DbBase``.
    This session has no external transaction manager.

    :param settings: Dict with settings
    :param prefix: Prefix for SQLAlchemy settings
    :return: Dict with ``DbEngine``, ``DbSession`` and ``DbBase``.
    """
    global DbEngine, DbSession, DbBase
    DbEngine = engine_from_config(
        settings, prefix,
        json_serializer=pym.lib.json_serializer,
        json_deserializer=pym.lib.json_deserializer
    ),
    DbSession = sessionmaker(bind=DbEngine)
    DbBase = declarative_base(bind=DbEngine)


def create_all():
    """Creates bound data model."""
    DbBase.metadata.create_all(DbEngine)


def add_cache_region(name, region):
    cache_regions[name] = region


def exists(sess, name, schema='public'):
    """
    Checks if given relation exists.

    Relation may be:

    r = ordinary table
    i = index
    S = sequence
    v = view
    f = foreign table
    m = materialized view

    :param sess: Instance of a DB session.
    :param name: Name of the relation.
    :param schema: Optional name of schema. Defaults to 'public'.
    :return: One of above mentioned letters if relation exists, None if not.
    """
    q = sa.text("""
        SELECT c.relkind
        FROM   pg_class     c
        JOIN   pg_namespace n ON n.oid = c.relnamespace
        WHERE  c.relname = :name     -- sequence name here
        AND    n.nspname = :schema  -- schema name here
        AND    c.relkind = ANY('{r,i,S,v,f,m}');
    """)
    k = sess.execute(q, {'name': name, 'schema': schema}).scalar()
    return k if k else None

# ================================

### # ===[ FOR SQLITE ]=======
### @event.listens_for(DbEngine, "connect")
### def set_sqlite_pragma(dbapi_connection, connection_record):
###     """
###     This is supposed to turn foreign key constraints on for SQLite, so that
###     we can use SA's ``passive_delete=True``.
###
###     XXX Alas, (at least from CLI scripts) we get an error:
###     ``sqlalchemy.exc.InvalidRequestError: No such event 'connect' for
###     target 'None'``
###     """
###     cursor = dbapi_connection.cursor()
###     cursor.execute("PRAGMA foreign_keys=ON")
###     cursor.close()
### # ================================


# ===[ HELPER ]===================


def dictate(inp, objects_as='nested', fmap=None, excludes=None, includes=None,
           dict_class=collections.OrderedDict, special_cols=None, qual_sep='_'):
    """
    Transmogrifies input into dict.

    By default, the created dict is a :class:`~collections.OrderedDict` which
    has column ``id`` as the first, and the other columns of :class:`PymMixin`
    at the end.

    There are three types of input data we can process:

        - Object:

          This is a single instance of an entity, e.g. the result of a query
          like this: ``sess.query(User).first()``.

          :func:`dictate` transforms this object into a single dict, which will
          be the return value.

          We only process object's columns, not its relationships. Use ``fmap``
          in case you need columns from a relationship mapped into this dict.

        - Keyed tuple:

          We process keyed tuples key by key. If the respective value is of a
          scalar type, put it in the resulting dict under the same key.
          Otherwise we treat the value as an object which we will process
          individually. We store the resulting dict of that sub-processing
          in the final dict under a key of the object's class name.

          For example, a row of this query
          ``sess.query(ResourceNode, User.principal).join(User, ResourceNode.owner_id == User.id).all()``
          is a keyed tuple with keys ``['ResourceNode', 'principal']``.

          Key ``principal`` is of type ``str`` , and thus stored as-is in
          ``result_dict['principal'] = value``.

          Key ``ResourceNode`` on the other hand is an object, which we
          transform into a dict of its own. If argument ``objects_as`` is
          ``nested``, which is the default, we store this object's dict under the
          object's class name as ``result_dict['ResourceNode'] = object_dict``.
          If ``objects_as`` is ``flat`` we update the resulting dict with
          the object dict. This may overwrite existing keys, which the caller
          has to handle by e.g. using labels in the query. If ``objects_as``
          is ``qualified`` we again store the values of the object's dict in the
          resulting dict, but using keys prefixed with the class name.

          If we are sub-processing an object, configure ``includes``,
          `excludes``, and ``fmap`` for this object as a nested dict under a
          key that is the object's class name. E.g.
          ``fmap['ResourceNode']['parent'] = lambda it: it.name``.

        - RowProxy:

          We treat RowProxies like KeyedTuples. Seems to work ;)

    We keep the old functions ``todict`` and ``todata`` for legacy reasons, but
    they are deprecated.

    One key advantage of :func:`dictate` over those is, ``dictate`` uses the
    modern inspection system of SQLAlchemy, which can handle attributes of
    polymorphically inherited classes. E.g. if ``ResourceNode`` is the ancestor
    of ``Tenant``, processing ``Tenant`` the old functions fail to see
    attributes that stem from ``ResourceNode``.

    CAVEAT:

    - We still do not catch hybrid attributes of an ancestor class. Use ``fmap``
      if you need them.

    :param inp: Data object to transmogrify.
    :type inp: sqlalchemy.util.KeyedTuple | object | sqlalchemy.engine.result.RowProxy
    :param objects_as: How to store attributes of objects. ``nested`` (default),
        ``flat``, or ``qualified``.
    :type objects_as: str
    :param fmap: Mapping of column names to functions. Each function is called
        to build the value for this column. May be a lambda expression.
    :type fmap: NoneType | dict
    :param excludes: List of column names to exclude.
    :type excludes: NoneType | list
    :param includes: List of column names to include. If None, all columns are
        included
    :type includes: NoneType | list
    :param dict_class: Class of the dict to build. Defaults to
        :class:`collections.OrderedDict`.
    :type dict_class: type
    :param special_cols: List of columns that are treated specially, i.e. put
        at the end. If None, these are the columns of :class:`PymMixin`.
    :param qual_sep: Separator (char) for qualified names. Defaults to ``_``
        (underscore).
    """
    if special_cols is None:
        special_cols = ['id', 'owner_id', 'ctime', 'editor_id', 'mtime',
            'deleter_id', 'dtime', 'deletion_reason']
        allowed_objects_as = ('flat', 'nested', 'qualified')
        if objects_as not in allowed_objects_as:
            raise pym.exc.PymError("Parameter 'object_as' must be one of {},"
                " not '{}'".format(allowed_objects_as, objects_as))

        def prep(qual):
            if qual:
                try:
                    incl = includes[qual]
                except (TypeError, KeyError):
                    incl = None
                try:
                    excl = excludes[qual]
                except (TypeError, KeyError):
                    excl = None
                try:
                    fm = fmap[qual]
                except (TypeError, KeyError):
                    fm = None
                qual += qual_sep
            else:
                incl = includes if not isinstance(includes, dict) else ()
                excl = excludes if not isinstance(excludes, dict) else ()
                if fmap:
                    fm = fmap if not isinstance(list(fmap.values())[0], dict) else {}
                else:
                    fm = {}
            return incl, excl, fm, qual

        def proc_columns(o, qual, columns, value_getter, lvl):
            if lvl > 1:
                raise pym.exc.PymError("Max depth exceeded")
            incl, excl, fm, qual = prep(qual)
            od = dict_class()
            # ID
            ok = qual + 'id' if objects_as == 'qualified' and qual else 'id'
            try:
                od[ok] = value_getter('id')
            except (KeyError, AttributeError):
                pass
            # columns
            for col in columns:
                if col in special_cols:
                    continue
                if incl and col not in incl:
                    continue
                if excl and col in excl:
                    continue
                ok = qual + col if objects_as == 'qualified' and qual else col
                v = value_getter(col)
                try:
                    # Use col as subqual, not class name. If query has aliases,
                    # col is the alias name. If we used class name, all aliases
                    # of the same class would be stored under that same key.
                    # subqual = v.__class__.__name__
                    subqual = col
                    subd = proc_object(v, qual=subqual, lvl=lvl + 1)
                    if objects_as in ('flat', 'qualified'):
                        od.update(subd)
                    else:
                        od[subqual] = subd
                except NoInspectionAvailable:
                    od[ok] = v
            # special columns
            for col in special_cols:
                if col == 'id':
                    continue
                if incl and col not in incl:
                    continue
                if excl and col in excl:
                    continue
                ok = qual + col if objects_as == 'qualified' and qual else col
                try:
                    od[ok] = value_getter(col)
                except (AttributeError, KeyError):
                    pass
            # function map
            if fm:
                for col, f in fm.items():
                    ok = qual + col if objects_as == 'qualified' and qual else col
                    od[ok] = f(o)
            return od

        def proc_object(o, qual, lvl):
            x = sa.inspect(o)
            columns = x.mapper.columns.keys()
            value_getter = lambda col: x.attrs[col].value
            od = proc_columns(o, qual, columns, value_getter, lvl)
            return od

        def proc_keyed_tuple(o):
            columns = o.keys()
            value_getter = lambda col: getattr(o, col)
            ktd = proc_columns(o, None, columns, value_getter, 0)
            return ktd

        def proc_row_proxy(o):
            columns = o.keys()
            value_getter = lambda col: getattr(o, col)
            ktd = proc_columns(o, None, columns, value_getter, 0)
            return ktd

        # if isinstance(inp, KeyedTuple):
        if isinstance(inp, tuple):  # For SA>=1.0.0, previously used KeyedTuple
            return proc_keyed_tuple(inp)
        if isinstance(inp, RowProxy):
            return proc_row_proxy(inp)
        return proc_object(inp, None, 0)


def dictate_iter(inp, objects_as='nested', fmap=None, excludes=None, includes=None,
           dict_class=collections.OrderedDict, special_cols=None):
    """
    Transforms iterable into list of dicts.

    We treat the iterable as a collection of rows. Depending on the query, a row
    is a single object (``sess.query(User)``), or a
    :class:`sqlalchemy.util.KeyedTuple`.

    The result will be a list, each row a dict. Objects and keyed tuples are
    further processed into key/value pairs to form that dict.

    Transforms each row by applying :func:`dictate`. All parameters are passed
    through.

    :return: List of dicts.
    """
    return [
        dictate(inp=r, objects_as=objects_as, fmap=fmap, excludes=excludes,
            includes=includes, dict_class=dict_class, special_cols=special_cols)
        for r in inp
    ]


@deprecation.deprecate('Use dictate() instead')
def todict(o, fully_qualified=False, fmap=None, excludes=None, includes=None,
           dict_class=collections.OrderedDict) -> dict:
    """Transmogrifies data object into dict.

    Inspired by
    http://blog.mitechie.com/2010/04/01/hacking-the-sqlalchemy-base-class/
    Converts only physical table columns.

    By default, the created dict is a :class:`~collections.OrderedDict` which
    has column ``id`` as the first, and the other columns of :class:`PymMixin`
    at the end.

    :param o: Data object to transmogrify.
    :type o: sqlalchemy.util.KeyedTuple |
        sqlalchemy.ext.declarative.api.DeclarativeMeta
    :param fully_qualified: Whether the keys of returned dict are fully
        qualified column names or not. N.b. that full column names are only
        available if ``o`` has attribute ``__table__``, which e.g. for
        KeyedTuples is not the case.
    :type fully_qualified: bool
    :param fmap: Mapping of column names to functions. Each function is called
        to build the value for this column. May be a lambda expression.
    :type fmap: dict
    :param excludes: List of column names to exclude.
    :type excludes: NoneType | list
    :param includes: List of column names to include. If None, all columns are
        included
    :type includes: NoneType | list
    :param dict_class: Class of the dict to build. Defaults to
        :class:`collections.OrderedDict`.
    :type dict_class: type
    """

    def convert_datetime(v):
        try:
            return v.strftime("%Y-%m-%d %H:%M:%S")
        except AttributeError:
            # 'NoneType' object has no attribute 'strftime'
            return None

    def keyed_tuple_to_dict():
        kk = o.keys()
        try:
            d[special_cols[0]] = getattr(o, special_cols[0])
        except AttributeError:
            pass
        for k in kk:
            if k in excludes:
                continue
            if includes is not None and k not in includes:
                continue
            if k in special_cols:
                continue
            d[k] = getattr(o, k)
        if fmap:
            for k, func in fmap.items():
                d[k] = func(o)
        for k in special_cols[1:]:
            try:
                d[k] = getattr(o, k)
            except AttributeError:
                pass

    def entity_to_dict():
        pref = o.__table__.schema + '.' + o.__table__.name + '.' \
            if fully_qualified else ''
        try:
            d[special_cols[0]] = getattr(o, special_cols[0])
        except AttributeError:
            pass
        for c in o.__table__.columns:
            if c.name in excludes:
                continue
            if includes is not None and c.name not in includes:
                continue
            if c.name in special_cols:
                continue
            if isinstance(c.type, sa.DateTime):
                value = convert_datetime(getattr(o, c.name))
            elif isinstance(c, InstrumentedList):
                value = list(c)
            else:
                value = getattr(o, c.name)
            d[pref + c.name] = value
        if fmap:
            for k, func in fmap.items():
                d[pref + k] = func(o)
        for k in special_cols[1:]:
            try:
                d[pref + k] = getattr(o, k)
            except AttributeError:
                pass

    d = dict_class()
    if excludes is None:
        excludes = []
    special_cols = ['id', 'owner_id', 'ctime', 'editor_id', 'mtime',
        'deleter_id', 'dtime', 'deletion_reason']

    if isinstance(o, sa.util.KeyedTuple):
        keyed_tuple_to_dict()
    else:
        entity_to_dict()
    return d


@deprecation.deprecate('Use dictate_iter() instead')
def todata(rs, fully_qualified=False, fmap=None, excludes=None, includes=None,
           dict_class=collections.OrderedDict) -> list:
    """
    Transmogrifies a result set into a list of dicts.

    Applies :func:`todict` to each iterated row.
    For params not explained here, see :func:`todict`.

    :param rs: Data to transmogrify. May be some iterable like a list or a
        result set from a query. May also be a single ORM entity.
    :type rs: list | sqlalchemy.orm.query.Query |
        sqlalchemy.ext.declarative.api.DeclarativeMeta
    :returns: A list of the transmogrified records.
    """
    if isinstance(rs, (list, sqlalchemy.orm.query.Query)):
        data = []
        for row in rs:
            data.append(
                todict(
                    row,
                    fully_qualified=fully_qualified,
                    fmap=fmap,
                    excludes=excludes,
                    includes=includes,
                    dict_class=dict_class
                )
            )
        return data
    else:
        return [
            todict(
                rs,
                fully_qualified=fully_qualified,
                fmap=fmap,
                excludes=excludes,
                includes=includes,
                dict_class=dict_class
            )
        ]


def attribute_names(cls, kind="all"):
    if kind == 'columnproperty':
        return [prop.key for prop in class_mapper(cls).iterate_properties
            if isinstance(prop, ColumnProperty)]
    else:
        return [prop.key for prop in class_mapper(cls).iterate_properties]


def compile_query(query):
    dialect = query.session.bind.dialect
    statement = query.statement
    comp = compiler.SQLCompiler(dialect, statement)
    comp.compile()
    # enc = dialect.encoding
    params = {}
    for k, v in comp.params.items():
        params[k] = sqlescape(v)
    return comp.string % params

# ===[ COMPILER CREATEVIEW ]=======

# http://stackoverflow.com/questions/9766940/how-to-create-an-sql-view-with-sqlalchemy

# class CreateView(Executable, ClauseElement):
#     def __init__(self, name, select):
#         self.name = name
#         self.select = select
#
#
# @compiles(CreateView)
# def visit_create_view(element, compiler, **kw):
#     return "CREATE VIEW %s AS %s" % (
#          element.name,
#          compiler.process(element.select, literal_binds=True)
#          )

# # test data
# from sqlalchemy import MetaData, Column, Integer
# from sqlalchemy.engine import create_engine
# engine = create_engine('sqlite://')
# metadata = MetaData(engine)
# t = Table('t',
#           metadata,
#           Column('id', Integer, primary_key=True),
#           Column('number', Integer))
# t.create()
# engine.execute(t.insert().values(id=1, number=3))
# engine.execute(t.insert().values(id=9, number=-3))
#
# # create view
# createview = CreateView('viewname', t.select().where(t.c.id>5))
# engine.execute(createview)
#
# # reflect view and print result
# v = Table('viewname', metadata, autoload=True)
# for r in engine.execute(v.select()):
#     print r
#
# @compiles(CreateView, 'sqlite')
# def visit_create_view(element, compiler, **kw):
#     return "CREATE VIEW IF NOT EXISTS %s AS %s" % (
#          element.name,
#          compiler.process(element.select, literal_binds=True)
#          )


class DefaultMixin(object):
    """Mixin to add Parenchym's standard fields to a model class.

    These are: id, ctime, owner, mtime, editor.
    """

    IDENTITY_COL = 'name'
    """
    Name of a column that can be used to identify a record uniquely, besides ID.
    """

    id = sa.Column(sa.Integer, primary_key=True, nullable=False,
        info={'colanderalchemy': {'title': _("ID")}})
    """Primary key of table."""

    ctime = sa.Column(LocalDateTime, server_default=sa.func.current_timestamp(),
        nullable=False,
            info={'colanderalchemy': {'title': _("Creation Time")}})
    """Timestamp, creation time."""

    # noinspection PyMethodParameters
    @declared_attr
    def owner_id(cls):
        """ID of user who created this record."""
        return sa.Column(
            sa.Integer(),
            sa.ForeignKey(
                "pym.user.id",
                onupdate="CASCADE",
                ondelete="RESTRICT"
            ),
            nullable=False,
            info={'colanderalchemy': {'title': _("OwnerID")}}
        )

    mtime = sa.Column(LocalDateTime, nullable=True,
            info={'colanderalchemy': {'title': _("Mod Time")}})
    """Timestamp, last edit time."""

    # noinspection PyMethodParameters
    @declared_attr
    def editor_id(cls):
        """ID of user who was last editor."""
        return sa.Column(
            sa.Integer(),
            sa.ForeignKey(
                "pym.user.id",
                onupdate="CASCADE",
                ondelete="RESTRICT"
            ),
            nullable=True,
            info={'colanderalchemy': {'title': _("EditorID")}}
        )

    dtime = sa.Column(LocalDateTime, nullable=True,
            info={'colanderalchemy': {'title': _("Deletion Time")}})
    """Timestamp, deletion time."""

    # noinspection PyMethodParameters
    @declared_attr
    def deleter_id(cls):
        """ID of user who tagged this this record as deleted."""
        return sa.Column(
            sa.Integer(),
            sa.ForeignKey(
                "pym.user.id",
                onupdate="CASCADE",
                ondelete="RESTRICT"
            ),
            nullable=True,
            info={'colanderalchemy': {'title': _("DeleterID")}}
        )

    # noinspection PyMethodParameters
    @declared_attr
    def deletion_reason(cls):
        """Optional reason for deletion."""
        return sa.Column(sa.Unicode(255), nullable=True,
            info={'colanderalchemy': {'title': _("Deletion Reason")}}
        )

    def dump(self):
        from pym.models import todict
        from pprint import pprint
        pprint(todict(self))

    @classmethod
    def find(cls, sess, obj, **filter_args):
        """
        Finds given object and returns its instance.

        Input object may be the integer ID of a DB record, or a value that is
        checked in IDENTITY_COL. If object is already the requested instance,
        it is returned unchanged.

        Raises NoResultFound if object is unknown.
        """
        if isinstance(obj, int):
            o = sess.query(cls).get(obj)
            if not o:
                raise sa.orm.exc.NoResultFound(
                    "Failed to find {} by integer ID {}".format(
                        cls.__name__, obj))
            return o
        elif isinstance(obj, cls):
            return obj
        else:
            if not cls.IDENTITY_COL and not filter_args:
                raise TypeError('{} has no IDENTITY_COL and no filter args'
                                ' given'.format(cls.__name__))
            if cls.IDENTITY_COL and obj:
                filter_args[cls.IDENTITY_COL] = obj
            try:
                return sess.query(cls).filter_by(**filter_args).one()
            except sa.orm.exc.NoResultFound:
                if cls.IDENTITY_COL and obj:
                    m = "Failed to find {} by identity value '{}' in column {}" \
                        " and filter {}".format(cls.__name__, obj,
                        cls.IDENTITY_COL, filter_args)
                else:
                    m = "Failed to find {} by filter {}".format(cls.__name__,
                        cls.IDENTITY_COL, filter_args)
                raise sa.orm.exc.NoResultFound(m)

    def is_deleted(self):
        return self.deleter_id is not None


@sa.event.listens_for(DefaultMixin, 'before_update', propagate=True)
def receive_before_update(mapper, connection, target):
    will_result_in_update_sql = sa.orm.object_session(target).is_modified(
        target, include_collections=False)
    if will_result_in_update_sql:
        # Now check editor_id
        if target.editor_id is None and target.deleter_id is None:
            raise ValueError('Either editor or deleter must be set on update for ' + str(target))
        if target.editor_id:
            target.mtime = datetime.datetime.now()
        else:
            target.mtime = None
        if target.deleter_id:
            target.dtime = datetime.datetime.now()
        else:
            target.dtime = None
