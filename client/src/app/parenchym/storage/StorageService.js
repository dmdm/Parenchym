import angular from 'angular';
import { WebStorage } from './WebStorage';


const DEFAULT_RC = {
    prefix: 'pym',
    sep: ':',
    usePath: true,
    path: 'NOPATH',
    serializer: JSON
};


class StorageService {
    constructor($log, $window, $location, growler) {
        this._$log = $log;
        this._$window = $window;
        this._$location = $location;
        this._growler = growler;
        this._storages = new Map();
    }

    getStorage(name, type=null, rc={}) {
        let _rc = angular.extend({}, DEFAULT_RC, rc);
        _rc.path = this._$window.location.pathname;
        _rc.uid = 'SOME_UID'; // TODO Inject encrypted real UID of authenticated user
        try {
            if (! this._storages.has(name)) {
                if (type === 'localStorage' || type === 'sessionStorage') {
                    _rc.useUid = true;
                    this._storages.set(name, new WebStorage(type, _rc, this._$window));
                }
                else {
                    throw new Error(`Unknown storage type: '${type}'`);
                }
            }
        }
        catch (e) {
            this._$log.error(e);
            this._growler.error(e);
        }
        return this._storages.get(name);
    }

    static serviceFactory($log, $window, $location, growler) {
        return new StorageService($log, $window, $location, growler);
    }
}

StorageService.serviceFactory.$inject = ['$log', '$window', '$location', 'pym.growler.service'];

export default StorageService;
