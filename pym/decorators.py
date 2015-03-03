import functools
import transaction


def savepoint(func):
    """
    Decorator to wrap method into a savepoint.

    Creates a savepoint, runs decorated function and catches *any* exception.
    If an exception occurred, rolls back savepoint and raises it again.
    """
    @functools.wraps(func)
    def inner(self, *args, **kwargs):
        sp = transaction.savepoint()
        try:
            return func(self, *args, **kwargs)
        except Exception:
            sp.rollback()
            raise
    return inner