import collections
import sqlalchemy as sa
from sqlalchemy.engine import RowProxy
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.util import KeyedTuple
import pym.exc


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

