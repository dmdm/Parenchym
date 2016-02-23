import angular from 'angular';
import { dataToNodes } from './Node';


let DEFAULT_RC = {
    /**
     * Options
     */

    /**
     * Allow more than one node to be selected.
     */
    multiSelect: true,
    /**
     * Maximum levels to expand on expandAll()
     */
    expansionMaxDepth: 5,

    /**
     * Callback functions
     */

    /**
     * Called by each node the first time the unique node ID is needed.
     * If omitted, the tree uses an integer sequence.
     */
    idGen: undefined,

    /**
     * Called when a node is about to be expanded.
     * Return true to allow, false to deny.
     * Args = (tree, node)
     * Default: undefined
     */
    onExpand: undefined,
    /**
     * Called when a node is about to be collapsed.
     * Return true to allow, false to deny.
     * Args = (tree, node)
     * Default: undefined
     */
    onCollapse: undefined,
    /**
     * Called when a node is about to be selected.
     * Return true to allow, false to deny.
     * Args = (tree, node)
     * Default: undefined
     */
    onSelect: undefined,
    /**
     * Called when a node is about to be unselected.
     * Return true to allow, false to deny.
     * Args = (tree, node)
     * Default: undefined
     */
    onUnselect: undefined,
    /**
     * Callback to load child nodes.
     * Must be a promise. Its response must be the children data.
     * Args = (tree, node)
     * Default: undefined
     */
    onLoadChildren: undefined,
    /**
     * Called when the tree instance is ready.
     * Args = (tree)
     * Default: undefined
     */
    onTreeReady: undefined,

    /**
     * Templates
     */
    expandButton: '<i class="fa fa-fw fa-caret-right"></i>',
    mayExpandButton: '<i class="fa fa-fw fa-caret-right"></i>',
    collapseButton: '<i class="fa fa-fw fa-caret-down"></i>',
    blankButton: '<i class="fa fa-fw"></i>'
};


class Tree {
    constructor (rc, treeData) {
        this.rc = angular.extend({}, DEFAULT_RC, rc);
        this.changeTreeData(treeData);

        this._nextNodeId = 1;

        if (this.rc.onTreeReady) {
            this.rc.onTreeReady(this);
        }
    }

    get filterExpr() {
        return this._filterExpr;
    }

    get hasNodes() {
        return this._filteredNodes.length > 0;
    }

    get nodes() {
        return this._filteredNodes;
    }

    get allNodes() {
        return this._allNodes;
    }

    idGen(n) {
        if (this.rc.idGen) {
            return this.rc.idGen(n);
        }
        else {
            return this._nextNodeId++;
        }
    }

    nodeById(id) {
        id = '' + id;
        return this._allNodes.get(id);
    }

    changeTreeData(treeData) {
        this._nextNodeId = 1;
        this._allNodes = new Map();
        this._nodes = dataToNodes(this, treeData);
        this.selected = new Set();
        this.expanded = new Set();
        /**
         * ng-repeat does not work with Set(). Therefore we convert the set into
         * list.
         */
        this.selectedAsList = [];
        this.matches = null;
        this._filteredNodes = [];
        this._filterExpr = null;

        this.filter();
    }

    expandAll() {
        for (let n of this.nodes) {
            n.expand(true, this.rc.expansionMaxDepth);
        }
    }

    collapseAll() {
        for (let n of this.nodes) {
            n.collapse(true);
        }
    }

    selectAll() {
        for (let n of this.nodes) {
            n.select(true);
        }
        this.selectedToList();
    }

    unselectAll() {
        for (let n of this.nodes) {
            n.unselect(true);
        }
        this.selectedToList();
    }

    getState() {
        let _nodesToIdList = nodes => {
            let a = [];
            for (let n of nodes) {
                a.push(n.id);
            }
            return a;
        };
        return {
            selected: _nodesToIdList(this.selected),
            expanded: _nodesToIdList(this.expanded),
            filterExpr: this._filterExpr
        };
    }

    setState(state) {
        let expanded = state.expanded || [];
        let selected = state.selected || [];
        let visitor = (tree, node) => {
            if (expanded.indexOf(node.id) >= 0) {
                node.expand();
            }
            else {
                node.collapse();
            }
            if (selected.indexOf(node.id) >= 0) {
                node.select();
            }
            else {
                node.unselect();
            }
        };
        this.walk(visitor);
        this.filter(state.filterExpr || null);
    }

    filter(expr) {
        if (expr === undefined || expr === null || expr === '') {
            expr = null;
        }
        this._filterExpr = expr;
        if (expr === null) {
            this.matches = null;
        }
        else {
            if (this.rc.filter) {
                this.matches = this.rc.filter(this, expr);
            }
            else {
                this.matches = null;
                let q = new RegExp(expr.toLowerCase());
                this.matches = new Set();
                let self = this;

                this.walk((tree, node) => {
                    if (q.test(node.text.toLowerCase())) {
                        self.matches.add(node);
                        while (node.parent) {
                            node = node.parent;
                            this.matches.add(node);
                        }
                    }
                });
            }
        }

        this._filteredNodes.length = 0;
        if (this._nodes) {
            if (this.matches === null) {
                for (let node of this._nodes) {
                    this._filteredNodes.push(node);
                    node.filterChildren();
                }
            }
            else {
                for (let node of this._nodes) {
                    if (this.matches.has(node)) {
                        this._filteredNodes.push(node);
                    }
                    node.filterChildren();
                }
            }
        }
    }

    walk(visitor) {
        let _loop = nodes => {
            for (let n of nodes) {
                visitor(this, n);
                if (n._children) {
                    _loop(n._children);
                }
            }
        };
        _loop(this._nodes);
    }

    selectedToList() {
        this.selectedAsList.length = 0;
        for (let n of this.selected) {
            this.selectedAsList.push(n);
        }
    }
}


export { Tree };
