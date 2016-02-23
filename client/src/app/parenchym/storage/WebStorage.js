class WebStorage {

    constructor(storageType, rc, $window) {
        this._storageType = storageType;
        this._rc = rc;
        this._$window = $window;

        this.prefix = 'pym';

        this._checkBrowserSupport();
        this._storage = $window[storageType];
    }

    get(key) {
        return this._storage.getItem(this._buildKey(key));
    }

    getObject(key) {
        let v = this.get(key);
        return this._rc.serializer.parse(v);
    }

    set(key, v) {
        this._storage.setItem(this._buildKey(key), v);
    }

    setObject(key, o) {
        let v = this._rc.serializer.stringify(o);
        this.set(key, v);
    }

    remove(key) {
        this._storage.remove(this._buildKey(key));
    }

    clear() {
        this._storage.clear();
    }

    length() {
        return this._storage.length;
    }

    _buildKey(key) {
        let kk = [];
        if (this.prefix) {
            kk.push(this.prefix);
        }
        if (this._rc.usePath) {
            kk.push(this._rc.path);
        }
        kk.push(key);
        if (this._rc.useUid) {
            kk.push(this._rc.uid);
        }
        return kk.join(this._rc.sep);
    }

    _checkBrowserSupport() {
        let supported;

        // Lifted from: https://github.com/gsklee/ngStorage/blob/master/ngStorage.js

        // Some installations of IE, for an unknown reason, throw "SCRIPT5: Error: Access is denied"
        // when accessing window.webStorage. This happens before you try to do anything with it. Catch
        // that error and allow execution to continue.

        // fix 'SecurityError: DOM Exception 18' exception in Desktop Safari, Mobile Safari
        // when "Block cookies": "Always block" is turned on
        try {
            supported = this._$window[this._storageType];
        }
        catch (err) {
            supported = false;
        }

        // When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage
        // is available, but trying to call .setItem throws an exception below:
        // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made to add something to storage that exceeded the quota."
        if (supported && this._storageType === 'localStorage') {
            var key = '__' + Math.round(Math.random() * 1e7);

            try {
                localStorage.setItem(key, key);
                localStorage.removeItem(key);
            }
            catch (err) {
                supported = false;
            }
        }
        if (! supported) {
            throw new Error(`Storage '${this._storageType}' is not supported in this browser.`);
        }
    }
}


export { WebStorage };
