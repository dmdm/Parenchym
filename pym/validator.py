import datetime
import re
import dateutil.parser
import sqlalchemy as sa
import sqlalchemy.sql.expression
import sqlalchemy.sql.sqltypes as sqty
import sqlalchemy.sql.operators as sqop
from pym.exc import ValidationError
from pym.lib import json_deserializer


class PagerValidator(object):

    def __init__(self, parent):
        """
        Validator for parameters of a pager.

        We tell which page is the current page and the page size (e.g. in rows).
        Hence the input MultiDict is expected to have keys ``pg`` and ``ps``.

        *Public properties*

        ``default_page``: Page number to use as default.

        ``default_page_size``: Page size to use as default.

        ``allowed_page_sizes``: List of allowed pages sizes.

        :param parent: Base validator, typically :class:`Validator`
        """
        self.parent = parent

        self.default_page = 0
        """Default for current page"""
        self.default_page_size = 100
        """Default page size"""
        self.allowed_page_sizes = (100, 200, 500)
        """Default list of allowed page sizes"""

    @property
    def page(self):
        """
        Fetches current page from key ``pg`` (optional, single).

        If missing, we return ``default_page``.

        :return: Current page
        :raise ValidationError: If pg < 0
        """
        pg = self.parent.fetch_int('pg', default=self.default_page,
            required=False, multiple=False)
        if pg < 0:
            raise ValidationError('Invalid pg: {}'.format(pg))
        return pg

    @property
    def page_size(self):
        """
        Fetches page size from key ``ps`` (optional, single).

        If missing, we return ``default_page_size``.

        :return: Page size,
            min(allowed_page_sizes) < ps < max(allowed_page_sizes)
        """
        ps = self.parent.fetch_int('ps', default=self.default_page_size,
            required=False, multiple=False)
        # Constrain ps to the bounds defined in allowed_page_sizes
        lb = min(self.allowed_page_sizes)
        ub = max(self.allowed_page_sizes)
        if ps < lb:
            ps = lb
        elif ps > ub:
            ps = ub
        return ps


class SorterValidator(object):

    def __init__(self, parent):
        """
        Validator for parameters of a sorter.

        We tell which fields to sort by (e.g. in an ORDER BY clause) and their
        directions (ASC or DESC). Hence the input MultiDict is expected to have
        keys ``sf`` and ``sd``.

        *Public properties:*

        ``allowed_fields``: List of field names that we allow to be sorted.

        ``allowed_directions``: Typically ``('asc', 'desc')`` but may be
        overridden.

        :param parent: Base validator, typically :class:`Validator`
        """
        self.parent = parent

        self.allowed_fields = ('id', )
        """List of field names that are allowed in a sort expression"""
        self.allowed_directions = ('asc', 'desc')
        """List of sort directions"""

    @property
    def fields(self):
        """
        Fetches list of field names for key ``sf`` (required, multiple).

        :return: List of field names
        :raise ValidationError: If a field is not listed in ``allowed_fields``
        """
        sort_fields = self.parent.fetch('sf', default=None, required=True,
            multiple=True)
        for sf in sort_fields:
            if not sf in self.allowed_fields:
                raise ValidationError("Invalid sort field: '{}'".format(sf))
        return sort_fields

    @property
    def directions(self):
        """
        Fetches list of sort directions from key ``sd`` (required, multiple).

        :return: List of sort directions
        :raise ValidationError: If a direction is not listed in
            ``allowed_directions``.
        """
        sort_dirs = [x.lower() for x in
            self.parent.fetch('sd', default=None, required=True, multiple=True)]
        for sd in sort_dirs:
            if not sd in self.allowed_directions:
                raise ValidationError("Invalid sort dir: '{}'".format(sd))
        return sort_dirs


