<%inherit file="pym:templates/layouts/default.mako" />

<%block name="styles">
${parent.styles()}
<link rel="stylesheet" href="${request.static_url('pym:static/vendor/ui-grid/ui-grid.css')}">
<link rel="stylesheet" href="${request.static_url('pym:static/app/flexy-layout/flexy-layout.css')}">
<link rel="stylesheet" href="${request.static_url('pym:static/bower_components/angular-ui-tree/dist/angular-ui-tree.min.css')}">
<style>
.flexy-outer-container {
    height: 75vh;
}
#fs-tree-root { overflow: auto; }
#fs-tree-root ol { padding-right: 2em; }
#fs-tree-root li { white-space: nowrap; }
.align-right { text-align: right; }
.grid {
    /*font-size: 90%;*/
    /*border: 1px solid rgb(212,212,212);*/
    height: 100%;
    width: 100%;
}
.ui-grid-cell { border-right: none; }
.drop-box { padding: 0px; border: none; outline: none; height: 76vh; }

.drop-box.dragover {
	outline: 2px dashed blue;
}

.drop-box.dragover-err {
	outline: 2px dashed red;
}




</style>
</%block>
<%block name="require_config">
	${parent.require_config()}
    PYM_APP_REQUIREMENTS.push(
        'ng-fup',
        'ui-grid',
        'ng-ui-router',
        'ui-tree',
        'flexy-layout',
        'pym/fs/fs'
    );
    PYM_APP_INJECTS.push(
        'angularFileUpload',
        'ui.grid', 'ui.grid.selection', 'ui.grid.resizeColumns', 'ui.grid.edit', 'ui.grid.rowEdit', 'ui.grid.cellNav',
        'ui.router',
        'ui.tree',
        'flexyLayout',
        'pym.fs'
    );
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Filesystem")}</%block>


<%include file="FsPropertiesDlgTpl.mako" args="parent=self" />
<%include file="ItemPropertiesDlgTpl.mako" args="parent=self" />


<script type="text/ng-template" id="nodes_renderer.html">
    <div ui-tree-handle class="tree-node tree-node-content" ng-class="{'selected': (fs.FileTree.selected.id == node.id)}">
            <span ng-if="node.nodes && node.nodes.length > 0"
                  nodrag
                  ng-click="fs.FileTree.toggle(this)"
                  class="fa fa-fw"
                  ng-class="{'fa-caret-right': collapsed, 'fa-caret-down': !collapsed}">
            </span>
            ## Empty icon as placeholder
            <span ng-if="! node.nodes || node.nodes.length == 0"
                  nodrag
                  class="fa fa-fw">
            </span>
            <span class="fa fa-fw fa-sort drag-handle"></span>
            <span nodrag ng-click="fs.FileTree.toggleSelected(this)">{{node.title}}</span>
    </div>
    <ol ui-tree-nodes="" ng-model="node.nodes" ng-class="{hidden: collapsed}">
        <li ng-repeat="node in node.nodes" ui-tree-node ng-include="'nodes_renderer.html'" collapsed="{{true}}"></li>
    </ol>
</script>



