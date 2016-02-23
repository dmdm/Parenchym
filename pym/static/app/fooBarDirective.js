'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FooBarDirective = function () {
    function FooBarDirective() {
        _classCallCheck(this, FooBarDirective);

        this.require = 'ngModel'; //Properties of DDO have to be attached to the instance through this reference
        this.restrict = 'E';
        this.template = '<h2>Foo Bar Baz</h2>';
    }

    //link(scope, elem, attrs) {
    //}

    _createClass(FooBarDirective, null, [{
        key: 'directiveFactory',
        value: function directiveFactory() {
            FooBarDirective.instance = new FooBarDirective();
            return FooBarDirective.instance;
        }
    }]);

    return FooBarDirective;
}();

FooBarDirective.directiveFactory.$inject = [];

exports.FooBarDirective = FooBarDirective;
//# sourceMappingURL=fooBarDirective.js.map
