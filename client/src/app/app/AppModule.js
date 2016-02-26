import angular from 'angular';

// From Parenchym
import PymModule from '../parenchym/ParenchymModule';
import PymGrowlerModule from '../parenchym/growler/GrowlerModule';
import PymTreeModule from '../parenchym/tree/TreeModule';
import PymStorageModule from '../parenchym/storage/StorageModule';
import PymDialogsModule from '../parenchym/dialogs/DialogsModule';
import PymAuthMgrModule from '../parenchym/authmgr/AuthMgrModule';

// General
import AppService from './AppService';
import AppController from './AppController';

// Misc
import { FooController } from '../foo';
import { FooBarDirective } from '../fooBarDirective';


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


function run($templateCache) {
}
run.$inject = ['$templateCache'];


const module = angular.module('app', [
        PymGrowlerModule.name,
        PymModule.name,
        PymTreeModule.name,
        PymStorageModule.name,
        PymDialogsModule.name,
        PymAuthMgrModule.name
    ])
    .config(config)
    .run(run)

    .service('app.AppService', AppService.serviceFactory)
    .controller('app.AppController', AppController)

    .controller('FooController', FooController)
    .directive('fooBar', FooBarDirective.directiveFactory)
    ;


export default module;
