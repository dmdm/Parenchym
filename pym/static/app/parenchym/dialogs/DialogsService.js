'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DialogsService = exports.RC_GENERAL_DEFAULT = undefined;

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _DefaultDialogController = require('./DefaultDialogController');

var _DefaultDialogController2 = _interopRequireDefault(_DefaultDialogController);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RC_GENERAL_DEFAULT = {
    animation: true,
    templateUrl: undefined,
    size: null,
    controller: _DefaultDialogController2.default,
    controllerAs: 'vm',
    bindToController: true,
    backdrop: 'static',
    keyboard: true
};

/**
 * Service to create canned dialogs.
 *
 * Each method accepts as first argument a 'data' hash.
 * It may have these keys:
 *
 * - title: (HTML) String for the title
 * - body: (HTML or Promise) Content for the body.
 *         A string is treated as trusted HTML, a promise is resolved and its
 *         resp.data treated as trusted HTML.
 * - bodyUrl: URL to a body template, alternatively to key 'body'.
 * - actionOkCaption: String as caption for OK-button
 * - actionCancelCaption: String as caption for CANCEL-button
 * - onActionOk: Callback for OK button
 * - onActionCancel: Callback for CANCEL button
 *
 * Both callbacks must accept one argument: $uibModalInstance.
 *
 * Above keys are mapped directly as properties of the controller, which is
 * 'vm' in the template.
 *
 * Additionally, the whole 'data' hash is available in the template via 'vm.data',
 * useful to pass more data to the template.
 *
 * Argument 'rc' is a hash with settings for ui-bootstrap $modal.
 * http://angular-ui.github.io/bootstrap/#/modal
 *
 */

var DialogsService = function () {
    function DialogsService($uibModal) {
        _classCallCheck(this, DialogsService);

        this.$uibModal = $uibModal;
    }

    _createClass(DialogsService, [{
        key: 'alert',
        value: function alert() {
            var data = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
            var rc = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            var RC_DEFAULT = {
                templateUrl: 'pym/dialogs/alert.html',
                keyboard: false, // forbid ESC key
                kind: 'alert'
            };
            var _rc = _angular2.default.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
            if (!data.title) {
                data.title = 'Alert';
            }
            data.__rc__ = _rc;
            _rc.resolve = { data: data };
            return this.$uibModal.open(_rc);
        }
    }, {
        key: 'info',
        value: function info() {
            var data = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
            var rc = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            var RC_DEFAULT = {
                templateUrl: 'pym/dialogs/alert.html',
                kind: 'info'
            };
            var _rc = _angular2.default.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
            if (!data.title) {
                data.title = 'Info';
            }
            data.__rc__ = _rc;
            _rc.resolve = { data: data };
            return this.$uibModal.open(_rc);
        }
    }, {
        key: 'confirm',
        value: function confirm() {
            var data = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
            var rc = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            var RC_DEFAULT = {
                templateUrl: 'pym/dialogs/confirm.html'
            };
            var _rc = _angular2.default.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
            if (!data.title) {
                data.title = 'Confirm';
            }
            data.__rc__ = _rc;
            _rc.resolve = { data: data };
            return this.$uibModal.open(_rc);
        }
    }, {
        key: 'dialog',
        value: function dialog() {
            var data = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
            var rc = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            var RC_DEFAULT = {
                templateUrl: 'pym/dialogs/dialog.html'
            };
            var _rc = _angular2.default.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
            data.__rc__ = _rc;
            _rc.resolve = { data: data };
            return this.$uibModal.open(_rc);
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory($uibModal) {
            return new DialogsService($uibModal);
        }
    }]);

    return DialogsService;
}();

DialogsService.serviceFactory.$inject = ['$uibModal'];

exports.default = DialogsService;
exports.RC_GENERAL_DEFAULT = RC_GENERAL_DEFAULT;
exports.DialogsService = DialogsService;
//# sourceMappingURL=DialogsService.js.map
