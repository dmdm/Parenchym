'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TreeButtonsController = function TreeButtonsController() {
    _classCallCheck(this, TreeButtonsController);
};

TreeButtonsController.$inject = [];

var TreeButtonsDirective = function () {
    function TreeButtonsDirective() {
        _classCallCheck(this, TreeButtonsDirective);

        this.restrict = 'E';
        this.template = '\n            <div style="display: table-row;">\n                <div style="display: table-cell; vertical-align: middle;">\n                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.expandAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || \'Expand All\'}}">    <i class="fa fa-fw fa-code-fork fa-rotate-90"></i></a>\n                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.collapseAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || \'Collapse All\'}}"><i class="fa fa-fw fa-code-fork fa-rotate-270"></i></a>\n                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.selectAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || \'Select All\'}}">    <i class="fa fa-fw fa-adjust"></i></a>\n                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.unselectAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || \'Select None\'}}"> <i class="fa fa-fw fa-adjust fa-flip-horizontal"></i></a>\n                </div>\n                <div style="display: table-cell; padding-left: 5px;">\n                    <div class="input-group">\n                        <span class="input-group-addon"><i class="fa fa-fw fa-search"></i></span>\n                        <input type="text"\n                            ng-model="treeButtonsCtrl.filterExpr"\n                            ng-change="treeButtonsCtrl.tree.filter(treeButtonsCtrl.filterExpr)"\n                            id="{{treeButtonsCtrl.inputId}}"\n                            name="{{treeButtonsCtrl.inputId}}"\n                            class="{{treeButtonsCtrl.inputClass || \'form-control form-control-sm\'}}"\n                            style="width: 200px;"\n                            placeholder="{{treeButtonsCtrl.placeholder}}">\n                    </div>\n                </div>\n            </div>\n                    ';
        this.scope = {}; // isolate scope
        this.bindToController = {
            tree: '=',
            rc: '=',
            inputId: '@',
            inputClass: '@',
            placeholder: '@',
            filterExpr: '='
        };
        this.controllerAs = 'treeButtonsCtrl';
        this.controller = TreeButtonsController;
    }

    //// Must use compile(), because link() does not have access to 'this'.
    //compile(elem, attr) {
    //    return angular.bind(this, this._link);
    //}
    //
    //_link($scope, $elem, $attr, $ctrl) {
    //    // noop
    //}

    _createClass(TreeButtonsDirective, null, [{
        key: 'directiveFactory',
        value: function directiveFactory() {
            TreeButtonsDirective.instance = new TreeButtonsDirective();
            return TreeButtonsDirective.instance;
        }
    }]);

    return TreeButtonsDirective;
}();

TreeButtonsDirective.directiveFactory.$inject = [];

exports.default = TreeButtonsDirective;
//# sourceMappingURL=TreeButtonsDirective.js.map
