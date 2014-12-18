import datetime
import sqlalchemy as sa
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.sql import and_

from pym.exc import AuthError
import pym.security
from .models import (User, Group, GroupMember)


PASSWORD_SCHEME = 'pbkdf2_sha512'


def create_user(sess, owner, is_enabled, principal, pwd, email, groups=None,
        **kwargs):
    """
    Creates a new user record.

    :param sess: A DB session instance.
    :param owner: ID, ``principal``, or instance of creating user.
    :param is_enabled: True to enable this user, False to disable.
    :param principal: Principal string for new user.
    :param pwd: User's password. We will encrypt it.
    :param email: User's email address.
    :param group_names: List of groups this user shall be member of. User is at least
        member of group ``users``. If a group does not exist, it is created.
        Set to False to skip groups altogether.
    :param kwargs: See :class:`~pym.auth.models.User`.
    :return: Instance of created user.
    """
    # Ensure, password is encrypted
    if pwd and not pwd.startswith(('{', '$')):
        pwd = pym.security.pwd_context.encrypt(pwd, PASSWORD_SCHEME)
    # Ensure, email is lower case
    email = email.lower()

    # Create the user
    u = User()
    # Cannot rely on find(), because when we initialise the DB, owner might not
    # yet exist.
    u.owner_id = owner if isinstance(owner, int) else User.find(sess, owner).id
    u.is_enabled = is_enabled
    u.principal = principal
    u.pwd = pwd
    u.email = email
    for k, v in kwargs.items():
        setattr(u, k, v)
    # If display_name is empty, use principal
    if not u.display_name:
        u.display_name = u.principal
    sess.add(u)
    sess.flush()  # to get ID of user

    # Load/create the groups and memberships
    if groups:
        group_names = [Group.find(sess, g).name for g in groups]
        # Determine groups this user will be member of.
        # Always at least 'users'.
        if group_names:
            group_names = set(group_names + ['users'])
        else:
            group_names = {'users'}
        for name in group_names:
            # Try to load the specified group
            try:
                g = sess.query(Group).filter(
                    and_(
                        Group.tenant_id == None,  # must be system group
                        Group.name == name
                    )
                ).one()
            # If group does not exist, create one and define membership
            except NoResultFound:
                g = create_group(sess, owner, name)
                create_group_member(sess, owner, g, u)
            else:
                # Group did exist, maybe membership also?
                try:
                    sess.query(GroupMember).filter(sa.and_(
                        GroupMember.group_id == g.id,
                        GroupMember.member_user_id == u.id
                    )).one()
                # Nope. Create membership.
                except NoResultFound:
                    create_group_member(sess, owner, g, u)
    return u


def update_user(sess, user, editor, **kwargs):
    """
    Updates a user.

    For details about ``**kwargs``, see :class:`~pym.auth.models.User`.

    :param sess: A DB session instance.
    :param user: ID, ``name``, or instance of user to update.
    :param editor: ID, ``principal``, or instance of editing user.
    :return: Instance of updated user.
    """
    u = User.find(sess, user)
    u.editor_id = User.find(sess, editor).id
    u.mtime = datetime.datetime.now()
    for k, v in kwargs.items():
        setattr(u, k, v)
    # Ensure, password is encrypted
    if u.pwd and not u.pwd.startswith(('{', '$')):
        u.pwd = pym.security.pwd_context.encrypt(u.pwd, PASSWORD_SCHEME)
    # Ensure, email is lower case
    if u.email:
        u.email = u.email.lower()
    # If display_name is empty, use principal
    if not u.display_name:
        u.display_name = u.principal
    sess.flush()
    return u


def delete_user(sess, user, deleter, delete_from_db=False):
    """
    Deletes a user.

    :param sess: A DB session instance.
    :param user: ID, ``name``, or instance of a user.
    :param deleter: ID, ``principal``, or instance of a user.
    :param delete_from_db: Optional. Defaults to just tag as deleted (False),
        set True to physically delete record from DB.
    :return: None if really deleted, else instance of tagged user.
    """
    usr = User.find(sess, user)
    if delete_from_db:
        sess.delete(usr)
        usr = None
    else:
        usr.deleter_id = User.find(sess, deleter).id
        usr.dtime = datetime.datetime.now()
    sess.flush()
    return usr


