import angular from 'angular';
import StickyBreadcrumbsService from './StickyBreadcrumbsService';
import RecursionHelper from './RecursionHelper';
import StickyBreadcrumbsDirective from './StickyBreadcrumbsDirective';
import ParenchymController from './ParenchymController';
import { trustedFilter } from './filter';

function config() {
}
config.$inject = [];


function run() {
}
run.$inject = [];


const module = angular.module('pym', [])
    .config(config)
    .run(run)
    .service('pym.stickyBreadcrumbsService', StickyBreadcrumbsService.serviceFactory)
    .service('pym.recursionHelper', RecursionHelper.serviceFactory)
    .controller('pym.controller', ParenchymController)
    .directive('pymStickyBreadcrumbs', StickyBreadcrumbsDirective.directiveFactory)
    .filter('trusted', trustedFilter);

export default module;
