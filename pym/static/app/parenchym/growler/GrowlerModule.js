'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

require('angular-animate');

require('angular-toastr');

var _GrowlerService = require('./GrowlerService');

var _GrowlerService2 = _interopRequireDefault(_GrowlerService);

var _GrowlFlashDirective = require('./GrowlFlashDirective');

var _GrowlFlashDirective2 = _interopRequireDefault(_GrowlFlashDirective);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function cacheToastrTpl($templateCache) {
    "use strict";

    $templateCache.put('directives/toastr/toast.html', '<div class="alert {{toastClass}} {{toastType}}" ng-click="tapToast()">\n            <div style="display: table-row;">\n                <div class="fa fa-fw {{toastType}}-icon" style="display: table-cell; padding-right: 0.75rem;"></div>\n                <div style="display: table-cell;">\n                    <div ng-switch on="allowHtml" style="display: table-cell;">\n                        <div ng-switch-default ng-if="title" class="{{titleClass}}" aria-label="{{title}}">{{title}}</div>\n                        <div ng-switch-default class="{{messageClass}}" aria-label="{{message}}">{{message}}</div>\n                        <div ng-switch-when="true" ng-if="title" class="{{titleClass}}" aria-label="{{title}}" ng-bind-html="title"></div>\n                        <div ng-switch-when="true" class="{{messageClass}}" ng-bind-html="message"></div>\n                    </div>\n                    <progress-bar ng-if="progressBar"></progress-bar>\n                </div>\n            </div>\n        </div>');
}

function cacheToastrProgressTpl($templateCache) {
    "use strict";

    $templateCache.put('directives/toastr/progressbar.html', '<div class="toast-progress"></div>');
}

function configureToastr(toastrConfig) {
    "use strict";

    _angular2.default.extend(toastrConfig, {
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
    });
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

var _module = _angular2.default.module('pym.growler', ['ngAnimate', 'toastr']).config(config).run(run).directive('pymGrowlFlash', _GrowlFlashDirective2.default.directiveFactory).service('pym.growler.service', _GrowlerService2.default.serviceFactory);

exports.default = _module;
//# sourceMappingURL=GrowlerModule.js.map
