<%inherit file="pym:templates/layouts/default.mako" />
<%!
    from pym.auth.helper import linkto_auth
    from pym.sys.helper import linkto_sys
%>
<%block name="meta_title">${_("System")}</%block>
<div>
    <div class="row">
        <div class="col-md-4">
            <h2>Authentication</h2>
            <ul>
                <li><a href="${linkto_auth(request, 'user_mgr')}">Users</a></li>
                <li><a href="${linkto_auth(request, 'group_mgr')}">Groups</a></li>
                <li><a href="${linkto_auth(request, 'group_member_mgr')}">Group Members</a></li>
                <li><a href="${linkto_auth(request, 'permission_mgr')}">Permissions</a></li>
            </ul>
        </div>
        <div class="col-md-4">
            <h2>Miscellaneous</h2>
            <ul>
                <li><a href="${linkto_sys(request, 'cache_mgmt')}">Cache Management</a></li>
            </ul>
        </div>
        <div class="col-md-4">
        </div>
    </div>
</div>
