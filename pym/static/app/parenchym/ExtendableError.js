"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Source: http://stackoverflow.com/a/32749533

var ExtendableError = function (_Error) {
    _inherits(ExtendableError, _Error);

    function ExtendableError(message) {
        _classCallCheck(this, ExtendableError);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ExtendableError).call(this, message));

        _this.name = _this.constructor.name;
        _this.message = message;
        //Error.captureStackTrace(this, this.constructor.name);
        //if (typeof Error.captureStackTrace === 'function') {
        //    Error.captureStackTrace(
        //        this,
        //        this.constructor.name
        //    );
        //}
        //else {
        //    this.stack = (new Error(message)).stack;
        //}
        _this.stack = new Error(message).stack;
        return _this;
    }

    return ExtendableError;
}(Error);

exports.default = ExtendableError;
//# sourceMappingURL=ExtendableError.js.map
