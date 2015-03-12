var ItemPropertiesDlgController = PymApp.controller('ItemPropertiesDlgController',
        ['$filter', '$modalInstance', 'loadResp', 'path',
function ($filter,   $modalInstance,   loadResp,   path) {

    "use strict";

    var ctrl = this;

    ctrl.path = path;
    ctrl.rawData = loadResp.data.data;
    ctrl.data = {
        'item': '',
        'meta_json': '',
        'meta_xmp': '',
        'data_text': '',
        'data_html_body': '',
        'rc': ''
    };
    var item = {};
    angular.forEach(loadResp.data.data, function (v, k) {
        if (k === 'meta_json') { ctrl.data.meta_json = v ? $filter('json')(v, 4) : ''; }
        else if (k === 'meta_xmp') { ctrl.data.meta_xmp = v || ''; }
        else if (k === 'data_text') { ctrl.data.data_text = v || ''; }
        else if (k === 'data_html_body') { ctrl.data.data_html_body = v || ''; }
        else if (k === 'rc') { ctrl.data.rc = $filter('json')(v, 4); }
        else if (k === '_rc') { /* skip */ }
        else { item[k] = v; }
    });
    ctrl.data.item = $filter('json')(item, 4);

    ctrl.save = function () {
        $modalInstance.close(JSON.parse(ctrl.data));
    };

    ctrl.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}]);
