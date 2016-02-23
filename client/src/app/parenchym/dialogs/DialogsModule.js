import angular from 'angular';
import 'angular-bootstrap';
import DialogsService from './DialogsService';


function cacheAlertTpl($templateCache) {
    $templateCache.put(
        'pym/dialogs/alert.html',
        `<div class="modal-header">
            <h4 class="modal-title">
                <span ng-switch on="vm.kind">
                    <i ng-switch-default class="fa fa-exclamation-circle text-primary"></i>
                    <i ng-switch-when="info" class="fa fa-info-circle text-info"></i>
                </span>
                <span ng-bind-html="vm.title"></span>
            </h4>
        </div>
        <div class="modal-body">
            <div ng-if="! vm.bodyUrl" class="modal-body" ng-bind-html="vm.body"></div>
            <ng-include ng-if="vm.bodyUrl" src="vm.bodyUrl"></ng-include>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" type="button" ng-click="vm.actionOk()">{{vm.actionOkCaption}}</button>
        </div>`
    );
}


function cacheConfirmTpl($templateCache) {
    $templateCache.put(
        'pym/dialogs/confirm.html',
        `<div class="modal-header">
            <h4 class="modal-title"><i class="fa fa-question-circle text-primary"></i><span ng-bind-html="vm.title"></span></h4>
        </div>
        <div class="modal-body" ng-bind-html="vm.body"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" type="button" ng-click="vm.actionCancel()">{{vm.actionCancelCaption}}</button>
            <button class="btn btn-primary" type="button" ng-click="vm.actionOk()">{{vm.actionOkCaption}}</button>
        </div>`
    );
}


function cacheDialogTpl($templateCache) {
    $templateCache.put(
        'pym/dialogs/dialog.html',
        `<div class="modal-header">
            <h4 class="modal-title" ng-bind-html="vm.title"></h4>
        </div>
        <div class="modal-body" ng-bind-html="vm.body"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" type="button" ng-click="vm.actionCancel()">{{vm.actionCancelCaption}}</button>
            <button class="btn btn-primary" type="button" ng-click="vm.actionOk()">{{vm.actionOkCaption}}</button>
        </div>`
    );
}


function config() {
}
config.$inject = [];


function run($templateCache) {
    cacheAlertTpl($templateCache);
    cacheConfirmTpl($templateCache);
    cacheDialogTpl($templateCache);
}
run.$inject = ['$templateCache'];


const module = angular.module('pym.dialogs', ['ui.bootstrap'])
    .config(config)
    .run(run)
    .service('pym.dialogs.service', DialogsService.serviceFactory);


export default module;
