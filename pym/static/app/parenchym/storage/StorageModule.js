'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _StorageService = require('./StorageService');

var _StorageService2 = _interopRequireDefault(_StorageService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function config() {}
config.$inject = [];

function run() {}
run.$inject = [];

var _module = _angular2.default.module('pym.storage', []).config(config).run(run).service('pym.storage.service', _StorageService2.default.serviceFactory);

exports.default = _module;
//# sourceMappingURL=StorageModule.js.map
