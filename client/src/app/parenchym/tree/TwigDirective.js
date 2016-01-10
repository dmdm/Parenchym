import angular from 'angular';


class TwigController {
    constructor() {
    }
}

TwigController.$inject = [];


class TwigDirective {
    constructor(recursionHelper) {
        this._recursionHelper = recursionHelper;
        this.restrict = 'EA';
        this.template = `
            <ul ng-class="{root: twigCtrl.isRoot, 'pym-twig': true}">
                <pym-tree-node ng-repeat="n in twigCtrl.nodes track by n.id" data-node="n"></pym-tree-node>
            </ul>`;
        this.scope = {}; // isolate scope
        this.bindToController = {
            nodes: '=',
            isRoot: '='
        };
        this.controllerAs = 'twigCtrl';
        this.controller = TwigController;
    }

    compile(elem) {
        return this._recursionHelper.compile(elem);
    }

    static directiveFactory(recursionHelper) {
        TwigDirective.instance = new TwigDirective(recursionHelper);
        return TwigDirective.instance;
    }
}

TwigDirective.directiveFactory.$inject = ['pym.recursionHelper'];


export default TwigDirective;
