import angular from 'angular';
import MeService from './MeService';
import MeController from './MeController';
import ProfileController from './ProfileController';


function config() {
}
config.$inject = [];


function run($templateCache) {
}
run.$inject = ['$templateCache'];


const module = angular.module('pym.me', [])
    .config(config)
    .run(run)
    .service('pym.me.service', MeService.serviceFactory)
    .controller('pym.me.meController', MeController)
    .controller('pym.me.profileController', ProfileController);

export default module;
