<%inherit file="pym:templates/_layouts/sys.mako" />

<%block name="styles">
${parent.styles()}
<style>
.drop-box {
	background: #F8F8F8;
	border: 5px dashed #DDD;
	width: 200px;
	text-align: center;
}

.drop-box.dragover {
	border: 5px dashed blue;
}

.drop-box.dragover-err {
	border: 5px dashed red;
}
</style>
</%block>
<%block name="require_config">
	${parent.require_config()}
    PYM_APP_REQUIREMENTS.push('ng-fup');
    PYM_APP_INJECTS.push('angularFileUpload');
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Filesystem")}</%block>
<div ng-controller="FsCtrl" ng-cloak>
    <div class="row">
        <div class="col-md-2">
            <button ng-file-select ng-file-change="FileBrowser.upload()"
                    ng-model="FileBrowser.files"
                    ng-multiple="true"
                    multiple="multiple"
                    class="btn btn-default form-control"
            >Select to upload</button>
        </div>
        <div class="col-md-8">
            <div ng-file-drop ng-file-change="FileBrowser.upload()"
                 ng-model="FileBrowser.files"
                 ng-rejected-file-model="FileBrowser.rejectedFiles"
                 ng-multiple="true"
                 allow-dir="true"
                 accept="*/*"
                 class="drop-box form-control"
                 drag-over-class="{accept:'dragover', reject:'dragover-err', delay:100}"
            >or drop here</div>
        </div>
        <div class="col-md-2">
            <div class="btn-group pull-right" dropdown is-open="ToolsMenu.isOpen">
              <button type="button" class="btn btn-default dropdown-toggle" ng-disabled="ToolsMenu.isDisabled">
                <i class="fa fa-cog text-primary"></i> <span class="caret"></span>
              </button>
              <ul class="dropdown-menu" role="menu">
                <li><a href="#" ng-click="doThis()">${_("Do this")}</a></li>
                <li><a href="#">${_("Do that")}</a></li>
                <li><a href="#">${_("No rest for the wicked")}</a></li>
              </ul>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-md-12">
            Files: {{FileBrowser.files}}
        </div>
    </div>
</div>

<script>
require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});

    var FsCtrl = PymApp.controller('FsCtrl',
            ['$scope', '$http', '$q', '$window', '$upload', 'RC',
    function ($scope,   $http,   $q,   $window,   $upload,   RC) {

        $scope.model = {};

        $scope.FileBrowser = {
            files: [],
            minSize: RC.min_size,
            maxSize: RC.max_size,
            allow: RC.allow,
            deny: RC.deny,
            onFilesChange: function () {
                // NOOP
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
                    file: allowedFiles, // single file or a list of files. list is only for html5
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
                    if (data.ok) {
                        var m = [];
                        angular.forEach(data.data, function(v, k) {
                            m.push('<p>' + k + ': ' + v + '</p>');
                        });
                        PYM.growl({kind: 'success', text: m.join('')});
                    }
                    else {
                        PYM.growl_ajax_resp(data);
                    }
                });
                //.error(...)
                //.then(success, error, progress); // returns a promise that does NOT have progress/abort/xhr functions
                //.xhr(function(xhr){xhr.upload.addEventListener(...)}) // access or attach event listeners to
                //the underlying XMLHttpRequest
            }
        };



        /*
         * Tools menu
         */
        $scope.ToolsMenu = {
            isOpen: false,
            isDisabled: false
        };

        $scope.init = function() {
##            $scope.$watch('FileBrowser.files', $scope.FileBrowser.onFilesChange);
        };

        /*
         * Run immediately
         */
        $scope.init();
    }]);

    return FsCtrl;
});

</script>
