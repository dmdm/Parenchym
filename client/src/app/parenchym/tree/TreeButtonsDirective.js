import angular from 'angular';


class TreeButtonsController {
}

TreeButtonsController.$inject = [];


class TreeButtonsDirective {
    constructor() {
        this.restrict = 'E';
        this.template = `
            <div style="display: table-row;">
                <div style="display: table-cell; vertical-align: middle;">
                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.expandAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || 'Expand All'}}">    <i class="fa fa-fw fa-code-fork fa-rotate-90"></i></a>
                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.collapseAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || 'Collapse All'}}"><i class="fa fa-fw fa-code-fork fa-rotate-270"></i></a>
                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.selectAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || 'Select All'}}">    <i class="fa fa-fw fa-adjust"></i></a>
                    <a type="button" class="btn btn-secondary btn-sm" ng-click="treeButtonsCtrl.tree.unselectAll()" title="{{treeButtonsCtrl.rc.titles.expandAll || 'Select None'}}"> <i class="fa fa-fw fa-adjust fa-flip-horizontal"></i></a>
                </div>
                <div style="display: table-cell; padding-left: 5px;">
                    <div class="input-group">
                        <span class="input-group-addon"><i class="fa fa-fw fa-search"></i></span>
                        <input type="text"
                            ng-model="treeButtonsCtrl.filterExpr"
                            ng-change="treeButtonsCtrl.tree.filter(treeButtonsCtrl.filterExpr)"
                            id="{{treeButtonsCtrl.inputId}}"
                            name="{{treeButtonsCtrl.inputId}}"
                            class="{{treeButtonsCtrl.inputClass || 'form-control form-control-sm'}}"
                            style="width: 200px;"
                            placeholder="{{treeButtonsCtrl.placeholder}}">
                    </div>
                </div>
            </div>
                    `;
        this.scope = {}; // isolate scope
        this.bindToController = {
            tree: '=',
            rc: '=',
            inputId: '@',
            inputClass: '@',
            placeholder: '@',
            filterExpr: '='
        };
        this.controllerAs = 'treeButtonsCtrl';
        this.controller = TreeButtonsController;
    }

    //// Must use compile(), because link() does not have access to 'this'.
    //compile(elem, attr) {
    //    return angular.bind(this, this._link);
    //}
    //
    //_link($scope, $elem, $attr, $ctrl) {
    //    // noop
    //}

    static directiveFactory() {
        TreeButtonsDirective.instance = new TreeButtonsDirective();
        return TreeButtonsDirective.instance;
    }
}

TreeButtonsDirective.directiveFactory.$inject = [];


export default TreeButtonsDirective;
