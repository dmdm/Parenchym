'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DefaultDialogController = function () {
    function DefaultDialogController($sce, $compile, $q, $uibModalInstance, data) {
        var _this = this;

        _classCallCheck(this, DefaultDialogController);

        this.$sce = $sce;
        this.$compile = $compile;
        this.$uibModalInstance = $uibModalInstance;
        this.data = data;
        this.rc = data.__rc__;

        var defaultTitle = 'Place<span style="color: green;">holder</span> Title';
        var defaultBody = '<em>Placeholder</em> <span style="color: green;">Body</span>';

        this.title = $sce.trustAs('html', data.title || defaultTitle);
        this.bodyUrl = data.bodyUrl;
        if (!this.bodyUrl) {
            if (data.body && data.body.then) {
                this.body = 'Loading...';
                data.body.then(function (resp) {
                    return _this.body = $sce.trustAs('html', resp.data);
                });
            } else {
                this.body = $sce.trustAs('html', data.body || defaultBody);
            }
        }
        this.actionOkCaption = data.actionOkCaption || 'Ok';
        this.actionCancelCaption = data.actionCancelCaption || 'Cancel';
        this.kind = data.__rc__.kind;
    }

    _createClass(DefaultDialogController, [{
        key: 'actionOk',
        value: function actionOk() {
            if (this.data.onActionOk) {
                this.data.onActionOk(this.$uibModalInstance);
            } else {
                this.$uibModalInstance.close('ok');
            }
        }
    }, {
        key: 'actionCancel',
        value: function actionCancel() {
            if (this.data.onActionCancel) {
                this.data.onActionCancel(this.$uibModalInstance);
            } else {
                this.$uibModalInstance.dismiss('cancel');
            }
        }
    }]);

    return DefaultDialogController;
}();

DefaultDialogController.$inject = ['$sce', '$compile', '$q', '$uibModalInstance', 'data'];

exports.default = DefaultDialogController;
//# sourceMappingURL=DefaultDialogController.js.map
