'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _WebStorage = require('./WebStorage');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_RC = {
    prefix: 'pym',
    sep: ':',
    usePath: true,
    path: 'NOPATH',
    serializer: JSON
};

var StorageService = function () {
    function StorageService($log, $window, $location, growler) {
        _classCallCheck(this, StorageService);

        this._$log = $log;
        this._$window = $window;
        this._$location = $location;
        this._growler = growler;
        this._storages = new Map();
    }

    _createClass(StorageService, [{
        key: 'getStorage',
        value: function getStorage(name) {
            var type = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
            var rc = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

            var _rc = _angular2.default.extend({}, DEFAULT_RC, rc);
            _rc.path = this._$window.location.pathname;
            _rc.uid = 'SOME_UID'; // TODO Inject encrypted real UID of authenticated user
            try {
                if (!this._storages.has(name)) {
                    if (type === 'localStorage' || type === 'sessionStorage') {
                        _rc.useUid = true;
                        this._storages.set(name, new _WebStorage.WebStorage(type, _rc, this._$window));
                    } else {
                        throw new Error('Unknown storage type: \'' + type + '\'');
                    }
                }
            } catch (e) {
                this._$log.error(e);
                this._growler.error(e);
            }
            return this._storages.get(name);
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory($log, $window, $location, growler) {
            return new StorageService($log, $window, $location, growler);
        }
    }]);

    return StorageService;
}();

StorageService.serviceFactory.$inject = ['$log', '$window', '$location', 'pym.growler.service'];

exports.default = StorageService;
//# sourceMappingURL=StorageService.js.map
