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
        ['$log', '$http', '$q', '$window', 'RC', 'pymService',
function ($log,   $http,   $q,   $window,   RC,   pym) {

    "use strict";

    var FsService = {
        tree: null,
        browser: null,

        rootPathStr: '',
        path: [],
        prevPath: [],

        globalOptions: {
            includeDeleted: false,
            searchArea: 'here',
            searchFields: 'name',
            search: ''
        },

        onUploadFinished: null,

        lastSearch: {
            path: null,
            incdel: null,
            sarea: null,
            sfields: null,
            s: null
        },
        lastSearchResult: null,

        find: function () {
            if (this.globalOptions.search.length) {
                this.tree.setPathById(-1000);
            }
        },

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
            if (this.path[this.path.length - 1].id > 0) {
                this.prevPath = this.path;
            }
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
            //this.globalOptions.includeDeleted = !this.globalOptions.includeDeleted;
            if (this.getLeafNode().is_deleted && !this.globalOptions.includeDeleted) {
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

        extractMeta: function (nameList) {
            var httpConfig = {},
                postData = {
                    names: nameList,
                    path: this.pathToStr(this.path)
                };
            return $http.put(RC.urls.extract_meta, postData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // Noop
                    }
                    pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
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
                    pym.growler.growlAjaxResp(resp.data);
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
                    pym.growler.growlAjaxResp(resp.data);
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
                    pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        loadItems: function () {
            var self = this,
                httpConfig = {params: {}},
                action = 'load',
                leafNode = this.getLeafNode();

            // The current leaf node tell us which data to load.
            // Handle virtual node
            if (leafNode && leafNode.id <= 0) {
                // Handle search or search results
                if (leafNode.name === 'search') {
                    var searchParams,
                        s = this.globalOptions.search
                            .replace(/^\s+/, '')
                            .replace(/\s+$/, ''),
                        path = this.pathToStr(this.path) || this.rootPathStr;
                    action = 'search';
                    // Assemble search command
                    searchParams = {
                        path: s.length ? path : self.prevPath,
                        incdel: this.globalOptions.includeDeleted,
                        sarea: this.globalOptions.searchArea,
                        sfields: this.globalOptions.searchFields,
                        s: s
                    };
                    // If this command equals the last one, just return our
                    // buffered result.
                    if (angular.equals(searchParams, self.lastSearch)) {
                        var data = {
                                ok: true,
                                data: {
                                    rows: self.lastSearchResult
                                }
                            },
                            dfr = $q.defer();
                        dfr.resolve(data);
                        return dfr.promise;
                    }
                    // Nope, this is a fresh search:
                    else {
                        httpConfig.params = searchParams;
                    }
                }
                else {
                    throw new Error('Unknown virtual node: ' + leafNode.id);
                }
            }
            // Handle regular node / path
            else {
                httpConfig.params = {
                    path: this.pathToStr(this.path) || this.rootPathStr,
                    incdel: this.globalOptions.includeDeleted,
                    sarea: this.globalOptions.searchArea,
                    sfields: this.globalOptions.searchFields,
                    s: ''
                };
            }
            return $http.get(RC.urls.load_items, httpConfig)
                .then(
                function (resp) {
                    // Search results may have both, valid rows and error/warning
                    // messages. So look for rows and not just for the ok flag.
                    if (resp.data.data.rows) {
                        // Process search results
                        if (action === 'search') {
                            // Put them into our buffer
                            self.lastSearchResult = resp.data.data.rows;
                        }
                        // action === 'load' needs no special processing
                    }
                    if (! resp.data.ok) {
                        pym.growler.growlAjaxResp(resp.data);
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
                    incdel: this.globalOptions.includeDeleted
                }
            };
            return $http.get(RC.urls.load_tree, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // noop
                    }
                    else {
                        pym.growler.growlAjaxResp(resp.data);
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
                        pym.growler.growlAjaxResp(resp.data);
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
                        pym.growler.growlAjaxResp(resp.data);
                        return false;
                    }
                },
                function (result) {
                    return result;
                }
            );
        },

        changeItemAttr: function (itemId, attr, newValue, oldValue) {
            var httpConfig = {},
                putData = {
                    id: itemId,
                    attr: attr,
                    nv: newValue,
                    ov: oldValue
                };
            // Caller need not to differentiate between invalid data and network
            // errors: Return a rejected promise in both cases.
            return $http.put(RC.urls.edit_item, putData, httpConfig)
            .then(
                function (resp) {
                    pym.growler.growlAjaxResp(resp.data);
                    return resp.data.ok ? resp : $q.reject(resp);
                },
                function (result) {
                    return $q.reject(result);
                }
            );
        },

        buildDownloadUrl: function (nameOrEntity) {
            var pp, s, name, entity, uu, loc;
            if (angular.isString(nameOrEntity)) {
                name = nameOrEntity;
                // Make local copy of original path
                pp = this.path.slice();
                // Remove filesystem root, because browser is already there:
                // http://HOST:PORT/TENANT/fs/@@_br_
                if (pp[0].name === 'fs') { pp.shift(); }
                // Stringify path and append name
                s = pp.length ? this.pathToStr(pp) + '/' + name : name;
                // Get current url and apply our path string
                return $window.location.href.replace(/@@_br_/, s);
            }
            else {
                entity = nameOrEntity;
                // Get current path from browser and keep only the first 2
                // elements: 0=EMPTY, 1=TENANT. This will discard the 3rd node
                // ("fs") too, because entity.location starts with "fs".
                uu = $window.location.pathname.split('/').slice(0, 2).join('/');
                // From location remove leading /
                s = $window.location.origin + uu + '/'
                    + entity.location + '/' + entity._name;
                return s;
            }

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
                    if (file.state === FILE_STATES.UPLOADING) {
                        file.setState(FILE_STATES.UPLOAD_ERROR);
                        file.validationMessage = 'Unknown error';
                    }
                }
                pym.growler.growlAjaxResp(data, false);
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
        }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZzLmpzIiwiZnMtY29uc3QuanMiLCJmcy1zZXJ2aWNlLmpzIiwidXBsb2FkZXItc2VydmljZS5qcyIsInVwbG9hZGVyLWNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdlpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZShcInB5bS5mc1wiLCBbXSk7IiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpXG4gICAgLmNvbnN0YW50KCdGSUxFX1NUQVRFUycsIHtcbiAgICAgICAgJ05FVyc6ICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAnVkFMSURBVElORyc6ICAgICAgICAgMTAsXG4gICAgICAgICdWQUxJREFUSU9OX09LJzogICAgICAyMCxcbiAgICAgICAgJ1ZBTElEQVRJT05fRVJST1InOiAgLTIwLFxuICAgICAgICAnQ0FOX1VQTE9BRCc6ICAgICAgICAgNzAsXG4gICAgICAgICdVUExPQURJTkcnOiAgICAgICAgICA4MCxcbiAgICAgICAgJ1VQTE9BRF9PSyc6ICAgICAgICAgIDkwLFxuICAgICAgICAnVVBMT0FEX0VSUk9SJzogICAgICAtOTAsXG4gICAgICAgICdVUExPQURfQ0FOQ0VMRUQnOiAgLTEwMFxuICAgIH0pXG4gICAgLmNvbnN0YW50KCdGSUxFX1NUQVRFX0NBUFRJT05TJywge1xuICAgICAgICAgICAnMCcgOiAnTmV3ICgwKScsXG4gICAgICAgICAgJzEwJyA6ICdWYWxpZGF0aW5nICgxMCknLFxuICAgICAgICAgICcyMCcgOiAnVmFsaWRhdGlvbiBPSyAoMjApJyxcbiAgICAgICAgICctMjAnIDogJ1ZhbGlkYXRpb24gRXJyb3IgKC0yMCknLFxuICAgICAgICAgICc3MCcgOiAnQ2FuIFVwbG9hZCAoNzApJyxcbiAgICAgICAgICAnODAnIDogJ1VwbG9hZGluZyAoODApJyxcbiAgICAgICAgICAnOTAnIDogJ1VwbG9hZCBPSyAoOTApJyxcbiAgICAgICAgICctOTAnIDogJ1VwbG9hZCBFcnJvciAoLTkwKScsXG4gICAgICAgICctMTAwJyA6ICdVcGxvYWQgQ2FuY2VsZWQgKC0xMDApJ1xuICAgIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpLmZhY3RvcnkoJ3B5bUZzU2VydmljZScsXG4gICAgICAgIFsnJGxvZycsICckaHR0cCcsICckcScsICckd2luZG93JywgJ1JDJywgJ3B5bVNlcnZpY2UnLFxuZnVuY3Rpb24gKCRsb2csICAgJGh0dHAsICAgJHEsICAgJHdpbmRvdywgICBSQywgICBweW0pIHtcblxuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIEZzU2VydmljZSA9IHtcbiAgICAgICAgdHJlZTogbnVsbCxcbiAgICAgICAgYnJvd3NlcjogbnVsbCxcblxuICAgICAgICByb290UGF0aFN0cjogJycsXG4gICAgICAgIHBhdGg6IFtdLFxuICAgICAgICBwcmV2UGF0aDogW10sXG5cbiAgICAgICAgZ2xvYmFsT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZURlbGV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoQXJlYTogJ2hlcmUnLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiAnbmFtZScsXG4gICAgICAgICAgICBzZWFyY2g6ICcnXG4gICAgICAgIH0sXG5cbiAgICAgICAgb25VcGxvYWRGaW5pc2hlZDogbnVsbCxcblxuICAgICAgICBsYXN0U2VhcmNoOiB7XG4gICAgICAgICAgICBwYXRoOiBudWxsLFxuICAgICAgICAgICAgaW5jZGVsOiBudWxsLFxuICAgICAgICAgICAgc2FyZWE6IG51bGwsXG4gICAgICAgICAgICBzZmllbGRzOiBudWxsLFxuICAgICAgICAgICAgczogbnVsbFxuICAgICAgICB9LFxuICAgICAgICBsYXN0U2VhcmNoUmVzdWx0OiBudWxsLFxuXG4gICAgICAgIGZpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdsb2JhbE9wdGlvbnMuc2VhcmNoLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZS5zZXRQYXRoQnlJZCgtMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy50cmVlLnJlZnJlc2goKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5yZWZyZXNoKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UGF0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQYXRoU3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRQYXRoOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV0uaWQgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2UGF0aCA9IHRoaXMucGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgICAgICB0aGlzLnRyZWUuc2V0UGF0aChwYXRoKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5zZXRQYXRoKHBhdGgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldExlYWZOb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGgtMV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRvZ2dsZXMgZmxhZyBpbmNsdWRlRGVsZXRlZCBhbmQgY2hhbmdlcyBwYXRoIGludGVsbGlnZW50bHkuXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHVzZXIgY3VycmVudGx5IGlzIGluIGEgZGVsZXRlZCBub2RlIGFuZCBkZWNpZGVzIHRvIG5vdFxuICAgICAgICAgKiBkaXNwbGF5IGRlbGV0ZWQgaXRlbXMgYW55bW9yZSwgcmV0dXJucyB0byB0aGUgZmlyc3Qgbm90LWRlbGV0ZWRcbiAgICAgICAgICogYW5jZXN0b3IuXG4gICAgICAgICAqXG4gICAgICAgICAqIEFsc28gcmVsb2FkcyB0cmVlIGFuZCBicm93c2VyIVxuICAgICAgICAgKi9cbiAgICAgICAgdG9nZ2xlSW5jbHVkZURlbGV0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwcCA9IHRoaXMucGF0aCwgcDAgPSBwcFswXTtcbiAgICAgICAgICAgIC8vdGhpcy5nbG9iYWxPcHRpb25zLmluY2x1ZGVEZWxldGVkID0gIXRoaXMuZ2xvYmFsT3B0aW9ucy5pbmNsdWRlRGVsZXRlZDtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldExlYWZOb2RlKCkuaXNfZGVsZXRlZCAmJiAhdGhpcy5nbG9iYWxPcHRpb25zLmluY2x1ZGVEZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBwLmxlbmd0aCAmJiBwcFtwcC5sZW5ndGgtMV0uaXNfZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBwcC5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlLCB3ZSBhdCBsZWFzdCBzdGF5IG9uIHRoZSByb290IG5vZGVcbiAgICAgICAgICAgICAgICBpZiAoISBwcC5sZW5ndGgpIHsgcHAucHVzaChwMCk7IH1cbiAgICAgICAgICAgICAgICB0aGlzLnNldFBhdGgocHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVlLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXIucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXNlcyBGcyBieSBhIHBhdGggc3RyaW5nLlxuICAgICAgICAgKlxuICAgICAgICAgKiAxLiBUaGUgcGFnZSBjb250cm9sbGVyIGNhbGxzIHVzIHdpdGggdGhlIHBhdGggc3RyaW5nLlxuICAgICAgICAgKiAyYS4gV2UgY2FsbCB0aGUgYnJvd3NlciB0byBsb2FkIHRoZSBpdGVtcyBvZiB0aGUgcm9vdCBwYXRoLlxuICAgICAgICAgKiAyYi4gQ29uY3VycmVudGx5IHdlIGNhbGwgdGhlIHRyZWUsIHdoaWNoIGxvYWRzIHRoZSBpbml0aWFsIG5vZGUgdHJlZVxuICAgICAgICAgKiAgICAgYW5kIHNldHMgdXAgdGhlIHBhdGggYXMgYSBsaXN0IG9mIG5vZGVzLlxuICAgICAgICAgKiAzLiBXaGVuIHRoZSB0cmVlIGhhcyBsb2FkZWQgYW5kIGl0cyBwYXRoIGlzIHNldCB1cCwgd2UgZ3JhYiB0aGUgcGF0aFxuICAgICAgICAgKiAgICBmcm9tIHRoZXJlIGZvciBvdXJzZWx2ZXMgYW5kIGFsc28gcHJvdmlkZSB0aGUgYnJvd3NlciB3aXRoIGl0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFN0ciAtIFJvb3QgcGF0aCBvZiB0cmVlIGFzIHN0cmluZy5cbiAgICAgICAgICovXG4gICAgICAgIGZpcnN0TG9hZDogZnVuY3Rpb24gKHBhdGhTdHIpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMucm9vdFBhdGhTdHIgPSBwYXRoU3RyO1xuICAgICAgICAgICAgJGxvZy5sb2coJ2ZpcnN0TG9hZCcsIHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksICB0aGlzLnJvb3RQYXRoU3RyKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5sb2FkSXRlbXMoKTtcbiAgICAgICAgICAgIHRoaXMudHJlZS5pbml0Tm9kZXMoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBzZWxmLnBhdGggPSBzZWxmLnRyZWUucGF0aDtcbiAgICAgICAgICAgICAgICBzZWxmLmJyb3dzZXIucGF0aCA9IHNlbGYucGF0aDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGV4dHJhY3RNZXRhOiBmdW5jdGlvbiAobmFtZUxpc3QpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sXG4gICAgICAgICAgICAgICAgcG9zdERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVzOiBuYW1lTGlzdCxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KFJDLnVybHMuZXh0cmFjdF9tZXRhLCBwb3N0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb29wXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVEaXJlY3Rvcnk6IGZ1bmN0aW9uIChkaXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHt9LFxuICAgICAgICAgICAgICAgIHBvc3REYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBkaXJOYW1lLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KFJDLnVybHMuY3JlYXRlX2RpcmVjdG9yeSwgcG9zdERhdGEsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9vcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVsZXRlSXRlbXM6IGZ1bmN0aW9uIChuYW1lcywgcmVhc29uKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZXM6IG5hbWVzLFxuICAgICAgICAgICAgICAgICAgICByZWFzb246IHJlYXNvblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKFJDLnVybHMuZGVsZXRlX2l0ZW1zLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PT1BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVuZGVsZXRlSXRlbXM6IGZ1bmN0aW9uIChuYW1lcykge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fSxcbiAgICAgICAgICAgICAgICBwdXREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lczogbmFtZXNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChSQy51cmxzLnVuZGVsZXRlX2l0ZW1zLCBwdXREYXRhLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5PT1BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRJdGVtczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgICAgIGh0dHBDb25maWcgPSB7cGFyYW1zOiB7fX0sXG4gICAgICAgICAgICAgICAgYWN0aW9uID0gJ2xvYWQnLFxuICAgICAgICAgICAgICAgIGxlYWZOb2RlID0gdGhpcy5nZXRMZWFmTm9kZSgpO1xuXG4gICAgICAgICAgICAvLyBUaGUgY3VycmVudCBsZWFmIG5vZGUgdGVsbCB1cyB3aGljaCBkYXRhIHRvIGxvYWQuXG4gICAgICAgICAgICAvLyBIYW5kbGUgdmlydHVhbCBub2RlXG4gICAgICAgICAgICBpZiAobGVhZk5vZGUgJiYgbGVhZk5vZGUuaWQgPD0gMCkge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggb3Igc2VhcmNoIHJlc3VsdHNcbiAgICAgICAgICAgICAgICBpZiAobGVhZk5vZGUubmFtZSA9PT0gJ3NlYXJjaCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlYXJjaFBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHMgPSB0aGlzLmdsb2JhbE9wdGlvbnMuc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL15cXHMrLywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xccyskLywgJycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCkgfHwgdGhpcy5yb290UGF0aFN0cjtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gJ3NlYXJjaCc7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFzc2VtYmxlIHNlYXJjaCBjb21tYW5kXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHMubGVuZ3RoID8gcGF0aCA6IHNlbGYucHJldlBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNkZWw6IHRoaXMuZ2xvYmFsT3B0aW9ucy5pbmNsdWRlRGVsZXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhcmVhOiB0aGlzLmdsb2JhbE9wdGlvbnMuc2VhcmNoQXJlYSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNmaWVsZHM6IHRoaXMuZ2xvYmFsT3B0aW9ucy5zZWFyY2hGaWVsZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBzOiBzXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgY29tbWFuZCBlcXVhbHMgdGhlIGxhc3Qgb25lLCBqdXN0IHJldHVybiBvdXJcbiAgICAgICAgICAgICAgICAgICAgLy8gYnVmZmVyZWQgcmVzdWx0LlxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMoc2VhcmNoUGFyYW1zLCBzZWxmLmxhc3RTZWFyY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2s6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M6IHNlbGYubGFzdFNlYXJjaFJlc3VsdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZnIgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGZyLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGZyLnByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gTm9wZSwgdGhpcyBpcyBhIGZyZXNoIHNlYXJjaDpcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodHRwQ29uZmlnLnBhcmFtcyA9IHNlYXJjaFBhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHZpcnR1YWwgbm9kZTogJyArIGxlYWZOb2RlLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBIYW5kbGUgcmVndWxhciBub2RlIC8gcGF0aFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaHR0cENvbmZpZy5wYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCkgfHwgdGhpcy5yb290UGF0aFN0cixcbiAgICAgICAgICAgICAgICAgICAgaW5jZGVsOiB0aGlzLmdsb2JhbE9wdGlvbnMuaW5jbHVkZURlbGV0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHNhcmVhOiB0aGlzLmdsb2JhbE9wdGlvbnMuc2VhcmNoQXJlYSxcbiAgICAgICAgICAgICAgICAgICAgc2ZpZWxkczogdGhpcy5nbG9iYWxPcHRpb25zLnNlYXJjaEZpZWxkcyxcbiAgICAgICAgICAgICAgICAgICAgczogJydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfaXRlbXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIHJlc3VsdHMgbWF5IGhhdmUgYm90aCwgdmFsaWQgcm93cyBhbmQgZXJyb3Ivd2FybmluZ1xuICAgICAgICAgICAgICAgICAgICAvLyBtZXNzYWdlcy4gU28gbG9vayBmb3Igcm93cyBhbmQgbm90IGp1c3QgZm9yIHRoZSBvayBmbGFnLlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLmRhdGEucm93cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJvY2VzcyBzZWFyY2ggcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NlYXJjaCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQdXQgdGhlbSBpbnRvIG91ciBidWZmZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmxhc3RTZWFyY2hSZXN1bHQgPSByZXNwLmRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWN0aW9uID09PSAnbG9hZCcgbmVlZHMgbm8gc3BlY2lhbCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCEgcmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZFRyZWU6IGZ1bmN0aW9uIChmaWx0ZXIpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnJvb3RQYXRoU3RyLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IGZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgaW5jZGVsOiB0aGlzLmdsb2JhbE9wdGlvbnMuaW5jbHVkZURlbGV0ZWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChSQy51cmxzLmxvYWRfdHJlZSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2FkRnNQcm9wZXJ0aWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtwYXJhbXM6IHt9fTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoUkMudXJscy5sb2FkX2ZzX3Byb3BlcnRpZXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRJdGVtUHJvcGVydGllczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoUkMudXJscy5sb2FkX2l0ZW1fcHJvcGVydGllcywgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2hhbmdlSXRlbUF0dHI6IGZ1bmN0aW9uIChpdGVtSWQsIGF0dHIsIG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fSxcbiAgICAgICAgICAgICAgICBwdXREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBpZDogaXRlbUlkLFxuICAgICAgICAgICAgICAgICAgICBhdHRyOiBhdHRyLFxuICAgICAgICAgICAgICAgICAgICBudjogbmV3VmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIG92OiBvbGRWYWx1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBDYWxsZXIgbmVlZCBub3QgdG8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGludmFsaWQgZGF0YSBhbmQgbmV0d29ya1xuICAgICAgICAgICAgLy8gZXJyb3JzOiBSZXR1cm4gYSByZWplY3RlZCBwcm9taXNlIGluIGJvdGggY2FzZXMuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KFJDLnVybHMuZWRpdF9pdGVtLCBwdXREYXRhLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcC5kYXRhLm9rID8gcmVzcCA6ICRxLnJlamVjdChyZXNwKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYnVpbGREb3dubG9hZFVybDogZnVuY3Rpb24gKG5hbWVPckVudGl0eSkge1xuICAgICAgICAgICAgdmFyIHBwLCBzLCBuYW1lLCBlbnRpdHksIHV1LCBsb2M7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhuYW1lT3JFbnRpdHkpKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWVPckVudGl0eTtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIGxvY2FsIGNvcHkgb2Ygb3JpZ2luYWwgcGF0aFxuICAgICAgICAgICAgICAgIHBwID0gdGhpcy5wYXRoLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGZpbGVzeXN0ZW0gcm9vdCwgYmVjYXVzZSBicm93c2VyIGlzIGFscmVhZHkgdGhlcmU6XG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL0hPU1Q6UE9SVC9URU5BTlQvZnMvQEBfYnJfXG4gICAgICAgICAgICAgICAgaWYgKHBwWzBdLm5hbWUgPT09ICdmcycpIHsgcHAuc2hpZnQoKTsgfVxuICAgICAgICAgICAgICAgIC8vIFN0cmluZ2lmeSBwYXRoIGFuZCBhcHBlbmQgbmFtZVxuICAgICAgICAgICAgICAgIHMgPSBwcC5sZW5ndGggPyB0aGlzLnBhdGhUb1N0cihwcCkgKyAnLycgKyBuYW1lIDogbmFtZTtcbiAgICAgICAgICAgICAgICAvLyBHZXQgY3VycmVudCB1cmwgYW5kIGFwcGx5IG91ciBwYXRoIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiAkd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvQEBfYnJfLywgcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbnRpdHkgPSBuYW1lT3JFbnRpdHk7XG4gICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgcGF0aCBmcm9tIGJyb3dzZXIgYW5kIGtlZXAgb25seSB0aGUgZmlyc3QgMlxuICAgICAgICAgICAgICAgIC8vIGVsZW1lbnRzOiAwPUVNUFRZLCAxPVRFTkFOVC4gVGhpcyB3aWxsIGRpc2NhcmQgdGhlIDNyZCBub2RlXG4gICAgICAgICAgICAgICAgLy8gKFwiZnNcIikgdG9vLCBiZWNhdXNlIGVudGl0eS5sb2NhdGlvbiBzdGFydHMgd2l0aCBcImZzXCIuXG4gICAgICAgICAgICAgICAgdXUgPSAkd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJykuc2xpY2UoMCwgMikuam9pbignLycpO1xuICAgICAgICAgICAgICAgIC8vIEZyb20gbG9jYXRpb24gcmVtb3ZlIGxlYWRpbmcgL1xuICAgICAgICAgICAgICAgIHMgPSAkd2luZG93LmxvY2F0aW9uLm9yaWdpbiArIHV1ICsgJy8nXG4gICAgICAgICAgICAgICAgICAgICsgZW50aXR5LmxvY2F0aW9uICsgJy8nICsgZW50aXR5Ll9uYW1lO1xuICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG5cbiAgICAgICAgcGF0aFRvU3RyOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgaWYgKCEgKGFuZ3VsYXIuaXNBcnJheShwYXRoKSAmJiBwYXRoLmxlbmd0aCA+IDApKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgICAgICB2YXIgcHAgPSBbXTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICBwYXRoLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBwcC5wdXNoKHgubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBwcC5qb2luKCcvJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIEZzU2VydmljZTtcbn1dKTsiLCJhbmd1bGFyLm1vZHVsZSgncHltLmZzJykuZmFjdG9yeSgncHltRnNVcGxvYWRlclNlcnZpY2UnLFxuICAgICAgICBbJyRsb2cnLCAnJHVwbG9hZCcsICckaHR0cCcsICdSQycsICdweW1TZXJ2aWNlJywgJ0ZJTEVfU1RBVEVTJywgJ0ZJTEVfU1RBVEVfQ0FQVElPTlMnLFxuZnVuY3Rpb24gKCRsb2csICAgJHVwbG9hZCwgICAkaHR0cCwgICBSQywgICBweW0sICAgICAgICAgIEZJTEVfU1RBVEVTLCAgIEZJTEVfU1RBVEVfQ0FQVElPTlMpIHtcblxuICAgIFwidXNlIHN0cmljdFwiO1xuXG5cbiAgICBmdW5jdGlvbiBQeW1GaWxlKGZpbGUpIHtcbiAgICAgICAgdGhpcy5maWxlID0gZmlsZTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IDA7XG4gICAgICAgIHRoaXMuc3RhdGVDYXB0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy5rZXkgPSBudWxsO1xuICAgICAgICB0aGlzLnByb2dyZXNzID0gMDtcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHRoaXMudmFsaWRhdGlvbk1lc3NhZ2UgPSBudWxsO1xuICAgICAgICB0aGlzLnVwbG9hZFByb21pc2UgPSBudWxsO1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNVcGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNFcnJvciA9IGZhbHNlO1xuICAgICAgICB0aGlzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gbnVsbDtcbiAgICAgICAgdGhpcy53cml0ZU1vZGUgPSBudWxsO1xuICAgIH1cblxuICAgIFB5bUZpbGUucHJvdG90eXBlLnNldFN0YXRlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICB0aGlzLnN0YXRlQ2FwdGlvbiA9IEZJTEVfU1RBVEVfQ0FQVElPTlNbc3RhdGVdO1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gKHRoaXMuc3RhdGUgPiBGSUxFX1NUQVRFUy5ORVcgJiZcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPCBGSUxFX1NUQVRFUy5VUExPQURfT0spO1xuICAgICAgICB0aGlzLmlzVXBsb2FkaW5nID0gKHRoaXMuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlVQTE9BRElORyk7XG4gICAgICAgIHRoaXMuaGFzRXJyb3IgPSAodGhpcy5zdGF0ZSA+IEZJTEVfU1RBVEVTLlVQTE9BRF9DQU5DRUxFRCAmJlxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA8IEZJTEVfU1RBVEVTLk5FVyk7XG4gICAgICAgICRsb2cubG9nKCdzdGF0ZScsIHN0YXRlLCB0aGlzLnN0YXRlQ2FwdGlvbiwgdGhpcyk7XG4gICAgfTtcblxuICAgIFB5bUZpbGUucHJvdG90eXBlLnNldFdyaXRlTW9kZSA9IGZ1bmN0aW9uKHdyaXRlTW9kZSkge1xuICAgICAgICB0aGlzLndyaXRlTW9kZSA9IHdyaXRlTW9kZTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShGSUxFX1NUQVRFUy5DQU5fVVBMT0FEKTtcbiAgICB9O1xuXG4gICAgUHltRmlsZS5wcm90b3R5cGUuc2V0RXhpc3RzQW5kUGVybWlzc2lvbnMgPSBmdW5jdGlvbihleGlzdHMsIHBlcm1pc3Npb25zKSB7XG4gICAgICAgIHRoaXMuZXhpc3RzID0gZXhpc3RzO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgICAgIGlmICghZXhpc3RzICYmIHBlcm1pc3Npb25zLmNyZWF0ZSkge1xuICAgICAgICAgICAgdGhpcy5zZXRXcml0ZU1vZGUoJ2NyZWF0ZScpO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShGSUxFX1NUQVRFUy5DQU5fVVBMT0FEKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9PSyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgUHltRmlsZS5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnVwbG9hZFByb21pc2UpIHsgdGhpcy51cGxvYWRQcm9taXNlLmFib3J0KCk7IH1cbiAgICAgICAgdGhpcy5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfQ0FOQ0VMRUQpO1xuICAgIH07XG5cblxuICAgIHZhciBVcGxvYWRlclNlcnZpY2UgPSB7XG5cbiAgICAgICAgY3JlYXRlUHltRmlsZTogZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHltRmlsZShmaWxlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUGVyZm9ybXMgdXBsb2FkIG9mIGEgZmlsZSBhbmQgcmV0dXJucyBwcm9taXNlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFN0ciAtIFBhdGggd2hlcmUgdG8gc2F2ZSB0aGUgZmlsZVxuICAgICAgICAgKiBAcGFyYW0ge1B5bUZpbGV9IGZpbGUgLSBJbnN0YW5jZSBvZiBhIFB5bUZpbGVcbiAgICAgICAgICogQHJldHVybnMge3Byb21pc2V9XG4gICAgICAgICAqL1xuICAgICAgICB1cGxvYWQ6IGZ1bmN0aW9uIChwYXRoU3RyLCBmaWxlKSB7XG4gICAgICAgICAgICB2YXIgdXBsb2FkQ29uZiA9IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBSQy51cmxzLnVwbG9hZCxcbiAgICAgICAgICAgICAgICAgICAgZmlsZTogZmlsZS5maWxlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGZpbGUua2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZS5maWxlLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoU3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfbW9kZTogZmlsZS53cml0ZU1vZGVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJywgLy8gJ1BPU1QnIG9yICdQVVQnLCBkZWZhdWx0IFBPU1RcblxuICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge30sIC8vIHsnQXV0aG9yaXphdGlvbic6ICd4eHgnfSBvbmx5IGZvciBodG1sNVxuXG4gICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZTogbnVsbCwgLy8nZG9jLmpwZycgb3IgWycxLmpwZycsICcyLmpwZycsIC4uLl0sICB0byBtb2RpZnkgdGhlIG5hbWUgb2YgdGhlIGZpbGUocylcblxuICAgICAgICAgICAgICAgICAgICAgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZSBjb3VsZCBiZVxuICAgICAgICAgICAgICAgICAgICAgLy8gYW4gYXJyYXkgIG9mIG5hbWVzIGZvciBtdWx0aXBsZSBmaWxlcyAoaHRtbDUpLiBEZWZhdWx0IGlzICdmaWxlJ1xuICAgICAgICAgICAgICAgICAgICAgZmlsZUZvcm1EYXRhTmFtZTogJ2ZpbGUnLCAvLyAnbXlGaWxlJyBvciBbJ2ZpbGVbMF0nLCAnZmlsZVsxXScsIC4uLl0sXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIG1hcCBvZiBleHRyYSBmb3JtIGRhdGEgZmllbGRzIHRvIHNlbmQgYWxvbmcgd2l0aCBmaWxlLiBlYWNoIGZpZWxkIHdpbGwgYmUgc2VudCBhcyBhIGZvcm0gZmllbGQuXG4gICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdmFsdWVzIGFyZSBjb252ZXJ0ZWQgdG8ganNvbiBzdHJpbmcgb3IganNvYiBibG9iIGRlcGVuZGluZyBvbiAnc2VuZE9iamVjdHNBc0pzb25CbG9iJyBvcHRpb24uXG4gICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IG51bGwsIC8vIHtrZXk6ICRzY29wZS5teVZhbHVlLCAuLi59LFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGUgdmFsdWUgb2YgYSBmb3JtIGZpZWxkIGlzIGFuIG9iamVjdCBpdCB3aWxsIGJlIHNlbnQgYXMgJ2FwcGxpY2F0aW9uL2pzb24nIGJsb2JcbiAgICAgICAgICAgICAgICAgICAgIC8vIHJhdGhlciB0aGFuIGpzb24gc3RyaW5nLCBkZWZhdWx0IGZhbHNlLlxuICAgICAgICAgICAgICAgICAgICAgc2VuZE9iamVjdHNBc0pzb25CbG9iOiBmYWxzZSwgLy8gdHJ1ZXxmYWxzZSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gY3VzdG9taXplIGhvdyBkYXRhIGlzIGFkZGVkIHRvIHRoZSBmb3JtRGF0YS4gU2VlICM0MCNpc3N1ZWNvbW1lbnQtMjg2MTIwMDAgZm9yIHNhbXBsZSBjb2RlLlxuICAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFBcHBlbmRlcjogZnVuY3Rpb24oZm9ybURhdGEsIGtleSwgdmFsKXt9LFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBkYXRhIHdpbGwgYmUgc2VudCBhcyBhIHNlcGFyYXRlIGZvcm0gZGF0YSBmaWVsZCBjYWxsZWQgXCJkYXRhXCIuIEl0IHdpbGwgYmUgY29udmVydGVkIHRvIGpzb24gc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgICAvLyBvciBqc29iIGJsb2IgZGVwZW5kaW5nIG9uICdzZW5kT2JqZWN0c0FzSnNvbkJsb2InIG9wdGlvblxuICAgICAgICAgICAgICAgICAgICAgZGF0YToge30sXG5cbiAgICAgICAgICAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2UsIC8vdHJ1ZXxmYWxzZSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLi4uIGFuZCBhbGwgb3RoZXIgYW5ndWxhciAkaHR0cCgpIG9wdGlvbnMgY291bGQgYmUgdXNlZCBoZXJlLlxuICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHA7XG5cbiAgICAgICAgICAgIHAgPSAkdXBsb2FkLnVwbG9hZCh1cGxvYWRDb25mKVxuICAgICAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5sb2coJ3N1Y2MgdXBsJywgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0YVtmaWxlLmtleV0ub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX09LKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUudmFsaWRhdGlvbk1lc3NhZ2UgPSBkYXRhLmRhdGFbZmlsZS5rZXldLnZhbGlkYXRpb25fbXNnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZS5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVVBMT0FESU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnZhbGlkYXRpb25NZXNzYWdlID0gJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AoZGF0YSwgZmFsc2UpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBmaWxlLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9FUlJPUik7XG4gICAgICAgICAgICAgICAgZmlsZS52YWxpZGF0aW9uTWVzc2FnZSA9IHN0YXR1cztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZmlsZS51cGxvYWRQcm9taXNlID0gcDtcbiAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FESU5HKTtcbiAgICAgICAgICAgIHJldHVybiBwO1xuXG4gICAgICAgICAgICAvKiB0aGVuIHByb21pc2UgKG5vdGUgdGhhdCByZXR1cm5lZCBwcm9taXNlIGRvZXNuJ3QgaGF2ZSBwcm9ncmVzcywgeGhyIGFuZCBjYW5jZWwgZnVuY3Rpb25zLiAqL1xuICAgICAgICAgICAgLy8gdmFyIHByb21pc2UgPSB1cGxvYWQudGhlbihzdWNjZXNzLCBlcnJvciwgcHJvZ3Jlc3MpO1xuXG4gICAgICAgICAgICAvKiBjYW5jZWwvYWJvcnQgdGhlIHVwbG9hZCBpbiBwcm9ncmVzcy4gKi9cbiAgICAgICAgICAgIC8vdXBsb2FkLmFib3J0KCk7XG5cbiAgICAgICAgICAgIC8qIGFsdGVybmF0aXZlIHdheSBvZiB1cGxvYWRpbmcsIHNlbmQgdGhlIGZpbGUgYmluYXJ5IHdpdGggdGhlIGZpbGUncyBjb250ZW50LXR5cGUuXG4gICAgICAgICAgICAgQ291bGQgYmUgdXNlZCB0byB1cGxvYWQgZmlsZXMgdG8gQ291Y2hEQiwgaW1ndXIsIGV0Yy4uLiBodG1sNSBGaWxlUmVhZGVyIGlzIG5lZWRlZC5cbiAgICAgICAgICAgICBJdCBjb3VsZCBhbHNvIGJlIHVzZWQgdG8gbW9uaXRvciB0aGUgcHJvZ3Jlc3Mgb2YgYSBub3JtYWwgaHR0cCBwb3N0L3B1dCByZXF1ZXN0LlxuICAgICAgICAgICAgIE5vdGUgdGhhdCB0aGUgd2hvbGUgZmlsZSB3aWxsIGJlIGxvYWRlZCBpbiBicm93c2VyIGZpcnN0IHNvIGxhcmdlIGZpbGVzIGNvdWxkIGNyYXNoIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgIFlvdSBzaG91bGQgdmVyaWZ5IHRoZSBmaWxlIHNpemUgYmVmb3JlIHVwbG9hZGluZyB3aXRoICR1cGxvYWQuaHR0cCgpLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyR1cGxvYWQuaHR0cCh7Li4ufSkgIC8vIFNlZSA4OCNpc3N1ZWNvbW1lbnQtMzEzNjY0ODcgZm9yIHNhbXBsZSBjb2RlLlxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWYWxpZGF0ZXMgZmlsZUxpc3Qgb24gc2VydmVyIHNpZGUuXG4gICAgICAgICAqXG4gICAgICAgICAqIFB1dCBlYWNoIGZpbGUgd2l0aCBzdGF0ZSBWQUxJREFUSU5HIGluIG9uZSByZXF1ZXN0LiBSZXNwb25zZSBkYXRhIG11c3RcbiAgICAgICAgICogYmUgYSBoYXNoOiBrZXkgaXMgZmlsZSdzIGtleSwgdmFsdWUgaXMgJ29rJyBvciB2YWxpZGF0aW9uIG1lc3NhZ2UuXG4gICAgICAgICAqIENvbW11bmljYXRpb24gd2l0aCBzZXJ2ZXIgaXMgYSBQT1NUIHJlcXVlc3QsIG9uIHN1Y2Nlc3Mgd2Ugc2V0IHRoZSBzdGF0ZVxuICAgICAgICAgKiBvZiBlYWNoIGZpbGUgYXMgcmVzcG9uZGVkLiBPbiBlcnJvciwgd2Ugc2V0IHN0YXRlIHRvIFVQTE9BRF9FUlJPUi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhTdHIgLSBQYXRoIGFzIGxpc3Qgb2Ygbm9kZXMuXG4gICAgICAgICAqIEBwYXJhbSB7bGlzdH0gZmlsZUxpc3QgLSBMaXN0IG9mIGluc3RhbmNlcyBvZiBQeW1GaWxlLlxuICAgICAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHZhbGlkYXRlRmlsZXM6IGZ1bmN0aW9uIChwYXRoU3RyLCBmaWxlTGlzdCkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fSwgcG9zdERhdGEgPSB7fSxcbiAgICAgICAgICAgICAgICBmZiA9IFtdO1xuICAgICAgICAgICAgJGxvZy5sb2coJ2ZpbGVMaXN0IHRvIHZhbGlkYXRlJywgZmlsZUxpc3QpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgIGZpbGVMaXN0LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmYucHVzaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleTogdi5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVuYW1lOiB2LmZpbGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogdi5maWxlLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbWVfdHlwZTogdi5maWxlLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHBvc3REYXRhLnBhdGggPSBwYXRoU3RyO1xuICAgICAgICAgICAgcG9zdERhdGEuZmlsZXMgPSBmZjtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KFJDLnVybHMudmFsaWRhdGVfZmlsZXMsIHBvc3REYXRhLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwLmRhdGEuZGF0YSwgZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldEV4aXN0c0FuZFBlcm1pc3Npb25zKHYuZXhpc3RzLCB2LnBlcm1pc3Npb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10udmFsaWRhdGlvbk1lc3NhZ2UgPSB2LnZhbGlkYXRpb25fbXNnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdCwgZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10udmFsaWRhdGlvbk1lc3NhZ2UgPSAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3QsIGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0W2tdLnZhbGlkYXRpb25NZXNzYWdlID0gJ05ldHdvcmsgZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gVXBsb2FkZXJTZXJ2aWNlO1xufV0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpLmNvbnRyb2xsZXIoJ3B5bUZzVXBsb2FkZXJDb250cm9sbGVyJyxcbiAgICAgICAgWyckc2NvcGUnLCAnJHdpbmRvdycsICckbG9nJywgJ1QnLCAncHltU2VydmljZScsICdweW1Gc1NlcnZpY2UnLCAncHltRnNVcGxvYWRlclNlcnZpY2UnLCAnRklMRV9TVEFURVMnLCAnJHEnLFxuZnVuY3Rpb24gKCRzY29wZSwgICAkd2luZG93LCAgICRsb2csICAgVCwgICBweW0sICAgICAgICAgIHB5bUZzU2VydmljZSwgICBweW1Gc1VwbG9hZGVyU2VydmljZSwgICBGSUxFX1NUQVRFUywgICAkcSkge1xuXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgY3RybCA9IHRoaXM7XG4gICAgY3RybC5GSUxFX1NUQVRFUyA9IEZJTEVfU1RBVEVTO1xuXG4gICAgLy8gU3RvcmFnZSBmb3IgJHVwbG9hZGVyIHNlcnZpY2VcbiAgICBjdHJsLmZpbGVzID0gW107XG4gICAgY3RybC5yZWplY3RlZEZpbGVzID0gW107XG4gICAgY3RybC5pc0Ryb3BBdmFpbGFibGUgPSBudWxsO1xuXG4gICAgLy8gRW5xdWV1ZWQgZmlsZXMgdG8gdmFsaWRhdGUgYW5kIHVwbG9hZFxuICAgIGN0cmwucXVldWUgPSB7fTtcbiAgICAvLyBTZXZlcmFsIGNvdW50ZXJzLCB1cGRhdGVkIGJ5IGNvdW50QWN0aXZlVXBsb2FkcyB3YXRjaGVyXG4gICAgLy8gQWN0aXZlIG1lYW5zIGVpdGhlciB2YWxpZGF0aW5nIG9yIHVwbG9hZGluZ1xuICAgIGN0cmwuYWN0aXZlVXBsb2FkcyA9IDA7XG4gICAgLy8gVmFsaWRhdGlvbiBlcnJvcnMgKyB1cGxvYWQgZXJyb3JzXG4gICAgY3RybC5lcnJvcnMgPSAwO1xuICAgIC8vIFRyYW5zZmVycmluZyBkYXRhXG4gICAgY3RybC51cGxvYWRpbmcgPSAwO1xuICAgIC8vIHRvdGFsIHByb2dyZXNzXG4gICAgY3RybC50b3RhbFByb2dyZXNzID0gMDtcblxuICAgIGN0cmwud2luZG93TWF4aW1pemVkID0gdHJ1ZTtcbiAgICBjdHJsLndpbmRvd0lzT3BlbiA9IGZhbHNlO1xuXG4gICAgY3RybC5jb3VudEFjdGl2ZVVwbG9hZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuID0gMCwgZSA9IDAsIHUgPSAwLCBwID0gMCwgbGVuID0gMDtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGN0cmwucXVldWUsIGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICBpZiAoZi5pc0FjdGl2ZSkgeyArK247IH1cbiAgICAgICAgICAgIGlmIChmLmhhc0Vycm9yKSB7ICsrZTsgfVxuICAgICAgICAgICAgaWYgKGYuaXNVcGxvYWRpbmcpIHsgKyt1OyB9XG4gICAgICAgICAgICBwICs9IGYucHJvZ3Jlc3M7XG4gICAgICAgICAgICArK2xlbjtcbiAgICAgICAgfSk7XG4gICAgICAgIGN0cmwuYWN0aXZlVXBsb2FkcyA9IG47XG4gICAgICAgIGN0cmwuZXJyb3JzID0gZTtcbiAgICAgICAgY3RybC51cGxvYWRpbmcgPSB1O1xuICAgICAgICBpZiAobGVuICE9PSAwKSB7XG4gICAgICAgICAgICBjdHJsLnRvdGFsUHJvZ3Jlc3MgPSBwYXJzZUludChwIC8gbGVuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3RybC5hY3RpdmVVcGxvYWRzO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKGN0cmwuY291bnRBY3RpdmVVcGxvYWRzLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgIGlmIChuZXdWYWx1ZSA9PT0gMCAmJiBuZXdWYWx1ZSAhPT0gb2xkVmFsdWUgJiYgcHltRnNTZXJ2aWNlLm9uVXBsb2FkRmluaXNoZWQpIHtcbiAgICAgICAgICAgIHB5bUZzU2VydmljZS5vblVwbG9hZEZpbmlzaGVkKCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGN0cmwubWluaW1heFdpbmRvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY3RybC53aW5kb3dNYXhpbWl6ZWQgPSAhY3RybC53aW5kb3dNYXhpbWl6ZWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbmNlbHMgYWxsIGFjdGl2ZSB1cGxvYWRzLlxuICAgICAqXG4gICAgICogTGV0cyB1c2VyIGNvbmZpcm0uIFJlc3BvbnNlIGlzIHRyaWdnZXJlZCBieSBhbiBldmVudCwgaW93LCBpdCBhcnJpdmVzXG4gICAgICogYXN5bmNocm9ub3VzbHkuIChXZSB1c2Ugb3VyIG93biBkaWFsb2csIG5vdCAkd2luZG93LmNvbmZpcm0uKVxuICAgICAqXG4gICAgICogV2UgbWF5IGdldCBjYWxsZWQgZnJvbSBhbm90aGVyIGZ1bmN0aW9uIChjbG9zZVdpbmRvdyksIHNvIHJldHVybiBhIHByb21pc2VcbiAgICAgKiB0byBzaWduYWwgd2hhdCB0aGUgdXNlciBzZWxlY3RlZC5cbiAgICAgKlxuICAgICAqIElmIHRoZXJlIGFyZSBubyBhY3RpdmUgZG93bmxvYWRzLCB3ZSBkbyBub3QgbGV0IHRoZSB1c2VyIGNvbmZpcm0uIFN0aWxsXG4gICAgICogcmV0dXJuIGEgcHJvbWlzZSwgYSByZXNvbHZlZCBvbmUsIHNvIHRoZSBjYWxsZXIgaXMgY2xlYXJlZCB0byBkbyBoaXNcbiAgICAgKiB0aGluZy5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtwcm9taXNlfVxuICAgICAqL1xuICAgIGN0cmwuY2FuY2VsQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoY3RybC5hY3RpdmVVcGxvYWRzKSB7XG4gICAgICAgICAgICByZXR1cm4gcHltLmdyb3dsZXIuY29uZmlybShULmNvbmZpcm1fY2FuY2VsX2FsbF91cGxvYWRzKVxuICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY3RybC5xdWV1ZSwgZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGYuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkcS5kZWZlcigpLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmNsb3NlV2luZG93ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGZ1bmN0aW9uIGRvSXQgKCkge1xuICAgICAgICAgICAgY3RybC5jbGVhclF1ZXVlKCk7XG4gICAgICAgICAgICBjdHJsLndpbmRvd0lzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGN0cmwuYWN0aXZlVXBsb2Fkcykge1xuICAgICAgICAgICAgY3RybC5jYW5jZWxBbGwoKS50aGVuKGRvSXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZG9JdCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGN0cmwuZmlsZURyb3BwZWQgPSBmdW5jdGlvbiAoJGZpbGVzLCAkZXZlbnQsICRyZWplY3RlZEZpbGVzKSB7XG4gICAgICAgICRsb2cubG9nKCdkcm9wcGVkJywgJGZpbGVzLCB0aGlzLmZpbGVzLCAkZXZlbnQpO1xuICAgICAgICBpZiAoJGZpbGVzICYmICRmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmVucXVldWUoJGZpbGVzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjdHJsLmZpbGVTZWxlY3RlZCA9IGZ1bmN0aW9uICgkZmlsZXMsICRldmVudCkge1xuICAgICAgICAkbG9nLmxvZygnc2VsZWN0ZWQnLCAkZmlsZXMsIHRoaXMuZmlsZXMsICRldmVudCk7XG4gICAgICAgIGlmICgkZmlsZXMgJiYgJGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZW5xdWV1ZSgkZmlsZXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGN0cmwudmFsaWRhdGUgPSBmdW5jdGlvbiAoJGZpbGUpIHtcbiAgICAgICAgJGxvZy5sb2coJ1ZhbGlkYXRpbmcgZmlsZScsICRmaWxlKTtcbiAgICAgICAgcmV0dXJuICRmaWxlLnR5cGUgIT09ICdhdWRpby94LWFwZSc7XG4gICAgfTtcblxuICAgIGN0cmwuY2xlYXJRdWV1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHByb3A7XG4gICAgICAgIGZvciAocHJvcCBpbiBjdHJsLnF1ZXVlKSB7XG4gICAgICAgICAgICBpZiAoY3RybC5xdWV1ZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHJsLnF1ZXVlW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGN0cmwuZW5xdWV1ZSA9IGZ1bmN0aW9uIChmaWxlcykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBpLCBpbWF4LCBmLFxuICAgICAgICAgICAgbXlRdWV1ZSA9IHt9O1xuICAgICAgICBpZiAoISAoZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIGN0cmwud2luZG93SXNPcGVuID0gdHJ1ZTtcbiAgICAgICAgZm9yIChpPTAsIGltYXg9ZmlsZXMubGVuZ3RoOyBpPGltYXg7IGkrKykge1xuICAgICAgICAgICAgZiA9IG5ldyBweW1Gc1VwbG9hZGVyU2VydmljZS5jcmVhdGVQeW1GaWxlKGZpbGVzW2ldKTtcbiAgICAgICAgICAgIGlmIChzZWxmLnF1ZXVlW2ZpbGVzW2ldLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgZi5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX0VSUk9SKTtcbiAgICAgICAgICAgICAgICBmLnZhbGlkYXRpb25NZXNzYWdlID0gJ0ZpbGUgd2l0aCB0aGlzIG5hbWUgYWxyZWFkeSBpbiBxdWV1ZSc7XG4gICAgICAgICAgICAgICAgZi5rZXkgPSBmLmZpbGUubmFtZSArIG5ldyBEYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJTkcpO1xuICAgICAgICAgICAgICAgIHNlbGYudmFsaWRhdGVIZXJlKGYpO1xuICAgICAgICAgICAgICAgIGYua2V5ID0gZi5maWxlLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBteVF1ZXVlW2Yua2V5XSA9IGY7XG4gICAgICAgICAgICBzZWxmLnF1ZXVlW2Yua2V5XSA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgcHltRnNVcGxvYWRlclNlcnZpY2UudmFsaWRhdGVGaWxlcyhweW1Gc1NlcnZpY2UuZ2V0UGF0aFN0cigpLCBteVF1ZXVlKTtcbiAgICB9O1xuXG4gICAgY3RybC52YWxpZGF0ZUhlcmUgPSBmdW5jdGlvbiAoZikge1xuICAgICAgICAvLyBUT0RPIENoZWNrIHF1b3RhLiBJZiB2aW9sYXRpb24sIHNldCBzdGF0ZSBhbmQgbWVzc2FnZSwgaWYgb2ssIGtlZXAgc3RhdGUgYXMgVkFMSURBVElOR1xuICAgIH07XG5cbiAgICBjdHJsLmNiUHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHZhciBuID0gcGFyc2VJbnQoMTAwLjAgKiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcbiAgICAgICAgLy8kbG9nLmxvZygncHJvZ3Jlc3M6ICcgKyBuICsgJyUgZmlsZSA6JysgZXZ0LmNvbmZpZy5maWxlLm5hbWUpO1xuICAgICAgICAvLyRsb2cubG9nKCdwcm9ncmVzcy1ldnQ6ICcsIGV2dCk7XG4gICAgICAgIC8vJGxvZy5sb2coJ3Byb2dyZXNzLXRoaXM6ICcsIHRoaXMpO1xuICAgICAgICB0aGlzLnByb2dyZXNzID0gbjtcbiAgICB9O1xuXG4gICAgLy9jdHJsLmNiU3VjY2VzcyA9IGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgIC8vICAgIC8vIGZpbGUgaXMgdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5XG4gICAgLy8gICAgJGxvZy5sb2coJ2ZpbGUgJyArIGNvbmZpZy5maWxlLm5hbWUgKyAnaXMgdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5LiBSZXNwb25zZTogJyArIGRhdGEpO1xuICAgIC8vICAgIC8vdGhpcy5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfT0spO1xuICAgIC8vfTtcblxuICAgIGN0cmwuc3RhcnRVcGxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIHAsXG4gICAgICAgICAgICBmUHJvZ3Jlc3M7IC8vLCBmU3VjY2VzcztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNlbGYucXVldWUsIGZ1bmN0aW9uKGYpIHtcbiAgICAgICAgICAgIGlmIChmLnN0YXRlID09PSBGSUxFX1NUQVRFUy5DQU5fVVBMT0FEKSB7XG4gICAgICAgICAgICAgICAgJGxvZy5sb2coJ3N0YXJ0aW5nIHVwbG9hZCBvZicsIGYuZmlsZS5uYW1lLCBmKTtcbiAgICAgICAgICAgICAgICAvLyBCaW5kIHRoZSBjYWxsYmFja3MgdG8gdGhlIGluZGl2aWR1YWwgUHltRmlsZSwgc28gdGhhdFxuICAgICAgICAgICAgICAgIC8vIHRoZWlyICd0aGlzJyBwb2ludHMgdG8gdGhlIFB5bUZpbGUgaW5zdGFuY2UuXG4gICAgICAgICAgICAgICAgZlByb2dyZXNzID0gYW5ndWxhci5iaW5kKGYsIHNlbGYuY2JQcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgLy9mU3VjY2VzcyA9IGFuZ3VsYXIuYmluZChmLCBzZWxmLmNiU3VjY2Vzcyk7XG4gICAgICAgICAgICAgICAgcCA9IHB5bUZzVXBsb2FkZXJTZXJ2aWNlLnVwbG9hZChweW1Gc1NlcnZpY2UuZ2V0UGF0aFN0cigpLCBmKVxuICAgICAgICAgICAgICAgICAgICAucHJvZ3Jlc3MoZlByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8uc3VjY2VzcyhmU3VjY2Vzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjdHJsLmNhbmNlbCA9IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgIGZpbGUuYWJvcnQoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGdpdmVuIG1pbWUtdHlwZSBhZ2FpbnN0IHBhdHRlcm4gZnJvbSBgYGFsbG93YGAgYW5kIGBgZGVueWBgXG4gICAgICogYW5kIHJldHVybnMgdHJ1ZSBpZiBtaW1lLXR5cGUgaXMgYWxsb3dlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIGN0cmwuY2hlY2tUeXBlID0gZnVuY3Rpb24gKHR5KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGksIGltYXgsIHBhdCwgZ29vZDtcbiAgICAgICAgaWYgKCEgdHkpIHt0eSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO31cbiAgICAgICAgdHkgPSB0eS5zcGxpdCgnLycpO1xuICAgICAgICAkbG9nLmxvZyh0eSk7XG4gICAgICAgIC8vIElzIGdpdmVuIG1pbWUgdHlwZSBhbGxvd2VkP1xuICAgICAgICBnb29kID0gZmFsc2U7XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PXNlbGYuYWxsb3cubGVuZ3RoOyBpPGltYXg7IGkrKykge1xuICAgICAgICAgICAgcGF0ID0gc2VsZi5hbGxvd1tpXTtcbiAgICAgICAgICAgIGlmIChwYXQuc2VhcmNoKC9cXCovKSA+IC0xICYmIHBhdC5zZWFyY2goL1xcLlxcKi8pID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHBhdCA9IHBhdC5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgICAvXFwqL2csXG4gICAgICAgICAgICAgICAgICAgICcuKidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGF0ID0gcGF0LnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBpZiAodHlbMF0uc2VhcmNoKHBhdFswXSkgPiAtMSAmJiB0eVsxXS5zZWFyY2gocGF0WzFdKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgZ29vZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEgZ29vZCkge3JldHVybiBmYWxzZTt9XG4gICAgICAgIC8vIElzIGdpdmVuIG1pbWUgdHlwZSBkZW5pZWQ/XG4gICAgICAgIGZvciAoaT0wLCBpbWF4PXNlbGYuZGVueS5sZW5ndGg7IGk8aW1heDsgaSsrKSB7XG4gICAgICAgICAgICBwYXQgPSBzZWxmLmRlbnlbaV07XG4gICAgICAgICAgICBpZiAocGF0LnNlYXJjaCgvXFwqLykgPiAtMSAmJiBwYXQuc2VhcmNoKC9cXC5cXCovKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBwYXQgPSBwYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgICAgL1xcKi9nLFxuICAgICAgICAgICAgICAgICAgICAnLionXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhdCA9IHBhdC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgaWYgKHR5WzBdLnNlYXJjaChwYXRbMF0pID4gLTEgfHwgdHlbMV0uc2VhcmNoKHBhdFsxXSkgPiAtMSkge1xuICAgICAgICAgICAgICAgIGdvb2QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ29vZDtcbiAgICB9O1xuXG4gICAgY3RybC5jaGVja1NpemUgPSBmdW5jdGlvbiAoc3opIHtcbiAgICAgICAgcmV0dXJuIChzeiA+PSB0aGlzLm1pblNpemUgJiYgc3ogPD0gdGhpcy5tYXhTaXplKTtcbiAgICB9O1xuXG4gICAgLy9mdW5jdGlvbiBpbml0KCkge1xuICAgIC8vICAgIHZhciBpLCBmO1xuICAgIC8vICAgIGZvciAoaT0wOyBpPDEwOyBpKyspIHtcbiAgICAvLyAgICAgICAgZiA9IG5ldyBweW1Gc1VwbG9hZGVyU2VydmljZS5jcmVhdGVQeW1GaWxlKHtcbiAgICAvLyAgICAgICAgICAgIG5hbWU6ICdkZmRzZmZzIHNkZnNnZGZnIGZnc2ZnZmRnIHNkZmdmZGcgc2RmZ3MgZGZnIHNkZmcgZGZnc2RmZGcgc2RmZ2RmZ3MgZGZnIGQgZHNkZ2ZzZmRzZycsXG4gICAgLy8gICAgICAgICAgICBzaXplOiA2NTIzODU2NjUzLFxuICAgIC8vICAgICAgICAgICAgdHlwZTogJ3N0dWZmL3NhbXBsZSdcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICBmLnNldFN0YXRlKGkgJSAyID09PSAwID8gRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SIDogRklMRV9TVEFURVMuQ0FOX1VQTE9BRCk7XG4gICAgLy8gICAgICAgIGYudmFsaWRhdGlvbk1lc3NhZ2UgPSAnYmxhaCBiw7ZsZGRmIGVyd2UnO1xuICAgIC8vICAgICAgICBjdHJsLnF1ZXVlW2ldID0gZjtcbiAgICAvLyAgICB9XG4gICAgLy8gICAgY3RybC53aW5kb3dJc09wZW4gPSB0cnVlO1xuICAgIC8vfVxuICAgIC8vXG4gICAgLy8vKlxuICAgIC8vKiBSdW4gaW1tZWRpYXRlbHlcbiAgICAvLyovXG4gICAgLy9pbml0KCk7XG5cbn1dKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==