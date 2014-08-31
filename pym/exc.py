# -*- coding: utf-8 -*-


_ = lambda s: s


class PymError(Exception):
    pass


class AuthError(PymError):
    pass


class SassError(PymError):

    def __init__(self, msg, resp=None):
        super().__init__(msg)
        self.resp = resp


class SchedulerError(PymError):
    pass


class ValidationError(Exception):
    pass


class ItemExistsError(PymError):

    def __init__(self, *args, item=None, **kwargs):
        """
        Signals that a specific item already exists.

        May reference instance of that item in attribute ``item``.
        """
        super().__init__(*args, **kwargs)
        self.item = item
