'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

require('angular-bootstrap');

var _DialogsService = require('./DialogsService');

var _DialogsService2 = _interopRequireDefault(_DialogsService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function cacheAlertTpl($templateCache) {
    $templateCache.put('pym/dialogs/alert.html', '<div class="modal-header">\n            <h4 class="modal-title">\n                <span ng-switch on="vm.kind">\n                    <i ng-switch-default class="fa fa-exclamation-circle text-primary"></i>\n                    <i ng-switch-when="info" class="fa fa-info-circle text-info"></i>\n                </span>\n                <span ng-bind-html="vm.title"></span>\n            </h4>\n        </div>\n        <div class="modal-body">\n            <div ng-if="! vm.bodyUrl" class="modal-body" ng-bind-html="vm.body"></div>\n            <ng-include ng-if="vm.bodyUrl" src="vm.bodyUrl"></ng-include>\n        </div>\n        <div class="modal-footer">\n            <button class="btn btn-primary" type="button" ng-click="vm.actionOk()">{{vm.actionOkCaption}}</button>\n        </div>');
}

function cacheConfirmTpl($templateCache) {
    $templateCache.put('pym/dialogs/confirm.html', '<div class="modal-header">\n            <h4 class="modal-title"><i class="fa fa-question-circle text-primary"></i><span ng-bind-html="vm.title"></span></h4>\n        </div>\n        <div class="modal-body" ng-bind-html="vm.body"></div>\n        <div class="modal-footer">\n            <button class="btn btn-secondary" type="button" ng-click="vm.actionCancel()">{{vm.actionCancelCaption}}</button>\n            <button class="btn btn-primary" type="button" ng-click="vm.actionOk()">{{vm.actionOkCaption}}</button>\n        </div>');
}

function cacheDialogTpl($templateCache) {
    $templateCache.put('pym/dialogs/dialog.html', '<div class="modal-header">\n            <h4 class="modal-title" ng-bind-html="vm.title"></h4>\n        </div>\n        <div class="modal-body" ng-bind-html="vm.body"></div>\n        <div class="modal-footer">\n            <button class="btn btn-secondary" type="button" ng-click="vm.actionCancel()">{{vm.actionCancelCaption}}</button>\n            <button class="btn btn-primary" type="button" ng-click="vm.actionOk()">{{vm.actionOkCaption}}</button>\n        </div>');
}

function config() {}
config.$inject = [];

function run($templateCache) {
    cacheAlertTpl($templateCache);
    cacheConfirmTpl($templateCache);
    cacheDialogTpl($templateCache);
}
run.$inject = ['$templateCache'];

var _module = _angular2.default.module('pym.dialogs', ['ui.bootstrap']).config(config).run(run).service('pym.dialogs.service', _DialogsService2.default.serviceFactory);

exports.default = _module;
//# sourceMappingURL=DialogsModule.js.map
