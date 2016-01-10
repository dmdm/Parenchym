import angular from 'angular';


class DefaultDialogController {
    constructor($sce, $compile, $q, $uibModalInstance, data) {
        this.$sce = $sce;
        this.$compile = $compile;
        this.$uibModalInstance = $uibModalInstance;
        this.data = data;
        this.rc = data.__rc__;

        let defaultTitle = 'Place<span style="color: green;">holder</span> Title';
        let defaultBody = '<em>Placeholder</em> <span style="color: green;">Body</span>';

        this.title = $sce.trustAs('html', data.title || defaultTitle);
        this.bodyUrl = data.bodyUrl;
        if (! this.bodyUrl) {
            if (data.body && data.body.then) {
                this.body = 'Loading...';
                data.body.then(resp => this.body = $sce.trustAs('html', resp.data));
            }
            else {
                this.body = $sce.trustAs('html', data.body || defaultBody);
            }
        }
        this.actionOkCaption = data.actionOkCaption || 'Ok';
        this.actionCancelCaption = data.actionCancelCaption || 'Cancel';
        this.kind = data.__rc__.kind;
    }

    actionOk() {
        if (this.data.onActionOk) {
            this.data.onActionOk(this.$uibModalInstance);
        }
        else {
            this.$uibModalInstance.close('ok');
        }
    }

    actionCancel() {
        if (this.data.onActionCancel) {
            this.data.onActionCancel(this.$uibModalInstance);
        }
        else {
            this.$uibModalInstance.dismiss('cancel');
        }
    }
}

DefaultDialogController.$inject = ['$sce', '$compile', '$q', '$uibModalInstance', 'data'];


export default DefaultDialogController;
