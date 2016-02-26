'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.FooController = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FooController = function () {
    function FooController($timeout, $http, growler, storageService, dialogsService) {
        var _this = this;

        _classCallCheck(this, FooController);

        var self = this;

        this.$timeout = $timeout;
        this.$http = $http;
        this.growler = growler;
        this.dialogs = dialogsService;
        this.storage = storageService.getStorage('foo', 'localStorage');
        this.storageKey = 'fooUI';
        this.state = this.loadState();

        this.tree1 = {
            rc: {
                oid: 'FOO'
            },
            filterExpr: '3',
            data: [{
                text: 't1-alpha', children: [{
                    text: 't1-alpha-1', children: [{ text: 't1-alpha-1-a' }, { text: 't1-alpha-1-b' }]
                }, {
                    text: 't1-alpha-2', children: [{ text: 't1-alpha-2-a' }, { text: 't1-alpha-2-b' }]
                }, {
                    text: 't1-alpha-3', children: [{ text: 't1-alpha-3-a' }, { text: 't1-alpha-3-b' }]
                }]
            }, {
                text: 't1-beta', children: [{
                    text: 't1-beta-1', children: [{ text: 't1-beta-1-a' }, { text: 't1-beta-1-b' }]
                }, {
                    text: 't1-beta-2', children: [{ text: 't1-beta-2-a' }, { text: 't1-beta-2-b' }]
                }, {
                    text: 't1-beta-3', children: [{ text: 't1-beta-3-a' }, { text: 't1-beta-3-b' }]
                }]
            }]
        };
        this.tree1.filter = function () {
            self.tree1.tree.filter(self.tree1.filterExpr);
        };
        this.tree1.rc.onTreeReady = function (tree) {
            if (self.state && self.state.tree1) {
                tree.setState(self.state.tree1);
                self.tree1.filterExpr = self.state.tree1.filterExpr;
            }
        };

        this.tree2 = {
            rc: {
                oid: 'BAR'
            },
            data: [{
                text: 't2-green', children: [{
                    text: 't2-green-1', children: [{ text: 't2-green-1-a' }, { text: 't2-green-1-b' }]
                }, {
                    text: 't2-green-2', children: [{ text: 't2-green-2-a' }, { text: 't2-green-2-b' }]
                }, {
                    text: 't2-green-3', children: [{ text: 't2-green-3-a' }, { text: 't2-green-3-b' }]
                }]
            }, {
                text: 't2-blue', children: [{
                    text: 't2-blue-1', children: [{ text: 't2-blue-1-a' }, { text: 't2-blue-1-b' }]
                }, {
                    text: 't2-blue-2', children: [{ text: 't2-blue-2-a' }, { text: 't2-blue-2-b' }]
                }, {
                    text: 't2-blue-3', children: [{ text: 't2-blue-3-a' }, { text: 't2-blue-3-b' }]
                }]
            }]
        };

        window.addEventListener("beforeunload", function (e) {
            _this.saveState();
            //let confirmationMessage = "Some message";
            //e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
            //return confirmationMessage;              // Gecko, WebKit, Chrome <34
        });
    }

    _createClass(FooController, [{
        key: 'loadState',
        value: function loadState() {
            return this.storage.getObject(this.storageKey);
        }
    }, {
        key: 'saveState',
        value: function saveState() {
            var state = {};
            if (this.tree1.tree) {
                state.tree1 = this.tree1.tree.getState();
            }
            this.storage.setObject(this.storageKey, state);
        }
    }, {
        key: 'growl',
        value: function growl() {
            var _this2 = this;

            this.growler.growlTest();
            this.$http.get('/foo').then(function (x) {
                return window.alert(x);
            }, function (y) {
                return _this2.growler.httpError(y);
            });
        }
    }, {
        key: 'alert',
        value: function alert() {
            var _this3 = this;

            this.dialogs.alert().result.then(function (result) {
                return _this3.alertResult = 'OK: ' + result;
            }, function (result) {
                return _this3.alertResult = 'CANCEL: ' + result;
            });
        }
    }, {
        key: 'info',
        value: function info() {
            var _this4 = this;

            this.dialogs.info().result.then(function (result) {
                return _this4.infoResult = 'OK: ' + result;
            }, function (result) {
                return _this4.infoResult = 'CANCEL: ' + result;
            });
        }
    }, {
        key: 'confirm',
        value: function confirm() {
            var _this5 = this;

            this.dialogs.confirm().result.then(function (result) {
                return _this5.confirmResult = 'OK: ' + result;
            }, function (result) {
                return _this5.confirmResult = 'CANCEL: ' + result;
            });
        }
    }, {
        key: 'dialog',
        value: function dialog() {
            var _this6 = this;

            var data = {
                title: '<i class="fa fa-puzzle-piece text-info"></i>Some <span style="color:red;">fancy</span> title',
                body: '\n            <p>The title\'s icon is automatically styled.</p>\n            <p>Foo</p>\n            <p>Bar</p>\n        ',
                actionOkCaption: 'Do baz',
                actionCancelCaption: 'Do not do baz'
            };
            this.dialogs.dialog(data).result.then(function (result) {
                return _this6.dialogResult = 'OK: ' + result;
            }, function (result) {
                return _this6.dialogResult = 'CANCEL: ' + result;
            });
        }
    }]);

    return FooController;
}();

FooController.$inject = ['$timeout', '$http', 'pym.growler.service', 'pym.storage.service', 'pym.dialogs.service'];

exports.FooController = FooController;
//# sourceMappingURL=foo.js.map
