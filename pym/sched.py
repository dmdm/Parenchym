import datetime
import logging
import sys
import traceback
import functools
import pytz
from apscheduler.jobstores.base import BaseJobStore, JobLookupError, ConflictingIdError
from apscheduler.util import maybe_ref, datetime_to_utc_timestamp, utc_timestamp_to_datetime
from apscheduler.job import Job
import pickle
import sqlalchemy as sa
from sqlalchemy.ext.mutable import MutableDict
import sqlalchemy.orm.exc
from sqlalchemy.dialects.postgresql import JSON
import transaction
import apscheduler.triggers.cron
import pyramid.util
import pym.auth
import pym.auth.models as pam
from pym.models import DbSession
from pym.auth.const import SYSTEM_UID
import pym.exc
from pym.models import DbBase, DefaultMixin


mlgg = logging.getLogger(__name__)


class Scheduler(DbBase, DefaultMixin):
    """
    Scheduler for automated jobs.

    Each job is registered with a name. Some external cron job should
    ensure that jobs are executed.

    State flow::

        sleeping  -->  running  --> sleeping  --> running ...
                                |              ^
                                +-> error    --+

    Typically you use it like this: ``Scheduler.run(sess, user, some_callable)``
    """
    __tablename__ = "scheduler"
    __table_args__ = (
        sa.UniqueConstraint('job', name='scheduler_job_ux'),
        {'schema': 'pym'}
    )

    IDENTITY_COL = 'job'

    STATE_SLEEPING = 's'
    STATE_RUNNING = 'r'
    STATE_ERROR = 'e'

    SECTION_CACHE = 'cache'

    enabled = sa.Column(sa.Boolean(), nullable=False, default=True,
                        server_default=sa.text('TRUE'))
    """Is task enabled/disabled"""
    job = sa.Column(sa.Unicode(255), nullable=False)
    """Name of a job"""
    _caption = sa.Column('caption', sa.Unicode(255), nullable=True)
    """Caption for use in UI"""
    section = sa.Column(sa.Unicode(255), nullable=True)
    """Group tasks"""

    @property
    def caption(self):
        return self._caption if self._caption else self.job

    @caption.setter
    def caption(self, v):
        self._caption = v

    descr = sa.Column(sa.UnicodeText(), nullable=True)
    """Description of task"""
    out = sa.Column(JSON(), nullable=True)
    """Output"""
    state = sa.Column(sa.CHAR(1), nullable=False, default=STATE_SLEEPING,
                      server_default=sa.text(STATE_SLEEPING))
    """ 's' = sleeping, 'r' = running, 'e' = error, 'w' = warning """
    schedule = sa.Column(MutableDict.as_mutable(JSON()), nullable=True)
    """CRONTAB-like schedule. See :class:`apscheduler.triggers.cron`"""
    func = sa.Column(sa.Unicode(255), nullable=False)
    """Callable as textual reference in the format
    'package.module:some.object'"""
    lgg = sa.Column(sa.Unicode(255), nullable=False)
    """Name of a logger"""
    user = sa.Column(sa.Unicode(255), nullable=False)
    """ID or principal of the user executing this job"""
    args = sa.Column(MutableDict.as_mutable(JSON()), nullable=True)
    """List of positional arguments to call func"""
    kwargs = sa.Column(MutableDict.as_mutable(JSON()), nullable=True)
    """List of keyword arguments to call func"""
    misfire_grace_time = sa.Column(sa.Integer(), nullable=False, default=600,
                                   server_default=sa.text('600'))
    """Seconds after the designated run time that the job is still allowed to
    be run"""
    coalesce = sa.Column(sa.Boolean(), nullable=False, default=True,
                         server_default=sa.text('TRUE'))
    """Run once instead of many times if the scheduler determines that the job
    should be run more than once in succession"""
    max_instances = sa.Column(sa.Integer(), nullable=False, default=1,
                              server_default=sa.text('1'))
    """Maximum number of concurrently running instances allowed for this job"""
    start_time = sa.Column(sa.DateTime(), nullable=True)
    """Timestamp when last (or current) run was started."""
    end_time = sa.Column(sa.DateTime(), nullable=True)
    """Timestamp when last run ended"""
    next_time = sa.Column(sa.DateTime(), nullable=True)
    """Timestamp of next scheduled run"""
    duration = sa.Column(sa.Interval(), nullable=True)
    """Duration of last run"""
    job_state = sa.Column(sa.LargeBinary(), nullable=True)
    """Pickled job state"""

    @classmethod
    def create(cls, sess, job, func, user):
        """
        Creates instance of a job.
        """
        owner_id = pym.auth.models.User.find(sess, user).id
        o = cls()
        o.owner_id = owner_id
        o.job = job
        o.func = func
        sess.add(o)
        return o

    @classmethod
    def fetch(cls, sess, job, user, func=None):
        """
        Loads instance of this job from DB or creates one.
        """
        try:
            return cls.find(sess, job)
        except sa.orm.exc.NoResultFound:
            return cls.create(sess, job, func, user)

    @classmethod
    def run(cls, sess, user, callback, *args, **kwargs):
        """
        Loads or creates a job and runs callback.

        The job's name is the ``__name__`` of the callable.

        We call callback like this: ``callback(sess, user, *args, **kwargs)``.
        Callback runs in nested savepoint.

        We catch all exceptions that that the callback may raise and save their
        traceback in the ``out`` field. We log these exceptions also to the
        logger, so that a history is available. Pass specific logger as keyword
        ``lgg``, else we use the module's logger. ``lgg`` may be name (string)
        or instance of a logger.

        Scheduler itself may raise other exceptions, e.g.
        :class:`pym.exc.SchedulerError`, which the caller must handle and log.

        Additional ``args`` and ``kwargs`` are passed through to the callback.

        We assume, a transaction is already started, and run the callback inside
        its own savepoint. If an error occurs, we roll back this single savepoint,
        leaving the rest of the transaction, in which also the status information
        of the job is saved, intact.

        :param sess: Current DB session
        :param user: Instance of current user, used e.g. as owner or editor
        :param callback: Callable
        :param args: More args
        :param kwargs: More keyword args
        :return: Instance of used job.
        """
        lgg = kwargs.get('lgg', mlgg)
        if isinstance(lgg, str):
            lgg = logging.getLogger(lgg)
        job = cls.fetch(sess, callback.__name__, user)
        job.start(user)
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
            job.stop_error(user, out)
        else:
            job.stop_ok(user, out)
        finally:
            return job

    @classmethod
    def add_all_to_apscheduler(cls, sched, sess_maker, lgg=None, user=None,
                               begin_transaction=True, **kwargs):
        sess = sess_maker()
        e_user = pam.User.find(sess, user)
        rs = sess.query(cls).filter(
            cls.enabled == True,
            cls.schedule != None,
        )
        for r in rs:
            if r.schedule is None:
                continue
            func = r.prepare_func(sess_maker, lgg, user, begin_transaction)
            r.add_to_apscheduler(sched, func, e_user)

    def prepare_func(self, sess_maker, lgg=None, user=None, begin_transaction=True):
        f = pyramid.util.DottedNameResolver(None).resolve(self.func)
        if not lgg:
            lgg = self.lgg
        if isinstance(lgg, str):
            lgg = logging.getLogger(lgg)
        if not user:
            user = self.user
        return functools.partial(f, sess_maker=sess_maker, lgg=lgg, user=user,
            begin_transaction=begin_transaction)

    def add_to_apscheduler(self, sched, func, e_user):
        sess = sa.inspect(self).session
        trig = apscheduler.triggers.cron.CronTrigger(**self.schedule)
        self.schedule['timezone'] = str(sched.timezone)
        now = datetime.datetime.now(sched.timezone)
        self.next_time = trig.get_next_fire_time(None, now)
        self.editor_id = e_user.id
        j = sched.add_job(
            func,
            trig,
            args=self.args,
            kwargs=self.kwargs,
            id=self.job,
            name=self.caption,
            misfire_grace_time=self.misfire_grace_time,
            coalesce=self.coalesce,
            max_instances=self.max_instances
        )
        return j

    def start(self, user):
        if self.state == self.__class__.STATE_RUNNING:
            raise pym.exc.SchedulerError('Job is already running')
        sess = sa.inspect(self).session
        self.editor_id = pym.auth.models.User.find(sess, user).id
        self.state = self.__class__.STATE_RUNNING
        self.start_time = datetime.datetime.now(pytz.timezone(self.schedule['timezone']))
        trig = apscheduler.triggers.cron.CronTrigger(**self.schedule)
        self.next_time = trig.get_next_fire_time(None, self.start_time)
        sess.flush()

    def stop_ok(self, user, out=None):
        self._stop(user, self.__class__.STATE_SLEEPING, out)

    def stop_error(self, user, out=None):
        self._stop(user, self.__class__.STATE_ERROR, out)

    def _stop(self, user, state, out=None):
        if self.state != self.__class__.STATE_RUNNING:
            raise pym.exc.SchedulerError('Job is not running')
        sess = sa.inspect(self).session
        self.editor_id = pym.auth.models.User.find(sess, user).id
        self.state = state
        self.out = out
        self.end_time = datetime.datetime.now(pytz.timezone(self.schedule['timezone']))
        self.duration = self.end_time - self.start_time
        sess.flush()

    def is_ok(self):
        return self.state == self.__class__.STATE_SLEEPING

    def __repr__(self):
        return "<{name}(id={id}, job='{j}'>".format(
            id=self.id, j=self.job, name=self.__class__.__name__)


