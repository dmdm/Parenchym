import angular from 'angular';
import 'angular-animate';
import 'angular-toastr';
import GrowlerService from './GrowlerService';
import GrowlFlashDirective from './GrowlFlashDirective';


function cacheToastrTpl($templateCache) {
    "use strict";
    $templateCache.put(
        'directives/toastr/toast.html',
        `<div class="alert {{toastClass}} {{toastType}}" ng-click="tapToast()">
            <div style="display: table-row;">
                <div class="fa fa-fw {{toastType}}-icon" style="display: table-cell; padding-right: 0.75rem;"></div>
                <div style="display: table-cell;">
                    <div ng-switch on="allowHtml" style="display: table-cell;">
                        <div ng-switch-default ng-if="title" class="{{titleClass}}" aria-label="{{title}}">{{title}}</div>
                        <div ng-switch-default class="{{messageClass}}" aria-label="{{message}}">{{message}}</div>
                        <div ng-switch-when="true" ng-if="title" class="{{titleClass}}" aria-label="{{title}}" ng-bind-html="title"></div>
                        <div ng-switch-when="true" class="{{messageClass}}" ng-bind-html="message"></div>
                    </div>
                    <progress-bar ng-if="progressBar"></progress-bar>
                </div>
            </div>
        </div>`
    );
}

function cacheToastrProgressTpl($templateCache) {
    "use strict";
    $templateCache.put(
        'directives/toastr/progressbar.html',
        `<div class="toast-progress"></div>`
    );
}

function configureToastr(toastrConfig) {
    "use strict";
    angular.extend(
        toastrConfig, {
            autoDismiss: false,
            containerId: 'toast-container',
            maxOpened: 0,
            newestOnTop: true,
            positionClass: 'toast-top-right',
            preventDuplicates: false,
            preventOpenDuplicates: false,
            target: 'body',

            allowHtml: true,
            closeButton: false,
            closeHtml: '<button class="fa fa-close"></button>',
            extendedTimeOut: 1000,
            iconClasses: {
                error: 'toast-error',
                info: 'toast-info',
                success: 'toast-success',
                warning: 'toast-warning'
            },
            messageClass: 'toast-message',
            onHidden: null,
            onShown: null,
            onTap: null,
            progressBar: false,
            tapToDismiss: true,
            templates: {
                toast: 'directives/toastr/toast.html',
                progressbar: 'directives/toastr/progressbar.html'
            },
            timeOut: 8000,
            titleClass: 'toast-title',
            toastClass: 'toast'
        }
    );
}


function config(toastrConfig) {
    configureToastr(toastrConfig);
}
config.$inject = ['toastrConfig'];


function run($templateCache) {
    cacheToastrTpl($templateCache);
    cacheToastrProgressTpl($templateCache);
}
run.$inject = ['$templateCache'];


const module = angular.module('pym.growler', ['ngAnimate', 'toastr'])
    .config(config)
    .run(run)
    .directive('pymGrowlFlash', GrowlFlashDirective.directiveFactory)
    .service('pym.growler.service', GrowlerService.serviceFactory);


export default module;
