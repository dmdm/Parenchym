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
        'flexy-layout'
    );
    PYM_APP_INJECTS.push(
        'angularFileUpload',
        'ui.grid', 'ui.grid.selection', 'ui.grid.resizeColumns', 'ui.grid.edit', 'ui.grid.rowEdit', 'ui.grid.cellNav',
        'ui.router',
        'ui.tree',
        'flexyLayout'
    );
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Filesystem")}</%block>


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



<div ng-controller="FsController as fs" ng-cloak>
    <div class="row">
        <div class="col-md-12">

            <div class="btn-group" dropdown is-open="fs.ToolsMenu.isOpen">
                <button type="button" class="btn btn-default dropdown-toggle" dropdown-toggle ng-disabled="fs.ToolsMenu.isDisabled">
                    <i class="fa fa-cog text-primary"></i> <span class="caret"></span>
                </button>
                <ul class="dropdown-menu" role="menu">
                    <li>
                        <div ng-file-select
                             ng-file-change="fs.FileBrowser.upload()"
                             ng-model="fs.FileBrowser.files"
                             ng-multiple="true"
                             multiple="multiple"
                             class="anchor"
                            >
                            <i class="fa fa-fw fa-upload"></i> ${_("Upload")}
                        </div>
                    </li>
                    <li ng-class="{'disabled':fs.FileBrowser.cntSelected<1}">
                        <a href="#" ng-click="fs.ToolsMenu.rm()">
                            <i class="fa fa-fw fa-trash-o"></i> ${_("Delete")}
                        </a>
                    </li>
                    <li>
                        <a href="#" ng-click="fs.ToolsMenu.createDirectory()">
                            <i class="fa fa-fw fa-asterisk"></i> ${_("Create Directory")}
                        </a>
                    </li>
                    <li ng-class="{'disabled':FileBrowser.cntSelected<1}">
                        <a href="#" ng-click="fs.ToolsMenu.openNode()">
                            <i class="fa fa-fw fa-folder-open-o"></i> ${_("Open Node")}
                        </a>
                    </li>
                    <li class="divider"></li>
                    <li>
                        <label class="anchor">
                            <input type="checkbox" name="overwrite" ng-model="fs.GlobalOptions.overwrite"> ${_("Allow Overwrite")}
                        </label>
                    </li>
                    <li>
                        <label class="anchor">
                            <input type="checkbox" name="include_deleted" ng-model="fs.GlobalOptions.includeDeleted" ng-true-value="1" ng-false-value="0"> ${_("Show deleted")}
                        </label>
                    </li>
                </ul>
            </div>
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
                <div ng-file-drop ng-file-change="fs.FileBrowser.upload()"
                     ng-model="fs.FileBrowser.files"
                     ng-rejected-file-model="fs.FileBrowser.rejectedFiles"
                     ng-multiple="true"
                     allow-dir="true"
                     accept="*/*"
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



    <%include file="FsController.js" args="parent=self" />

    return FsController;
});

</script>
