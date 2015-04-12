<%inherit file="pym:templates/layouts/default.mako" />

<%block name="styles">
${parent.styles()}
</%block>
<%block name="require_config">
	${parent.require_config()}
    PYM_APP_REQUIREMENTS.push(
        'ng-ui-bs'
    );
    PYM_APP_INJECTS.push('ui.bootstrap');
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Help")}</%block>

<div class="outer-gutter">
    ${content|n}
</div>
