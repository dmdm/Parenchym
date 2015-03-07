var FsCtrl = PymApp.controller('FsCtrl',
        ['$scope', '$http', '$q', '$window', '$upload', 'RC', 'T', 'PymApp.GridTools', 'uiGridConstants',
function ($scope,   $http,   $q,   $window,   $upload,   RC,   T,   GridTools,          uiGridConstants) {

    $scope.model = $scope.model || {};

    $scope.FileBrowser = {
        files: [],
        rejectedFiles: [],
        minSize: RC.min_size,
        maxSize: RC.max_size,
        allow: RC.allow,
        deny: RC.deny,
        path: RC.path,
        overwrite: false,
        data: [],
        api: null,
        cntSelected: 0,
        pathToStr: function () {
            var self = this, pp = [];
            angular.forEach(self.path, function (x) {
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
            var self = this;
            var httpConfig = {
                params: {}
            };
            httpConfig.params.path = self.pathToStr();
            self.pym.loading = true;
            $http.get(RC.urls.ls, httpConfig)
            .then(function (resp) {
                self.pym.loading = false;
                if (resp.data.ok) {
                    var rr = resp.data.data.rows;
                    angular.forEach(rr, function (r) {
                        r.ctime = r.ctime ?  new Date(r.ctime) : null;
                        r.mtime = r.mtime ? new Date(r.mtime) : null;
                        r.dtime = r.dtime ? new Date(r.dtime) : null;
                        r.owner2 = function () { return this.owner ? this.owner + ' (' + this.owner_id + ')' : '' };
                        r.editor2 = function () { return this.editor ? this.editor + ' (' + this.editor_id + ')' : '' };
                        r.deleter2 = function () { return this.deleter ? this.deleter + ' (' + this.editor_id + ')' : '' };
                    });
                    self.data = rr;
                }
                else {
                    PYM.growl_ajax_resp(resp.data);
                }
            }, function (result) {
                self.pym.loading = false;
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
        createDirectory: function (dirName) {
            var self = this,
                httpConfig = {},
                postData = {
                    name: dirName,
                    path: self.pathToStr()
                };
            $http.post(RC.urls.create_directory, postData, httpConfig)
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
        openNode: function () {
            var self = this, nodes = [];
            // Collect selected rows
            angular.forEach(self.api.selection.getSelectedRows(), function (r) {
                nodes.push([r.id, r._name]);
            });
            self.path.push(nodes[0]);
            self.ls();
        },
        /**
         * Checks given mime-type against pattern from ``allow`` and ``deny``
         * and returns true if mime-type is allowed, false otherwise.
         */
        checkType: function (ty) {
            var self = this,
                i, imax, pat, good;
            if (! ty) ty = 'application/octet-stream';
            ty = ty.split('/');
            console.log(ty);
            // Is given mime type allowed?
            good = false;
            for (i=0, imax=self.allow.length; i<imax; i++) {
                pat = self.allow[i];
                if (pat.search(/\*/) > -1 && pat.search(/\.\*/) == -1) pat = pat.replace(/\*/g, '.*');
                pat = pat.split('/');
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
            if (allowedFiles.length) {
                self.uploader = $upload.upload({
                    url: RC.urls.upload, // upload.php script, node.js route, or servlet url
                    //method: 'POST' or 'PUT',
                    //headers: {'Authorization': 'xxx'}, // only for html5
                    //withCredentials: true,
                    data: {
                        path: self.pathToStr(),
                        overwrite: self.overwrite
                    },
                    file: allowedFiles // single file or a list of files. list is only for html5
                    //fileName: 'doc.jpg' or ['1.jpg', '2.jpg', ...] // to modify the name of the file(s)
                    //fileFormDataName: myFile, // file formData name ('Content-Disposition'), server side request form name
                    // could be a list of names for multiple files (html5). Default is 'file'
                    //formDataAppender: function(formData, key, val){}  // customize how data is added to the formData.
                    // See #40#issuecomment-28612000 for sample code

                }).progress(function (evt) {
                    console.log('progress: ' + parseInt(100.0 * evt.loaded / evt.total) + '% file :', evt.config.file);
                }).success(function (data, status, headers, config) {
                    // file is uploaded successfully
                    console.log('file ', config.file, ' is uploaded successfully. Response: ', data);
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
            { name:'id', displayName: 'ID', enableFiltering: false, enableCellEdit: false, width: 50 },
            { name:'_name', displayName: 'Name', enableCellEdit: true, width: 230 },
            { name:'_title', displayName: 'Title', enableCellEdit: true, width: 230 },
            { name:'_short_title', displayName: 'Short Title', enableCellEdit: true, width: 230 },
            { name:'descr', displayName: 'Description', enableCellEdit: true, width: 230 },
            { name:'rev', displayName: 'Rev', enableCellEdit: false, width: 45, cellFilter: "number:0", cellClass: "text-right" },
            { name:'size', displayName: 'Size', enableCellEdit: false, width: 80, cellFilter: "number:0", cellClass: "text-right" },
            { name:'nchildren', displayName: 'Children', enableCellEdit: false, width: 80, cellFilter: "number:0", cellClass: "text-right" },
            { name:'mime_type', displayName: 'Mime-Type', enableCellEdit: false, width: 150 },
            { name:'ctime', displayName: 'CTime', cellFilter: 'date: "yyyy-MM-dd HH:mm"', enableCellEdit: false, width: 150 },
            { name:'owner', field: 'owner2()', displayName: 'Owner', enableCellEdit: false, width: 150 },
            { name:'mtime', displayName: 'MTime', cellFilter: 'date: "yyyy-MM-dd HH:mm"', enableCellEdit: false, width: 150 },
            { name:'editor', field: 'editor2()', displayName: 'Editor', enableCellEdit: false, width: 150 },
            { name:'dtime', displayName: 'DTime', cellFilter: 'date: "yyyy-MM-dd HH:mm"', enableCellEdit: false, width: 150 },
            { name:'deleter', field: 'deleter2()', displayName: 'Deleter', enableCellEdit: false, width: 150 },
            { name:'deletion_reason', displayName: 'Reason', enableCellEdit: false, width: 150 }
        ],

        onRegisterApi: function(gridApi) {
            $scope.FileBrowser.api = gridApi;
            gridApi.edit.on.afterCellEdit($scope, function(rowEntity, colDef, newValue, oldValue) {
                console.log('edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue);
            });
            gridApi.rowEdit.on.saveRow($scope, $scope.FileBrowser.saveRow);

            gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                $scope.FileBrowser.cntSelected = gridApi.selection.getSelectedRows().length;
            });
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
        },
        createDirectory: function () {
            var dirName;
            this.isOpen = false;
            if (! (dirName = prompt(T.prompt_dir_name))) return;
            $scope.FileBrowser.createDirectory(dirName);
        },
        openNode: function () {
            this.isOpen = false;
            if ($scope.FileBrowser.api.selection.getSelectedRows().length == 0) return;
            $scope.FileBrowser.openNode();
        }
    };

    $scope.init = function() {
        GridTools.enhance($scope.FileBrowser);
        $scope.FileBrowser.init();
    };








    $scope.remove = function(scope) {
      scope.remove();
    };

    $scope.toggle = function(scope) {
      scope.toggle();
    };

    $scope.moveLastToTheBegginig = function () {
      var a = $scope.data.pop();
      $scope.data.splice(0,0, a);
    };

    $scope.newSubItem = function(scope) {
      var nodeData = scope.$modelValue;
      nodeData.nodes.push({
        id: nodeData.id * 10 + nodeData.nodes.length,
        title: nodeData.title + '.' + (nodeData.nodes.length + 1),
        nodes: []
      });
    };

    var getRootNodesScope = function() {
      return angular.element(document.getElementById("tree-root")).scope();
    };

    $scope.collapseAll = function() {
      var scope = getRootNodesScope();
      scope.collapseAll();
    };

    $scope.expandAll = function() {
      var scope = getRootNodesScope();
      scope.expandAll();
    };

    $scope.tree = [{
      "id": 1,
      "title": "node1",
      "nodes": [
        {
          "id": 11,
          "title": "node1.1",
          "nodes": [
            {
              "id": 111,
              "title": "node1.1.1",
              "nodes": []
            }
          ]
        },
        {
          "id": 12,
          "title": "node1.2",
          "nodes": []
        }
      ]
    }, {
      "id": 2,
      "title": "node2",
      "nodes": [
        {
          "id": 21,
          "title": "node2.1",
          "nodes": []
        },
        {
          "id": 22,
          "title": "node2.2",
          "nodes": []
        }
      ]
    }, {
      "id": 3,
      "title": "node3",
      "nodes": [
        {
          "id": 31,
          "title": "node3.1",
          "nodes": []
        }
      ],
    }, {
      "id": 4,
      "title": "node4",
      "nodes": [
        {
          "id": 41,
          "title": "node4.1",
          "nodes": []
        }
      ]
    }];




    /*
     * Run immediately
     */
    $scope.init();
}]);