class jobify():

    def __init__(self, job: str):
        """
        Decorator to turn a function into a job.

        Loads the associated ``job`` from the database, where execution of the
        decorated function is logged by setting status and storing the output.

        The decorated function must accept at least these four arguments:

            ``sess``: Instance of a DB session (:class:`sqlalchemy.orm.Session`)
            ``lgg``: Instance of a logger (:class:`logging.Logger`)
            ``user``: Instance of a user (:class:`pym.auth.model.User`)

        We catch any exception the decorated function may rise and store it in
        the ``out`` field. The function also runs inside its own savepoint,
        which in case of an error is rolled back without invalidating the current
        transaction.

        The whole unit of work, including saving the job's state, is encapsulated
        in a transaction, either one that the caller has already started
        (``begin_transaction`` = False) or we create our own
        (``begin_transaction`` = True).

        Only if the outer block (job status) runs into an error, an exception
        is risen. In all other cases, we return the instance of the used job
        record, which fields ``out`` and ``state`` the caller can inspect to
        determine whether the decorated function produced errors or not.

        :param job: Name or ID of the associated job record
        """
        self.job = job

    def __call__(self, f):

        @functools.wraps(f)
        def wrapped_f(sess_maker,
                      lgg: logging.Logger,
                      user,
                      *args,
                      begin_transaction: bool=True,
                      **kwargs):

            if begin_transaction:
                transaction.begin()
            sess = sess_maker()

            try:
                job = Scheduler.find(sess, self.job)
                """:type: Scheduler"""
                user = pam.User.find(sess, user)

                job.start(user)
                sp = transaction.savepoint()
                try:
                    out = f(sess, lgg, user, begin_transaction, *args, **kwargs)
                except Exception as exc:
                    lgg.exception(exc)
                    sp.rollback()
                    out = [
                        str(exc),
                        traceback.format_exception(*sys.exc_info())
                    ]
                    job.stop_error(user, out)
                else:
                    job.stop_ok(user, out)
            except:
                if begin_transaction:
                    transaction.abort()
                raise
            else:
                if begin_transaction:
                    transaction.commit()
            return job

        return wrapped_f



