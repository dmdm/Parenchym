# To run inside ipython


# %load_ext autoreload
# %autoreload 2

import pym.blank_web_app
from pym.models import (DbSession, dictate, dictate_iter)
from pym.auth.models import User, Group, GroupMember, Permission, Ace
from pym.res.models import ResourceNode
from pym.fs.models import FsNode
from pym.tenants.models import Tenant
import sqlalchemy as sa

app = pym.blank_web_app.main(['foo', '-c', 'development.ini'])
root = app.request.root
sess = DbSession()
rs = sess.query(ResourceNode, User.principal).join(User, ResourceNode.owner_id == User.id)

rs_list = rs.all()

r = rs_list[0]
