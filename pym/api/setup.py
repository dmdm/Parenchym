import logging
from sqlalchemy.orm.exc import NoResultFound
from pym.auth.const import SYSTEM_UID, USERS_RID
from pym.auth.models import Permissions
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from pym.tenants.const import DEFAULT_TENANT_NAME
from .const import *


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    # Check that these resource nodes are not already present
    try:
        n_api = ResourceNode.find(sess, None, parent_id=n_root.id,
            name=NODE_NAME_API)
    except NoResultFound:
        n_api = n_root.add_child(owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_API, title='api',
            iface='pym.api.models.IApiNode')
    # Grant group 'users' permission 'visit' on resource 'api'.
    n_api.allow(SYSTEM_UID, Permissions.visit.value, group=USERS_RID)
    try:
        n_rest = ResourceNode.find(sess, None, parent_id=n_api.id,
            name=NODE_NAME_API_REST)
    except NoResultFound:
        n_rest = n_api.add_child(owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_API_REST, title='rest',
            iface='pym.api.models.IApiRestNode')
    # Grant group 'users' permission 'visit' on resource 'rest'.
    n_rest.allow(SYSTEM_UID, Permissions.visit.value, group=USERS_RID)


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
