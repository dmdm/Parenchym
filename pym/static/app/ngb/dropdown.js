System.register(['angular2/core', './global_messenger'], function(exports_1, context_1) {
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
    var core_1, global_messenger_1;
    var NgbDropdown, NgbDropdownToggle, NgbDropdownMenu;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (global_messenger_1_1) {
                global_messenger_1 = global_messenger_1_1;
            }],
        execute: function() {
            NgbDropdown = (function () {
                function NgbDropdown(_renderer, _messenger) {
                    this._renderer = _renderer;
                    this._messenger = _messenger;
                    this.autoClose = 'always';
                    this._isOpen = false;
                    this._dropdownOpenedSubscription = _messenger.dropdownOpened$.subscribe(this.onDropdownOpened.bind(this));
                }
                Object.defineProperty(NgbDropdown.prototype, "isOpen", {
                    get: function () {
                        return this._isOpen;
                    },
                    set: function (v) {
                        if (v) {
                            this.openMenu();
                        }
                        else {
                            this.closeMenu();
                        }
                    },
                    enumerable: true,
                    configurable: true
                });
                ;
                NgbDropdown.prototype.onClick = function ($event) {
                    this._localTarget = $event.target;
                    if ($event.target.attributes.getNamedItem('ngb-dropdown-toggle')) {
                        this.toggleOpen();
                        $event.stopPropagation();
                    }
                    else {
                        var cssClass = $event.target.getAttribute('class').split(/ +/);
                        if (cssClass.indexOf('dropdown-item') >= 0) {
                            if (this.autoClose === 'always') {
                                this.closeMenu();
                            }
                        }
                    }
                };
                NgbDropdown.prototype.onKeyDown = function ($event) {
                    var k = $event.key || $event.which;
                    console.log('Key ', k);
                    if (k === 'Escape' || k === 27) {
                        this.closeMenu();
                    }
                    else if (k === 'Enter' || k === 13) {
                        this.toggleOpen();
                    }
                };
                NgbDropdown.prototype.onGlobalClick = function ($event) {
                    if ($event.target === this._localTarget) {
                        return;
                    }
                    this.closeMenu();
                };
                NgbDropdown.prototype.onDropdownOpened = function (dropdown) {
                    console.log('On dropdown opened: ', dropdown.id);
                    if (dropdown.id === this.id) {
                        return;
                    }
                    console.log('Attempting to close ', this.id);
                    this.closeMenu();
                };
                NgbDropdown.prototype.ngOnDestroy = function () {
                    if (this._removeGlobalClickListener) {
                        this._removeGlobalClickListener();
                    }
                    if (this._dropdownOpenedSubscription) {
                        this._dropdownOpenedSubscription.unsubscribe();
                    }
                };
                NgbDropdown.prototype._addGlobalClickListener = function () {
                    var _this = this;
                    if (!this._removeGlobalClickListener) {
                        this._removeGlobalClickListener = this._renderer.listenGlobal('document', 'click', function ($event) {
                            _this.onGlobalClick($event);
                        });
                    }
                };
                NgbDropdown.prototype.closeOnOutsideClick = function () {
                    return (this.autoClose === 'always' || this.autoClose === 'outsideClick');
                };
                NgbDropdown.prototype.closeMenu = function () {
                    this._isOpen = false;
                    if (this._removeGlobalClickListener) {
                        this._removeGlobalClickListener();
                        this._removeGlobalClickListener = null;
                    }
                };
                NgbDropdown.prototype.openMenu = function () {
                    this._isOpen = true;
                    if (this.closeOnOutsideClick()) {
                        this._addGlobalClickListener();
                    }
                    this._messenger.notifyDropdownOpened(this);
                };
                NgbDropdown.prototype.toggleOpen = function () {
                    this.isOpen = !this.isOpen;
                };
                __decorate([
                    core_1.Input('auto-close'), 
                    __metadata('design:type', String)
                ], NgbDropdown.prototype, "autoClose", void 0);
                __decorate([
                    core_1.Input(), 
                    __metadata('design:type', String)
                ], NgbDropdown.prototype, "id", void 0);
                __decorate([
                    core_1.Input('is-open'), 
                    __metadata('design:type', Boolean)
                ], NgbDropdown.prototype, "isOpen", null);
                __decorate([
                    core_1.HostListener('click', ['$event']), 
                    __metadata('design:type', Function), 
                    __metadata('design:paramtypes', [Object]), 
                    __metadata('design:returntype', void 0)
                ], NgbDropdown.prototype, "onClick", null);
                __decorate([
                    core_1.HostListener('keydown', ['$event']), 
                    __metadata('design:type', Function), 
                    __metadata('design:paramtypes', [Object]), 
                    __metadata('design:returntype', void 0)
                ], NgbDropdown.prototype, "onKeyDown", null);
                NgbDropdown = __decorate([
                    core_1.Directive({
                        selector: '[ngb-dropdown]',
                        exportAs: 'ngbDropdown',
                        host: {
                            'class': 'dropdown',
                            '[class.open]': 'isOpen'
                        }
                    }), 
                    __metadata('design:paramtypes', [core_1.Renderer, global_messenger_1.NgbGlobalMessenger])
                ], NgbDropdown);
                return NgbDropdown;
            }());
            exports_1("NgbDropdown", NgbDropdown);
            NgbDropdownToggle = (function () {
                function NgbDropdownToggle(_dropdown) {
                    this._dropdown = _dropdown;
                }
                NgbDropdownToggle = __decorate([
                    core_1.Directive({
                        selector: '[ngb-dropdown-toggle]',
                        host: {
                            'class': 'dropdown-toggle',
                            'aria-haspopup': 'true',
                            '[attr.aria-expanded]': '_dropdown.isOpen'
                        }
                    }), 
                    __metadata('design:paramtypes', [NgbDropdown])
                ], NgbDropdownToggle);
                return NgbDropdownToggle;
            }());
            exports_1("NgbDropdownToggle", NgbDropdownToggle);
            NgbDropdownMenu = (function () {
                function NgbDropdownMenu(_dropdown) {
                    this._dropdown = _dropdown;
                }
                NgbDropdownMenu = __decorate([
                    core_1.Directive({
                        selector: '[ngb-dropdown-menu]',
                        host: {
                            'class': 'dropdown-menu',
                            'role': 'menu',
                            '[attr.aria-labelledby]': '_dropdown.id'
                        }
                    }), 
                    __metadata('design:paramtypes', [NgbDropdown])
                ], NgbDropdownMenu);
                return NgbDropdownMenu;
            }());
            exports_1("NgbDropdownMenu", NgbDropdownMenu);
        }
    }
});
