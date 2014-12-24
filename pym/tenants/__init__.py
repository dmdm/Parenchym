from pyramid.traversal import lineage
from .const import DEFAULT_TENANT_NAME
from .models import Tenant


def find_tenant_node(resource):
    """
    Finds the tenant node in the resource path to which ``resource``
    belongs. The tenant node is the immediate child of root.

    :param resource: A resource, e.g. the context of a view.
    :returns: :class:`pym.res.models.ResourceNode` The node of the default
        tenant if ``resource`` is root, else the tenant node (which may be
        identical to ``resource``).
    """
    lin = list(lineage(resource))
    try:
        # Root is last element (lin[-1]), tenant is 2nd last.
        return lin[-2]
    except IndexError:
        # Given resource is root, so use default tenant
        return resource[DEFAULT_TENANT_NAME]


def find_tenant(sess, resource):
    """
    Finds the tenant in the resource path to which ``resource`` belongs.

    :param sess: DB session
    :param resource: A resource, e.g. the context of a view.
    :returns: :class:`pym.tenants.models.Tenant` Instance of a tenant loaded
        from DB.
    """
    tenant_node = find_tenant_node(resource)
    tenant = sess.query(Tenant).filter(Tenant.name == tenant_node.name).one()
    return tenant
