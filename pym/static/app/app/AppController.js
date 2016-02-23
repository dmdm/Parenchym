'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AppController = function AppController(appService) {
    _classCallCheck(this, AppController);

    this.appService = appService;

    if (PYM_PAGE_RC) {
        this.appService.wantedLanguages = PYM_PAGE_RC.wantedLanguages || ['*'];
    }
};

AppController.$inject = ['app.AppService'];

exports.default = AppController;
//# sourceMappingURL=AppController.js.map
