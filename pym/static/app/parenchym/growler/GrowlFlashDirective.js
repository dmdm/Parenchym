'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Directive growl-flash
 *
 * Growls flash messages the server had included in the page on first load.
 *
 * The directive is an HTML comment and its expression a JSON list of hashes,
 * each hash defines a message: ``{title: "my title", text: "my text",
 * kind: "error"}``.
 *
 * Allowed kinds are "error", "success", "info", "warning".
 *
 * Usage:
 *
 *     <!-- directive: pym-growl-flash ${mq_json|n} -->
 *
 */

var GrowlFlashDirective = function () {
    function GrowlFlashDirective(growler) {
        _classCallCheck(this, GrowlFlashDirective);

        this.restrict = 'M';
        this.template = '';
        this.scope = {};
        this._growler = growler;
    }

    // Must use compile(), because link() does not have access to 'this'.


    _createClass(GrowlFlashDirective, [{
        key: 'compile',
        value: function compile(elem, attrs) {
            var messages = JSON.parse(attrs.pymGrowlFlash);
            if (messages) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = messages[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var m = _step.value;

                        this._growler.growl(m);
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
        }
    }], [{
        key: 'directiveFactory',
        value: function directiveFactory(growler) {
            GrowlFlashDirective.instance = new GrowlFlashDirective(growler);
            return GrowlFlashDirective.instance;
        }
    }]);

    return GrowlFlashDirective;
}();

GrowlFlashDirective.directiveFactory.$inject = ['pym.growler.service'];

exports.default = GrowlFlashDirective;
//# sourceMappingURL=GrowlFlashDirective.js.map
