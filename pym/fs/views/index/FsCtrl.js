var FsCtrl = PymApp.controller('FsCtrl',
        ['$scope', '$http', '$q', '$window', '$upload', 'RC', 'T', 'PymApp.GridTools', 'uiGridConstants',
function ($scope,   $http,   $q,   $window,   $upload,   RC,   T,   GridTools,          uiGridConstants) {

    $scope.model = {};

    $scope.FileBrowser = {
        files: [],
        minSize: RC.min_size,
        maxSize: RC.max_size,
        allow: RC.allow,
        deny: RC.deny,
        path: RC.path,
        data: [],
        api: null,
        pathToStr: function () {
            var pp = [];
            angular.forEach(this.path, function (x) {
                pp.push(x[1]);
            });
            return pp.join('/');
        },
        changePath: function (stopId) {
            var i, imax, pp = [];
            for (i=0, imax=this.path.length; i<imax; i++) {
                pp.push(this.path[i]);
                if (this.path[i][0] === stopId) break;
            }
            this.path = pp;
            this.ls();
        },
        ls: function () {
            var httpConfig = {
                params: {}
            };
            var self = this;
            httpConfig.params.path = self.pathToStr();
            self.pym.spinner = true;
            $http.get(RC.urls.ls, httpConfig)
            .then(function (resp) {
                self.pym.spinner = false;
                if (resp.data.ok) {
                    self.data = resp.data.data.rows;
                }
                else {
                    PYM.growl_ajax_resp(resp.data);
                }
            }, function (result) {
                self.pym.spinner = false;
            });
        },
        rm: function () {
            var httpConfig = {
                params: {}
            };
            var self = this, names = [];
            // Collect selected rows
            angular.forEach(self.api.selection.getSelectedRows(), function (r) {
                names.push(r._name);
            });
            httpConfig.params.path = self.pathToStr();
            httpConfig.params.names = names;
            $http.delete(RC.urls.rm, httpConfig)
            .then(function (resp) {
                if (resp.data.ok) {
                    // NOOP
                }
                self.ls();
                PYM.growl_ajax_resp(resp.data);
            }, function (result) {
                // NOOP
            });
        },
        /**
         * Checks given mime-type against pattern from ``allow`` and ``deny``
         * and returns true if mime-type is allowed, false otherwise.
         */
        checkType: function (ty) {
            var self = this,
                i, imax, pat, good;
            ty = ty.split('/');
            // Is given mime type allowed?
            good = false;
            for (i=0, imax=self.allow.length; i<imax; i++) {
                pat = self.allow[i];
                if (pat.search(/\*/) > -1 && pat.search(/\.\*/) == -1) pat = pat.replace(/\*/g, '.*');
                pat = pat.split('/');
                console.log('check allow', ty[0], pat[0]);
                console.log('check allow', ty[1], pat[1]);
                if (ty[0].search(pat[0]) > -1 && ty[1].search(pat[1]) > -1) {
                    good = true;
                    break;
                }
            }
            if (! good) return false;
            // Is given mime type denied?
            for (i=0, imax=self.deny.length; i<imax; i++) {
                pat = self.deny[i];
                if (pat.search(/\*/) > -1 && pat.search(/\.\*/) == -1) pat = pat.replace(/\*/g, '.*');
                pat = pat.split('/');
                console.log('check deny', ty[0], pat[0]);
                console.log('check deny', ty[1], pat[1]);
                if (ty[0].search(pat[0]) > -1 || ty[1].search(pat[1]) > -1) {
                    good = false;
                    break;
                }
            }
            return good;
        },
        checkSize: function (sz) {
            return (sz >= this.minSize && sz <= this.maxSize);
        },
        uploader: null,
        upload: function () {
            var self = this,
                i, imax, f,
                allowedFiles = [], deniedFiles = [];
            for (i=0, imax=self.files.length; i<imax; i++) {
                f = self.files[i];
                if (! self.checkType(f.type)) {
                    deniedFiles.push([f, '${_("File type not allowed")}']);
                    continue;
                }
                if (! self.checkSize(f.size)) {
                    deniedFiles.push([f, '${_("File too large")}']);
                    continue;
                }
                allowedFiles.push(f);
            }
            if (deniedFiles.length) {
                var m = [];
                for (i=0, imax=deniedFiles.length; i<imax; i++) {
                    m.push('<p>' + deniedFiles[i][0].name + ': ' + deniedFiles[i][1] + '</p>');
                }
                PYM.growl({kind: 'warn', text: m.join('')});
            }
            console.log('allowed files', allowedFiles);
            self.uploader = $upload.upload({
                url: RC.urls.upload, // upload.php script, node.js route, or servlet url
                //method: 'POST' or 'PUT',
                //headers: {'Authorization': 'xxx'}, // only for html5
                //withCredentials: true,
                data: {myObj: $scope.myModelObj},
                file: allowedFiles // single file or a list of files. list is only for html5
                //fileName: 'doc.jpg' or ['1.jpg', '2.jpg', ...] // to modify the name of the file(s)
                //fileFormDataName: myFile, // file formData name ('Content-Disposition'), server side request form name
                // could be a list of names for multiple files (html5). Default is 'file'
                //formDataAppender: function(formData, key, val){}  // customize how data is added to the formData.
                // See #40#issuecomment-28612000 for sample code

            }).progress(function (evt) {
                console.log('progress: ' + parseInt(100.0 * evt.loaded / evt.total) + '% file :' + evt.config.file.name);
            }).success(function (data, status, headers, config) {
                // file is uploaded successfully
                console.log('file ' + config.file + ' is uploaded successfully. Response: ' + data);
                PYM.growl_ajax_resp(data);
                if (data.ok) {
                    // TODO
                }
                self.ls();
            });
            //.error(...)
            //.then(success, error, progress); // returns a promise that does NOT have progress/abort/xhr functions
            //.xhr(function(xhr){xhr.upload.addEventListener(...)}) // access or attach event listeners to
            //the underlying XMLHttpRequest
        }
    };
    $scope.FileBrowser.options = {
        data: 'FileBrowser.data',

        enableSorting: true,
        useExternalSorting: false,

        enableFiltering: false,
        useExternalFiltering: false,

        enableColumnMenus: false,

        enableRowSelection: true,
        enableSelectAll: true,
        multiSelect: true,
        noUnselect: false,

        enableCellEditOnFocus: true,

        columnDefs: [
            { field:'id', displayName: 'ID', enableFiltering: false, enableCellEdit: false, width: 50 },
            { field:'_name', displayName: 'Name', enableCellEdit: true, width: 230 },
            { field:'_title', displayName: 'Title', enableCellEdit: true, width: 230 },
            { field:'descr', displayName: 'Description', enableCellEdit: true, width: 230 },
            { field:'rev', displayName: 'Rev', enableCellEdit: false, width: 40, cellFilter: "number:0", cellClass: "text-right" },
            { field:'size', displayName: 'Size', enableCellEdit: false, width: 80, cellFilter: "number:0", cellClass: "text-right" },
            { field:'mime_type', displayName: 'Mime-Type', enableCellEdit: false, width: 150 }
        ],

        onRegisterApi: function(gridApi) {
            $scope.FileBrowser.api = gridApi;
            gridApi.edit.on.afterCellEdit($scope, function(rowEntity, colDef, newValue, oldValue) {
                console.log('edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue);
            });
            gridApi.rowEdit.on.saveRow($scope, $scope.FileBrowser.saveRow);
        }
    };
    $scope.FileBrowser.saveRow = function () {
        // TODO
    };

    $scope.FileBrowser.init = function () {
        this.indexColumnDefs();
        this.ls();
    };

    /*
     * Tools menu
     */
    $scope.ToolsMenu = {
        isOpen: false,
        isDisabled: false,
        rm: function () {
            this.isOpen = false;
            if ($scope.FileBrowser.api.selection.getSelectedRows().length == 0) return;
            if (!confirm(T.confirm_rm_files)) return;
            $scope.FileBrowser.rm();
        }
    };

    $scope.init = function() {
        GridTools.enhance($scope.FileBrowser);
        $scope.FileBrowser.init();
    };

    /*
     * Run immediately
     */
    $scope.init();
}]);
