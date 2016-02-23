import angular from 'angular';


class TreeFilterController {
    constructor() {
    }
}

TreeFilterController.$inject = [];


class TreeFilterDirective {
    constructor() {
        this.restrict = 'E';
        this.template = `
            <div class="input-group">
                <span class="input-group-addon"><i class="fa fa-fw fa-search"></i></span>
                <input type="text"
                    ng-model="treeFilterCtrl.filterExpr"
                    ng-change="treeFilterCtrl.tree.filter(treeFilterCtrl.filterExpr)"
                    id="{{treeFilterCtrl.inputId}}"
                    name="{{treeFilterCtrl.inputId}}"
                    class="{{treeFilterCtrl.inputClass || 'form-control form-control-sm'}}"
                    placeholder="{{treeFilterCtrl.placeholder}}">
            </div>`;
        this.scope = {}; // isolate scope
        this.bindToController = {
            inputId: '@',
            inputClass: '@',
            placeholder: '@',
            tree: '=',
            filterExpr: '='
        };
        this.controllerAs = 'treeFilterCtrl';
        this.controller = TreeFilterController;
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
        TreeFilterDirective.instance = new TreeFilterDirective();
        return TreeFilterDirective.instance;
    }
}

TreeFilterDirective.directiveFactory.$inject = [];


export default TreeFilterDirective;
