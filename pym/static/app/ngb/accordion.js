System.register(['angular2/core'], function(exports_1, context_1) {
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
    var core_1;
    var NgbAccordionPanel;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            }],
        execute: function() {
            NgbAccordionPanel = (function () {
                function NgbAccordionPanel() {
                    this._isOpen = false;
                }
                Object.defineProperty(NgbAccordionPanel.prototype, "isOpen", {
                    get: function () {
                        return this._isOpen;
                    },
                    set: function (value) {
                        this._isOpen = value;
                    },
                    enumerable: true,
                    configurable: true
                });
                NgbAccordionPanel.prototype.toggleOpen = function () {
                    if (!this.isDisabled) {
                        this.isOpen = !this.isOpen;
                    }
                };
                __decorate([
                    core_1.Input(), 
                    __metadata('design:type', Boolean)
                ], NgbAccordionPanel.prototype, "isDisabled", void 0);
                __decorate([
                    core_1.Input(), 
                    __metadata('design:type', String)
                ], NgbAccordionPanel.prototype, "title", void 0);
                __decorate([
                    core_1.Input(), 
                    __metadata('design:type', Boolean), 
                    __metadata('design:paramtypes', [Boolean])
                ], NgbAccordionPanel.prototype, "isOpen", null);
                NgbAccordionPanel = __decorate([
                    core_1.Component({
                        selector: 'ngb-accordion-panel',
                        directives: [],
                        template: "\n    <div class=\"panel panel-default\" [class.panel-open]=\"isOpen\">\n      <div class=\"panel-heading\">\n        <h4 class=\"panel-title\">\n          <a href tabindex=\"0\"><span [class.text-muted]=\"isDisabled\" (click)=\"toggleOpen($event)\">{{title}}</span></a>\n        </h4>\n      </div>\n      <div class=\"panel-collapse\">\n        <div class=\"panel-body\">\n          <ng-content></ng-content>\n        </div>\n      </div>\n    </div>\n  "
                    }), 
                    __metadata('design:paramtypes', [])
                ], NgbAccordionPanel);
                return NgbAccordionPanel;
            }());
            exports_1("NgbAccordionPanel", NgbAccordionPanel);
        }
    }
});
