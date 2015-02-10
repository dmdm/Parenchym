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
<%block name="meta_title">${_("Me")}</%block>
<div ng-controller="MeCtrl" ng-cloak>
    <div class="row">
        <div class="col-md-10">
            <p>Here can the personal dashboard be built.</p>
            <p>See the Tools Menu on the right for more functionality.</p>
            <p>a</p>
            <p>b</p>
            <p>c</p>
            <p>d</p>
            <p>e</p>
            <p>foo</p>
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
</div>

<script>
require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});

    var MeCtrl = PymApp.controller('MeCtrl',
            ['$scope', '$http', '$q', '$window', 'RC',
    function ($scope,   $http,   $q,   $window,   RC) {

        $scope.model = $scope.model || {};

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

    return MeCtrl;
});

</script>
