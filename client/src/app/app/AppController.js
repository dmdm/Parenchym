class AppController {
    constructor(appService) {
        this.appService = appService;

        if (PYM_PAGE_RC) {
            this.appService.wantedLanguages = PYM_PAGE_RC.wantedLanguages || ['*'];
        }
    }
}

AppController.$inject = ['app.AppService'];

export default AppController;
