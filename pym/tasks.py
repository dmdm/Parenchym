"""
Contains callables to be used as callbacks in a task.
See :class:``pym.models.misc.Scheduler`` for details.

A callable must at least expect 2 parameters: ``sess`` and ``user``.
"""


def refresh_foo(sess, user, *args, **kwargs):
    pass
    # pym.foo.refresh(sess)
