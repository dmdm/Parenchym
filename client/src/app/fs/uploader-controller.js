angular.module('pym.fs').controller('pymFsUploaderController',
        ['$log', 'pymFsService', 'pymFsUploaderService', 'FILE_STATES',
function ($log,   pymFsService,   pymFsUploaderService,   FILE_STATES) {

    "use strict";

    var ctrl = this;


    ctrl.files = [];
    ctrl.rejectedFiles = [];
    ctrl.isDropAvailable = null;
    ctrl.queue = {};
    ctrl.uploads = [];

    ctrl.fileDropped = function ($files, $event, $rejectedFiles) {
        this.enqueue($files);
    };

    ctrl.fileSelected = function ($files, $event) {
        $log.log('selected', $files, this.files, $event);
        this.enqueue($files);
    };

    ctrl.validate = function ($file) {
        $log.log('Validating file', $file);
        return $file.type !== 'audio/x-ape';
    };

    ctrl.enqueue = function (files) {
        var self = this,
            i, imax, f,
            myQueue = {};
        if (! files.length) { return; }
        for (i=0, imax=files.length; i<imax; i++) {
            f = new pymFsUploaderService.createPymFile(files[i]);
            if (self.queue[files[i].name]) {
                f.setState(FILE_STATES.VALIDATION_ERROR);
                f.validationMessage = 'File with this name already in queue';
                f.key = f.file.name + new Date();
            }
            else {
                f.setState(FILE_STATES.VALIDATING);
                self.validateHere(f);
                f.key = f.file.name;
            }
            myQueue[f.key] = f;
            self.queue[f.key] = f;
        }
        pymFsUploaderService.validateFiles(pymFsService.getPathStr(), myQueue);
    };

    ctrl.validateHere = function (f) {
        // TODO Check quota. If violation, set state and message, if ok, keep state as VALIDATING
    };

    ctrl.cbProgress = function (evt) {
        var n = parseInt(100.0 * evt.loaded / evt.total);
        $log.log('progress: ' + n + '% file :'+ evt.config.file.name);
        $log.log('progress-evt: ', evt);
        $log.log('progress-this: ', this);
        this.progress = n;
    };

    ctrl.cbSuccess = function (data, status, headers, config) {
        // file is uploaded successfully
        $log.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
        this.setState(FILE_STATES.UPLOAD_OK);
    };

    ctrl.upload = function () {
        var self = this,
            p,
            fProgress, fSuccess;
        angular.forEach(self.queue, function(f) {
            if (f.state === FILE_STATES.VALIDATION_OK) {
                $log.log('starting upload of', f.file.name, f);
                // Bind the callbacks to the individual PymFile, so that
                // their 'this' points to the PymFile instance.
                fProgress = angular.bind(f, self.cbProgress);
                fSuccess = angular.bind(f, self.cbSuccess);
                p = pymFsUploaderService.upload(
                        pymFsService.getPathStr(), f, pymFsService.overwrite)
                    .progress(fProgress)
                    .success(fSuccess);
            }
        });
    };

    ctrl.cancel = function (file) {
        file.uploadPromise.abort();
        file.setState(FILE_STATES.UPLOAD_CANCELED);
    };

    /**
     * Checks given mime-type against pattern from ``allow`` and ``deny``
     * and returns true if mime-type is allowed, false otherwise.
     */
    ctrl.checkType = function (ty) {
        var self = this,
            i, imax, pat, good;
        if (! ty) {ty = 'application/octet-stream';}
        ty = ty.split('/');
        $log.log(ty);
        // Is given mime type allowed?
        good = false;
        for (i=0, imax=self.allow.length; i<imax; i++) {
            pat = self.allow[i];
            if (pat.search(/\*/) > -1 && pat.search(/\.\*/) === -1) {
                pat = pat.replace(
                    /\*/g,
                    '.*'
                );
            }
            pat = pat.split('/');
            if (ty[0].search(pat[0]) > -1 && ty[1].search(pat[1]) > -1) {
                good = true;
                break;
            }
        }
        if (! good) {return false;}
        // Is given mime type denied?
        for (i=0, imax=self.deny.length; i<imax; i++) {
            pat = self.deny[i];
            if (pat.search(/\*/) > -1 && pat.search(/\.\*/) === -1) {
                pat = pat.replace(
                    /\*/g,
                    '.*'
                );
            }
            pat = pat.split('/');
            if (ty[0].search(pat[0]) > -1 || ty[1].search(pat[1]) > -1) {
                good = false;
                break;
            }
        }
        return good;
    };

    ctrl.checkSize = function (sz) {
        return (sz >= this.minSize && sz <= this.maxSize);
    };

    function init() {
        var i, f;
        for (i=0; i<10; i++) {
            f = new pymFsUploaderService.createPymFile({
                name: 'dfdsffs sdfsgdfg fgsfgfdg sdfgfdg sdfgs dfg sdfg dfgsdfdg sdfgdfgs dfg d dsdgfsfdsg',
                size: 6523856653,
                type: 'stuff/sample'
                            });
            f.setState(FILE_STATES.UPLOAD_CANCELED);
            f.validationMessage = 'blah bölddf erwe';
            ctrl.queue[i] = f;
        }
    }


    /*
     * Run immediately
     */
    init();

}]);
