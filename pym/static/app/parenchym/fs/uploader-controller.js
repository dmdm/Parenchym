'use strict';

angular.module('pym.fs').controller('pymFsUploaderController', ['$scope', '$window', '$log', 'T', 'pymService', 'pymFsService', 'pymFsUploaderService', 'FILE_STATES', '$q', function ($scope, $window, $log, T, pym, pymFsService, pymFsUploaderService, FILE_STATES, $q) {

    "use strict";

    var ctrl = this;
    ctrl.FILE_STATES = FILE_STATES;

    // Storage for $uploader service
    ctrl.files = [];
    ctrl.rejectedFiles = [];
    ctrl.isDropAvailable = null;

    // Enqueued files to validate and upload
    ctrl.queue = {};
    // Several counters, updated by countActiveUploads watcher
    // Active means either validating or uploading
    ctrl.activeUploads = 0;
    // Validation errors + upload errors
    ctrl.errors = 0;
    // Transferring data
    ctrl.uploading = 0;
    // total progress
    ctrl.totalProgress = 0;

    ctrl.windowMaximized = true;
    ctrl.windowIsOpen = false;

    ctrl.countActiveUploads = function () {
        var n = 0,
            e = 0,
            u = 0,
            p = 0,
            len = 0;
        angular.forEach(ctrl.queue, function (f) {
            if (f.isActive) {
                ++n;
            }
            if (f.hasError) {
                ++e;
            }
            if (f.isUploading) {
                ++u;
            }
            p += f.progress;
            ++len;
        });
        ctrl.activeUploads = n;
        ctrl.errors = e;
        ctrl.uploading = u;
        if (len !== 0) {
            ctrl.totalProgress = parseInt(p / len);
        }
        return ctrl.activeUploads;
    };

    $scope.$watch(ctrl.countActiveUploads, function (newValue, oldValue) {
        if (newValue === 0 && newValue !== oldValue && pymFsService.onUploadFinished) {
            pymFsService.onUploadFinished();
        }
    });

    ctrl.minimaxWindow = function () {
        ctrl.windowMaximized = !ctrl.windowMaximized;
    };

    /**
     * Cancels all active uploads.
     *
     * Lets user confirm. Response is triggered by an event, iow, it arrives
     * asynchronously. (We use our own dialog, not $window.confirm.)
     *
     * We may get called from another function (closeWindow), so return a promise
     * to signal what the user selected.
     *
     * If there are no active downloads, we do not let the user confirm. Still
     * return a promise, a resolved one, so the caller is cleared to do his
     * thing.
     *
     * @returns {promise}
     */
    ctrl.cancelAll = function () {
        if (ctrl.activeUploads) {
            return pym.growler.confirm(T.confirm_cancel_all_uploads).then(function () {
                angular.forEach(ctrl.queue, function (f) {
                    f.abort();
                });
            });
        } else {
            return $q.defer().resolve();
        }
    };

    ctrl.closeWindow = function () {

        function doIt() {
            ctrl.clearQueue();
            ctrl.windowIsOpen = false;
        }

        if (ctrl.activeUploads) {
            ctrl.cancelAll().then(doIt);
        } else {
            doIt();
        }
    };

    ctrl.fileDropped = function ($files, $event, $rejectedFiles) {
        $log.log('dropped', $files, this.files, $event);
        if ($files && $files.length > 0) {
            this.enqueue($files);
        }
    };

    ctrl.fileSelected = function ($files, $event) {
        $log.log('selected', $files, this.files, $event);
        if ($files && $files.length > 0) {
            this.enqueue($files);
        }
    };

    ctrl.validate = function ($file) {
        $log.log('Validating file', $file);
        return $file.type !== 'audio/x-ape';
    };

    ctrl.clearQueue = function () {
        var prop;
        for (prop in ctrl.queue) {
            if (ctrl.queue.hasOwnProperty(prop)) {
                delete ctrl.queue[prop];
            }
        }
    };

    ctrl.enqueue = function (files) {
        var self = this,
            i,
            imax,
            f,
            myQueue = {};
        if (!(files && files.length > 0)) {
            return;
        }
        ctrl.windowIsOpen = true;
        for (i = 0, imax = files.length; i < imax; i++) {
            f = new pymFsUploaderService.createPymFile(files[i]);
            if (self.queue[files[i].name]) {
                f.setState(FILE_STATES.VALIDATION_ERROR);
                f.validationMessage = 'File with this name already in queue';
                f.key = f.file.name + new Date();
            } else {
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
        //$log.log('progress: ' + n + '% file :'+ evt.config.file.name);
        //$log.log('progress-evt: ', evt);
        //$log.log('progress-this: ', this);
        this.progress = n;
    };

    //ctrl.cbSuccess = function (data, status, headers, config) {
    //    // file is uploaded successfully
    //    $log.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
    //    //this.setState(FILE_STATES.UPLOAD_OK);
    //};

    ctrl.startUpload = function () {
        var self = this,
            p,
            fProgress; //, fSuccess;
        angular.forEach(self.queue, function (f) {
            if (f.state === FILE_STATES.CAN_UPLOAD) {
                $log.log('starting upload of', f.file.name, f);
                // Bind the callbacks to the individual PymFile, so that
                // their 'this' points to the PymFile instance.
                fProgress = angular.bind(f, self.cbProgress);
                //fSuccess = angular.bind(f, self.cbSuccess);
                p = pymFsUploaderService.upload(pymFsService.getPathStr(), f).progress(fProgress);
                //.success(fSuccess);
            }
        });
    };

    ctrl.cancel = function (file) {
        file.abort();
    };

    /**
     * Checks given mime-type against pattern from ``allow`` and ``deny``
     * and returns true if mime-type is allowed, false otherwise.
     */
    ctrl.checkType = function (ty) {
        var self = this,
            i,
            imax,
            pat,
            good;
        if (!ty) {
            ty = 'application/octet-stream';
        }
        ty = ty.split('/');
        $log.log(ty);
        // Is given mime type allowed?
        good = false;
        for (i = 0, imax = self.allow.length; i < imax; i++) {
            pat = self.allow[i];
            if (pat.search(/\*/) > -1 && pat.search(/\.\*/) === -1) {
                pat = pat.replace(/\*/g, '.*');
            }
            pat = pat.split('/');
            if (ty[0].search(pat[0]) > -1 && ty[1].search(pat[1]) > -1) {
                good = true;
                break;
            }
        }
        if (!good) {
            return false;
        }
        // Is given mime type denied?
        for (i = 0, imax = self.deny.length; i < imax; i++) {
            pat = self.deny[i];
            if (pat.search(/\*/) > -1 && pat.search(/\.\*/) === -1) {
                pat = pat.replace(/\*/g, '.*');
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
        return sz >= this.minSize && sz <= this.maxSize;
    };

    //function init() {
    //    var i, f;
    //    for (i=0; i<10; i++) {
    //        f = new pymFsUploaderService.createPymFile({
    //            name: 'dfdsffs sdfsgdfg fgsfgfdg sdfgfdg sdfgs dfg sdfg dfgsdfdg sdfgdfgs dfg d dsdgfsfdsg',
    //            size: 6523856653,
    //            type: 'stuff/sample'
    //                        });
    //        f.setState(i % 2 === 0 ? FILE_STATES.UPLOAD_ERROR : FILE_STATES.CAN_UPLOAD);
    //        f.validationMessage = 'blah bölddf erwe';
    //        ctrl.queue[i] = f;
    //    }
    //    ctrl.windowIsOpen = true;
    //}
    //
    ///*
    //* Run immediately
    //*/
    //init();
}]);
//# sourceMappingURL=uploader-controller.js.map
