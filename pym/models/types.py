import sqlalchemy as sa
import sqlalchemy.types

import pym.lib
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
