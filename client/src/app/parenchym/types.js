import { RE_ISO_DATE, RE_TIME, RE_ISO_DATE_TIME } from './const';


function toInt(s) {
    let r = parseInt(s, 10);
    if (isNaN(r)) {
        throw new TypeError('Value must be an integer number.');
    }
    return r;
}


function toFloat(s) {
    let r = parseFloat(s);
    if (isNaN(r)) {
        throw new TypeError('Value must be a floating point number.');
    }
    return r;
}


function toBool(s) {
    let falsy = [false, 0, '0', 'false', 'f', 'off'];
    let trusy = [true, 1, '1', 'true', 't', 'on'];
    if (typeof s === 'string') {
        s = s.toLowerCase();
    }
    for (let x of falsy) {
        if (s === x) { return false; }
    }
    for (let x of trusy) {
        if (s === x) { return true; }
    }
    throw new TypeError('Value must be a boolean (true, "t", "true", "on", "1", 1, false, "f", "false", "off", "0", 0).');
}


function toDate(s) {
    // Assume value is YYYY-MM-DD
    if (!RE_ISO_DATE.test(s)) {
        throw new TypeError('Value must be a date like YYYY-MM-DD');
    }
    let x = new Date(s);
    if (isNaN(x.getDate())) {
        throw new TypeError('Value must be a date like YYYY-MM-DD');
    }
    return x;
}


function toTime(s) {
    // Assume value is HH:MM[:SS]
    if (!RE_TIME.test(s)) {
        throw new TypeError('Value must be a time like HH:MM[:SS]');
    }
    let x = new Date('0000-01-01T' + s);
    if (isNaN(x.getTime())) {
        throw new TypeError('Value must be a time like HH:MM[:SS]');
    }
    return x;
}


function toDateTime(s) {
    // Assume value is "YYYY-MM-DD HH:MM[:SS]" --> "YYYY-MM-DDTHH:MM[:SS]"
    if (!RE_ISO_DATE_TIME.test(s)) {
        throw new TypeError('Value must be a datetime like YYYY-MM-DD HH:MM[:SS]');
    }
    let x = new Date(s.replace(' ', 'T'));
    if (isNaN(x.getDate()) || isNaN(x.getTime())) {
        throw new TypeError('Value must be a datetime like YYYY-MM-DD HH:MM[:SS]');
    }
    return x;
}


export { toInt, toFloat, toBool, toDate, toTime, toDateTime };
