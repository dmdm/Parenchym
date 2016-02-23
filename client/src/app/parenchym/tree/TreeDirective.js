import angular from 'angular';


class TreeController {
    constructor(treeService) {
        if (! this.tree) {
            this.tree = treeService.getTree(this.id, this.rc, this.data);
        }
    }
}

TreeController.$inject = ['pym.tree.service'];


class TreeDirective {
    constructor() {
        this.restrict = 'EA';
        this.template = `
            <div id="{{treeCtrl.tree.id}}" class="pym-tree">
                <pym-twig ng-if="treeCtrl.tree.hasNodes" data-nodes="treeCtrl.tree.nodes" data-is-root="true"></pym-twig>
            </div>`;
        this.scope = {}; // isolate scope
        this.bindToController = {
            id: '@',
            rc: '=',
            tree: '=',
            data: '='
        };
        this.controllerAs = 'treeCtrl';
        this.controller = TreeController;
    }

    //// Must use compile(), because link() does not have access to 'this'.
    //compile(elem, attr) {
    //    return angular.bind(this, this._link);
    //}
    //
    //_link($scope, $elem, $attr, $ctrl) {
    //    // noop
    //}

    static directiveFactory(...all) {
        TreeDirective.instance = new TreeDirective(...all);
        return TreeDirective.instance;
    }
}

TreeDirective.directiveFactory.$inject = [];


export default TreeDirective;
