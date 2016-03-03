'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _MeService = require('./MeService');

var _MeService2 = _interopRequireDefault(_MeService);

var _MeController = require('./MeController');

var _MeController2 = _interopRequireDefault(_MeController);

var _ProfileController = require('./ProfileController');

var _ProfileController2 = _interopRequireDefault(_ProfileController);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function config() {}
config.$inject = [];

function run($templateCache) {}
run.$inject = ['$templateCache'];

var _module = _angular2.default.module('pym.me', []).config(config).run(run).service('pym.me.service', _MeService2.default.serviceFactory).controller('pym.me.meController', _MeController2.default).controller('pym.me.profileController', _ProfileController2.default);

exports.default = _module;
//# sourceMappingURL=MeModule.js.map
