System.register(['angular2/core', '../ngb/dropdown', '../ngb/global_messenger'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var core_1, dropdown_1, global_messenger_1;
    var Clicker, Zippy, AppContent, AppComponent;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (dropdown_1_1) {
                dropdown_1 = dropdown_1_1;
            },
            function (global_messenger_1_1) {
                global_messenger_1 = global_messenger_1_1;
            }],
        execute: function() {
            Clicker = (function () {
                function Clicker() {
                }
                Clicker.prototype.logClick = function () {
                    console.log('click');
                };
                __decorate([
                    core_1.HostListener('click'), 
                    __metadata('design:type', Function), 
                    __metadata('design:paramtypes', []), 
                    __metadata('design:returntype', void 0)
                ], Clicker.prototype, "logClick", null);
                Clicker = __decorate([
                    core_1.Component({
                        selector: 'clicker',
                        template: '<h1>CLICK ME</h1>'
                    }), 
                    __metadata('design:paramtypes', [])
                ], Clicker);
                return Clicker;
            }());
            exports_1("Clicker", Clicker);
            Zippy = (function () {
                function Zippy() {
                    this.visible = true;
                    this.open = new core_1.EventEmitter();
                    this.close = new core_1.EventEmitter();
                }
                Zippy.prototype.toggle = function () {
                    this.visible = !this.visible;
                    if (this.visible) {
                        this.open.emit(null);
                    }
                    else {
                        this.close.emit(null);
                    }
                };
                __decorate([
                    core_1.Output(), 
                    __metadata('design:type', core_1.EventEmitter)
                ], Zippy.prototype, "open", void 0);
                __decorate([
                    core_1.Output(), 
                    __metadata('design:type', core_1.EventEmitter)
                ], Zippy.prototype, "close", void 0);
                Zippy = __decorate([
                    core_1.Component({
                        selector: 'zippy',
                        template: "\n      <div class=\"zippy\">\n        <div (click)=\"toggle()\">Toggle</div>\n        <div [hidden]=\"!visible\">\n          <ng-content></ng-content>\n        </div>\n     </div>"
                    }), 
                    __metadata('design:paramtypes', [])
                ], Zippy);
                return Zippy;
            }());
            exports_1("Zippy", Zippy);
            AppContent = (function () {
                function AppContent() {
                }
                AppContent = __decorate([
                    core_1.Component({
                        selector: 'app-content',
                        template: "<ng-content></ng-content>"
                    }), 
                    __metadata('design:paramtypes', [])
                ], AppContent);
                return AppContent;
            }());
            exports_1("AppContent", AppContent);
            AppComponent = (function () {
                function AppComponent() {
                    this.rc = PYM_PAGE_RC;
                }
                AppComponent.prototype.sayOpen = function () {
                    console.log('zippy open');
                };
                AppComponent.prototype.sayClose = function () {
                    console.log('zippy close');
                };
                AppComponent = __decorate([
                    core_1.Component({
                        selector: 'app',
                        directives: [AppContent, Zippy, Clicker, dropdown_1.NgbDropdown, dropdown_1.NgbDropdownToggle, dropdown_1.NgbDropdownMenu],
                        template: '<app-content>' + PYM_PAGE_RC.appContent + '</app-content>',
                        providers: [global_messenger_1.NgbGlobalMessenger]
                    }), 
                    __metadata('design:paramtypes', [])
                ], AppComponent);
                return AppComponent;
            }());
            exports_1("AppComponent", AppComponent);
        }
    }
});