class FilterValidator(object):

    RE_WHITESPACE = re.compile(r'\s+')

    def __init__(self, parent):
        """
        Validator for parameters of a filter.

        A filter my be simple, consisting only of a field name and a filter
        text, or it may be a complex expression with multiple operators and
        nested ANDs and ORs.

        *Public properties*

        ``allowed_fields``: List of field names that are allowed to occur in a
            filter expression.

        ``allowed_operators``: List of allowed operators, by default these::

            '=', '<', '<=', '>', '>=', 'like', '~'
            and their negations: '!=', '!<', '!<=', '!>', '!>=', '!like', '!~'

        ``allowed_conjunctions``: List of tokens that represent conjunctions
            ``AND`` and ``OR`` in an expression, default ``('a', 'o')``.

        ``allowed_case_sensitivity``: List of tokens that represent the case
            sensitivity flag in an expression, default ``('s', 'i')``.

        :param parent: Base validator, typically :class:`Validator`
        """
        self.parent = parent

        self.allowed_fields = ('id', )
        """List of field names that are allowed in a filter expression"""
        self.operator_map = {
            '=': sqop.eq,
            '<': sqop.lt,
            '<=': sqop.le,
            '>': sqop.gt,
            '>=': sqop.ge,
            'like': sqop.like_op
        }
        """Mapping of operator names to Python functions"""
        ops = list(self.operator_map.keys()) + ['~']
        self.allowed_operators = tuple(ops + ['!' + op for op in ops])
        """List of allowed operators, incl. negated"""
        self.numerical_operators = ('=', '<', '<=', '>', '>=', '!=')
        """List of operators suitable for numerical comparison
        (prefix '!' means negation)"""
        self.integer_types = (
            sqty.BIGINT, sqty.BigInteger,
            sqty.FLOAT, sqty.Float,
            sqty.INT, sqty.INTEGER, sqty.Integer
        )
        self.float_types = (
            sqty.DECIMAL, sqty.decimal,
            sqty.FLOAT, sqty.Float,
            sqty.NUMERIC, sqty.Numeric,
            sqty.REAL
        )
        self.date_types = (
            sqty.DATE, sqty.Date,
            sqty.DATETIME, sqty.DateTime,
            sqty.TIME, sqty.Time
        )
        self.bool_types = (
            sqty.BOOLEAN, sqty.Boolean
        )
        self.allowed_conjunctions = ('a', 'o')  # And, Or
        """List of conjunctions."""
        self.allowed_case_sensitivity = ('s', 'i')  # case Sensitive, Insensitive
        """List of choices for case sensitivity."""

    @property
    def filter(self):
        """
        Fetches the filter expression from key ``fil`` (required, single).

        Key ``fil`` must contain the expression as a single JSON string.

        :return: Filter expression as a data structure.
        :raise ValidationError: If key is missing or invalid.
        """

        # TODO  TESTING!!

        try:
            fil = self.parent.inp['fil']
        except KeyError:
            #raise ValidationError("Missing filter")
            return None
        try:
            fil = json_deserializer(fil)
        except ValueError:
            raise ValidationError("Invalid JSON")
        # Expect to be [CONJ, TAIL]
        if len(fil) != 2:
            raise ValidationError("Invalid expression")

        aconj = self.allowed_conjunctions
        aops = self.allowed_operators
        acase = self.allowed_case_sensitivity
        aff = self.allowed_fields

        # (country='f' and plz >=1 and plz <=2)
        # or
        # (country='d' and ((plz >=5 and plz <=8) or (plz > 2 and plz < 4)))
        #
        # [or, [
        #   [and, [
        #     [country, =, 'f'],
        #     [plz, >=, 1],
        #     [plz, <=, 2]
        #   ],
        #   [and, [
        #     [country, =, 'd'],
        #     [or, [
        #       [and, [
        #         [plz, >=, 5],
        #         [plz, <=, 8]
        #       ],
        #       [and, [
        #         [plz, >, 2],
        #         [plz, <, 4]
        #       ]
        #     ]
        #   ]
        # ]
        def check(conj, tail):
            # check conjunction
            if conj not in aconj:
                raise ValidationError("Invalid conjunction: '{}'".format(conj))
            # tail must be list
            if not isinstance(tail, list):
                raise ValidationError("Invalid tail: '{}'".format(tail))
            # tail is itself CONJ + TAIL
            if len(tail) == 2 and tail[0] in aconj:
                check(tail[0], tail[1:])
            # consider tail to be list of things
            else:
                for thing in tail:
                    l = len(thing)
                    # this thing is CONJ + TAIL
                    if l == 2:
                        check(thing[0], thing[1:])
                    # this thing is filter expression
                    elif l == 4:
                        fld, op, case, val = thing
                        if fld not in aff:
                            raise ValidationError("Invalid field: '{}'".format(fld))
                        if op not in aops:
                            raise ValidationError("Invalid op: '{}'".format(op))
                        if case not in acase:
                            raise ValidationError("Invalid case: '{}'".format(case))
                    # this thing is garbage
                    else:
                        raise ValidationError("Invalid thing: '{}' ({})".format(thing, type(thing)))

        # 1st level is always CONJ + TAIL
        check(fil[0], fil[1])
        return fil

    def build_simple_grid_filter(self, col_map):
        """
        Builds simple SA filter suitable for use in UI grid.

        Structure created by client and available in attribute ``filter`` must
        be::

            ['a', [
                thing0,
                thing1,
                ...
            ]]

        with thing::

            [fld, op, case, val]

        All things are ANDed. We honor client's setting for op and case.

        Uses LIKE operator in case no specific operator is given. Casts search
        value and field value to string if necessary to prevent SQL errors.

        Gets the filter structure from attribute ``filter``.

        TODO: Implement regex op '~'

        :param col_map: Mapping of field names to instances of SA columns.
        :returns: List of SA filter expressions, may be empty.
        """
        fil_struct = self.filter
        if not fil_struct:
            return []
        fil = []
        for thing in fil_struct[1]:
            fld, op, case, val = thing
            # print('INPUT', fld, op, case, val)
            if op.startswith('!'):
                neg = True
                op = op[1:]
            else:
                neg = False
            f = col_map[fld]
            ty = type(f.type)
            # print('before', f, f.type, ty, type(ty))
            # print(val, type(val))

            # If operator is 'LIKE', treat field as string and perform a LIKE
            # pattern matching. This way we can search for parts of numbers and
            # parts of dates etc.
            if op == 'like':
                # Except if field is boolean: then keep its type and perform
                # equality test
                if ty in self.bool_types:
                    op = '='
                    v = val
                else:
                    # For LIKE, everything that is not a string must be cast.
                    if ty in self.integer_types or ty in self.float_types \
                            or ty in self.date_types:
                        f = sa.sql.expression.cast(f, sa.UnicodeText)
                # Apply '%' wisely to allow matching of fragments within
                # field value: surround search value with '%' and also put '%'
                # inside instead of blanks.
                v = '%' + val.strip().replace(' ', '%') + '%'
            # In all other cases, i.e. operator is not 'LIKE', cast search value
            # to the type of the field. If search value failed to be cast, treat
            # field and search value as strings.
            elif ty in self.date_types:
                try:
                    v = dateutil.parser.parse(val)
                except ValueError:
                    v = val
                    f = sa.sql.expression.cast(f, sa.UnicodeText)
            elif ty in self.integer_types and op in self.numerical_operators:
                try:
                    v = int(val)
                except ValueError:
                    v = val
                    f = sa.sql.expression.cast(f, sa.UnicodeText)
            elif ty in self.float_types and op in self.numerical_operators:
                try:
                    v = float(val)
                except ValueError:
                    v = val
                    f = sa.sql.expression.cast(f, sa.UnicodeText)
            else:
                # Field is a string and op might be a numerical operator, so keep
                # search value as string and apply operator normally.
                v = val
            # Fetch field's type again after above conversions.
            ty = type(f.type)
            # print('after', f, f.type, ty)
            # print(v, type(v))

            # Let's see if we have to do a case-insensitive search. LIKE has its
            # counterpart ILIKE (see below), all other string searches must be
            # lowercased.
            if (op != 'like' and case == 'i') and (
                        ty not in self.integer_types
                        and ty not in self.float_types
                        and ty not in self.date_types
                        and ty not in self.bool_types
                    ):
                v = v.lower()
                f = sa.func.lower(f)
            # Use ILIKE directly
            # WTF, SQLAlchemy will render this as "lower() LIKE lower()"...
            if op == 'like' and case == 'i':
                expr = sqop.ilike_op(f, v)
            else:
                # So, no LIKE and case-sensitive: use operator as mapped.
                # TODO Implement regex op '~' and '~*'
                expr = self.operator_map[op](f, v)
            # Apply negation if necessary
            if neg:
                expr = sa.not_(expr)
            # print(expr)
            fil.append(expr)
        return fil

    def build_filter(self, fil, allowed_fields, col_map):
        pass
        # TODO Implement this

    @property
    def text(self):
        """
        Fetches the filter text from key ``q`` (optional, single).

        We sanitise the whitespace, i.e. we strip leading and trailing
        whitespace and condense multiple consecutive into a single blank.

        :return: The filter text, or None.
        """
        q = self.parent.fetch('q', default=None, required=False, multiple=False)
        return None if q is None else self.RE_WHITESPACE.sub(' ', q).strip()

    @property
    def field(self):
        """
        Fetches the field name from key ``f`` (required, single).

        :return: Field name
        :raise ValidationError: If field name not listed in ``allowed_fields``.
        """
        f = self.parent.fetch('f', default=None, required=True, multiple=False)
        if f not in self.allowed_fields:
            raise ValidationError("Invalid filter field: '{}'".format(f))
        return f


