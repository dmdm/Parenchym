<%!
    from pprint import pformat
%>
<%inherit file="pym:templates/_layouts/sys.mako" />

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
<div ng-controller="OAuthCtrl" ng-cloak>

    <div class="row">
        <div class="col-md-3">
            <h1>Login</h1>
            <p>Login with your registered user name or email address and password or,
            with your Google account.</p>

            <form action="${rc['urls']['login']}" method="post" role="form">
              <input type="hidden" name="referrer" value="${referrer}"/>
              <input type="hidden" name="XSRF_TOKEN" value="${request.session.get_csrf_token()}"/>
              <input id="login" type="text" name="login" value="" autofocus class="form-control" placeholder="user name or email address"/>
              <input id="pwd" type="password" name="pwd" value="" placeholder="password" class="form-control"/>
              <input type="submit" name="submit" value="Log In" class="btn btn-default"/>
            </form>
            <div style="margin-top: 1ex;">
                <span id="signin" ng-show="model.immediateFailed">
                    <span id="myGsignin"></span>
                </span>
            </div>
        </div>
        <div class="col-md-4">
            <h1>Registration</h1>
            <p>If you want to register as a new user, just login with your
            Google account. We detect whether we already know you, in which case
            we just log you in, or not.</p>
            <p>If not, we will create a user account based on the email address
            and name we obtained from Google, and guide you through the remainder
            of the registration process.</p>
            <p><em>You may deselect access to any circles</em>, Parenchym does
            not need this info. (We are using the <code>auth/plus.login</code>
            endpoint which includes circles. Sorry about that.)</p>
        </div>
    </div>

    <div class="outer-gutter">
        <pre>
            ${pformat(oidc_clients['google']['discovered_data'])}
        </pre>
    </div>

</div>

<script>
(function () {
    var po = document.createElement('script');
    po.type = 'text/javascript';
    po.async = true;
    po.src = 'https://apis.google.com/js/client:plusone.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(po, s);
})();

require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});
    PymApp.constant('OIDC_CLIENTS', ${h.json_serializer(oidc_clients)|n});

    var OAuthCtrl = PymApp.controller('OAuthCtrl',
            ['$scope', '$http', '$q', '$window', 'RC', 'OIDC_CLIENTS',
    function ($scope,   $http,   $q,   $window,   RC,   OIDC_CLIENTS) {

        $scope.model = {};
        $scope.model.isSignedIn = false;
        $scope.model.immediateFailed = true;

        $scope.signIn = function(authResult) {
            $scope.$apply(function() {
                $scope.processAuth(authResult);
            });
        };

        $scope.processAuth = function(authResult) {
            $scope.model.immediateFailed = true;
            if ($scope.model.isSignedIn) {
                return 0;
            }
            if (authResult['access_token']) {
                // Remove this key, because Chrome throws an exception "Blocked Frame"
                // see http://stackoverflow.com/a/26207020
                delete authResult['g-oauth-window'];
                // Successfully authorized, create session
                var httpConfig = {},
                    data = {
                        auth_result: authResult,
                        code: authResult.code
                    };
                $scope.model.immediateFailed = false;
                $http.post(RC.urls.connect_gplus, data, httpConfig)
                .then(function (resp) {
                    PYM.growl_ajax_resp(resp.data);
                    if (resp.data.ok) {
                        $scope.model.isSignedIn = true;
                        $window.location.href = resp.data.data
                    }
                    else {
                        return $q.reject();
                    }
                }, function (result) {
                    return $q.reject();
                });
            } else if (authResult['error']) {
                if (authResult['error'] == 'immediate_failed') {
                    $scope.model.immediateFailed = true;
                } else {
                    console.log('Error:' + authResult['error']);
                }
            }
        };

        $scope.renderSignIn = function() {
            console.log('render');
            gapi.signin.render('myGsignin', {
                callback: $scope.signIn,
                clientid: OIDC_CLIENTS.google.clientid,
                requestvisibleactions: OIDC_CLIENTS.google.requestvisibleactions,
                scope: OIDC_CLIENTS.google.scope,
                apppackagename: OIDC_CLIENTS.google.apppackagename,
                theme: OIDC_CLIENTS.google.theme,
                cookiepolicy: OIDC_CLIENTS.google.cookiepolicy,
                accesstype: OIDC_CLIENTS.google.accesstype,
                state: OIDC_CLIENTS.google.state,
                approvalprompt: OIDC_CLIENTS.google.approval_prompt
            });
        };

        $scope.init = function() {
            $scope.renderSignIn();
        };

        $scope.init();
    }]);

    return OAuthCtrl;
});

</script>
