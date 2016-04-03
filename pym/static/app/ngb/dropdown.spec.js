System.register(['angular2/testing', 'angular2/core', './dropdown'], function(exports_1, context_1) {
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
    var testing_1, core_1, dropdown_1;
    var TestComponent;
    function getDropdownEl(tc) {
        return tc.querySelector("[ngbDropdown]");
    }
    return {
        setters:[
            function (testing_1_1) {
                testing_1 = testing_1_1;
            },
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (dropdown_1_1) {
                dropdown_1 = dropdown_1_1;
            }],
        execute: function() {
            testing_1.describe('ngb-dropdown', function () {
                testing_1.it('should be closed by default', testing_1.injectAsync([testing_1.TestComponentBuilder], function (tcb) {
                    var html = "<div ngbDropdown></div>";
                    return tcb.overrideTemplate(TestComponent, html).createAsync(TestComponent).then(function (fixture) {
                        fixture.detectChanges();
                        var compiled = fixture.nativeElement;
                        testing_1.expect(getDropdownEl(compiled)).not.toHaveCssClass('open');
                    });
                }));
                testing_1.it('should be open initially if open expression is true', testing_1.injectAsync([testing_1.TestComponentBuilder], function (tcb) {
                    var html = "<div ngbDropdown [is-open]=\"true\"></div>";
                    return tcb.overrideTemplate(TestComponent, html).createAsync(TestComponent).then(function (fixture) {
                        fixture.detectChanges();
                        var compiled = fixture.nativeElement;
                        testing_1.expect(getDropdownEl(compiled)).toHaveCssClass('open');
                    });
                }));
                testing_1.it('should toggle open class', testing_1.injectAsync([testing_1.TestComponentBuilder], function (tcb) {
                    var html = "<div ngbDropdown [is-open]=\"isOpen\"></div>";
                    return tcb.overrideTemplate(TestComponent, html).createAsync(TestComponent).then(function (fixture) {
                        fixture.detectChanges();
                        var compiled = fixture.nativeElement;
                        var dropdownEl = getDropdownEl(compiled);
                        testing_1.expect(dropdownEl).not.toHaveCssClass('open');
                        fixture.componentInstance.isOpen = true;
                        fixture.detectChanges();
                        testing_1.expect(dropdownEl).toHaveCssClass('open');
                        fixture.componentInstance.isOpen = false;
                        fixture.detectChanges();
                        testing_1.expect(dropdownEl).not.toHaveCssClass('open');
                    });
                }));
                testing_1.it('should allow toggling dropdown from outside', testing_1.injectAsync([testing_1.TestComponentBuilder], function (tcb) {
                    var html = "\n       <button (click)=\"drop.isOpen = !drop.isOpen\">Toggle</button>\n       <div ngbDropdown #drop=\"ngbDropdown\" auto-close=\"disabled\"></div>";
                    return tcb.overrideTemplate(TestComponent, html).createAsync(TestComponent).then(function (fixture) {
                        fixture.detectChanges();
                        var compiled = fixture.nativeElement;
                        var dropdownEl = getDropdownEl(compiled);
                        var buttonEl = compiled.querySelector('button');
                        buttonEl.click();
                        fixture.detectChanges();
                        testing_1.expect(dropdownEl).toHaveCssClass('open');
                        buttonEl.click();
                        fixture.detectChanges();
                        testing_1.expect(dropdownEl).not.toHaveCssClass('open');
                    });
                }));
            });
            testing_1.describe('ngb-dropdown-toggle', function () {
                testing_1.it('should toggle dropdown on click', testing_1.injectAsync([testing_1.TestComponentBuilder], function (tcb) {
                    var html = "\n      <div ngbDropdown>\n          <button ngbDropdownToggle class=\"btn btn-success\" type=\"button\">\n            Toggle dropdown\n          </button>\n      </div>";
                    return tcb.overrideTemplate(TestComponent, html).createAsync(TestComponent).then(function (fixture) {
                        fixture.detectChanges();
                        var compiled = fixture.nativeElement;
                        var dropdownEl = getDropdownEl(compiled);
                        var buttonEl = compiled.querySelector('button');
                        testing_1.expect(dropdownEl).not.toHaveCssClass('open');
                        testing_1.expect(buttonEl.getAttribute('aria-haspopup')).toBe('true');
                        testing_1.expect(buttonEl.getAttribute('aria-expanded')).toBe('false');
                        buttonEl.click();
                        fixture.detectChanges();
                        testing_1.expect(dropdownEl).toHaveCssClass('open');
                        testing_1.expect(buttonEl.getAttribute('aria-expanded')).toBe('true');
                        buttonEl.click();
                        fixture.detectChanges();
                        testing_1.expect(dropdownEl).not.toHaveCssClass('open');
                        testing_1.expect(buttonEl.getAttribute('aria-expanded')).toBe('false');
                    });
                }));
            });
            TestComponent = (function () {
                function TestComponent() {
                    this.isOpen = false;
                }
                TestComponent = __decorate([
                    core_1.Component({ selector: 'test-cmp', directives: [dropdown_1.NgbDropdown, dropdown_1.NgbDropdownToggle], template: '' }), 
                    __metadata('design:paramtypes', [])
                ], TestComponent);
                return TestComponent;
            }());
        }
    }
});
