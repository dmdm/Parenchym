import angular from 'angular';


function dataToNodes(tree, data) {
    let nn = [];
    for (let d of data) {
        let n = new Node(tree, d);
        nn.push(n);
        if (d.children) {
            n.setChildNodes(dataToNodes(tree, d.children));
        }
    }
    return nn;
}


class Node {
    constructor (tree, nodeData) {
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
    get id() {
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

    get type() {
        if (this._type === undefined) {
            this._type = this.data.__type__;
        }
        return this._type;
    }

    get text() {
        if (angular.isFunction(this.data.text)) {
            return this.data.text(this.data);
        }
        else {
            return this.data.text;
        }
    }

    get hasChildren() {
        return this._filteredChildren.length > 0;
    }

    get children() {
        return this._filteredChildren;
    }

    get parent() {
        return this._parent;
    }

    expand(recursive=false, maxDepth=99999) {
        let self = this;
        let _doExpand = function () {
            if (self.hasChildren) {
                let allow = self.tree.rc.onExpand
                    ? self.tree.rc.onExpand(self.tree, self)
                    : true;
                if (allow) {
                    self.expanded = true;
                    self.tree.expanded.add(self);
                }
                if (recursive && maxDepth > 0) {
                    for (let ch of self.children) {
                        ch.expand(recursive, maxDepth-1);
                    }
                }
            }
        };

        if (this.tree.rc.onLoadChildren && ! angular.isArray(this._children)) {
            this.tree.rc.onLoadChildren(this.tree, this)
                .then(childrenData => {
                    this.setChildNodes(dataToNodes(this.tree, childrenData));
                    _doExpand();
                });
        }
        else {
            _doExpand();
        }
    }

    collapse(recursive=false) {
        let allow = this.tree.rc.onCollapse
            ? this.tree.rc.onCollapse(this.tree, this)
            : true;
        if (allow) {
            this.expanded = false;
            this.tree.expanded.delete(this);
        }
        if (recursive && this.hasChildren) {
            for (let ch of this.children) { ch.collapse(recursive); }
        }
    }

    toggle(recursive=false) {
        if (this.expanded) {
            this.collapse(recursive);
        }
        else {
            this.expand(recursive);
        }
    }

    select(recursive=false) {
        let allow = this.tree.rc.onSelect
            ? this.tree.rc.onSelect(this.tree, this)
            : true;
        if (allow) {
            this.selected = true;
            if (! this.tree.rc.multiSelect) {
                for (let n of this.tree.selected) {
                    n.unselect(false);
                }
            }
            this.tree.selected.add(this);
        }
        if (recursive && this.hasChildren) {
            for (let ch of this.children) { ch.select(recursive); }
        }
        // If recursive, let caller call tree.selectedToList()
        if (! recursive) {
            this.tree.selectedToList();
        }
    }

    unselect(recursive=false) {
        let allow = this.tree.rc.onUnselect
            ? this.tree.rc.onUnselect(this.tree, this)
            : true;
        if (allow) {
            this.selected = false;
            this.tree.selected.delete(this);
        }
        if (recursive && this.hasChildren) {
            for (let ch of this.children) { ch.unselect(recursive); }
        }
        // If recursive, let caller call tree.selectedToList()
        if (! recursive) {
            this.tree.selectedToList();
        }
    }

    toggleSelection(recursive=false) {
        if (this.selected) {
            this.unselect(recursive);
        }
        else {
            this.select(recursive);
        }
    }

    expandCollapseButton() {
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

    filterChildren() {
        this._filteredChildren.length = 0;
        if (this._children) {
            if (this.tree.matches === null) {
                for (let node of this._children) {
                    this._filteredChildren.push(node);
                    node.filterChildren();
                }
            }
            else {
                for (let node of this._children) {
                    if (this.tree.matches.has(node)) {
                        this._filteredChildren.push(node);
                    }
                    node.filterChildren();
                }
            }
        }
    }

    setChildNodes(children) {
        this._children = children;
        for (let ch of children) {
            ch.setParentNode(this);
        }
    }

    setParentNode(n) {
        this._parent = n;
    }
}


export { Node, dataToNodes };
