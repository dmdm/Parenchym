import angular from 'angular';
import 'angular-sanitize';
import TreeService from './TreeService';
import TreeFilterDirective from './TreeFilterDirective';
import TreeButtonsDirective from './TreeButtonsDirective';
import TreeDirective from './TreeDirective';
import TwigDirective from './TwigDirective';
import NodeDirective from './NodeDirective';


function config() {
}
config.$inject = [];


function run() {
    // TODO put default templates here
}
run.$inject = [];


const module = angular.module('pym.tree', ['ngSanitize'])
    .config(config)
    .run(run)

    .service('pym.tree.service', TreeService.serviceFactory)

    .directive('pymTreeFilter', TreeFilterDirective.directiveFactory)
    .directive('pymTreeButtons', TreeButtonsDirective.directiveFactory)
    .directive('pymTree', TreeDirective.directiveFactory)
    .directive('pymTwig', TwigDirective.directiveFactory)
    .directive('pymTreeNode', NodeDirective.directiveFactory);


export default module;