class JobStore(BaseJobStore):

    def __init__(self, sess, user_id=SYSTEM_UID, pickle_protocol=pickle.HIGHEST_PROTOCOL):
        super().__init__()
        self.sess = sess
        self.user_id = SYSTEM_UID
        self.pickle_protocol = pickle_protocol

    def lookup_job(self, job_id):
        job = Scheduler.find(self.sess, job_id)
        return self._reconstitute_job(job.job_state)

    def get_due_jobs(self, now):
        timestamp = datetime_to_utc_timestamp(now)
        return self._get_jobs(
            Scheduler.enabled == True,
            Scheduler.next_time <= timestamp
        )

    def get_next_run_time(self):
        next_run_time = self.sess.query(
            Scheduler.next_time
        ).filter(
            Scheduler.enabled == True,
            Scheduler.next_time != None
        ).scalar()
        return utc_timestamp_to_datetime(next_run_time)

    def get_all_jobs(self):
        return self._get_jobs()

    def add_job(self, job):
        e = Scheduler.create(self.sess, job.id, self.user_id)
        e.next_time = datetime_to_utc_timestamp(job.next_run_time)
        e.job_state = pickle.dumps(job.__getstate__(), self.pickle_protocol)
        try:
            self.sess.flush()
        except sa.exc.IntegrityError:
            raise ConflictingIdError(job['job'])

    def update_job(self, job):
        try:
            e = Scheduler.find(self.sess, job.id)
        except sa.orm.exc.NoResultFound():
            raise JobLookupError(id)
        e.next_time = datetime_to_utc_timestamp(job.next_run_time)
        e.job_state = pickle.dumps(job.__getstate__(), self.pickle_protocol)
        self.sess.flush()

    def remove_job(self, job_id):
        try:
            e = Scheduler.find(self.sess, job_id)
        except sa.orm.exc.NoResultFound():
            raise JobLookupError(id)
        self.sess.delete(e)

    def remove_all_jobs(self):
        self.sess.query(Scheduler).delete()

    def shutdown(self):
        pass

    def _reconstitute_job(self, job_state):
        if job_state:
            job_state = pickle.loads(job_state)
        else:
            job_state = {}
        job_state['jobstore'] = self
        job = Job.__new__(Job)
        job.__setstate__(job_state)
        job._scheduler = self._scheduler
        job._jobstore_alias = self._alias
        return job

    def _get_jobs(self, *conditions):
        jobs = []
        fil = [
            Scheduler.job_state != None
        ]
        if conditions:
            fil += conditions
        rs = self.sess.query(
            Scheduler.job,
            Scheduler.job_state
        ).filter(
            *fil
        ).order_by(
            Scheduler.next_time
        )
        failed_job_ids = set()
        for row in rs:
            try:
                jobs.append(self._reconstitute_job(row.job_state))
            except:
                self._logger.exception("Failed to restore job '{}' "
                                       "-- removing it's state".format(row.job))
                failed_job_ids.add(row.job)

        # Remove all the jobs we failed to restore
        if failed_job_ids:
            for job_id in failed_job_ids:
                e = Scheduler.find(self.sess, job_id)
                e.job_state = None
            self.sess.flush()
        return jobs


