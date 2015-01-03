import logging
from sqlalchemy.orm.exc import NoResultFound
from pym.auth.const import SYSTEM_UID, USERS_RID
from pym.auth.models import Permissions
from pym.res.models import ResourceNode
from pym.res.const import NODE_NAME_ROOT
from .const import *
from pym.tenants.const import DEFAULT_TENANT_NAME


mlgg = logging.getLogger(__name__)


def _create_views(sess, rc):
    pass


def _setup_resources(sess):
    n_root = ResourceNode.load_root(sess, name=NODE_NAME_ROOT, use_cache=False)
    # For demo, attach journals to default tenant
    n_tenant = n_root[DEFAULT_TENANT_NAME]

    # Check that these resource nodes are not already present
    try:
        n_journals = ResourceNode.find(sess, None,
            parent_id=n_tenant.id, name=NODE_NAME_JOURNALS)
    except NoResultFound:
        n_journals = n_tenant.add_child(sess=sess, owner=SYSTEM_UID,
            kind="res",
            name=NODE_NAME_JOURNALS, title='Journals',
            iface='pym.journals.models.IJournalsNode')
    # Grant group 'users' permission 'read' on resource 'journals'.
    n_journals.allow(sess, SYSTEM_UID, Permissions.read.value, group=USERS_RID)

    # # Create child-node for each journal
    # for j in Journals:
    #     n = ResourceNode.find(sess, parent=n_journals,
    #         name=j.value['name'])
    #     if not n:
    #         n_journals.add_child(sess=sess, owner=SYSTEM_UID,
    #             kind="res",
    #             name=j.value['name'], title=j.value['title'],
    #             iface='pym.journals.models.IJournalsNode')


def create_schema(sess, rc):
    _create_views(sess, rc)


def setup(sess, rc):
    _setup_resources(sess)
