import angular from 'angular';
import 'angular-ui-grid';
import 'angular-ui-grid/ui-grid.min.css!';
import AuthMgrService from './AuthMgrService';
import GroupMgrController from './GroupMgrController';


function config() {
}
config.$inject = [];


function run($templateCache) {
}
run.$inject = ['$templateCache'];


const module = angular.module('pym.authmgr', ['ui.grid'])
    .config(config)
    .run(run)
    .service('pym.authmgr.service', AuthMgrService.serviceFactory)
    .controller('pym.authmgr.groupMgrController', GroupMgrController);


export default module;
