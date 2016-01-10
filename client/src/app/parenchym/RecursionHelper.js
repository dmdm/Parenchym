/**
 * Source:
 * http://stackoverflow.com/questions/14430655/recursion-in-angular-directives
 */

import angular from 'angular';

class RecursionHelper {
    constructor($compile) {
        this.$compile = $compile;
    }

    compile(element, link) {
        // Normalize the link parameter
        if (angular.isFunction(link)) {
            link = {post: link};
        }

        // Break the recursion loop by removing the contents
        let contents = element.contents().remove();
        let compiledContents;
        let self = this;
        return {
            pre: (link && link.pre) ? link.pre : null,
            /**
             * Compiles and re-adds the contents
             */
            post: function (scope, element) {
                // Compile the contents
                if (!compiledContents) {
                    compiledContents = self.$compile(contents);
                }
                // Re-add the compiled contents to the element
                compiledContents(
                    scope, function (clone) {
                        element.append(clone);
                    }
                );

                // Call the post-linking function, if any
                if (link && link.post) {
                    link.post.apply(null, arguments);
                }
            }
        };
    }

    static serviceFactory($compile) {
        return new RecursionHelper($compile);
    }
}

RecursionHelper.serviceFactory.$inject = ['$compile'];

export default RecursionHelper;
