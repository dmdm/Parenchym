import angular from 'angular';
import StorageService from './StorageService';


function config() {
}
config.$inject = [];


function run() {
}
run.$inject = [];


const module = angular.module('pym.storage', [])
    .config(config)
    .run(run)
    .service('pym.storage.service', StorageService.serviceFactory);


export default module;
