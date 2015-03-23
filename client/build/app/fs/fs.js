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
            this.globalOptions.includeDeleted = !this.globalOptions.includeDeleted;
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
            $log.log(nameOrEntity, typeof nameOrEntity);
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
                $log.log('new path: ', s);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZzLmpzIiwiZnMtY29uc3QuanMiLCJmcy1zZXJ2aWNlLmpzIiwidXBsb2FkZXItc2VydmljZS5qcyIsInVwbG9hZGVyLWNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3paQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZShcInB5bS5mc1wiLCBbXSk7IiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpXG4gICAgLmNvbnN0YW50KCdGSUxFX1NUQVRFUycsIHtcbiAgICAgICAgJ05FVyc6ICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAnVkFMSURBVElORyc6ICAgICAgICAgMTAsXG4gICAgICAgICdWQUxJREFUSU9OX09LJzogICAgICAyMCxcbiAgICAgICAgJ1ZBTElEQVRJT05fRVJST1InOiAgLTIwLFxuICAgICAgICAnQ0FOX1VQTE9BRCc6ICAgICAgICAgNzAsXG4gICAgICAgICdVUExPQURJTkcnOiAgICAgICAgICA4MCxcbiAgICAgICAgJ1VQTE9BRF9PSyc6ICAgICAgICAgIDkwLFxuICAgICAgICAnVVBMT0FEX0VSUk9SJzogICAgICAtOTAsXG4gICAgICAgICdVUExPQURfQ0FOQ0VMRUQnOiAgLTEwMFxuICAgIH0pXG4gICAgLmNvbnN0YW50KCdGSUxFX1NUQVRFX0NBUFRJT05TJywge1xuICAgICAgICAgICAnMCcgOiAnTmV3ICgwKScsXG4gICAgICAgICAgJzEwJyA6ICdWYWxpZGF0aW5nICgxMCknLFxuICAgICAgICAgICcyMCcgOiAnVmFsaWRhdGlvbiBPSyAoMjApJyxcbiAgICAgICAgICctMjAnIDogJ1ZhbGlkYXRpb24gRXJyb3IgKC0yMCknLFxuICAgICAgICAgICc3MCcgOiAnQ2FuIFVwbG9hZCAoNzApJyxcbiAgICAgICAgICAnODAnIDogJ1VwbG9hZGluZyAoODApJyxcbiAgICAgICAgICAnOTAnIDogJ1VwbG9hZCBPSyAoOTApJyxcbiAgICAgICAgICctOTAnIDogJ1VwbG9hZCBFcnJvciAoLTkwKScsXG4gICAgICAgICctMTAwJyA6ICdVcGxvYWQgQ2FuY2VsZWQgKC0xMDApJ1xuICAgIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3B5bS5mcycpLmZhY3RvcnkoJ3B5bUZzU2VydmljZScsXG4gICAgICAgIFsnJGxvZycsICckaHR0cCcsICckcScsICckd2luZG93JywgJ1JDJywgJ3B5bVNlcnZpY2UnLFxuZnVuY3Rpb24gKCRsb2csICAgJGh0dHAsICAgJHEsICAgJHdpbmRvdywgICBSQywgICBweW0pIHtcblxuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIEZzU2VydmljZSA9IHtcbiAgICAgICAgdHJlZTogbnVsbCxcbiAgICAgICAgYnJvd3NlcjogbnVsbCxcblxuICAgICAgICByb290UGF0aFN0cjogJycsXG4gICAgICAgIHBhdGg6IFtdLFxuICAgICAgICBwcmV2UGF0aDogW10sXG5cbiAgICAgICAgZ2xvYmFsT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZURlbGV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoQXJlYTogJ2hlcmUnLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiAnbmFtZScsXG4gICAgICAgICAgICBzZWFyY2g6ICcnXG4gICAgICAgIH0sXG5cbiAgICAgICAgb25VcGxvYWRGaW5pc2hlZDogbnVsbCxcblxuICAgICAgICBsYXN0U2VhcmNoOiB7XG4gICAgICAgICAgICBwYXRoOiBudWxsLFxuICAgICAgICAgICAgaW5jZGVsOiBudWxsLFxuICAgICAgICAgICAgc2FyZWE6IG51bGwsXG4gICAgICAgICAgICBzZmllbGRzOiBudWxsLFxuICAgICAgICAgICAgczogbnVsbFxuICAgICAgICB9LFxuICAgICAgICBsYXN0U2VhcmNoUmVzdWx0OiBudWxsLFxuXG4gICAgICAgIGZpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdsb2JhbE9wdGlvbnMuc2VhcmNoLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZS5zZXRQYXRoQnlJZCgtMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy50cmVlLnJlZnJlc2goKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5yZWZyZXNoKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UGF0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQYXRoU3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRQYXRoOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV0uaWQgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2UGF0aCA9IHRoaXMucGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgICAgICB0aGlzLnRyZWUuc2V0UGF0aChwYXRoKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5zZXRQYXRoKHBhdGgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldExlYWZOb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGgtMV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRvZ2dsZXMgZmxhZyBpbmNsdWRlRGVsZXRlZCBhbmQgY2hhbmdlcyBwYXRoIGludGVsbGlnZW50bHkuXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHVzZXIgY3VycmVudGx5IGlzIGluIGEgZGVsZXRlZCBub2RlIGFuZCBkZWNpZGVzIHRvIG5vdFxuICAgICAgICAgKiBkaXNwbGF5IGRlbGV0ZWQgaXRlbXMgYW55bW9yZSwgcmV0dXJucyB0byB0aGUgZmlyc3Qgbm90LWRlbGV0ZWRcbiAgICAgICAgICogYW5jZXN0b3IuXG4gICAgICAgICAqXG4gICAgICAgICAqIEFsc28gcmVsb2FkcyB0cmVlIGFuZCBicm93c2VyIVxuICAgICAgICAgKi9cbiAgICAgICAgdG9nZ2xlSW5jbHVkZURlbGV0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwcCA9IHRoaXMucGF0aCwgcDAgPSBwcFswXTtcbiAgICAgICAgICAgIHRoaXMuZ2xvYmFsT3B0aW9ucy5pbmNsdWRlRGVsZXRlZCA9ICF0aGlzLmdsb2JhbE9wdGlvbnMuaW5jbHVkZURlbGV0ZWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRMZWFmTm9kZSgpLmlzX2RlbGV0ZWQgJiYgIXRoaXMuZ2xvYmFsT3B0aW9ucy5pbmNsdWRlRGVsZXRlZCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChwcC5sZW5ndGggJiYgcHBbcHAubGVuZ3RoLTFdLmlzX2RlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHAucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSwgd2UgYXQgbGVhc3Qgc3RheSBvbiB0aGUgcm9vdCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKCEgcHAubGVuZ3RoKSB7IHBwLnB1c2gocDApOyB9XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQYXRoKHBwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZS5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5icm93c2VyLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGlzZXMgRnMgYnkgYSBwYXRoIHN0cmluZy5cbiAgICAgICAgICpcbiAgICAgICAgICogMS4gVGhlIHBhZ2UgY29udHJvbGxlciBjYWxscyB1cyB3aXRoIHRoZSBwYXRoIHN0cmluZy5cbiAgICAgICAgICogMmEuIFdlIGNhbGwgdGhlIGJyb3dzZXIgdG8gbG9hZCB0aGUgaXRlbXMgb2YgdGhlIHJvb3QgcGF0aC5cbiAgICAgICAgICogMmIuIENvbmN1cnJlbnRseSB3ZSBjYWxsIHRoZSB0cmVlLCB3aGljaCBsb2FkcyB0aGUgaW5pdGlhbCBub2RlIHRyZWVcbiAgICAgICAgICogICAgIGFuZCBzZXRzIHVwIHRoZSBwYXRoIGFzIGEgbGlzdCBvZiBub2Rlcy5cbiAgICAgICAgICogMy4gV2hlbiB0aGUgdHJlZSBoYXMgbG9hZGVkIGFuZCBpdHMgcGF0aCBpcyBzZXQgdXAsIHdlIGdyYWIgdGhlIHBhdGhcbiAgICAgICAgICogICAgZnJvbSB0aGVyZSBmb3Igb3Vyc2VsdmVzIGFuZCBhbHNvIHByb3ZpZGUgdGhlIGJyb3dzZXIgd2l0aCBpdC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhTdHIgLSBSb290IHBhdGggb2YgdHJlZSBhcyBzdHJpbmcuXG4gICAgICAgICAqL1xuICAgICAgICBmaXJzdExvYWQ6IGZ1bmN0aW9uIChwYXRoU3RyKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnJvb3RQYXRoU3RyID0gcGF0aFN0cjtcbiAgICAgICAgICAgICRsb2cubG9nKCdmaXJzdExvYWQnLCB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpLCAgdGhpcy5yb290UGF0aFN0cik7XG4gICAgICAgICAgICB0aGlzLmJyb3dzZXIubG9hZEl0ZW1zKCk7XG4gICAgICAgICAgICB0aGlzLnRyZWUuaW5pdE5vZGVzKClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5wYXRoID0gc2VsZi50cmVlLnBhdGg7XG4gICAgICAgICAgICAgICAgc2VsZi5icm93c2VyLnBhdGggPSBzZWxmLnBhdGg7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBleHRyYWN0TWV0YTogZnVuY3Rpb24gKG5hbWVMaXN0KSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHt9LFxuICAgICAgICAgICAgICAgIHBvc3REYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lczogbmFtZUxpc3QsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChSQy51cmxzLmV4dHJhY3RfbWV0YSwgcG9zdERhdGEsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9vcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AocmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlRGlyZWN0b3J5OiBmdW5jdGlvbiAoZGlyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7fSxcbiAgICAgICAgICAgICAgICBwb3N0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogZGlyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChSQy51cmxzLmNyZWF0ZV9kaXJlY3RvcnksIHBvc3REYXRhLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vb3BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlbGV0ZUl0ZW1zOiBmdW5jdGlvbiAobmFtZXMsIHJlYXNvbikge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMucGF0aFRvU3RyKHRoaXMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzOiBuYW1lcyxcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uOiByZWFzb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShSQy51cmxzLmRlbGV0ZV9pdGVtcywgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOT09QXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1bmRlbGV0ZUl0ZW1zOiBmdW5jdGlvbiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sXG4gICAgICAgICAgICAgICAgcHV0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZXM6IG5hbWVzXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoUkMudXJscy51bmRlbGV0ZV9pdGVtcywgcHV0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcC5kYXRhLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOT09QXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2FkSXRlbXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICBodHRwQ29uZmlnID0ge3BhcmFtczoge319LFxuICAgICAgICAgICAgICAgIGFjdGlvbiA9ICdsb2FkJyxcbiAgICAgICAgICAgICAgICBsZWFmTm9kZSA9IHRoaXMuZ2V0TGVhZk5vZGUoKTtcblxuICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgbGVhZiBub2RlIHRlbGwgdXMgd2hpY2ggZGF0YSB0byBsb2FkLlxuICAgICAgICAgICAgLy8gSGFuZGxlIHZpcnR1YWwgbm9kZVxuICAgICAgICAgICAgaWYgKGxlYWZOb2RlICYmIGxlYWZOb2RlLmlkIDw9IDApIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc2VhcmNoIG9yIHNlYXJjaCByZXN1bHRzXG4gICAgICAgICAgICAgICAgaWYgKGxlYWZOb2RlLm5hbWUgPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWFyY2hQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBzID0gdGhpcy5nbG9iYWxPcHRpb25zLnNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eXFxzKy8sICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHMrJC8sICcnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpIHx8IHRoaXMucm9vdFBhdGhTdHI7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9ICdzZWFyY2gnO1xuICAgICAgICAgICAgICAgICAgICAvLyBBc3NlbWJsZSBzZWFyY2ggY29tbWFuZFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBzLmxlbmd0aCA/IHBhdGggOiBzZWxmLnByZXZQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jZGVsOiB0aGlzLmdsb2JhbE9wdGlvbnMuaW5jbHVkZURlbGV0ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXJlYTogdGhpcy5nbG9iYWxPcHRpb25zLnNlYXJjaEFyZWEsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZmllbGRzOiB0aGlzLmdsb2JhbE9wdGlvbnMuc2VhcmNoRmllbGRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgczogc1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGNvbW1hbmQgZXF1YWxzIHRoZSBsYXN0IG9uZSwganVzdCByZXR1cm4gb3VyXG4gICAgICAgICAgICAgICAgICAgIC8vIGJ1ZmZlcmVkIHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKHNlYXJjaFBhcmFtcywgc2VsZi5sYXN0U2VhcmNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9rOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzOiBzZWxmLmxhc3RTZWFyY2hSZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGZyID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRmci5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRmci5wcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vcGUsIHRoaXMgaXMgYSBmcmVzaCBzZWFyY2g6XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cENvbmZpZy5wYXJhbXMgPSBzZWFyY2hQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biB2aXJ0dWFsIG5vZGU6ICcgKyBsZWFmTm9kZS5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZ3VsYXIgbm9kZSAvIHBhdGhcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0dHBDb25maWcucGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGhUb1N0cih0aGlzLnBhdGgpIHx8IHRoaXMucm9vdFBhdGhTdHIsXG4gICAgICAgICAgICAgICAgICAgIGluY2RlbDogdGhpcy5nbG9iYWxPcHRpb25zLmluY2x1ZGVEZWxldGVkLFxuICAgICAgICAgICAgICAgICAgICBzYXJlYTogdGhpcy5nbG9iYWxPcHRpb25zLnNlYXJjaEFyZWEsXG4gICAgICAgICAgICAgICAgICAgIHNmaWVsZHM6IHRoaXMuZ2xvYmFsT3B0aW9ucy5zZWFyY2hGaWVsZHMsXG4gICAgICAgICAgICAgICAgICAgIHM6ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoUkMudXJscy5sb2FkX2l0ZW1zLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCByZXN1bHRzIG1heSBoYXZlIGJvdGgsIHZhbGlkIHJvd3MgYW5kIGVycm9yL3dhcm5pbmdcbiAgICAgICAgICAgICAgICAgICAgLy8gbWVzc2FnZXMuIFNvIGxvb2sgZm9yIHJvd3MgYW5kIG5vdCBqdXN0IGZvciB0aGUgb2sgZmxhZy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5kYXRhLnJvd3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByb2Nlc3Mgc2VhcmNoIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdzZWFyY2gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHV0IHRoZW0gaW50byBvdXIgYnVmZmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5sYXN0U2VhcmNoUmVzdWx0ID0gcmVzcC5kYXRhLmRhdGEucm93cztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFjdGlvbiA9PT0gJ2xvYWQnIG5lZWRzIG5vIHNwZWNpYWwgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghIHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvYWRUcmVlOiBmdW5jdGlvbiAoZmlsdGVyKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5yb290UGF0aFN0cixcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIGluY2RlbDogdGhpcy5nbG9iYWxPcHRpb25zLmluY2x1ZGVEZWxldGVkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoUkMudXJscy5sb2FkX3RyZWUsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9hZEZzUHJvcGVydGllczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGh0dHBDb25maWcgPSB7cGFyYW1zOiB7fX07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF9mc19wcm9wZXJ0aWVzLCBodHRwQ29uZmlnKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmRhdGEub2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2FkSXRlbVByb3BlcnRpZXM6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5wYXRoVG9TdHIodGhpcy5wYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFJDLnVybHMubG9hZF9pdGVtX3Byb3BlcnRpZXMsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNoYW5nZUl0ZW1BdHRyOiBmdW5jdGlvbiAoaXRlbUlkLCBhdHRyLCBuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBodHRwQ29uZmlnID0ge30sXG4gICAgICAgICAgICAgICAgcHV0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGl0ZW1JZCxcbiAgICAgICAgICAgICAgICAgICAgYXR0cjogYXR0cixcbiAgICAgICAgICAgICAgICAgICAgbnY6IG5ld1ZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBvdjogb2xkVmFsdWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gQ2FsbGVyIG5lZWQgbm90IHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBpbnZhbGlkIGRhdGEgYW5kIG5ldHdvcmtcbiAgICAgICAgICAgIC8vIGVycm9yczogUmV0dXJuIGEgcmVqZWN0ZWQgcHJvbWlzZSBpbiBib3RoIGNhc2VzLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChSQy51cmxzLmVkaXRfaXRlbSwgcHV0RGF0YSwgaHR0cENvbmZpZylcbiAgICAgICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBweW0uZ3Jvd2xlci5ncm93bEFqYXhSZXNwKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwLmRhdGEub2sgPyByZXNwIDogJHEucmVqZWN0KHJlc3ApO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcblxuICAgICAgICBidWlsZERvd25sb2FkVXJsOiBmdW5jdGlvbiAobmFtZU9yRW50aXR5KSB7XG4gICAgICAgICAgICB2YXIgcHAsIHMsIG5hbWUsIGVudGl0eSwgdXUsIGxvYztcbiAgICAgICAgICAgICRsb2cubG9nKG5hbWVPckVudGl0eSwgdHlwZW9mIG5hbWVPckVudGl0eSk7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhuYW1lT3JFbnRpdHkpKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWVPckVudGl0eTtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIGxvY2FsIGNvcHkgb2Ygb3JpZ2luYWwgcGF0aFxuICAgICAgICAgICAgICAgIHBwID0gdGhpcy5wYXRoLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGZpbGVzeXN0ZW0gcm9vdCwgYmVjYXVzZSBicm93c2VyIGlzIGFscmVhZHkgdGhlcmU6XG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL0hPU1Q6UE9SVC9URU5BTlQvZnMvQEBfYnJfXG4gICAgICAgICAgICAgICAgaWYgKHBwWzBdLm5hbWUgPT09ICdmcycpIHsgcHAuc2hpZnQoKTsgfVxuICAgICAgICAgICAgICAgIC8vIFN0cmluZ2lmeSBwYXRoIGFuZCBhcHBlbmQgbmFtZVxuICAgICAgICAgICAgICAgIHMgPSBwcC5sZW5ndGggPyB0aGlzLnBhdGhUb1N0cihwcCkgKyAnLycgKyBuYW1lIDogbmFtZTtcbiAgICAgICAgICAgICAgICAvLyBHZXQgY3VycmVudCB1cmwgYW5kIGFwcGx5IG91ciBwYXRoIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJldHVybiAkd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvQEBfYnJfLywgcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbnRpdHkgPSBuYW1lT3JFbnRpdHk7XG4gICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgcGF0aCBmcm9tIGJyb3dzZXIgYW5kIGtlZXAgb25seSB0aGUgZmlyc3QgMlxuICAgICAgICAgICAgICAgIC8vIGVsZW1lbnRzOiAwPUVNUFRZLCAxPVRFTkFOVC4gVGhpcyB3aWxsIGRpc2NhcmQgdGhlIDNyZCBub2RlXG4gICAgICAgICAgICAgICAgLy8gKFwiZnNcIikgdG9vLCBiZWNhdXNlIGVudGl0eS5sb2NhdGlvbiBzdGFydHMgd2l0aCBcImZzXCIuXG4gICAgICAgICAgICAgICAgdXUgPSAkd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJykuc2xpY2UoMCwgMikuam9pbignLycpO1xuICAgICAgICAgICAgICAgIC8vIEZyb20gbG9jYXRpb24gcmVtb3ZlIGxlYWRpbmcgL1xuICAgICAgICAgICAgICAgIHMgPSAkd2luZG93LmxvY2F0aW9uLm9yaWdpbiArIHV1ICsgJy8nXG4gICAgICAgICAgICAgICAgICAgICsgZW50aXR5LmxvY2F0aW9uICsgJy8nICsgZW50aXR5Ll9uYW1lO1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCduZXcgcGF0aDogJywgcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICBwYXRoVG9TdHI6IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICBpZiAoISAoYW5ndWxhci5pc0FycmF5KHBhdGgpICYmIHBhdGgubGVuZ3RoID4gMCkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgICAgIHZhciBwcCA9IFtdO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgIHBhdGgsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHBwLnB1c2goeC5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIHBwLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRnNTZXJ2aWNlO1xufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdweW0uZnMnKS5mYWN0b3J5KCdweW1Gc1VwbG9hZGVyU2VydmljZScsXG4gICAgICAgIFsnJGxvZycsICckdXBsb2FkJywgJyRodHRwJywgJ1JDJywgJ3B5bVNlcnZpY2UnLCAnRklMRV9TVEFURVMnLCAnRklMRV9TVEFURV9DQVBUSU9OUycsXG5mdW5jdGlvbiAoJGxvZywgICAkdXBsb2FkLCAgICRodHRwLCAgIFJDLCAgIHB5bSwgICAgICAgICAgRklMRV9TVEFURVMsICAgRklMRV9TVEFURV9DQVBUSU9OUykge1xuXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cblxuICAgIGZ1bmN0aW9uIFB5bUZpbGUoZmlsZSkge1xuICAgICAgICB0aGlzLmZpbGUgPSBmaWxlO1xuICAgICAgICB0aGlzLnN0YXRlID0gMDtcbiAgICAgICAgdGhpcy5zdGF0ZUNhcHRpb24gPSBudWxsO1xuICAgICAgICB0aGlzLmtleSA9IG51bGw7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3MgPSAwO1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25Qcm9taXNlID0gbnVsbDtcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uTWVzc2FnZSA9IG51bGw7XG4gICAgICAgIHRoaXMudXBsb2FkUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc1VwbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc0Vycm9yID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBudWxsO1xuICAgICAgICB0aGlzLndyaXRlTW9kZSA9IG51bGw7XG4gICAgfVxuXG4gICAgUHltRmlsZS5wcm90b3R5cGUuc2V0U3RhdGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMuc3RhdGVDYXB0aW9uID0gRklMRV9TVEFURV9DQVBUSU9OU1tzdGF0ZV07XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSAodGhpcy5zdGF0ZSA+IEZJTEVfU1RBVEVTLk5FVyAmJlxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA8IEZJTEVfU1RBVEVTLlVQTE9BRF9PSyk7XG4gICAgICAgIHRoaXMuaXNVcGxvYWRpbmcgPSAodGhpcy5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVVBMT0FESU5HKTtcbiAgICAgICAgdGhpcy5oYXNFcnJvciA9ICh0aGlzLnN0YXRlID4gRklMRV9TVEFURVMuVVBMT0FEX0NBTkNFTEVEICYmXG4gICAgICAgICAgICB0aGlzLnN0YXRlIDwgRklMRV9TVEFURVMuTkVXKTtcbiAgICAgICAgJGxvZy5sb2coJ3N0YXRlJywgc3RhdGUsIHRoaXMuc3RhdGVDYXB0aW9uLCB0aGlzKTtcbiAgICB9O1xuXG4gICAgUHltRmlsZS5wcm90b3R5cGUuc2V0V3JpdGVNb2RlID0gZnVuY3Rpb24od3JpdGVNb2RlKSB7XG4gICAgICAgIHRoaXMud3JpdGVNb2RlID0gd3JpdGVNb2RlO1xuICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLkNBTl9VUExPQUQpO1xuICAgIH07XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5zZXRFeGlzdHNBbmRQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uKGV4aXN0cywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgdGhpcy5leGlzdHMgPSBleGlzdHM7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcbiAgICAgICAgaWYgKCFleGlzdHMgJiYgcGVybWlzc2lvbnMuY3JlYXRlKSB7XG4gICAgICAgICAgICB0aGlzLnNldFdyaXRlTW9kZSgnY3JlYXRlJyk7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLkNBTl9VUExPQUQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX09LKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBQeW1GaWxlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMudXBsb2FkUHJvbWlzZSkgeyB0aGlzLnVwbG9hZFByb21pc2UuYWJvcnQoKTsgfVxuICAgICAgICB0aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9DQU5DRUxFRCk7XG4gICAgfTtcblxuXG4gICAgdmFyIFVwbG9hZGVyU2VydmljZSA9IHtcblxuICAgICAgICBjcmVhdGVQeW1GaWxlOiBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQeW1GaWxlKGZpbGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtcyB1cGxvYWQgb2YgYSBmaWxlIGFuZCByZXR1cm5zIHByb21pc2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoU3RyIC0gUGF0aCB3aGVyZSB0byBzYXZlIHRoZSBmaWxlXG4gICAgICAgICAqIEBwYXJhbSB7UHltRmlsZX0gZmlsZSAtIEluc3RhbmNlIG9mIGEgUHltRmlsZVxuICAgICAgICAgKiBAcmV0dXJucyB7cHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHVwbG9hZDogZnVuY3Rpb24gKHBhdGhTdHIsIGZpbGUpIHtcbiAgICAgICAgICAgIHZhciB1cGxvYWRDb25mID0ge1xuICAgICAgICAgICAgICAgICAgICB1cmw6IFJDLnVybHMudXBsb2FkLFxuICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLmZpbGUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogZmlsZS5rZXksXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlLmZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGhTdHIsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV9tb2RlOiBmaWxlLndyaXRlTW9kZVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLCAvLyAnUE9TVCcgb3IgJ1BVVCcsIGRlZmF1bHQgUE9TVFxuXG4gICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fSwgLy8geydBdXRob3JpemF0aW9uJzogJ3h4eCd9IG9ubHkgZm9yIGh0bWw1XG5cbiAgICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBudWxsLCAvLydkb2MuanBnJyBvciBbJzEuanBnJywgJzIuanBnJywgLi4uXSwgIHRvIG1vZGlmeSB0aGUgbmFtZSBvZiB0aGUgZmlsZShzKVxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBmaWxlIGZvcm1EYXRhIG5hbWUgKCdDb250ZW50LURpc3Bvc2l0aW9uJyksIHNlcnZlciBzaWRlIHJlcXVlc3QgZm9ybSBuYW1lIGNvdWxkIGJlXG4gICAgICAgICAgICAgICAgICAgICAvLyBhbiBhcnJheSAgb2YgbmFtZXMgZm9yIG11bHRpcGxlIGZpbGVzIChodG1sNSkuIERlZmF1bHQgaXMgJ2ZpbGUnXG4gICAgICAgICAgICAgICAgICAgICBmaWxlRm9ybURhdGFOYW1lOiAnZmlsZScsIC8vICdteUZpbGUnIG9yIFsnZmlsZVswXScsICdmaWxlWzFdJywgLi4uXSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gbWFwIG9mIGV4dHJhIGZvcm0gZGF0YSBmaWVsZHMgdG8gc2VuZCBhbG9uZyB3aXRoIGZpbGUuIGVhY2ggZmllbGQgd2lsbCBiZSBzZW50IGFzIGEgZm9ybSBmaWVsZC5cbiAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSB2YWx1ZXMgYXJlIGNvbnZlcnRlZCB0byBqc29uIHN0cmluZyBvciBqc29iIGJsb2IgZGVwZW5kaW5nIG9uICdzZW5kT2JqZWN0c0FzSnNvbkJsb2InIG9wdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgIGZpZWxkczogbnVsbCwgLy8ge2tleTogJHNjb3BlLm15VmFsdWUsIC4uLn0sXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBvZiBhIGZvcm0gZmllbGQgaXMgYW4gb2JqZWN0IGl0IHdpbGwgYmUgc2VudCBhcyAnYXBwbGljYXRpb24vanNvbicgYmxvYlxuICAgICAgICAgICAgICAgICAgICAgLy8gcmF0aGVyIHRoYW4ganNvbiBzdHJpbmcsIGRlZmF1bHQgZmFsc2UuXG4gICAgICAgICAgICAgICAgICAgICBzZW5kT2JqZWN0c0FzSnNvbkJsb2I6IGZhbHNlLCAvLyB0cnVlfGZhbHNlLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyBjdXN0b21pemUgaG93IGRhdGEgaXMgYWRkZWQgdG8gdGhlIGZvcm1EYXRhLiBTZWUgIzQwI2lzc3VlY29tbWVudC0yODYxMjAwMCBmb3Igc2FtcGxlIGNvZGUuXG4gICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YUFwcGVuZGVyOiBmdW5jdGlvbihmb3JtRGF0YSwga2V5LCB2YWwpe30sXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIGRhdGEgd2lsbCBiZSBzZW50IGFzIGEgc2VwYXJhdGUgZm9ybSBkYXRhIGZpZWxkIGNhbGxlZCBcImRhdGFcIi4gSXQgd2lsbCBiZSBjb252ZXJ0ZWQgdG8ganNvbiBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgIC8vIG9yIGpzb2IgYmxvYiBkZXBlbmRpbmcgb24gJ3NlbmRPYmplY3RzQXNKc29uQmxvYicgb3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICBkYXRhOiB7fSxcblxuICAgICAgICAgICAgICAgICAgICAgd2l0aENyZWRlbnRpYWxzOiBmYWxzZSwgLy90cnVlfGZhbHNlLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyAuLi4gYW5kIGFsbCBvdGhlciBhbmd1bGFyICRodHRwKCkgb3B0aW9ucyBjb3VsZCBiZSB1c2VkIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcDtcblxuICAgICAgICAgICAgcCA9ICR1cGxvYWQudXBsb2FkKHVwbG9hZENvbmYpXG4gICAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmxvZygnc3VjYyB1cGwnLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRhW2ZpbGUua2V5XS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfT0spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURfRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS52YWxpZGF0aW9uTWVzc2FnZSA9IGRhdGEuZGF0YVtmaWxlLmtleV0udmFsaWRhdGlvbl9tc2c7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHB5bS5ncm93bGVyLmdyb3dsQWpheFJlc3AoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlLnN0YXRlID09PSBGSUxFX1NUQVRFUy5VUExPQURJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUudmFsaWRhdGlvbk1lc3NhZ2UgPSAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGZpbGUuc2V0U3RhdGUoRklMRV9TVEFURVMuVVBMT0FEX0VSUk9SKTtcbiAgICAgICAgICAgICAgICBmaWxlLnZhbGlkYXRpb25NZXNzYWdlID0gc3RhdHVzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmaWxlLnVwbG9hZFByb21pc2UgPSBwO1xuICAgICAgICAgICAgZmlsZS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5VUExPQURJTkcpO1xuICAgICAgICAgICAgcmV0dXJuIHA7XG5cbiAgICAgICAgICAgIC8qIHRoZW4gcHJvbWlzZSAobm90ZSB0aGF0IHJldHVybmVkIHByb21pc2UgZG9lc24ndCBoYXZlIHByb2dyZXNzLCB4aHIgYW5kIGNhbmNlbCBmdW5jdGlvbnMuICovXG4gICAgICAgICAgICAvLyB2YXIgcHJvbWlzZSA9IHVwbG9hZC50aGVuKHN1Y2Nlc3MsIGVycm9yLCBwcm9ncmVzcyk7XG5cbiAgICAgICAgICAgIC8qIGNhbmNlbC9hYm9ydCB0aGUgdXBsb2FkIGluIHByb2dyZXNzLiAqL1xuICAgICAgICAgICAgLy91cGxvYWQuYWJvcnQoKTtcblxuICAgICAgICAgICAgLyogYWx0ZXJuYXRpdmUgd2F5IG9mIHVwbG9hZGluZywgc2VuZCB0aGUgZmlsZSBiaW5hcnkgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQtdHlwZS5cbiAgICAgICAgICAgICBDb3VsZCBiZSB1c2VkIHRvIHVwbG9hZCBmaWxlcyB0byBDb3VjaERCLCBpbWd1ciwgZXRjLi4uIGh0bWw1IEZpbGVSZWFkZXIgaXMgbmVlZGVkLlxuICAgICAgICAgICAgIEl0IGNvdWxkIGFsc28gYmUgdXNlZCB0byBtb25pdG9yIHRoZSBwcm9ncmVzcyBvZiBhIG5vcm1hbCBodHRwIHBvc3QvcHV0IHJlcXVlc3QuXG4gICAgICAgICAgICAgTm90ZSB0aGF0IHRoZSB3aG9sZSBmaWxlIHdpbGwgYmUgbG9hZGVkIGluIGJyb3dzZXIgZmlyc3Qgc28gbGFyZ2UgZmlsZXMgY291bGQgY3Jhc2ggdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgWW91IHNob3VsZCB2ZXJpZnkgdGhlIGZpbGUgc2l6ZSBiZWZvcmUgdXBsb2FkaW5nIHdpdGggJHVwbG9hZC5odHRwKCkuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vJHVwbG9hZC5odHRwKHsuLi59KSAgLy8gU2VlIDg4I2lzc3VlY29tbWVudC0zMTM2NjQ4NyBmb3Igc2FtcGxlIGNvZGUuXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZhbGlkYXRlcyBmaWxlTGlzdCBvbiBzZXJ2ZXIgc2lkZS5cbiAgICAgICAgICpcbiAgICAgICAgICogUHV0IGVhY2ggZmlsZSB3aXRoIHN0YXRlIFZBTElEQVRJTkcgaW4gb25lIHJlcXVlc3QuIFJlc3BvbnNlIGRhdGEgbXVzdFxuICAgICAgICAgKiBiZSBhIGhhc2g6IGtleSBpcyBmaWxlJ3Mga2V5LCB2YWx1ZSBpcyAnb2snIG9yIHZhbGlkYXRpb24gbWVzc2FnZS5cbiAgICAgICAgICogQ29tbXVuaWNhdGlvbiB3aXRoIHNlcnZlciBpcyBhIFBPU1QgcmVxdWVzdCwgb24gc3VjY2VzcyB3ZSBzZXQgdGhlIHN0YXRlXG4gICAgICAgICAqIG9mIGVhY2ggZmlsZSBhcyByZXNwb25kZWQuIE9uIGVycm9yLCB3ZSBzZXQgc3RhdGUgdG8gVVBMT0FEX0VSUk9SLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFN0ciAtIFBhdGggYXMgbGlzdCBvZiBub2Rlcy5cbiAgICAgICAgICogQHBhcmFtIHtsaXN0fSBmaWxlTGlzdCAtIExpc3Qgb2YgaW5zdGFuY2VzIG9mIFB5bUZpbGUuXG4gICAgICAgICAqIEByZXR1cm5zIHtwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgdmFsaWRhdGVGaWxlczogZnVuY3Rpb24gKHBhdGhTdHIsIGZpbGVMaXN0KSB7XG4gICAgICAgICAgICB2YXIgaHR0cENvbmZpZyA9IHt9LCBwb3N0RGF0YSA9IHt9LFxuICAgICAgICAgICAgICAgIGZmID0gW107XG4gICAgICAgICAgICAkbG9nLmxvZygnZmlsZUxpc3QgdG8gdmFsaWRhdGUnLCBmaWxlTGlzdCk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgZmlsZUxpc3QsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2LnN0YXRlID09PSBGSUxFX1NUQVRFUy5WQUxJREFUSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZi5wdXNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB2LmtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IHYuZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplOiB2LmZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWltZV90eXBlOiB2LmZpbGUudHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcG9zdERhdGEucGF0aCA9IHBhdGhTdHI7XG4gICAgICAgICAgICBwb3N0RGF0YS5maWxlcyA9IGZmO1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoUkMudXJscy52YWxpZGF0ZV9maWxlcywgcG9zdERhdGEsIGh0dHBDb25maWcpXG4gICAgICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3AuZGF0YS5kYXRhLCBmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodi5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0RXhpc3RzQW5kUGVybWlzc2lvbnModi5leGlzdHMsIHYucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS52YWxpZGF0aW9uTWVzc2FnZSA9IHYudmFsaWRhdGlvbl9tc2c7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHltLmdyb3dsZXIuZ3Jvd2xBamF4UmVzcChyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVMaXN0LCBmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10uc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElPTl9FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS52YWxpZGF0aW9uTWVzc2FnZSA9ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdCwgZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodi5zdGF0ZSA9PT0gRklMRV9TVEFURVMuVkFMSURBVElORykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdFtrXS5zZXRTdGF0ZShGSUxFX1NUQVRFUy5WQUxJREFUSU9OX0VSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUxpc3Rba10udmFsaWRhdGlvbk1lc3NhZ2UgPSAnTmV0d29yayBlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG5cbiAgICB9O1xuICAgIHJldHVybiBVcGxvYWRlclNlcnZpY2U7XG59XSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgncHltLmZzJykuY29udHJvbGxlcigncHltRnNVcGxvYWRlckNvbnRyb2xsZXInLFxuICAgICAgICBbJyRzY29wZScsICckd2luZG93JywgJyRsb2cnLCAnVCcsICdweW1TZXJ2aWNlJywgJ3B5bUZzU2VydmljZScsICdweW1Gc1VwbG9hZGVyU2VydmljZScsICdGSUxFX1NUQVRFUycsICckcScsXG5mdW5jdGlvbiAoJHNjb3BlLCAgICR3aW5kb3csICAgJGxvZywgICBULCAgIHB5bSwgICAgICAgICAgcHltRnNTZXJ2aWNlLCAgIHB5bUZzVXBsb2FkZXJTZXJ2aWNlLCAgIEZJTEVfU1RBVEVTLCAgICRxKSB7XG5cbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBjdHJsID0gdGhpcztcbiAgICBjdHJsLkZJTEVfU1RBVEVTID0gRklMRV9TVEFURVM7XG5cbiAgICAvLyBTdG9yYWdlIGZvciAkdXBsb2FkZXIgc2VydmljZVxuICAgIGN0cmwuZmlsZXMgPSBbXTtcbiAgICBjdHJsLnJlamVjdGVkRmlsZXMgPSBbXTtcbiAgICBjdHJsLmlzRHJvcEF2YWlsYWJsZSA9IG51bGw7XG5cbiAgICAvLyBFbnF1ZXVlZCBmaWxlcyB0byB2YWxpZGF0ZSBhbmQgdXBsb2FkXG4gICAgY3RybC5xdWV1ZSA9IHt9O1xuICAgIC8vIFNldmVyYWwgY291bnRlcnMsIHVwZGF0ZWQgYnkgY291bnRBY3RpdmVVcGxvYWRzIHdhdGNoZXJcbiAgICAvLyBBY3RpdmUgbWVhbnMgZWl0aGVyIHZhbGlkYXRpbmcgb3IgdXBsb2FkaW5nXG4gICAgY3RybC5hY3RpdmVVcGxvYWRzID0gMDtcbiAgICAvLyBWYWxpZGF0aW9uIGVycm9ycyArIHVwbG9hZCBlcnJvcnNcbiAgICBjdHJsLmVycm9ycyA9IDA7XG4gICAgLy8gVHJhbnNmZXJyaW5nIGRhdGFcbiAgICBjdHJsLnVwbG9hZGluZyA9IDA7XG4gICAgLy8gdG90YWwgcHJvZ3Jlc3NcbiAgICBjdHJsLnRvdGFsUHJvZ3Jlc3MgPSAwO1xuXG4gICAgY3RybC53aW5kb3dNYXhpbWl6ZWQgPSB0cnVlO1xuICAgIGN0cmwud2luZG93SXNPcGVuID0gZmFsc2U7XG5cbiAgICBjdHJsLmNvdW50QWN0aXZlVXBsb2FkcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG4gPSAwLCBlID0gMCwgdSA9IDAsIHAgPSAwLCBsZW4gPSAwO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY3RybC5xdWV1ZSwgZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgIGlmIChmLmlzQWN0aXZlKSB7ICsrbjsgfVxuICAgICAgICAgICAgaWYgKGYuaGFzRXJyb3IpIHsgKytlOyB9XG4gICAgICAgICAgICBpZiAoZi5pc1VwbG9hZGluZykgeyArK3U7IH1cbiAgICAgICAgICAgIHAgKz0gZi5wcm9ncmVzcztcbiAgICAgICAgICAgICsrbGVuO1xuICAgICAgICB9KTtcbiAgICAgICAgY3RybC5hY3RpdmVVcGxvYWRzID0gbjtcbiAgICAgICAgY3RybC5lcnJvcnMgPSBlO1xuICAgICAgICBjdHJsLnVwbG9hZGluZyA9IHU7XG4gICAgICAgIGlmIChsZW4gIT09IDApIHtcbiAgICAgICAgICAgIGN0cmwudG90YWxQcm9ncmVzcyA9IHBhcnNlSW50KHAgLyBsZW4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdHJsLmFjdGl2ZVVwbG9hZHM7XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goY3RybC5jb3VudEFjdGl2ZVVwbG9hZHMsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgaWYgKG5ld1ZhbHVlID09PSAwICYmIG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSAmJiBweW1Gc1NlcnZpY2Uub25VcGxvYWRGaW5pc2hlZCkge1xuICAgICAgICAgICAgcHltRnNTZXJ2aWNlLm9uVXBsb2FkRmluaXNoZWQoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgY3RybC5taW5pbWF4V2luZG93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjdHJsLndpbmRvd01heGltaXplZCA9ICFjdHJsLndpbmRvd01heGltaXplZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FuY2VscyBhbGwgYWN0aXZlIHVwbG9hZHMuXG4gICAgICpcbiAgICAgKiBMZXRzIHVzZXIgY29uZmlybS4gUmVzcG9uc2UgaXMgdHJpZ2dlcmVkIGJ5IGFuIGV2ZW50LCBpb3csIGl0IGFycml2ZXNcbiAgICAgKiBhc3luY2hyb25vdXNseS4gKFdlIHVzZSBvdXIgb3duIGRpYWxvZywgbm90ICR3aW5kb3cuY29uZmlybS4pXG4gICAgICpcbiAgICAgKiBXZSBtYXkgZ2V0IGNhbGxlZCBmcm9tIGFub3RoZXIgZnVuY3Rpb24gKGNsb3NlV2luZG93KSwgc28gcmV0dXJuIGEgcHJvbWlzZVxuICAgICAqIHRvIHNpZ25hbCB3aGF0IHRoZSB1c2VyIHNlbGVjdGVkLlxuICAgICAqXG4gICAgICogSWYgdGhlcmUgYXJlIG5vIGFjdGl2ZSBkb3dubG9hZHMsIHdlIGRvIG5vdCBsZXQgdGhlIHVzZXIgY29uZmlybS4gU3RpbGxcbiAgICAgKiByZXR1cm4gYSBwcm9taXNlLCBhIHJlc29sdmVkIG9uZSwgc28gdGhlIGNhbGxlciBpcyBjbGVhcmVkIHRvIGRvIGhpc1xuICAgICAqIHRoaW5nLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3Byb21pc2V9XG4gICAgICovXG4gICAgY3RybC5jYW5jZWxBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjdHJsLmFjdGl2ZVVwbG9hZHMpIHtcbiAgICAgICAgICAgIHJldHVybiBweW0uZ3Jvd2xlci5jb25maXJtKFQuY29uZmlybV9jYW5jZWxfYWxsX3VwbG9hZHMpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjdHJsLnF1ZXVlLCBmdW5jdGlvbiAoZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZi5hYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICRxLmRlZmVyKCkucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGN0cmwuY2xvc2VXaW5kb3cgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gZG9JdCAoKSB7XG4gICAgICAgICAgICBjdHJsLmNsZWFyUXVldWUoKTtcbiAgICAgICAgICAgIGN0cmwud2luZG93SXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3RybC5hY3RpdmVVcGxvYWRzKSB7XG4gICAgICAgICAgICBjdHJsLmNhbmNlbEFsbCgpLnRoZW4oZG9JdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkb0l0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC5maWxlRHJvcHBlZCA9IGZ1bmN0aW9uICgkZmlsZXMsICRldmVudCwgJHJlamVjdGVkRmlsZXMpIHtcbiAgICAgICAgJGxvZy5sb2coJ2Ryb3BwZWQnLCAkZmlsZXMsIHRoaXMuZmlsZXMsICRldmVudCk7XG4gICAgICAgIGlmICgkZmlsZXMgJiYgJGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZW5xdWV1ZSgkZmlsZXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGN0cmwuZmlsZVNlbGVjdGVkID0gZnVuY3Rpb24gKCRmaWxlcywgJGV2ZW50KSB7XG4gICAgICAgICRsb2cubG9nKCdzZWxlY3RlZCcsICRmaWxlcywgdGhpcy5maWxlcywgJGV2ZW50KTtcbiAgICAgICAgaWYgKCRmaWxlcyAmJiAkZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lbnF1ZXVlKCRmaWxlcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC52YWxpZGF0ZSA9IGZ1bmN0aW9uICgkZmlsZSkge1xuICAgICAgICAkbG9nLmxvZygnVmFsaWRhdGluZyBmaWxlJywgJGZpbGUpO1xuICAgICAgICByZXR1cm4gJGZpbGUudHlwZSAhPT0gJ2F1ZGlvL3gtYXBlJztcbiAgICB9O1xuXG4gICAgY3RybC5jbGVhclF1ZXVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJvcDtcbiAgICAgICAgZm9yIChwcm9wIGluIGN0cmwucXVldWUpIHtcbiAgICAgICAgICAgIGlmIChjdHJsLnF1ZXVlLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0cmwucXVldWVbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY3RybC5lbnF1ZXVlID0gZnVuY3Rpb24gKGZpbGVzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGksIGltYXgsIGYsXG4gICAgICAgICAgICBteVF1ZXVlID0ge307XG4gICAgICAgIGlmICghIChmaWxlcyAmJiBmaWxlcy5sZW5ndGggPiAwKSkgeyByZXR1cm47IH1cbiAgICAgICAgY3RybC53aW5kb3dJc09wZW4gPSB0cnVlO1xuICAgICAgICBmb3IgKGk9MCwgaW1heD1maWxlcy5sZW5ndGg7IGk8aW1heDsgaSsrKSB7XG4gICAgICAgICAgICBmID0gbmV3IHB5bUZzVXBsb2FkZXJTZXJ2aWNlLmNyZWF0ZVB5bUZpbGUoZmlsZXNbaV0pO1xuICAgICAgICAgICAgaWYgKHNlbGYucXVldWVbZmlsZXNbaV0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICBmLnNldFN0YXRlKEZJTEVfU1RBVEVTLlZBTElEQVRJT05fRVJST1IpO1xuICAgICAgICAgICAgICAgIGYudmFsaWRhdGlvbk1lc3NhZ2UgPSAnRmlsZSB3aXRoIHRoaXMgbmFtZSBhbHJlYWR5IGluIHF1ZXVlJztcbiAgICAgICAgICAgICAgICBmLmtleSA9IGYuZmlsZS5uYW1lICsgbmV3IERhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGYuc2V0U3RhdGUoRklMRV9TVEFURVMuVkFMSURBVElORyk7XG4gICAgICAgICAgICAgICAgc2VsZi52YWxpZGF0ZUhlcmUoZik7XG4gICAgICAgICAgICAgICAgZi5rZXkgPSBmLmZpbGUubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG15UXVldWVbZi5rZXldID0gZjtcbiAgICAgICAgICAgIHNlbGYucXVldWVbZi5rZXldID0gZjtcbiAgICAgICAgfVxuICAgICAgICBweW1Gc1VwbG9hZGVyU2VydmljZS52YWxpZGF0ZUZpbGVzKHB5bUZzU2VydmljZS5nZXRQYXRoU3RyKCksIG15UXVldWUpO1xuICAgIH07XG5cbiAgICBjdHJsLnZhbGlkYXRlSGVyZSA9IGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIC8vIFRPRE8gQ2hlY2sgcXVvdGEuIElmIHZpb2xhdGlvbiwgc2V0IHN0YXRlIGFuZCBtZXNzYWdlLCBpZiBvaywga2VlcCBzdGF0ZSBhcyBWQUxJREFUSU5HXG4gICAgfTtcblxuICAgIGN0cmwuY2JQcm9ncmVzcyA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgdmFyIG4gPSBwYXJzZUludCgxMDAuMCAqIGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuICAgICAgICAvLyRsb2cubG9nKCdwcm9ncmVzczogJyArIG4gKyAnJSBmaWxlIDonKyBldnQuY29uZmlnLmZpbGUubmFtZSk7XG4gICAgICAgIC8vJGxvZy5sb2coJ3Byb2dyZXNzLWV2dDogJywgZXZ0KTtcbiAgICAgICAgLy8kbG9nLmxvZygncHJvZ3Jlc3MtdGhpczogJywgdGhpcyk7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3MgPSBuO1xuICAgIH07XG5cbiAgICAvL2N0cmwuY2JTdWNjZXNzID0gZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgLy8gICAgLy8gZmlsZSBpcyB1cGxvYWRlZCBzdWNjZXNzZnVsbHlcbiAgICAvLyAgICAkbG9nLmxvZygnZmlsZSAnICsgY29uZmlnLmZpbGUubmFtZSArICdpcyB1cGxvYWRlZCBzdWNjZXNzZnVsbHkuIFJlc3BvbnNlOiAnICsgZGF0YSk7XG4gICAgLy8gICAgLy90aGlzLnNldFN0YXRlKEZJTEVfU1RBVEVTLlVQTE9BRF9PSyk7XG4gICAgLy99O1xuXG4gICAgY3RybC5zdGFydFVwbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgcCxcbiAgICAgICAgICAgIGZQcm9ncmVzczsgLy8sIGZTdWNjZXNzO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goc2VsZi5xdWV1ZSwgZnVuY3Rpb24oZikge1xuICAgICAgICAgICAgaWYgKGYuc3RhdGUgPT09IEZJTEVfU1RBVEVTLkNBTl9VUExPQUQpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygnc3RhcnRpbmcgdXBsb2FkIG9mJywgZi5maWxlLm5hbWUsIGYpO1xuICAgICAgICAgICAgICAgIC8vIEJpbmQgdGhlIGNhbGxiYWNrcyB0byB0aGUgaW5kaXZpZHVhbCBQeW1GaWxlLCBzbyB0aGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlaXIgJ3RoaXMnIHBvaW50cyB0byB0aGUgUHltRmlsZSBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgICBmUHJvZ3Jlc3MgPSBhbmd1bGFyLmJpbmQoZiwgc2VsZi5jYlByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICAvL2ZTdWNjZXNzID0gYW5ndWxhci5iaW5kKGYsIHNlbGYuY2JTdWNjZXNzKTtcbiAgICAgICAgICAgICAgICBwID0gcHltRnNVcGxvYWRlclNlcnZpY2UudXBsb2FkKHB5bUZzU2VydmljZS5nZXRQYXRoU3RyKCksIGYpXG4gICAgICAgICAgICAgICAgICAgIC5wcm9ncmVzcyhmUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgICAgICAvLy5zdWNjZXNzKGZTdWNjZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGN0cmwuY2FuY2VsID0gZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgZmlsZS5hYm9ydCgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgZ2l2ZW4gbWltZS10eXBlIGFnYWluc3QgcGF0dGVybiBmcm9tIGBgYWxsb3dgYCBhbmQgYGBkZW55YGBcbiAgICAgKiBhbmQgcmV0dXJucyB0cnVlIGlmIG1pbWUtdHlwZSBpcyBhbGxvd2VkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgY3RybC5jaGVja1R5cGUgPSBmdW5jdGlvbiAodHkpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgaSwgaW1heCwgcGF0LCBnb29kO1xuICAgICAgICBpZiAoISB0eSkge3R5ID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSc7fVxuICAgICAgICB0eSA9IHR5LnNwbGl0KCcvJyk7XG4gICAgICAgICRsb2cubG9nKHR5KTtcbiAgICAgICAgLy8gSXMgZ2l2ZW4gbWltZSB0eXBlIGFsbG93ZWQ/XG4gICAgICAgIGdvb2QgPSBmYWxzZTtcbiAgICAgICAgZm9yIChpPTAsIGltYXg9c2VsZi5hbGxvdy5sZW5ndGg7IGk8aW1heDsgaSsrKSB7XG4gICAgICAgICAgICBwYXQgPSBzZWxmLmFsbG93W2ldO1xuICAgICAgICAgICAgaWYgKHBhdC5zZWFyY2goL1xcKi8pID4gLTEgJiYgcGF0LnNlYXJjaCgvXFwuXFwqLykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcGF0ID0gcGF0LnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAgIC9cXCovZyxcbiAgICAgICAgICAgICAgICAgICAgJy4qJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXQgPSBwYXQuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGlmICh0eVswXS5zZWFyY2gocGF0WzBdKSA+IC0xICYmIHR5WzFdLnNlYXJjaChwYXRbMV0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICBnb29kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoISBnb29kKSB7cmV0dXJuIGZhbHNlO31cbiAgICAgICAgLy8gSXMgZ2l2ZW4gbWltZSB0eXBlIGRlbmllZD9cbiAgICAgICAgZm9yIChpPTAsIGltYXg9c2VsZi5kZW55Lmxlbmd0aDsgaTxpbWF4OyBpKyspIHtcbiAgICAgICAgICAgIHBhdCA9IHNlbGYuZGVueVtpXTtcbiAgICAgICAgICAgIGlmIChwYXQuc2VhcmNoKC9cXCovKSA+IC0xICYmIHBhdC5zZWFyY2goL1xcLlxcKi8pID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHBhdCA9IHBhdC5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgICAvXFwqL2csXG4gICAgICAgICAgICAgICAgICAgICcuKidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGF0ID0gcGF0LnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBpZiAodHlbMF0uc2VhcmNoKHBhdFswXSkgPiAtMSB8fCB0eVsxXS5zZWFyY2gocGF0WzFdKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgZ29vZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBnb29kO1xuICAgIH07XG5cbiAgICBjdHJsLmNoZWNrU2l6ZSA9IGZ1bmN0aW9uIChzeikge1xuICAgICAgICByZXR1cm4gKHN6ID49IHRoaXMubWluU2l6ZSAmJiBzeiA8PSB0aGlzLm1heFNpemUpO1xuICAgIH07XG5cbiAgICAvL2Z1bmN0aW9uIGluaXQoKSB7XG4gICAgLy8gICAgdmFyIGksIGY7XG4gICAgLy8gICAgZm9yIChpPTA7IGk8MTA7IGkrKykge1xuICAgIC8vICAgICAgICBmID0gbmV3IHB5bUZzVXBsb2FkZXJTZXJ2aWNlLmNyZWF0ZVB5bUZpbGUoe1xuICAgIC8vICAgICAgICAgICAgbmFtZTogJ2RmZHNmZnMgc2Rmc2dkZmcgZmdzZmdmZGcgc2RmZ2ZkZyBzZGZncyBkZmcgc2RmZyBkZmdzZGZkZyBzZGZnZGZncyBkZmcgZCBkc2RnZnNmZHNnJyxcbiAgICAvLyAgICAgICAgICAgIHNpemU6IDY1MjM4NTY2NTMsXG4gICAgLy8gICAgICAgICAgICB0eXBlOiAnc3R1ZmYvc2FtcGxlJ1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgIGYuc2V0U3RhdGUoaSAlIDIgPT09IDAgPyBGSUxFX1NUQVRFUy5VUExPQURfRVJST1IgOiBGSUxFX1NUQVRFUy5DQU5fVVBMT0FEKTtcbiAgICAvLyAgICAgICAgZi52YWxpZGF0aW9uTWVzc2FnZSA9ICdibGFoIGLDtmxkZGYgZXJ3ZSc7XG4gICAgLy8gICAgICAgIGN0cmwucXVldWVbaV0gPSBmO1xuICAgIC8vICAgIH1cbiAgICAvLyAgICBjdHJsLndpbmRvd0lzT3BlbiA9IHRydWU7XG4gICAgLy99XG4gICAgLy9cbiAgICAvLy8qXG4gICAgLy8qIFJ1biBpbW1lZGlhdGVseVxuICAgIC8vKi9cbiAgICAvL2luaXQoKTtcblxufV0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9