import angular from 'angular';


class MeController {
    constructor(meService, growlerService) {
        this.meService = meService;
        this.growlerService = growlerService;

        this.ToolsMenu = {
            isDisabled: false,
            isOpen: false
        };
    }

    doThis() {
        this.growlerService.info('Done this');
    }
}

MeController.$inject = ['pym.me.service', 'pym.growler.service'];


export default MeController;
