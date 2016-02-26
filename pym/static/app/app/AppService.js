'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AppService = function () {
    function AppService($log) {
        _classCallCheck(this, AppService);

        this.$log = $log;

        this._wantedLanguages = ['*'];
    }

    _createClass(AppService, [{
        key: 'fetchTranslated',
        value: function fetchTranslated(msgs) {
            var g = undefined,
                kk = undefined;
            // msgs is a Map
            if (typeof msgs.get === 'function') {
                g = msgs.get;
                kk = msgs.keys;
            }
            // msgs is a POJSO
            else {
                    g = function g(k) {
                        return msgs[k];
                    };
                    kk = function kk() {
                        var _ = [];
                        _angular2.default.forEach(function (v, k) {
                            return _.push(k);
                        });
                        return _;
                    };
                }
            var m = undefined;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._wantedLanguages[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var lang = _step.value;

                    m = g(lang);
                    if (m) {
                        break;
                    }
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

            if (!m) {
                m = g('*');
            }
            if (!m) {
                m = msgs[kk()[0]];
            }
            return m;
        }
    }, {
        key: 'wantedLanguages',
        get: function get() {
            return this._wantedLanguages;
        },
        set: function set(v) {
            this._wantedLanguages = v;
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory() {
            for (var _len = arguments.length, all = Array(_len), _key = 0; _key < _len; _key++) {
                all[_key] = arguments[_key];
            }

            return new (Function.prototype.bind.apply(AppService, [null].concat(all)))();
        }
    }]);

    return AppService;
}();

AppService.serviceFactory.$inject = ['$log'];

exports.default = AppService;
//# sourceMappingURL=AppService.js.map
