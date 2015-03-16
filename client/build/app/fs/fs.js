angular.module("pym.fs", []);
angular.module('pym.fs')
    .constant('FILE_STATES', {
        'NEW':                 0,
        'VALIDATING':         10,
        'VALIDATION_OK':      20,
        'VALIDATION_ERROR':  -20,
        'UPLOADING':          30,
        'UPLOAD_OK':          40,
        'UPLOAD_ERROR':      -40,
        'UPLOAD_CANCELED':  -100
    })
    .constant('FILE_STATE_CAPTIONS', {
           '0' : 'New (0)',
          '10' : 'Validating (10)',
          '20' : 'Validation OK (20)',
         '-20' : 'Validation Error (-20)',
          '30' : 'Uploading (30)',
          '40' : 'Upload OK (40)',
         '-40' : 'Upload Error (-40)',
        '-100' : 'Upload Canceled (-100)'
    });

angular.module('pym.fs').factory('pymFsService',
        ['$log', '$http', '$window', 'RC',
function ($log,   $http,   $window,   RC) {

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
                    PYM.growl_ajax_resp(resp.data);
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
                    PYM.growl_ajax_resp(resp.data);
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
                    PYM.growl_ajax_resp(resp.data);
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
                        PYM.growl_ajax_resp(resp.data);
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
                        PYM.growl_ajax_resp(resp.data);
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
                        PYM.growl_ajax_resp(resp.data);
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
                        PYM.growl_ajax_resp(resp.data);
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
        ['$log', '$upload', '$http', 'RC', 'FILE_STATES', 'FILE_STATE_CAPTIONS',
function ($log,   $upload,   $http,   RC,   FILE_STATES,   FILE_STATE_CAPTIONS) {

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
         * TODO make this 3-state: restrict, update, revise
         * @param {bool} overwrite - Whether to overwrite or not
         * @returns {promise}
         */
        upload: function (pathStr, file, overwrite) {
            var uploadConf = {
                    url: RC.urls.upload,
                    file: file.file,
                    data: {
                        path: pathStr,
                        overwrite: overwrite
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
         * TODO make this 3-state: restrict, update, revise
         * @param {bool} overwrite - Whether to overwrite or not
         * @returns {promise}
         */
        validateFiles: function (pathStr, fileList, overwrite) {
            var httpConfig = {}, postData = {},
                ff = [];
            $log.log('fileList to validate', fileList);
            angular.forEach(
                fileList, function (v) {
                    if (v.state === FILE_STATES.VALIDATING) {
                        ff.push(
                            {
                                key: v.key,
                                name: v.file.name,
                                size: v.file.size,
                                mime_type: v.file.type
                            }
                        );
                    }
                }
            );
            postData.path = pathStr;
            postData.files = ff;
            postData.overwrite = overwrite;
            return $http.post(RC.urls.validate_files, postData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        angular.forEach(
                            resp.data.data, function (v, k) {
                                if (v === 'ok') {
                                    fileList[k].setState(FILE_STATES.VALIDATION_OK);
                                }
                                else {
                                    fileList[k].setState(FILE_STATES.VALIDATION_ERROR);
                                    fileList[k].validationMessage = v;
                                }
                            }
                        );
                    }
                    else {
                        PYM.growl_ajax_resp(resp.data);
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
        ['$scope', '$window', '$log', 'T', 'pymFsService', 'pymFsUploaderService', 'FILE_STATES',
function ($scope,   $window,   $log,   T,   pymFsService,   pymFsUploaderService,   FILE_STATES) {

    "use strict";

    var ctrl = this;

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

    ctrl.closeWindow = function () {
        var prop;
        if (ctrl.activeUploads) {
            if (! ctrl.cancelAll()) {
                return;
            }
        }
        for (prop in ctrl.queue) {
            if (ctrl.queue.hasOwnProperty(prop)) {
                delete ctrl.queue[prop];
            }
        }
        ctrl.windowIsOpen = false;
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
        file.abort();
    };

    ctrl.cancelAll = function () {
        if (ctrl.activeUploads) {
            if (! $window.confirm(T.confirm_cancel_all_uploads)) { return false; }
        }
        angular.forEach(ctrl.queue, function (f) {
            f.abort();
        });
        return true;
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
            f.setState(i % 2 === 0 ? FILE_STATES.UPLOAD_ERROR : FILE_STATES.VALIDATION_OK);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZzLmpzIiwiZnMtY29uc3QuanMiLCJmcy1zZXJ2aWNlLmpzIiwidXBsb2FkZXItc2VydmljZS5qcyIsInVwbG9hZGVyLWNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImZzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJweW0uZnNcIiwgW10pOyIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKVxuICAgIC5jb25zdGFudCgnRklMRV9TVEFURVMnLCB7XG4gICAgICAgICdORVcnOiAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgJ1ZBTElEQVRJTkcnOiAgICAgICAgIDEwLFxuICAgICAgICAnVkFMSURBVElPTl9PSyc6ICAgICAgMjAsXG4gICAgICAgICdWQUxJREFUSU9OX0VSUk9SJzogIC0yMCxcbiAgICAgICAgJ1VQTE9BRElORyc6ICAgICAgICAgIDMwLFxuICAgICAgICAnVVBMT0FEX09LJzogICAgICAgICAgNDAsXG4gICAgICAgICdVUExPQURfRVJST1InOiAgICAgIC00MCxcbiAgICAgICAgJ1VQTE9BRF9DQU5DRUxFRCc6ICAtMTAwXG4gICAgfSlcbiAgICAuY29uc3RhbnQoJ0ZJTEVfU1RBVEVfQ0FQVElPTlMnLCB7XG4gICAgICAgICAgICcwJyA6ICdOZXcgKDApJyxcbiAgICAgICAgICAnMTAnIDogJ1ZhbGlkYXRpbmcgKDEwKScsXG4gICAgICAgICAgJzIwJyA6ICdWYWxpZGF0aW9uIE9LICgyMCknLFxuICAgICAgICAgJy0yMCcgOiAnVmFsaWRhdGlvbiBFcnJvciAoLTIwKScsXG4gICAgICAgICAgJzMwJyA6ICdVcGxvYWRpbmcgKDMwKScsXG4gICAgICAgICAgJzQwJyA6ICdVcGxvYWQgT0sgKDQwKScsXG4gICAgICAgICAnLTQwJyA6ICdVcGxvYWQgRXJyb3IgKC00MCknLFxuICAgICAgICAnLTEwMCcgOiAnVXBsb2FkIENhbmNlbGVkICgtMTAwKSdcbiAgICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5mYWN0b3J5KCdweW1Gc1NlcnZpY2UnLFxuICAgICAgICBbJyRsb2cnLCAnJGh0dHAnLCAnJHdpbmRvdycsICdSQycsXG5mdW5jdGlvbiAoJGxvZywgICAkaHR0cCwgICAkd2luZG93LCAgIFJDKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBGc1NlcnZpY2UgPSB7XG4gICAgICAgIHRyZWU6IG51bGwsXG4gICAgICAgIGJyb3dzZXI6IG51bGwsXG5cbiAgICAgICAgcm9vdFBhdGhTdHI6ICcnLFxuICAgICAgICBwYXRoOiBbXSxcblxuICAgICAgICBvdmVyd3JpdGU6IGZhbHNlLFxuICAgICAgICBpbmNsdWRlRGVsZXRlZDogZmFsc2UsXG5cbiAgICAgICAgZ2V0UGF0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQYXRoU3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRQYXRoOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgICAgIHRoaXMudHJlZS5zZXRQYXRoKHBhdGgpO1xuICAgICAgICAgICAgdGhpcy5icm93c2VyLnNldFBhdGgocGF0aCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0TGVhZk5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aC0xXTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVG9nZ2xlcyBmbGFnIGluY2x1ZGVEZWxldGVkIGFuZCBjaGFuZ2VzIHBhdGggaW50ZWxsaWdlbnRseS5cbiAgICAgICAgICpcbiAgICAgICAgICogSWYgdXNlciBjdXJyZW50bHkgaXMgaW4gYSBkZWxldGVkIG5vZGUgYW5kIGRlY2lkZXMgdG8gbm90XG4gICAgICAgICAqIGRpc3BsYXkgZGVsZXRlZCBpdGVtcyBhbnltb3JlLCByZXR1cm5zIHRvIHRoZSBmaXJzdCBub3QtZGVsZXRlZFxuICAgICAgICAgKiBhbmNlc3Rvci5cbiAgICAgICAgICpcbiAgICAgICAgICogQWxzbyByZWxvYWRzIHRyZWUgYW5kIGJyb3dzZXIhXG4gICAgICAgICAqL1xuICAgICAgICB0b2dnbGVJbmNsdWRlRGVsZXRlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHBwID0gdGhpcy5wYXRoLCBwMCA9IHBwWzBdO1xuICAgICAgICAgICAgdGhpcy5pbmNsdWRlRGVsZXRlZCA9ICF0aGlzLmluY2x1ZGVEZWxldGVkO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0TGVhZk5vZGUoKS5pc19kZWxldGVkICYmICF0aGlzLmluY2x1ZGVEZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBwLmxlbmd0aCAmJiBwcFtwcC5sZW5ndGgtMV0uaXNfZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBwcC5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlLCB3ZSBhdCBsZWFzdCBzdGF5IG9uIHRoZSByb290IG5vZGVcbiAgICAgICAgICAgICAgICBpZiAoISBwcC5sZW5ndGgpIHsgcHAucHVzaChwMCk7IH1cbiAgICAgICAgICAgICAgICB0aGlzLnNldFBhdGgocHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVlLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXIucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXNlcyBGcyBieSBhIHBhdGggc3RyaW5nLlxuICAgICAgICAgKlxuICAgICAgICAgKiAxLiBUaGUgcGFnZSBjb250cm9sbGVyIGNhbGxzIHVzIHdpdGggdGhlIHBhdGggc3RyaW5nLlxuICAgICAgICAgKiAyYS4gV2UgY2FsbCB0aGUgYnJvd3NlciB0byBsb2FkIHRoZSBpdGVtcyBvZiB0aGUgcm9vdCBwYXRoLlxuICAgICAgICAgKiAyYi4gQ29uY3VycmVudGx5IHdlIGNhbGwgdGhlIHRyZWUsIHdoaWNoIGxvYWRzIHRoZSBpbml0aWFsIG5vZGUgdHJlZVxuICAgICAgICAgKiAgICAgYW5kIHNldHMgdXAgdGhlIHBhdGggYXMgYSBsaXN0IG9mIG5vZGVzLlxuICAgICAgICAgKiAzLiBXaGVuIHRoZSB0cmVlIGhhcyBsb2FkZWQgYW5kIGl0cyBwYXRoIGlzIHNldCB1cCwgd2UgZ3JhYiB0aGUgcGF0aFxuICAgICAgICAgKiAgICBmcm9tIHRoZXJlIGZvciBvdXJzZWx2ZXMgYW5kIGFsc28gcHJvdmlkZSB0aGUgYnJvd3NlciB3aXRoIGl0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFN0ciAtIFJvb3QgcGF0aCBvZiB0cmVlIGFzIHN0cmluZy5cbiAgICAgICAgICovXG4gICAgICAgIGZpcnN0TG9hZDogZnVuY3Rpb24gKHBhdGhTdHIpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMucm9vdFBhdGhTdHIgPSBwYXRoU3RyO1xuICAgICAgICAgICAgJGxvZy5sb2coJ2ZpcnN0TG9hZCcsIHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksICB0aGlzLnJvb3RQYXRoU3RyKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5sb2FkSXRlbXMoKTtcbiAgICAgICAgICAgIHRoaXMudHJlZS5pbml0Tm9kZXMoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBzZWxmLnBhdGggPSBzZWxmLnRyZWUucGF0aDtcbiAgICAgICAgICAgICAgICBzZWxmLmJyb3dzZXIucGF0aCA9IHNlbGYucGF0aDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZURpcmVjdG9yeTogZnVuY3Rpb24gKGRpck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sXG4gICAgICAgICAgICAgICAgcG9zdERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGRpck5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoUkMudXJscy5jcmVhdGVfZGlyZWN0b3J5LCBwb3N0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb29wXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgUFlNLmdyb3dsX2FqYXhfcmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWxldGVJdGVtczogZnVuY3Rpb24gKG5hbWVzLCByZWFzb24pIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lczogbmFtZXMsXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbjogcmVhc29uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoUkMudXJscy5kZWxldGVfaXRlbXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9PUFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFBZTS5ncm93bF9hamF4X3Jlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5kZWxldGVJdGVtczogZnVuY3Rpb24gKG5hbWVzKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHt9LFxuICAgICAgICAgICAgICAgIHB1dERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzOiBuYW1lc1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KFJDLnVybHMudW5kZWxldGVfaXRlbXMsIHB1dERhdGEsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9PUFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFBZTS5ncm93bF9hamF4X3Jlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZEl0ZW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSB8fCB0aGlzLnJvb3RQYXRoU3RyLFxuICAgICAgICAgICAgICAgICAgICBpbmNkZWw6IHRoaXMuaW5jbHVkZURlbGV0ZWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfaXRlbXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUFlNLmdyb3dsX2FqYXhfcmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRUcmVlOiBmdW5jdGlvbiAoZmlsdGVyKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5yb290UGF0aFN0cixcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIGluY2RlbDogdGhpcy5pbmNsdWRlRGVsZXRlZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF90cmVlLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBZTS5ncm93bF9hamF4X3Jlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRGc1Byb3BlcnRpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge3BhcmFtczoge319O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfZnNfcHJvcGVydGllcywgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBZTS5ncm93bF9hamF4X3Jlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZEl0ZW1Qcm9wZXJ0aWVzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfaXRlbV9wcm9wZXJ0aWVzLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUFlNLmdyb3dsX2FqYXhfcmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBidWlsZERvd25sb2FkVXJsOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgdmFyIHBwLCBzO1xuICAgICAgICAgICAgLy8gTWFrZSBsb2NhbCBjb3B5IG9mIG9yaWdpbmFsIHBhdGhcbiAgICAgICAgICAgIHBwID0gdGhpcy5wYXRoLnNsaWNlKCk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgZmlsZXN5c3RlbSByb290LCBiZWNhdXNlIGJyb3dzZXIgaXMgYWxyZWFkeSB0aGVyZTpcbiAgICAgICAgICAgIC8vIGh0dHA6Ly9IT1NUOlBPUlQvVEVOQU5UL2ZzL0BAX2JyX1xuICAgICAgICAgICAgaWYgKHBwWzBdLm5hbWUgPT09ICdmcycpIHsgcHAuc2hpZnQoKTsgfVxuICAgICAgICAgICAgLy8gU3RyaW5naWZ5IHBhdGggYW5kIGFwcGVuZCBuYW1lXG4gICAgICAgICAgICBzID0gcHAubGVuZ3RoID8gdGhpcy5wYXRoVG9TdHIocHApICsgJy8nICsgbmFtZSA6IG5hbWU7XG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCB1cmwgYW5kIGFwcGx5IG91ciBwYXRoIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuICR3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9AQF9icl8vLCBzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXRoVG9TdHI6IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICBpZiAoISAoYW5ndWxhci5pc0FycmF5KHBhdGgpICYmIHBhdGgubGVuZ3RoID4gMCkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICAgIHZhciBwcCA9IFtdO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgIHBhdGgsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHBwLnB1c2goeC5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIHBwLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRnNTZXJ2aWNlO1xufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5mYWN0b3J5KCdweW1Gc1VwbG9hZGVyU2VydmljZScsXG4gICAgICAgIFsnJGxvZycsICckdXBsb2FkJywgJyRodHRwJywgJ1JDJywgJ0ZJTEVfU1RBVEVTJywgJ0ZJTEVfU1RBVEVfQ0FQVElPTlMnLFxuZnVuY3Rpb24gKCRsb2csICAgJHVwbG9hZCwgICAkaHR0cCwgICBSQywgICBGSUxFX1NUQVRFUywgICBGSUxFX1NUQVRFX0NBUFRJT05TKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuXG4gICAgZnVuY3Rpb24gUHltRmlsZShmaWxlKSB7XG4gICAgICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gICAgICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgICAgICB0aGlzLnN0YXRlQ2FwdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMua2V5ID0gbnVsbDtcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IDA7XG4gICAgICAgIHRoaXMudmFsaWRhdGlvblByb21pc2UgPSBudWxsO1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25NZXNzYWdlID0gbnVsbDtcbiAgICAgICAgdGhpcy51cGxvYWRQcm9taXNlID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzVXBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzRXJyb3IgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgdGhpcy5zdGF0ZUNhcHRpb24gPSBGSUxFX1NUQVRFX0NBUFRJT05TW3N0YXRlXTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9ICh0aGlzLnN0YXRlID4gRklMRV9TVEFURVMuTkVXICYmXG4gICAgICAgICAgICB0aGlzLnN0YXRlIDwgRklMRV9TVEFURVMuVVBMT0FEX09LKTtcbiAgICAgICAgdGhpcy5pc1VwbG9hZGluZyA9ICh0aGlzLnN0YXRlID09PSBGSUxFX1NUQVRFUy5VUExPQURJTkcpO1xuICAgICAgICB0aGlzLmhhc0Vycm9yID0gKHRoaXMuc3RhdGUgPiBGSUxFX1NUQVRFUy5VUExPQURfQ0FOQ0VMRUQgJiZcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPCBGSUxFX1NUQVRFUy5ORVcpO1xuICAgICAgICAkbG9nLmxvZygnc3RhdGUnLCBzdGF0ZSwgdGhpcy5zdGF0ZUNhcHRpb24sIHRoaXMpO1xuICAgIH07XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMudXBsb2FkUHJvbWlzZSkgeyB0aGlzLnVwbG9hZFByb21pc2UuYWJvcnQoKTsgfVxuICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9DQU5DRUxFRCk7XG4gICAgfTtcblxuXG4gICAgdmFyIFVwbG9hZGVyU2VydmljZSA9IHtcblxuICAgICAgICBjcmVhdGVQeW1GaWxlOiBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQeW1GaWxlKGZpbGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtcyB1cGxvYWQgb2YgYSBmaWxlIGFuZCByZXR1cm5zIHByb21pc2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoU3RyIC0gUGF0aCB3aGVyZSB0byBzYXZlIHRoZSBmaWxlXG4gICAgICAgICAqIEBwYXJhbSB7UHltRmlsZX0gZmlsZSAtIEluc3RhbmNlIG9mIGEgUHltRmlsZVxuICAgICAgICAgKiBUT0RPIG1ha2UgdGhpcyAzLXN0YXRlOiByZXN0cmljdCwgdXBkYXRlLCByZXZpc2VcbiAgICAgICAgICogQHBhcmFtIHtib29sfSBvdmVyd3JpdGUgLSBXaGV0aGVyIHRvIG92ZXJ3cml0ZSBvciBub3RcbiAgICAgICAgICogQHJldHVybnMge3Byb21pc2V9XG4gICAgICAgICAqL1xuICAgICAgICB1cGxvYWQ6IGZ1bmN0aW9uIChwYXRoU3RyLCBmaWxlLCBvdmVyd3JpdGUpIHtcbiAgICAgICAgICAgIHZhciB1cGxvYWRDb25mID0ge1xuICAgICAgICAgICAgICAgICAgICB1cmw6IFJDLnVybHMudXBsb2FkLFxuICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLmZpbGUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGhTdHIsXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGU6IG92ZXJ3cml0ZVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLCAvLyAnUE9TVCcgb3IgJ1BVVCcsIGRlZmF1bHQgUE9TVFxuXG4gICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fSwgLy8geydBdXRob3JpemF0aW9uJzogJ3h4eCd9IG9ubHkgZm9yIGh0bWw1XG5cbiAgICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBudWxsLCAvLydkb2MuanBnJyBvciBbJzEuanBnJywgJzIuanBnJywgLi4uXSwgIHRvIG1vZGlmeSB0aGUgbmFtZSBvZiB0aGUgZmlsZShzKVxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBmaWxlIGZvcm1EYXRhIG5hbWUgKCdDb250ZW50LURpc3Bvc2l0aW9uJyksIHNlcnZlciBzaWRlIHJlcXVlc3QgZm9ybSBuYW1lIGNvdWxkIGJlXG4gICAgICAgICAgICAgICAgICAgICAvLyBhbiBhcnJheSAgb2YgbmFtZXMgZm9yIG11bHRpcGxlIGZpbGVzIChodG1sNSkuIERlZmF1bHQgaXMgJ2ZpbGUnXG4gICAgICAgICAgICAgICAgICAgICBmaWxlRm9ybURhdGFOYW1lOiAnZmlsZScsIC8vICdteUZpbGUnIG9yIFsnZmlsZVswXScsICdmaWxlWzFdJywgLi4uXSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gbWFwIG9mIGV4dHJhIGZvcm0gZGF0YSBmaWVsZHMgdG8gc2VuZCBhbG9uZyB3aXRoIGZpbGUuIGVhY2ggZmllbGQgd2lsbCBiZSBzZW50IGFzIGEgZm9ybSBmaWVsZC5cbiAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSB2YWx1ZXMgYXJlIGNvbnZlcnRlZCB0byBqc29uIHN0cmluZyBvciBqc29iIGJsb2IgZGVwZW5kaW5nIG9uICdzZW5kT2JqZWN0c0FzSnNvbkJsb2InIG9wdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgIGZpZWxkczogbnVsbCwgLy8ge2tleTogJHNjb3BlLm15VmFsdWUsIC4uLn0sXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBvZiBhIGZvcm0gZmllbGQgaXMgYW4gb2JqZWN0IGl0IHdpbGwgYmUgc2VudCBhcyAnYXBwbGljYXRpb24vanNvbicgYmxvYlxuICAgICAgICAgICAgICAgICAgICAgLy8gcmF0aGVyIHRoYW4ganNvbiBzdHJpbmcsIGRlZmF1bHQgZmFsc2UuXG4gICAgICAgICAgICAgICAgICAgICBzZW5kT2JqZWN0c0FzSnNvbkJsb2I6IGZhbHNlLCAvLyB0cnVlfGZhbHNlLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBjdXN0b21pemUgaG93IGRhdGEgaXMgYWRkZWQgdG8gdGhlIGZvcm1EYXRhLiBTZWUgIzQwI2lzc3VlY29tbWVudC0yODYxMjAwMCBmb3Igc2FtcGxlIGNvZGUuXG4gICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YUFwcGVuZGVyOiBmdW5jdGlvbihmb3JtRGF0YSwga2V5LCB2YWwpe30sXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIGRhdGEgd2lsbCBiZSBzZW50IGFzIGEgc2VwYXJhdGUgZm9ybSBkYXRhIGZpZWxkIGNhbGxlZCBcImRhdGFcIi4gSXQgd2lsbCBiZSBjb252ZXJ0ZWQgdG8ganNvbiBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgIC8vIG9yIGpzb2IgYmxvYiBkZXBlbmRpbmcgb24gJ3NlbmRPYmplY3RzQXNKc29uQmxvYicgb3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICBkYXRhOiB7fSxcblxuICAgICAgICAgICAgICAgICAgICAgd2l0aENyZWRlbnRpYWxzOiBmYWxzZSwgLy90cnVlfGZhbHNlLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyAuLi4gYW5kIGFsbCBvdGhlciBhbmd1bGFyICRodHRwKCkgb3B0aW9ucyBjb3VsZCBiZSB1c2VkIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcDtcblxuICAgICAgICAgICAgcCA9ICR1cGxvYWQudXBsb2FkKHVwbG9hZENvbmYpXG4gICAgICAgICAgICAuZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfRVJST1IpO1xuICAgICAgICAgICAgICAgIGZpbGUudmFsaWRhdGlvbk1lc3NhZ2UgPSBkYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmaWxlLnVwbG9hZFByb21pc2UgPSBwO1xuICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURJTkcpO1xuICAgICAgICAgICAgcmV0dXJuIHA7XG5cbiAgICAgICAgICAgIC8qIHRoZW4gcHJvbWlzZSAobm90ZSB0aGF0IHJldHVybmVkIHByb21pc2UgZG9lc24ndCBoYXZlIHByb2dyZXNzLCB4aHIgYW5kIGNhbmNlbCBmdW5jdGlvbnMuICovXG4gICAgICAgICAgICAvLyB2YXIgcHJvbWlzZSA9IHVwbG9hZC50aGVuKHN1Y2Nlc3MsIGVycm9yLCBwcm9ncmVzcyk7XG5cbiAgICAgICAgICAgIC8qIGNhbmNlbC9hYm9ydCB0aGUgdXBsb2FkIGluIHByb2dyZXNzLiAqL1xuICAgICAgICAgICAgLy91cGxvYWQuYWJvcnQoKTtcblxuICAgICAgICAgICAgLyogYWx0ZXJuYXRpdmUgd2F5IG9mIHVwbG9hZGluZywgc2VuZCB0aGUgZmlsZSBiaW5hcnkgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQtdHlwZS5cbiAgICAgICAgICAgICBDb3VsZCBiZSB1c2VkIHRvIHVwbG9hZCBmaWxlcyB0byBDb3VjaERCLCBpbWd1ciwgZXRjLi4uIGh0bWw1IEZpbGVSZWFkZXIgaXMgbmVlZGVkLlxuICAgICAgICAgICAgIEl0IGNvdWxkIGFsc28gYmUgdXNlZCB0byBtb25pdG9yIHRoZSBwcm9ncmVzcyBvZiBhIG5vcm1hbCBodHRwIHBvc3QvcHV0IHJlcXVlc3QuXG4gICAgICAgICAgICAgTm90ZSB0aGF0IHRoZSB3aG9sZSBmaWxlIHdpbGwgYmUgbG9hZGVkIGluIGJyb3dzZXIgZmlyc3Qgc28gbGFyZ2UgZmlsZXMgY291bGQgY3Jhc2ggdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgWW91IHNob3VsZCB2ZXJpZnkgdGhlIGZpbGUgc2l6ZSBiZWZvcmUgdXBsb2FkaW5nIHdpdGggJHVwbG9hZC5odHRwKCkuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vJHVwbG9hZC5odHRwKHsuLi59KSAgLy8gU2VlIDg4I2lzc3VlY29tbWVudC0zMTM2NjQ4NyBmb3Igc2FtcGxlIGNvZGUuXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZhbGlkYXRlcyBmaWxlTGlzdCBvbiBzZXJ2ZXIgc2lkZS5cbiAgICAgICAgICpcbiAgICAgICAgICogUHV0IGVhY2ggZmlsZSB3aXRoIHN0YXRlIFZBTElEQVRJTkcgaW4gb25lIHJlcXVlc3QuIFJlc3BvbnNlIGRhdGEgbXVzdFxuICAgICAgICAgKiBiZSBhIGhhc2g6IGtleSBpcyBmaWxlJ3Mga2V5LCB2YWx1ZSBpcyAnb2snIG9yIHZhbGlkYXRpb24gbWVzc2FnZS5cbiAgICAgICAgICogQ29tbXVuaWNhdGlvbiB3aXRoIHNlcnZlciBpcyBhIFBPU1QgcmVxdWVzdCwgb24gc3VjY2VzcyB3ZSBzZXQgdGhlIHN0YXRlXG4gICAgICAgICAqIG9mIGVhY2ggZmlsZSBhcyByZXNwb25kZWQuIE9uIGVycm9yLCB3ZSBzZXQgc3RhdGUgdG8gVVBMT0FEX0VSUk9SLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFN0ciAtIFBhdGggYXMgbGlzdCBvZiBub2Rlcy5cbiAgICAgICAgICogQHBhcmFtIHtsaXN0fSBmaWxlTGlzdCAtIExpc3Qgb2YgaW5zdGFuY2VzIG9mIFB5bUZpbGUuXG4gICAgICAgICAqIFRPRE8gbWFrZSB0aGlzIDMtc3RhdGU6IHJlc3RyaWN0LCB1cGRhdGUsIHJldmlzZVxuICAgICAgICAgKiBAcGFyYW0ge2Jvb2x9IG92ZXJ3cml0ZSAtIFdoZXRoZXIgdG8gb3ZlcndyaXRlIG9yIG5vdFxuICAgICAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHZhbGlkYXRlRmlsZXM6IGZ1bmN0aW9uIChwYXRoU3RyLCBmaWxlTGlzdCwgb3ZlcndyaXRlKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHt9LCBwb3N0RGF0YSA9IHt9LFxuICAgICAgICAgICAgICAgIGZmID0gW107XG4gICAgICAgICAgICAkbG9nLmxvZygnZmlsZUxpc3QgdG8gdmFsaWRhdGUnLCBmaWxlTGlzdCk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgZmlsZUxpc3QsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2LnN0YXRlID09PSBGSUxFX1NUQVRFUy5WQUxJREFUSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZi5wdXNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB2LmtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdi5maWxlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IHYuZmlsZS5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW1lX3R5cGU6IHYuZmlsZS50eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwb3N0RGF0YS5wYXRoID0gcGF0aFN0cjtcbiAgICAgICAgICAgIHBvc3REYXRhLmZpbGVzID0gZmY7XG4gICAgICAgICAgICBwb3N0RGF0YS5vdmVyd3JpdGUgPSBvdmVyd3JpdGU7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChSQy51cmxzLnZhbGlkYXRlX2ZpbGVzLCBwb3N0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcC5kYXRhLmRhdGEsIGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSAnb2snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX09LKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10udmFsaWRhdGlvbk1lc3NhZ2UgPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBZTS5ncm93bF9hamF4X3Jlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdCwgZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10udmFsaWRhdGlvbk1lc3NhZ2UgPSAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3QsIGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnZhbGlkYXRpb25NZXNzYWdlID0gJ05ldHdvcmsgZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgfTtcbiAgICByZXR1cm4gVXBsb2FkZXJTZXJ2aWNlO1xufV0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpLmNvbnRyb2xsZXIoJ3B5bUZzVXBsb2FkZXJDb250cm9sbGVyJyxcbiAgICAgICAgWyckc2NvcGUnLCAnJHdpbmRvdycsICckbG9nJywgJ1QnLCAncHltRnNTZXJ2aWNlJywgJ3B5bUZzVXBsb2FkZXJTZXJ2aWNlJywgJ0ZJTEVfU1RBVEVTJyxcbmZ1bmN0aW9uICgkc2NvcGUsICAgJHdpbmRvdywgICAkbG9nLCAgIFQsICAgcHltRnNTZXJ2aWNlLCAgIHB5bUZzVXBsb2FkZXJTZXJ2aWNlLCAgIEZJTEVfU1RBVEVTKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBjdHJsID0gdGhpcztcblxuICAgIC8vIFN0b3JhZ2UgZm9yICR1cGxvYWRlciBzZXJ2aWNlXG4gICAgY3RybC5maWxlcyA9IFtdO1xuICAgIGN0cmwucmVqZWN0ZWRGaWxlcyA9IFtdO1xuICAgIGN0cmwuaXNEcm9wQXZhaWxhYmxlID0gbnVsbDtcblxuICAgIC8vIEVucXVldWVkIGZpbGVzIHRvIHZhbGlkYXRlIGFuZCB1cGxvYWRcbiAgICBjdHJsLnF1ZXVlID0ge307XG4gICAgLy8gU2V2ZXJhbCBjb3VudGVycywgdXBkYXRlZCBieSBjb3VudEFjdGl2ZVVwbG9hZHMgd2F0Y2hlclxuICAgIC8vIEFjdGl2ZSBtZWFucyBlaXRoZXIgdmFsaWRhdGluZyBvciB1cGxvYWRpbmdcbiAgICBjdHJsLmFjdGl2ZVVwbG9hZHMgPSAwO1xuICAgIC8vIFZhbGlkYXRpb24gZXJyb3JzICsgdXBsb2FkIGVycm9yc1xuICAgIGN0cmwuZXJyb3JzID0gMDtcbiAgICAvLyBUcmFuc2ZlcnJpbmcgZGF0YVxuICAgIGN0cmwudXBsb2FkaW5nID0gMDtcbiAgICAvLyB0b3RhbCBwcm9ncmVzc1xuICAgIGN0cmwudG90YWxQcm9ncmVzcyA9IDA7XG5cbiAgICBjdHJsLndpbmRvd01heGltaXplZCA9IHRydWU7XG4gICAgY3RybC53aW5kb3dJc09wZW4gPSBmYWxzZTtcblxuICAgIGN0cmwuY291bnRBY3RpdmVVcGxvYWRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbiA9IDAsIGUgPSAwLCB1ID0gMCwgcCA9IDAsIGxlbiA9IDA7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjdHJsLnF1ZXVlLCBmdW5jdGlvbiAoZikge1xuICAgICAgICAgICAgaWYgKGYuaXNBY3RpdmUpIHsgKytuOyB9XG4gICAgICAgICAgICBpZiAoZi5oYXNFcnJvcikgeyArK2U7IH1cbiAgICAgICAgICAgIGlmIChmLmlzVXBsb2FkaW5nKSB7ICsrdTsgfVxuICAgICAgICAgICAgcCArPSBmLnByb2dyZXNzO1xuICAgICAgICAgICAgKytsZW47XG4gICAgICAgIH0pO1xuICAgICAgICBjdHJsLmFjdGl2ZVVwbG9hZHMgPSBuO1xuICAgICAgICBjdHJsLmVycm9ycyA9IGU7XG4gICAgICAgIGN0cmwudXBsb2FkaW5nID0gdTtcbiAgICAgICAgaWYgKGxlbiAhPT0gMCkge1xuICAgICAgICAgICAgY3RybC50b3RhbFByb2dyZXNzID0gcGFyc2VJbnQocCAvIGxlbik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChjdHJsLmNvdW50QWN0aXZlVXBsb2FkcywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICBhbmd1bGFyLm5vb3AoKTtcbiAgICB9KTtcblxuICAgIGN0cmwubWluaW1heFdpbmRvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY3RybC53aW5kb3dNYXhpbWl6ZWQgPSAhY3RybC53aW5kb3dNYXhpbWl6ZWQ7XG4gICAgfTtcblxuICAgIGN0cmwuY2xvc2VXaW5kb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwcm9wO1xuICAgICAgICBpZiAoY3RybC5hY3RpdmVVcGxvYWRzKSB7XG4gICAgICAgICAgICBpZiAoISBjdHJsLmNhbmNlbEFsbCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAocHJvcCBpbiBjdHJsLnF1ZXVlKSB7XG4gICAgICAgICAgICBpZiAoY3RybC5xdWV1ZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHJsLnF1ZXVlW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN0cmwud2luZG93SXNPcGVuID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGN0cmwuZmlsZURyb3BwZWQgPSBmdW5jdGlvbiAoJGZpbGVzLCAkZXZlbnQsICRyZWplY3RlZEZpbGVzKSB7XG4gICAgICAgICRsb2cubG9nKCdkcm9wcGVkJywgJGZpbGVzLCB0aGlzLmZpbGVzLCAkZXZlbnQpO1xuICAgICAgICBpZiAoJGZpbGVzICYmICRmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmVucXVldWUoJGZpbGVzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmZpbGVTZWxlY3RlZCA9IGZ1bmN0aW9uICgkZmlsZXMsICRldmVudCkge1xuICAgICAgICAkbG9nLmxvZygnc2VsZWN0ZWQnLCAkZmlsZXMsIHRoaXMuZmlsZXMsICRldmVudCk7XG4gICAgICAgIGlmICgkZmlsZXMgJiYgJGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZW5xdWV1ZSgkZmlsZXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGN0cmwudmFsaWRhdGUgPSBmdW5jdGlvbiAoJGZpbGUpIHtcbiAgICAgICAgJGxvZy5sb2coJ1ZhbGlkYXRpbmcgZmlsZScsICRmaWxlKTtcbiAgICAgICAgcmV0dXJuICRmaWxlLnR5cGUgIT09ICdhdWRpby94LWFwZSc7XG4gICAgfTtcblxuICAgIGN0cmwuZW5xdWV1ZSA9IGZ1bmN0aW9uIChmaWxlcykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBpLCBpbWF4LCBmLFxuICAgICAgICAgICAgbXlRdWV1ZSA9IHt9O1xuICAgICAgICBpZiAoISAoZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIGN0cmwud2luZG93SXNPcGVuID0gdHJ1ZTtcbiAgICAgICAgZm9yIChpPTAsIGltYXg9ZmlsZXMubGVuZ3RoOyBpPGltYXg7IGkrKykge1xuICAgICAgICAgICAgZiA9IG5ldyBweW1Gc1VwbG9hZGVyU2VydmljZS5jcmVhdGVQeW1GaWxlKGZpbGVzW2ldKTtcbiAgICAgICAgICAgIGlmIChzZWxmLnF1ZXVlW2ZpbGVzW2ldLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgZi5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX0VSUk9SKTtcbiAgICAgICAgICAgICAgICBmLnZhbGlkYXRpb25NZXNzYWdlID0gJ0ZpbGUgd2l0aCB0aGlzIG5hbWUgYWxyZWFkeSBpbiBxdWV1ZSc7XG4gICAgICAgICAgICAgICAgZi5rZXkgPSBmLmZpbGUubmFtZSArIG5ldyBEYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpO1xuICAgICAgICAgICAgICAgIHNlbGYudmFsaWRhdGVIZXJlKGYpO1xuICAgICAgICAgICAgICAgIGYua2V5ID0gZi5maWxlLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBteVF1ZXVlW2Yua2V5XSA9IGY7XG4gICAgICAgICAgICBzZWxmLnF1ZXVlW2Yua2V5XSA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgcHltRnNVcGxvYWRlclNlcnZpY2UudmFsaWRhdGVGaWxlcyhweW1Gc1NlcnZpY2UuZ2V0UGF0aFN0cigpLCBteVF1ZXVlKTtcbiAgICB9O1xuXG4gICAgY3RybC52YWxpZGF0ZUhlcmUgPSBmdW5jdGlvbiAoZikge1xuICAgICAgICAvLyBUT0RPIENoZWNrIHF1b3RhLiBJZiB2aW9sYXRpb24sIHNldCBzdGF0ZSBhbmQgbWVzc2FnZSwgaWYgb2ssIGtlZXAgc3RhdGUgYXMgVkFMSURBVElOR1xuICAgIH07XG5cbiAgICBjdHJsLmNiUHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHZhciBuID0gcGFyc2VJbnQoMTAwLjAgKiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcbiAgICAgICAgLy8kbG9nLmxvZygncHJvZ3Jlc3M6ICcgKyBuICsgJyUgZmlsZSA6JysgZXZ0LmNvbmZpZy5maWxlLm5hbWUpO1xuICAgICAgICAvLyRsb2cubG9nKCdwcm9ncmVzcy1ldnQ6ICcsIGV2dCk7XG4gICAgICAgIC8vJGxvZy5sb2coJ3Byb2dyZXNzLXRoaXM6ICcsIHRoaXMpO1xuICAgICAgICB0aGlzLnByb2dyZXNzID0gbjtcbiAgICB9O1xuXG4gICAgY3RybC5jYlN1Y2Nlc3MgPSBmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgLy8gZmlsZSBpcyB1cGxvYWRlZCBzdWNjZXNzZnVsbHlcbiAgICAgICAgLy8kbG9nLmxvZygnZmlsZSAnICsgY29uZmlnLmZpbGUubmFtZSArICdpcyB1cGxvYWRlZCBzdWNjZXNzZnVsbHkuIFJlc3BvbnNlOiAnICsgZGF0YSk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX09LKTtcbiAgICB9O1xuXG4gICAgY3RybC5zdGFydFVwbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgcCxcbiAgICAgICAgICAgIGZQcm9ncmVzcywgZlN1Y2Nlc3M7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLnF1ZXVlLCBmdW5jdGlvbihmKSB7XG4gICAgICAgICAgICBpZiAoZi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElPTl9PSykge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdzdGFydGluZyB1cGxvYWQgb2YnLCBmLmZpbGUubmFtZSwgZik7XG4gICAgICAgICAgICAgICAgLy8gQmluZCB0aGUgY2FsbGJhY2tzIHRvIHRoZSBpbmRpdmlkdWFsIFB5bUZpbGUsIHNvIHRoYXRcbiAgICAgICAgICAgICAgICAvLyB0aGVpciAndGhpcycgcG9pbnRzIHRvIHRoZSBQeW1GaWxlIGluc3RhbmNlLlxuICAgICAgICAgICAgICAgIGZQcm9ncmVzcyA9IGFuZ3VsYXIuYmluZChmLCBzZWxmLmNiUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGZTdWNjZXNzID0gYW5ndWxhci5iaW5kKGYsIHNlbGYuY2JTdWNjZXNzKTtcbiAgICAgICAgICAgICAgICBwID0gcHltRnNVcGxvYWRlclNlcnZpY2UudXBsb2FkKFxuICAgICAgICAgICAgICAgICAgICAgICAgcHltRnNTZXJ2aWNlLmdldFBhdGhTdHIoKSwgZiwgcHltRnNTZXJ2aWNlLm92ZXJ3cml0ZSlcbiAgICAgICAgICAgICAgICAgICAgLnByb2dyZXNzKGZQcm9ncmVzcylcbiAgICAgICAgICAgICAgICAgICAgLnN1Y2Nlc3MoZlN1Y2Nlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgY3RybC5jYW5jZWwgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBmaWxlLmFib3J0KCk7XG4gICAgfTtcblxuICAgIGN0cmwuY2FuY2VsQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoY3RybC5hY3RpdmVVcGxvYWRzKSB7XG4gICAgICAgICAgICBpZiAoISAkd2luZG93LmNvbmZpcm0oVC5jb25maXJtX2NhbmNlbF9hbGxfdXBsb2FkcykpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgIH1cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGN0cmwucXVldWUsIGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICBmLmFib3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGdpdmVuIG1pbWUtdHlwZSBhZ2FpbnN0IHBhdHRlcm4gZnJvbSBgYGFsbG93YGAgYW5kIGBgZGVueWBgXG4gICAgICogYW5kIHJldHVybnMgdHJ1ZSBpZiBtaW1lLXR5cGUgaXMgYWxsb3dlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIGN0cmwuY2hlY2tUeXBlID0gZnVuY3Rpb24gKHR5KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGksIGltYXgsIHBhdCwgZ29vZDtcbiAgICAgICAgaWYgKCEgdHkpIHt0eSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO31cbiAgICAgICAgdHkgPSB0eS5zcGxpdCgnLycpO1xuICAgICAgICAkbG9nLmxvZyh0eSk7XG4gICAgICAgIC8vIElzIGdpdmVuIG1pbWUgdHlwZSBhbGxvd2VkP1xuICAgICAgICBnb29kID0gZmFsc2U7XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PXNlbGYuYWxsb3cubGVuZ3RoOyBpPGltYXg7IGkrKykge1xuICAgICAgICAgICAgcGF0ID0gc2VsZi5hbGxvd1tpXTtcbiAgICAgICAgICAgIGlmIChwYXQuc2VhcmNoKC9cXCovKSA+IC0xICYmIHBhdC5zZWFyY2goL1xcLlxcKi8pID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHBhdCA9IHBhdC5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgICAvXFwqL2csXG4gICAgICAgICAgICAgICAgICAgICcuKidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGF0ID0gcGF0LnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBpZiAodHlbMF0uc2VhcmNoKHBhdFswXSkgPiAtMSAmJiB0eVsxXS5zZWFyY2gocGF0WzFdKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgZ29vZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEgZ29vZCkge3JldHVybiBmYWxzZTt9XG4gICAgICAgIC8vIElzIGdpdmVuIG1pbWUgdHlwZSBkZW5pZWQ/XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PXNlbGYuZGVueS5sZW5ndGg7IGk8aW1heDsgaSsrKSB7XG4gICAgICAgICAgICBwYXQgPSBzZWxmLmRlbnlbaV07XG4gICAgICAgICAgICBpZiAocGF0LnNlYXJjaCgvXFwqLykgPiAtMSAmJiBwYXQuc2VhcmNoKC9cXC5cXCovKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBwYXQgPSBwYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgICAgL1xcKi9nLFxuICAgICAgICAgICAgICAgICAgICAnLionXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhdCA9IHBhdC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgaWYgKHR5WzBdLnNlYXJjaChwYXRbMF0pID4gLTEgfHwgdHlbMV0uc2VhcmNoKHBhdFsxXSkgPiAtMSkge1xuICAgICAgICAgICAgICAgIGdvb2QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ29vZDtcbiAgICB9O1xuXG4gICAgY3RybC5jaGVja1NpemUgPSBmdW5jdGlvbiAoc3opIHtcbiAgICAgICAgcmV0dXJuIChzeiA+PSB0aGlzLm1pblNpemUgJiYgc3ogPD0gdGhpcy5tYXhTaXplKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgdmFyIGksIGY7XG4gICAgICAgIGZvciAoaT0wOyBpPDEwOyBpKyspIHtcbiAgICAgICAgICAgIGYgPSBuZXcgcHltRnNVcGxvYWRlclNlcnZpY2UuY3JlYXRlUHltRmlsZSh7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2RmZHNmZnMgc2Rmc2dkZmcgZmdzZmdmZGcgc2RmZ2ZkZyBzZGZncyBkZmcgc2RmZyBkZmdzZGZkZyBzZGZnZGZncyBkZmcgZCBkc2RnZnNmZHNnJyxcbiAgICAgICAgICAgICAgICBzaXplOiA2NTIzODU2NjUzLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHVmZi9zYW1wbGUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmLnNldFN0YXRlKGkgJSAyID09PSAwID8gRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SIDogRklMRV9TVEFURVMuVkFMSURBVElPTl9PSyk7XG4gICAgICAgICAgICBmLnZhbGlkYXRpb25NZXNzYWdlID0gJ2JsYWggYsO2bGRkZiBlcndlJztcbiAgICAgICAgICAgIGN0cmwucXVldWVbaV0gPSBmO1xuICAgICAgICB9XG4gICAgICAgIGN0cmwud2luZG93SXNPcGVuID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKlxuICAgICogUnVuIGltbWVkaWF0ZWx5XG4gICAgKi9cbiAgICBpbml0KCk7XG5cbn1dKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==