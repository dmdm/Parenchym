'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TreeFilterController = function TreeFilterController() {
    _classCallCheck(this, TreeFilterController);
};

TreeFilterController.$inject = [];

var TreeFilterDirective = function () {
    function TreeFilterDirective() {
        _classCallCheck(this, TreeFilterDirective);

        this.restrict = 'E';
        this.template = '\n            <div class="input-group">\n                <span class="input-group-addon"><i class="fa fa-fw fa-search"></i></span>\n                <input type="text"\n                    ng-model="treeFilterCtrl.filterExpr"\n                    ng-change="treeFilterCtrl.tree.filter(treeFilterCtrl.filterExpr)"\n                    id="{{treeFilterCtrl.inputId}}"\n                    name="{{treeFilterCtrl.inputId}}"\n                    class="{{treeFilterCtrl.inputClass || \'form-control form-control-sm\'}}"\n                    placeholder="{{treeFilterCtrl.placeholder}}">\n            </div>';
        this.scope = {}; // isolate scope
        this.bindToController = {
            inputId: '@',
            inputClass: '@',
            placeholder: '@',
            tree: '=',
            filterExpr: '='
        };
        this.controllerAs = 'treeFilterCtrl';
        this.controller = TreeFilterController;
    }

    //// Must use compile(), because link() does not have access to 'this'.
    //compile(elem, attr) {
    //    return angular.bind(this, this._link);
    //}
    //
    //_link($scope, $elem, $attr, $ctrl) {
    //    // noop
    //}

    _createClass(TreeFilterDirective, null, [{
        key: 'directiveFactory',
        value: function directiveFactory() {
            TreeFilterDirective.instance = new TreeFilterDirective();
            return TreeFilterDirective.instance;
        }
    }]);

    return TreeFilterDirective;
}();

TreeFilterDirective.directiveFactory.$inject = [];

exports.default = TreeFilterDirective;
//# sourceMappingURL=TreeFilterDirective.js.map
