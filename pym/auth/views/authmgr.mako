<%inherit file="pym:templates/layouts/default.mako" />
<%block name="meta_title">Manage Authentication</%block>
<%block name="styles">
${parent.styles()}
</%block>

<div class="outer-gutter">
    <p>Welcome to Authentication Manager.</p>

    <ul>
        <li><a href="${request.resource_url(request.context, 'group_mgr')}">Groups</a></li>
    </ul>

</div>
