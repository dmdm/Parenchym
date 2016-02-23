import { Tree } from './Tree';


/**
 * TreeService - a simple service to hold instances of trees.
 *
 * These instances, i.e. their data and state, can then be shared between
 * controllers, ui-router states etc.
 *
 * Directive pym-tree creates/fetches instances here.
 */
class TreeService {
    constructor() {
        this.trees = new Map();
    }

    getTree(id, rc, data) {
        if (! this.trees.has(id)) {
            this.trees.set(id, new Tree(rc, data));
        }
        return this.trees.get(id);
    }

    static serviceFactory(...all) {
        return new TreeService(...all);
    }
}

TreeService.serviceFactory.$inject = [];


export default TreeService;
