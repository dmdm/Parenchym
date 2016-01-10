//import 'babel-runtime';
import angular from 'angular';
import AppModule from './AppModule';
import $ from 'jquery';

angular.element(document).ready(function() {
    // needs global var XSRF_TOKEN !
    $.ajaxSetup({headers: {'X-XSRF-TOKEN': XSRF_TOKEN}});
    angular.bootstrap(document, [AppModule.name], {
        strictDi: true
    });
});
