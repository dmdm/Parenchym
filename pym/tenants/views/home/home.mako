<%inherit file="pym:templates/layouts/default.mako" />
<%block name="meta_title">Welcome</%block>
<%block name="styles">
${parent.styles()}
</%block>

##<div class="outer-gutter" ng-controller="pageController as pg">
<div class="outer-gutter">

  <p>Welcome to tenant ${request.context.title}.</p>

##    <p><button ng-click="pg.success()">Success</button></p>
##    <p><button ng-click="pg.error()">Error</button></p>
##    <p><button ng-click="pg.info()">Info</button></p>
##    <p><button ng-click="pg.notice()">Notice</button></p>
##    <p><button ng-click="pg.warn()">Warn</button></p>
##    <p><button ng-click="pg.generic()">Generic</button></p>
##    <p><button ng-click="pg.doh()">doh</button></p>

</div>

##<script>
##require(['requirejs/domReady!', 'ng',     'pym/app'],
##function( doc,                   angular,  PymApp) {
##
##
##PymApp.controller('pageController',
##        ['$scope', 'pymService', '$log', '$http',
##function ($scope,   pym,   $log, $http) {
##
##    "use strict";
##
##
##    var ctrl = this;
##
##    ctrl.success = function () {
##        pym.growler.success('Yeah, that was good!');
##    };
##    ctrl.error = function () {
##        pym.growler.error('Bollocks!');
##    };
##    ctrl.notice = function () {
##        pym.growler.notice('Note me!');
##    };
##    ctrl.info = function () {
##        pym.growler.info('Schpäter als du denkss!');
##    };
##    ctrl.warn = function () {
##        pym.growler.warn('Das Haus steht schief!');
##    };
##    ctrl.generic = function() {
##
##        // This is a sample using the generic PNotify object
##        pym.growler.growl({
##            title: 'The notice title.',
##            title_escape: false,
##            text: 'The notice text. <h3>IMP</h3>',
##            text_escape: false,
##            styling: 'fontawesome',
##            type: 'notice',
##            icon: true,
##            buttons: {
##                closer:true
##            }
##        });
##
##    };
##    ctrl.doh = function () {
##        $http.get('/foo');
##    };
##
##
##}]);
##});
##</script>