<div ng-controller="pymFsController as fs" ng-cloak  ng-controller="pymFsUploaderController as upl">
    <div ng-controller="pymFsUploaderController as upl">
        <div class="row">
            <div class="col-md-12">

                <div class="btn-group" dropdown is-open="fs.ToolsMenu.isOpen">
                    <button type="button" class="btn btn-default dropdown-toggle" dropdown-toggle ng-disabled="fs.ToolsMenu.isDisabled">
                        <i class="fa fa-cog text-primary"></i> ${_("Actions")} <span class="caret"></span>
                    </button>
                    <ul class="dropdown-menu" role="menu">
                        <li>
                            <a href="#" ng-click="fs.ToolsMenu.createDirectory()">
                                <i class="fa fa-fw fa-asterisk"></i> ${_("Create Directory")}
                            </a>
                        </li>
                        <li ng-class="{'disabled':!fs.canOpenNode}">
                            <a href="#" ng-click="fs.ToolsMenu.openNode()">
                                <i class="fa fa-fw fa-folder-open-o"></i> ${_("Open Node")}
                            </a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <div ng-file-select
                                 ng-model="upl.files"
                                 ng-model-rejected="upl.rejectedFiles"
                                 ng-file-change="upl.fileSelected($files, $event)"
                                 ng-multiple="true"
                                 ng-capture="camera"
                                 ng-accept="upl.validate($file)"
                                 class="anchor"
                                >
                                <i class="fa fa-fw fa-upload"></i> ${_("Upload")}
                            </div>
                        </li>
                        <li ng-class="{'disabled':!fs.canDownload}">
                            <a href="{{fs.downloadUrl}}?disposition=attachment">
                                <i class="fa fa-fw fa-download"></i> ${_("Download")}
                            </a>
                        </li>
                        <li ng-class="{'disabled':!fs.canDownload}">
                            <a href="{{fs.downloadUrl}}" target="_blank">
                                <i class="fa fa-fw fa-eye"></i> ${_("Preview")}
                            </a>
                        </li>
                        <li class="divider"></li>
                        <li ng-class="{'disabled':!fs.canDeleteItems}">
                            <a href="#" ng-click="fs.ToolsMenu.deleteItems()">
                                <i class="fa fa-fw fa-trash-o"></i> ${_("Delete")}
                            </a>
                        </li>
                        <li ng-class="{'disabled':!fs.canUndeleteItems}">
                            <a href="#" ng-click="fs.ToolsMenu.undeleteItems()">
                                <i class="fa fa-fw fa-trash-o fa-rotate-180"></i> ${_("Undelete")}
                            </a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <a href="#" ng-click="fs.ToolsMenu.openFsPropertiesDlg()">
                                <i class="fa fa-fw"></i> ${_("Fs Properties")}
                            </a>
                        </li>
                        <li ng-class="{'disabled':!fs.canOpenItemPropertiesDlg}">
                            <a href="#" ng-click="fs.ToolsMenu.openItemPropertiesDlg()">
                                <i class="fa fa-fw"></i> ${_("Item Properties")}
                            </a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <a href="#" ng-click="fs.ToolsMenu.refresh()">
                                <i class="fa fa-fw fa-refresh"></i> ${_("Refresh")}
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="btn-group" dropdown is-open="fs.PrefMenu.isOpen">
                    <button type="button" class="btn btn-default dropdown-toggle" dropdown-toggle ng-disabled="fs.PrefMenu.isDisabled">
                        <i class="fa fa-wrench text-primary"></i> ${_("Preferences")} <span class="caret"></span>
                    </button>
                    <ul class="dropdown-menu" role="menu">
                        <li>
                            <label class="anchor">
                                <input type="checkbox" name="overwrite" ng-model="fs.GlobalOptions.overwrite"> ${_("Allow Overwrite")}
                            </label>
                        </li>
                        <li>
                            <label class="anchor">
                                <input type="checkbox" name="include_deleted" ng-model="fs.GlobalOptions.includeDeleted" ng-click="fs.toggleIncludeDeleted()" ng-true-value="true" ng-false-value="false"> ${_("Show deleted")}
                            </label>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="row" ng-cloak>
            <div class="col-md-12">
                <section class="pym-fs-uploader" ng-if="upl.windowIsOpen">
                    <header>
                        <button class="btn btn-default" ng-click="upl.minimaxWindow()"><i class="fa fa-fw" ng-class="{'fa-chevron-down': !upl.windowMaximized, 'fa-chevron-up': upl.windowMaximized}"></i></button>
                        <button class="btn btn-primary" ng-disabled="upl.uploading>0" ng-click="upl.startUpload()"><i class="fa fa-upload"></i> Start</button>
                        <button class="btn" ng-class="{'btn-default': upl.activeUploads===0, 'btn-danger': upl.activeUploads>0}" ng-click="upl.closeWindow()">
                            <span ng-if="upl.activeUploads>0"><i class="fa fa-close" style="font-weight: bold;"></i> Cancel All</span>
                            <span ng-if="upl.activeUploads===0"><i class="fa fa-power-off" style="font-weight: bold;"></i> Close</span>
                        </button>
                        <div class="text">{{upl.activeUploads}}</div>
                        <div ng-if="upl.errors" class="text text-danger"><i class="fa fa-exclamation-triangle"></i> {{upl.errors}}</div>
                        <progressbar ng-if="upl.activeUploads" class="progress-striped active progress-bar-striped" value="upl.totalProgress">{{upl.totalProgress}} %</progressbar>
                    </header>
                    <div class="body" ng-show="upl.windowMaximized">
                        <table class="table table-condensed table-responsive">
                            <tbody>
                                <tr ng-repeat-start="(k, f) in upl.queue">
                                    <td title="{{f.stateCaption}}" style="width: 4em;">
                                        <i class="fa fa-fw"
                                           ng-class="{
                                                'fa-bicycle': f.state == upl.FILE_STATES.VALIDATING,
                                                'fa-chain text-info': f.state == upl.FILE_STATES.VALIDATION_OK,
                                                'fa-chain-broken text-danger': f.state == upl.FILE_STATES.VALIDATION_ERROR,
                                                'fa-car fa-rotate-270': f.state == upl.FILE_STATES.CAN_UPLOAD,
                                                'fa-car': f.state == upl.FILE_STATES.UPLOADING,
                                                'fa-check text-success': f.state == upl.FILE_STATES.UPLOAD_OK,
                                                'fa-bug text-danger': f.state == upl.FILE_STATES.UPLOAD_ERROR,
                                                'fa-remove text-danger': f.state == upl.FILE_STATES.UPLOAD_CANCELED
                                           }"
                                            ></i>
                                    </td>
                                    <td>
                                        {{f.file.name}}
                                        <button ng-if="f.isActive" class="btn btn-xs btn-default" ng-click="upl.cancel(f)"><i class="fa fa-trash-o text-danger" style="font-weight: bold;"></i></button>
                                        <div ng-if="(f.state == upl.FILE_STATES.VALIDATION_OK || f.state == upl.FILE_STATES.CAN_UPLOAD) && f.exists">
                                            ${_("File exists.")}
                                            <label><input name="write_mode{{$index}}" type="radio" ng-click="f.setWriteMode('update')" ng-disabled="! f.permissions.update" value="update"> <span ng-class="{'text-muted':! f.permissions.update}">${_("Update or")}</span></label>
                                            <label><input name="write_mode{{$index}}" type="radio" ng-click="f.setWriteMode('revise')" ng-disabled="! f.permissions.revise" value="revise"> <span ng-class="{'text-muted':! f.permissions.revise}">${_("revise?")}</span></label>
                                        </div>
                                        <div ng-if="f.validationMessage" class="text-danger">{{f.validationMessage}}</div>
                                    </td>
                                    <td class="align-right">{{f.file.size|number:0}}</td>
                                    <td>{{f.file.type}}</td>
                                </tr>
                                <tr ng-repeat-end ng-if="f.isUploading">
                                    <td></td>
                                    <td><progressbar class="progress-striped active progress-bar-striped progress-no-margin" value="f.progress">{{f.progress}} %</progressbar></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>

        <div class="outer-gutter" style="margin: 1ex 0;">
            Path:<span ng-repeat="x in fs.FileTree.path">
                    <a href="#" style="padding: 0 4px 0 4px;" ng-click="fs.FileTree.setPathById(x.id)">{{x.title}}</a>
                    <span ng-if="! $last">/</span>
                </span>
        </div>

        <div class="outer-gutter flexy-outer-container">
            <flexy-layout>
                <block-container init="200" style="overflow: visible;">
                    <div>
                        <button class="btn btn-xs" ng-click="fs.FileTree.expandAll()" title="${_('Expand All')}"><i class="fa fa-fw fa-code-fork fa-rotate-90"></i></button>
                        <button class="btn btn-xs" ng-click="fs.FileTree.collapseAll()" title="${_('Collapse All')}"><i class="fa fa-fw fa-code-fork fa-rotate-270"></i></button>
                        <div class="btn-group" dropdown is-open="fs.FileTree.toolsIsOpen">
                            <button type="button" class="btn btn-xs dropdown-toggle" dropdown-toggle ng-disabled="fs.FileTree.toolsIsDisabled">
                                <i class="fa fa-cog"></i> <span class="caret"></span>
                            </button>
                            <ul class="dropdown-menu" role="menu">
                                <li role="presentation" class="dropdown-header">${_("Display")}</li>
                                <li>
                                    <label class="anchor">
                                        <input type="radio" name="filter" ng-click="fs.FileTree.refresh()" ng-model="fs.FileTree.filter" value="dirs"> ${_("Directories")}
                                    </label>
                                </li>
                                <li>
                                    <label class="anchor">
                                        <input type="radio" name="filter" ng-click="fs.FileTree.refresh()" ng-model="fs.FileTree.filter" value="all"> ${_("All")}
                                    </label>
                                </li>
                                <li class="divider"></li>
                                <li>
                                    <a href="#" ng-click="fs.FileTree.refresh()">
                                        <i class="fa fa-fw fa-refresh"></i> ${_("Refresh")}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div style="overflow: auto; height: 95%; height: calc(100% - 24px); padding: 4px 4px 0 0;">
                        <div ui-tree callbacks="fs.FileTree.callbacks" id="fileTreeRootNodes">
                            <ol ui-tree-nodes="" ng-model="fs.FileTree.data">
                                <li ng-repeat="node in fs.FileTree.data" ui-tree-node ng-include="'nodes_renderer.html'" collapsed="{{true}}"></li>
                            </ol>
                        </div>
                    </div>
                </block-container>
                <block-splitter on-splitter-stop="fs.FileBrowser.windowResized" size="5"></block-splitter>
                <block-container>
                    <div ng-file-drop
                         ng-model="fs.FileUploader.files"
                         ng-model-rejected="fs.FileUploader.rejectedFiles"
                         ng-file-change="fs.FileUploader.fileDropped($files, $event, $rejectedFiles)"
                         ng-multiple="true"
                         allow-dir="true"
                         ng-accept="fs.FileUploader.validate($file)"
                         drop-available="fs.FileUploader.isDropAvailable"
                         stop-propagation="false"
                         hide-on-drop-not-available="false"
                         class="drop-box form-control"
                         drag-over-class="{accept:'dragover', reject:'dragover-err', delay:100}"
                        >
                        <div ui-grid="fs.FileBrowser.options"
                             ui-grid-selection
                             ui-grid-resize-columns
                             ui-grid-edit
                             ui-grid-row-edit
                             ui-grid-cellNav
                             class="grid"
                            >
                        </div>
                    </div>
                </block-container>
            </flexy-layout>
            <p ng-no-file-drop>File Drag/drop is not supported</p>
        </div>
    </div>
</div>

<script>
require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});
    PymApp.constant('T', {
        prompt_delete_items: '${_("Do you really want to delete the selected items and all of their children? Specify a reason or »YES«, leave empty to cancel.")}',
        confirm_undelete_items: '${_("Do you really want to undelete the selected items and all of their children?")}',
        prompt_dir_name: '${_("Enter a name for the directory")}',
        confirm_cancel_all_uploads: '${_("Do you really want to cancel all uploads?")}'
    });



##    <%include file="/fs/fs.js" args="parent=self" />
##    <%include file="/fs/fs-const.js" args="parent=self" />
##    <%include file="/fs/fs-service.js" args="parent=self" />
##    <%include file="/fs/uploader-service.js" args="parent=self" />
##    <%include file="/fs/uploader-controller.js" args="parent=self" />

    <%include file="FsPropertiesDlgController.js" args="parent=self" />
    <%include file="ItemPropertiesDlgController.js" args="parent=self" />
    <%include file="FsController.js" args="parent=self" />

});

</script>
