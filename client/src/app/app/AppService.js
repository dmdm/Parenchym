import angular from 'angular';


class AppService {
    constructor($log) {
        this.$log = $log;
        
        this._wantedLanguages = ['*'];
    }

    get wantedLanguages() { return this._wantedLanguages; }
    set wantedLanguages(v) { this._wantedLanguages = v; }

    fetchTranslated(msgs) {
        let g, kk;
        // msgs is a Map
        if (typeof msgs.get === 'function') {
            g = msgs.get;
            kk = msgs.keys;
        }
        // msgs is a POJSO
        else {
            g = function (k) { return msgs[k]; };
            kk = function () {
                let _ = [];
                angular.forEach(
                    (v, k) => _.push(k)
                );
                return _;
            };
        }
        let m;
        for (let lang of this._wantedLanguages) {
            m = g(lang);
            if (m) {
                break;
            }
        }
        if (! m) {
            m = g('*');
        }
        if (! m) {
            m = msgs[kk()[0]];
        }
        return m;
    }


    static serviceFactory(...all) {
        return new AppService(...all);
    }
}

AppService.serviceFactory.$inject = [
    '$log'
];


export default AppService;
