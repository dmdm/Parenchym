'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TreeController = function TreeController(treeService) {
    _classCallCheck(this, TreeController);

    if (!this.tree) {
        this.tree = treeService.getTree(this.id, this.rc, this.data);
    }
};

TreeController.$inject = ['pym.tree.service'];

var TreeDirective = function () {
    function TreeDirective() {
        _classCallCheck(this, TreeDirective);

        this.restrict = 'EA';
        this.template = '\n            <div id="{{treeCtrl.tree.id}}" class="pym-tree">\n                <pym-twig ng-if="treeCtrl.tree.hasNodes" data-nodes="treeCtrl.tree.nodes" data-is-root="true"></pym-twig>\n            </div>';
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

    _createClass(TreeDirective, null, [{
        key: 'directiveFactory',
        value: function directiveFactory() {
            for (var _len = arguments.length, all = Array(_len), _key = 0; _key < _len; _key++) {
                all[_key] = arguments[_key];
            }

            TreeDirective.instance = new (Function.prototype.bind.apply(TreeDirective, [null].concat(all)))();
            return TreeDirective.instance;
        }
    }]);

    return TreeDirective;
}();

TreeDirective.directiveFactory.$inject = [];

exports.default = TreeDirective;
//# sourceMappingURL=TreeDirective.js.map