def create_group(sess, owner, name, **kwargs):
    """
    Creates a new group record.

    For details about ``**kwargs``, see :class:`~pym.auth.models.Group`.

    :param sess: A DB session instance.
    :param owner: ID, ``principal``, or instance of a user.
    :param ctime: Optional timestamp as creation time, defaults to now.
    :return: Instance of created group.
    :raise: :class:`~pym.exc.ItemExistsError` if group already exists
    """
    owner_id = User.find(sess, owner).id
    try:
        g = sess.query(Group).filter(Group.name == name).one()
        raise pym.exc.ItemExistsError("Group '{}' already exists".format(name),
            item=g)
    except NoResultFound:
        gr = Group()
        sess.add(gr)
        gr.owner_id = owner_id
        gr.name = name
        for k, v in kwargs.items():
            setattr(gr, k, v)
        sess.flush()
        return gr


def update_group(sess, group, editor, **kwargs):
    """
    Updates a group.

    For details about ``**kwargs``, see :class:`~pym.auth.models.Group`.

    :param sess: A DB session instance.
    :param group: ID, ``name``, or instance of a group.
    :param editor: ID, ``principal``, or instance of a user.
    :return: Instance of updated group.
    """
    gr = Group.find(sess, group)
    gr.editor_id = User.find(sess, editor).id
    gr.mtime = datetime.datetime.now()
    for k, v in kwargs.items():
        setattr(gr, k, v)
    sess.flush()
    return gr


def delete_group(sess, group, deleter, delete_from_db=False):
    """
    Deletes a group.

    :param sess: A DB session instance.
    :param group: ID, ``name``, or instance of a group.
    :param deleter: ID, ``principal``, or instance of a user.
    :param delete_from_db: Optional. Defaults to just tag as deleted (False),
        set True to physically delete record from DB.
    :return: None if really deleted, else instance of tagged group.
    """
    gr = Group.find(sess, group)
    if delete_from_db:
        sess.delete(gr)
        gr = None
    else:
        gr.deleter_id = User.find(sess, deleter).id
        gr.dtime = datetime.datetime.now()
        # TODO Replace content of unique fields
    sess.flush()
    return gr


def create_group_member(sess, owner, group, member_user=None,
        member_group=None, **kwargs):
    """
    Creates a new group_member record.

    For details about ``**kwargs``, see :class:`~pym.auth.models.GroupMember`.

    :return: Instance of created group_member
    :raise: :class:`~pym.exc.ItemExistsError` if group mmber already exists
    """
    if not member_user and not member_group:
        raise pym.exc.PymError("Either member_user or member_group must be set")
    if member_user and member_group:
        raise pym.exc.PymError("Cannot set both member_user and member_group")
    owner_id = User.find(sess, owner).id
    gr = Group.find(sess, group)
    fil = [
        GroupMember.group_id == gr.id
    ]
    if member_user:
        member = User.find(sess, member_user)
        fil.append(GroupMember.member_user_id == member.id)
        which = 'User'
    else:
        member = Group.find(sess, member_group)
        fil.append(GroupMember.member_group_id == member.id)
        which = 'Group'
    try:
        gm = sess.query(GroupMember).filter(*fil).one()
        m = "{} '{}' already is member of group '{}'".format(which, member, gr)
        raise pym.exc.ItemExistsError(m, item=gm)
    except NoResultFound:
        gm = GroupMember()
        sess.add(gm)
        gm.owner_id = owner_id
        gm.group_id = gr.id
        if member_user:
            gm.member_user_id = member.id
        else:
            gm.member_group_id = member.id
        for k, v in kwargs.items():
            setattr(gm, k, v)
        sess.flush()
        return gm


def delete_group_member(sess, group_member):
    """
    Deletes a group_member.

    We always delete a group membership physically, there is no tagging as
    deleted.

    :param sess: A DB session instance.
    :param group_member: ID, or instance of a group member.
    """
    gm = GroupMember.find(sess, group_member)
    sess.delete(gm)
    sess.flush()
