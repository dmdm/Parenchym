<%inherit file="pym:templates/layouts/default.mako" />

<%block name="styles">
${parent.styles()}
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${title}</%block>

<div class="outer-gutter">
    ${content|n}
</div>
