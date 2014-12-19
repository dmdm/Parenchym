<%inherit file="pym:templates/_layouts/default.mako" />
<%block name="meta_title">Welcome</%block>
<%block name="styles">
${parent.styles()}
</%block>

<div class="outer-gutter">

  <p>Welcome to tenant ${request.context.title}.</p>

</div>
