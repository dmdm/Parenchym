import angular from 'angular';


/**
 * Service handle authentication data.
 */
class MeService {
    constructor() {
    }

    static serviceFactory() {
        return new MeService();
    }
}

MeService.serviceFactory.$inject = [];

export default MeService;

