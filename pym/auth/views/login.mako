<%inherit file="pym:templates/layouts/sys.mako" />
<%block name="meta_title">Login</%block>
<div>
    <div style="width:300px; margin: 50px auto 0;">
        <p>Login with your registered user name or email address and password.</p>
        <form class="form" action="${rc['urls']['login']}" method="post" role="form">
            <input type="hidden" name="referrer" value="${referrer}"/>
            <input type="hidden" name="XSRF_TOKEN" value="${request.session.get_csrf_token()}"/>
            <input id="login" type="text" name="login" value="" autofocus class="form-control" placeholder="user name or email address"/>
            <input id="pwd" type="password" name="pwd" value="" placeholder="password" class="form-control"/>
            <input type="submit" name="submit" value="Log In" class="btn btn-primary pull-right"/>
        </form>
    </div>
</div>
