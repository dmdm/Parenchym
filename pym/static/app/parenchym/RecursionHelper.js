'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * Source:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * http://stackoverflow.com/questions/14430655/recursion-in-angular-directives
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RecursionHelper = function () {
    function RecursionHelper($compile) {
        _classCallCheck(this, RecursionHelper);

        this.$compile = $compile;
    }

    _createClass(RecursionHelper, [{
        key: 'compile',
        value: function compile(element, link) {
            // Normalize the link parameter
            if (_angular2.default.isFunction(link)) {
                link = { post: link };
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents = undefined;
            var self = this;
            return {
                pre: link && link.pre ? link.pre : null,
                /**
                 * Compiles and re-adds the contents
                 */
                post: function post(scope, element) {
                    // Compile the contents
                    if (!compiledContents) {
                        compiledContents = self.$compile(contents);
                    }
                    // Re-add the compiled contents to the element
                    compiledContents(scope, function (clone) {
                        element.append(clone);
                    });

                    // Call the post-linking function, if any
                    if (link && link.post) {
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    }], [{
        key: 'serviceFactory',
        value: function serviceFactory($compile) {
            return new RecursionHelper($compile);
        }
    }]);

    return RecursionHelper;
}();

RecursionHelper.serviceFactory.$inject = ['$compile'];

exports.default = RecursionHelper;
//# sourceMappingURL=RecursionHelper.js.map
