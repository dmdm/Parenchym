'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.toDateTime = exports.toTime = exports.toDate = exports.toBool = exports.toFloat = exports.toInt = undefined;

var _const = require('./const');

function toInt(s) {
    var r = parseInt(s, 10);
    if (isNaN(r)) {
        throw new TypeError('Value must be an integer number.');
    }
    return r;
}

function toFloat(s) {
    var r = parseFloat(s);
    if (isNaN(r)) {
        throw new TypeError('Value must be a floating point number.');
    }
    return r;
}

function toBool(s) {
    var falsy = [false, 0, '0', 'false', 'f', 'off'];
    var trusy = [true, 1, '1', 'true', 't', 'on'];
    if (typeof s === 'string') {
        s = s.toLowerCase();
    }
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = falsy[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var x = _step.value;

            if (s === x) {
                return false;
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

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = trusy[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var x = _step2.value;

            if (s === x) {
                return true;
            }
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

    throw new TypeError('Value must be a boolean (true, "t", "true", "on", "1", 1, false, "f", "false", "off", "0", 0).');
}

function toDate(s) {
    // Assume value is YYYY-MM-DD
    if (!_const.RE_ISO_DATE.test(s)) {
        throw new TypeError('Value must be a date like YYYY-MM-DD');
    }
    var x = new Date(s);
    if (isNaN(x.getDate())) {
        throw new TypeError('Value must be a date like YYYY-MM-DD');
    }
    return x;
}

function toTime(s) {
    // Assume value is HH:MM[:SS]
    if (!_const.RE_TIME.test(s)) {
        throw new TypeError('Value must be a time like HH:MM[:SS]');
    }
    var x = new Date('0000-01-01T' + s);
    if (isNaN(x.getTime())) {
        throw new TypeError('Value must be a time like HH:MM[:SS]');
    }
    return x;
}

function toDateTime(s) {
    // Assume value is "YYYY-MM-DD HH:MM[:SS]" --> "YYYY-MM-DDTHH:MM[:SS]"
    if (!_const.RE_ISO_DATE_TIME.test(s)) {
        throw new TypeError('Value must be a datetime like YYYY-MM-DD HH:MM[:SS]');
    }
    var x = new Date(s.replace(' ', 'T'));
    if (isNaN(x.getDate()) || isNaN(x.getTime())) {
        throw new TypeError('Value must be a datetime like YYYY-MM-DD HH:MM[:SS]');
    }
    return x;
}

exports.toInt = toInt;
exports.toFloat = toFloat;
exports.toBool = toBool;
exports.toDate = toDate;
exports.toTime = toTime;
exports.toDateTime = toDateTime;
//# sourceMappingURL=types.js.map
