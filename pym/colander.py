import colander
from pym.i18n import _


class JsonBoolean(colander.Boolean):

    def __init__(self, false_choices=(False, 'false', '0', 0), true_choices=(),
                 false_val=False, true_val=True):
        """
        As :class:`colander.Boolean`, but uses real bool values for
        serialization, so that the JSON serializer handles them properly.

        :param false_choices: (False, 'false', '0', 0)
        :param true_choices: () i.e. any value not in ``false_choices``
        :param false_val: False
        :param true_val: True
        """
        super().__init__(false_choices=false_choices, true_choices=true_choices,
            false_val=false_val, true_val=true_val)


class JsonNumber(colander.SchemaType):
    """
    Abstract base class for JsonFloat and JsonInteger.

    To prepare a Decimal for JSON serialization, colander's original Decimal is
    sufficient.
    """

    num = None

    def serialize(self, node, appstruct):
        if appstruct is colander.null:
            return colander.null

        try:
            # Stay a number type
            return self.num(appstruct)
        except Exception:
            raise colander.Invalid(node,
                _('"${val}" is not a number', mapping={'val': appstruct}))

    def deserialize(self, node, cstruct):
        if cstruct != 0 and not cstruct:
            return colander.null

        try:
            # Stay a number type
            return self.num(cstruct)
        except Exception:
            raise colander.Invalid(node,
                _('"${val}" is not a number', mapping={'val': cstruct}))


class JsonInteger(JsonNumber):
    """Like :class:`colander.Integer` but serialized value stays an integer."""
    num = int


class JsonFloat(JsonNumber):
    """Like :class:`colander.Float` but serialized value stays a float."""
    num = float


class JsonDecimal(colander.Decimal):
    pass
