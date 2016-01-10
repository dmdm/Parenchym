import angular from 'angular';


class StickyBreadcrumbsController {
    constructor(stickyBreadcrumbsService) {
        stickyBreadcrumbsService.init();
    }
}

StickyBreadcrumbsController.$inject = ['pym.stickyBreadcrumbsService'];


class StickyBreadcrumbsDirective {
    constructor() {
        this.restrict = 'A';
        this.template = '';
        this.scope = {}; // isolate scope
        this.bindToController = {
        };
        this.controllerAs = 'StickyBreadcrumbsCtrl';
        this.controller = StickyBreadcrumbsController;
    }

    //
    //// Must use compile(), because link() does not have access to 'this'.
    //compile(elem, attr) {
    //    return angular.bind(this, this._link);
    //}
    //
    //_link($scope, $elem, $attr, $ctrl) {
    //    // noop
    //}

    static directiveFactory() {
        StickyBreadcrumbsDirective.instance = new StickyBreadcrumbsDirective();
        return StickyBreadcrumbsDirective.instance;
    }
}

StickyBreadcrumbsDirective.directiveFactory.$inject = [];


export default StickyBreadcrumbsDirective;
