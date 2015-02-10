from collections import OrderedDict
import sqlalchemy as sa
from sqlalchemy.sql import sqltypes
from pym.i18n import _


class DataSet():

    def __init__(self, sess):
        """
        A data set describes SQL queries and the involved columns.

        First, you have to initialise the column definitions. By doing so you
        declare which columns to query, and their titles for display.

        Attribute ``col_map`` is a mapping between the internal column name and
        its SQLAlchemy field.

        Attribute ``col_titles`` likewise maps the internal column name to its
        title.

        Attribute ``col_order`` is a list of the internal column names in the
        wanted order. The columns in the query have the same order, ditto the
        columns of the result data (if the row of the result data is a dict, its
        an :class:`~collection.OrderedDict`.

        :param sess: Instance of a DB session.
        """
        self.sess = sess
        self.col_map = {}
        self.col_titles = {}
        self.col_order = []

    def init_col_defs(self, *args, excludes=None):
        """
        Initialises the column definitions.

        The column definitions are available as attributes ``col_map`` and
        ``col_titles`` of this
        class. The keys are column names. The values are references to the
        respective SQLAlchemy field (``col_map``) or a pyramidic translation
        string with the column title (``col_titles``). We provide both as
        individual dicts so that they can be used by reference in other contexts
        like the Worker.

        A call to :method:`init_col_defs` does not clear existing column
        definitions, so it is possible to iteratively build all definitions by
        calling this method multiple times. (To clear the definitions, call
        :meth:`clear_col_defs`.)

        :param args: Each argument is either a scalar or a 2-tuple. We inspect
            each argument and initialise the dict of ``col_defs`` with keys that
            are the names of the inspected selectable columns. If the arguments
            are scalars, they must be SA selectables. If they are 2-tuples,
            element 0 must be such a selectable, and element 1 is a prefix for
            the column name.
        :param excludes: Optional list of field names to exclude. If ``args``
            use prefixes, the names here must use the same.
        """
        if excludes is None:
            excludes = ()
        for arg in args:
            if isinstance(arg, tuple):
                entity = arg[0]
                prefix = arg[1]
            else:
                entity = arg
                prefix = ''
            insp = sa.inspect(entity)
            for c in insp.selectable.columns:
                cn = prefix + c.name
                if cn in excludes:
                    continue
                self.col_map[cn] = c
                self.col_titles[cn] = _(c.name.replace('_', ' ').title())
        if not self.col_order:
            self.col_order = list(self.col_map.keys())

    def clear_col_defs(self):
        """
        Clears ``col_map`` and ``col_titles``.
        """
        self.col_map = {}
        self.col_titles = {}
        self.col_order = []

    def base_query(self):
        """
        Returns the base query.

        **Important** Override this method especially if you used multiple
        entities to define the columns: You need to adjust the join criteria!

        The base query contains a column for each item in dict ``col_map`` with
        its column alias ("label") set to the corresponding key.

        :return: SQLAlchemy query object.
        """
        ff = [self.col_map[k].label(k) for k in self.col_order]
        q_base = self.sess.query(*ff)
        return q_base

    def queries(self, sorter=None, filter_=None, pager=None):
        """
        Returns 2-tuple with main query and count query.

        Count query is always unsorted and unpaged.

        :param sorter:  Instance of :class:`pym.validator.SorterValidator`. If
            omitted, result is unsorted.
        :param filter_: Instance of :class:`pym.validator.FilterValidator`. If
            omitted, result is unfiltered.
        :param pager: Instance of :class:`pym.validator.PagerValidator`. If
            omitted, result contains the *complete data set*!
        :return: 2-tuple: [0] Main query, [1] Count query
        """
        q_base = self.base_query()
        q = q_base
        q_count = q_base
        if sorter:
            q = q.order_by(*self.sort_crit(sorter))
        if filter_:
            fil = self.filter_crit(filter_)
            q = q.filter(*fil)
            q_count = q_count.filter(*fil)
        if pager:
            q = q.offset(pager.page * pager.page_size).limit(pager.page_size)
        return q, q_count

    def data(self, q, q_count, row_as_list=False):
        total = q_count.count()
        rows = []
        for ix, r in enumerate(q):
            if row_as_list:
                x = r
            else:
                x = OrderedDict()
                for k in self.col_order:
                    x[k] = getattr(r, k)
            rows.append(x)
        return {'rows': rows, 'total': total}

    def grid_col_defs(self):
        """
        Returns list of dicts usable as columnDefs in ui-grid.

        Each columnDef has ``name``, ``field`` (=name), and ``width``. If column
        is numeric, also ``cellFilter`` and ``cellClass``.

        :return: List of dicts
        """
        cm = self.col_map
        cd = []
        for k in self.col_order:
            x = {
                'name': k,
                'field': k,
                'width': 80
            }
            if isinstance(cm[k].type, sqltypes.Integer):
                x['cellFilter'] = 'number'
                x['cellClass'] = 'text-right'
            if isinstance(cm[k].type, (sqltypes.Float, sqltypes.Numeric)):
                x['cellFilter'] = 'number:3'
                x['cellClass'] = 'text-right'
            cd.append(x)
        return cd

    def sort_crit(self, sorter):
        """
        Returns sort criteria with regards to sorter.

        :param sorter: Instance of :class:`pym.validator.SorterValidator`.
        :return: List of SQLAlchemy fields to sort by
        """
        oo = []
        if sorter.fields:
            for i, sf in enumerate(sorter.fields):
                try:
                    d = sorter.directions[i]
                except IndexError:
                    d = 'asc'
                if d == 'asc':
                    oo.append(self.col_map[sf])
                else:
                    oo.append(self.col_map[sf].desc())
        return oo

    def filter_crit(self, filter_):
        """
        Returns filter criteria with regards to filter.

        :param filter_: Instance of :class:`pym.validator.FilterValidator`.
        :return: List of SQLAlchemy filter_by expressions, by default a simple
            grid filter.
        """

        fil = []
        fil += filter_.build_simple_grid_filter(self.col_map)
        return fil
