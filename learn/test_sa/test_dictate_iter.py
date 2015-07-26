#!/usr/bin/env python

"""
This script tests the results of our library function
:func:`pym.lib.dictate_iter`.

It is supposed to mogrify a result set into a list of dicts. SA's result set
can have different components, whether we select whole entities, pick
fields explicitly, or even compose the SQL by hand.

:func:`pym.lib.dictate_iter` must detect which type it is dealing with and act
accordingly. Up until SA 0.9.9 it worked fine.

SA 1.0.6 (other 1.x not tested) breaks it and says:

::
    No inspection system is available for object of type
    <class 'sqlalchemy.util._collections.result'>


Our setup is simple:

Two entities, :class:`Smeagol` and class:`Deagol`, can build a m:n relationship
Smeagol -> Deagol -> Aliased(Smeagol). We query their data in the different
ways mentioned above and check that the results of :func:`pym.lib.dictate_iter`
meet our expectations (if not, an AssertionError is raised).

Run this code with SA 0.9.9 and no errors are expected.
Run this code with SA 1.0.6, we expect above error on functions
:func:`make_noise` and :func:`hero_the_city_needs`.

Used Python 3.4 (3.3 should be ok too).

How can :func:`pym.lib.dictate_iter` be fixed to cope with the new situation?
"""

from collections import OrderedDict
# from pprint import pprint
import sqlalchemy as sa
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pym.lib import dictate_iter


GENTLE_EXPECTATIONS = [
    OrderedDict([('id', 3), ('who', 'I')]),
    OrderedDict([('id', 1), ('who', 'Me')]),
    OrderedDict([('id', 2), ('who', 'Myself')])
]

NOISE_EXPECTATIONS = {
    'nested': [
        {
            'Who': OrderedDict([('id', 3), ('who', 'I')]),
            'What': {
                'id': 2,
                'who_id': 3,
                'what': "don't like",
                'whom_id': 1
            },
            'Whom': OrderedDict([('id', 1), ('who', 'Me')])
        },
        {
            'Who': OrderedDict([('id', 3), ('who', 'I')]),
            'What': {
                'id': 1,
                'who_id': 3,
                'what': 'hate',
                'whom_id': 2
            },
            'Whom': OrderedDict([('id', 2), ('who', 'Myself')])
        },
        {
            'Who': OrderedDict([('id', 1), ('who', 'Me')]),
            'What': {
                'id': 4,
                'who_id': 1,
                'what': 'wtf? no SO?',
                'whom_id': None
            },
            'Whom': None
        },
        {
            'Who': OrderedDict([('id', 2), ('who', 'Myself')]),
            'What': {
                'id': 3,
                'who_id': 2,
                'what': 'is bff of',
                'whom_id': 1
            },
            'Whom': OrderedDict([('id', 1), ('who', 'Me')])
        }
    ],
    'qualified': [
        {'Who_id': 3,
        'Who_who': 'I',
        'What_id': 2,
        'What_who_id': 3,
        'What_what': "don't like",
        'What_whom_id': 1,
        'Whom_id': 1,
        'Whom_who': 'Me'},
        {'Who_id': 3,
        'Who_who': 'I',
        'What_id': 1,
        'What_who_id': 3,
        'What_what': 'hate',
        'What_whom_id': 2,
        'Whom_id': 2,
        'Whom_who': 'Myself'},
        {'Who_id': 1,
        'Who_who': 'Me',
        'What_id': 4,
        'What_who_id': 1,
        'What_what': 'wtf? no SO?',
        'What_whom_id': None,
        'Whom': None},
        {'Who_id': 2,
        'Who_who': 'Myself',
        'What_id': 3,
        'What_who_id': 2,
        'What_what': 'is bff of',
        'What_whom_id': 1,
        'Whom_id': 1,
        'Whom_who': 'Me'}
    ],
    'flat': [
        {'id': 1,
        'who': 'Me',
        'who_id': 3,
        'what': "don't like",
        'whom_id': 1},
        {'id': 2,
        'who': 'Myself',
        'who_id': 3,
        'what': 'hate',
        'whom_id': 2},
        {'id': 4,
        'who': 'Me',
        'who_id': 1,
        'what': 'wtf? no SO?',
        'whom_id': None,
        'Whom': None},
        {'id': 1,
        'who': 'Me',
        'who_id': 2,
        'what': 'is bff of',
        'whom_id': 1}
    ]
}

