<%!
    from pprint import pformat
%>
<%inherit file="pym:templates/layouts/sys.mako" />


<%block name="styles">
${parent.styles()}
<style>
label { width: 6em; display: inline-block; }
</style>
</%block>
<%block name="scripts">
${parent.scripts()}
<script src="https://apis.google.com/js/client.js?onload=handleClientLoad"></script>
</%block>
<%block name="meta_title">Login</%block>
<div>

    <div class="row">
        <div class="col-md-3">
            <h1>Login</h1>
            <p>Login with your registered user name or email address and password.</p>

            <form action="${rc['urls']['login']}" method="post" role="form">
              <input type="hidden" name="referrer" value="${referrer}"/>
              <input type="hidden" name="XSRF_TOKEN" value="${request.session.get_csrf_token()}"/>
              <input id="login" type="text" name="login" value="" autofocus class="form-control" placeholder="user name or email address"/>
              <input id="pwd" type="password" name="pwd" value="" placeholder="password" class="form-control"/>
              <input type="submit" name="submit" value="Log In" class="btn btn-default"/>
            </form>
        </div>
    </div>

</div>
