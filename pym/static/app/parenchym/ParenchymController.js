'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ParenchymController = function ParenchymController(meService, growlerService) {
    _classCallCheck(this, ParenchymController);

    this.meService = meService;
    this.growlerService = growlerService;

    this.UserMenu = {
        isDisabled: false,
        isOpen: false
    };
};

ParenchymController.$inject = ['pym.me.service', 'pym.growler.service'];

exports.default = ParenchymController;
//# sourceMappingURL=ParenchymController.js.map