HERO_EXPECTATIONS = {
    'nested': [
        {'Who': OrderedDict([('id', 3), ('who', 'I')]),
        'what': "don't like",
        'whom': 'Me'},
        {'Who': OrderedDict([('id', 3), ('who', 'I')]),
        'what': 'hate',
        'whom': 'Myself'},
        {'Who': OrderedDict([('id', 1), ('who', 'Me')]),
        'what': 'wtf? no SO?',
        'whom': None},
        {'Who': OrderedDict([('id', 2), ('who', 'Myself')]),
        'what': 'is bff of',
        'whom': 'Me'}
    ],
    'qualified': [
        {'Who_id': 3,
        'Who_who': 'I',
        'what': "don't like",
        'whom': 'Me'},
        {'Who_id': 3,
        'Who_who': 'I',
        'what': 'hate',
        'whom': 'Myself'},
        {'Who_id': 1,
        'Who_who': 'Me',
        'what': 'wtf? no SO?',
        'whom': None},
        {'Who_id': 2,
        'Who_who': 'Myself',
        'what': 'is bff of',
        'whom': 'Me'}
    ],
    'flat': [
        {'id': 3,
        'who': 'I',
        'what': "don't like",
        'whom': 'Me'},
        # HUH? Why is this record suddenly an OrderedDict, the others not?
        OrderedDict(
            [('id', 3), ('who', 'I'), ('what', 'hate'), ('whom', 'Myself')]),
        {'id': 1,
        'who': 'Me',
        'what': 'wtf? no SO?',
        'whom': None},
        {'id': 2,
        'who': 'Myself',
        'what': 'is bff of',
        'whom': 'Me'}
    ]
}

ORA_EXPECTATIONS = [
    {'id': 3,
    'who': 'I',
    'what': "don't like",
    'whom': 'Me'},
    OrderedDict([('id', 3), ('who', 'I'), ('what', 'hate'), ('whom', 'Myself')]),
    {'id': 1,
    'who': 'Me',
    'what': 'wtf? no SO?',
    'whom': None},
    {'id': 2,
    'who': 'Myself',
    'what': 'is bff of',
    'whom': 'Me'}
]


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


def will_explode():
    return sa.__version__.startswith('1.')


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


def be_gentle(sess):
    """
    A gentle query, fetching all records of only a single entity.
    Unsurprisingly, the mogrified data is quite boring.
    """
    rs = sess.query(Smeagol).order_by(Smeagol.who.asc())
    data = dictate_iter(rs, objects_as='nested')
    # pprint(data)
    assert data == GENTLE_EXPECTATIONS
    data = dictate_iter(rs, objects_as='qualified')
    # pprint(data)
    assert data == GENTLE_EXPECTATIONS
    data = dictate_iter(rs, objects_as='flat')
    # pprint(data)
    assert data == GENTLE_EXPECTATIONS


def make_noise(sess):
    """
    A query along the full m:n relationship. Now the parameter `object_as`
    is relevant and determines how the mogrified data is shaped.

    Still, we operate on full entities and return too much data.
    """
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
    data = dictate_iter(rs, objects_as='nested')
    # pprint(data)
    assert data == NOISE_EXPECTATIONS['nested']
    data = dictate_iter(rs, objects_as='qualified')
    # pprint(data)
    assert data == NOISE_EXPECTATIONS['qualified']
    data = dictate_iter(rs, objects_as='flat')
    # pprint(data)
    assert data == NOISE_EXPECTATIONS['flat']


def hero_the_city_needs(sess):
    """
    Similar to :func:`make_noise` a query along the full m:n relationship. But
    now we query the fields we are interested in explicitly.
    """
    who = sa.orm.aliased(Smeagol, name='Who')
    what = sa.orm.aliased(Deagol, name='What')
    whom = sa.orm.aliased(Smeagol, name='Whom')

    rs = sess.query(
        who,
        what.what.label('what'),
        whom.who.label('whom')
    ).outerjoin(
        what, what.who_id == who.id
    ).outerjoin(
        whom, what.whom_id == whom.id
    ).order_by(
        who.who.asc()
    )
    data = dictate_iter(rs, objects_as='nested')
    # pprint(data)
    assert data == HERO_EXPECTATIONS['nested']
    data = dictate_iter(rs, objects_as='qualified')
    # pprint(data)
    assert data == HERO_EXPECTATIONS['qualified']
    data = dictate_iter(rs, objects_as='flat')
    # pprint(data)
    assert data == HERO_EXPECTATIONS['flat']


def ora_et_labora(sess):
    """
    Like :func:`hero_the_city_needs`, but we build the SQL statement manually.
    """
    q = sa.text("""
        select
          who.id    as id,
          who.who   as who,
          what.what as what,
          whom.who  as whom
        from smeagol who
        left join deagol what on who.id == what.who_id
        left join smeagol whom on whom.id == what.whom_id
        order by who.who
    """).columns(
        id=sa.Integer(),
        who=sa.Unicode(255),
        what=sa.Unicode(255),
        whom=sa.Unicode(255)
    )
    rs = sess.execute(q)

    # 'object_as' makes no difference here
    data = dictate_iter(rs, objects_as='nested')
    # pprint(data)
    assert data == ORA_EXPECTATIONS


def main():
    sess = DbSession()
    bootstrap(sess)

    # works with 0.9.9 and 1.0.6
    be_gentle(sess)

    if will_explode():
        try:
            make_noise(sess)
        except NoInspectionAvailable as exc:
            print('ERROR on noise:', exc)
    else:
        # works with 0.9.9
        make_noise(sess)

    if will_explode():
        try:
            hero_the_city_needs(sess)
        except NoInspectionAvailable as exc:
            print('ERROR on hero:', exc)
    else:
        # works with 0.9.9
        hero_the_city_needs(sess)

    # works with 0.9.9 and 1.0.6
    ora_et_labora(sess)

    print('Finished.')


if __name__ == '__main__':
    main()
