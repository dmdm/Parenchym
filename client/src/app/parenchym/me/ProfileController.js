import angular from 'angular';


class ProfileController {
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

ProfileController.$inject = ['pym.me.service', 'pym.growler.service'];


export default ProfileController;
