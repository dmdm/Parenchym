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
