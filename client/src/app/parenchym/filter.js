import angular from 'angular';


function trustedFilter ($sce) {
    return function (s) {
        return $sce.trustAsHtml(s);
    };
}
trustedFilter.$inject = ['$sce'];


export { trustedFilter };
