'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StickyBreadcrumbsController = function StickyBreadcrumbsController(stickyBreadcrumbsService) {
    _classCallCheck(this, StickyBreadcrumbsController);

    stickyBreadcrumbsService.init();
};

StickyBreadcrumbsController.$inject = ['pym.stickyBreadcrumbsService'];

var StickyBreadcrumbsDirective = function () {
    function StickyBreadcrumbsDirective() {
        _classCallCheck(this, StickyBreadcrumbsDirective);

        this.restrict = 'A';
        this.template = '';
        this.scope = {}; // isolate scope
        this.bindToController = {};
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

    _createClass(StickyBreadcrumbsDirective, null, [{
        key: 'directiveFactory',
        value: function directiveFactory() {
            StickyBreadcrumbsDirective.instance = new StickyBreadcrumbsDirective();
            return StickyBreadcrumbsDirective.instance;
        }
    }]);

    return StickyBreadcrumbsDirective;
}();

StickyBreadcrumbsDirective.directiveFactory.$inject = [];

exports.default = StickyBreadcrumbsDirective;
//# sourceMappingURL=StickyBreadcrumbsDirective.js.map
