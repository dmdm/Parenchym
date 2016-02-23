'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TwigController = function TwigController() {
    _classCallCheck(this, TwigController);
};

TwigController.$inject = [];

var TwigDirective = function () {
    function TwigDirective(recursionHelper) {
        _classCallCheck(this, TwigDirective);

        this._recursionHelper = recursionHelper;
        this.restrict = 'EA';
        this.template = '\n            <ul ng-class="{root: twigCtrl.isRoot, \'pym-twig\': true}">\n                <pym-tree-node ng-repeat="n in twigCtrl.nodes track by n.id" data-node="n"></pym-tree-node>\n            </ul>';
        this.scope = {}; // isolate scope
        this.bindToController = {
            nodes: '=',
            isRoot: '='
        };
        this.controllerAs = 'twigCtrl';
        this.controller = TwigController;
    }

    _createClass(TwigDirective, [{
        key: 'compile',
        value: function compile(elem) {
            return this._recursionHelper.compile(elem);
        }
    }], [{
        key: 'directiveFactory',
        value: function directiveFactory(recursionHelper) {
            TwigDirective.instance = new TwigDirective(recursionHelper);
            return TwigDirective.instance;
        }
    }]);

    return TwigDirective;
}();

TwigDirective.directiveFactory.$inject = ['pym.recursionHelper'];

exports.default = TwigDirective;
//# sourceMappingURL=TwigDirective.js.map
