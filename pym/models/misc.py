import datetime
import logging
import traceback
import sqlalchemy as sa
import sqlalchemy.orm.exc
from sqlalchemy.dialects.postgresql import JSON
import sys
import transaction
import pym.auth.models
import pym.exc
from pym.models import (DbBase, DefaultMixin)


mlgg = logging.getLogger('pym.' + __name__)


class Scheduler(DbBase, DefaultMixin):
    """
    Scheduler for automated tasks.

    Each task is registered with a name. Some external cron job should
    ensure that tasks are executed.

    State flow::

        sleeping  -->  running  --> sleeping  --> running ...
                                |              ^
                                +-> error    --+

    Typically you use it like this: ``Scheduler.run(sess, user, some_callable)``
    """
    __tablename__ = "scheduler"
    __table_args__ = (
        sa.UniqueConstraint('task', name='scheduler_task_ux'),
        {'schema': 'pym'}
    )

    IDENTITY_COL = 'task'

    STATE_SLEEPING = 's'
    STATE_RUNNING = 'r'
    STATE_ERROR = 'e'

    SECTION_CACHE = 'cache'

    task = sa.Column(sa.Unicode(255), nullable=False)
    """Name of a task"""
    _caption = sa.Column('caption', sa.Unicode(255), nullable=False)
    """Caption for use in UI"""
    section = sa.Column(sa.Unicode(255), nullable=True)
    """Group tasks"""

    @property
    def caption(self):
        return self._caption if self._caption else self.task

    @caption.setter
    def caption(self, v):
        self._caption = v

    descr = sa.Column(sa.UnicodeText(), nullable=True)
    """Description of task"""
    out = sa.Column(JSON(), nullable=True)
    """Output"""
    state = sa.Column(sa.CHAR(1), nullable=False)
    """ 's' = sleeping, 'r' = running, 'e' = error, 'w' = warning """
    start_time = sa.Column(sa.DateTime(), nullable=True)
    """Timestamp when last (or current) run was started."""
    end_time = sa.Column(sa.DateTime(), nullable=True)
    """Timestamp when last run ended"""
    next_time = sa.Column(sa.DateTime(), nullable=True)
    """Timestamp of next scheduled run"""
    next_interval = sa.Column(sa.Interval(), nullable=True)
    """Next scheduled run starts this interval after start_time"""
    duration = sa.Column(sa.Interval(), nullable=True)
    """Duration of last run"""

    @classmethod
    def fetch(cls, sess, name, user):
        """
        Loads instance of this task from DB or creates one.
        """
        try:
            return cls.find(sess, name)
        except sa.orm.exc.NoResultFound:
            owner_id = pym.auth.models.User.find(sess, user).id
            o = cls()
            o.owner_id = owner_id
            o.task = name
            o.state = cls.STATE_SLEEPING
            sess.add(o)
            return o

    @classmethod
    def run(cls, sess, user, callback, *args, **kwargs):
        """
        Loads or creates a task and runs callback.

        The task's name is the ``__name__`` of the callable.

        We call callback like this: ``callback(sess, user, *args, **kwargs)``.
        Callback runs in nested savepoint.

        We catch all exceptions that that the callback may raise and save their
        traceback in the ``out`` field. We log these exceptions also to the
        logger, so that a history is available. Pass specific logger as keyword
        ``lgg``, else we use the module's logger.

        Scheduler itself may raise other exceptions, e.g.
        :class:`pym.exc.SchedulerError`, which the caller must handle and log.

        Additional ``args`` and ``kwargs`` are passed through to the callback.

        We assume, a transaction is already started, and run the callback inside
        its own savepoint. If an error occurs, we roll back this single savepoint,
        leaving the rest of the transaction, in which also the status information
        of the task is saved, intact.

        :param sess: Current DB session
        :param user: Instance of current user, used e.g. as owner or editor
        :param callback: Callable
        :param args: More args
        :param kwargs: More keyword args
        :return: Instance of used task.
        """
        lgg = kwargs.get('lgg', mlgg)
        task = cls.fetch(sess, callback.__name__, user)
        task.start(user)
        sp = transaction.savepoint()
        try:
            out = callback(sess, user, *args, **kwargs)
        except Exception as exc:
            lgg.exception(exc)
            sp.rollback()
            out = [
                str(exc),
                traceback.format_exception(*sys.exc_info())
            ]
            task.stop_error(user, out)
        else:
            task.stop_ok(user, out)
        finally:
            return task

    def start(self, user):
        if self.state == self.__class__.STATE_RUNNING:
            raise pym.exc.SchedulerError('Task is already running')
        sess = sa.inspect(self).session
        self.editor_id = pym.auth.models.User.find(sess, user).id
        self.state = self.__class__.STATE_RUNNING
        self.start_time = datetime.datetime.now()
        if self.next_interval:
            self.next_time = self.start_time + self.next_interval
        sess.flush()

    def stop_ok(self, user, out=None):
        self._stop(user, self.__class__.STATE_SLEEPING, out)

    def stop_error(self, user, out=None):
        self._stop(user, self.__class__.STATE_ERROR, out)

    def _stop(self, user, state, out=None):
        if self.state != self.__class__.STATE_RUNNING:
            raise pym.exc.SchedulerError('Task is not running')
        sess = sa.inspect(self).session
        self.editor_id = pym.auth.models.User.find(sess, user).id
        self.state = state
        self.out = out
        self.end_time = datetime.datetime.now()
        self.duration = self.end_time - self.start_time
        sess.flush()

    def is_ok(self):
        return self.state == self.__class__.STATE_SLEEPING
