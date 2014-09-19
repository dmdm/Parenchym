define(PYM_APP_REQUIREMENTS,
           // ng,      pym/pym
    function (angular, PYM) {
    'use strict';

    var PymApp = angular.module('PymApp', PYM_APP_INJECTS);


    PymApp.config(
      [
                '$httpProvider', '$provide',
        function($httpProvider,   $provide) {
            $provide.factory('PymHttpErrorInterceptor',
              [
                        '$q',
                function($q) {
                    return {
                        responseError: function(rejection) {
                            PYM.growl({'kind': 'error', 'title': rejection.status, 'text': rejection.statusText});
                            return $q.reject(rejection);
                        }
                    };
                }
              ]
            );
          $httpProvider.interceptors.push('PymHttpErrorInterceptor');
          $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        }
      ]
    );


    return PymApp;
});