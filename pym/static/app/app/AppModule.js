'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _ParenchymModule = require('../parenchym/ParenchymModule');

var _ParenchymModule2 = _interopRequireDefault(_ParenchymModule);

var _GrowlerModule = require('../parenchym/growler/GrowlerModule');

var _GrowlerModule2 = _interopRequireDefault(_GrowlerModule);

var _TreeModule = require('../parenchym/tree/TreeModule');

var _TreeModule2 = _interopRequireDefault(_TreeModule);

var _StorageModule = require('../parenchym/storage/StorageModule');

var _StorageModule2 = _interopRequireDefault(_StorageModule);

var _DialogsModule = require('../parenchym/dialogs/DialogsModule');

var _DialogsModule2 = _interopRequireDefault(_DialogsModule);

var _AuthMgrModule = require('../parenchym/authmgr/AuthMgrModule');

var _AuthMgrModule2 = _interopRequireDefault(_AuthMgrModule);

var _AppService = require('./AppService');

var _AppService2 = _interopRequireDefault(_AppService);

var _AppController = require('./AppController');

var _AppController2 = _interopRequireDefault(_AppController);

var _foo = require('../foo');

var _fooBarDirective = require('../fooBarDirective');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

///**
// * Intercept HTTP errors to growl
// */
//// WTF: Cannot use growler, because growler has a template and template cache needs $http, so angular complains about circular dependency
////function PymHttpErrorInterceptor($q, growler) {
//function PymHttpErrorInterceptor($q, $log) {
//    return {
//        responseError: function (rejection) {
//            //growler.error(rejection.statusText, rejection.status);
//            $log.error(rejection.statusText, rejection.status);
//            return $q.reject(rejection);
//        }
//    };
//}
////PymHttpErrorInterceptor.$inject = ['$q', 'pym.growler.service'];
//PymHttpErrorInterceptor.$inject = ['$q', '$log'];

// Misc


// General


// From Parenchym
function config($provide, $httpProvider, $compileProvider, $locationProvider) {
  //$provide.factory('PymHttpErrorInterceptor', PymHttpErrorInterceptor);
  //$httpProvider.interceptors.push('PymHttpErrorInterceptor');

  /**
   * Re-enable the XMLHttpRequest header
   */
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

  /**
   * Disable debug data
   *
   * Re-enable in a debug console with:
   *
   *     angular.reloadWithDebugInfo();
   *
   * See https://docs.angularjs.org/guide/production
   */
  // WTF: Need debug info because of ui-tree: https://github.com/angular-ui-tree/angular-ui-tree/issues/403
  //$compileProvider.debugInfoEnabled(false);

  // NO ! HTML5 Routing
  $locationProvider.html5Mode(false).hashPrefix('!');
}
config.$inject = ['$provide', '$httpProvider', '$compileProvider', '$locationProvider'];

function run($templateCache) {}
run.$inject = ['$templateCache'];

var _module = _angular2.default.module('app', [_GrowlerModule2.default.name, _ParenchymModule2.default.name, _TreeModule2.default.name, _StorageModule2.default.name, _DialogsModule2.default.name, _AuthMgrModule2.default.name]).config(config).run(run).service('app.AppService', _AppService2.default.serviceFactory).controller('app.AppController', _AppController2.default).controller('FooController', _foo.FooController).directive('fooBar', _fooBarDirective.FooBarDirective.directiveFactory);

exports.default = _module;
//# sourceMappingURL=AppModule.js.map
