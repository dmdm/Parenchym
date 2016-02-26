'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StickyBreadcrumbsService = function () {
    function StickyBreadcrumbsService($log, $window) {
        _classCallCheck(this, StickyBreadcrumbsService);

        this.$log = $log;
        this.$window = $window;
        this.rc = {
            selector: '#breadcrumbs',
            classSticky: 'sticky-breadcrumbs'
        };

        this.isSticky = false;
        this.placeholder = undefined;
        this.exists = false;

        this.elem = undefined;
        this.height = undefined;
        this.width = undefined;
        this.placeholderWidth = undefined;
        this.offsetTop = undefined;
        this.triggerPos = undefined;
    }

    _createClass(StickyBreadcrumbsService, [{
        key: 'init',
        value: function init() {
            this.initElem();
            this.handleEvents();
        }
    }, {
        key: 'handleEvents',
        value: function handleEvents() {
            var _this = this;

            var win = _angular2.default.element(this.$window);
            win.on('resize', function () {
                return _this.updatePosition();
            });
            win.on('scroll', function () {
                return _this.onScroll(win.scrollTop());
            });
            // init
            this.updatePosition();
            this.onScroll(win.scrollTop());
        }
    }, {
        key: 'onScroll',
        value: function onScroll(scrollTop) {
            if (scrollTop > this.triggerPos) {
                this.stick();
            } else {
                this.unstick();
            }
        }
    }, {
        key: 'updatePosition',
        value: function updatePosition() {
            this.placeholderWidth = this.placeholder.outerWidth();
            if (this.isSticky) {
                this.elem.css({ width: this.placeholderWidth });
            }
        }
    }, {
        key: 'initElem',
        value: function initElem() {
            var elem = _angular2.default.element(document).find(this.rc.selector);
            if (elem.length) {
                this.exists = true;
                this.elem = elem;
                this.height = elem.height();
                this.width = elem.width();
                this.offsetTop = elem.offset().top;
                this.triggerPos = this.offsetTop;
                this.createPlaceholder();
            }
        }
    }, {
        key: 'createPlaceholder',
        value: function createPlaceholder() {
            var _this2 = this;

            this.placeholder = _angular2.default.element('<div style="display: none; width: 100%;"></div>');
            this.placeholder.css({
                height: this.elem.outerHeight()
            });
            this.placeholderWidth = this.placeholder.outerWidth();
            this.placeholder.insertBefore(this.elem);
            _angular2.default.element(this.$window).on('resize', function () {
                _this2.updatePosition();
            });
        }
    }, {
        key: 'stick',
        value: function stick() {
            if (!this.exists) {
                this.$log.error('Breadcrumbs element not found');
                return;
            }
            if (!this.isSticky) {
                this.isSticky = true;
                this.elem.addClass(this.rc.classSticky);
                this.placeholder.show();
                this.updatePosition();
            }
        }
    }, {
        key: 'unstick',
        value: function unstick() {
            if (!this.exists) {
                this.$log.error('Breadcrumbs element not found');
                return;
            }
            if (this.isSticky) {
                this.isSticky = false;
                this.elem.removeClass(this.rc.classSticky);
                this.placeholder.hide();
                this.elem.css({ width: '' });
            }
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory() {
            for (var _len = arguments.length, all = Array(_len), _key = 0; _key < _len; _key++) {
                all[_key] = arguments[_key];
            }

            return new (Function.prototype.bind.apply(StickyBreadcrumbsService, [null].concat(all)))();
        }
    }]);

    return StickyBreadcrumbsService;
}();

StickyBreadcrumbsService.serviceFactory.$inject = ['$log', '$window'];

exports.default = StickyBreadcrumbsService;
//# sourceMappingURL=StickyBreadcrumbsService.js.map
