'use strict';

require('babel-polyfill');

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _AppModule = require('./AppModule');

var _AppModule2 = _interopRequireDefault(_AppModule);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_angular2.default.element(document).ready(function () {
    // needs global var XSRF_TOKEN !
    _jquery2.default.ajaxSetup({ headers: { 'X-XSRF-TOKEN': XSRF_TOKEN } });
    _angular2.default.bootstrap(document, [_AppModule2.default.name], {
        strictDi: true
    });
}); // For IE 9 and 10
//# sourceMappingURL=bootstrap-ie.js.map
