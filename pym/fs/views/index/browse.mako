<%inherit file="pym:templates/layouts/default.mako" />

<%block name="styles">
${parent.styles()}
<link rel="stylesheet" href="${request.static_url('pym:static/vendor/ui-grid/ui-grid.min.css')}">
<link rel="stylesheet" href="${request.static_url('pym:static/bower_components/angular-ui-tree/dist/angular-ui-tree.min.css')}">
<style>
.align-right { text-align: right; }
.grid {
    font-size: 85%;
    border: 1px solid rgb(212,212,212);
    height: 100%;
    /*width: 99%;*/
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
        'ui-tree'
    );
    PYM_APP_INJECTS.push(
        'angularFileUpload',
        'ui.grid', 'ui.grid.selection', 'ui.grid.resizeColumns', 'ui.grid.edit', 'ui.grid.rowEdit', 'ui.grid.cellNav',
        'ui.router',
        'ui.tree'
    );
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Filesystem")}</%block>


<script type="text/ng-template" id="nodes_renderer.html">
    <div ui-tree-handle class="tree-node tree-node-content">
        <a class="btn btn-xs"
           ng-if="node.nodes && node.nodes.length > 0"
           nodrag
           ng-click="toggle(this)">
            <span class="fa fa-fw"
                  ng-class="{'fa-caret-right': collapsed, 'fa-caret-down': !collapsed}">
            </span>
        </a>
        <span class="btn-xs" ng-if="node.nodes && node.nodes.length == 0">
            <span class="fa fa-fw"></span>
        </span>
        {{node.title}}
##        <a class="pull-right btn btn-danger btn-xs"
##           nodrag
##           ng-click="remove(this)">
##            <span class="fa fa-fw fa-remove">
##            </span>
##        </a>
##        <a class="pull-right btn btn-primary btn-xs"
##           nodrag
##           ng-click="newSubItem(this)"
##           style="margin-right: 8px;">
##            <span class="fa fa-fw fa-plus">
##            </span>
##        </a>
    </div>
    <ol ui-tree-nodes="" ng-model="node.nodes" ng-class="{hidden: collapsed}">
        <li ng-repeat="node in node.nodes"
            ui-tree-node
            ng-include="'nodes_renderer.html'">
        </li>
    </ol>
</script>



<div ng-controller="FsCtrl" ng-cloak>
    <div class="row">
        <div class="col-md-12">

            <div class="btn-group" dropdown is-open="ToolsMenu.isOpen">
                <button type="button" class="btn btn-default dropdown-toggle" dropdown-toggle ng-disabled="ToolsMenu.isDisabled">
                    <i class="fa fa-cog text-primary"></i> <span class="caret"></span>
                </button>
                <ul class="dropdown-menu" role="menu">
                    <li>
                        <div ng-file-select
                             ng-file-change="FileBrowser.upload()"
                             ng-model="FileBrowser.files"
                             ng-multiple="true"
                             multiple="multiple"
                             class="anchor"
                            >
                            <i class="fa fa-fw fa-upload"></i> ${_("Upload")}
                        </div>
                    </li>
                    <li ng-class="{'disabled':FileBrowser.cntSelected<1}">
                        <a href="#" ng-click="ToolsMenu.rm()">
                            <i class="fa fa-fw fa-trash-o"></i> ${_("Delete")}
                        </a>
                    </li>
                    <li>
                        <a href="#" ng-click="ToolsMenu.createDirectory()">
                            <i class="fa fa-fw fa-asterisk"></i> ${_("Create Directory")}
                        </a>
                    </li>
                    <li ng-class="{'disabled':FileBrowser.cntSelected<1}">
                        <a href="#" ng-click="ToolsMenu.openNode()">
                            <i class="fa fa-fw fa-folder-open-o"></i> ${_("Open Node")}
                        </a>
                    </li>
                    <li class="divider"></li>
                    <li>
                        <label class="anchor">
                            <input type="checkbox" name="overwrite" ng-model="FileBrowser.overwrite"> ${_("Allow Overwrite")}
                        </label>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <div class="outer-gutter" style="margin-top: 1ex;">
        Path:<span ng-repeat="x in FileBrowser.path">
                <a href="#" style="padding: 0 4px 0 4px;" ng-click="FileBrowser.changePath(x[0])">{{x[1]}}</a>
                <span ng-if="! $last">/</span>
            </span>
    </div>

    <div class="row" style="margin-top: 1ex; height: 75vh;">
        <div class="col-md-2">

            <div ui-tree id="tree-root">
                <ol ui-tree-nodes="" ng-model="tree">
                    <li ng-repeat="node in tree"
                        ui-tree-node
                        ng-include="'nodes_renderer.html'">
                    </li>
                </ol>
            </div>

        </div>
        <div class="col-md-10">
            <div ng-file-drop ng-file-change="FileBrowser.upload()"
                 ng-model="FileBrowser.files"
                 ng-rejected-file-model="FileBrowser.rejectedFiles"
                 ng-multiple="true"
                 allow-dir="true"
                 accept="*/*"
                 class="drop-box form-control"
                 drag-over-class="{accept:'dragover', reject:'dragover-err', delay:100}"
                >
                <div ui-grid="FileBrowser.options"
                     ui-grid-selection
                     ui-grid-resize-columns
                     ui-grid-edit
                     ui-grid-row-edit
                     ui-grid-cellNav
                     class="grid"
                    >
                </div>
            </div>
        </div>
    </div>


</div>

<script>
require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});
    PymApp.constant('T', {
        confirm_rm_files: '${_("Do you really want to delete the selected files and all of their children?")}',
        prompt_dir_name: '${_("Enter a name for the directory")}'
    });



    <%include file="FsCtrl.js" args="parent=self" />

    return FsCtrl;
});

</script>
