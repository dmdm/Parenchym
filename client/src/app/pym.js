/*
 *      KEEP FOR LEGACY CODE
 *      MODER PARENCHYM DOES NOT NEED IT AND DOES NOT LOAD IT
 *
 *      CAVEAT: init_growl() may interfere with PymApp's growler config.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'pnotify'], factory);
        //define(['jquery'], factory);
    } else {
        // Browser globals
        root.PYM = factory(root.$);
    }
}(this, function ($) {
    /**
     * Private
     */
    var rc
        ;

    /**
     * Public API
     */
    var my = {};

    my.csrf_token = '';
    my.base_url = '';

    my.init = function (rc) {
        this.rc = rc;
        this.csrf_token = rc['csrf_token'];
        this.base_url = rc['base_url'];
        //my.init_growl();
        my.init_pym(rc);
        //my.init_ajax();
    };

    my.init_growl = function () {
        PNotify.prototype.options.opacity = 0.9;
        PNotify.prototype.options.styling = 'fontawesome';
    };

    my.init_pym = function () {
        // Enable hover css for buttons
        $('button.ui-state-default').hover(
            function () {
                $(this).addClass('ui-state-hover');
            },
            function () {
                $(this).removeClass('ui-state-hover');
            }
        );
    };

    my.init_ajax = function () {
        var that = this;
        $.ajaxSetup({
            headers: {
                'X-XSRF-Token': that.csrf_token
            }
        });
        $('body').ajaxError(function (evt, jqXHR, ajaxSettings, thrownError) {
            var resp = {};
            resp.kind = 'error';
            if (jqXHR.responseText) {
                var s = jqXHR.responseText.replace(/\n/g, '#')
                    .replace(/^.*<h1>/gi, '')
                    .replace(/<\/?[^>]+>/gi, '')
                    .replace(/#{2,}/g, '#')
                    .replace(/#+\s*$/g, '')
                    .replace(/#/g, '<br />');
                resp.text = s;
            }
            else {
                resp.text = jqXHR.status + ' ' + jqXHR.statusText;
            }
            resp.title = 'Ajax Error';
            resp.insert_brs = false;
            that.growl(resp);
        });
    };

    /**
     * Sort select list by text
     *
     * http://sebastienayotte.wordpress.com/2009/08/04/sorting-drop-down-list-with-jquery/
     */
    my.sort_select_by_text = function (e) {
        $(e).html($("option", $(e)).sort(function (a, b) {
            return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
        }));
    };

    my.parse_get_param = function () {
        var search = window.location.search.match(/^\?([^#]+)/)[1]
            , param = search.split(/\&/)
            , i
            , maxi = param.length
            , kv
            , data = {}
            ;
        for (i = 0; i < maxi; i++) {
            kv = param[i].split(/=/);
            data[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
        }
        return data;
    };

    /**
     * Cookie object
     *
     * Code inspired by http://www.quirksmode.org/js/cookies.html
     */
    my.cookie = {
        write: function (name, value, days, path) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var expires = '; expires=' + date.toGMTString();
            }
            else var expires = '';
            if (! path) path = window.location.pathname
                .replace(/\/[^/]*$/, '/');
            document.cookie = name + '=' + value + expires
                + '; path=' + path;
        }

        , read: function (name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0)
                    return c.substring(nameEQ.length, c.length);
            }
            return null;
        }

        , delete: function (name) {
            PYM.cookie.write(name, '', -1);
        }
    };

    my.growl = function(msg) {
        if (! msg.kind) msg.kind = 'notice';
        if (! msg.title) msg.title = msg.kind;
        // Put timestamp into title
        // We get time as UTC
        var dt;
        if (msg.time) {
            dt = new Date(Date.UTC(msg.time[0], msg.time[1], msg.time[2], msg.time[3],
                msg.time[4], msg.time[5]));
        }
        else {
            dt = new Date();
        }
        msg.title = msg.title
            + '<br><span style="font-weight:normal;font-size:xx-small;">'
            + dt.toString()
            + '</span>';
        // Setup type, icon and persistance according to kind
        var icon;
        switch (msg.kind[0]) {
            case 'n':
                msg.type = 'notice';
                icon = 'fa ui-icon-comment';
                break;
            case 'i':
                msg.type = 'info';
                icon = 'fa ui-icon-info';
                break;
            case 'w':
                msg.type = 'warning';
                icon = 'fa fa-exclamation';
                break;
            case 'e':
                icon = 'fa  fa-exclamation-triangle';
                msg.type = 'error';
                break;
            case 'f':
                icon = 'fa fa-exclamation-triangle';
                msg.type = 'error';
                break;
            case 's':
                icon = 'fa fa-check';
                msg.type = 'success';
                break;
        }
        if (! msg.icon) msg.icon = icon;
        msg.hide = ! (msg.kind[0] == 'e' || msg.kind[0] == 'f');
		msg.buttons = {
            closer: true,
            sticker: true
        };
        msg.history = { menu: true };
        // Show message
        new PNotify(msg);
    };

    my.growl_ajax_resp = function (resp) {
        var i, imax = resp.msgs.length;
        for (i = 0; i < imax; i++) {
            this.growl(resp.msgs[i]);
        }
        if (imax < 1) {
            if (resp.ok) {
                this.growl({kind: 'success', text: 'Ok'});
            }
            else {
                this.growl({kind: 'warning', text: 'Unspecified error occurred'});
            }
        }
    };

    /**
     * Binds given method to given object.
     *
     * By means of a wrapper, ensures that ``method`` is always bound to
     * ``object`` regardless of its calling environment.
     * Iow, inside ``method``, ``this`` always points to ``object``.
     *
     * See http://alistapart.com/article/getoutbindingsituations
     *
     * @param {object}
     * @param {method}
     * @returns {Function}
     */
    my.createBoundedWrapper = function (object, method) {
        console.log('binding to', object);
        return function() {
            return method.apply(object, arguments);
        };
    };

    return my;
}));

