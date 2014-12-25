<%inherit file="pym:templates/_layouts/sys.mako" />

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
<%block name="meta_title">${_("Profile")}</%block>
<div ng-controller="ProfileCtrl" ng-cloak>
    <div class="row">
        <div class="col-md-10">
            <p>The current user's profile.</p>
        </div>
        <div class="col-md-2">
            <div class="btn-group pull-right" dropdown is-open="ToolsMenu.isOpen">
              <button type="button" class="btn btn-default dropdown-toggle" ng-disabled="ToolsMenu.isDisabled">
                <i class="fa fa-cog text-primary"></i> <span class="caret"></span>
              </button>
              <ul class="dropdown-menu" role="menu">
                <li><a href="#" ng-click="doThis()">${_("Do this")}</a></li>
                <li><a href="#">${_("Do that")}</a></li>
                <li><a href="#">${_("No rest for the wicked")}</a></li>
              </ul>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-md-12">
            <h1>Account</h1>

            <table class="table">
                <colgroup>
                    <col width="200">
                    <col width="*">
                </colgroup>
                <tbody>
                    <tr><th>First Name</th><td>{{model.account.first_name}}</td></tr>
                    <tr><th>Last Name</th><td>{{model.account.last_name}}</td></tr>
                    <tr><th>Display Name</th><td>{{model.account.display_name}}</td></tr>
                    <tr><th>Email</th><td>{{model.account.email}}</td></tr>
                    <tr><th>Principal<br><small>(Login Name)</small></th><td>{{model.account.principal}}</td></tr>
                    <tr><th>Password</th><td>{{model.account.pwd}}</td></tr>
                </tbody>
            </table>

            <h1>General</h1>

            <table class="table">
                <colgroup>
                    <col width="200">
                    <col width="*">
                </colgroup>
                <tbody>
                    <tr><th>Gender</th><td>{{model.profile.gender}}<br><small>(Obtained from G+ profile but of general use.)</small></td></tr>
                    <tr><th>Locale Name</th><td>{{model.profile.locale_name}}<br><small>(Obtained from G+ profile but of general use.)</small></td></tr>
                </tbody>
            </table>

            <h1>Google+</h1>

            <table class="table">
                <colgroup>
                    <col width="200">
                    <col width="*">
                </colgroup>
                <tbody>
                    <tr><th>Picture</th><td><img ng-src="{{model.profile.gplus.picture_url}}" alt="G+ Picture"></td></tr>
                    <tr><th>Profile</th><td><a href="{{model.profile.gplus.profile_url}}">Goto G+ Profile</a></td></tr>
                </tbody>
            </table>

            <h1>Raw Data</h1>
            <pre>{{model.profile|json}}</pre>
        </div>
    </div>
</div>

<script>
require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});

    var ProfileCtrl = PymApp.controller('ProfileCtrl',
            ['$scope', '$http', '$q', '$window', 'RC',
    function ($scope,   $http,   $q,   $window,   RC) {

        $scope.model = {};
        $scope.model.profile = RC.profile;
        $scope.model.account = RC.account;

        /*
         * Tools menu
         */
        $scope.ToolsMenu = {
            isOpen: false,
            isDisabled: false
        };

        $scope.init = function() {
            // NOOP
        };

        /*
         * Run immediately
         */
        $scope.init();
    }]);

    return ProfileCtrl;
});

</script>
