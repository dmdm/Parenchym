import datetime
import sqlalchemy as sa
from sqlalchemy.orm.exc import NoResultFound
import pyramid.util
import pym.exc
import pym.security
from .models import User, Group, GroupMember, Ace


class AuthMgr:

    @classmethod
    def factory(cls, lgg, sess, rc):
        password_scheme = rc.g('auth.password_scheme', 'pbkdf2_sha512')
        return cls(
            lgg=lgg,
            sess=sess,
            user_cls=rc.g('auth.class.user', User),
            group_cls=rc.g('auth.class.group', Group),
            group_member_cls=rc.g('auth.class.group_member', GroupMember),
            ace_cls=rc.g('auth.class.ace', Ace),
            password_scheme=password_scheme
        )

    def __init__(self, lgg, sess, user_cls, group_cls, group_member_cls,
            ace_cls, password_scheme):
        """
        Authentication Manager.

        :param lgg: Instance of a logger
        :param sess: Instance of a DB session
        :param user_cls: Class for a user account. Defaults to
            :class:`pym.auth.models.User`
        :param group_cls: Class for a group. Defaults to
            :class:`pym.auth.models.Group`
        :param group_member_cls: Class for a group member. Defaults to
            :class:`pym.auth.models.GroupMember`
        :param ace_cls: Class for a ACE. Defaults to
            :class:`pym.auth.models.Ace`
        :param password_scheme:
        """
        self.lgg = lgg
        self.sess = sess
        self.user_cls = user_cls
        self.group_cls = group_cls
        self.group_member_cls = group_member_cls
        self.ace_cls = ace_cls
        self.password_scheme = password_scheme

    def create_user(self, owner, is_enabled, principal, pwd, email, groups=None,
            **kwargs):
        """
        Creates a new user record.

        :param owner: ID, ``principal``, or instance of creating user.
        :param is_enabled: True to enable this user, False to disable.
        :param principal: Principal string for new user.
        :param pwd: User's password. We will encrypt it.
        :param email: User's email address.
        :param groups: List of groups this user shall be member of. User is at least
            member of group ``users``. If a group does not exist, it is created.
            Set to False to skip groups altogether.
        :param kwargs: See :class:`~pym.auth.models.User`.
        :return: Instance of created user.
        """
        # Ensure, password is encrypted
        if pwd and not pwd.startswith(('{', '$')):
            pwd = pym.security.pwd_context.encrypt(pwd, self.password_scheme)
        # Ensure, email is lower case
        email = email.lower()

        # Create the user
        u = self.user_cls()
        self.sess.add(u)
        # Cannot rely on find(), because when we initialise the DB, owner might not
        # yet exist.
        u.owner_id = owner if isinstance(owner, int) else \
            self.user_cls.find(self.sess, owner).id
        u.is_enabled = is_enabled
        u.principal = principal
        u.pwd = pwd
        u.email = email
        for k, v in kwargs.items():
            setattr(u, k, v)
        # If display_name is empty, use principal
        if not u.display_name:
            u.display_name = u.principal
        # TODO Make sure display_name is unique by suffixing if necessary
        # hint: lock user table for readonly, load all display_names that start with
        #       current display_name. Fetch a suffix and check again. Repeat if
        #       necessary.
        # Principal and email must be unique too, but a violation of their uniqueness
        # is better handled by the caller: we let the exception bubble up.
        self.sess.flush()  # to get ID of user
        # Load/create the groups and memberships
        # User is always at least member of group 'users'
        if groups is not False:
            if groups is None:
                groups = []
            groups = set(groups + ['users'])
            # Load existing groups
            existing_groups = []
            new_group_names = []
            for g in groups:
                try:
                    existing_groups.append(self.group_cls.find(self.sess, g))
                except sa.orm.exc.NoResultFound:
                    new_group_names.append(g)
            # Create the new groups
            for name in new_group_names:
                existing_groups.append(self.create_group(owner, name))
            # Create group memberships
            for g in existing_groups:
                self.create_group_member(owner, group=g, member_user=u)
        return u

    def update_user(self, user, editor, **kwargs):
        """
        Updates a user.
    
        For details about ``**kwargs``, see :class:`~pym.auth.models.User`.
    
        :param user: ID, ``principal``, or instance of user to update.
        :param editor: ID, ``principal``, or instance of updating user.
        :return: Instance of updated user.
        """
        u = self.user_cls.find(self.sess, user)
        u.editor_id = self.user_cls.find(self.sess, editor).id
        u.mtime = datetime.datetime.now()
        for k, v in kwargs.items():
            setattr(u, k, v)
        # Ensure, password is encrypted
        if u.pwd and not u.pwd.startswith(('{', '$')):
            u.pwd = pym.security.pwd_context.encrypt(u.pwd, self.password_scheme)
        # Ensure, email is lower case
        if u.email:
            u.email = u.email.lower()
        # If display_name is empty, use principal
        if not u.display_name:
            u.display_name = u.principal
        self.sess.flush()
        return u

    def delete_user(self, user, deleter, deletion_reason=None, delete_from_db=False):
        """
        Deletes a user.

        :param user: ID, ``principal``, or instance of user to delete.
        :param deleter: ID, ``principal``, or instance of deleting user.
        :param deletion_reason: Reason for deletion.
        :param delete_from_db: Optional. Defaults to just tag as deleted (False),
            set True to physically delete record from DB.
        :return: None if really deleted, else instance of tagged user.
        """
        usr = self.user_cls.find(self.sess, user)
        if delete_from_db:
            self.sess.delete(usr)
            usr = None
        else:
            usr.deleter_id = self.user_cls.find(self.sess, deleter).id
            usr.dtime = datetime.datetime.now()
            usr.deletion_reason = deletion_reason
            if not usr.editor_id:
                usr.editor_id = usr.deleter_id
                usr.mtime = usr.dtime
        self.sess.flush()
        return usr

    def create_group(self, owner, name, **kwargs):
        """
        Creates a new group record.

        For details about ``**kwargs``, see :class:`~pym.auth.models.Group`.

        :param owner: ID, ``principal``, or instance of creating user.
        :param name: Name of group to create.
        :return: Instance of created group.
        :raise: :class:`~pym.exc.ItemExistsError` if group already exists
        """
        owner_id = self.user_cls.find(self.sess, owner).id
        try:
            tenant_id = kwargs['tenant_id']
        except KeyError:
            tenant_id = None
        try:
            g = self.sess.query(self.group_cls).filter(
                self.group_cls.name == name,
                self.group_cls.tenant_id == tenant_id
            ).one()
            raise pym.exc.ItemExistsError("Group '{}' already exists".format(name),
                item=g)
        except NoResultFound:
            gr = self.group_cls()
            self.sess.add(gr)
            gr.owner_id = owner_id
            gr.name = name
            for k, v in kwargs.items():
                setattr(gr, k, v)
            if not gr.kind:
                gr.kind = 'system'
            self.sess.flush()
            return gr

    def update_group(self, group, editor, **kwargs):
        """
        Updates a group.

        For details about ``**kwargs``, see :class:`~pym.auth.models.Group`.

        :param group: ID, ``name``, or instance of group to update.
        :param editor: ID, ``principal``, or instance of updating user.
        :return: Instance of updated group.
        """
        gr = self.group_cls.find(self.sess, group)
        gr.editor_id = self.user_cls.find(self.sess, editor).id
        gr.mtime = datetime.datetime.now()
        for k, v in kwargs.items():
            setattr(gr, k, v)
        self.sess.flush()
        return gr

    def delete_group(self, group, deleter, deletion_reason=None,
                     delete_from_db=False):
        """
        Deletes a group.

        :param group: ID, ``name``, or instance of a group.
        :param deleter: ID, ``principal``, or instance of deleting user.
        :param deletion_reason: Reason for deletion.
        :param delete_from_db: Optional. Defaults to just tag as deleted (False),
            set True to physically delete record from DB.
        :return: None if really deleted, else instance of tagged group.
        """
        gr = self.group_cls.find(self.sess, group)
        if delete_from_db:
            self.sess.delete(gr)
            gr = None
        else:
            gr.deleter_id = self.user_cls.find(self.sess, deleter).id
            gr.dtime = datetime.datetime.now()
            gr.deletion_reason = deletion_reason
            gr.editor_id = gr.deleter_id
            gr.mtime = gr.dtime
            # TODO Replace content of unique fields
        self.sess.flush()
        return gr

    def create_group_member(self, owner, group, member_user=None,
            member_group=None, **kwargs):
        """
        Creates a new group_member record.

        For details about ``**kwargs``, see :class:`~pym.auth.models.GroupMember`.

        :param owner: ID, ``principal``, or instance of creating user.
        :param group: ID, ``name``, or instance of containing group.
        :param member_user: ID, ``principal``, or instance of member user.
        :param member_group: ID, ``name``, or instance of member group.
        :return: Instance of created group_member
        :raise: :class:`~pym.exc.ItemExistsError` if group member already exists
        """
        if not member_user and not member_group:
            raise pym.exc.PymError(
                "Either member_user or member_group must be set")
        if member_user and member_group:
            raise pym.exc.PymError("Cannot set member_user and member_group"
                                   " simultaneously. Use separate groups.")
        owner_id = self.user_cls.find(self.sess, owner).id
        gr = self.group_cls.find(self.sess, group)
        fil = [
            self.group_member_cls.group_id == gr.id
        ]
        if member_user:
            member = self.user_cls.find(self.sess, member_user)
            fil.append(self.group_member_cls.member_user_id == member.id)
            which = 'User'
        else:
            member = self.group_cls.find(self.sess, member_group)
            fil.append(self.group_member_cls.member_group_id == member.id)
            which = 'Group'
        try:
            gm = self.sess.query(self.group_member_cls).filter(*fil).one()
            m = "{} '{}' already is member of group '{}'".format(which, member, gr)
            raise pym.exc.ItemExistsError(m, item=gm)
        except NoResultFound:
            gm = self.group_member_cls()
            self.sess.add(gm)
            gm.owner_id = owner_id
            gm.group_id = gr.id
            if member_user:
                gm.member_user_id = member.id
            else:
                gm.member_group_id = member.id
            for k, v in kwargs.items():
                setattr(gm, k, v)
            self.sess.flush()
            return gm

    def delete_group_member(self, group_member):
        """
        Deletes a group_member.

        We always delete a group membership physically, there is no tagging as
        deleted.

        :param group_member: ID, or instance of a group member.
        """
        gm = self.group_member_cls.find(self.sess, group_member)
        self.sess.delete(gm)
        self.sess.flush()

    def delete_ace(self, ace_id):
        """
        Deletes an ACE.

        We always delete an ACE physically, there is no tagging as deleted.

        :param ace_id: ID of an ACE.
        """
        ace = self.sess.query(self.ace_cls).get(ace_id)
        self.sess.delete(ace)
        self.sess.flush()
