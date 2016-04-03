System.register(['angular2/core', 'angular2/platform/browser', 'angular2/http', './app.component'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var core_1, browser_1, http_1, app_component_1;
    var appHeaders, AppRequestOptions;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (browser_1_1) {
                browser_1 = browser_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            },
            function (app_component_1_1) {
                app_component_1 = app_component_1_1;
            }],
        execute: function() {
            appHeaders = new http_1.Headers();
            appHeaders.append('X-Requested-With', 'XMLHttpRequest');
            AppRequestOptions = (function (_super) {
                __extends(AppRequestOptions, _super);
                function AppRequestOptions() {
                    _super.apply(this, arguments);
                    this.headers = appHeaders;
                }
                return AppRequestOptions;
            }(http_1.BaseRequestOptions));
            browser_1.bootstrap(app_component_1.AppComponent, [http_1.HTTP_PROVIDERS, core_1.provide(http_1.RequestOptions, { useClass: AppRequestOptions })]);
        }
    }
});
