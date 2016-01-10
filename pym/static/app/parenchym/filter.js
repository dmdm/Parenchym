'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.trustedFilter = undefined;

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function trustedFilter($sce) {
    return function (s) {
        return $sce.trustAsHtml(s);
    };
}
trustedFilter.$inject = ['$sce'];

exports.trustedFilter = trustedFilter;
//# sourceMappingURL=filter.js.map
