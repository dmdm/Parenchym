import angular from 'angular';


class ParenchymController {
    constructor(meService, growlerService) {
        this.meService = meService;
        this.growlerService = growlerService;

        this.UserMenu = {
            isDisabled: false,
            isOpen: false
        };
    }
}

ParenchymController.$inject = ['pym.me.service', 'pym.growler.service'];


export default ParenchymController;
