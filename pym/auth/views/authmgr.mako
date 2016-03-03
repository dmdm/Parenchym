<%inherit file="pym:templates/layouts/default.mako" />
<%!
    from pym.auth.helper import linkto_auth
%>
<%block name="meta_title">Authentication Manager</%block>
<div class="outer-gutter">
    <p>Welcome to Authentication Manager.</p>
    <ul>
        <li><a href="${linkto_auth(request, 'user_mgr')}">Users</a></li>
        <li><a href="${linkto_auth(request, 'group_mgr')}">Groups</a></li>
        <li><a href="${linkto_auth(request, 'group_member_mgr')}">Group Members</a></li>
        <li><a href="${linkto_auth(request, 'permission_mgr')}">Permissions</a></li>
    </ul>
</div>
