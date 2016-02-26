'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Tree = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _Node = require('./Node');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_RC = {
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

var Tree = function () {
    function Tree(rc, treeData) {
        _classCallCheck(this, Tree);

        this.rc = _angular2.default.extend({}, DEFAULT_RC, rc);
        this.changeTreeData(treeData);

        this._nextNodeId = 1;

        if (this.rc.onTreeReady) {
            this.rc.onTreeReady(this);
        }
    }

    _createClass(Tree, [{
        key: 'idGen',
        value: function idGen(n) {
            if (this.rc.idGen) {
                return this.rc.idGen(n);
            } else {
                return this._nextNodeId++;
            }
        }
    }, {
        key: 'nodeById',
        value: function nodeById(id) {
            id = '' + id;
            return this._allNodes.get(id);
        }
    }, {
        key: 'changeTreeData',
        value: function changeTreeData(treeData) {
            this._nextNodeId = 1;
            this._allNodes = new Map();
            this._nodes = (0, _Node.dataToNodes)(this, treeData);
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
    }, {
        key: 'expandAll',
        value: function expandAll() {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.nodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var n = _step.value;

                    n.expand(true, this.rc.expansionMaxDepth);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'collapseAll',
        value: function collapseAll() {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this.nodes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var n = _step2.value;

                    n.collapse(true);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }
    }, {
        key: 'selectAll',
        value: function selectAll() {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = this.nodes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var n = _step3.value;

                    n.select(true);
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            this.selectedToList();
        }
    }, {
        key: 'unselectAll',
        value: function unselectAll() {
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = this.nodes[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var n = _step4.value;

                    n.unselect(true);
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            this.selectedToList();
        }
    }, {
        key: 'getState',
        value: function getState() {
            var _nodesToIdList = function _nodesToIdList(nodes) {
                var a = [];
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    for (var _iterator5 = nodes[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var n = _step5.value;

                        a.push(n.id);
                    }
                } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion5 && _iterator5.return) {
                            _iterator5.return();
                        }
                    } finally {
                        if (_didIteratorError5) {
                            throw _iteratorError5;
                        }
                    }
                }

                return a;
            };
            return {
                selected: _nodesToIdList(this.selected),
                expanded: _nodesToIdList(this.expanded),
                filterExpr: this._filterExpr
            };
        }
    }, {
        key: 'setState',
        value: function setState(state) {
            var expanded = state.expanded || [];
            var selected = state.selected || [];
            var visitor = function visitor(tree, node) {
                if (expanded.indexOf(node.id) >= 0) {
                    node.expand();
                } else {
                    node.collapse();
                }
                if (selected.indexOf(node.id) >= 0) {
                    node.select();
                } else {
                    node.unselect();
                }
            };
            this.walk(visitor);
            this.filter(state.filterExpr || null);
        }
    }, {
        key: 'filter',
        value: function filter(expr) {
            var _this = this;

            if (expr === undefined || expr === null || expr === '') {
                expr = null;
            }
            this._filterExpr = expr;
            if (expr === null) {
                this.matches = null;
            } else {
                if (this.rc.filter) {
                    this.matches = this.rc.filter(this, expr);
                } else {
                    (function () {
                        _this.matches = null;
                        var q = new RegExp(expr.toLowerCase());
                        _this.matches = new Set();
                        var self = _this;

                        _this.walk(function (tree, node) {
                            if (q.test(node.text.toLowerCase())) {
                                self.matches.add(node);
                                while (node.parent) {
                                    node = node.parent;
                                    _this.matches.add(node);
                                }
                            }
                        });
                    })();
                }
            }

            this._filteredNodes.length = 0;
            if (this._nodes) {
                if (this.matches === null) {
                    var _iteratorNormalCompletion6 = true;
                    var _didIteratorError6 = false;
                    var _iteratorError6 = undefined;

                    try {
                        for (var _iterator6 = this._nodes[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var node = _step6.value;

                            this._filteredNodes.push(node);
                            node.filterChildren();
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                                _iterator6.return();
                            }
                        } finally {
                            if (_didIteratorError6) {
                                throw _iteratorError6;
                            }
                        }
                    }
                } else {
                    var _iteratorNormalCompletion7 = true;
                    var _didIteratorError7 = false;
                    var _iteratorError7 = undefined;

                    try {
                        for (var _iterator7 = this._nodes[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                            var node = _step7.value;

                            if (this.matches.has(node)) {
                                this._filteredNodes.push(node);
                            }
                            node.filterChildren();
                        }
                    } catch (err) {
                        _didIteratorError7 = true;
                        _iteratorError7 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion7 && _iterator7.return) {
                                _iterator7.return();
                            }
                        } finally {
                            if (_didIteratorError7) {
                                throw _iteratorError7;
                            }
                        }
                    }
                }
            }
        }
    }, {
        key: 'walk',
        value: function walk(visitor) {
            var _this2 = this;

            var _loop = function _loop(nodes) {
                var _iteratorNormalCompletion8 = true;
                var _didIteratorError8 = false;
                var _iteratorError8 = undefined;

                try {
                    for (var _iterator8 = nodes[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                        var n = _step8.value;

                        visitor(_this2, n);
                        if (n._children) {
                            _loop(n._children);
                        }
                    }
                } catch (err) {
                    _didIteratorError8 = true;
                    _iteratorError8 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion8 && _iterator8.return) {
                            _iterator8.return();
                        }
                    } finally {
                        if (_didIteratorError8) {
                            throw _iteratorError8;
                        }
                    }
                }
            };
            _loop(this._nodes);
        }
    }, {
        key: 'selectedToList',
        value: function selectedToList() {
            this.selectedAsList.length = 0;
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                for (var _iterator9 = this.selected[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    var n = _step9.value;

                    this.selectedAsList.push(n);
                }
            } catch (err) {
                _didIteratorError9 = true;
                _iteratorError9 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion9 && _iterator9.return) {
                        _iterator9.return();
                    }
                } finally {
                    if (_didIteratorError9) {
                        throw _iteratorError9;
                    }
                }
            }
        }
    }, {
        key: 'filterExpr',
        get: function get() {
            return this._filterExpr;
        }
    }, {
        key: 'hasNodes',
        get: function get() {
            return this._filteredNodes.length > 0;
        }
    }, {
        key: 'nodes',
        get: function get() {
            return this._filteredNodes;
        }
    }, {
        key: 'allNodes',
        get: function get() {
            return this._allNodes;
        }
    }]);

    return Tree;
}();

exports.Tree = Tree;
//# sourceMappingURL=Tree.js.map
