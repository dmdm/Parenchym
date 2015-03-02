import colander
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


class TypedJson(sa.types.TypeDecorator):

    impl = JSON

    def __init__(self, *arg, **kw):
        """
        JSON data type that uses a colander schema to de/serialize.

        The stored JSON data (cstruct) is deserialized and thus transformed into
        typed values (appstruct) by the given colander schema. If a validation
        error occurs, as expected a ``colander.Invalid`` exception is thrown.
        The whole (unverified) ctruct is available as its ``value`` attribute.
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

    impl = JSONB
