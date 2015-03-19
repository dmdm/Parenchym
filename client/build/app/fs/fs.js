angular.module("pym.fs", []);
angular.module('pym.fs')
    .constant('FILE_STATES', {
        'NEW':                 0,
        'VALIDATING':         10,
        'VALIDATION_OK':      20,
        'VALIDATION_ERROR':  -20,
        'CAN_UPLOAD':         70,
        'UPLOADING':          80,
        'UPLOAD_OK':          90,
        'UPLOAD_ERROR':      -90,
        'UPLOAD_CANCELED':  -100
    })
    .constant('FILE_STATE_CAPTIONS', {
           '0' : 'New (0)',
          '10' : 'Validating (10)',
          '20' : 'Validation OK (20)',
         '-20' : 'Validation Error (-20)',
          '70' : 'Can Upload (70)',
          '80' : 'Uploading (80)',
          '90' : 'Upload OK (90)',
         '-90' : 'Upload Error (-90)',
        '-100' : 'Upload Canceled (-100)'
    });

angular.module('pym.fs').factory('pymFsService',
        ['$log', '$http', '$window', 'RC', 'pymService',
function ($log,   $http,   $window,   RC,   pym) {

    "use strict";

    var FsService = {
        tree: null,
        browser: null,

        rootPathStr: '',
        path: [],

        overwrite: false,
        includeDeleted: false,

        getPath: function () {
            return this.path;
        },

        getPathStr: function () {
            return this.pathToStr(this.path);
        },

        setPath: function (path) {
            this.path = path;
            this.tree.setPath(path);
            this.browser.setPath(path);
        },

        getLeafNode: function () {
            return this.path[this.path.length-1];
        },

        /**
         * Toggles flag includeDeleted and changes path intelligently.
         *
         * If user currently is in a deleted node and decides to not
         * display deleted items anymore, returns to the first not-deleted
         * ancestor.
         *
         * Also reloads tree and browser!
         */
        toggleIncludeDeleted: function () {
            var pp = this.path, p0 = pp[0];
            this.includeDeleted = !this.includeDeleted;
            if (this.getLeafNode().is_deleted && !this.includeDeleted) {
                while (pp.length && pp[pp.length-1].is_deleted) {
                    pp.pop();
                }
                // Make sure, we at least stay on the root node
                if (! pp.length) { pp.push(p0); }
                this.setPath(pp);
            }
            else {
                this.tree.refresh();
                this.browser.refresh();
            }
        },

        /**
         * Initialises Fs by a path string.
         *
         * 1. The page controller calls us with the path string.
         * 2a. We call the browser to load the items of the root path.
         * 2b. Concurrently we call the tree, which loads the initial node tree
         *     and sets up the path as a list of nodes.
         * 3. When the tree has loaded and its path is set up, we grab the path
         *    from there for ourselves and also provide the browser with it.
         *
         * @param {string} pathStr - Root path of tree as string.
         */
        firstLoad: function (pathStr) {
            var self = this;
            this.rootPathStr = pathStr;
            $log.log('firstLoad', this.pathToStr(this.path),  this.rootPathStr);
            this.browser.loadItems();
            this.tree.initNodes()
            .then(function (resp) {
                self.path = self.tree.path;
                self.browser.path = self.path;
            });
        },

        createDirectory: function (dirName) {
            var httpConfig = {},
                postData = {
                    name: dirName,
                    path: this.pathToStr(this.path)
                };
            return $http.post(RC.urls.create_directory, postData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // Noop
                    }
                    Pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        deleteItems: function (names, reason) {
            var httpConfig = {
                params: {
                    path: this.pathToStr(this.path),
                    names: names,
                    reason: reason
                }
            };
            return $http.delete(RC.urls.delete_items, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // NOOP
                    }
                    Pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        undeleteItems: function (names) {
            var httpConfig = {},
                putData = {
                    path: this.pathToStr(this.path),
                    names: names
                };
            return $http.put(RC.urls.undelete_items, putData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // NOOP
                    }
                    Pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        loadItems: function () {
            var httpConfig = {
                params: {
                    path: this.pathToStr(this.path) || this.rootPathStr,
                    incdel: this.includeDeleted
                }
            };
            return $http.get(RC.urls.load_items, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // noop
                    }
                    else {
                        Pym.growler.growlAjaxResp(resp.data);
                    }
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        loadTree: function (filter) {
            var httpConfig = {
                params: {
                    path: this.rootPathStr,
                    filter: filter,
                    incdel: this.includeDeleted
                }
            };
            return $http.get(RC.urls.load_tree, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // noop
                    }
                    else {
                        Pym.growler.growlAjaxResp(resp.data);
                    }
                    return resp;
                },
                function (result) {
                    return result;
                }
            );
        },

        loadFsProperties: function () {
            var httpConfig = {params: {}};
            return $http.get(RC.urls.load_fs_properties, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        return resp;
                    }
                    else {
                        Pym.growler.growlAjaxResp(resp.data);
                        return false;
                    }
                },
                function (result) {
                    return result;
                }
            );
        },

        loadItemProperties: function (name) {
            var httpConfig = {
                params: {
                    path: this.pathToStr(this.path),
                    name: name
                }
            };
            return $http.get(RC.urls.load_item_properties, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        return resp;
                    }
                    else {
                        Pym.growler.growlAjaxResp(resp.data);
                        return false;
                    }
                },
                function (result) {
                    return result;
                }
            );
        },

        buildDownloadUrl: function (name) {
            var pp, s;
            // Make local copy of original path
            pp = this.path.slice();
            // Remove filesystem root, because browser is already there:
            // http://HOST:PORT/TENANT/fs/@@_br_
            if (pp[0].name === 'fs') { pp.shift(); }
            // Stringify path and append name
            s = pp.length ? this.pathToStr(pp) + '/' + name : name;
            // Get current url and apply our path string
            return $window.location.href.replace(/@@_br_/, s);
        },

        pathToStr: function (path) {
            if (! (angular.isArray(path) && path.length > 0)) { return null; }
            var pp = [];
            angular.forEach(
                path, function (x) {
                    pp.push(x.name);
                }
            );
            return pp.join('/');
        }
    };

    return FsService;
}]);
angular.module('pym.fs').factory('pymFsUploaderService',
        ['$log', '$upload', '$http', 'RC', 'pymService', 'FILE_STATES', 'FILE_STATE_CAPTIONS',
function ($log,   $upload,   $http,   RC,   pym,          FILE_STATES,   FILE_STATE_CAPTIONS) {

    "use strict";


    function PymFile(file) {
        this.file = file;
        this.state = 0;
        this.stateCaption = null;
        this.key = null;
        this.progress = 0;
        this.validationPromise = null;
        this.validationMessage = null;
        this.uploadPromise = null;
        this.isActive = false;
        this.isUploading = false;
        this.hasError = false;
        this.exists = false;
        this.permissions = null;
        this.writeMode = null;
    }

    PymFile.prototype.setState = function(state) {
        this.state = state;
        this.stateCaption = FILE_STATE_CAPTIONS[state];
        this.isActive = (this.state > FILE_STATES.NEW &&
            this.state < FILE_STATES.UPLOAD_OK);
        this.isUploading = (this.state === FILE_STATES.UPLOADING);
        this.hasError = (this.state > FILE_STATES.UPLOAD_CANCELED &&
            this.state < FILE_STATES.NEW);
        $log.log('state', state, this.stateCaption, this);
    };

    PymFile.prototype.setWriteMode = function(writeMode) {
        this.writeMode = writeMode;
        this.setState(FILE_STATES.CAN_UPLOAD);
    };

    PymFile.prototype.abort = function () {
        if (this.uploadPromise) { this.uploadPromise.abort(); }
        this.setState(FILE_STATES.UPLOAD_CANCELED);
    };


    var UploaderService = {

        createPymFile: function (file) {
            return new PymFile(file);
        },

        /**
         * Performs upload of a file and returns promise.
         *
         * @param {string} pathStr - Path where to save the file
         * @param {PymFile} file - Instance of a PymFile
         * @returns {promise}
         */
        upload: function (pathStr, file) {
            var uploadConf = {
                    url: RC.urls.upload,
                    file: file.file,
                    data: {
                        path: pathStr,
                        write_mode: file.writeMode
                    },
                    headers: {
                        'content-type': file.file.type
                    }

                    /*
                     method: 'POST', // 'POST' or 'PUT', default POST

                     headers: {}, // {'Authorization': 'xxx'} only for html5

                     fileName: null, //'doc.jpg' or ['1.jpg', '2.jpg', ...],  to modify the name of the file(s)

                     // file formData name ('Content-Disposition'), server side request form name could be
                     // an array  of names for multiple files (html5). Default is 'file'
                     fileFormDataName: 'file', // 'myFile' or ['file[0]', 'file[1]', ...],

                     // map of extra form data fields to send along with file. each field will be sent as a form field.
                     // The values are converted to json string or jsob blob depending on 'sendObjectsAsJsonBlob' option.
                     fields: null, // {key: $scope.myValue, ...},

                     // if the value of a form field is an object it will be sent as 'application/json' blob
                     // rather than json string, default false.
                     sendObjectsAsJsonBlob: false, // true|false,

                     // customize how data is added to the formData. See #40#issuecomment-28612000 for sample code.
                     formDataAppender: function(formData, key, val){},

                     // data will be sent as a separate form data field called "data". It will be converted to json string
                     // or jsob blob depending on 'sendObjectsAsJsonBlob' option
                     data: {},

                     withCredentials: false, //true|false,

                     // ... and all other angular $http() options could be used here.
                     */
                },
                p;

            p = $upload.upload(uploadConf)
            .error(function (data, status, headers, config) {
                file.setState(FILE_STATES.UPLOAD_ERROR);
                file.validationMessage = data;
            });
            file.uploadPromise = p;
            file.setState(FILE_STATES.UPLOADING);
            return p;

            /* then promise (note that returned promise doesn't have progress, xhr and cancel functions. */
            // var promise = upload.then(success, error, progress);

            /* cancel/abort the upload in progress. */
            //upload.abort();

            /* alternative way of uploading, send the file binary with the file's content-type.
             Could be used to upload files to CouchDB, imgur, etc... html5 FileReader is needed.
             It could also be used to monitor the progress of a normal http post/put request.
             Note that the whole file will be loaded in browser first so large files could crash the browser.
             You should verify the file size before uploading with $upload.http().
             */
            //$upload.http({...})  // See 88#issuecomment-31366487 for sample code.
        },

        /**
         * Validates fileList on server side.
         *
         * Put each file with state VALIDATING in one request. Response data must
         * be a hash: key is file's key, value is 'ok' or validation message.
         * Communication with server is a POST request, on success we set the state
         * of each file as responded. On error, we set state to UPLOAD_ERROR.
         *
         * @param {string} pathStr - Path as list of nodes.
         * @param {list} fileList - List of instances of PymFile.
         * @returns {promise}
         */
        validateFiles: function (pathStr, fileList) {
            var httpConfig = {}, postData = {},
                ff = [];
            $log.log('fileList to validate', fileList);
            angular.forEach(
                fileList, function (v) {
                    if (v.state === FILE_STATES.VALIDATING) {
                        ff.push(
                            {
                                key: v.key,
                                filename: v.file.name,
                                size: v.file.size,
                                mime_type: v.file.type
                            }
                        );
                    }
                }
            );
            postData.path = pathStr;
            postData.files = ff;
            return $http.post(RC.urls.validate_files, postData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        angular.forEach(
                            resp.data.data, function (v, k) {
                                if (v.ok) {
                                    fileList[k].exists = v.exists;
                                    fileList[k].permissions = v.permissions;
                                    if (! v.exists && v.permissions.create) {
                                        fileList[k].setState(FILE_STATES.CAN_UPLOAD);
                                    }
                                    else {
                                        fileList[k].setState(FILE_STATES.VALIDATION_OK);
                                    }
                                }
                                else {
                                    fileList[k].setState(FILE_STATES.VALIDATION_ERROR);
                                    fileList[k].validationMessage = v.validation_msg;
                                }
                            }
                        );
                    }
                    else {
                        pym.growler.growlAjaxResp(resp.data);
                        angular.forEach(
                            fileList, function (v, k) {
                                if (v.state === FILE_STATES.VALIDATING) {
                                    fileList[k].setState(FILE_STATES.VALIDATION_ERROR);
                                    fileList[k].validationMessage = 'Unknown error';
                                }
                            }
                        );
                    }
                    return resp;
                }, function (result) {
                    angular.forEach(
                        fileList, function (v, k) {
                            if (v.state === FILE_STATES.VALIDATING) {
                                fileList[k].setState(FILE_STATES.VALIDATION_ERROR);
                                fileList[k].validationMessage = 'Network error';
                            }
                        }
                    );
                    return result;
                }
            );
        },

    };
    return UploaderService;
}]);