class Validator(object):

    def __init__(self, inp):
        """
        General validator.

        We provide methods to fetch one key from the MultiDict and validate its
        value. These methods merely cast the fetched value into a specific type.

        Furthermore, we are composed of other, more specialised validator
        objects: ``pager`` as :class:`PagerValidator`, ``sorter`` as
        :class:`SorterValidator`, and ``filter`` as :class:`FilterValidator`.

        These can be used like this::

            vld = Validator(inp)
            print('Sorted by', vld.sorter.fields)

        :param inp: MultiDict, e.g. ``request.GET``
        """
        self._inp = inp

        self.pager = PagerValidator(self)
        self.sorter = SorterValidator(self)
        self.filter = FilterValidator(self)

    def fetch(self, k, default=None, required=True, multiple=False):
        """
        Fetches an input parameter.

        :param k: Parameter to fetch from input
        :param default: Default value if ``k`` was not present
        :param required: If True, raises ValidationError if parameter is missing
        :param multiple: If true, return list, else scalar
        :return: Fetched value
        """
        if multiple:
            v = self.inp.getall(k)
            if not v:
                # Parameter missing, but required
                if required:
                    raise ValidationError("Missing: '{}'".format(k))
                # Parameter missing, but not required --> return default
                return default
            # Parameter was given...
            # ... if we need it, make sure, all elements are set
            if required:
                for x in v:
                    if x is None or len(str(x)) == 0:
                        raise ValidationError("Missing: '{}'".format(k))
        else:
            try:
                v = self.inp[k]
            except KeyError:
                # Parameter missing, but required
                if required:
                    raise ValidationError("Missing: '{}'".format(k))
                # Parameter missing, but not required
                return default
            # Parameter was given
            if v is None or len(str(v)) == 0:
                # Parameter empty, but required
                if required:
                    raise ValidationError("Missing: '{}'".format(k))
                # Parameter empty, but not required
                return default
        # Yeah, we actually have a value
        return v

    def fetch_json(self, k, default=None, required=True, multiple=False):
        v = self.fetch(k=k, default=default, required=required,
            multiple=multiple)
        try:
            return json_deserializer(v)
        except ValueError:
            raise ValidationError("Invalid JSON: '{}'".format(k))

    def fetch_int(self, k, default=None, required=True, multiple=False):
        """
        Fetches an input parameter as integer.

        :param k: Parameter to fetch from input
        :param default: Default value if ``k`` was not present
        :param required: If True, raises ValidationError if parameter is missing
        :param multiple: If true, return list, else scalar
        :return: Int or list of ints
        """
        v = self.fetch(k, default=default, required=required, multiple=multiple)
        if v is None:
            return None
        if multiple:
            r = []
            for x in v:
                try:
                    r.append(int(x))
                except ValueError:
                    raise ValidationError(
                        "Not an integer: '{}'->'{}'".format(k, x))
            return r
        else:
            try:
                r = int(v)
            except ValueError:
                raise ValidationError("Not an integer: '{}'->'{}'".format(k, v))
        return r

    def fetch_bool(self, k, default=None, required=True, multiple=False):
        """
        Fetches an input parameter as boolean.

        :param k: Parameter to fetch from input
        :param default: Default value if ``k`` was not present
        :param required: If True, raises ValidationError if parameter is missing
        :param multiple: If true, return list, else scalar
        :return: Bool or list of bools
        """
        v = self.fetch(k, default=default, required=required, multiple=multiple)
        if v is None:
            return None
        if multiple:
            r = []
            for x in v:
                try:
                    # We may be called from a POST request that uses json_body as input.
                    # Then v is already typed.
                    if isinstance(x, bool):
                        r.append(x)
                    if x[0].lower() in ('t', 'true', 'on', '1'):
                        r.append(True)
                    elif x[0].lower() in ('f', 'false', 'off', '0'):
                        r.append(False)
                    else:
                        r.append(bool(x))
                except (TypeError, ValueError):
                    raise ValidationError(
                        "Not a boolean: '{}'->'{}'".format(k, x))
            return r
        else:
            # We may be called from a POST request that uses json_body as input.
            # Then v is already typed.
            if isinstance(v, bool):
                return v
            try:
                if v.lower() in ('t', 'true', 'on', '1'):
                    r = True
                elif v[0].lower() in ('f', 'false', 'off', '0'):
                    r = False
                else:
                    r = bool(v)
            except (TypeError, ValueError):
                raise ValidationError("Not a boolean: '{}'->'{}'".format(k, v))
        return r

    def fetch_float(self, k, default=None, required=True, multiple=False):
        """
        Fetches an input parameter as float.

        We use the right-most dot or comma as decimal separator.

        :param k: Parameter to fetch from input
        :param default: Default value if ``k`` was not present
        :param required: If True, raises ValidationError if parameter is missing
        :param multiple: If true, return list, else scalar
        :return: Float or list of floats
        """
        v = self.fetch(k, default=default, required=required, multiple=multiple)
        if v is None:
            return None
        if multiple:
            r = []
            for x in v:
                if isinstance(x, str):
                    dp = x.rfind('.')
                    cp = x.rfind(',')
                    if dp > cp:  # English: dot is right of optional commas
                        x = x.replace(',', '')  # Need only to remove commas
                    else:  # German: comma is right of optional dots
                        # Remove dots and replace comma with dot
                        x = x.replace('.', '').replace(',', '.')
                try:
                    r.append(float(x))
                except ValueError:
                    raise ValidationError(
                        "Not a float: '{}'->'{}'".format(k, x))
            return r
        else:
            if isinstance(v, str):
                dp = v.rfind('.')
                cp = v.rfind(',')
                if dp > cp:  # English: dot is right of optional commas
                    v = v.replace(',', '')  # Need only to remove commas
                else:  # German: comma is right of optional dots
                    # Remove dots and replace comma with dot
                    v = v.replace('.', '').replace(',', '.')
            try:
                r = float(v)
            except ValueError:
                raise ValidationError("Not a float: '{}'->'{}'".format(k, v))
        return r

    def fetch_date(self, k, default=None, required=True, multiple=False,
            fmt='%Y-%m-%d'):
        """
        Fetches an input parameter as a date.

        :param k: Parameter to fetch from input
        :param default: Default value if ``k`` was not present
        :param required: If True, raises ValidationError if parameter is missing
        :param multiple: If true, return list, else scalar
        :return: Date or list of dates
        """
        v = self.fetch(k, default=default, required=required, multiple=multiple)
        if v is None:
            return None
        if multiple:
            r = []
            for x in v:
                try:
                    r.append(datetime.datetime.strptime(x, fmt).date())
                except ValueError:
                    raise ValidationError(
                        "Not a date: '{}'->'{}'".format(k, x))
            return r
        else:
            try:
                r = datetime.datetime.strptime(v, fmt).date()
            except ValueError:
                raise ValidationError("Not a date: '{}'->'{}'".format(k, v))
        return r

    @property
    def inp(self):
        return self._inp

    @inp.setter
    def inp(self, value):
        self._inp = value
