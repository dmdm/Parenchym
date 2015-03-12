var FsPropertiesDlgController = PymApp.controller('FsPropertiesDlgController',
        ['$filter', '$modalInstance', 'loadResp',
function ($filter,   $modalInstance,   loadResp) {

    "use strict";

    var ctrl = this;

    console.log('resp', loadResp.data.data);
    ctrl.data = $filter('json')(loadResp.data.data, 4);

    ctrl.save = function () {
        $modalInstance.close(JSON.parse(ctrl.data));
    };

    ctrl.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}]);
