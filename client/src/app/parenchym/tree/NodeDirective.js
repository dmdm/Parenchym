import angular from 'angular';


class NodeController {
    constructor() {
    }
}

NodeController.$inject = [];


class NodeDirective {
    constructor() {
        this.restrict = 'EA';
        this.template = `
            <li id="{{nodeCtrl.node.id}}" class="pym-node">
                <div class="expand-collapse-button" ng-click="nodeCtrl.node.toggle()" ng-bind-html="nodeCtrl.node.expandCollapseButton() | trusted"></div>
                <span ng-class="{selected:nodeCtrl.node.selected, 'pym-node-text':true}" ng-click="nodeCtrl.node.toggleSelection()" ng-bind-html="nodeCtrl.node.text | trusted"></span>
                <pym-twig ng-if="nodeCtrl.node.expanded" data-nodes="nodeCtrl.node.children"></pym-twig>
            </li>`;
        this.scope = {}; // isolate scope
        this.bindToController = {
            node: '='
        };
        this.controllerAs = 'nodeCtrl';
        this.controller = NodeController;
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
        NodeDirective.instance = new NodeDirective();
        return NodeDirective.instance;
    }
}

NodeDirective.directiveFactory.$inject = [];


export default NodeDirective;
