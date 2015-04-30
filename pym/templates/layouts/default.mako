<%namespace name="pym" file="pym:templates/lib/pym.mako" inheritable="True"/>

<!DOCTYPE html>
<html class="no-js">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <meta name="viewport" content="width=device-width">
          <title><%block name="meta_title">${request.registry.settings['project.title']}
            % if 'project.subtitle' in request.registry.settings:
                <small>${request.registry.settings['project.subtitle']}</small>
            % endif
        </%block></title>
        <meta name="description" content="<%block name="meta_descr">${request.registry.settings['project.description']}</%block>">
        <meta name="keywords"    content="<%block name="meta_keywords">${request.registry.settings['project.keywords']}</%block>">
        <meta name="author"      content="<%block name="meta_author">${request.registry.settings['project.author']}</%block>">
        <%block name="styles">
            <link rel="stylesheet" href="${request.static_url('pym:static/css/styles.css')}">
            <link rel="stylesheet" href="${request.static_url('pym:static/css/styles2.css')}">
            % if request.registry.settings['environment'] != 'production':
                <link rel="stylesheet" href="${request.static_url('pym:static/css/styles-' + request.registry.settings['environment'] + '.css')}">
            % endif
        </%block>
        <script>
        <%block name="require_config">
            ## List the minimal libs that require has to load
            ## Mind to include those that PymApp.config initialises!
            var PYM_APP_REQUIREMENTS = ['ng', 'angular-moment', 'ng-ui-bs', 'ui-select', 'pnotify', 'pnotify.buttons', 'pnotify.confirm', 'pnotify.history', 'pnotify.callbacks'];
            ## List the minimal libs that anular has to inject.
            ## Mind to include those that PymApp.config initialises!
            var PYM_APP_INJECTS = ['angularMoment', 'ui.bootstrap', 'ui.select', 'ngSanitize'];
            <%include file="_require_config.mako" args="parent=self" />
        </%block>
        </script>
        <%block name="scripts">
            <script src="${request.static_url('pym:static/vendor/requirejs/require.min.js')}"></script>
        </%block>
    </head>
    <body ng-controller="PageCtrl">
        <!--[if lt IE 10]>
            <p class="chromeframe">You are using an outdated browser. <a href="http://browsehappy.com/">Upgrade your browser today</a> or <a href="http://www.google.com/chromeframe/?redirect=true">install Google Chrome Frame</a> to better experience this site.</p>
        <![endif]-->

        <div id="page_container"><!-- BEGIN #page_container -->

            <%include file="pym:templates/layouts/page_header.mako" args="parent=self, pym=pym, render_flash=False" />

            <div id="page_content"><!-- BEGIN #page_content -->
                  ${next.body()}
            </div><!-- END #page_content -->

        </div><!-- END #page_container -->
##      Needed to growl the flash messages from server
        <div ng-controller="GrowlCtrl as gr"></div>
        <%include file="pym:templates/layouts/page_footer.mako" />
        <script>
        require(['ng',     'pym/app'],
        function (angular,  PymApp) {
            'use strict';

            var PageCtrl = PymApp.controller('PageCtrl',
                    ['$scope', '$http',
            function ($scope,   $http) {
                $scope.model = $scope.model || {};
                // if lastRefresh is set, the breadcrumb line will have this
                // message to the right. lastRefresh must be a JavaScript Date.
                $scope.model.lastRefresh = null;
                $scope.model.lastRefreshMsg = null;

                $scope.MainMenu = {
                    items: {},
                    activeItem: null,
                    loadItems: function () {
                        var self = this;
                        $http.get('/xhr_main_menu', {})
                            .success(function(data, status, headers, config) {
                                self.items = data.data;
                            });
                    },
                    init: function () {
                        this.loadItems();
                    }
                };

                $scope.MainMenu.init();
            }]);
        });

        require(['requirejs/domReady!', 'ng',    'pym/app'],
        function( doc,                   angular, PymApp) {
            var GrowlCtrl = PymApp.controller('GrowlCtrl', ['pymService', function (pym) {
                ${pym.growl_flash()}
            }]);
        });
        </script>
    </body>
</html>
