'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebStorage = function () {
    function WebStorage(storageType, rc, $window) {
        _classCallCheck(this, WebStorage);

        this._storageType = storageType;
        this._rc = rc;
        this._$window = $window;

        this.prefix = 'pym';

        this._checkBrowserSupport();
        this._storage = $window[storageType];
    }

    _createClass(WebStorage, [{
        key: 'get',
        value: function get(key) {
            return this._storage.getItem(this._buildKey(key));
        }
    }, {
        key: 'getObject',
        value: function getObject(key) {
            var v = this.get(key);
            return this._rc.serializer.parse(v);
        }
    }, {
        key: 'set',
        value: function set(key, v) {
            this._storage.setItem(this._buildKey(key), v);
        }
    }, {
        key: 'setObject',
        value: function setObject(key, o) {
            var v = this._rc.serializer.stringify(o);
            this.set(key, v);
        }
    }, {
        key: 'remove',
        value: function remove(key) {
            this._storage.remove(this._buildKey(key));
        }
    }, {
        key: 'clear',
        value: function clear() {
            this._storage.clear();
        }
    }, {
        key: 'length',
        value: function length() {
            return this._storage.length;
        }
    }, {
        key: '_buildKey',
        value: function _buildKey(key) {
            var kk = [];
            if (this.prefix) {
                kk.push(this.prefix);
            }
            if (this._rc.usePath) {
                kk.push(this._rc.path);
            }
            kk.push(key);
            if (this._rc.useUid) {
                kk.push(this._rc.uid);
            }
            return kk.join(this._rc.sep);
        }
    }, {
        key: '_checkBrowserSupport',
        value: function _checkBrowserSupport() {
            var supported = undefined;

            // Lifted from: https://github.com/gsklee/ngStorage/blob/master/ngStorage.js

            // Some installations of IE, for an unknown reason, throw "SCRIPT5: Error: Access is denied"
            // when accessing window.webStorage. This happens before you try to do anything with it. Catch
            // that error and allow execution to continue.

            // fix 'SecurityError: DOM Exception 18' exception in Desktop Safari, Mobile Safari
            // when "Block cookies": "Always block" is turned on
            try {
                supported = this._$window[this._storageType];
            } catch (err) {
                supported = false;
            }

            // When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage
            // is available, but trying to call .setItem throws an exception below:
            // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made to add something to storage that exceeded the quota."
            if (supported && this._storageType === 'localStorage') {
                var key = '__' + Math.round(Math.random() * 1e7);

                try {
                    localStorage.setItem(key, key);
                    localStorage.removeItem(key);
                } catch (err) {
                    supported = false;
                }
            }
            if (!supported) {
                throw new Error('Storage \'' + this._storageType + '\' is not supported in this browser.');
            }
        }
    }]);

    return WebStorage;
}();

exports.WebStorage = WebStorage;
//# sourceMappingURL=WebStorage.js.map
