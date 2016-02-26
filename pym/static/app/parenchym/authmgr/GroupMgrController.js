"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require("angular");

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GroupMgrController = function GroupMgrController(authMgrService) {
    _classCallCheck(this, GroupMgrController);

    this.authMgrService = authMgrService;

    this.myData = [{
        "firstName": "Cox",
        "lastName": "Carney",
        "company": "Enormo",
        "employed": true
    }, {
        "firstName": "Lorraine",
        "lastName": "Wise",
        "company": "Comveyer",
        "employed": false
    }, {
        "firstName": "Nancy",
        "lastName": "Waters",
        "company": "Fuelton",
        "employed": false
    }];
};

GroupMgrController.$inject = ['pym.authmgr.service'];

exports.default = GroupMgrController;
//# sourceMappingURL=GroupMgrController.js.map