angular.module('pym.fs').controller('pymFsUploaderController',
        ['$scope', '$window', '$log', 'T', 'pymService', 'pymFsService', 'pymFsUploaderService', 'FILE_STATES', '$q',
function ($scope,   $window,   $log,   T,   pym,          pymFsService,   pymFsUploaderService,   FILE_STATES,   $q) {

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
        var n = 0, e = 0, u = 0, p = 0, len = 0;
        angular.forEach(ctrl.queue, function (f) {
            if (f.isActive) { ++n; }
            if (f.hasError) { ++e; }
            if (f.isUploading) { ++u; }
            p += f.progress;
            ++len;
        });
        ctrl.activeUploads = n;
        ctrl.errors = e;
        ctrl.uploading = u;
        if (len !== 0) {
            ctrl.totalProgress = parseInt(p / len);
        }
    };

    $scope.$watch(ctrl.countActiveUploads, function (newValue, oldValue) {
        angular.noop();
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
            return pym.growler.confirm(T.confirm_cancel_all_uploads)
            .then(
                function () {
                    angular.forEach(ctrl.queue, function (f) {
                        f.abort();
                    });
                }
            );
        }
        else {
            return $q.defer().resolve();
        }
    };

    ctrl.closeWindow = function () {

        function doIt () {
            ctrl.clearQueue();
            ctrl.windowIsOpen = false;
        }

        if (ctrl.activeUploads) {
            ctrl.cancelAll().then(doIt);
        }
        else {
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
            i, imax, f,
            myQueue = {};
        if (! (files && files.length > 0)) { return; }
        ctrl.windowIsOpen = true;
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
        //$log.log('progress: ' + n + '% file :'+ evt.config.file.name);
        //$log.log('progress-evt: ', evt);
        //$log.log('progress-this: ', this);
        this.progress = n;
    };

    ctrl.cbSuccess = function (data, status, headers, config) {
        // file is uploaded successfully
        //$log.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
        this.setState(FILE_STATES.UPLOAD_OK);
    };

    ctrl.startUpload = function () {
        var self = this,
            p,
            fProgress, fSuccess;
        angular.forEach(self.queue, function(f) {
            if (f.state === FILE_STATES.CAN_UPLOAD) {
                $log.log('starting upload of', f.file.name, f);
                // Bind the callbacks to the individual PymFile, so that
                // their 'this' points to the PymFile instance.
                fProgress = angular.bind(f, self.cbProgress);
                fSuccess = angular.bind(f, self.cbSuccess);
                p = pymFsUploaderService.upload(pymFsService.getPathStr(), f)
                    .progress(fProgress)
                    .success(fSuccess);
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
            f.setState(i % 2 === 0 ? FILE_STATES.UPLOAD_ERROR : FILE_STATES.CAN_UPLOAD);
            f.validationMessage = 'blah bölddf erwe';
            ctrl.queue[i] = f;
        }
        ctrl.windowIsOpen = true;
    }

    /*
    * Run immediately
    */
    init();

}]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZzLmpzIiwiZnMtY29uc3QuanMiLCJmcy1zZXJ2aWNlLmpzIiwidXBsb2FkZXItc2VydmljZS5qcyIsInVwbG9hZGVyLWNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImZzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJweW0uZnNcIiwgW10pOyIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKVxuICAgIC5jb25zdGFudCgnRklMRV9TVEFURVMnLCB7XG4gICAgICAgICdORVcnOiAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgJ1ZBTElEQVRJTkcnOiAgICAgICAgIDEwLFxuICAgICAgICAnVkFMSURBVElPTl9PSyc6ICAgICAgMjAsXG4gICAgICAgICdWQUxJREFUSU9OX0VSUk9SJzogIC0yMCxcbiAgICAgICAgJ0NBTl9VUExPQUQnOiAgICAgICAgIDcwLFxuICAgICAgICAnVVBMT0FESU5HJzogICAgICAgICAgODAsXG4gICAgICAgICdVUExPQURfT0snOiAgICAgICAgICA5MCxcbiAgICAgICAgJ1VQTE9BRF9FUlJPUic6ICAgICAgLTkwLFxuICAgICAgICAnVVBMT0FEX0NBTkNFTEVEJzogIC0xMDBcbiAgICB9KVxuICAgIC5jb25zdGFudCgnRklMRV9TVEFURV9DQVBUSU9OUycsIHtcbiAgICAgICAgICAgJzAnIDogJ05ldyAoMCknLFxuICAgICAgICAgICcxMCcgOiAnVmFsaWRhdGluZyAoMTApJyxcbiAgICAgICAgICAnMjAnIDogJ1ZhbGlkYXRpb24gT0sgKDIwKScsXG4gICAgICAgICAnLTIwJyA6ICdWYWxpZGF0aW9uIEVycm9yICgtMjApJyxcbiAgICAgICAgICAnNzAnIDogJ0NhbiBVcGxvYWQgKDcwKScsXG4gICAgICAgICAgJzgwJyA6ICdVcGxvYWRpbmcgKDgwKScsXG4gICAgICAgICAgJzkwJyA6ICdVcGxvYWQgT0sgKDkwKScsXG4gICAgICAgICAnLTkwJyA6ICdVcGxvYWQgRXJyb3IgKC05MCknLFxuICAgICAgICAnLTEwMCcgOiAnVXBsb2FkIENhbmNlbGVkICgtMTAwKSdcbiAgICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5mYWN0b3J5KCdweW1Gc1NlcnZpY2UnLFxuICAgICAgICBbJyRsb2cnLCAnJGh0dHAnLCAnJHdpbmRvdycsICdSQycsICdweW1TZXJ2aWNlJyxcbmZ1bmN0aW9uICgkbG9nLCAgICRodHRwLCAgICR3aW5kb3csICAgUkMsICAgcHltKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBGc1NlcnZpY2UgPSB7XG4gICAgICAgIHRyZWU6IG51bGwsXG4gICAgICAgIGJyb3dzZXI6IG51bGwsXG5cbiAgICAgICAgcm9vdFBhdGhTdHI6ICcnLFxuICAgICAgICBwYXRoOiBbXSxcblxuICAgICAgICBvdmVyd3JpdGU6IGZhbHNlLFxuICAgICAgICBpbmNsdWRlRGVsZXRlZDogZmFsc2UsXG5cbiAgICAgICAgZ2V0UGF0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQYXRoU3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRQYXRoOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgICAgIHRoaXMudHJlZS5zZXRQYXRoKHBhdGgpO1xuICAgICAgICAgICAgdGhpcy5icm93c2VyLnNldFBhdGgocGF0aCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0TGVhZk5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aC0xXTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVG9nZ2xlcyBmbGFnIGluY2x1ZGVEZWxldGVkIGFuZCBjaGFuZ2VzIHBhdGggaW50ZWxsaWdlbnRseS5cbiAgICAgICAgICpcbiAgICAgICAgICogSWYgdXNlciBjdXJyZW50bHkgaXMgaW4gYSBkZWxldGVkIG5vZGUgYW5kIGRlY2lkZXMgdG8gbm90XG4gICAgICAgICAqIGRpc3BsYXkgZGVsZXRlZCBpdGVtcyBhbnltb3JlLCByZXR1cm5zIHRvIHRoZSBmaXJzdCBub3QtZGVsZXRlZFxuICAgICAgICAgKiBhbmNlc3Rvci5cbiAgICAgICAgICpcbiAgICAgICAgICogQWxzbyByZWxvYWRzIHRyZWUgYW5kIGJyb3dzZXIhXG4gICAgICAgICAqL1xuICAgICAgICB0b2dnbGVJbmNsdWRlRGVsZXRlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHBwID0gdGhpcy5wYXRoLCBwMCA9IHBwWzBdO1xuICAgICAgICAgICAgdGhpcy5pbmNsdWRlRGVsZXRlZCA9ICF0aGlzLmluY2x1ZGVEZWxldGVkO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0TGVhZk5vZGUoKS5pc19kZWxldGVkICYmICF0aGlzLmluY2x1ZGVEZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBwLmxlbmd0aCAmJiBwcFtwcC5sZW5ndGgtMV0uaXNfZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBwcC5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlLCB3ZSBhdCBsZWFzdCBzdGF5IG9uIHRoZSByb290IG5vZGVcbiAgICAgICAgICAgICAgICBpZiAoISBwcC5sZW5ndGgpIHsgcHAucHVzaChwMCk7IH1cbiAgICAgICAgICAgICAgICB0aGlzLnNldFBhdGgocHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVlLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXIucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXNlcyBGcyBieSBhIHBhdGggc3RyaW5nLlxuICAgICAgICAgKlxuICAgICAgICAgKiAxLiBUaGUgcGFnZSBjb250cm9sbGVyIGNhbGxzIHVzIHdpdGggdGhlIHBhdGggc3RyaW5nLlxuICAgICAgICAgKiAyYS4gV2UgY2FsbCB0aGUgYnJvd3NlciB0byBsb2FkIHRoZSBpdGVtcyBvZiB0aGUgcm9vdCBwYXRoLlxuICAgICAgICAgKiAyYi4gQ29uY3VycmVudGx5IHdlIGNhbGwgdGhlIHRyZWUsIHdoaWNoIGxvYWRzIHRoZSBpbml0aWFsIG5vZGUgdHJlZVxuICAgICAgICAgKiAgICAgYW5kIHNldHMgdXAgdGhlIHBhdGggYXMgYSBsaXN0IG9mIG5vZGVzLlxuICAgICAgICAgKiAzLiBXaGVuIHRoZSB0cmVlIGhhcyBsb2FkZWQgYW5kIGl0cyBwYXRoIGlzIHNldCB1cCwgd2UgZ3JhYiB0aGUgcGF0aFxuICAgICAgICAgKiAgICBmcm9tIHRoZXJlIGZvciBvdXJzZWx2ZXMgYW5kIGFsc28gcHJvdmlkZSB0aGUgYnJvd3NlciB3aXRoIGl0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFN0ciAtIFJvb3QgcGF0aCBvZiB0cmVlIGFzIHN0cmluZy5cbiAgICAgICAgICovXG4gICAgICAgIGZpcnN0TG9hZDogZnVuY3Rpb24gKHBhdGhTdHIpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMucm9vdFBhdGhTdHIgPSBwYXRoU3RyO1xuICAgICAgICAgICAgJGxvZy5sb2coJ2ZpcnN0TG9hZCcsIHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksICB0aGlzLnJvb3RQYXRoU3RyKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5sb2FkSXRlbXMoKTtcbiAgICAgICAgICAgIHRoaXMudHJlZS5pbml0Tm9kZXMoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBzZWxmLnBhdGggPSBzZWxmLnRyZWUucGF0aDtcbiAgICAgICAgICAgICAgICBzZWxmLmJyb3dzZXIucGF0aCA9IHNlbGYucGF0aDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZURpcmVjdG9yeTogZnVuY3Rpb24gKGRpck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sXG4gICAgICAgICAgICAgICAgcG9zdERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGRpck5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoUkMudXJscy5jcmVhdGVfZGlyZWN0b3J5LCBwb3N0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb29wXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWxldGVJdGVtczogZnVuY3Rpb24gKG5hbWVzLCByZWFzb24pIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lczogbmFtZXMsXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbjogcmVhc29uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoUkMudXJscy5kZWxldGVfaXRlbXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9PUFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5kZWxldGVJdGVtczogZnVuY3Rpb24gKG5hbWVzKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHt9LFxuICAgICAgICAgICAgICAgIHB1dERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzOiBuYW1lc1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KFJDLnVybHMudW5kZWxldGVfaXRlbXMsIHB1dERhdGEsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9PUFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZEl0ZW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSB8fCB0aGlzLnJvb3RQYXRoU3RyLFxuICAgICAgICAgICAgICAgICAgICBpbmNkZWw6IHRoaXMuaW5jbHVkZURlbGV0ZWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfaXRlbXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRUcmVlOiBmdW5jdGlvbiAoZmlsdGVyKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5yb290UGF0aFN0cixcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIGluY2RlbDogdGhpcy5pbmNsdWRlRGVsZXRlZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF90cmVlLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRGc1Byb3BlcnRpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge3BhcmFtczoge319O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfZnNfcHJvcGVydGllcywgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZEl0ZW1Qcm9wZXJ0aWVzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfaXRlbV9wcm9wZXJ0aWVzLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBidWlsZERvd25sb2FkVXJsOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgdmFyIHBwLCBzO1xuICAgICAgICAgICAgLy8gTWFrZSBsb2NhbCBjb3B5IG9mIG9yaWdpbmFsIHBhdGhcbiAgICAgICAgICAgIHBwID0gdGhpcy5wYXRoLnNsaWNlKCk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgZmlsZXN5c3RlbSByb290LCBiZWNhdXNlIGJyb3dzZXIgaXMgYWxyZWFkeSB0aGVyZTpcbiAgICAgICAgICAgIC8vIGh0dHA6Ly9IT1NUOlBPUlQvVEVOQU5UL2ZzL0BAX2JyX1xuICAgICAgICAgICAgaWYgKHBwWzBdLm5hbWUgPT09ICdmcycpIHsgcHAuc2hpZnQoKTsgfVxuICAgICAgICAgICAgLy8gU3RyaW5naWZ5IHBhdGggYW5kIGFwcGVuZCBuYW1lXG4gICAgICAgICAgICBzID0gcHAubGVuZ3RoID8gdGhpcy5wYXRoVG9TdHIocHApICsgJy8nICsgbmFtZSA6IG5hbWU7XG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCB1cmwgYW5kIGFwcGx5IG91ciBwYXRoIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuICR3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9AQF9icl8vLCBzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXRoVG9TdHI6IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICBpZiAoISAoYW5ndWxhci5pc0FycmF5KHBhdGgpICYmIHBhdGgubGVuZ3RoID4gMCkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICAgIHZhciBwcCA9IFtdO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgIHBhdGgsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHBwLnB1c2goeC5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIHBwLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRnNTZXJ2aWNlO1xufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5mYWN0b3J5KCdweW1Gc1VwbG9hZGVyU2VydmljZScsXG4gICAgICAgIFsnJGxvZycsICckdXBsb2FkJywgJyRodHRwJywgJ1JDJywgJ3B5bVNlcnZpY2UnLCAnRklMRV9TVEFURVMnLCAnRklMRV9TVEFURV9DQVBUSU9OUycsXG5mdW5jdGlvbiAoJGxvZywgICAkdXBsb2FkLCAgICRodHRwLCAgIFJDLCAgIHB5bSwgICAgICAgICAgRklMRV9TVEFURVMsICAgRklMRV9TVEFURV9DQVBUSU9OUykge1xuXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cblxuICAgIGZ1bmN0aW9uIFB5bUZpbGUoZmlsZSkge1xuICAgICAgICB0aGlzLmZpbGUgPSBmaWxlO1xuICAgICAgICB0aGlzLnN0YXRlID0gMDtcbiAgICAgICAgdGhpcy5zdGF0ZUNhcHRpb24gPSBudWxsO1xuICAgICAgICB0aGlzLmtleSA9IG51bGw7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3MgPSAwO1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25Qcm9taXNlID0gbnVsbDtcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uTWVzc2FnZSA9IG51bGw7XG4gICAgICAgIHRoaXMudXBsb2FkUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc1VwbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc0Vycm9yID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBudWxsO1xuICAgICAgICB0aGlzLndyaXRlTW9kZSA9IG51bGw7XG4gICAgfVxuXG4gICAgUHltRmlsZS5wcm90b3R5cGUuc2V0U3RhdGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMuc3RhdGVDYXB0aW9uID0gRklMRV9TVEFURV9DQVBUSU9OU1tzdGF0ZV07XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSAodGhpcy5zdGF0ZSA+IEZJTEVfU1RBVEVTLk5FVyAmJlxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA8IEZJTEVfU1RBVEVTLlVQTE9BRF9PSyk7XG4gICAgICAgIHRoaXMuaXNVcGxvYWRpbmcgPSAodGhpcy5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVVBMT0FESU5HKTtcbiAgICAgICAgdGhpcy5oYXNFcnJvciA9ICh0aGlzLnN0YXRlID4gRklMRV9TVEFURVMuVVBMT0FEX0NBTkNFTEVEICYmXG4gICAgICAgICAgICB0aGlzLnN0YXRlIDwgRklMRV9TVEFURVMuTkVXKTtcbiAgICAgICAgJGxvZy5sb2coJ3N0YXRlJywgc3RhdGUsIHRoaXMuc3RhdGVDYXB0aW9uLCB0aGlzKTtcbiAgICB9O1xuXG4gICAgUHltRmlsZS5wcm90b3R5cGUuc2V0V3JpdGVNb2RlID0gZnVuY3Rpb24od3JpdGVNb2RlKSB7XG4gICAgICAgIHRoaXMud3JpdGVNb2RlID0gd3JpdGVNb2RlO1xuICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLkNBTl9VUExPQUQpO1xuICAgIH07XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMudXBsb2FkUHJvbWlzZSkgeyB0aGlzLnVwbG9hZFByb21pc2UuYWJvcnQoKTsgfVxuICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9DQU5DRUxFRCk7XG4gICAgfTtcblxuXG4gICAgdmFyIFVwbG9hZGVyU2VydmljZSA9IHtcblxuICAgICAgICBjcmVhdGVQeW1GaWxlOiBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQeW1GaWxlKGZpbGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtcyB1cGxvYWQgb2YgYSBmaWxlIGFuZCByZXR1cm5zIHByb21pc2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoU3RyIC0gUGF0aCB3aGVyZSB0byBzYXZlIHRoZSBmaWxlXG4gICAgICAgICAqIEBwYXJhbSB7UHltRmlsZX0gZmlsZSAtIEluc3RhbmNlIG9mIGEgUHltRmlsZVxuICAgICAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHVwbG9hZDogZnVuY3Rpb24gKHBhdGhTdHIsIGZpbGUpIHtcbiAgICAgICAgICAgIHZhciB1cGxvYWRDb25mID0ge1xuICAgICAgICAgICAgICAgICAgICB1cmw6IFJDLnVybHMudXBsb2FkLFxuICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLmZpbGUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGhTdHIsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV9tb2RlOiBmaWxlLndyaXRlTW9kZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudC10eXBlJzogZmlsZS5maWxlLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJywgLy8gJ1BPU1QnIG9yICdQVVQnLCBkZWZhdWx0IFBPU1RcblxuICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge30sIC8vIHsnQXV0aG9yaXphdGlvbic6ICd4eHgnfSBvbmx5IGZvciBodG1sNVxuXG4gICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZTogbnVsbCwgLy8nZG9jLmpwZycgb3IgWycxLmpwZycsICcyLmpwZycsIC4uLl0sICB0byBtb2RpZnkgdGhlIG5hbWUgb2YgdGhlIGZpbGUocylcblxuICAgICAgICAgICAgICAgICAgICAgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZSBjb3VsZCBiZVxuICAgICAgICAgICAgICAgICAgICAgLy8gYW4gYXJyYXkgIG9mIG5hbWVzIGZvciBtdWx0aXBsZSBmaWxlcyAoaHRtbDUpLiBEZWZhdWx0IGlzICdmaWxlJ1xuICAgICAgICAgICAgICAgICAgICAgZmlsZUZvcm1EYXRhTmFtZTogJ2ZpbGUnLCAvLyAnbXlGaWxlJyBvciBbJ2ZpbGVbMF0nLCAnZmlsZVsxXScsIC4uLl0sXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIG1hcCBvZiBleHRyYSBmb3JtIGRhdGEgZmllbGRzIHRvIHNlbmQgYWxvbmcgd2l0aCBmaWxlLiBlYWNoIGZpZWxkIHdpbGwgYmUgc2VudCBhcyBhIGZvcm0gZmllbGQuXG4gICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdmFsdWVzIGFyZSBjb252ZXJ0ZWQgdG8ganNvbiBzdHJpbmcgb3IganNvYiBibG9iIGRlcGVuZGluZyBvbiAnc2VuZE9iamVjdHNBc0pzb25CbG9iJyBvcHRpb24uXG4gICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IG51bGwsIC8vIHtrZXk6ICRzY29wZS5teVZhbHVlLCAuLi59LFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGUgdmFsdWUgb2YgYSBmb3JtIGZpZWxkIGlzIGFuIG9iamVjdCBpdCB3aWxsIGJlIHNlbnQgYXMgJ2FwcGxpY2F0aW9uL2pzb24nIGJsb2JcbiAgICAgICAgICAgICAgICAgICAgIC8vIHJhdGhlciB0aGFuIGpzb24gc3RyaW5nLCBkZWZhdWx0IGZhbHNlLlxuICAgICAgICAgICAgICAgICAgICAgc2VuZE9iamVjdHNBc0pzb25CbG9iOiBmYWxzZSwgLy8gdHJ1ZXxmYWxzZSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gY3VzdG9taXplIGhvdyBkYXRhIGlzIGFkZGVkIHRvIHRoZSBmb3JtRGF0YS4gU2VlICM0MCNpc3N1ZWNvbW1lbnQtMjg2MTIwMDAgZm9yIHNhbXBsZSBjb2RlLlxuICAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFBcHBlbmRlcjogZnVuY3Rpb24oZm9ybURhdGEsIGtleSwgdmFsKXt9LFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBkYXRhIHdpbGwgYmUgc2VudCBhcyBhIHNlcGFyYXRlIGZvcm0gZGF0YSBmaWVsZCBjYWxsZWQgXCJkYXRhXCIuIEl0IHdpbGwgYmUgY29udmVydGVkIHRvIGpzb24gc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgICAvLyBvciBqc29iIGJsb2IgZGVwZW5kaW5nIG9uICdzZW5kT2JqZWN0c0FzSnNvbkJsb2InIG9wdGlvblxuICAgICAgICAgICAgICAgICAgICAgZGF0YToge30sXG5cbiAgICAgICAgICAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2UsIC8vdHJ1ZXxmYWxzZSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLi4uIGFuZCBhbGwgb3RoZXIgYW5ndWxhciAkaHR0cCgpIG9wdGlvbnMgY291bGQgYmUgdXNlZCBoZXJlLlxuICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHA7XG5cbiAgICAgICAgICAgIHAgPSAkdXBsb2FkLnVwbG9hZCh1cGxvYWRDb25mKVxuICAgICAgICAgICAgLmVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SKTtcbiAgICAgICAgICAgICAgICBmaWxlLnZhbGlkYXRpb25NZXNzYWdlID0gZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZmlsZS51cGxvYWRQcm9taXNlID0gcDtcbiAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FESU5HKTtcbiAgICAgICAgICAgIHJldHVybiBwO1xuXG4gICAgICAgICAgICAvKiB0aGVuIHByb21pc2UgKG5vdGUgdGhhdCByZXR1cm5lZCBwcm9taXNlIGRvZXNuJ3QgaGF2ZSBwcm9ncmVzcywgeGhyIGFuZCBjYW5jZWwgZnVuY3Rpb25zLiAqL1xuICAgICAgICAgICAgLy8gdmFyIHByb21pc2UgPSB1cGxvYWQudGhlbihzdWNjZXNzLCBlcnJvciwgcHJvZ3Jlc3MpO1xuXG4gICAgICAgICAgICAvKiBjYW5jZWwvYWJvcnQgdGhlIHVwbG9hZCBpbiBwcm9ncmVzcy4gKi9cbiAgICAgICAgICAgIC8vdXBsb2FkLmFib3J0KCk7XG5cbiAgICAgICAgICAgIC8qIGFsdGVybmF0aXZlIHdheSBvZiB1cGxvYWRpbmcsIHNlbmQgdGhlIGZpbGUgYmluYXJ5IHdpdGggdGhlIGZpbGUncyBjb250ZW50LXR5cGUuXG4gICAgICAgICAgICAgQ291bGQgYmUgdXNlZCB0byB1cGxvYWQgZmlsZXMgdG8gQ291Y2hEQiwgaW1ndXIsIGV0Yy4uLiBodG1sNSBGaWxlUmVhZGVyIGlzIG5lZWRlZC5cbiAgICAgICAgICAgICBJdCBjb3VsZCBhbHNvIGJlIHVzZWQgdG8gbW9uaXRvciB0aGUgcHJvZ3Jlc3Mgb2YgYSBub3JtYWwgaHR0cCBwb3N0L3B1dCByZXF1ZXN0LlxuICAgICAgICAgICAgIE5vdGUgdGhhdCB0aGUgd2hvbGUgZmlsZSB3aWxsIGJlIGxvYWRlZCBpbiBicm93c2VyIGZpcnN0IHNvIGxhcmdlIGZpbGVzIGNvdWxkIGNyYXNoIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgIFlvdSBzaG91bGQgdmVyaWZ5IHRoZSBmaWxlIHNpemUgYmVmb3JlIHVwbG9hZGluZyB3aXRoICR1cGxvYWQuaHR0cCgpLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyR1cGxvYWQuaHR0cCh7Li4ufSkgIC8vIFNlZSA4OCNpc3N1ZWNvbW1lbnQtMzEzNjY0ODcgZm9yIHNhbXBsZSBjb2RlLlxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWYWxpZGF0ZXMgZmlsZUxpc3Qgb24gc2VydmVyIHNpZGUuXG4gICAgICAgICAqXG4gICAgICAgICAqIFB1dCBlYWNoIGZpbGUgd2l0aCBzdGF0ZSBWQUxJREFUSU5HIGluIG9uZSByZXF1ZXN0LiBSZXNwb25zZSBkYXRhIG11c3RcbiAgICAgICAgICogYmUgYSBoYXNoOiBrZXkgaXMgZmlsZSdzIGtleSwgdmFsdWUgaXMgJ29rJyBvciB2YWxpZGF0aW9uIG1lc3NhZ2UuXG4gICAgICAgICAqIENvbW11bmljYXRpb24gd2l0aCBzZXJ2ZXIgaXMgYSBQT1NUIHJlcXVlc3QsIG9uIHN1Y2Nlc3Mgd2Ugc2V0IHRoZSBzdGF0ZVxuICAgICAgICAgKiBvZiBlYWNoIGZpbGUgYXMgcmVzcG9uZGVkLiBPbiBlcnJvciwgd2Ugc2V0IHN0YXRlIHRvIFVQTE9BRF9FUlJPUi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhTdHIgLSBQYXRoIGFzIGxpc3Qgb2Ygbm9kZXMuXG4gICAgICAgICAqIEBwYXJhbSB7bGlzdH0gZmlsZUxpc3QgLSBMaXN0IG9mIGluc3RhbmNlcyBvZiBQeW1GaWxlLlxuICAgICAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHZhbGlkYXRlRmlsZXM6IGZ1bmN0aW9uIChwYXRoU3RyLCBmaWxlTGlzdCkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fSwgcG9zdERhdGEgPSB7fSxcbiAgICAgICAgICAgICAgICBmZiA9IFtdO1xuICAgICAgICAgICAgJGxvZy5sb2coJ2ZpbGVMaXN0IHRvIHZhbGlkYXRlJywgZmlsZUxpc3QpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgIGZpbGVMaXN0LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmYucHVzaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleTogdi5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVuYW1lOiB2LmZpbGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogdi5maWxlLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbWVfdHlwZTogdi5maWxlLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHBvc3REYXRhLnBhdGggPSBwYXRoU3RyO1xuICAgICAgICAgICAgcG9zdERhdGEuZmlsZXMgPSBmZjtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KFJDLnVybHMudmFsaWRhdGVfZmlsZXMsIHBvc3REYXRhLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwLmRhdGEuZGF0YSwgZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLmV4aXN0cyA9IHYuZXhpc3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10ucGVybWlzc2lvbnMgPSB2LnBlcm1pc3Npb25zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEgdi5leGlzdHMgJiYgdi5wZXJtaXNzaW9ucy5jcmVhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5DQU5fVVBMT0FEKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fT0spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS52YWxpZGF0aW9uTWVzc2FnZSA9IHYudmFsaWRhdGlvbl9tc2c7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0LCBmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS52YWxpZGF0aW9uTWVzc2FnZSA9ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdCwgZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX0VSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10udmFsaWRhdGlvbk1lc3NhZ2UgPSAnTmV0d29yayBlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICB9O1xuICAgIHJldHVybiBVcGxvYWRlclNlcnZpY2U7XG59XSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgncHltLmZzJykuY29udHJvbGxlcigncHltRnNVcGxvYWRlckNvbnRyb2xsZXInLFxuICAgICAgICBbJyRzY29wZScsICckd2luZG93JywgJyRsb2cnLCAnVCcsICdweW1TZXJ2aWNlJywgJ3B5bUZzU2VydmljZScsICdweW1Gc1VwbG9hZGVyU2VydmljZScsICdGSUxFX1NUQVRFUycsICckcScsXG5mdW5jdGlvbiAoJHNjb3BlLCAgICR3aW5kb3csICAgJGxvZywgICBULCAgIHB5bSwgICAgICAgICAgcHltRnNTZXJ2aWNlLCAgIHB5bUZzVXBsb2FkZXJTZXJ2aWNlLCAgIEZJTEVfU1RBVEVTLCAgICRxKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBjdHJsID0gdGhpcztcbiAgICBjdHJsLkZJTEVfU1RBVEVTID0gRklMRV9TVEFURVM7XG5cbiAgICAvLyBTdG9yYWdlIGZvciAkdXBsb2FkZXIgc2VydmljZVxuICAgIGN0cmwuZmlsZXMgPSBbXTtcbiAgICBjdHJsLnJlamVjdGVkRmlsZXMgPSBbXTtcbiAgICBjdHJsLmlzRHJvcEF2YWlsYWJsZSA9IG51bGw7XG5cbiAgICAvLyBFbnF1ZXVlZCBmaWxlcyB0byB2YWxpZGF0ZSBhbmQgdXBsb2FkXG4gICAgY3RybC5xdWV1ZSA9IHt9O1xuICAgIC8vIFNldmVyYWwgY291bnRlcnMsIHVwZGF0ZWQgYnkgY291bnRBY3RpdmVVcGxvYWRzIHdhdGNoZXJcbiAgICAvLyBBY3RpdmUgbWVhbnMgZWl0aGVyIHZhbGlkYXRpbmcgb3IgdXBsb2FkaW5nXG4gICAgY3RybC5hY3RpdmVVcGxvYWRzID0gMDtcbiAgICAvLyBWYWxpZGF0aW9uIGVycm9ycyArIHVwbG9hZCBlcnJvcnNcbiAgICBjdHJsLmVycm9ycyA9IDA7XG4gICAgLy8gVHJhbnNmZXJyaW5nIGRhdGFcbiAgICBjdHJsLnVwbG9hZGluZyA9IDA7XG4gICAgLy8gdG90YWwgcHJvZ3Jlc3NcbiAgICBjdHJsLnRvdGFsUHJvZ3Jlc3MgPSAwO1xuXG4gICAgY3RybC53aW5kb3dNYXhpbWl6ZWQgPSB0cnVlO1xuICAgIGN0cmwud2luZG93SXNPcGVuID0gZmFsc2U7XG5cbiAgICBjdHJsLmNvdW50QWN0aXZlVXBsb2FkcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG4gPSAwLCBlID0gMCwgdSA9IDAsIHAgPSAwLCBsZW4gPSAwO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY3RybC5xdWV1ZSwgZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgIGlmIChmLmlzQWN0aXZlKSB7ICsrbjsgfVxuICAgICAgICAgICAgaWYgKGYuaGFzRXJyb3IpIHsgKytlOyB9XG4gICAgICAgICAgICBpZiAoZi5pc1VwbG9hZGluZykgeyArK3U7IH1cbiAgICAgICAgICAgIHAgKz0gZi5wcm9ncmVzcztcbiAgICAgICAgICAgICsrbGVuO1xuICAgICAgICB9KTtcbiAgICAgICAgY3RybC5hY3RpdmVVcGxvYWRzID0gbjtcbiAgICAgICAgY3RybC5lcnJvcnMgPSBlO1xuICAgICAgICBjdHJsLnVwbG9hZGluZyA9IHU7XG4gICAgICAgIGlmIChsZW4gIT09IDApIHtcbiAgICAgICAgICAgIGN0cmwudG90YWxQcm9ncmVzcyA9IHBhcnNlSW50KHAgLyBsZW4pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goY3RybC5jb3VudEFjdGl2ZVVwbG9hZHMsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgYW5ndWxhci5ub29wKCk7XG4gICAgfSk7XG5cbiAgICBjdHJsLm1pbmltYXhXaW5kb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGN0cmwud2luZG93TWF4aW1pemVkID0gIWN0cmwud2luZG93TWF4aW1pemVkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDYW5jZWxzIGFsbCBhY3RpdmUgdXBsb2Fkcy5cbiAgICAgKlxuICAgICAqIExldHMgdXNlciBjb25maXJtLiBSZXNwb25zZSBpcyB0cmlnZ2VyZWQgYnkgYW4gZXZlbnQsIGlvdywgaXQgYXJyaXZlc1xuICAgICAqIGFzeW5jaHJvbm91c2x5LiAoV2UgdXNlIG91ciBvd24gZGlhbG9nLCBub3QgJHdpbmRvdy5jb25maXJtLilcbiAgICAgKlxuICAgICAqIFdlIG1heSBnZXQgY2FsbGVkIGZyb20gYW5vdGhlciBmdW5jdGlvbiAoY2xvc2VXaW5kb3cpLCBzbyByZXR1cm4gYSBwcm9taXNlXG4gICAgICogdG8gc2lnbmFsIHdoYXQgdGhlIHVzZXIgc2VsZWN0ZWQuXG4gICAgICpcbiAgICAgKiBJZiB0aGVyZSBhcmUgbm8gYWN0aXZlIGRvd25sb2Fkcywgd2UgZG8gbm90IGxldCB0aGUgdXNlciBjb25maXJtLiBTdGlsbFxuICAgICAqIHJldHVybiBhIHByb21pc2UsIGEgcmVzb2x2ZWQgb25lLCBzbyB0aGUgY2FsbGVyIGlzIGNsZWFyZWQgdG8gZG8gaGlzXG4gICAgICogdGhpbmcuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgKi9cbiAgICBjdHJsLmNhbmNlbEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGN0cmwuYWN0aXZlVXBsb2Fkcykge1xuICAgICAgICAgICAgcmV0dXJuIHB5bS5ncm93bGVyLmNvbmZpcm0oVC5jb25maXJtX2NhbmNlbF9hbGxfdXBsb2FkcylcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGN0cmwucXVldWUsIGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJHEuZGVmZXIoKS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC5jbG9zZVdpbmRvdyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBmdW5jdGlvbiBkb0l0ICgpIHtcbiAgICAgICAgICAgIGN0cmwuY2xlYXJRdWV1ZSgpO1xuICAgICAgICAgICAgY3RybC53aW5kb3dJc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdHJsLmFjdGl2ZVVwbG9hZHMpIHtcbiAgICAgICAgICAgIGN0cmwuY2FuY2VsQWxsKCkudGhlbihkb0l0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRvSXQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmZpbGVEcm9wcGVkID0gZnVuY3Rpb24gKCRmaWxlcywgJGV2ZW50LCAkcmVqZWN0ZWRGaWxlcykge1xuICAgICAgICAkbG9nLmxvZygnZHJvcHBlZCcsICRmaWxlcywgdGhpcy5maWxlcywgJGV2ZW50KTtcbiAgICAgICAgaWYgKCRmaWxlcyAmJiAkZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lbnF1ZXVlKCRmaWxlcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC5maWxlU2VsZWN0ZWQgPSBmdW5jdGlvbiAoJGZpbGVzLCAkZXZlbnQpIHtcbiAgICAgICAgJGxvZy5sb2coJ3NlbGVjdGVkJywgJGZpbGVzLCB0aGlzLmZpbGVzLCAkZXZlbnQpO1xuICAgICAgICBpZiAoJGZpbGVzICYmICRmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmVucXVldWUoJGZpbGVzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLnZhbGlkYXRlID0gZnVuY3Rpb24gKCRmaWxlKSB7XG4gICAgICAgICRsb2cubG9nKCdWYWxpZGF0aW5nIGZpbGUnLCAkZmlsZSk7XG4gICAgICAgIHJldHVybiAkZmlsZS50eXBlICE9PSAnYXVkaW8veC1hcGUnO1xuICAgIH07XG5cbiAgICBjdHJsLmNsZWFyUXVldWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwcm9wO1xuICAgICAgICBmb3IgKHByb3AgaW4gY3RybC5xdWV1ZSkge1xuICAgICAgICAgICAgaWYgKGN0cmwucXVldWUuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3RybC5xdWV1ZVtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmVucXVldWUgPSBmdW5jdGlvbiAoZmlsZXMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgaSwgaW1heCwgZixcbiAgICAgICAgICAgIG15UXVldWUgPSB7fTtcbiAgICAgICAgaWYgKCEgKGZpbGVzICYmIGZpbGVzLmxlbmd0aCA+IDApKSB7IHJldHVybjsgfVxuICAgICAgICBjdHJsLndpbmRvd0lzT3BlbiA9IHRydWU7XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PWZpbGVzLmxlbmd0aDsgaTxpbWF4OyBpKyspIHtcbiAgICAgICAgICAgIGYgPSBuZXcgcHltRnNVcGxvYWRlclNlcnZpY2UuY3JlYXRlUHltRmlsZShmaWxlc1tpXSk7XG4gICAgICAgICAgICBpZiAoc2VsZi5xdWV1ZVtmaWxlc1tpXS5uYW1lXSkge1xuICAgICAgICAgICAgICAgIGYuc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgZi52YWxpZGF0aW9uTWVzc2FnZSA9ICdGaWxlIHdpdGggdGhpcyBuYW1lIGFscmVhZHkgaW4gcXVldWUnO1xuICAgICAgICAgICAgICAgIGYua2V5ID0gZi5maWxlLm5hbWUgKyBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZi5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU5HKTtcbiAgICAgICAgICAgICAgICBzZWxmLnZhbGlkYXRlSGVyZShmKTtcbiAgICAgICAgICAgICAgICBmLmtleSA9IGYuZmlsZS5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXlRdWV1ZVtmLmtleV0gPSBmO1xuICAgICAgICAgICAgc2VsZi5xdWV1ZVtmLmtleV0gPSBmO1xuICAgICAgICB9XG4gICAgICAgIHB5bUZzVXBsb2FkZXJTZXJ2aWNlLnZhbGlkYXRlRmlsZXMocHltRnNTZXJ2aWNlLmdldFBhdGhTdHIoKSwgbXlRdWV1ZSk7XG4gICAgfTtcblxuICAgIGN0cmwudmFsaWRhdGVIZXJlID0gZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgLy8gVE9ETyBDaGVjayBxdW90YS4gSWYgdmlvbGF0aW9uLCBzZXQgc3RhdGUgYW5kIG1lc3NhZ2UsIGlmIG9rLCBrZWVwIHN0YXRlIGFzIFZBTElEQVRJTkdcbiAgICB9O1xuXG4gICAgY3RybC5jYlByb2dyZXNzID0gZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB2YXIgbiA9IHBhcnNlSW50KDEwMC4wICogZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG4gICAgICAgIC8vJGxvZy5sb2coJ3Byb2dyZXNzOiAnICsgbiArICclIGZpbGUgOicrIGV2dC5jb25maWcuZmlsZS5uYW1lKTtcbiAgICAgICAgLy8kbG9nLmxvZygncHJvZ3Jlc3MtZXZ0OiAnLCBldnQpO1xuICAgICAgICAvLyRsb2cubG9nKCdwcm9ncmVzcy10aGlzOiAnLCB0aGlzKTtcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IG47XG4gICAgfTtcblxuICAgIGN0cmwuY2JTdWNjZXNzID0gZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgIC8vIGZpbGUgaXMgdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5XG4gICAgICAgIC8vJGxvZy5sb2coJ2ZpbGUgJyArIGNvbmZpZy5maWxlLm5hbWUgKyAnaXMgdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5LiBSZXNwb25zZTogJyArIGRhdGEpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9PSyk7XG4gICAgfTtcblxuICAgIGN0cmwuc3RhcnRVcGxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIHAsXG4gICAgICAgICAgICBmUHJvZ3Jlc3MsIGZTdWNjZXNzO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goc2VsZi5xdWV1ZSwgZnVuY3Rpb24oZikge1xuICAgICAgICAgICAgaWYgKGYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLkNBTl9VUExPQUQpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnc3RhcnRpbmcgdXBsb2FkIG9mJywgZi5maWxlLm5hbWUsIGYpO1xuICAgICAgICAgICAgICAgIC8vIEJpbmQgdGhlIGNhbGxiYWNrcyB0byB0aGUgaW5kaXZpZHVhbCBQeW1GaWxlLCBzbyB0aGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlaXIgJ3RoaXMnIHBvaW50cyB0byB0aGUgUHltRmlsZSBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgICBmUHJvZ3Jlc3MgPSBhbmd1bGFyLmJpbmQoZiwgc2VsZi5jYlByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBmU3VjY2VzcyA9IGFuZ3VsYXIuYmluZChmLCBzZWxmLmNiU3VjY2Vzcyk7XG4gICAgICAgICAgICAgICAgcCA9IHB5bUZzVXBsb2FkZXJTZXJ2aWNlLnVwbG9hZChweW1Gc1NlcnZpY2UuZ2V0UGF0aFN0cigpLCBmKVxuICAgICAgICAgICAgICAgICAgICAucHJvZ3Jlc3MoZlByb2dyZXNzKVxuICAgICAgICAgICAgICAgICAgICAuc3VjY2VzcyhmU3VjY2Vzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjdHJsLmNhbmNlbCA9IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgIGZpbGUuYWJvcnQoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGdpdmVuIG1pbWUtdHlwZSBhZ2FpbnN0IHBhdHRlcm4gZnJvbSBgYGFsbG93YGAgYW5kIGBgZGVueWBgXG4gICAgICogYW5kIHJldHVybnMgdHJ1ZSBpZiBtaW1lLXR5cGUgaXMgYWxsb3dlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIGN0cmwuY2hlY2tUeXBlID0gZnVuY3Rpb24gKHR5KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGksIGltYXgsIHBhdCwgZ29vZDtcbiAgICAgICAgaWYgKCEgdHkpIHt0eSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO31cbiAgICAgICAgdHkgPSB0eS5zcGxpdCgnLycpO1xuICAgICAgICAkbG9nLmxvZyh0eSk7XG4gICAgICAgIC8vIElzIGdpdmVuIG1pbWUgdHlwZSBhbGxvd2VkP1xuICAgICAgICBnb29kID0gZmFsc2U7XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PXNlbGYuYWxsb3cubGVuZ3RoOyBpPGltYXg7IGkrKykge1xuICAgICAgICAgICAgcGF0ID0gc2VsZi5hbGxvd1tpXTtcbiAgICAgICAgICAgIGlmIChwYXQuc2VhcmNoKC9cXCovKSA+IC0xICYmIHBhdC5zZWFyY2goL1xcLlxcKi8pID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHBhdCA9IHBhdC5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgICAvXFwqL2csXG4gICAgICAgICAgICAgICAgICAgICcuKidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGF0ID0gcGF0LnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBpZiAodHlbMF0uc2VhcmNoKHBhdFswXSkgPiAtMSAmJiB0eVsxXS5zZWFyY2gocGF0WzFdKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgZ29vZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEgZ29vZCkge3JldHVybiBmYWxzZTt9XG4gICAgICAgIC8vIElzIGdpdmVuIG1pbWUgdHlwZSBkZW5pZWQ/XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PXNlbGYuZGVueS5sZW5ndGg7IGk8aW1heDsgaSsrKSB7XG4gICAgICAgICAgICBwYXQgPSBzZWxmLmRlbnlbaV07XG4gICAgICAgICAgICBpZiAocGF0LnNlYXJjaCgvXFwqLykgPiAtMSAmJiBwYXQuc2VhcmNoKC9cXC5cXCovKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBwYXQgPSBwYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgICAgL1xcKi9nLFxuICAgICAgICAgICAgICAgICAgICAnLionXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhdCA9IHBhdC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgaWYgKHR5WzBdLnNlYXJjaChwYXRbMF0pID4gLTEgfHwgdHlbMV0uc2VhcmNoKHBhdFsxXSkgPiAtMSkge1xuICAgICAgICAgICAgICAgIGdvb2QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ29vZDtcbiAgICB9O1xuXG4gICAgY3RybC5jaGVja1NpemUgPSBmdW5jdGlvbiAoc3opIHtcbiAgICAgICAgcmV0dXJuIChzeiA+PSB0aGlzLm1pblNpemUgJiYgc3ogPD0gdGhpcy5tYXhTaXplKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgdmFyIGksIGY7XG4gICAgICAgIGZvciAoaT0wOyBpPDEwOyBpKyspIHtcbiAgICAgICAgICAgIGYgPSBuZXcgcHltRnNVcGxvYWRlclNlcnZpY2UuY3JlYXRlUHltRmlsZSh7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2RmZHNmZnMgc2Rmc2dkZmcgZmdzZmdmZGcgc2RmZ2ZkZyBzZGZncyBkZmcgc2RmZyBkZmdzZGZkZyBzZGZnZGZncyBkZmcgZCBkc2RnZnNmZHNnJyxcbiAgICAgICAgICAgICAgICBzaXplOiA2NTIzODU2NjUzLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHVmZi9zYW1wbGUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmLnNldFN0YXRlKGkgJSAyID09PSAwID8gRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SIDogRklMRV9TVEFURVMuQ0FOX1VQTE9BRCk7XG4gICAgICAgICAgICBmLnZhbGlkYXRpb25NZXNzYWdlID0gJ2JsYWggYsO2bGRkZiBlcndlJztcbiAgICAgICAgICAgIGN0cmwucXVldWVbaV0gPSBmO1xuICAgICAgICB9XG4gICAgICAgIGN0cmwud2luZG93SXNPcGVuID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKlxuICAgICogUnVuIGltbWVkaWF0ZWx5XG4gICAgKi9cbiAgICBpbml0KCk7XG5cbn1dKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==