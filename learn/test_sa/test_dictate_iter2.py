#!/usr/bin/env python

# ==================================================================
#  This is just setup. The real action is at the bottom
# ==================================================================

# from pprint import pprint
import sqlalchemy as sa
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sqlalchemy.util._collections


DbEngine = sa.create_engine('sqlite:///:memory:', echo=False)
DbBase = declarative_base()
DbSession = sessionmaker(bind=DbEngine)


class Smeagol(DbBase):
    __tablename__ = 'smeagol'

    id = sa.Column(sa.Integer(), nullable=False, primary_key=True)
    who = sa.Column(sa.Unicode(255), nullable=False)

    def __repr__(self):
        return "<{cls}(id={id}, who='{who}')>".format(
            cls=self.__class__.__name__, id=self.id, who=self.who)


class Deagol(DbBase):
    __tablename__ = 'deagol'

    id = sa.Column(sa.Integer(), nullable=False, primary_key=True)
    who_id = sa.Column(sa.Integer(), nullable=False)
    what = sa.Column(sa.Unicode(255), nullable=False)
    whom_id = sa.Column(sa.Integer(), nullable=True)

    def __repr__(self):
        return "<{cls}(id={id}, who_id={who}, what='{what}', whom_id={whom})>".format(
            cls=self.__class__.__name__, id=self.id, who=self.who_id,
            what=self.what, whom=self.whom_id)


def is_1xx():
    return sa.__version__.startswith('1')


def bootstrap(sess):
    DbBase.metadata.create_all(DbEngine)

    # Yeah, I could have used orm relationships to init, but I didn't
    me = Smeagol(who='Me')
    sess.add(me)
    myself = Smeagol(who='Myself')
    sess.add(myself)
    i = Smeagol(who='I')
    sess.add(i)
    sess.flush()

    sess.add(Deagol(who_id=i.id, what='hate', whom_id=myself.id))
    sess.add(Deagol(who_id=i.id, what="don't like", whom_id=me.id))
    sess.add(Deagol(who_id=myself.id, what="is bff of", whom_id=me.id))
    # Yes, I want a missing right side
    sess.add(Deagol(who_id=me.id, what="wtf? no SO?", whom_id=None))
    sess.flush()


def perform_query(sess):
    who = sa.orm.aliased(Smeagol, name='Who')
    what = sa.orm.aliased(Deagol, name='What')
    whom = sa.orm.aliased(Smeagol, name='Whom')

    rs = sess.query(
        who, what, whom
    ).outerjoin(
        what, what.who_id == who.id
    ).outerjoin(
        whom, what.whom_id == whom.id
    ).order_by(
        who.who.asc()
    )
    return rs


# ==================================================================
#  Real action begins here
# ==================================================================

def process_keyed_tuple(kt):
    for i in kt:
        if i is not None:
            sa.inspect(i)  # discard result, just show that inspect() works


def process_object(o):
    sa.inspect(o)  # discard result, just show that inspect() works


def dictate(r):
    if is_1xx():
        # Need to use name, since there is no class 'result'
        assert type(r).__name__ == 'result'
    else:
        assert type(r) == sqlalchemy.util._collections.KeyedTuple

    # KeyedTuples are recognized by the real function dictate(), iterated over
    # and each item gets inspected
    if isinstance(r, sqlalchemy.util._collections.KeyedTuple):
        process_keyed_tuple(r)
    else:
        # This type is unknown, then treated as an object and inspected(),
        # which fails.
        process_object(r)


def main():
    sess = DbSession()
    bootstrap(sess)

    rs = perform_query(sess)
    for r in rs:
        dictate(r)  # results not needed here

    print('Finished.')


if __name__ == '__main__':
    main()
