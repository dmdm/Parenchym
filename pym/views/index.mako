<%inherit file="pym:templates/_layouts/default.mako" />
<%block name="styles">
${parent.styles()}
</%block>

<div class="outer-gutter">

<p>To do things, you need to login.</p>

<p>The main menu is behind the <i class="fa fa-bars ccp-red"></i>.</p>

<p><em>Nota bene:</em> Supplementing the login method asking for the
traditional credentials login name and password, we support using Google+.
Should it be that you are already logged in to Google when visiting our
login page, the embedded Google+ button recognizes that and we automatically
log you in (or register you) here.</p>

</div>
