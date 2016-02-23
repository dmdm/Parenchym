import angular from 'angular';

class GrowlerService {
    constructor(toastr) {
        this.toastr = toastr;
    }

    static serviceFactory(toastr) {
        return new GrowlerService(toastr);
    }

    info(a, b, c) { this.toastr.info(a, b, c); }

    ok(a, b, c) { this.toastr.success(a, b, c); }
    success(a, b, c) { this.toastr.success(a, b, c); }

    warning(a, b, c) { this.toastr.warning(a, b, c); }
    warn(a, b, c) { this.toastr.warning(a, b, c); }

    error(a, b, c) {
        // Make errors stick
        c = angular.extend(c || {}, {timeOut: 0});
        this.toastr.error(a, b, c);
    }

    /**
     * Growl response from $http.
     *
     * If 'resp' is undefined, we growl a generic message about a network error.
     *
     * Usage:
     *     $http.get('/foo').then(x => bar(x), resp => growler.httpError(resp));
     *
     * @param resp
     */
    httpError(resp) {
        if (resp) {
            this.error(resp.statusText, 'HTTP Error ' + resp.status);
        }
        else {
            this.error('There was a network error. Please try again later.');
        }
    }

    ajaxResp(resp) {
        for (let m of resp.msgs) {
            this.growl(m);
        }
    }

    growl(x) {
        if (angular.isArray(x)) {
            for (let m of x) { this.growl(m); }
        }
        else if (angular.isObject(x)) {
            let title = x.title || undefined;
            let message = x.text;
            let kind = x.kind || 'info';
            if (kind[0] === 's') { this.success(message, title); }
            else if (kind[0] === 'e') { this.error(message, title); }
            else if (kind[0] === 'w') { this.warning(message, title); }
            else { this.info(message, title); }
        }
        else {
            this.info(x);
        }
    }

    clear(x) {
        this.toastr.clear(x);
    }

    growlTest() {
        this.toastr.info('Some informational blah blah', 'Info');
        this.toastr.warning('There\'s a black cat', 'Be careful');
        this.toastr.error('Your keyboard exploded', 'Boom');
        this.toastr.success('You did fine', 'Good boy');
    }
}

GrowlerService.serviceFactory.$inject = ['toastr'];

export default GrowlerService;
