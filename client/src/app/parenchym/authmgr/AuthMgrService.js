import angular from 'angular';


/**
 * Service handle authentication data.
 */
class AuthMgrService {
    constructor() {
    }

    static serviceFactory() {
        return new AuthMgrService();
    }
}

AuthMgrService.serviceFactory.$inject = [];

export default AuthMgrService;

