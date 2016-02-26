'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

require('angular-ui-grid');

require('angular-ui-grid/ui-grid.min.css!');

var _AuthMgrService = require('./AuthMgrService');

var _AuthMgrService2 = _interopRequireDefault(_AuthMgrService);

var _GroupMgrController = require('./GroupMgrController');

var _GroupMgrController2 = _interopRequireDefault(_GroupMgrController);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function config() {}
config.$inject = [];

function run($templateCache) {}
run.$inject = ['$templateCache'];

var _module = _angular2.default.module('pym.authmgr', ['ui.grid']).config(config).run(run).service('pym.authmgr.service', _AuthMgrService2.default.serviceFactory).controller('pym.authmgr.groupMgrController', _GroupMgrController2.default);

exports.default = _module;
//# sourceMappingURL=AuthMgrModule.js.map
