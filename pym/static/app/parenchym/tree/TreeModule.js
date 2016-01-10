'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

require('angular-sanitize');

var _TreeService = require('./TreeService');

var _TreeService2 = _interopRequireDefault(_TreeService);

var _TreeFilterDirective = require('./TreeFilterDirective');

var _TreeFilterDirective2 = _interopRequireDefault(_TreeFilterDirective);

var _TreeButtonsDirective = require('./TreeButtonsDirective');

var _TreeButtonsDirective2 = _interopRequireDefault(_TreeButtonsDirective);

var _TreeDirective = require('./TreeDirective');

var _TreeDirective2 = _interopRequireDefault(_TreeDirective);

var _TwigDirective = require('./TwigDirective');

var _TwigDirective2 = _interopRequireDefault(_TwigDirective);

var _NodeDirective = require('./NodeDirective');

var _NodeDirective2 = _interopRequireDefault(_NodeDirective);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function config() {}
config.$inject = [];

function run() {
    // TODO put default templates here
}
run.$inject = [];

var _module = _angular2.default.module('pym.tree', ['ngSanitize']).config(config).run(run).service('pym.tree.service', _TreeService2.default.serviceFactory).directive('pymTreeFilter', _TreeFilterDirective2.default.directiveFactory).directive('pymTreeButtons', _TreeButtonsDirective2.default.directiveFactory).directive('pymTree', _TreeDirective2.default.directiveFactory).directive('pymTwig', _TwigDirective2.default.directiveFactory).directive('pymTreeNode', _NodeDirective2.default.directiveFactory);

exports.default = _module;
//# sourceMappingURL=TreeModule.js.map
