import datetime
import colander
import dateutil.tz
import pytz
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, JSONB
import sqlalchemy.types

from pym.security import clean_string


class CleanUnicode(sa.types.TypeDecorator):
    """
    Type for a cleaned unicode string.

    Usage::

        CleanUnicode(255)

    """

    impl = sa.Unicode

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        value = clean_string(value)
        return value


class LocalDateTime(sa.types.TypeDecorator):
    """
    Represents DateTime in server's local timezone, preferably UTC.

    On load, replaces timezone of naive DateTime with server's local timezone.
    On save, mogrifies given timestamp into server's local timezone.

    Rationale:

    We want to store timestamps without timezone information in a canonical
    timezone, preferably UTC. The data type of the column in the database is
    DATETIME WITHOUT TIME ZONE.

    Usage::

        LocalDateTime()

    """

    impl = sa.DateTime(timezone=False)
    # We want the tzinfo object from pytz, not that of dateutil
    _tz = dateutil.tz.tzlocal().tzname(datetime.datetime.now())
    if _tz == 'CEST':
        _tz = 'CET'
    server_tz = pytz.timezone(_tz)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        tz = self.__class__.server_tz
        try:
            value = tz.normalize(value.astimezone(tz))
        except ValueError:  # maybe: naive datetime does not have astimezone
            value = tz.localize(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return value.replace(tzinfo=self.__class__.server_tz)


class TypedJson(sa.types.TypeDecorator):

    impl = JSON(none_as_null=True)

    def __init__(self, *arg, **kw):
        """
        JSON data type that uses a colander schema to de/serialize.

        The stored JSON data (cstruct) is deserialized and thus transformed into
        typed values (appstruct) by the given colander schema. If a validation
        error occurs, as expected a ``colander.Invalid`` exception is thrown.
        The whole (unverified) ctruct is available as its ``value`` attribute.

        If your schema contains numbers and booleans, you may want to use
        :class:`pym.colander.JsonInteger`, :class:`pym.colander.JsonFloat` and
        :class:`pym.colander.JsonBoolean`. These variants keep the type of the
        serialized value so that the following JSON serialization handles them
        properly. Plain colander on the other hand would have cast them to a
        string so that the stored JSON value also would be a string; which
        probably is not what you want.

        Usage:

            sa.Column(TypedJson(json_schema=MySchema()))

        :param json_schema: Instance (!) of a colander schema.
        """
        try:
            self.json_schema = kw['json_schema']
            del kw['json_schema']
        except KeyError:
            self.json_schema = None
        super().__init__(*arg, **kw)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if self.json_schema is None:
            return value
        return self.json_schema.serialize(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if self.json_schema is None:
            return value
        try:
            return self.json_schema.deserialize(value)
        except colander.Invalid as exc:
            exc.value = value
            raise exc


class TypedJsonB(TypedJson):
    """
    JSONB variant of :class:`TypedJson`.
    """

    impl = JSONB(none_as_null=True)
