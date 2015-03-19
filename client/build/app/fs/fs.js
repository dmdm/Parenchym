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

        onUploadFinished: null,

        refresh: function () {
            this.tree.refresh();
            this.browser.refresh();
        },

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

    PymFile.prototype.setExistsAndPermissions = function(exists, permissions) {
        this.exists = exists;
        this.permissions = permissions;
        if (!exists && permissions.create) {
            this.setWriteMode('create');
            this.setState(FILE_STATES.CAN_UPLOAD);
        }
        else {
            this.setState(FILE_STATES.VALIDATION_OK);
        }
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
                        key: file.key,
                        size: file.file.size,
                        path: pathStr,
                        write_mode: file.writeMode
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
            .success(function (data, status, headers, config) {
                                        $log.log('succ upl', data);
                if (data.ok) {
                    if (data.data[file.key].ok) {
                        file.setState(FILE_STATES.UPLOAD_OK);
                    }
                    else {
                        file.setState(FILE_STATES.UPLOAD_ERROR);
                        file.validationMessage = data.data[file.key].validation_msg;
                    }
                }
                else {
                    pym.growler.growlAjaxResp(data);
                    if (file.state === FILE_STATES.UPLOADING) {
                        file.setState(FILE_STATES.UPLOAD_ERROR);
                        file.validationMessage = 'Unknown error';
                    }
                }
            })
            .error(function (data, status, headers, config) {
                file.setState(FILE_STATES.UPLOAD_ERROR);
                file.validationMessage = status;
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
                                    fileList[k].setExistsAndPermissions(v.exists, v.permissions);
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

    //ctrl.cbSuccess = function (data, status, headers, config) {
    //    // file is uploaded successfully
    //    $log.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
    //    //this.setState(FILE_STATES.UPLOAD_OK);
    //};

    ctrl.startUpload = function () {
        var self = this,
            p,
            fProgress; //, fSuccess;
        angular.forEach(self.queue, function(f) {
            if (f.state === FILE_STATES.CAN_UPLOAD) {
                $log.log('starting upload of', f.file.name, f);
                // Bind the callbacks to the individual PymFile, so that
                // their 'this' points to the PymFile instance.
                fProgress = angular.bind(f, self.cbProgress);
                //fSuccess = angular.bind(f, self.cbSuccess);
                p = pymFsUploaderService.upload(pymFsService.getPathStr(), f)
                    .progress(fProgress);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZzLmpzIiwiZnMtY29uc3QuanMiLCJmcy1zZXJ2aWNlLmpzIiwidXBsb2FkZXItc2VydmljZS5qcyIsInVwbG9hZGVyLWNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImZzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJweW0uZnNcIiwgW10pOyIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKVxuICAgIC5jb25zdGFudCgnRklMRV9TVEFURVMnLCB7XG4gICAgICAgICdORVcnOiAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgJ1ZBTElEQVRJTkcnOiAgICAgICAgIDEwLFxuICAgICAgICAnVkFMSURBVElPTl9PSyc6ICAgICAgMjAsXG4gICAgICAgICdWQUxJREFUSU9OX0VSUk9SJzogIC0yMCxcbiAgICAgICAgJ0NBTl9VUExPQUQnOiAgICAgICAgIDcwLFxuICAgICAgICAnVVBMT0FESU5HJzogICAgICAgICAgODAsXG4gICAgICAgICdVUExPQURfT0snOiAgICAgICAgICA5MCxcbiAgICAgICAgJ1VQTE9BRF9FUlJPUic6ICAgICAgLTkwLFxuICAgICAgICAnVVBMT0FEX0NBTkNFTEVEJzogIC0xMDBcbiAgICB9KVxuICAgIC5jb25zdGFudCgnRklMRV9TVEFURV9DQVBUSU9OUycsIHtcbiAgICAgICAgICAgJzAnIDogJ05ldyAoMCknLFxuICAgICAgICAgICcxMCcgOiAnVmFsaWRhdGluZyAoMTApJyxcbiAgICAgICAgICAnMjAnIDogJ1ZhbGlkYXRpb24gT0sgKDIwKScsXG4gICAgICAgICAnLTIwJyA6ICdWYWxpZGF0aW9uIEVycm9yICgtMjApJyxcbiAgICAgICAgICAnNzAnIDogJ0NhbiBVcGxvYWQgKDcwKScsXG4gICAgICAgICAgJzgwJyA6ICdVcGxvYWRpbmcgKDgwKScsXG4gICAgICAgICAgJzkwJyA6ICdVcGxvYWQgT0sgKDkwKScsXG4gICAgICAgICAnLTkwJyA6ICdVcGxvYWQgRXJyb3IgKC05MCknLFxuICAgICAgICAnLTEwMCcgOiAnVXBsb2FkIENhbmNlbGVkICgtMTAwKSdcbiAgICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5mYWN0b3J5KCdweW1Gc1NlcnZpY2UnLFxuICAgICAgICBbJyRsb2cnLCAnJGh0dHAnLCAnJHdpbmRvdycsICdSQycsICdweW1TZXJ2aWNlJyxcbmZ1bmN0aW9uICgkbG9nLCAgICRodHRwLCAgICR3aW5kb3csICAgUkMsICAgcHltKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBGc1NlcnZpY2UgPSB7XG4gICAgICAgIHRyZWU6IG51bGwsXG4gICAgICAgIGJyb3dzZXI6IG51bGwsXG5cbiAgICAgICAgcm9vdFBhdGhTdHI6ICcnLFxuICAgICAgICBwYXRoOiBbXSxcblxuICAgICAgICBvdmVyd3JpdGU6IGZhbHNlLFxuICAgICAgICBpbmNsdWRlRGVsZXRlZDogZmFsc2UsXG5cbiAgICAgICAgb25VcGxvYWRGaW5pc2hlZDogbnVsbCxcblxuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnRyZWUucmVmcmVzaCgpO1xuICAgICAgICAgICAgdGhpcy5icm93c2VyLnJlZnJlc2goKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQYXRoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFBhdGhTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldFBhdGg6IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgICAgICAgICAgdGhpcy50cmVlLnNldFBhdGgocGF0aCk7XG4gICAgICAgICAgICB0aGlzLmJyb3dzZXIuc2V0UGF0aChwYXRoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRMZWFmTm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoLTFdO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUb2dnbGVzIGZsYWcgaW5jbHVkZURlbGV0ZWQgYW5kIGNoYW5nZXMgcGF0aCBpbnRlbGxpZ2VudGx5LlxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiB1c2VyIGN1cnJlbnRseSBpcyBpbiBhIGRlbGV0ZWQgbm9kZSBhbmQgZGVjaWRlcyB0byBub3RcbiAgICAgICAgICogZGlzcGxheSBkZWxldGVkIGl0ZW1zIGFueW1vcmUsIHJldHVybnMgdG8gdGhlIGZpcnN0IG5vdC1kZWxldGVkXG4gICAgICAgICAqIGFuY2VzdG9yLlxuICAgICAgICAgKlxuICAgICAgICAgKiBBbHNvIHJlbG9hZHMgdHJlZSBhbmQgYnJvd3NlciFcbiAgICAgICAgICovXG4gICAgICAgIHRvZ2dsZUluY2x1ZGVEZWxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcHAgPSB0aGlzLnBhdGgsIHAwID0gcHBbMF07XG4gICAgICAgICAgICB0aGlzLmluY2x1ZGVEZWxldGVkID0gIXRoaXMuaW5jbHVkZURlbGV0ZWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRMZWFmTm9kZSgpLmlzX2RlbGV0ZWQgJiYgIXRoaXMuaW5jbHVkZURlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAocHAubGVuZ3RoICYmIHBwW3BwLmxlbmd0aC0xXS5pc19kZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBwLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUsIHdlIGF0IGxlYXN0IHN0YXkgb24gdGhlIHJvb3Qgbm9kZVxuICAgICAgICAgICAgICAgIGlmICghIHBwLmxlbmd0aCkgeyBwcC5wdXNoKHAwKTsgfVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0UGF0aChwcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWUucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluaXRpYWxpc2VzIEZzIGJ5IGEgcGF0aCBzdHJpbmcuXG4gICAgICAgICAqXG4gICAgICAgICAqIDEuIFRoZSBwYWdlIGNvbnRyb2xsZXIgY2FsbHMgdXMgd2l0aCB0aGUgcGF0aCBzdHJpbmcuXG4gICAgICAgICAqIDJhLiBXZSBjYWxsIHRoZSBicm93c2VyIHRvIGxvYWQgdGhlIGl0ZW1zIG9mIHRoZSByb290IHBhdGguXG4gICAgICAgICAqIDJiLiBDb25jdXJyZW50bHkgd2UgY2FsbCB0aGUgdHJlZSwgd2hpY2ggbG9hZHMgdGhlIGluaXRpYWwgbm9kZSB0cmVlXG4gICAgICAgICAqICAgICBhbmQgc2V0cyB1cCB0aGUgcGF0aCBhcyBhIGxpc3Qgb2Ygbm9kZXMuXG4gICAgICAgICAqIDMuIFdoZW4gdGhlIHRyZWUgaGFzIGxvYWRlZCBhbmQgaXRzIHBhdGggaXMgc2V0IHVwLCB3ZSBncmFiIHRoZSBwYXRoXG4gICAgICAgICAqICAgIGZyb20gdGhlcmUgZm9yIG91cnNlbHZlcyBhbmQgYWxzbyBwcm92aWRlIHRoZSBicm93c2VyIHdpdGggaXQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoU3RyIC0gUm9vdCBwYXRoIG9mIHRyZWUgYXMgc3RyaW5nLlxuICAgICAgICAgKi9cbiAgICAgICAgZmlyc3RMb2FkOiBmdW5jdGlvbiAocGF0aFN0cikge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5yb290UGF0aFN0ciA9IHBhdGhTdHI7XG4gICAgICAgICAgICAkbG9nLmxvZygnZmlyc3RMb2FkJywgdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSwgIHRoaXMucm9vdFBhdGhTdHIpO1xuICAgICAgICAgICAgdGhpcy5icm93c2VyLmxvYWRJdGVtcygpO1xuICAgICAgICAgICAgdGhpcy50cmVlLmluaXROb2RlcygpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIHNlbGYucGF0aCA9IHNlbGYudHJlZS5wYXRoO1xuICAgICAgICAgICAgICAgIHNlbGYuYnJvd3Nlci5wYXRoID0gc2VsZi5wYXRoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlRGlyZWN0b3J5OiBmdW5jdGlvbiAoZGlyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fSxcbiAgICAgICAgICAgICAgICBwb3N0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogZGlyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChSQy51cmxzLmNyZWF0ZV9kaXJlY3RvcnksIHBvc3REYXRhLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vb3BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBQeW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlbGV0ZUl0ZW1zOiBmdW5jdGlvbiAobmFtZXMsIHJlYXNvbikge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzOiBuYW1lcyxcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uOiByZWFzb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShSQy51cmxzLmRlbGV0ZV9pdGVtcywgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOT09QXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1bmRlbGV0ZUl0ZW1zOiBmdW5jdGlvbiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sXG4gICAgICAgICAgICAgICAgcHV0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZXM6IG5hbWVzXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoUkMudXJscy51bmRlbGV0ZV9pdGVtcywgcHV0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOT09QXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2FkSXRlbXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpIHx8IHRoaXMucm9vdFBhdGhTdHIsXG4gICAgICAgICAgICAgICAgICAgIGluY2RlbDogdGhpcy5pbmNsdWRlRGVsZXRlZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF9pdGVtcywgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQeW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZFRyZWU6IGZ1bmN0aW9uIChmaWx0ZXIpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnJvb3RQYXRoU3RyLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IGZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgaW5jZGVsOiB0aGlzLmluY2x1ZGVEZWxldGVkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoUkMudXJscy5sb2FkX3RyZWUsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZEZzUHJvcGVydGllczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7cGFyYW1zOiB7fX07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF9mc19wcm9wZXJ0aWVzLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2FkSXRlbVByb3BlcnRpZXM6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF9pdGVtX3Byb3BlcnRpZXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQeW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGJ1aWxkRG93bmxvYWRVcmw6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICB2YXIgcHAsIHM7XG4gICAgICAgICAgICAvLyBNYWtlIGxvY2FsIGNvcHkgb2Ygb3JpZ2luYWwgcGF0aFxuICAgICAgICAgICAgcHAgPSB0aGlzLnBhdGguc2xpY2UoKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBmaWxlc3lzdGVtIHJvb3QsIGJlY2F1c2UgYnJvd3NlciBpcyBhbHJlYWR5IHRoZXJlOlxuICAgICAgICAgICAgLy8gaHR0cDovL0hPU1Q6UE9SVC9URU5BTlQvZnMvQEBfYnJfXG4gICAgICAgICAgICBpZiAocHBbMF0ubmFtZSA9PT0gJ2ZzJykgeyBwcC5zaGlmdCgpOyB9XG4gICAgICAgICAgICAvLyBTdHJpbmdpZnkgcGF0aCBhbmQgYXBwZW5kIG5hbWVcbiAgICAgICAgICAgIHMgPSBwcC5sZW5ndGggPyB0aGlzLnBhdGhUb1N0cihwcCkgKyAnLycgKyBuYW1lIDogbmFtZTtcbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHVybCBhbmQgYXBwbHkgb3VyIHBhdGggc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gJHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL0BAX2JyXy8sIHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBhdGhUb1N0cjogZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgICAgICAgIGlmICghIChhbmd1bGFyLmlzQXJyYXkocGF0aCkgJiYgcGF0aC5sZW5ndGggPiAwKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICAgICAgdmFyIHBwID0gW107XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgcGF0aCwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcHAucHVzaCh4Lm5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gcHAuam9pbignLycpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBGc1NlcnZpY2U7XG59XSk7IiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpLmZhY3RvcnkoJ3B5bUZzVXBsb2FkZXJTZXJ2aWNlJyxcbiAgICAgICAgWyckbG9nJywgJyR1cGxvYWQnLCAnJGh0dHAnLCAnUkMnLCAncHltU2VydmljZScsICdGSUxFX1NUQVRFUycsICdGSUxFX1NUQVRFX0NBUFRJT05TJyxcbmZ1bmN0aW9uICgkbG9nLCAgICR1cGxvYWQsICAgJGh0dHAsICAgUkMsICAgcHltLCAgICAgICAgICBGSUxFX1NUQVRFUywgICBGSUxFX1NUQVRFX0NBUFRJT05TKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuXG4gICAgZnVuY3Rpb24gUHltRmlsZShmaWxlKSB7XG4gICAgICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gICAgICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgICAgICB0aGlzLnN0YXRlQ2FwdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMua2V5ID0gbnVsbDtcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IDA7XG4gICAgICAgIHRoaXMudmFsaWRhdGlvblByb21pc2UgPSBudWxsO1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25NZXNzYWdlID0gbnVsbDtcbiAgICAgICAgdGhpcy51cGxvYWRQcm9taXNlID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzVXBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IG51bGw7XG4gICAgICAgIHRoaXMud3JpdGVNb2RlID0gbnVsbDtcbiAgICB9XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgdGhpcy5zdGF0ZUNhcHRpb24gPSBGSUxFX1NUQVRFX0NBUFRJT05TW3N0YXRlXTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9ICh0aGlzLnN0YXRlID4gRklMRV9TVEFURVMuTkVXICYmXG4gICAgICAgICAgICB0aGlzLnN0YXRlIDwgRklMRV9TVEFURVMuVVBMT0FEX09LKTtcbiAgICAgICAgdGhpcy5pc1VwbG9hZGluZyA9ICh0aGlzLnN0YXRlID09PSBGSUxFX1NUQVRFUy5VUExPQURJTkcpO1xuICAgICAgICB0aGlzLmhhc0Vycm9yID0gKHRoaXMuc3RhdGUgPiBGSUxFX1NUQVRFUy5VUExPQURfQ0FOQ0VMRUQgJiZcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPCBGSUxFX1NUQVRFUy5ORVcpO1xuICAgICAgICAkbG9nLmxvZygnc3RhdGUnLCBzdGF0ZSwgdGhpcy5zdGF0ZUNhcHRpb24sIHRoaXMpO1xuICAgIH07XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5zZXRXcml0ZU1vZGUgPSBmdW5jdGlvbih3cml0ZU1vZGUpIHtcbiAgICAgICAgdGhpcy53cml0ZU1vZGUgPSB3cml0ZU1vZGU7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoRklMRV9TVEFURVMuQ0FOX1VQTE9BRCk7XG4gICAgfTtcblxuICAgIFB5bUZpbGUucHJvdG90eXBlLnNldEV4aXN0c0FuZFBlcm1pc3Npb25zID0gZnVuY3Rpb24oZXhpc3RzLCBwZXJtaXNzaW9ucykge1xuICAgICAgICB0aGlzLmV4aXN0cyA9IGV4aXN0cztcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuICAgICAgICBpZiAoIWV4aXN0cyAmJiBwZXJtaXNzaW9ucy5jcmVhdGUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0V3JpdGVNb2RlKCdjcmVhdGUnKTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoRklMRV9TVEFURVMuQ0FOX1VQTE9BRCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fT0spO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIFB5bUZpbGUucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy51cGxvYWRQcm9taXNlKSB7IHRoaXMudXBsb2FkUHJvbWlzZS5hYm9ydCgpOyB9XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX0NBTkNFTEVEKTtcbiAgICB9O1xuXG5cbiAgICB2YXIgVXBsb2FkZXJTZXJ2aWNlID0ge1xuXG4gICAgICAgIGNyZWF0ZVB5bUZpbGU6IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFB5bUZpbGUoZmlsZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFBlcmZvcm1zIHVwbG9hZCBvZiBhIGZpbGUgYW5kIHJldHVybnMgcHJvbWlzZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhTdHIgLSBQYXRoIHdoZXJlIHRvIHNhdmUgdGhlIGZpbGVcbiAgICAgICAgICogQHBhcmFtIHtQeW1GaWxlfSBmaWxlIC0gSW5zdGFuY2Ugb2YgYSBQeW1GaWxlXG4gICAgICAgICAqIEByZXR1cm5zIHtwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgdXBsb2FkOiBmdW5jdGlvbiAocGF0aFN0ciwgZmlsZSkge1xuICAgICAgICAgICAgdmFyIHVwbG9hZENvbmYgPSB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogUkMudXJscy51cGxvYWQsXG4gICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUuZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBmaWxlLmtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGUuZmlsZS5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aFN0cixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX21vZGU6IGZpbGUud3JpdGVNb2RlXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsIC8vICdQT1NUJyBvciAnUFVUJywgZGVmYXVsdCBQT1NUXG5cbiAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9LCAvLyB7J0F1dGhvcml6YXRpb24nOiAneHh4J30gb25seSBmb3IgaHRtbDVcblxuICAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IG51bGwsIC8vJ2RvYy5qcGcnIG9yIFsnMS5qcGcnLCAnMi5qcGcnLCAuLi5dLCAgdG8gbW9kaWZ5IHRoZSBuYW1lIG9mIHRoZSBmaWxlKHMpXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIGZpbGUgZm9ybURhdGEgbmFtZSAoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKSwgc2VydmVyIHNpZGUgcmVxdWVzdCBmb3JtIG5hbWUgY291bGQgYmVcbiAgICAgICAgICAgICAgICAgICAgIC8vIGFuIGFycmF5ICBvZiBuYW1lcyBmb3IgbXVsdGlwbGUgZmlsZXMgKGh0bWw1KS4gRGVmYXVsdCBpcyAnZmlsZSdcbiAgICAgICAgICAgICAgICAgICAgIGZpbGVGb3JtRGF0YU5hbWU6ICdmaWxlJywgLy8gJ215RmlsZScgb3IgWydmaWxlWzBdJywgJ2ZpbGVbMV0nLCAuLi5dLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBtYXAgb2YgZXh0cmEgZm9ybSBkYXRhIGZpZWxkcyB0byBzZW5kIGFsb25nIHdpdGggZmlsZS4gZWFjaCBmaWVsZCB3aWxsIGJlIHNlbnQgYXMgYSBmb3JtIGZpZWxkLlxuICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHZhbHVlcyBhcmUgY29udmVydGVkIHRvIGpzb24gc3RyaW5nIG9yIGpzb2IgYmxvYiBkZXBlbmRpbmcgb24gJ3NlbmRPYmplY3RzQXNKc29uQmxvYicgb3B0aW9uLlxuICAgICAgICAgICAgICAgICAgICAgZmllbGRzOiBudWxsLCAvLyB7a2V5OiAkc2NvcGUubXlWYWx1ZSwgLi4ufSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlIHZhbHVlIG9mIGEgZm9ybSBmaWVsZCBpcyBhbiBvYmplY3QgaXQgd2lsbCBiZSBzZW50IGFzICdhcHBsaWNhdGlvbi9qc29uJyBibG9iXG4gICAgICAgICAgICAgICAgICAgICAvLyByYXRoZXIgdGhhbiBqc29uIHN0cmluZywgZGVmYXVsdCBmYWxzZS5cbiAgICAgICAgICAgICAgICAgICAgIHNlbmRPYmplY3RzQXNKc29uQmxvYjogZmFsc2UsIC8vIHRydWV8ZmFsc2UsXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIGN1c3RvbWl6ZSBob3cgZGF0YSBpcyBhZGRlZCB0byB0aGUgZm9ybURhdGEuIFNlZSAjNDAjaXNzdWVjb21tZW50LTI4NjEyMDAwIGZvciBzYW1wbGUgY29kZS5cbiAgICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhQXBwZW5kZXI6IGZ1bmN0aW9uKGZvcm1EYXRhLCBrZXksIHZhbCl7fSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gZGF0YSB3aWxsIGJlIHNlbnQgYXMgYSBzZXBhcmF0ZSBmb3JtIGRhdGEgZmllbGQgY2FsbGVkIFwiZGF0YVwiLiBJdCB3aWxsIGJlIGNvbnZlcnRlZCB0byBqc29uIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgLy8gb3IganNvYiBibG9iIGRlcGVuZGluZyBvbiAnc2VuZE9iamVjdHNBc0pzb25CbG9iJyBvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHt9LFxuXG4gICAgICAgICAgICAgICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlLCAvL3RydWV8ZmFsc2UsXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC4uLiBhbmQgYWxsIG90aGVyIGFuZ3VsYXIgJGh0dHAoKSBvcHRpb25zIGNvdWxkIGJlIHVzZWQgaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwO1xuXG4gICAgICAgICAgICBwID0gJHVwbG9hZC51cGxvYWQodXBsb2FkQ29uZilcbiAgICAgICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRsb2cubG9nKCdzdWNjIHVwbCcsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmRhdGFbZmlsZS5rZXldLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9PSyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnZhbGlkYXRpb25NZXNzYWdlID0gZGF0YS5kYXRhW2ZpbGUua2V5XS52YWxpZGF0aW9uX21zZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlVQTE9BRElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS52YWxpZGF0aW9uTWVzc2FnZSA9ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfRVJST1IpO1xuICAgICAgICAgICAgICAgIGZpbGUudmFsaWRhdGlvbk1lc3NhZ2UgPSBzdGF0dXM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZpbGUudXBsb2FkUHJvbWlzZSA9IHA7XG4gICAgICAgICAgICBmaWxlLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRElORyk7XG4gICAgICAgICAgICByZXR1cm4gcDtcblxuICAgICAgICAgICAgLyogdGhlbiBwcm9taXNlIChub3RlIHRoYXQgcmV0dXJuZWQgcHJvbWlzZSBkb2Vzbid0IGhhdmUgcHJvZ3Jlc3MsIHhociBhbmQgY2FuY2VsIGZ1bmN0aW9ucy4gKi9cbiAgICAgICAgICAgIC8vIHZhciBwcm9taXNlID0gdXBsb2FkLnRoZW4oc3VjY2VzcywgZXJyb3IsIHByb2dyZXNzKTtcblxuICAgICAgICAgICAgLyogY2FuY2VsL2Fib3J0IHRoZSB1cGxvYWQgaW4gcHJvZ3Jlc3MuICovXG4gICAgICAgICAgICAvL3VwbG9hZC5hYm9ydCgpO1xuXG4gICAgICAgICAgICAvKiBhbHRlcm5hdGl2ZSB3YXkgb2YgdXBsb2FkaW5nLCBzZW5kIHRoZSBmaWxlIGJpbmFyeSB3aXRoIHRoZSBmaWxlJ3MgY29udGVudC10eXBlLlxuICAgICAgICAgICAgIENvdWxkIGJlIHVzZWQgdG8gdXBsb2FkIGZpbGVzIHRvIENvdWNoREIsIGltZ3VyLCBldGMuLi4gaHRtbDUgRmlsZVJlYWRlciBpcyBuZWVkZWQuXG4gICAgICAgICAgICAgSXQgY291bGQgYWxzbyBiZSB1c2VkIHRvIG1vbml0b3IgdGhlIHByb2dyZXNzIG9mIGEgbm9ybWFsIGh0dHAgcG9zdC9wdXQgcmVxdWVzdC5cbiAgICAgICAgICAgICBOb3RlIHRoYXQgdGhlIHdob2xlIGZpbGUgd2lsbCBiZSBsb2FkZWQgaW4gYnJvd3NlciBmaXJzdCBzbyBsYXJnZSBmaWxlcyBjb3VsZCBjcmFzaCB0aGUgYnJvd3Nlci5cbiAgICAgICAgICAgICBZb3Ugc2hvdWxkIHZlcmlmeSB0aGUgZmlsZSBzaXplIGJlZm9yZSB1cGxvYWRpbmcgd2l0aCAkdXBsb2FkLmh0dHAoKS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8kdXBsb2FkLmh0dHAoey4uLn0pICAvLyBTZWUgODgjaXNzdWVjb21tZW50LTMxMzY2NDg3IGZvciBzYW1wbGUgY29kZS5cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmFsaWRhdGVzIGZpbGVMaXN0IG9uIHNlcnZlciBzaWRlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBQdXQgZWFjaCBmaWxlIHdpdGggc3RhdGUgVkFMSURBVElORyBpbiBvbmUgcmVxdWVzdC4gUmVzcG9uc2UgZGF0YSBtdXN0XG4gICAgICAgICAqIGJlIGEgaGFzaDoga2V5IGlzIGZpbGUncyBrZXksIHZhbHVlIGlzICdvaycgb3IgdmFsaWRhdGlvbiBtZXNzYWdlLlxuICAgICAgICAgKiBDb21tdW5pY2F0aW9uIHdpdGggc2VydmVyIGlzIGEgUE9TVCByZXF1ZXN0LCBvbiBzdWNjZXNzIHdlIHNldCB0aGUgc3RhdGVcbiAgICAgICAgICogb2YgZWFjaCBmaWxlIGFzIHJlc3BvbmRlZC4gT24gZXJyb3IsIHdlIHNldCBzdGF0ZSB0byBVUExPQURfRVJST1IuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoU3RyIC0gUGF0aCBhcyBsaXN0IG9mIG5vZGVzLlxuICAgICAgICAgKiBAcGFyYW0ge2xpc3R9IGZpbGVMaXN0IC0gTGlzdCBvZiBpbnN0YW5jZXMgb2YgUHltRmlsZS5cbiAgICAgICAgICogQHJldHVybnMge3Byb21pc2V9XG4gICAgICAgICAqL1xuICAgICAgICB2YWxpZGF0ZUZpbGVzOiBmdW5jdGlvbiAocGF0aFN0ciwgZmlsZUxpc3QpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sIHBvc3REYXRhID0ge30sXG4gICAgICAgICAgICAgICAgZmYgPSBbXTtcbiAgICAgICAgICAgICRsb2cubG9nKCdmaWxlTGlzdCB0byB2YWxpZGF0ZScsIGZpbGVMaXN0KTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICBmaWxlTGlzdCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZmLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6IHYua2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZTogdi5maWxlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IHYuZmlsZS5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW1lX3R5cGU6IHYuZmlsZS50eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwb3N0RGF0YS5wYXRoID0gcGF0aFN0cjtcbiAgICAgICAgICAgIHBvc3REYXRhLmZpbGVzID0gZmY7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChSQy51cmxzLnZhbGlkYXRlX2ZpbGVzLCBwb3N0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcC5kYXRhLmRhdGEsIGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2Lm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRFeGlzdHNBbmRQZXJtaXNzaW9ucyh2LmV4aXN0cywgdi5wZXJtaXNzaW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX0VSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnZhbGlkYXRpb25NZXNzYWdlID0gdi52YWxpZGF0aW9uX21zZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3QsIGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2LnN0YXRlID09PSBGSUxFX1NUQVRFUy5WQUxJREFUSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX0VSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnZhbGlkYXRpb25NZXNzYWdlID0gJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0LCBmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2LnN0YXRlID09PSBGSUxFX1NUQVRFUy5WQUxJREFUSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS52YWxpZGF0aW9uTWVzc2FnZSA9ICdOZXR3b3JrIGVycm9yJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgIH07XG4gICAgcmV0dXJuIFVwbG9hZGVyU2VydmljZTtcbn1dKTtcbiIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5jb250cm9sbGVyKCdweW1Gc1VwbG9hZGVyQ29udHJvbGxlcicsXG4gICAgICAgIFsnJHNjb3BlJywgJyR3aW5kb3cnLCAnJGxvZycsICdUJywgJ3B5bVNlcnZpY2UnLCAncHltRnNTZXJ2aWNlJywgJ3B5bUZzVXBsb2FkZXJTZXJ2aWNlJywgJ0ZJTEVfU1RBVEVTJywgJyRxJyxcbmZ1bmN0aW9uICgkc2NvcGUsICAgJHdpbmRvdywgICAkbG9nLCAgIFQsICAgcHltLCAgICAgICAgICBweW1Gc1NlcnZpY2UsICAgcHltRnNVcGxvYWRlclNlcnZpY2UsICAgRklMRV9TVEFURVMsICAgJHEpIHtcblxuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGN0cmwgPSB0aGlzO1xuICAgIGN0cmwuRklMRV9TVEFURVMgPSBGSUxFX1NUQVRFUztcblxuICAgIC8vIFN0b3JhZ2UgZm9yICR1cGxvYWRlciBzZXJ2aWNlXG4gICAgY3RybC5maWxlcyA9IFtdO1xuICAgIGN0cmwucmVqZWN0ZWRGaWxlcyA9IFtdO1xuICAgIGN0cmwuaXNEcm9wQXZhaWxhYmxlID0gbnVsbDtcblxuICAgIC8vIEVucXVldWVkIGZpbGVzIHRvIHZhbGlkYXRlIGFuZCB1cGxvYWRcbiAgICBjdHJsLnF1ZXVlID0ge307XG4gICAgLy8gU2V2ZXJhbCBjb3VudGVycywgdXBkYXRlZCBieSBjb3VudEFjdGl2ZVVwbG9hZHMgd2F0Y2hlclxuICAgIC8vIEFjdGl2ZSBtZWFucyBlaXRoZXIgdmFsaWRhdGluZyBvciB1cGxvYWRpbmdcbiAgICBjdHJsLmFjdGl2ZVVwbG9hZHMgPSAwO1xuICAgIC8vIFZhbGlkYXRpb24gZXJyb3JzICsgdXBsb2FkIGVycm9yc1xuICAgIGN0cmwuZXJyb3JzID0gMDtcbiAgICAvLyBUcmFuc2ZlcnJpbmcgZGF0YVxuICAgIGN0cmwudXBsb2FkaW5nID0gMDtcbiAgICAvLyB0b3RhbCBwcm9ncmVzc1xuICAgIGN0cmwudG90YWxQcm9ncmVzcyA9IDA7XG5cbiAgICBjdHJsLndpbmRvd01heGltaXplZCA9IHRydWU7XG4gICAgY3RybC53aW5kb3dJc09wZW4gPSBmYWxzZTtcblxuICAgIGN0cmwuY291bnRBY3RpdmVVcGxvYWRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbiA9IDAsIGUgPSAwLCB1ID0gMCwgcCA9IDAsIGxlbiA9IDA7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjdHJsLnF1ZXVlLCBmdW5jdGlvbiAoZikge1xuICAgICAgICAgICAgaWYgKGYuaXNBY3RpdmUpIHsgKytuOyB9XG4gICAgICAgICAgICBpZiAoZi5oYXNFcnJvcikgeyArK2U7IH1cbiAgICAgICAgICAgIGlmIChmLmlzVXBsb2FkaW5nKSB7ICsrdTsgfVxuICAgICAgICAgICAgcCArPSBmLnByb2dyZXNzO1xuICAgICAgICAgICAgKytsZW47XG4gICAgICAgIH0pO1xuICAgICAgICBjdHJsLmFjdGl2ZVVwbG9hZHMgPSBuO1xuICAgICAgICBjdHJsLmVycm9ycyA9IGU7XG4gICAgICAgIGN0cmwudXBsb2FkaW5nID0gdTtcbiAgICAgICAgaWYgKGxlbiAhPT0gMCkge1xuICAgICAgICAgICAgY3RybC50b3RhbFByb2dyZXNzID0gcGFyc2VJbnQocCAvIGxlbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN0cmwuYWN0aXZlVXBsb2FkcztcbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChjdHJsLmNvdW50QWN0aXZlVXBsb2FkcywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICBpZiAobmV3VmFsdWUgPT09IDAgJiYgbmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIHB5bUZzU2VydmljZS5vblVwbG9hZEZpbmlzaGVkKSB7XG4gICAgICAgICAgICBweW1Gc1NlcnZpY2Uub25VcGxvYWRGaW5pc2hlZCgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjdHJsLm1pbmltYXhXaW5kb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGN0cmwud2luZG93TWF4aW1pemVkID0gIWN0cmwud2luZG93TWF4aW1pemVkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDYW5jZWxzIGFsbCBhY3RpdmUgdXBsb2Fkcy5cbiAgICAgKlxuICAgICAqIExldHMgdXNlciBjb25maXJtLiBSZXNwb25zZSBpcyB0cmlnZ2VyZWQgYnkgYW4gZXZlbnQsIGlvdywgaXQgYXJyaXZlc1xuICAgICAqIGFzeW5jaHJvbm91c2x5LiAoV2UgdXNlIG91ciBvd24gZGlhbG9nLCBub3QgJHdpbmRvdy5jb25maXJtLilcbiAgICAgKlxuICAgICAqIFdlIG1heSBnZXQgY2FsbGVkIGZyb20gYW5vdGhlciBmdW5jdGlvbiAoY2xvc2VXaW5kb3cpLCBzbyByZXR1cm4gYSBwcm9taXNlXG4gICAgICogdG8gc2lnbmFsIHdoYXQgdGhlIHVzZXIgc2VsZWN0ZWQuXG4gICAgICpcbiAgICAgKiBJZiB0aGVyZSBhcmUgbm8gYWN0aXZlIGRvd25sb2Fkcywgd2UgZG8gbm90IGxldCB0aGUgdXNlciBjb25maXJtLiBTdGlsbFxuICAgICAqIHJldHVybiBhIHByb21pc2UsIGEgcmVzb2x2ZWQgb25lLCBzbyB0aGUgY2FsbGVyIGlzIGNsZWFyZWQgdG8gZG8gaGlzXG4gICAgICogdGhpbmcuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgKi9cbiAgICBjdHJsLmNhbmNlbEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGN0cmwuYWN0aXZlVXBsb2Fkcykge1xuICAgICAgICAgICAgcmV0dXJuIHB5bS5ncm93bGVyLmNvbmZpcm0oVC5jb25maXJtX2NhbmNlbF9hbGxfdXBsb2FkcylcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGN0cmwucXVldWUsIGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJHEuZGVmZXIoKS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC5jbG9zZVdpbmRvdyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBmdW5jdGlvbiBkb0l0ICgpIHtcbiAgICAgICAgICAgIGN0cmwuY2xlYXJRdWV1ZSgpO1xuICAgICAgICAgICAgY3RybC53aW5kb3dJc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdHJsLmFjdGl2ZVVwbG9hZHMpIHtcbiAgICAgICAgICAgIGN0cmwuY2FuY2VsQWxsKCkudGhlbihkb0l0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRvSXQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmZpbGVEcm9wcGVkID0gZnVuY3Rpb24gKCRmaWxlcywgJGV2ZW50LCAkcmVqZWN0ZWRGaWxlcykge1xuICAgICAgICAkbG9nLmxvZygnZHJvcHBlZCcsICRmaWxlcywgdGhpcy5maWxlcywgJGV2ZW50KTtcbiAgICAgICAgaWYgKCRmaWxlcyAmJiAkZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lbnF1ZXVlKCRmaWxlcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC5maWxlU2VsZWN0ZWQgPSBmdW5jdGlvbiAoJGZpbGVzLCAkZXZlbnQpIHtcbiAgICAgICAgJGxvZy5sb2coJ3NlbGVjdGVkJywgJGZpbGVzLCB0aGlzLmZpbGVzLCAkZXZlbnQpO1xuICAgICAgICBpZiAoJGZpbGVzICYmICRmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmVucXVldWUoJGZpbGVzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLnZhbGlkYXRlID0gZnVuY3Rpb24gKCRmaWxlKSB7XG4gICAgICAgICRsb2cubG9nKCdWYWxpZGF0aW5nIGZpbGUnLCAkZmlsZSk7XG4gICAgICAgIHJldHVybiAkZmlsZS50eXBlICE9PSAnYXVkaW8veC1hcGUnO1xuICAgIH07XG5cbiAgICBjdHJsLmNsZWFyUXVldWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwcm9wO1xuICAgICAgICBmb3IgKHByb3AgaW4gY3RybC5xdWV1ZSkge1xuICAgICAgICAgICAgaWYgKGN0cmwucXVldWUuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3RybC5xdWV1ZVtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmVucXVldWUgPSBmdW5jdGlvbiAoZmlsZXMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgaSwgaW1heCwgZixcbiAgICAgICAgICAgIG15UXVldWUgPSB7fTtcbiAgICAgICAgaWYgKCEgKGZpbGVzICYmIGZpbGVzLmxlbmd0aCA+IDApKSB7IHJldHVybjsgfVxuICAgICAgICBjdHJsLndpbmRvd0lzT3BlbiA9IHRydWU7XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PWZpbGVzLmxlbmd0aDsgaTxpbWF4OyBpKyspIHtcbiAgICAgICAgICAgIGYgPSBuZXcgcHltRnNVcGxvYWRlclNlcnZpY2UuY3JlYXRlUHltRmlsZShmaWxlc1tpXSk7XG4gICAgICAgICAgICBpZiAoc2VsZi5xdWV1ZVtmaWxlc1tpXS5uYW1lXSkge1xuICAgICAgICAgICAgICAgIGYuc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgZi52YWxpZGF0aW9uTWVzc2FnZSA9ICdGaWxlIHdpdGggdGhpcyBuYW1lIGFscmVhZHkgaW4gcXVldWUnO1xuICAgICAgICAgICAgICAgIGYua2V5ID0gZi5maWxlLm5hbWUgKyBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZi5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU5HKTtcbiAgICAgICAgICAgICAgICBzZWxmLnZhbGlkYXRlSGVyZShmKTtcbiAgICAgICAgICAgICAgICBmLmtleSA9IGYuZmlsZS5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXlRdWV1ZVtmLmtleV0gPSBmO1xuICAgICAgICAgICAgc2VsZi5xdWV1ZVtmLmtleV0gPSBmO1xuICAgICAgICB9XG4gICAgICAgIHB5bUZzVXBsb2FkZXJTZXJ2aWNlLnZhbGlkYXRlRmlsZXMocHltRnNTZXJ2aWNlLmdldFBhdGhTdHIoKSwgbXlRdWV1ZSk7XG4gICAgfTtcblxuICAgIGN0cmwudmFsaWRhdGVIZXJlID0gZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgLy8gVE9ETyBDaGVjayBxdW90YS4gSWYgdmlvbGF0aW9uLCBzZXQgc3RhdGUgYW5kIG1lc3NhZ2UsIGlmIG9rLCBrZWVwIHN0YXRlIGFzIFZBTElEQVRJTkdcbiAgICB9O1xuXG4gICAgY3RybC5jYlByb2dyZXNzID0gZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB2YXIgbiA9IHBhcnNlSW50KDEwMC4wICogZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG4gICAgICAgIC8vJGxvZy5sb2coJ3Byb2dyZXNzOiAnICsgbiArICclIGZpbGUgOicrIGV2dC5jb25maWcuZmlsZS5uYW1lKTtcbiAgICAgICAgLy8kbG9nLmxvZygncHJvZ3Jlc3MtZXZ0OiAnLCBldnQpO1xuICAgICAgICAvLyRsb2cubG9nKCdwcm9ncmVzcy10aGlzOiAnLCB0aGlzKTtcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IG47XG4gICAgfTtcblxuICAgIC8vY3RybC5jYlN1Y2Nlc3MgPSBmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAvLyAgICAvLyBmaWxlIGlzIHVwbG9hZGVkIHN1Y2Nlc3NmdWxseVxuICAgIC8vICAgICRsb2cubG9nKCdmaWxlICcgKyBjb25maWcuZmlsZS5uYW1lICsgJ2lzIHVwbG9hZGVkIHN1Y2Nlc3NmdWxseS4gUmVzcG9uc2U6ICcgKyBkYXRhKTtcbiAgICAvLyAgICAvL3RoaXMuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX09LKTtcbiAgICAvL307XG5cbiAgICBjdHJsLnN0YXJ0VXBsb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBwLFxuICAgICAgICAgICAgZlByb2dyZXNzOyAvLywgZlN1Y2Nlc3M7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLnF1ZXVlLCBmdW5jdGlvbihmKSB7XG4gICAgICAgICAgICBpZiAoZi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuQ0FOX1VQTE9BRCkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdzdGFydGluZyB1cGxvYWQgb2YnLCBmLmZpbGUubmFtZSwgZik7XG4gICAgICAgICAgICAgICAgLy8gQmluZCB0aGUgY2FsbGJhY2tzIHRvIHRoZSBpbmRpdmlkdWFsIFB5bUZpbGUsIHNvIHRoYXRcbiAgICAgICAgICAgICAgICAvLyB0aGVpciAndGhpcycgcG9pbnRzIHRvIHRoZSBQeW1GaWxlIGluc3RhbmNlLlxuICAgICAgICAgICAgICAgIGZQcm9ncmVzcyA9IGFuZ3VsYXIuYmluZChmLCBzZWxmLmNiUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIC8vZlN1Y2Nlc3MgPSBhbmd1bGFyLmJpbmQoZiwgc2VsZi5jYlN1Y2Nlc3MpO1xuICAgICAgICAgICAgICAgIHAgPSBweW1Gc1VwbG9hZGVyU2VydmljZS51cGxvYWQocHltRnNTZXJ2aWNlLmdldFBhdGhTdHIoKSwgZilcbiAgICAgICAgICAgICAgICAgICAgLnByb2dyZXNzKGZQcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgICAgIC8vLnN1Y2Nlc3MoZlN1Y2Nlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgY3RybC5jYW5jZWwgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBmaWxlLmFib3J0KCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBnaXZlbiBtaW1lLXR5cGUgYWdhaW5zdCBwYXR0ZXJuIGZyb20gYGBhbGxvd2BgIGFuZCBgYGRlbnlgYFxuICAgICAqIGFuZCByZXR1cm5zIHRydWUgaWYgbWltZS10eXBlIGlzIGFsbG93ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBjdHJsLmNoZWNrVHlwZSA9IGZ1bmN0aW9uICh0eSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBpLCBpbWF4LCBwYXQsIGdvb2Q7XG4gICAgICAgIGlmICghIHR5KSB7dHkgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJzt9XG4gICAgICAgIHR5ID0gdHkuc3BsaXQoJy8nKTtcbiAgICAgICAgJGxvZy5sb2codHkpO1xuICAgICAgICAvLyBJcyBnaXZlbiBtaW1lIHR5cGUgYWxsb3dlZD9cbiAgICAgICAgZ29vZCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGk9MCwgaW1heD1zZWxmLmFsbG93Lmxlbmd0aDsgaTxpbWF4OyBpKyspIHtcbiAgICAgICAgICAgIHBhdCA9IHNlbGYuYWxsb3dbaV07XG4gICAgICAgICAgICBpZiAocGF0LnNlYXJjaCgvXFwqLykgPiAtMSAmJiBwYXQuc2VhcmNoKC9cXC5cXCovKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBwYXQgPSBwYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgICAgL1xcKi9nLFxuICAgICAgICAgICAgICAgICAgICAnLionXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhdCA9IHBhdC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgaWYgKHR5WzBdLnNlYXJjaChwYXRbMF0pID4gLTEgJiYgdHlbMV0uc2VhcmNoKHBhdFsxXSkgPiAtMSkge1xuICAgICAgICAgICAgICAgIGdvb2QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghIGdvb2QpIHtyZXR1cm4gZmFsc2U7fVxuICAgICAgICAvLyBJcyBnaXZlbiBtaW1lIHR5cGUgZGVuaWVkP1xuICAgICAgICBmb3IgKGk9MCwgaW1heD1zZWxmLmRlbnkubGVuZ3RoOyBpPGltYXg7IGkrKykge1xuICAgICAgICAgICAgcGF0ID0gc2VsZi5kZW55W2ldO1xuICAgICAgICAgICAgaWYgKHBhdC5zZWFyY2goL1xcKi8pID4gLTEgJiYgcGF0LnNlYXJjaCgvXFwuXFwqLykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcGF0ID0gcGF0LnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAgIC9cXCovZyxcbiAgICAgICAgICAgICAgICAgICAgJy4qJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXQgPSBwYXQuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGlmICh0eVswXS5zZWFyY2gocGF0WzBdKSA+IC0xIHx8IHR5WzFdLnNlYXJjaChwYXRbMV0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICBnb29kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGdvb2Q7XG4gICAgfTtcblxuICAgIGN0cmwuY2hlY2tTaXplID0gZnVuY3Rpb24gKHN6KSB7XG4gICAgICAgIHJldHVybiAoc3ogPj0gdGhpcy5taW5TaXplICYmIHN6IDw9IHRoaXMubWF4U2l6ZSk7XG4gICAgfTtcblxuICAgIC8vZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAvLyAgICB2YXIgaSwgZjtcbiAgICAvLyAgICBmb3IgKGk9MDsgaTwxMDsgaSsrKSB7XG4gICAgLy8gICAgICAgIGYgPSBuZXcgcHltRnNVcGxvYWRlclNlcnZpY2UuY3JlYXRlUHltRmlsZSh7XG4gICAgLy8gICAgICAgICAgICBuYW1lOiAnZGZkc2ZmcyBzZGZzZ2RmZyBmZ3NmZ2ZkZyBzZGZnZmRnIHNkZmdzIGRmZyBzZGZnIGRmZ3NkZmRnIHNkZmdkZmdzIGRmZyBkIGRzZGdmc2Zkc2cnLFxuICAgIC8vICAgICAgICAgICAgc2l6ZTogNjUyMzg1NjY1MyxcbiAgICAvLyAgICAgICAgICAgIHR5cGU6ICdzdHVmZi9zYW1wbGUnXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgZi5zZXRTdGF0ZShpICUgMiA9PT0gMCA/IEZJTEVfU1RBVEVTLlVQTE9BRF9FUlJPUiA6IEZJTEVfU1RBVEVTLkNBTl9VUExPQUQpO1xuICAgIC8vICAgICAgICBmLnZhbGlkYXRpb25NZXNzYWdlID0gJ2JsYWggYsO2bGRkZiBlcndlJztcbiAgICAvLyAgICAgICAgY3RybC5xdWV1ZVtpXSA9IGY7XG4gICAgLy8gICAgfVxuICAgIC8vICAgIGN0cmwud2luZG93SXNPcGVuID0gdHJ1ZTtcbiAgICAvL31cbiAgICAvL1xuICAgIC8vLypcbiAgICAvLyogUnVuIGltbWVkaWF0ZWx5XG4gICAgLy8qL1xuICAgIC8vaW5pdCgpO1xuXG59XSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=