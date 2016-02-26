<%inherit file="pym:templates/layouts/default.mako" />
<%block name="meta_title">Manage Groups</%block>
<%block name="styles">
    ${parent.styles()}
</%block>

<div class="outer-gutter">

    <p>Welcome to Group Manager.</p>

    <div ng-controller="pym.authmgr.groupMgrController as vm">
        <div ui-grid="{ data: vm.myData }" class="myGrid"></div>
    </div>


</div>
