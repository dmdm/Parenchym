'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NodeController = function NodeController() {
    _classCallCheck(this, NodeController);
};

NodeController.$inject = [];

var NodeDirective = function () {
    function NodeDirective() {
        _classCallCheck(this, NodeDirective);

        this.restrict = 'EA';
        this.template = '\n            <li id="{{nodeCtrl.node.id}}" class="pym-node">\n                <div class="expand-collapse-button" ng-click="nodeCtrl.node.toggle()" ng-bind-html="nodeCtrl.node.expandCollapseButton() | trusted"></div>\n                <span ng-class="{selected:nodeCtrl.node.selected, \'pym-node-text\':true}" ng-click="nodeCtrl.node.toggleSelection()" ng-bind-html="nodeCtrl.node.text | trusted"></span>\n                <pym-twig ng-if="nodeCtrl.node.expanded" data-nodes="nodeCtrl.node.children"></pym-twig>\n            </li>';
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

    _createClass(NodeDirective, null, [{
        key: 'directiveFactory',
        value: function directiveFactory() {
            NodeDirective.instance = new NodeDirective();
            return NodeDirective.instance;
        }
    }]);

    return NodeDirective;
}();

NodeDirective.directiveFactory.$inject = [];

exports.default = NodeDirective;
//# sourceMappingURL=NodeDirective.js.map
