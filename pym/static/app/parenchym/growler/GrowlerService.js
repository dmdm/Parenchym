'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrowlerService = function () {
    function GrowlerService(toastr) {
        _classCallCheck(this, GrowlerService);

        this.toastr = toastr;
    }

    _createClass(GrowlerService, [{
        key: 'info',
        value: function info(a, b, c) {
            this.toastr.info(a, b, c);
        }
    }, {
        key: 'ok',
        value: function ok(a, b, c) {
            this.toastr.success(a, b, c);
        }
    }, {
        key: 'success',
        value: function success(a, b, c) {
            this.toastr.success(a, b, c);
        }
    }, {
        key: 'warning',
        value: function warning(a, b, c) {
            this.toastr.warning(a, b, c);
        }
    }, {
        key: 'warn',
        value: function warn(a, b, c) {
            this.toastr.warning(a, b, c);
        }
    }, {
        key: 'error',
        value: function error(a, b, c) {
            // Make errors stick
            c = _angular2.default.extend(c || {}, { timeOut: 0 });
            this.toastr.error(a, b, c);
        }

        /**
         * Growl response from $http.
         *
         * If 'resp' is undefined, we growl a generic message about a network error.
         *
         * Usage:
         *     $http.get('/foo').then(x => bar(x), resp => growler.httpError(resp));
         *
         * @param resp
         */

    }, {
        key: 'httpError',
        value: function httpError(resp) {
            if (resp) {
                this.error(resp.statusText, 'HTTP Error ' + resp.status);
            } else {
                this.error('There was a network error. Please try again later.');
            }
        }
    }, {
        key: 'ajaxResp',
        value: function ajaxResp(resp) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = resp.msgs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var m = _step.value;

                    this.growl(m);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'growl',
        value: function growl(x) {
            if (_angular2.default.isArray(x)) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = x[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var m = _step2.value;
                        this.growl(m);
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            } else if (_angular2.default.isObject(x)) {
                var title = x.title || undefined;
                var message = x.text;
                var kind = x.kind || 'info';
                if (kind[0] === 's') {
                    this.success(message, title);
                } else if (kind[0] === 'e') {
                    this.error(message, title);
                } else if (kind[0] === 'w') {
                    this.warning(message, title);
                } else {
                    this.info(message, title);
                }
            } else {
                this.info(x);
            }
        }
    }, {
        key: 'clear',
        value: function clear(x) {
            this.toastr.clear(x);
        }
    }, {
        key: 'growlTest',
        value: function growlTest() {
            this.toastr.info('Some informational blah blah', 'Info');
            this.toastr.warning('There\'s a black cat', 'Be careful');
            this.toastr.error('Your keyboard exploded', 'Boom');
            this.toastr.success('You did fine', 'Good boy');
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory(toastr) {
            return new GrowlerService(toastr);
        }
    }]);

    return GrowlerService;
}();

GrowlerService.serviceFactory.$inject = ['toastr'];

exports.default = GrowlerService;
//# sourceMappingURL=GrowlerService.js.map
