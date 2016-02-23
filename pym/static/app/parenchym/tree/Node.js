'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.dataToNodes = exports.Node = undefined;

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function dataToNodes(tree, data) {
    var nn = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var d = _step.value;

            var n = new Node(tree, d);
            nn.push(n);
            if (d.children) {
                n.setChildNodes(dataToNodes(tree, d.children));
            }
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

    return nn;
}

var Node = function () {
    function Node(tree, nodeData) {
        _classCallCheck(this, Node);

        this.tree = tree;
        this.data = nodeData;
        this._id = undefined;
        this._type = undefined;
        this._children = undefined;
        this._filteredChildren = [];
        this._parent = undefined;

        this.expanded = nodeData.expanded ? nodeData.expanded : false;
        this.selected = nodeData.selected ? nodeData.selected : false;

        this.tree.allNodes.set(this.id, this);
    }

    /**
     * Node ID that is unique in the whole tree.
     * 
     * This node ID may be provided in the data as key '__nodeID__'. If not,
     * we construct it ourselves by concatenating the node type and the ID from
     * the data (keys '__type__' and 'id'). If '__nodeType__' is not given,
     * we consider key 'id' to be the node ID. If both keys are absent, we use
     * an integer sequence.
     *
     * Using key 'id' as the node ID may not what you want, e.g. if the
     * different levels of the tree come from different database tables. Then
     * the same 'id' may occur multiple times, on different levels, true, but
     * angular's 'track by' will still complain verbosely.
     */

    _createClass(Node, [{
        key: 'expand',
        value: function expand() {
            var _this = this;

            var recursive = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];
            var maxDepth = arguments.length <= 1 || arguments[1] === undefined ? 99999 : arguments[1];

            var self = this;
            var _doExpand = function _doExpand() {
                if (self.hasChildren) {
                    var allow = self.tree.rc.onExpand ? self.tree.rc.onExpand(self.tree, self) : true;
                    if (allow) {
                        self.expanded = true;
                        self.tree.expanded.add(self);
                    }
                    if (recursive && maxDepth > 0) {
                        var _iteratorNormalCompletion2 = true;
                        var _didIteratorError2 = false;
                        var _iteratorError2 = undefined;

                        try {
                            for (var _iterator2 = self.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                var ch = _step2.value;

                                ch.expand(recursive, maxDepth - 1);
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
                }
            };

            if (this.tree.rc.onLoadChildren && !_angular2.default.isArray(this._children)) {
                this.tree.rc.onLoadChildren(this.tree, this).then(function (childrenData) {
                    _this.setChildNodes(dataToNodes(_this.tree, childrenData));
                    _doExpand();
                });
            } else {
                _doExpand();
            }
        }
    }, {
        key: 'collapse',
        value: function collapse() {
            var recursive = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

            var allow = this.tree.rc.onCollapse ? this.tree.rc.onCollapse(this.tree, this) : true;
            if (allow) {
                this.expanded = false;
                this.tree.expanded.delete(this);
            }
            if (recursive && this.hasChildren) {
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                    for (var _iterator3 = this.children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                        var ch = _step3.value;
                        ch.collapse(recursive);
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
            }
        }
    }, {
        key: 'toggle',
        value: function toggle() {
            var recursive = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

            if (this.expanded) {
                this.collapse(recursive);
            } else {
                this.expand(recursive);
            }
        }
    }, {
        key: 'select',
        value: function select() {
            var recursive = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

            var allow = this.tree.rc.onSelect ? this.tree.rc.onSelect(this.tree, this) : true;
            if (allow) {
                this.selected = true;
                if (!this.tree.rc.multiSelect) {
                    var _iteratorNormalCompletion4 = true;
                    var _didIteratorError4 = false;
                    var _iteratorError4 = undefined;

                    try {
                        for (var _iterator4 = this.tree.selected[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                            var n = _step4.value;

                            n.unselect(false);
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
                }
                this.tree.selected.add(this);
            }
            if (recursive && this.hasChildren) {
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    for (var _iterator5 = this.children[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var ch = _step5.value;
                        ch.select(recursive);
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
            }
            // If recursive, let caller call tree.selectedToList()
            if (!recursive) {
                this.tree.selectedToList();
            }
        }
    }, {
        key: 'unselect',
        value: function unselect() {
            var recursive = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

            var allow = this.tree.rc.onUnselect ? this.tree.rc.onUnselect(this.tree, this) : true;
            if (allow) {
                this.selected = false;
                this.tree.selected.delete(this);
            }
            if (recursive && this.hasChildren) {
                var _iteratorNormalCompletion6 = true;
                var _didIteratorError6 = false;
                var _iteratorError6 = undefined;

                try {
                    for (var _iterator6 = this.children[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                        var ch = _step6.value;
                        ch.unselect(recursive);
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
            }
            // If recursive, let caller call tree.selectedToList()
            if (!recursive) {
                this.tree.selectedToList();
            }
        }
    }, {
        key: 'toggleSelection',
        value: function toggleSelection() {
            var recursive = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

            if (this.selected) {
                this.unselect(recursive);
            } else {
                this.select(recursive);
            }
        }
    }, {
        key: 'expandCollapseButton',
        value: function expandCollapseButton() {
            if (this.expanded) {
                return this.tree.rc.collapseButton;
            }
            if (this.hasChildren === undefined) {
                return this.tree.rc.mayExpandButton;
            }
            if (this.hasChildren) {
                return this.tree.rc.expandButton;
            }
            return this.tree.rc.blankButton;
        }
    }, {
        key: 'filterChildren',
        value: function filterChildren() {
            this._filteredChildren.length = 0;
            if (this._children) {
                if (this.tree.matches === null) {
                    var _iteratorNormalCompletion7 = true;
                    var _didIteratorError7 = false;
                    var _iteratorError7 = undefined;

                    try {
                        for (var _iterator7 = this._children[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                            var node = _step7.value;

                            this._filteredChildren.push(node);
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
                } else {
                    var _iteratorNormalCompletion8 = true;
                    var _didIteratorError8 = false;
                    var _iteratorError8 = undefined;

                    try {
                        for (var _iterator8 = this._children[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                            var node = _step8.value;

                            if (this.tree.matches.has(node)) {
                                this._filteredChildren.push(node);
                            }
                            node.filterChildren();
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
                }
            }
        }
    }, {
        key: 'setChildNodes',
        value: function setChildNodes(children) {
            this._children = children;
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                for (var _iterator9 = children[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    var ch = _step9.value;

                    ch.setParentNode(this);
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
        key: 'setParentNode',
        value: function setParentNode(n) {
            this._parent = n;
        }
    }, {
        key: 'id',
        get: function get() {
            if (this._id === undefined) {
                // Node ID is provided
                this._id = this.data.__nodeId__;
                if (this._id === undefined) {
                    // Not provided, so construct it ourselves
                    this._id = this.tree.idGen(this);
                }
                this._id = '' + this._id;
            }
            return this._id;
        }
    }, {
        key: 'type',
        get: function get() {
            if (this._type === undefined) {
                this._type = this.data.__type__;
            }
            return this._type;
        }
    }, {
        key: 'text',
        get: function get() {
            if (_angular2.default.isFunction(this.data.text)) {
                return this.data.text(this.data);
            } else {
                return this.data.text;
            }
        }
    }, {
        key: 'hasChildren',
        get: function get() {
            return this._filteredChildren.length > 0;
        }
    }, {
        key: 'children',
        get: function get() {
            return this._filteredChildren;
        }
    }, {
        key: 'parent',
        get: function get() {
            return this._parent;
        }
    }]);

    return Node;
}();

exports.Node = Node;
exports.dataToNodes = dataToNodes;
//# sourceMappingURL=Node.js.map
