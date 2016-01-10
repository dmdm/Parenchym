// Source: http://stackoverflow.com/a/32749533

class ExtendableError extends Error {
    constructor(message) {
        super(message);
        this.name    = this.constructor.name;
        this.message = message;
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
        this.stack = (new Error(message)).stack;
    }
}

export default ExtendableError;
