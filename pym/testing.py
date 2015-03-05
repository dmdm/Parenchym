import logging
import sqlalchemy as sa
import sqlalchemy.orm.exc
from pym.auth.const import UNIT_TESTER_UID, SYSTEM_UID
import pym.auth.models as pam


mlgg = logging.getLogger(__name__)


class TestingArgs(object):
    config = 'testing.ini'
    root_dir = '.'
    etc_dir = None


def create_unit_tester(lgg, sess):
    pf = {
        'id': UNIT_TESTER_UID,
        'principal': 'UNIT_TESTER',
        'is_enabled': False,
        'pwd': None,
        'pwd_expires': '1111-11-11',
        'email': 'unit_tester@localhost.localdomain',
        'notify_by': 'onscreen',
        'display_name': 'UNIT TESTER'
    }
    try:
        p = sess.query(pam.User).filter(
            pam.User.id == UNIT_TESTER_UID
        ).one()
        lgg.debug('User ' + p.principal + ' loaded')
    except sa.orm.exc.NoResultFound:
        # noinspection PyArgumentList
        p = pam.User(owner=SYSTEM_UID, **pf)
        sess.add(p)
        lgg.debug('User ' + p.principal + ' added')
    sess.flush()
    return p


# noinspection PyUnusedLocal
class BaseMock(object):

    def __init__(self, *args, **kw):
        try:
            self.lgg = kw['lgg']
        except KeyError:
            self.lgg = None

    def __getattr__(self, item):
        def _method(*args, **kw):
            self.lgg.debug("Mock: {}.{}()".format(
                self.__class__.__name__,
                item
            ))
        return _method


class MockFileUploadStore(BaseMock):
    pass


class MockContext(BaseMock):
    pass
