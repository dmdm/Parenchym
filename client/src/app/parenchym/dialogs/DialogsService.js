import angular from 'angular';
import DefaultDialogController from './DefaultDialogController';


const RC_GENERAL_DEFAULT = {
    animation: true,
    templateUrl: undefined,
    size: null,
    controller: DefaultDialogController,
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
class DialogsService {
    constructor($uibModal) {
        this.$uibModal = $uibModal;
    }

    alert(data={}, rc={}) {
        const RC_DEFAULT = {
            templateUrl: 'pym/dialogs/alert.html',
            keyboard: false, // forbid ESC key
            kind: 'alert'
        };
        let _rc = angular.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
        if (! data.title) {
            data.title = 'Alert';
        }
        data.__rc__ = _rc;
        _rc.resolve = { data: data };
        return this.$uibModal.open(_rc);
    }

    info(data={}, rc={}) {
        const RC_DEFAULT = {
            templateUrl: 'pym/dialogs/alert.html',
            kind: 'info'
        };
        let _rc = angular.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
        if (! data.title) {
            data.title = 'Info';
        }
        data.__rc__ = _rc;
        _rc.resolve = { data: data };
        return this.$uibModal.open(_rc);
    }

    confirm(data={}, rc={}) {
        const RC_DEFAULT = {
            templateUrl: 'pym/dialogs/confirm.html'
        };
        let _rc = angular.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
        if (! data.title) {
            data.title = 'Confirm';
        }
        data.__rc__ = _rc;
        _rc.resolve = { data: data };
        return this.$uibModal.open(_rc);
    }

    dialog(data={}, rc={}) {
        const RC_DEFAULT = {
            templateUrl: 'pym/dialogs/dialog.html'
        };
        let _rc = angular.extend({}, RC_GENERAL_DEFAULT, RC_DEFAULT, rc);
        data.__rc__ = _rc;
        _rc.resolve = { data: data };
        return this.$uibModal.open(_rc);
    }

    static serviceFactory($uibModal) {
        return new DialogsService($uibModal);
    }
}

DialogsService.serviceFactory.$inject = ['$uibModal'];

export default DialogsService;
export { RC_GENERAL_DEFAULT, DialogsService };

