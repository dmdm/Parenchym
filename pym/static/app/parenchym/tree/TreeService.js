'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Tree = require('./Tree');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * TreeService - a simple service to hold instances of trees.
 *
 * These instances, i.e. their data and state, can then be shared between
 * controllers, ui-router states etc.
 *
 * Directive pym-tree creates/fetches instances here.
 */

var TreeService = function () {
    function TreeService() {
        _classCallCheck(this, TreeService);

        this.trees = new Map();
    }

    _createClass(TreeService, [{
        key: 'getTree',
        value: function getTree(id, rc, data) {
            if (!this.trees.has(id)) {
                this.trees.set(id, new _Tree.Tree(rc, data));
            }
            return this.trees.get(id);
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory() {
            for (var _len = arguments.length, all = Array(_len), _key = 0; _key < _len; _key++) {
                all[_key] = arguments[_key];
            }

            return new (Function.prototype.bind.apply(TreeService, [null].concat(all)))();
        }
    }]);

    return TreeService;
}();

TreeService.serviceFactory.$inject = [];

exports.default = TreeService;
//# sourceMappingURL=TreeService.js.map
