// Avoid `console` errors in browsers that lack a console.
if (!(window.console && console.log)) {
    (function() {
        var noop = function() {};
        var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
        var length = methods.length;
        var console = window.console = {};
        while (length--) {
            console[methods[length]] = noop;
        }
    }());
}

// Place any jQuery/helper plugins in here.

/* Modernizr 2.6.2 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-shiv-mq-cssclasses-teststyles-hasevent-load
 */
;window.Modernizr=function(a,b,c){function x(a){j.cssText=a}function y(a,b){return x(prefixes.join(a+";")+(b||""))}function z(a,b){return typeof a===b}function A(a,b){return!!~(""+a).indexOf(b)}function B(a,b,d){for(var e in a){var f=b[a[e]];if(f!==c)return d===!1?a[e]:z(f,"function")?f.bind(d||b):f}return!1}var d="2.6.2",e={},f=!0,g=b.documentElement,h="modernizr",i=b.createElement(h),j=i.style,k,l={}.toString,m={},n={},o={},p=[],q=p.slice,r,s=function(a,c,d,e){var f,i,j,k,l=b.createElement("div"),m=b.body,n=m||b.createElement("body");if(parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:h+(d+1),l.appendChild(j);return f=["&#173;",'<style id="s',h,'">',a,"</style>"].join(""),l.id=h,(m?l:n).innerHTML+=f,n.appendChild(l),m||(n.style.background="",n.style.overflow="hidden",k=g.style.overflow,g.style.overflow="hidden",g.appendChild(n)),i=c(l,a),m?l.parentNode.removeChild(l):(n.parentNode.removeChild(n),g.style.overflow=k),!!i},t=function(b){var c=a.matchMedia||a.msMatchMedia;if(c)return c(b).matches;var d;return s("@media "+b+" { #"+h+" { position: absolute; } }",function(b){d=(a.getComputedStyle?getComputedStyle(b,null):b.currentStyle)["position"]=="absolute"}),d},u=function(){function d(d,e){e=e||b.createElement(a[d]||"div"),d="on"+d;var f=d in e;return f||(e.setAttribute||(e=b.createElement("div")),e.setAttribute&&e.removeAttribute&&(e.setAttribute(d,""),f=z(e[d],"function"),z(e[d],"undefined")||(e[d]=c),e.removeAttribute(d))),e=null,f}var a={select:"input",change:"input",submit:"form",reset:"form",error:"img",load:"img",abort:"img"};return d}(),v={}.hasOwnProperty,w;!z(v,"undefined")&&!z(v.call,"undefined")?w=function(a,b){return v.call(a,b)}:w=function(a,b){return b in a&&z(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=q.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(q.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(q.call(arguments)))};return e});for(var C in m)w(m,C)&&(r=C.toLowerCase(),e[r]=m[C](),p.push((e[r]?"":"no-")+r));return e.addTest=function(a,b){if(typeof a=="object")for(var d in a)w(a,d)&&e.addTest(d,a[d]);else{a=a.toLowerCase();if(e[a]!==c)return e;b=typeof b=="function"?b():b,typeof f!="undefined"&&f&&(g.className+=" "+(b?"":"no-")+a),e[a]=b}return e},x(""),i=k=null,function(a,b){function k(a,b){var c=a.createElement("p"),d=a.getElementsByTagName("head")[0]||a.documentElement;return c.innerHTML="x<style>"+b+"</style>",d.insertBefore(c.lastChild,d.firstChild)}function l(){var a=r.elements;return typeof a=="string"?a.split(" "):a}function m(a){var b=i[a[g]];return b||(b={},h++,a[g]=h,i[h]=b),b}function n(a,c,f){c||(c=b);if(j)return c.createElement(a);f||(f=m(c));var g;return f.cache[a]?g=f.cache[a].cloneNode():e.test(a)?g=(f.cache[a]=f.createElem(a)).cloneNode():g=f.createElem(a),g.canHaveChildren&&!d.test(a)?f.frag.appendChild(g):g}function o(a,c){a||(a=b);if(j)return a.createDocumentFragment();c=c||m(a);var d=c.frag.cloneNode(),e=0,f=l(),g=f.length;for(;e<g;e++)d.createElement(f[e]);return d}function p(a,b){b.cache||(b.cache={},b.createElem=a.createElement,b.createFrag=a.createDocumentFragment,b.frag=b.createFrag()),a.createElement=function(c){return r.shivMethods?n(c,a,b):b.createElem(c)},a.createDocumentFragment=Function("h,f","return function(){var n=f.cloneNode(),c=n.createElement;h.shivMethods&&("+l().join().replace(/\w+/g,function(a){return b.createElem(a),b.frag.createElement(a),'c("'+a+'")'})+");return n}")(r,b.frag)}function q(a){a||(a=b);var c=m(a);return r.shivCSS&&!f&&!c.hasCSS&&(c.hasCSS=!!k(a,"article,aside,figcaption,figure,footer,header,hgroup,nav,section{display:block}mark{background:#FF0;color:#000}")),j||p(a,c),a}var c=a.html5||{},d=/^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i,e=/^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i,f,g="_html5shiv",h=0,i={},j;(function(){try{var a=b.createElement("a");a.innerHTML="<xyz></xyz>",f="hidden"in a,j=a.childNodes.length==1||function(){b.createElement("a");var a=b.createDocumentFragment();return typeof a.cloneNode=="undefined"||typeof a.createDocumentFragment=="undefined"||typeof a.createElement=="undefined"}()}catch(c){f=!0,j=!0}})();var r={elements:c.elements||"abbr article aside audio bdi canvas data datalist details figcaption figure footer header hgroup mark meter nav output progress section summary time video",shivCSS:c.shivCSS!==!1,supportsUnknownElements:j,shivMethods:c.shivMethods!==!1,type:"default",shivDocument:q,createElement:n,createDocumentFragment:o};a.html5=r,q(b)}(this,b),e._version=d,e.mq=t,e.hasEvent=u,e.testStyles=s,g.className=g.className.replace(/(^|\s)no-js(\s|$)/,"$1$2")+(f?" js "+p.join(" "):""),e}(this,this.document),function(a,b,c){function d(a){return"[object Function]"==o.call(a)}function e(a){return"string"==typeof a}function f(){}function g(a){return!a||"loaded"==a||"complete"==a||"uninitialized"==a}function h(){var a=p.shift();q=1,a?a.t?m(function(){("c"==a.t?B.injectCss:B.injectJs)(a.s,0,a.a,a.x,a.e,1)},0):(a(),h()):q=0}function i(a,c,d,e,f,i,j){function k(b){if(!o&&g(l.readyState)&&(u.r=o=1,!q&&h(),l.onload=l.onreadystatechange=null,b)){"img"!=a&&m(function(){t.removeChild(l)},50);for(var d in y[c])y[c].hasOwnProperty(d)&&y[c][d].onload()}}var j=j||B.errorTimeout,l=b.createElement(a),o=0,r=0,u={t:d,s:c,e:f,a:i,x:j};1===y[c]&&(r=1,y[c]=[]),"object"==a?l.data=c:(l.src=c,l.type=a),l.width=l.height="0",l.onerror=l.onload=l.onreadystatechange=function(){k.call(this,r)},p.splice(e,0,u),"img"!=a&&(r||2===y[c]?(t.insertBefore(l,s?null:n),m(k,j)):y[c].push(l))}function j(a,b,c,d,f){return q=0,b=b||"j",e(a)?i("c"==b?v:u,a,b,this.i++,c,d,f):(p.splice(this.i++,0,a),1==p.length&&h()),this}function k(){var a=B;return a.loader={load:j,i:0},a}var l=b.documentElement,m=a.setTimeout,n=b.getElementsByTagName("script")[0],o={}.toString,p=[],q=0,r="MozAppearance"in l.style,s=r&&!!b.createRange().compareNode,t=s?l:n.parentNode,l=a.opera&&"[object Opera]"==o.call(a.opera),l=!!b.attachEvent&&!l,u=r?"object":l?"script":"img",v=l?"script":u,w=Array.isArray||function(a){return"[object Array]"==o.call(a)},x=[],y={},z={timeout:function(a,b){return b.length&&(a.timeout=b[0]),a}},A,B;B=function(a){function b(a){var a=a.split("!"),b=x.length,c=a.pop(),d=a.length,c={url:c,origUrl:c,prefixes:a},e,f,g;for(f=0;f<d;f++)g=a[f].split("="),(e=z[g.shift()])&&(c=e(c,g));for(f=0;f<b;f++)c=x[f](c);return c}function g(a,e,f,g,h){var i=b(a),j=i.autoCallback;i.url.split(".").pop().split("?").shift(),i.bypass||(e&&(e=d(e)?e:e[a]||e[g]||e[a.split("/").pop().split("?")[0]]),i.instead?i.instead(a,e,f,g,h):(y[i.url]?i.noexec=!0:y[i.url]=1,f.load(i.url,i.forceCSS||!i.forceJS&&"css"==i.url.split(".").pop().split("?").shift()?"c":c,i.noexec,i.attrs,i.timeout),(d(e)||d(j))&&f.load(function(){k(),e&&e(i.origUrl,h,g),j&&j(i.origUrl,h,g),y[i.url]=2})))}function h(a,b){function c(a,c){if(a){if(e(a))c||(j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}),g(a,j,b,0,h);else if(Object(a)===a)for(n in m=function(){var b=0,c;for(c in a)a.hasOwnProperty(c)&&b++;return b}(),a)a.hasOwnProperty(n)&&(!c&&!--m&&(d(j)?j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}:j[n]=function(a){return function(){var b=[].slice.call(arguments);a&&a.apply(this,b),l()}}(k[n])),g(a[n],j,b,n,h))}else!c&&l()}var h=!!a.test,i=a.load||a.both,j=a.callback||f,k=j,l=a.complete||f,m,n;c(h?a.yep:a.nope,!!i),i&&c(i)}var i,j,l=this.yepnope.loader;if(e(a))g(a,0,l,0);else if(w(a))for(i=0;i<a.length;i++)j=a[i],e(j)?g(j,0,l,0):w(j)?B(j):Object(j)===j&&h(j,l);else Object(a)===a&&h(a,l)},B.addPrefix=function(a,b){z[a]=b},B.addFilter=function(a){x.push(a)},B.errorTimeout=1e4,null==b.readyState&&b.addEventListener&&(b.readyState="loading",b.addEventListener("DOMContentLoaded",A=function(){b.removeEventListener("DOMContentLoaded",A,0),b.readyState="complete"},0)),a.yepnope=k(),a.yepnope.executeStack=h,a.yepnope.injectJs=function(a,c,d,e,i,j){var k=b.createElement("script"),l,o,e=e||B.errorTimeout;k.src=a;for(o in d)k.setAttribute(o,d[o]);c=j?h:c||f,k.onreadystatechange=k.onload=function(){!l&&g(k.readyState)&&(l=1,c(),k.onload=k.onreadystatechange=null)},m(function(){l||(l=1,c(1))},e),i?k.onload():n.parentNode.insertBefore(k,n)},a.yepnope.injectCss=function(a,c,d,e,g,i){var e=b.createElement("link"),j,c=i?h:c||f;e.href=a,e.rel="stylesheet",e.type="text/css";for(j in d)e.setAttribute(j,d[j]);g||(n.parentNode.insertBefore(e,n),m(c,0))}}(this,document),Modernizr.load=function(){yepnope.apply(window,[].slice.call(arguments,0))};


/**
 * The following two lifted from http://javascript.about.com/library/blbusdayadd.htm
 */

Number.prototype.mod = function (n) {
    return ((this % n) + n) % n;
};

Date.prototype.addBusinessDays = function (dd) {
    var wks = Math.floor(dd / 5);
    var dys = dd.mod(5);
    var dy = this.getDay();
    if (dy === 6 && dys > -1) {
        if (dys === 0) {
            dys -= 2;
            dy += 2;
        }
        dys++;
        dy -= 6;
    }
    if (dy === 0 && dys < 1) {
        if (dys === 0) {
            dys += 2;
            dy -= 2;
        }
        dys--;
        dy += 6;
    }
    if (dy + dys > 5) dys += 2;
    if (dy + dys < 1) dys -= 2;
    this.setDate(this.getDate() + wks * 7 + dys);
    return this;
};

Date.prototype.diffDays = function (other) {
    return (other-this)/(1000*60*60*24);
};

Date.prototype.daysInMonth = function () {
    return new Date(this.getFullYear(), this.getMonth(), 0).getDate();
};

Date.prototype.addDays = function (days) {
    this.setDate(this.getDate() + days);
    return this;
};

String.prototype.format = function () {
    "use strict";

    var args = Array.prototype.slice.call(arguments);
    var i, imax, k;
    var s, re, re_empty;

    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function isDate(value) {
        return toString.call(value) === '[object Date]';
    }

    function isString(value) {return typeof value === 'string';}

    function isNumber(value) {return typeof value === 'number';}


    function formatArg(a) {
        void 0;
        if (isDate(a)) {
            return a.toISOString();
        }
        return a;
    }

    s = this;
    re_empty = new RegExp('\\{\\}');
    for (i=0, imax=args.length; i<imax; i++) {
        var arg = args[i];
        if (isObject(arg)) {
            for (k in arg) {
                re = new RegExp('\\{' + k + '\\}', 'g');
                s = s.replace(re, formatArg(arg[k]));
            }
        }
        else {
            s = s.replace(re_empty, formatArg(arg));
        }
    }
    return s;
};

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'pnotify', 'pnotify.buttons'], factory);
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
        my.init_growl();
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

    /*
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
    */

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
        return function() {
            return method.apply(object, arguments);
        };
    };

    return my;
}));


define(PYM_APP_REQUIREMENTS,
           // ng,      pym/pym
function (angular, PYM) {
    'use strict';

    var PymApp = angular.module('PymApp', PYM_APP_INJECTS);

    PymApp.constant('angularMomentConfig', {
        timezone: 'Europe/Berlin'
    });

    PymApp.config(
        [
                      '$httpProvider', '$provide', 'uiSelectConfig', '$compileProvider',
            function ( $httpProvider,   $provide,   uiSelectConfig,   $compileProvider) {
                /**
                 * Disable debug data
                 *
                 * Re-enable in a debug console with:
                 *
                 *     angular.reloadWithDebugInfo();
                 *
                 * See https://docs.angularjs.org/guide/production
                 */
                // WTF: Need debug info because of ui-tree: https://github.com/angular-ui-tree/angular-ui-tree/issues/403
                //$compileProvider.debugInfoEnabled(false);
                /**
                 * Intercept HTTP errors to growl
                 */
                $provide.factory('PymHttpErrorInterceptor',
                    [
                        '$q',
                        function ($q) {
                            return {
                                responseError: function (rejection) {
                                    PYM.growl({'kind': 'error', 'title': rejection.status, 'text': rejection.statusText});
                                    return $q.reject(rejection);
                                }
                            };
                        }
                    ]
                );
                $httpProvider.interceptors.push('PymHttpErrorInterceptor');
                /**
                 * Re-enable the XMLHttpRequest header
                 */
                $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
                /**
                 * Configure ui-select
                 */
                uiSelectConfig.theme = 'bootstrap';
            }
        ]
    );


    /**
     * @description Tools for ui-grid
     * @example
     *      <div class="pym-grid-footer">
     *          <div class="pym-grid-pagination">
     *              <pagination class="pagination pagination-sm"
     *                          total-items="BrowseGrid.pym.pager.totalItems"
     *                          items-per-page="BrowseGrid.pym.pager.pageSize"
     *                          ng-model="BrowseGrid.pym.pager.currentPage"
     *                          ng-change="BrowseGrid.pym.pager.changed()"
     *                          boundary-links="true"
     *                          previous-text="&lsaquo;" next-text="&rsaquo;"
     *                          first-text="&laquo;" last-text="&raquo;"
     *                          max-size="5"
     *                      >
     *              </pagination>
     *          </div>
     *          <div class="spacer"></div>
     *          <div class="pageSizeChooser">
     *              <select ng-model="BrowseGrid.pym.pager.pageSize"
     *                      ng-change="BrowseGrid.pym.pager.sizeChanged()"
     *                      ng-options="v for v in BrowseGrid.pym.pager.pageSizes"
     *                      class="form-control">
     *              </select>
     *          </div>
     *          <div class="spacer"></div>
     *          <div class="rowNumbers">{{(BrowseGrid.pym.pager.currentPage-1)*BrowseGrid.pym.pager.pageSize+1}}-{{(BrowseGrid.pym.pager.currentPage-1)*BrowseGrid.pym.pager.pageSize+BrowseGrid.pym.pager.loadedItems}} of {{BrowseGrid.pym.pager.totalItems}}</div>
     *          <div class="spinner"><pym-spinner state="BrowseGrid.pym.loading"></pym-spinner></div>
     *      </div>
     */
    PymApp.service('PymApp.GridTools',
                 ['$http', '$timeout', 'uiGridConstants',
        function ( $http,   $timeout,   uiGridConstants ) {

            // ===[ FILTER ]=======

            /**
             * @param gridDef
             * @param opts
             * @description Filter provides tools for external filtering.
             * Filter expects an object with the grid definition.
             * The gridDef must have
             *   - method ``loadItems()`` to load the items
             *   - property ``pym``, an object that gets filled with grid tool
             *     instances, e.g. ``pym.filter``.
             *
             * Public properties (set via opts):
             * - delay: Milliseconds to wait after last change before we call
             *          ``changed()``
             * - filterText: the filter criterion
             * - filterField: name of the field to filter
             *
             * Specify our property ``filterText`` as model of filter input field.
             *
             * Attach our method ``changed()`` as handler of the change
             * event of the filter text input field.
             * You may override this function; by default, we just call
             * gridDef's ``loadItems()`` and reset the current page to 1 if a
             * pager is present.
             *
             * @example
             *   $scope.BrowseGrid = {
             *      pym: {},
             *      loadItems: function (),
             *   };
             *   $scope.browseFilter = GridTools.attachFilter($scope.BrowseGrid, opts);
             *   $scope.BrowseGrid.loadItems();
             */
            var Filter = function Filter(gridDef, opts) {
                this.gridDef = gridDef;
                this.delay = 500;
                angular.extend(this, opts);
                this.filter = null;
                this.timer = null;
                this.activationState = 0;
                this.allowedOperators = [
                    '=', '<', '<=', '>', '>=', '!=',
                    '!', '~', '!~'
                ];
            };

            Filter.prototype.buildFilter = function (grid) {
                var self = this,
                    fil = [];
                angular.forEach(grid.columns, function (col) {
                    angular.forEach(col.filters, function (f) {
                        if (f.term) {
                            var op, t;
                            op = f.term[0] + f.term[1];
                            t = f.term.slice(2)
                            void 0;
                            if (self.allowedOperators.indexOf(op) < 0) {
                                op = f.term[0];
                                t = f.term.slice(1);
                                void 0;
                                if (self.allowedOperators.indexOf(op) < 0) {
                                    op = 'like';
                                    t = f.term;
                                }
                            }
                            if (op == '!') op = '!like';
                            fil.push([col.field, op, 'i', t]);
                        }
                    });
                });
                if (!fil) {
                    self.filter = null;
                }
                else {
                    self.filter = ['a', fil];
                }
                if (self.gridDef.pym.pager) {
                    self.gridDef.pym.pager.currentPage = 1;
                }
                self.gridDef.loadItems();
            }

            Filter.prototype.changed = function (grid) {
                var self = this;
                if (this.timer) $timeout.cancel(this.timer);
                this.timer = $timeout(function () {
                    self.buildFilter.call(self, grid);
                }, this.delay);
            };

            Filter.prototype.clear = function () {
                // We might get called before gridApi was published.
                if (! this.gridDef.api) return;
                angular.forEach(this.gridDef.api.grid.columns, function (col) {
                    angular.forEach(col.filters, function (f) {
                        f.term = null;
                    });
                });
                this.filter = null;
            };

            Filter.prototype.toggle = function () {
                void 0;
                var self = this;
                if (self.activationState == 0) {
                    self.activationState = 1;
                }
                else if (self.activationState == 1) {
                    self.activationState = 2;
                }
                else if (self.activationState == 2) {
                    self.activationState = 0;
                }
                self.gridDef.api.core.refresh();
                void 0;
            }

            /**
             * @ngdoc method
             * @methodOf Filter
             * @name applyParams
             * @description Applies current filter to given object of
             *     query parameters. Key is ``fil`` and value is JSON-stringified
             *     filter, or null. Given object is changed in-place.
             * @param {object} params The object of query parameters.
             */
            Filter.prototype.applyParams = function (params) {
                if (this.filter && this.filter[1]) {
                    params.fil = JSON.stringify(this.filter);
                }
                else {
                    params.fil = null;
                }
                void 0;
            };

            this.attachFilter = function (gridDef, opts) {
                var filter = new Filter(gridDef, opts);
                gridDef.pym.filter = filter;
                return filter;
            };

            // ===[ PAGER ]=======

            /**
             * @param gridDef
             * @param opts
             * @description Pager provides tools for external paging.
             * Pager expects an object with the grid definition.
             * The gridDef must have
             *   - method ``loadItems()`` to load the items
             *   - property ``pym``, an object that gets filled with grid tool
             *     instances, e.g. ``pym.sorter``.
             *
             * Public properties (set via opts):
             *   - currentPage; starts with 1
             *   - totalItems; number of total items in result set
             *   - loadedItems; number of items loaded, might be smaller than
             *                  pageSize, e.g. on last page
             *   - pageSize; default 100
             *   - pageSizes: List of allowed page sizes, e.g. for a select box
             *
             * Attach our method ``changed()`` as handler of directive's change
             * event. You may override this function; by default, we just call
             * gridDef's ``loadItems()``.
             *
             * @example
             *   $scope.BrowseGrid = {
             *      pym: {},
             *      loadItems: function (),
             *   };
             *   $scope.browsePager = GridTools.attachPager($scope.BrowseGrid, opts);
             *   $scope.BrowseGrid.loadItems();
             */
            var Pager = function Pager(gridDef, opts) {
                this.gridDef = gridDef;
                this.currentPage = 1;
                this.totalItems = 0;
                this.loadedItems = 0;
                this.pageSize = 100;
                this.pageSizes = [100, 200, 500];
                angular.extend(this, opts);
            };

            Pager.prototype.changed = function () {
                var p, max = Math.ceil(this.totalItems / this.pageSize);
                if (this.currentPage == '') return;
                p = parseInt(this.currentPage);
                if (! p) { return; }
                if (p < 1) { p = 1; }
                if (p > max) { p = max; }
                this.currentPage = p;
                this.gridDef.loadItems();
            };

            Pager.prototype.sizeChanged = function () {
                this.currentPage = 1;
                this.gridDef.loadItems();
            };

            Pager.prototype.firstRow = function () {
                return (this.currentPage - 1) * this.pageSize + 1;
            };

            Pager.prototype.lastRow = function () {
                return (this.currentPage - 1) * this.pageSize + this.loadedItems;
            };

            /**
             * @ngdoc method
             * @methodOf PymApp.service: PymApp.GridTools.Pager
             * @name applyParams
             * @description Applies current page and page size to given object of
             *     query parameters. Keys are ``pg`` for current page and ``ps``
             *     for page size. Given object is changed in-place. Applied
             *     page number (``pg``) is zero-based, where-as page number
             *     maintained in Pager object is one-based.
             * @param {object} params The object of query parameters.
             */
            Pager.prototype.applyParams = function (params) {
                params.pg = this.currentPage - 1;
                params.ps = this.pageSize;
            };

            Pager.prototype.updateItemCount = function (totalItems, loadedItems) {
                this.totalItems = totalItems;
                this.loadedItems = loadedItems;
            };

            /**
             * @ngdoc method
             * @methodOf PymApp.service: PymApp.GridTools
             * @name attachPager
             * @description Attaches a new instance of a pager to the given
             *     grid definition object. Pager instance is then available as
             *     ``gridDef.pym.pager``.
             * @param {object} gridDef The object with grid definition.
             * @param {object} opts Additional options to pass to pager
             *     constructor.
             * @return Instance of the pager.
             */
            this.attachPager = function (gridDef, opts) {
                var pager = new Pager(gridDef, opts);
                gridDef.pym.pager = pager;
                return pager;
            };

            // ===[ SORTER ]=======

            /**
             * @param gridDef
             * @param opts
             * @description Sorter provides tools for external sorting.
             * Sorter expects an object with the grid definition.
             * The gridDef must have
             *   - hash ``options.indexedColumnDefs`` that
             *     indexes columnDefs by field name
             *   - method ``loadItems()`` to load the items
             *   - property ``pym``, an object that gets filled with grid tool
             *     instances, e.g. ``pym.sorter``.
             *
             * The options hash my have keys ``sortDef`` and ``initialSortDef``,
             * each containing a list of 3-tuples (field_name, direction, priority).
             *
             * ``sortDef`` is initially empty and will contain the settings
             * when the grid emits a sort changed event.
             *
             * ``initialSortDef`` contains the sort definition the grid is
             * initially sorted by.
             *
             * @example
             *   $scope.BrowseGrid = {
             *      pym: {},
             *      loadItems: function (),
             *      options.indexedColumnDefs: {},
             *      onRegisterApi: function(gridApi) {
             *          $scope.browseGridApi = gridApi;
             *          $scope.browseGridApi.core.on.sortChanged(
             *              $scope, PYM.createBoundedWrapper(
             *                          $scope.browseSorter,
             *                          $scope.browseSorter.gridSortChanged
             *                  )
             *          );
             *      }
             *   };
             *   $scope.BrowseGrid.indexColumnDefs();
             *   $scope.browseSorter = GridTools.attachSorter($scope.BrowseGrid, {});
             *   $scope.BrowseGrid.loadItems();
             */
            var Sorter = function Sorter(gridDef, opts) {
                this.gridDef = gridDef;
                this.opts = {
                    sortDef: [],
                    // Define initial sort here
                    initialSortDef: [
                        ['id', 'desc', 0]
                    ]
                };
                angular.extend(this.opts, opts);
                this.gridApplyInitialSort();
            };

            Sorter.prototype.gridSortChanged = function (grid, sortColumns) {
                var self = this;
                self.opts.sortDef = [];
                angular.forEach(sortColumns, function (col) {
                    self.opts.sortDef.push([col.field, col.sort.direction, col.sort.priority]);
                });
                if (! self.opts.sortDef.length) self.opts.sortDef = self.opts.initialSortDef.slice(0);
                self.gridDef.loadItems();
            };
            Sorter.prototype.gridApplyInitialSort = function (isd) {
                var self = this;
                if (isd) self.opts.initialSortDef = isd;
                angular.forEach(self.opts.initialSortDef, function (sd) {
                    self.gridDef.options.indexedColumnDefs[sd[0]] = {
                        direction: sd[1],
                        priority: sd[2]
                    };
                });
                self.opts.sortDef = self.opts.initialSortDef.slice(0);
            };
            Sorter.prototype.getFields = function () {
                var self = this, vv = [];
                angular.forEach(self.opts.sortDef, function (sd) {
                    vv.push(sd[0]);
                });
                return vv;
            };
            Sorter.prototype.getDirections = function () {
                var self = this, vv = [];
                angular.forEach(self.opts.sortDef, function (sd) {
                    vv.push(sd[1]);
                });
                return vv;
            };
            Sorter.prototype.getPriorities = function () {
                var self = this, vv = [];
                angular.forEach(self.opts.sortDef, function (sd) {
                    vv.push(sd[2]);
                });
                return vv;
            };

            /**
             * @ngdoc method
             * @methodOf PymApp.service: PymApp.GridTools.Sorter
             * @name applyParams
             * @description Applies current sort settings to given object of
             *     query parameters. Keys are ``sf`` for current fields, ``sd``
             *     for directions and, ``sp`` for priorities. The value of each
             *     key is a list with the appropriate column names. Given object
             *     is changed in-place.
             * @param {object} params The object of query parameters.
             */
            Sorter.prototype.applyParams = function (params) {
                params.sf = this.getFields();
                params.sd = this.getDirections();
                params.sp = this.getPriorities();
            };

            /**
             * @ngdoc method
             * @methodOf PymApp.service: PymApp.GridTools
             * @name attachSorter
             * @description Attaches a new instance of a sorter to the given
             *     grid definition object. Sorter instance is then available as
             *     ``gridDef.pym.sorter``.
             * @param {object} gridDef The object with grid definition.
             * @param {object} opts Additional options to pass to sorter
             *     constructor.
             * @return Instance of the sorter.
             */
            this.attachSorter = function (gridDef, opts) {
                var sorter = new Sorter(gridDef, opts);
                gridDef.pym.sorter = sorter;
                return sorter;
            };

            // ===[ ENHANCEMENTS ]=======

            function indexColumnDefs (RC) {
                var self = this; // Will reference the gridDef object
                self.options.indexedColumnDefs = {};
                angular.forEach(self.options.columnDefs, function (cd) {
                    self.options.indexedColumnDefs[cd.name || cd.field] = cd;
                });
                if (RC && RC.col_display_names) {
                    angular.forEach(self.options.columnDefs, function (cd) {
                        cd['displayName'] = RC.col_display_names[cd.name || cd.field];
                    });
                }
            }

            /**
             * @ngdoc method
             * @methodOf PymApp.service: PymApp.GridTools
             * @name loadItems
             * @description Loads the items for the grid. It regards optionally
             *     available sorter, pager and filter. It handles the spinner
             *     and updates the pager's item count.
             * @param {string} url The GET URL to load from.
             * @param {object} httpConf Object with additional configuration for
             *     for the request. It *must* have property ``params`` set as a
             *     nested object, because we apply all query parameters here.
             * @return A promise that the caller can chain to with ``.then()``.
             *     The parameters of the chained resolve and reject functions
             *     are the original ones.
             */
            function loadItems(url, httpConf) {
                // ``this`` points to the ``pym`` namespace of the gridDef
                var self = this,
                    params = httpConf.params;
                if (self.filter) self.filter.applyParams(params);
                if (self.sorter) self.sorter.applyParams(params);
                if (self.pager) self.pager.applyParams(params);
                self.loading = true;
                return $http.get(url, httpConf)
                    .then(function (resp) {
                        var data = resp.data.data;
                        self.loading = false;
                        if (resp.data.ok) {
                            if (self.pager) self.pager.updateItemCount(
                                data.total, data.rows.length);
                        }
                        return resp;
                    }, function (result) {
                        self.pym.loading = false;
                        return result;
                    });
            }

            /**
             * @description Enhances given grid definition.
             *
             * - Inserts method ``indexColumnDefs()`` that indexes the
             *   ``options.columnDefs`` into ``options.indexedColumnDefs`` by
             *   their ``field`` properties.
             * - Inits property ``pym`` to become an object container for
             *   other grid tool instances like sorter etc.
             *
             * @param gridDef
             */
            this.enhance = function (gridDef) {
                gridDef.pym = {
                    sorter: null,
                    pager: null,
                    filter: null,
                    loading: false,
                    loadItems: loadItems
                };
                gridDef.options.indexedColumnDefs = {};
                gridDef.indexColumnDefs = indexColumnDefs;
            };
        }]
    );

    /**
     * AngularJS default filter with the following expression:
     * "person in people | filter: {name: $select.search, age: $select.search}"
     * performs a AND between 'name: $select.search' and 'age: $select.search'.
     * We want to perform a OR.
     *
     * Lifted from angular ui select
     * http://plnkr.co/edit/juqoNOt1z1Gb349XabQ2?p=preview
     */
    PymApp.filter('propsFilter', function() {
      return function(items, props) {
        var out = [];

        if (angular.isArray(items)) {
          items.forEach(function(item) {
            var itemMatches = false;

            var keys = Object.keys(props);
            for (var i = 0; i < keys.length; i++) {
              var prop = keys[i];
              var text = props[prop].toLowerCase();
              if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                itemMatches = true;
                break;
              }
            }

            if (itemMatches) {
              out.push(item);
            }
          });
        } else {
          // Let the output be the input untouched
          out = items;
        }

        return out;
      };
    });

    PymApp.directive('pymSpinner', function() {
        return {
            restrict: 'E',
            scope: {
                state: '='
            },
            template: '<i class="fa fa-spinner fa-spin" ng-show="state"></i>'
        };
    });

    PymApp.directive('pymGridFooter', function() {
        return {
            restrict: 'E',
            scope: {},
            transclude: true,
            template: ''
                +'<div class="pym-grid-footer" ng-transclude>'
                +'</div>'
        };
    });

    PymApp.directive('pymGridToggleFilter', function() {
        return {
            restrict: 'E',
            scope: {
                gridFilter: '='
            },
            template: ''
                +'<button class="pym-grid-toggle-filter btn btn-default form-control input-sm" ng-click="gridFilter.toggle()">'
                +  '<i class="fa fa-filter"></i>'
                +'</button>'
        };
    });

    PymApp.directive('pymGridPagination', function() {
        return {
            restrict: 'E',
            scope: {
                gridPager: '=',
                spinner: '='
            },
            template: ''
                +'  <div class="pym-grid-pagination">'
                +      '<pagination class="pagination pagination-sm"'
                +                  'total-items="gridPager.totalItems"'
                +                  'items-per-page="gridPager.pageSize"'
                +                  'ng-model="gridPager.currentPage"'
                +                  'ng-change="gridPager.changed()"'
                +                  'boundary-links="true"'
                +                  'previous-text="&lsaquo;" next-text="&rsaquo;"'
                +                  'first-text="&laquo;" last-text="&raquo;"'
                +                  'max-size="3"'
                +              '>'
                +      '</pagination>'
                +'  </div>'
                +   '<div class="page">'
                +    '<input type="number" ng-model="gridPager.currentPage"'
                +            'ng-change="gridPager.changed()"'
                +            'class="form-control input-sm">'
                +'  </div>'
                +'  <div class="page-size-chooser">'
                +    '<select ng-model="gridPager.pageSize"'
                +            'ng-change="gridPager.sizeChanged()"'
                +            'ng-options="v for v in gridPager.pageSizes"'
                +            'class="form-control input-sm">'
                +    '</select>'
                +'  </div>'
                +'  <div class="spacer"></div>'
                +'  <div class="row-numbers">{{gridPager.firstRow()|number}}-{{gridPager.lastRow()|number}} of {{gridPager.totalItems|number}}</div>'
                +'  <div class="spinner"><pym-spinner state="spinner"></pym-spinner></div>'
        };
    });

    return PymApp;
});

/**
 * bootstraps angular onto the window.document node
 */

define(['ng', 'pym/app'], function (angular) {
    'use strict';

    require(['requirejs/domReady!'], function (document) {
        angular.bootstrap(document, ['PymApp']);
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBsdWdpbnMuanMiLCJweW0uanMiLCJhcHAuanMiLCJib290LW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEF2b2lkIGBjb25zb2xlYCBlcnJvcnMgaW4gYnJvd3NlcnMgdGhhdCBsYWNrIGEgY29uc29sZS5cbmlmICghKHdpbmRvdy5jb25zb2xlICYmIGNvbnNvbGUubG9nKSkge1xuICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgbWV0aG9kcyA9IFsnYXNzZXJ0JywgJ2NsZWFyJywgJ2NvdW50JywgJ2RlYnVnJywgJ2RpcicsICdkaXJ4bWwnLCAnZXJyb3InLCAnZXhjZXB0aW9uJywgJ2dyb3VwJywgJ2dyb3VwQ29sbGFwc2VkJywgJ2dyb3VwRW5kJywgJ2luZm8nLCAnbG9nJywgJ21hcmtUaW1lbGluZScsICdwcm9maWxlJywgJ3Byb2ZpbGVFbmQnLCAnbWFya1RpbWVsaW5lJywgJ3RhYmxlJywgJ3RpbWUnLCAndGltZUVuZCcsICd0aW1lU3RhbXAnLCAndHJhY2UnLCAnd2FybiddO1xuICAgICAgICB2YXIgbGVuZ3RoID0gbWV0aG9kcy5sZW5ndGg7XG4gICAgICAgIHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGUgPSB7fTtcbiAgICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgICAgICBjb25zb2xlW21ldGhvZHNbbGVuZ3RoXV0gPSBub29wO1xuICAgICAgICB9XG4gICAgfSgpKTtcbn1cblxuLy8gUGxhY2UgYW55IGpRdWVyeS9oZWxwZXIgcGx1Z2lucyBpbiBoZXJlLlxuXG4vKiBNb2Rlcm5penIgMi42LjIgKEN1c3RvbSBCdWlsZCkgfCBNSVQgJiBCU0RcbiAqIEJ1aWxkOiBodHRwOi8vbW9kZXJuaXpyLmNvbS9kb3dubG9hZC8jLXNoaXYtbXEtY3NzY2xhc3Nlcy10ZXN0c3R5bGVzLWhhc2V2ZW50LWxvYWRcbiAqL1xuO3dpbmRvdy5Nb2Rlcm5penI9ZnVuY3Rpb24oYSxiLGMpe2Z1bmN0aW9uIHgoYSl7ai5jc3NUZXh0PWF9ZnVuY3Rpb24geShhLGIpe3JldHVybiB4KHByZWZpeGVzLmpvaW4oYStcIjtcIikrKGJ8fFwiXCIpKX1mdW5jdGlvbiB6KGEsYil7cmV0dXJuIHR5cGVvZiBhPT09Yn1mdW5jdGlvbiBBKGEsYil7cmV0dXJuISF+KFwiXCIrYSkuaW5kZXhPZihiKX1mdW5jdGlvbiBCKGEsYixkKXtmb3IodmFyIGUgaW4gYSl7dmFyIGY9YlthW2VdXTtpZihmIT09YylyZXR1cm4gZD09PSExP2FbZV06eihmLFwiZnVuY3Rpb25cIik/Zi5iaW5kKGR8fGIpOmZ9cmV0dXJuITF9dmFyIGQ9XCIyLjYuMlwiLGU9e30sZj0hMCxnPWIuZG9jdW1lbnRFbGVtZW50LGg9XCJtb2Rlcm5penJcIixpPWIuY3JlYXRlRWxlbWVudChoKSxqPWkuc3R5bGUsayxsPXt9LnRvU3RyaW5nLG09e30sbj17fSxvPXt9LHA9W10scT1wLnNsaWNlLHIscz1mdW5jdGlvbihhLGMsZCxlKXt2YXIgZixpLGosayxsPWIuY3JlYXRlRWxlbWVudChcImRpdlwiKSxtPWIuYm9keSxuPW18fGIuY3JlYXRlRWxlbWVudChcImJvZHlcIik7aWYocGFyc2VJbnQoZCwxMCkpd2hpbGUoZC0tKWo9Yi5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLGouaWQ9ZT9lW2RdOmgrKGQrMSksbC5hcHBlbmRDaGlsZChqKTtyZXR1cm4gZj1bXCImIzE3MztcIiwnPHN0eWxlIGlkPVwicycsaCwnXCI+JyxhLFwiPC9zdHlsZT5cIl0uam9pbihcIlwiKSxsLmlkPWgsKG0/bDpuKS5pbm5lckhUTUwrPWYsbi5hcHBlbmRDaGlsZChsKSxtfHwobi5zdHlsZS5iYWNrZ3JvdW5kPVwiXCIsbi5zdHlsZS5vdmVyZmxvdz1cImhpZGRlblwiLGs9Zy5zdHlsZS5vdmVyZmxvdyxnLnN0eWxlLm92ZXJmbG93PVwiaGlkZGVuXCIsZy5hcHBlbmRDaGlsZChuKSksaT1jKGwsYSksbT9sLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobCk6KG4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChuKSxnLnN0eWxlLm92ZXJmbG93PWspLCEhaX0sdD1mdW5jdGlvbihiKXt2YXIgYz1hLm1hdGNoTWVkaWF8fGEubXNNYXRjaE1lZGlhO2lmKGMpcmV0dXJuIGMoYikubWF0Y2hlczt2YXIgZDtyZXR1cm4gcyhcIkBtZWRpYSBcIitiK1wiIHsgI1wiK2grXCIgeyBwb3NpdGlvbjogYWJzb2x1dGU7IH0gfVwiLGZ1bmN0aW9uKGIpe2Q9KGEuZ2V0Q29tcHV0ZWRTdHlsZT9nZXRDb21wdXRlZFN0eWxlKGIsbnVsbCk6Yi5jdXJyZW50U3R5bGUpW1wicG9zaXRpb25cIl09PVwiYWJzb2x1dGVcIn0pLGR9LHU9ZnVuY3Rpb24oKXtmdW5jdGlvbiBkKGQsZSl7ZT1lfHxiLmNyZWF0ZUVsZW1lbnQoYVtkXXx8XCJkaXZcIiksZD1cIm9uXCIrZDt2YXIgZj1kIGluIGU7cmV0dXJuIGZ8fChlLnNldEF0dHJpYnV0ZXx8KGU9Yi5jcmVhdGVFbGVtZW50KFwiZGl2XCIpKSxlLnNldEF0dHJpYnV0ZSYmZS5yZW1vdmVBdHRyaWJ1dGUmJihlLnNldEF0dHJpYnV0ZShkLFwiXCIpLGY9eihlW2RdLFwiZnVuY3Rpb25cIikseihlW2RdLFwidW5kZWZpbmVkXCIpfHwoZVtkXT1jKSxlLnJlbW92ZUF0dHJpYnV0ZShkKSkpLGU9bnVsbCxmfXZhciBhPXtzZWxlY3Q6XCJpbnB1dFwiLGNoYW5nZTpcImlucHV0XCIsc3VibWl0OlwiZm9ybVwiLHJlc2V0OlwiZm9ybVwiLGVycm9yOlwiaW1nXCIsbG9hZDpcImltZ1wiLGFib3J0OlwiaW1nXCJ9O3JldHVybiBkfSgpLHY9e30uaGFzT3duUHJvcGVydHksdzsheih2LFwidW5kZWZpbmVkXCIpJiYheih2LmNhbGwsXCJ1bmRlZmluZWRcIik/dz1mdW5jdGlvbihhLGIpe3JldHVybiB2LmNhbGwoYSxiKX06dz1mdW5jdGlvbihhLGIpe3JldHVybiBiIGluIGEmJnooYS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbYl0sXCJ1bmRlZmluZWRcIil9LEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kfHwoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQ9ZnVuY3Rpb24oYil7dmFyIGM9dGhpcztpZih0eXBlb2YgYyE9XCJmdW5jdGlvblwiKXRocm93IG5ldyBUeXBlRXJyb3I7dmFyIGQ9cS5jYWxsKGFyZ3VtZW50cywxKSxlPWZ1bmN0aW9uKCl7aWYodGhpcyBpbnN0YW5jZW9mIGUpe3ZhciBhPWZ1bmN0aW9uKCl7fTthLnByb3RvdHlwZT1jLnByb3RvdHlwZTt2YXIgZj1uZXcgYSxnPWMuYXBwbHkoZixkLmNvbmNhdChxLmNhbGwoYXJndW1lbnRzKSkpO3JldHVybiBPYmplY3QoZyk9PT1nP2c6Zn1yZXR1cm4gYy5hcHBseShiLGQuY29uY2F0KHEuY2FsbChhcmd1bWVudHMpKSl9O3JldHVybiBlfSk7Zm9yKHZhciBDIGluIG0pdyhtLEMpJiYocj1DLnRvTG93ZXJDYXNlKCksZVtyXT1tW0NdKCkscC5wdXNoKChlW3JdP1wiXCI6XCJuby1cIikrcikpO3JldHVybiBlLmFkZFRlc3Q9ZnVuY3Rpb24oYSxiKXtpZih0eXBlb2YgYT09XCJvYmplY3RcIilmb3IodmFyIGQgaW4gYSl3KGEsZCkmJmUuYWRkVGVzdChkLGFbZF0pO2Vsc2V7YT1hLnRvTG93ZXJDYXNlKCk7aWYoZVthXSE9PWMpcmV0dXJuIGU7Yj10eXBlb2YgYj09XCJmdW5jdGlvblwiP2IoKTpiLHR5cGVvZiBmIT1cInVuZGVmaW5lZFwiJiZmJiYoZy5jbGFzc05hbWUrPVwiIFwiKyhiP1wiXCI6XCJuby1cIikrYSksZVthXT1ifXJldHVybiBlfSx4KFwiXCIpLGk9az1udWxsLGZ1bmN0aW9uKGEsYil7ZnVuY3Rpb24gayhhLGIpe3ZhciBjPWEuY3JlYXRlRWxlbWVudChcInBcIiksZD1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXXx8YS5kb2N1bWVudEVsZW1lbnQ7cmV0dXJuIGMuaW5uZXJIVE1MPVwieDxzdHlsZT5cIitiK1wiPC9zdHlsZT5cIixkLmluc2VydEJlZm9yZShjLmxhc3RDaGlsZCxkLmZpcnN0Q2hpbGQpfWZ1bmN0aW9uIGwoKXt2YXIgYT1yLmVsZW1lbnRzO3JldHVybiB0eXBlb2YgYT09XCJzdHJpbmdcIj9hLnNwbGl0KFwiIFwiKTphfWZ1bmN0aW9uIG0oYSl7dmFyIGI9aVthW2ddXTtyZXR1cm4gYnx8KGI9e30saCsrLGFbZ109aCxpW2hdPWIpLGJ9ZnVuY3Rpb24gbihhLGMsZil7Y3x8KGM9Yik7aWYoailyZXR1cm4gYy5jcmVhdGVFbGVtZW50KGEpO2Z8fChmPW0oYykpO3ZhciBnO3JldHVybiBmLmNhY2hlW2FdP2c9Zi5jYWNoZVthXS5jbG9uZU5vZGUoKTplLnRlc3QoYSk/Zz0oZi5jYWNoZVthXT1mLmNyZWF0ZUVsZW0oYSkpLmNsb25lTm9kZSgpOmc9Zi5jcmVhdGVFbGVtKGEpLGcuY2FuSGF2ZUNoaWxkcmVuJiYhZC50ZXN0KGEpP2YuZnJhZy5hcHBlbmRDaGlsZChnKTpnfWZ1bmN0aW9uIG8oYSxjKXthfHwoYT1iKTtpZihqKXJldHVybiBhLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtjPWN8fG0oYSk7dmFyIGQ9Yy5mcmFnLmNsb25lTm9kZSgpLGU9MCxmPWwoKSxnPWYubGVuZ3RoO2Zvcig7ZTxnO2UrKylkLmNyZWF0ZUVsZW1lbnQoZltlXSk7cmV0dXJuIGR9ZnVuY3Rpb24gcChhLGIpe2IuY2FjaGV8fChiLmNhY2hlPXt9LGIuY3JlYXRlRWxlbT1hLmNyZWF0ZUVsZW1lbnQsYi5jcmVhdGVGcmFnPWEuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCxiLmZyYWc9Yi5jcmVhdGVGcmFnKCkpLGEuY3JlYXRlRWxlbWVudD1mdW5jdGlvbihjKXtyZXR1cm4gci5zaGl2TWV0aG9kcz9uKGMsYSxiKTpiLmNyZWF0ZUVsZW0oYyl9LGEuY3JlYXRlRG9jdW1lbnRGcmFnbWVudD1GdW5jdGlvbihcImgsZlwiLFwicmV0dXJuIGZ1bmN0aW9uKCl7dmFyIG49Zi5jbG9uZU5vZGUoKSxjPW4uY3JlYXRlRWxlbWVudDtoLnNoaXZNZXRob2RzJiYoXCIrbCgpLmpvaW4oKS5yZXBsYWNlKC9cXHcrL2csZnVuY3Rpb24oYSl7cmV0dXJuIGIuY3JlYXRlRWxlbShhKSxiLmZyYWcuY3JlYXRlRWxlbWVudChhKSwnYyhcIicrYSsnXCIpJ30pK1wiKTtyZXR1cm4gbn1cIikocixiLmZyYWcpfWZ1bmN0aW9uIHEoYSl7YXx8KGE9Yik7dmFyIGM9bShhKTtyZXR1cm4gci5zaGl2Q1NTJiYhZiYmIWMuaGFzQ1NTJiYoYy5oYXNDU1M9ISFrKGEsXCJhcnRpY2xlLGFzaWRlLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG5hdixzZWN0aW9ue2Rpc3BsYXk6YmxvY2t9bWFya3tiYWNrZ3JvdW5kOiNGRjA7Y29sb3I6IzAwMH1cIikpLGp8fHAoYSxjKSxhfXZhciBjPWEuaHRtbDV8fHt9LGQ9L148fF4oPzpidXR0b258bWFwfHNlbGVjdHx0ZXh0YXJlYXxvYmplY3R8aWZyYW1lfG9wdGlvbnxvcHRncm91cCkkL2ksZT0vXig/OmF8Ynxjb2RlfGRpdnxmaWVsZHNldHxoMXxoMnxoM3xoNHxoNXxoNnxpfGxhYmVsfGxpfG9sfHB8cXxzcGFufHN0cm9uZ3xzdHlsZXx0YWJsZXx0Ym9keXx0ZHx0aHx0cnx1bCkkL2ksZixnPVwiX2h0bWw1c2hpdlwiLGg9MCxpPXt9LGo7KGZ1bmN0aW9uKCl7dHJ5e3ZhciBhPWIuY3JlYXRlRWxlbWVudChcImFcIik7YS5pbm5lckhUTUw9XCI8eHl6PjwveHl6PlwiLGY9XCJoaWRkZW5cImluIGEsaj1hLmNoaWxkTm9kZXMubGVuZ3RoPT0xfHxmdW5jdGlvbigpe2IuY3JlYXRlRWxlbWVudChcImFcIik7dmFyIGE9Yi5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7cmV0dXJuIHR5cGVvZiBhLmNsb25lTm9kZT09XCJ1bmRlZmluZWRcInx8dHlwZW9mIGEuY3JlYXRlRG9jdW1lbnRGcmFnbWVudD09XCJ1bmRlZmluZWRcInx8dHlwZW9mIGEuY3JlYXRlRWxlbWVudD09XCJ1bmRlZmluZWRcIn0oKX1jYXRjaChjKXtmPSEwLGo9ITB9fSkoKTt2YXIgcj17ZWxlbWVudHM6Yy5lbGVtZW50c3x8XCJhYmJyIGFydGljbGUgYXNpZGUgYXVkaW8gYmRpIGNhbnZhcyBkYXRhIGRhdGFsaXN0IGRldGFpbHMgZmlnY2FwdGlvbiBmaWd1cmUgZm9vdGVyIGhlYWRlciBoZ3JvdXAgbWFyayBtZXRlciBuYXYgb3V0cHV0IHByb2dyZXNzIHNlY3Rpb24gc3VtbWFyeSB0aW1lIHZpZGVvXCIsc2hpdkNTUzpjLnNoaXZDU1MhPT0hMSxzdXBwb3J0c1Vua25vd25FbGVtZW50czpqLHNoaXZNZXRob2RzOmMuc2hpdk1ldGhvZHMhPT0hMSx0eXBlOlwiZGVmYXVsdFwiLHNoaXZEb2N1bWVudDpxLGNyZWF0ZUVsZW1lbnQ6bixjcmVhdGVEb2N1bWVudEZyYWdtZW50Om99O2EuaHRtbDU9cixxKGIpfSh0aGlzLGIpLGUuX3ZlcnNpb249ZCxlLm1xPXQsZS5oYXNFdmVudD11LGUudGVzdFN0eWxlcz1zLGcuY2xhc3NOYW1lPWcuY2xhc3NOYW1lLnJlcGxhY2UoLyhefFxccyluby1qcyhcXHN8JCkvLFwiJDEkMlwiKSsoZj9cIiBqcyBcIitwLmpvaW4oXCIgXCIpOlwiXCIpLGV9KHRoaXMsdGhpcy5kb2N1bWVudCksZnVuY3Rpb24oYSxiLGMpe2Z1bmN0aW9uIGQoYSl7cmV0dXJuXCJbb2JqZWN0IEZ1bmN0aW9uXVwiPT1vLmNhbGwoYSl9ZnVuY3Rpb24gZShhKXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgYX1mdW5jdGlvbiBmKCl7fWZ1bmN0aW9uIGcoYSl7cmV0dXJuIWF8fFwibG9hZGVkXCI9PWF8fFwiY29tcGxldGVcIj09YXx8XCJ1bmluaXRpYWxpemVkXCI9PWF9ZnVuY3Rpb24gaCgpe3ZhciBhPXAuc2hpZnQoKTtxPTEsYT9hLnQ/bShmdW5jdGlvbigpeyhcImNcIj09YS50P0IuaW5qZWN0Q3NzOkIuaW5qZWN0SnMpKGEucywwLGEuYSxhLngsYS5lLDEpfSwwKTooYSgpLGgoKSk6cT0wfWZ1bmN0aW9uIGkoYSxjLGQsZSxmLGksail7ZnVuY3Rpb24gayhiKXtpZighbyYmZyhsLnJlYWR5U3RhdGUpJiYodS5yPW89MSwhcSYmaCgpLGwub25sb2FkPWwub25yZWFkeXN0YXRlY2hhbmdlPW51bGwsYikpe1wiaW1nXCIhPWEmJm0oZnVuY3Rpb24oKXt0LnJlbW92ZUNoaWxkKGwpfSw1MCk7Zm9yKHZhciBkIGluIHlbY10peVtjXS5oYXNPd25Qcm9wZXJ0eShkKSYmeVtjXVtkXS5vbmxvYWQoKX19dmFyIGo9anx8Qi5lcnJvclRpbWVvdXQsbD1iLmNyZWF0ZUVsZW1lbnQoYSksbz0wLHI9MCx1PXt0OmQsczpjLGU6ZixhOmkseDpqfTsxPT09eVtjXSYmKHI9MSx5W2NdPVtdKSxcIm9iamVjdFwiPT1hP2wuZGF0YT1jOihsLnNyYz1jLGwudHlwZT1hKSxsLndpZHRoPWwuaGVpZ2h0PVwiMFwiLGwub25lcnJvcj1sLm9ubG9hZD1sLm9ucmVhZHlzdGF0ZWNoYW5nZT1mdW5jdGlvbigpe2suY2FsbCh0aGlzLHIpfSxwLnNwbGljZShlLDAsdSksXCJpbWdcIiE9YSYmKHJ8fDI9PT15W2NdPyh0Lmluc2VydEJlZm9yZShsLHM/bnVsbDpuKSxtKGssaikpOnlbY10ucHVzaChsKSl9ZnVuY3Rpb24gaihhLGIsYyxkLGYpe3JldHVybiBxPTAsYj1ifHxcImpcIixlKGEpP2koXCJjXCI9PWI/djp1LGEsYix0aGlzLmkrKyxjLGQsZik6KHAuc3BsaWNlKHRoaXMuaSsrLDAsYSksMT09cC5sZW5ndGgmJmgoKSksdGhpc31mdW5jdGlvbiBrKCl7dmFyIGE9QjtyZXR1cm4gYS5sb2FkZXI9e2xvYWQ6aixpOjB9LGF9dmFyIGw9Yi5kb2N1bWVudEVsZW1lbnQsbT1hLnNldFRpbWVvdXQsbj1iLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic2NyaXB0XCIpWzBdLG89e30udG9TdHJpbmcscD1bXSxxPTAscj1cIk1vekFwcGVhcmFuY2VcImluIGwuc3R5bGUscz1yJiYhIWIuY3JlYXRlUmFuZ2UoKS5jb21wYXJlTm9kZSx0PXM/bDpuLnBhcmVudE5vZGUsbD1hLm9wZXJhJiZcIltvYmplY3QgT3BlcmFdXCI9PW8uY2FsbChhLm9wZXJhKSxsPSEhYi5hdHRhY2hFdmVudCYmIWwsdT1yP1wib2JqZWN0XCI6bD9cInNjcmlwdFwiOlwiaW1nXCIsdj1sP1wic2NyaXB0XCI6dSx3PUFycmF5LmlzQXJyYXl8fGZ1bmN0aW9uKGEpe3JldHVyblwiW29iamVjdCBBcnJheV1cIj09by5jYWxsKGEpfSx4PVtdLHk9e30sej17dGltZW91dDpmdW5jdGlvbihhLGIpe3JldHVybiBiLmxlbmd0aCYmKGEudGltZW91dD1iWzBdKSxhfX0sQSxCO0I9ZnVuY3Rpb24oYSl7ZnVuY3Rpb24gYihhKXt2YXIgYT1hLnNwbGl0KFwiIVwiKSxiPXgubGVuZ3RoLGM9YS5wb3AoKSxkPWEubGVuZ3RoLGM9e3VybDpjLG9yaWdVcmw6YyxwcmVmaXhlczphfSxlLGYsZztmb3IoZj0wO2Y8ZDtmKyspZz1hW2ZdLnNwbGl0KFwiPVwiKSwoZT16W2cuc2hpZnQoKV0pJiYoYz1lKGMsZykpO2ZvcihmPTA7ZjxiO2YrKyljPXhbZl0oYyk7cmV0dXJuIGN9ZnVuY3Rpb24gZyhhLGUsZixnLGgpe3ZhciBpPWIoYSksaj1pLmF1dG9DYWxsYmFjaztpLnVybC5zcGxpdChcIi5cIikucG9wKCkuc3BsaXQoXCI/XCIpLnNoaWZ0KCksaS5ieXBhc3N8fChlJiYoZT1kKGUpP2U6ZVthXXx8ZVtnXXx8ZVthLnNwbGl0KFwiL1wiKS5wb3AoKS5zcGxpdChcIj9cIilbMF1dKSxpLmluc3RlYWQ/aS5pbnN0ZWFkKGEsZSxmLGcsaCk6KHlbaS51cmxdP2kubm9leGVjPSEwOnlbaS51cmxdPTEsZi5sb2FkKGkudXJsLGkuZm9yY2VDU1N8fCFpLmZvcmNlSlMmJlwiY3NzXCI9PWkudXJsLnNwbGl0KFwiLlwiKS5wb3AoKS5zcGxpdChcIj9cIikuc2hpZnQoKT9cImNcIjpjLGkubm9leGVjLGkuYXR0cnMsaS50aW1lb3V0KSwoZChlKXx8ZChqKSkmJmYubG9hZChmdW5jdGlvbigpe2soKSxlJiZlKGkub3JpZ1VybCxoLGcpLGomJmooaS5vcmlnVXJsLGgsZykseVtpLnVybF09Mn0pKSl9ZnVuY3Rpb24gaChhLGIpe2Z1bmN0aW9uIGMoYSxjKXtpZihhKXtpZihlKGEpKWN8fChqPWZ1bmN0aW9uKCl7dmFyIGE9W10uc2xpY2UuY2FsbChhcmd1bWVudHMpO2suYXBwbHkodGhpcyxhKSxsKCl9KSxnKGEsaixiLDAsaCk7ZWxzZSBpZihPYmplY3QoYSk9PT1hKWZvcihuIGluIG09ZnVuY3Rpb24oKXt2YXIgYj0wLGM7Zm9yKGMgaW4gYSlhLmhhc093blByb3BlcnR5KGMpJiZiKys7cmV0dXJuIGJ9KCksYSlhLmhhc093blByb3BlcnR5KG4pJiYoIWMmJiEtLW0mJihkKGopP2o9ZnVuY3Rpb24oKXt2YXIgYT1bXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7ay5hcHBseSh0aGlzLGEpLGwoKX06altuXT1mdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgYj1bXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7YSYmYS5hcHBseSh0aGlzLGIpLGwoKX19KGtbbl0pKSxnKGFbbl0saixiLG4saCkpfWVsc2UhYyYmbCgpfXZhciBoPSEhYS50ZXN0LGk9YS5sb2FkfHxhLmJvdGgsaj1hLmNhbGxiYWNrfHxmLGs9aixsPWEuY29tcGxldGV8fGYsbSxuO2MoaD9hLnllcDphLm5vcGUsISFpKSxpJiZjKGkpfXZhciBpLGosbD10aGlzLnllcG5vcGUubG9hZGVyO2lmKGUoYSkpZyhhLDAsbCwwKTtlbHNlIGlmKHcoYSkpZm9yKGk9MDtpPGEubGVuZ3RoO2krKylqPWFbaV0sZShqKT9nKGosMCxsLDApOncoaik/QihqKTpPYmplY3Qoaik9PT1qJiZoKGosbCk7ZWxzZSBPYmplY3QoYSk9PT1hJiZoKGEsbCl9LEIuYWRkUHJlZml4PWZ1bmN0aW9uKGEsYil7elthXT1ifSxCLmFkZEZpbHRlcj1mdW5jdGlvbihhKXt4LnB1c2goYSl9LEIuZXJyb3JUaW1lb3V0PTFlNCxudWxsPT1iLnJlYWR5U3RhdGUmJmIuYWRkRXZlbnRMaXN0ZW5lciYmKGIucmVhZHlTdGF0ZT1cImxvYWRpbmdcIixiLmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsQT1mdW5jdGlvbigpe2IucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIixBLDApLGIucmVhZHlTdGF0ZT1cImNvbXBsZXRlXCJ9LDApKSxhLnllcG5vcGU9aygpLGEueWVwbm9wZS5leGVjdXRlU3RhY2s9aCxhLnllcG5vcGUuaW5qZWN0SnM9ZnVuY3Rpb24oYSxjLGQsZSxpLGope3ZhciBrPWIuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKSxsLG8sZT1lfHxCLmVycm9yVGltZW91dDtrLnNyYz1hO2ZvcihvIGluIGQpay5zZXRBdHRyaWJ1dGUobyxkW29dKTtjPWo/aDpjfHxmLGsub25yZWFkeXN0YXRlY2hhbmdlPWsub25sb2FkPWZ1bmN0aW9uKCl7IWwmJmcoay5yZWFkeVN0YXRlKSYmKGw9MSxjKCksay5vbmxvYWQ9ay5vbnJlYWR5c3RhdGVjaGFuZ2U9bnVsbCl9LG0oZnVuY3Rpb24oKXtsfHwobD0xLGMoMSkpfSxlKSxpP2sub25sb2FkKCk6bi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShrLG4pfSxhLnllcG5vcGUuaW5qZWN0Q3NzPWZ1bmN0aW9uKGEsYyxkLGUsZyxpKXt2YXIgZT1iLmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpLGosYz1pP2g6Y3x8ZjtlLmhyZWY9YSxlLnJlbD1cInN0eWxlc2hlZXRcIixlLnR5cGU9XCJ0ZXh0L2Nzc1wiO2ZvcihqIGluIGQpZS5zZXRBdHRyaWJ1dGUoaixkW2pdKTtnfHwobi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShlLG4pLG0oYywwKSl9fSh0aGlzLGRvY3VtZW50KSxNb2Rlcm5penIubG9hZD1mdW5jdGlvbigpe3llcG5vcGUuYXBwbHkod2luZG93LFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKX07XG5cblxuLyoqXG4gKiBUaGUgZm9sbG93aW5nIHR3byBsaWZ0ZWQgZnJvbSBodHRwOi8vamF2YXNjcmlwdC5hYm91dC5jb20vbGlicmFyeS9ibGJ1c2RheWFkZC5odG1cbiAqL1xuXG5OdW1iZXIucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uIChuKSB7XG4gICAgcmV0dXJuICgodGhpcyAlIG4pICsgbikgJSBuO1xufTtcblxuRGF0ZS5wcm90b3R5cGUuYWRkQnVzaW5lc3NEYXlzID0gZnVuY3Rpb24gKGRkKSB7XG4gICAgdmFyIHdrcyA9IE1hdGguZmxvb3IoZGQgLyA1KTtcbiAgICB2YXIgZHlzID0gZGQubW9kKDUpO1xuICAgIHZhciBkeSA9IHRoaXMuZ2V0RGF5KCk7XG4gICAgaWYgKGR5ID09PSA2ICYmIGR5cyA+IC0xKSB7XG4gICAgICAgIGlmIChkeXMgPT09IDApIHtcbiAgICAgICAgICAgIGR5cyAtPSAyO1xuICAgICAgICAgICAgZHkgKz0gMjtcbiAgICAgICAgfVxuICAgICAgICBkeXMrKztcbiAgICAgICAgZHkgLT0gNjtcbiAgICB9XG4gICAgaWYgKGR5ID09PSAwICYmIGR5cyA8IDEpIHtcbiAgICAgICAgaWYgKGR5cyA9PT0gMCkge1xuICAgICAgICAgICAgZHlzICs9IDI7XG4gICAgICAgICAgICBkeSAtPSAyO1xuICAgICAgICB9XG4gICAgICAgIGR5cy0tO1xuICAgICAgICBkeSArPSA2O1xuICAgIH1cbiAgICBpZiAoZHkgKyBkeXMgPiA1KSBkeXMgKz0gMjtcbiAgICBpZiAoZHkgKyBkeXMgPCAxKSBkeXMgLT0gMjtcbiAgICB0aGlzLnNldERhdGUodGhpcy5nZXREYXRlKCkgKyB3a3MgKiA3ICsgZHlzKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbkRhdGUucHJvdG90eXBlLmRpZmZEYXlzID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgcmV0dXJuIChvdGhlci10aGlzKS8oMTAwMCo2MCo2MCoyNCk7XG59O1xuXG5EYXRlLnByb3RvdHlwZS5kYXlzSW5Nb250aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUodGhpcy5nZXRGdWxsWWVhcigpLCB0aGlzLmdldE1vbnRoKCksIDApLmdldERhdGUoKTtcbn07XG5cbkRhdGUucHJvdG90eXBlLmFkZERheXMgPSBmdW5jdGlvbiAoZGF5cykge1xuICAgIHRoaXMuc2V0RGF0ZSh0aGlzLmdldERhdGUoKSArIGRheXMpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdmFyIGksIGltYXgsIGs7XG4gICAgdmFyIHMsIHJlLCByZV9lbXB0eTtcblxuICAgIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge3JldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO31cblxuICAgIGZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7cmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7fVxuXG5cbiAgICBmdW5jdGlvbiBmb3JtYXRBcmcoYSkge1xuICAgICAgICBjb25zb2xlLmxvZyhhKTtcbiAgICAgICAgaWYgKGlzRGF0ZShhKSkge1xuICAgICAgICAgICAgcmV0dXJuIGEudG9JU09TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYTtcbiAgICB9XG5cbiAgICBzID0gdGhpcztcbiAgICByZV9lbXB0eSA9IG5ldyBSZWdFeHAoJ1xcXFx7XFxcXH0nKTtcbiAgICBmb3IgKGk9MCwgaW1heD1hcmdzLmxlbmd0aDsgaTxpbWF4OyBpKyspIHtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3NbaV07XG4gICAgICAgIGlmIChpc09iamVjdChhcmcpKSB7XG4gICAgICAgICAgICBmb3IgKGsgaW4gYXJnKSB7XG4gICAgICAgICAgICAgICAgcmUgPSBuZXcgUmVnRXhwKCdcXFxceycgKyBrICsgJ1xcXFx9JywgJ2cnKTtcbiAgICAgICAgICAgICAgICBzID0gcy5yZXBsYWNlKHJlLCBmb3JtYXRBcmcoYXJnW2tdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzID0gcy5yZXBsYWNlKHJlX2VtcHR5LCBmb3JtYXRBcmcoYXJnKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHM7XG59O1xuIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ2pxdWVyeScsICdwbm90aWZ5JywgJ3Bub3RpZnkuYnV0dG9ucyddLCBmYWN0b3J5KTtcbiAgICAgICAgLy9kZWZpbmUoWydqcXVlcnknXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgICAgIHJvb3QuUFlNID0gZmFjdG9yeShyb290LiQpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKCQpIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlXG4gICAgICovXG4gICAgdmFyIHJjXG4gICAgICAgIDtcblxuICAgIC8qKlxuICAgICAqIFB1YmxpYyBBUElcbiAgICAgKi9cbiAgICB2YXIgbXkgPSB7fTtcblxuICAgIG15LmNzcmZfdG9rZW4gPSAnJztcbiAgICBteS5iYXNlX3VybCA9ICcnO1xuXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uIChyYykge1xuICAgICAgICB0aGlzLnJjID0gcmM7XG4gICAgICAgIHRoaXMuY3NyZl90b2tlbiA9IHJjWydjc3JmX3Rva2VuJ107XG4gICAgICAgIHRoaXMuYmFzZV91cmwgPSByY1snYmFzZV91cmwnXTtcbiAgICAgICAgbXkuaW5pdF9ncm93bCgpO1xuICAgICAgICBteS5pbml0X3B5bShyYyk7XG4gICAgICAgIC8vbXkuaW5pdF9hamF4KCk7XG4gICAgfTtcblxuICAgIG15LmluaXRfZ3Jvd2wgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFBOb3RpZnkucHJvdG90eXBlLm9wdGlvbnMub3BhY2l0eSA9IDAuOTtcbiAgICAgICAgUE5vdGlmeS5wcm90b3R5cGUub3B0aW9ucy5zdHlsaW5nID0gJ2ZvbnRhd2Vzb21lJztcbiAgICB9O1xuXG4gICAgbXkuaW5pdF9weW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIEVuYWJsZSBob3ZlciBjc3MgZm9yIGJ1dHRvbnNcbiAgICAgICAgJCgnYnV0dG9uLnVpLXN0YXRlLWRlZmF1bHQnKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCd1aS1zdGF0ZS1ob3ZlcicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUNsYXNzKCd1aS1zdGF0ZS1ob3ZlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKlxuICAgIG15LmluaXRfYWpheCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAkLmFqYXhTZXR1cCh7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ1gtWFNSRi1Ub2tlbic6IHRoYXQuY3NyZl90b2tlblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJCgnYm9keScpLmFqYXhFcnJvcihmdW5jdGlvbiAoZXZ0LCBqcVhIUiwgYWpheFNldHRpbmdzLCB0aHJvd25FcnJvcikge1xuICAgICAgICAgICAgdmFyIHJlc3AgPSB7fTtcbiAgICAgICAgICAgIHJlc3Aua2luZCA9ICdlcnJvcic7XG4gICAgICAgICAgICBpZiAoanFYSFIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHMgPSBqcVhIUi5yZXNwb25zZVRleHQucmVwbGFjZSgvXFxuL2csICcjJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL14uKjxoMT4vZ2ksICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPFxcLz9bXj5dKz4vZ2ksICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvI3syLH0vZywgJyMnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvIytcXHMqJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyMvZywgJzxiciAvPicpO1xuICAgICAgICAgICAgICAgIHJlc3AudGV4dCA9IHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNwLnRleHQgPSBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzcC50aXRsZSA9ICdBamF4IEVycm9yJztcbiAgICAgICAgICAgIHJlc3AuaW5zZXJ0X2JycyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhhdC5ncm93bChyZXNwKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogU29ydCBzZWxlY3QgbGlzdCBieSB0ZXh0XG4gICAgICpcbiAgICAgKiBodHRwOi8vc2ViYXN0aWVuYXlvdHRlLndvcmRwcmVzcy5jb20vMjAwOS8wOC8wNC9zb3J0aW5nLWRyb3AtZG93bi1saXN0LXdpdGgtanF1ZXJ5L1xuICAgICAqL1xuICAgIG15LnNvcnRfc2VsZWN0X2J5X3RleHQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAkKGUpLmh0bWwoJChcIm9wdGlvblwiLCAkKGUpKS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYS50ZXh0ID09IGIudGV4dCA/IDAgOiBhLnRleHQgPCBiLnRleHQgPyAtMSA6IDFcbiAgICAgICAgfSkpO1xuICAgIH07XG5cbiAgICBteS5wYXJzZV9nZXRfcGFyYW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZWFyY2ggPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKC9eXFw/KFteI10rKS8pWzFdXG4gICAgICAgICAgICAsIHBhcmFtID0gc2VhcmNoLnNwbGl0KC9cXCYvKVxuICAgICAgICAgICAgLCBpXG4gICAgICAgICAgICAsIG1heGkgPSBwYXJhbS5sZW5ndGhcbiAgICAgICAgICAgICwga3ZcbiAgICAgICAgICAgICwgZGF0YSA9IHt9XG4gICAgICAgICAgICA7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtYXhpOyBpKyspIHtcbiAgICAgICAgICAgIGt2ID0gcGFyYW1baV0uc3BsaXQoLz0vKTtcbiAgICAgICAgICAgIGRhdGFbZGVjb2RlVVJJQ29tcG9uZW50KGt2WzBdKV0gPSBkZWNvZGVVUklDb21wb25lbnQoa3ZbMV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb29raWUgb2JqZWN0XG4gICAgICpcbiAgICAgKiBDb2RlIGluc3BpcmVkIGJ5IGh0dHA6Ly93d3cucXVpcmtzbW9kZS5vcmcvanMvY29va2llcy5odG1sXG4gICAgICovXG4gICAgbXkuY29va2llID0ge1xuICAgICAgICB3cml0ZTogZnVuY3Rpb24gKG5hbWUsIHZhbHVlLCBkYXlzLCBwYXRoKSB7XG4gICAgICAgICAgICBpZiAoZGF5cykge1xuICAgICAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBkYXRlLnNldFRpbWUoZGF0ZS5nZXRUaW1lKCkrKGRheXMqMjQqNjAqNjAqMTAwMCkpO1xuICAgICAgICAgICAgICAgIHZhciBleHBpcmVzID0gJzsgZXhwaXJlcz0nICsgZGF0ZS50b0dNVFN0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB2YXIgZXhwaXJlcyA9ICcnO1xuICAgICAgICAgICAgaWYgKCEgcGF0aCkgcGF0aCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXC9bXi9dKiQvLCAnLycpO1xuICAgICAgICAgICAgZG9jdW1lbnQuY29va2llID0gbmFtZSArICc9JyArIHZhbHVlICsgZXhwaXJlc1xuICAgICAgICAgICAgICAgICsgJzsgcGF0aD0nICsgcGF0aDtcbiAgICAgICAgfVxuXG4gICAgICAgICwgcmVhZDogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBuYW1lRVEgPSBuYW1lICsgXCI9XCI7XG4gICAgICAgICAgICB2YXIgY2EgPSBkb2N1bWVudC5jb29raWUuc3BsaXQoJzsnKTtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wO2kgPCBjYS5sZW5ndGg7aSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGMgPSBjYVtpXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoYy5jaGFyQXQoMCk9PScgJykgYyA9IGMuc3Vic3RyaW5nKDEsIGMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBpZiAoYy5pbmRleE9mKG5hbWVFUSkgPT0gMClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGMuc3Vic3RyaW5nKG5hbWVFUS5sZW5ndGgsIGMubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLCBkZWxldGU6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBQWU0uY29va2llLndyaXRlKG5hbWUsICcnLCAtMSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuZ3Jvd2wgPSBmdW5jdGlvbihtc2cpIHtcbiAgICAgICAgaWYgKCEgbXNnLmtpbmQpIG1zZy5raW5kID0gJ25vdGljZSc7XG4gICAgICAgIGlmICghIG1zZy50aXRsZSkgbXNnLnRpdGxlID0gbXNnLmtpbmQ7XG4gICAgICAgIC8vIFB1dCB0aW1lc3RhbXAgaW50byB0aXRsZVxuICAgICAgICAvLyBXZSBnZXQgdGltZSBhcyBVVENcbiAgICAgICAgdmFyIGR0O1xuICAgICAgICBpZiAobXNnLnRpbWUpIHtcbiAgICAgICAgICAgIGR0ID0gbmV3IERhdGUoRGF0ZS5VVEMobXNnLnRpbWVbMF0sIG1zZy50aW1lWzFdLCBtc2cudGltZVsyXSwgbXNnLnRpbWVbM10sXG4gICAgICAgICAgICAgICAgbXNnLnRpbWVbNF0sIG1zZy50aW1lWzVdKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgbXNnLnRpdGxlID0gbXNnLnRpdGxlXG4gICAgICAgICAgICArICc8YnI+PHNwYW4gc3R5bGU9XCJmb250LXdlaWdodDpub3JtYWw7Zm9udC1zaXplOnh4LXNtYWxsO1wiPidcbiAgICAgICAgICAgICsgZHQudG9TdHJpbmcoKVxuICAgICAgICAgICAgKyAnPC9zcGFuPic7XG4gICAgICAgIC8vIFNldHVwIHR5cGUsIGljb24gYW5kIHBlcnNpc3RhbmNlIGFjY29yZGluZyB0byBraW5kXG4gICAgICAgIHZhciBpY29uO1xuICAgICAgICBzd2l0Y2ggKG1zZy5raW5kWzBdKSB7XG4gICAgICAgICAgICBjYXNlICduJzpcbiAgICAgICAgICAgICAgICBtc2cudHlwZSA9ICdub3RpY2UnO1xuICAgICAgICAgICAgICAgIGljb24gPSAnZmEgdWktaWNvbi1jb21tZW50JztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2knOlxuICAgICAgICAgICAgICAgIG1zZy50eXBlID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGljb24gPSAnZmEgdWktaWNvbi1pbmZvJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgICAgIG1zZy50eXBlID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIGljb24gPSAnZmEgZmEtZXhjbGFtYXRpb24nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgICAgICAgICAgaWNvbiA9ICdmYSAgZmEtZXhjbGFtYXRpb24tdHJpYW5nbGUnO1xuICAgICAgICAgICAgICAgIG1zZy50eXBlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2YnOlxuICAgICAgICAgICAgICAgIGljb24gPSAnZmEgZmEtZXhjbGFtYXRpb24tdHJpYW5nbGUnO1xuICAgICAgICAgICAgICAgIG1zZy50eXBlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3MnOlxuICAgICAgICAgICAgICAgIGljb24gPSAnZmEgZmEtY2hlY2snO1xuICAgICAgICAgICAgICAgIG1zZy50eXBlID0gJ3N1Y2Nlc3MnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghIG1zZy5pY29uKSBtc2cuaWNvbiA9IGljb247XG4gICAgICAgIG1zZy5oaWRlID0gISAobXNnLmtpbmRbMF0gPT0gJ2UnIHx8IG1zZy5raW5kWzBdID09ICdmJyk7XG5cdFx0bXNnLmJ1dHRvbnMgPSB7XG4gICAgICAgICAgICBjbG9zZXI6IHRydWUsXG4gICAgICAgICAgICBzdGlja2VyOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIG1zZy5oaXN0b3J5ID0geyBtZW51OiB0cnVlIH07XG4gICAgICAgIC8vIFNob3cgbWVzc2FnZVxuICAgICAgICBuZXcgUE5vdGlmeShtc2cpO1xuICAgIH07XG5cbiAgICBteS5ncm93bF9hamF4X3Jlc3AgPSBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICB2YXIgaSwgaW1heCA9IHJlc3AubXNncy5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBpbWF4OyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZ3Jvd2wocmVzcC5tc2dzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW1heCA8IDEpIHtcbiAgICAgICAgICAgIGlmIChyZXNwLm9rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ncm93bCh7a2luZDogJ3N1Y2Nlc3MnLCB0ZXh0OiAnT2snfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdyb3dsKHtraW5kOiAnd2FybmluZycsIHRleHQ6ICdVbnNwZWNpZmllZCBlcnJvciBvY2N1cnJlZCd9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBCaW5kcyBnaXZlbiBtZXRob2QgdG8gZ2l2ZW4gb2JqZWN0LlxuICAgICAqXG4gICAgICogQnkgbWVhbnMgb2YgYSB3cmFwcGVyLCBlbnN1cmVzIHRoYXQgYGBtZXRob2RgYCBpcyBhbHdheXMgYm91bmQgdG9cbiAgICAgKiBgYG9iamVjdGBgIHJlZ2FyZGxlc3Mgb2YgaXRzIGNhbGxpbmcgZW52aXJvbm1lbnQuXG4gICAgICogSW93LCBpbnNpZGUgYGBtZXRob2RgYCwgYGB0aGlzYGAgYWx3YXlzIHBvaW50cyB0byBgYG9iamVjdGBgLlxuICAgICAqXG4gICAgICogU2VlIGh0dHA6Ly9hbGlzdGFwYXJ0LmNvbS9hcnRpY2xlL2dldG91dGJpbmRpbmdzaXR1YXRpb25zXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH1cbiAgICAgKiBAcGFyYW0ge21ldGhvZH1cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAgICovXG4gICAgbXkuY3JlYXRlQm91bmRlZFdyYXBwZXIgPSBmdW5jdGlvbiAob2JqZWN0LCBtZXRob2QpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZC5hcHBseShvYmplY3QsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0pKTtcblxuIiwiZGVmaW5lKFBZTV9BUFBfUkVRVUlSRU1FTlRTLFxuICAgICAgICAgICAvLyBuZywgICAgICBweW0vcHltXG5mdW5jdGlvbiAoYW5ndWxhciwgUFlNKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIFB5bUFwcCA9IGFuZ3VsYXIubW9kdWxlKCdQeW1BcHAnLCBQWU1fQVBQX0lOSkVDVFMpO1xuXG4gICAgUHltQXBwLmNvbnN0YW50KCdhbmd1bGFyTW9tZW50Q29uZmlnJywge1xuICAgICAgICB0aW1lem9uZTogJ0V1cm9wZS9CZXJsaW4nXG4gICAgfSk7XG5cbiAgICBQeW1BcHAuY29uZmlnKFxuICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgJyRodHRwUHJvdmlkZXInLCAnJHByb3ZpZGUnLCAndWlTZWxlY3RDb25maWcnLCAnJGNvbXBpbGVQcm92aWRlcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoICRodHRwUHJvdmlkZXIsICAgJHByb3ZpZGUsICAgdWlTZWxlY3RDb25maWcsICAgJGNvbXBpbGVQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIERpc2FibGUgZGVidWcgZGF0YVxuICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICogUmUtZW5hYmxlIGluIGEgZGVidWcgY29uc29sZSB3aXRoOlxuICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICogICAgIGFuZ3VsYXIucmVsb2FkV2l0aERlYnVnSW5mbygpO1xuICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICogU2VlIGh0dHBzOi8vZG9jcy5hbmd1bGFyanMub3JnL2d1aWRlL3Byb2R1Y3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAvLyBXVEY6IE5lZWQgZGVidWcgaW5mbyBiZWNhdXNlIG9mIHVpLXRyZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyLXVpLXRyZWUvYW5ndWxhci11aS10cmVlL2lzc3Vlcy80MDNcbiAgICAgICAgICAgICAgICAvLyRjb21waWxlUHJvdmlkZXIuZGVidWdJbmZvRW5hYmxlZChmYWxzZSk7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogSW50ZXJjZXB0IEhUVFAgZXJyb3JzIHRvIGdyb3dsXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgJHByb3ZpZGUuZmFjdG9yeSgnUHltSHR0cEVycm9ySW50ZXJjZXB0b3InLFxuICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICAnJHEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlamVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUFlNLmdyb3dsKHsna2luZCc6ICdlcnJvcicsICd0aXRsZSc6IHJlamVjdGlvbi5zdGF0dXMsICd0ZXh0JzogcmVqZWN0aW9uLnN0YXR1c1RleHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVqZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ1B5bUh0dHBFcnJvckludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmUtZW5hYmxlIHRoZSBYTUxIdHRwUmVxdWVzdCBoZWFkZXJcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbmZpZ3VyZSB1aS1zZWxlY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB1aVNlbGVjdENvbmZpZy50aGVtZSA9ICdib290c3RyYXAnO1xuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgKTtcblxuXG4gICAgLyoqXG4gICAgICogQGRlc2NyaXB0aW9uIFRvb2xzIGZvciB1aS1ncmlkXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgICAgIDxkaXYgY2xhc3M9XCJweW0tZ3JpZC1mb290ZXJcIj5cbiAgICAgKiAgICAgICAgICA8ZGl2IGNsYXNzPVwicHltLWdyaWQtcGFnaW5hdGlvblwiPlxuICAgICAqICAgICAgICAgICAgICA8cGFnaW5hdGlvbiBjbGFzcz1cInBhZ2luYXRpb24gcGFnaW5hdGlvbi1zbVwiXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLWl0ZW1zPVwiQnJvd3NlR3JpZC5weW0ucGFnZXIudG90YWxJdGVtc1wiXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLXBlci1wYWdlPVwiQnJvd3NlR3JpZC5weW0ucGFnZXIucGFnZVNpemVcIlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICBuZy1tb2RlbD1cIkJyb3dzZUdyaWQucHltLnBhZ2VyLmN1cnJlbnRQYWdlXCJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgbmctY2hhbmdlPVwiQnJvd3NlR3JpZC5weW0ucGFnZXIuY2hhbmdlZCgpXCJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRhcnktbGlua3M9XCJ0cnVlXCJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXMtdGV4dD1cIiZsc2FxdW87XCIgbmV4dC10ZXh0PVwiJnJzYXF1bztcIlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdC10ZXh0PVwiJmxhcXVvO1wiIGxhc3QtdGV4dD1cIiZyYXF1bztcIlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICBtYXgtc2l6ZT1cIjVcIlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgKiAgICAgICAgICAgICAgPC9wYWdpbmF0aW9uPlxuICAgICAqICAgICAgICAgIDwvZGl2PlxuICAgICAqICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGFjZXJcIj48L2Rpdj5cbiAgICAgKiAgICAgICAgICA8ZGl2IGNsYXNzPVwicGFnZVNpemVDaG9vc2VyXCI+XG4gICAgICogICAgICAgICAgICAgIDxzZWxlY3QgbmctbW9kZWw9XCJCcm93c2VHcmlkLnB5bS5wYWdlci5wYWdlU2l6ZVwiXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgbmctY2hhbmdlPVwiQnJvd3NlR3JpZC5weW0ucGFnZXIuc2l6ZUNoYW5nZWQoKVwiXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgbmctb3B0aW9ucz1cInYgZm9yIHYgaW4gQnJvd3NlR3JpZC5weW0ucGFnZXIucGFnZVNpemVzXCJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImZvcm0tY29udHJvbFwiPlxuICAgICAqICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgKiAgICAgICAgICA8L2Rpdj5cbiAgICAgKiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3BhY2VyXCI+PC9kaXY+XG4gICAgICogICAgICAgICAgPGRpdiBjbGFzcz1cInJvd051bWJlcnNcIj57eyhCcm93c2VHcmlkLnB5bS5wYWdlci5jdXJyZW50UGFnZS0xKSpCcm93c2VHcmlkLnB5bS5wYWdlci5wYWdlU2l6ZSsxfX0te3soQnJvd3NlR3JpZC5weW0ucGFnZXIuY3VycmVudFBhZ2UtMSkqQnJvd3NlR3JpZC5weW0ucGFnZXIucGFnZVNpemUrQnJvd3NlR3JpZC5weW0ucGFnZXIubG9hZGVkSXRlbXN9fSBvZiB7e0Jyb3dzZUdyaWQucHltLnBhZ2VyLnRvdGFsSXRlbXN9fTwvZGl2PlxuICAgICAqICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PHB5bS1zcGlubmVyIHN0YXRlPVwiQnJvd3NlR3JpZC5weW0ubG9hZGluZ1wiPjwvcHltLXNwaW5uZXI+PC9kaXY+XG4gICAgICogICAgICA8L2Rpdj5cbiAgICAgKi9cbiAgICBQeW1BcHAuc2VydmljZSgnUHltQXBwLkdyaWRUb29scycsXG4gICAgICAgICAgICAgICAgIFsnJGh0dHAnLCAnJHRpbWVvdXQnLCAndWlHcmlkQ29uc3RhbnRzJyxcbiAgICAgICAgZnVuY3Rpb24gKCAkaHR0cCwgICAkdGltZW91dCwgICB1aUdyaWRDb25zdGFudHMgKSB7XG5cbiAgICAgICAgICAgIC8vID09PVsgRklMVEVSIF09PT09PT09XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQHBhcmFtIGdyaWREZWZcbiAgICAgICAgICAgICAqIEBwYXJhbSBvcHRzXG4gICAgICAgICAgICAgKiBAZGVzY3JpcHRpb24gRmlsdGVyIHByb3ZpZGVzIHRvb2xzIGZvciBleHRlcm5hbCBmaWx0ZXJpbmcuXG4gICAgICAgICAgICAgKiBGaWx0ZXIgZXhwZWN0cyBhbiBvYmplY3Qgd2l0aCB0aGUgZ3JpZCBkZWZpbml0aW9uLlxuICAgICAgICAgICAgICogVGhlIGdyaWREZWYgbXVzdCBoYXZlXG4gICAgICAgICAgICAgKiAgIC0gbWV0aG9kIGBgbG9hZEl0ZW1zKClgYCB0byBsb2FkIHRoZSBpdGVtc1xuICAgICAgICAgICAgICogICAtIHByb3BlcnR5IGBgcHltYGAsIGFuIG9iamVjdCB0aGF0IGdldHMgZmlsbGVkIHdpdGggZ3JpZCB0b29sXG4gICAgICAgICAgICAgKiAgICAgaW5zdGFuY2VzLCBlLmcuIGBgcHltLmZpbHRlcmBgLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIFB1YmxpYyBwcm9wZXJ0aWVzIChzZXQgdmlhIG9wdHMpOlxuICAgICAgICAgICAgICogLSBkZWxheTogTWlsbGlzZWNvbmRzIHRvIHdhaXQgYWZ0ZXIgbGFzdCBjaGFuZ2UgYmVmb3JlIHdlIGNhbGxcbiAgICAgICAgICAgICAqICAgICAgICAgIGBgY2hhbmdlZCgpYGBcbiAgICAgICAgICAgICAqIC0gZmlsdGVyVGV4dDogdGhlIGZpbHRlciBjcml0ZXJpb25cbiAgICAgICAgICAgICAqIC0gZmlsdGVyRmllbGQ6IG5hbWUgb2YgdGhlIGZpZWxkIHRvIGZpbHRlclxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIFNwZWNpZnkgb3VyIHByb3BlcnR5IGBgZmlsdGVyVGV4dGBgIGFzIG1vZGVsIG9mIGZpbHRlciBpbnB1dCBmaWVsZC5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBBdHRhY2ggb3VyIG1ldGhvZCBgYGNoYW5nZWQoKWBgIGFzIGhhbmRsZXIgb2YgdGhlIGNoYW5nZVxuICAgICAgICAgICAgICogZXZlbnQgb2YgdGhlIGZpbHRlciB0ZXh0IGlucHV0IGZpZWxkLlxuICAgICAgICAgICAgICogWW91IG1heSBvdmVycmlkZSB0aGlzIGZ1bmN0aW9uOyBieSBkZWZhdWx0LCB3ZSBqdXN0IGNhbGxcbiAgICAgICAgICAgICAqIGdyaWREZWYncyBgYGxvYWRJdGVtcygpYGAgYW5kIHJlc2V0IHRoZSBjdXJyZW50IHBhZ2UgdG8gMSBpZiBhXG4gICAgICAgICAgICAgKiBwYWdlciBpcyBwcmVzZW50LlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAgICAgKiAgICRzY29wZS5Ccm93c2VHcmlkID0ge1xuICAgICAgICAgICAgICogICAgICBweW06IHt9LFxuICAgICAgICAgICAgICogICAgICBsb2FkSXRlbXM6IGZ1bmN0aW9uICgpLFxuICAgICAgICAgICAgICogICB9O1xuICAgICAgICAgICAgICogICAkc2NvcGUuYnJvd3NlRmlsdGVyID0gR3JpZFRvb2xzLmF0dGFjaEZpbHRlcigkc2NvcGUuQnJvd3NlR3JpZCwgb3B0cyk7XG4gICAgICAgICAgICAgKiAgICRzY29wZS5Ccm93c2VHcmlkLmxvYWRJdGVtcygpO1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YXIgRmlsdGVyID0gZnVuY3Rpb24gRmlsdGVyKGdyaWREZWYsIG9wdHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWREZWYgPSBncmlkRGVmO1xuICAgICAgICAgICAgICAgIHRoaXMuZGVsYXkgPSA1MDA7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZhdGlvblN0YXRlID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmFsbG93ZWRPcGVyYXRvcnMgPSBbXG4gICAgICAgICAgICAgICAgICAgICc9JywgJzwnLCAnPD0nLCAnPicsICc+PScsICchPScsXG4gICAgICAgICAgICAgICAgICAgICchJywgJ34nLCAnIX4nXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEZpbHRlci5wcm90b3R5cGUuYnVpbGRGaWx0ZXIgPSBmdW5jdGlvbiAoZ3JpZCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZmlsID0gW107XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGdyaWQuY29sdW1ucywgZnVuY3Rpb24gKGNvbCkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29sLmZpbHRlcnMsIGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZi50ZXJtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9wLCB0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wID0gZi50ZXJtWzBdICsgZi50ZXJtWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQgPSBmLnRlcm0uc2xpY2UoMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHJ5IDEnLCBvcCwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWxsb3dlZE9wZXJhdG9ycy5pbmRleE9mKG9wKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3AgPSBmLnRlcm1bMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQgPSBmLnRlcm0uc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cnkgMicsIG9wLCB0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWxsb3dlZE9wZXJhdG9ycy5pbmRleE9mKG9wKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wID0gJ2xpa2UnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCA9IGYudGVybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3AgPT0gJyEnKSBvcCA9ICchbGlrZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsLnB1c2goW2NvbC5maWVsZCwgb3AsICdpJywgdF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmZpbHRlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmZpbHRlciA9IFsnYScsIGZpbF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzZWxmLmdyaWREZWYucHltLnBhZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZ3JpZERlZi5weW0ucGFnZXIuY3VycmVudFBhZ2UgPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLmdyaWREZWYubG9hZEl0ZW1zKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIEZpbHRlci5wcm90b3R5cGUuY2hhbmdlZCA9IGZ1bmN0aW9uIChncmlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVyKSAkdGltZW91dC5jYW5jZWwodGhpcy50aW1lcik7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciA9ICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5idWlsZEZpbHRlci5jYWxsKHNlbGYsIGdyaWQpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMuZGVsYXkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgRmlsdGVyLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBtaWdodCBnZXQgY2FsbGVkIGJlZm9yZSBncmlkQXBpIHdhcyBwdWJsaXNoZWQuXG4gICAgICAgICAgICAgICAgaWYgKCEgdGhpcy5ncmlkRGVmLmFwaSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGlzLmdyaWREZWYuYXBpLmdyaWQuY29sdW1ucywgZnVuY3Rpb24gKGNvbCkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29sLmZpbHRlcnMsIGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmLnRlcm0gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbHRlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGaWx0ZXIucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG9nZ2xpbmcnKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuYWN0aXZhdGlvblN0YXRlID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hY3RpdmF0aW9uU3RhdGUgPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzZWxmLmFjdGl2YXRpb25TdGF0ZSA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYWN0aXZhdGlvblN0YXRlID0gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc2VsZi5hY3RpdmF0aW9uU3RhdGUgPT0gMikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmFjdGl2YXRpb25TdGF0ZSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuZ3JpZERlZi5hcGkuY29yZS5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25ldyBhY3RpdmF0aW9uU3RhdGUnLCBzZWxmLmFjdGl2YXRpb25TdGF0ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgICAgICogQG1ldGhvZE9mIEZpbHRlclxuICAgICAgICAgICAgICogQG5hbWUgYXBwbHlQYXJhbXNcbiAgICAgICAgICAgICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGN1cnJlbnQgZmlsdGVyIHRvIGdpdmVuIG9iamVjdCBvZlxuICAgICAgICAgICAgICogICAgIHF1ZXJ5IHBhcmFtZXRlcnMuIEtleSBpcyBgYGZpbGBgIGFuZCB2YWx1ZSBpcyBKU09OLXN0cmluZ2lmaWVkXG4gICAgICAgICAgICAgKiAgICAgZmlsdGVyLCBvciBudWxsLiBHaXZlbiBvYmplY3QgaXMgY2hhbmdlZCBpbi1wbGFjZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgVGhlIG9iamVjdCBvZiBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBGaWx0ZXIucHJvdG90eXBlLmFwcGx5UGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZpbHRlciAmJiB0aGlzLmZpbHRlclsxXSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZmlsID0gSlNPTi5zdHJpbmdpZnkodGhpcy5maWx0ZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmZpbCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGSUxURVInLCBwYXJhbXMuZmlsKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuYXR0YWNoRmlsdGVyID0gZnVuY3Rpb24gKGdyaWREZWYsIG9wdHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlsdGVyID0gbmV3IEZpbHRlcihncmlkRGVmLCBvcHRzKTtcbiAgICAgICAgICAgICAgICBncmlkRGVmLnB5bS5maWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vID09PVsgUEFHRVIgXT09PT09PT1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBAcGFyYW0gZ3JpZERlZlxuICAgICAgICAgICAgICogQHBhcmFtIG9wdHNcbiAgICAgICAgICAgICAqIEBkZXNjcmlwdGlvbiBQYWdlciBwcm92aWRlcyB0b29scyBmb3IgZXh0ZXJuYWwgcGFnaW5nLlxuICAgICAgICAgICAgICogUGFnZXIgZXhwZWN0cyBhbiBvYmplY3Qgd2l0aCB0aGUgZ3JpZCBkZWZpbml0aW9uLlxuICAgICAgICAgICAgICogVGhlIGdyaWREZWYgbXVzdCBoYXZlXG4gICAgICAgICAgICAgKiAgIC0gbWV0aG9kIGBgbG9hZEl0ZW1zKClgYCB0byBsb2FkIHRoZSBpdGVtc1xuICAgICAgICAgICAgICogICAtIHByb3BlcnR5IGBgcHltYGAsIGFuIG9iamVjdCB0aGF0IGdldHMgZmlsbGVkIHdpdGggZ3JpZCB0b29sXG4gICAgICAgICAgICAgKiAgICAgaW5zdGFuY2VzLCBlLmcuIGBgcHltLnNvcnRlcmBgLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIFB1YmxpYyBwcm9wZXJ0aWVzIChzZXQgdmlhIG9wdHMpOlxuICAgICAgICAgICAgICogICAtIGN1cnJlbnRQYWdlOyBzdGFydHMgd2l0aCAxXG4gICAgICAgICAgICAgKiAgIC0gdG90YWxJdGVtczsgbnVtYmVyIG9mIHRvdGFsIGl0ZW1zIGluIHJlc3VsdCBzZXRcbiAgICAgICAgICAgICAqICAgLSBsb2FkZWRJdGVtczsgbnVtYmVyIG9mIGl0ZW1zIGxvYWRlZCwgbWlnaHQgYmUgc21hbGxlciB0aGFuXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgIHBhZ2VTaXplLCBlLmcuIG9uIGxhc3QgcGFnZVxuICAgICAgICAgICAgICogICAtIHBhZ2VTaXplOyBkZWZhdWx0IDEwMFxuICAgICAgICAgICAgICogICAtIHBhZ2VTaXplczogTGlzdCBvZiBhbGxvd2VkIHBhZ2Ugc2l6ZXMsIGUuZy4gZm9yIGEgc2VsZWN0IGJveFxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEF0dGFjaCBvdXIgbWV0aG9kIGBgY2hhbmdlZCgpYGAgYXMgaGFuZGxlciBvZiBkaXJlY3RpdmUncyBjaGFuZ2VcbiAgICAgICAgICAgICAqIGV2ZW50LiBZb3UgbWF5IG92ZXJyaWRlIHRoaXMgZnVuY3Rpb247IGJ5IGRlZmF1bHQsIHdlIGp1c3QgY2FsbFxuICAgICAgICAgICAgICogZ3JpZERlZidzIGBgbG9hZEl0ZW1zKClgYC5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgICAgICogICAkc2NvcGUuQnJvd3NlR3JpZCA9IHtcbiAgICAgICAgICAgICAqICAgICAgcHltOiB7fSxcbiAgICAgICAgICAgICAqICAgICAgbG9hZEl0ZW1zOiBmdW5jdGlvbiAoKSxcbiAgICAgICAgICAgICAqICAgfTtcbiAgICAgICAgICAgICAqICAgJHNjb3BlLmJyb3dzZVBhZ2VyID0gR3JpZFRvb2xzLmF0dGFjaFBhZ2VyKCRzY29wZS5Ccm93c2VHcmlkLCBvcHRzKTtcbiAgICAgICAgICAgICAqICAgJHNjb3BlLkJyb3dzZUdyaWQubG9hZEl0ZW1zKCk7XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhciBQYWdlciA9IGZ1bmN0aW9uIFBhZ2VyKGdyaWREZWYsIG9wdHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWREZWYgPSBncmlkRGVmO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMudG90YWxJdGVtcyA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkZWRJdGVtcyA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5wYWdlU2l6ZSA9IDEwMDtcbiAgICAgICAgICAgICAgICB0aGlzLnBhZ2VTaXplcyA9IFsxMDAsIDIwMCwgNTAwXTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIFBhZ2VyLnByb3RvdHlwZS5jaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBwLCBtYXggPSBNYXRoLmNlaWwodGhpcy50b3RhbEl0ZW1zIC8gdGhpcy5wYWdlU2l6ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFBhZ2UgPT0gJycpIHJldHVybjtcbiAgICAgICAgICAgICAgICBwID0gcGFyc2VJbnQodGhpcy5jdXJyZW50UGFnZSk7XG4gICAgICAgICAgICAgICAgaWYgKCEgcCkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICBpZiAocCA8IDEpIHsgcCA9IDE7IH1cbiAgICAgICAgICAgICAgICBpZiAocCA+IG1heCkgeyBwID0gbWF4OyB9XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UGFnZSA9IHA7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkRGVmLmxvYWRJdGVtcygpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgUGFnZXIucHJvdG90eXBlLnNpemVDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZERlZi5sb2FkSXRlbXMoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIFBhZ2VyLnByb3RvdHlwZS5maXJzdFJvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHRoaXMuY3VycmVudFBhZ2UgLSAxKSAqIHRoaXMucGFnZVNpemUgKyAxO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgUGFnZXIucHJvdG90eXBlLmxhc3RSb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh0aGlzLmN1cnJlbnRQYWdlIC0gMSkgKiB0aGlzLnBhZ2VTaXplICsgdGhpcy5sb2FkZWRJdGVtcztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgICAgICogQG1ldGhvZE9mIFB5bUFwcC5zZXJ2aWNlOiBQeW1BcHAuR3JpZFRvb2xzLlBhZ2VyXG4gICAgICAgICAgICAgKiBAbmFtZSBhcHBseVBhcmFtc1xuICAgICAgICAgICAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgY3VycmVudCBwYWdlIGFuZCBwYWdlIHNpemUgdG8gZ2l2ZW4gb2JqZWN0IG9mXG4gICAgICAgICAgICAgKiAgICAgcXVlcnkgcGFyYW1ldGVycy4gS2V5cyBhcmUgYGBwZ2BgIGZvciBjdXJyZW50IHBhZ2UgYW5kIGBgcHNgYFxuICAgICAgICAgICAgICogICAgIGZvciBwYWdlIHNpemUuIEdpdmVuIG9iamVjdCBpcyBjaGFuZ2VkIGluLXBsYWNlLiBBcHBsaWVkXG4gICAgICAgICAgICAgKiAgICAgcGFnZSBudW1iZXIgKGBgcGdgYCkgaXMgemVyby1iYXNlZCwgd2hlcmUtYXMgcGFnZSBudW1iZXJcbiAgICAgICAgICAgICAqICAgICBtYWludGFpbmVkIGluIFBhZ2VyIG9iamVjdCBpcyBvbmUtYmFzZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIFRoZSBvYmplY3Qgb2YgcXVlcnkgcGFyYW1ldGVycy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgUGFnZXIucHJvdG90eXBlLmFwcGx5UGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wZyA9IHRoaXMuY3VycmVudFBhZ2UgLSAxO1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wcyA9IHRoaXMucGFnZVNpemU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBQYWdlci5wcm90b3R5cGUudXBkYXRlSXRlbUNvdW50ID0gZnVuY3Rpb24gKHRvdGFsSXRlbXMsIGxvYWRlZEl0ZW1zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b3RhbEl0ZW1zID0gdG90YWxJdGVtcztcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRlZEl0ZW1zID0gbG9hZGVkSXRlbXM7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEBuZ2RvYyBtZXRob2RcbiAgICAgICAgICAgICAqIEBtZXRob2RPZiBQeW1BcHAuc2VydmljZTogUHltQXBwLkdyaWRUb29sc1xuICAgICAgICAgICAgICogQG5hbWUgYXR0YWNoUGFnZXJcbiAgICAgICAgICAgICAqIEBkZXNjcmlwdGlvbiBBdHRhY2hlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHBhZ2VyIHRvIHRoZSBnaXZlblxuICAgICAgICAgICAgICogICAgIGdyaWQgZGVmaW5pdGlvbiBvYmplY3QuIFBhZ2VyIGluc3RhbmNlIGlzIHRoZW4gYXZhaWxhYmxlIGFzXG4gICAgICAgICAgICAgKiAgICAgYGBncmlkRGVmLnB5bS5wYWdlcmBgLlxuICAgICAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGdyaWREZWYgVGhlIG9iamVjdCB3aXRoIGdyaWQgZGVmaW5pdGlvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRzIEFkZGl0aW9uYWwgb3B0aW9ucyB0byBwYXNzIHRvIHBhZ2VyXG4gICAgICAgICAgICAgKiAgICAgY29uc3RydWN0b3IuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIEluc3RhbmNlIG9mIHRoZSBwYWdlci5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hQYWdlciA9IGZ1bmN0aW9uIChncmlkRGVmLCBvcHRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhZ2VyID0gbmV3IFBhZ2VyKGdyaWREZWYsIG9wdHMpO1xuICAgICAgICAgICAgICAgIGdyaWREZWYucHltLnBhZ2VyID0gcGFnZXI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhZ2VyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gPT09WyBTT1JURVIgXT09PT09PT1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBAcGFyYW0gZ3JpZERlZlxuICAgICAgICAgICAgICogQHBhcmFtIG9wdHNcbiAgICAgICAgICAgICAqIEBkZXNjcmlwdGlvbiBTb3J0ZXIgcHJvdmlkZXMgdG9vbHMgZm9yIGV4dGVybmFsIHNvcnRpbmcuXG4gICAgICAgICAgICAgKiBTb3J0ZXIgZXhwZWN0cyBhbiBvYmplY3Qgd2l0aCB0aGUgZ3JpZCBkZWZpbml0aW9uLlxuICAgICAgICAgICAgICogVGhlIGdyaWREZWYgbXVzdCBoYXZlXG4gICAgICAgICAgICAgKiAgIC0gaGFzaCBgYG9wdGlvbnMuaW5kZXhlZENvbHVtbkRlZnNgYCB0aGF0XG4gICAgICAgICAgICAgKiAgICAgaW5kZXhlcyBjb2x1bW5EZWZzIGJ5IGZpZWxkIG5hbWVcbiAgICAgICAgICAgICAqICAgLSBtZXRob2QgYGBsb2FkSXRlbXMoKWBgIHRvIGxvYWQgdGhlIGl0ZW1zXG4gICAgICAgICAgICAgKiAgIC0gcHJvcGVydHkgYGBweW1gYCwgYW4gb2JqZWN0IHRoYXQgZ2V0cyBmaWxsZWQgd2l0aCBncmlkIHRvb2xcbiAgICAgICAgICAgICAqICAgICBpbnN0YW5jZXMsIGUuZy4gYGBweW0uc29ydGVyYGAuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogVGhlIG9wdGlvbnMgaGFzaCBteSBoYXZlIGtleXMgYGBzb3J0RGVmYGAgYW5kIGBgaW5pdGlhbFNvcnREZWZgYCxcbiAgICAgICAgICAgICAqIGVhY2ggY29udGFpbmluZyBhIGxpc3Qgb2YgMy10dXBsZXMgKGZpZWxkX25hbWUsIGRpcmVjdGlvbiwgcHJpb3JpdHkpLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIGBgc29ydERlZmBgIGlzIGluaXRpYWxseSBlbXB0eSBhbmQgd2lsbCBjb250YWluIHRoZSBzZXR0aW5nc1xuICAgICAgICAgICAgICogd2hlbiB0aGUgZ3JpZCBlbWl0cyBhIHNvcnQgY2hhbmdlZCBldmVudC5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBgYGluaXRpYWxTb3J0RGVmYGAgY29udGFpbnMgdGhlIHNvcnQgZGVmaW5pdGlvbiB0aGUgZ3JpZCBpc1xuICAgICAgICAgICAgICogaW5pdGlhbGx5IHNvcnRlZCBieS5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgICAgICogICAkc2NvcGUuQnJvd3NlR3JpZCA9IHtcbiAgICAgICAgICAgICAqICAgICAgcHltOiB7fSxcbiAgICAgICAgICAgICAqICAgICAgbG9hZEl0ZW1zOiBmdW5jdGlvbiAoKSxcbiAgICAgICAgICAgICAqICAgICAgb3B0aW9ucy5pbmRleGVkQ29sdW1uRGVmczoge30sXG4gICAgICAgICAgICAgKiAgICAgIG9uUmVnaXN0ZXJBcGk6IGZ1bmN0aW9uKGdyaWRBcGkpIHtcbiAgICAgICAgICAgICAqICAgICAgICAgICRzY29wZS5icm93c2VHcmlkQXBpID0gZ3JpZEFwaTtcbiAgICAgICAgICAgICAqICAgICAgICAgICRzY29wZS5icm93c2VHcmlkQXBpLmNvcmUub24uc29ydENoYW5nZWQoXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgJHNjb3BlLCBQWU0uY3JlYXRlQm91bmRlZFdyYXBwZXIoXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmJyb3dzZVNvcnRlcixcbiAgICAgICAgICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuYnJvd3NlU29ydGVyLmdyaWRTb3J0Q2hhbmdlZFxuICAgICAgICAgICAgICogICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgKiAgICAgICAgICApO1xuICAgICAgICAgICAgICogICAgICB9XG4gICAgICAgICAgICAgKiAgIH07XG4gICAgICAgICAgICAgKiAgICRzY29wZS5Ccm93c2VHcmlkLmluZGV4Q29sdW1uRGVmcygpO1xuICAgICAgICAgICAgICogICAkc2NvcGUuYnJvd3NlU29ydGVyID0gR3JpZFRvb2xzLmF0dGFjaFNvcnRlcigkc2NvcGUuQnJvd3NlR3JpZCwge30pO1xuICAgICAgICAgICAgICogICAkc2NvcGUuQnJvd3NlR3JpZC5sb2FkSXRlbXMoKTtcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFyIFNvcnRlciA9IGZ1bmN0aW9uIFNvcnRlcihncmlkRGVmLCBvcHRzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkRGVmID0gZ3JpZERlZjtcbiAgICAgICAgICAgICAgICB0aGlzLm9wdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNvcnREZWY6IFtdLFxuICAgICAgICAgICAgICAgICAgICAvLyBEZWZpbmUgaW5pdGlhbCBzb3J0IGhlcmVcbiAgICAgICAgICAgICAgICAgICAgaW5pdGlhbFNvcnREZWY6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFsnaWQnLCAnZGVzYycsIDBdXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMub3B0cywgb3B0cyk7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkQXBwbHlJbml0aWFsU29ydCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgU29ydGVyLnByb3RvdHlwZS5ncmlkU29ydENoYW5nZWQgPSBmdW5jdGlvbiAoZ3JpZCwgc29ydENvbHVtbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgc2VsZi5vcHRzLnNvcnREZWYgPSBbXTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc29ydENvbHVtbnMsIGZ1bmN0aW9uIChjb2wpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRzLnNvcnREZWYucHVzaChbY29sLmZpZWxkLCBjb2wuc29ydC5kaXJlY3Rpb24sIGNvbC5zb3J0LnByaW9yaXR5XSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCEgc2VsZi5vcHRzLnNvcnREZWYubGVuZ3RoKSBzZWxmLm9wdHMuc29ydERlZiA9IHNlbGYub3B0cy5pbml0aWFsU29ydERlZi5zbGljZSgwKTtcbiAgICAgICAgICAgICAgICBzZWxmLmdyaWREZWYubG9hZEl0ZW1zKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgU29ydGVyLnByb3RvdHlwZS5ncmlkQXBwbHlJbml0aWFsU29ydCA9IGZ1bmN0aW9uIChpc2QpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKGlzZCkgc2VsZi5vcHRzLmluaXRpYWxTb3J0RGVmID0gaXNkO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLm9wdHMuaW5pdGlhbFNvcnREZWYsIGZ1bmN0aW9uIChzZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmdyaWREZWYub3B0aW9ucy5pbmRleGVkQ29sdW1uRGVmc1tzZFswXV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IHNkWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IHNkWzJdXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc2VsZi5vcHRzLnNvcnREZWYgPSBzZWxmLm9wdHMuaW5pdGlhbFNvcnREZWYuc2xpY2UoMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgU29ydGVyLnByb3RvdHlwZS5nZXRGaWVsZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLCB2diA9IFtdO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLm9wdHMuc29ydERlZiwgZnVuY3Rpb24gKHNkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZ2LnB1c2goc2RbMF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB2djtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBTb3J0ZXIucHJvdG90eXBlLmdldERpcmVjdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLCB2diA9IFtdO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLm9wdHMuc29ydERlZiwgZnVuY3Rpb24gKHNkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZ2LnB1c2goc2RbMV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB2djtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBTb3J0ZXIucHJvdG90eXBlLmdldFByaW9yaXRpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLCB2diA9IFtdO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLm9wdHMuc29ydERlZiwgZnVuY3Rpb24gKHNkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZ2LnB1c2goc2RbMl0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB2djtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgICAgICogQG1ldGhvZE9mIFB5bUFwcC5zZXJ2aWNlOiBQeW1BcHAuR3JpZFRvb2xzLlNvcnRlclxuICAgICAgICAgICAgICogQG5hbWUgYXBwbHlQYXJhbXNcbiAgICAgICAgICAgICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGN1cnJlbnQgc29ydCBzZXR0aW5ncyB0byBnaXZlbiBvYmplY3Qgb2ZcbiAgICAgICAgICAgICAqICAgICBxdWVyeSBwYXJhbWV0ZXJzLiBLZXlzIGFyZSBgYHNmYGAgZm9yIGN1cnJlbnQgZmllbGRzLCBgYHNkYGBcbiAgICAgICAgICAgICAqICAgICBmb3IgZGlyZWN0aW9ucyBhbmQsIGBgc3BgYCBmb3IgcHJpb3JpdGllcy4gVGhlIHZhbHVlIG9mIGVhY2hcbiAgICAgICAgICAgICAqICAgICBrZXkgaXMgYSBsaXN0IHdpdGggdGhlIGFwcHJvcHJpYXRlIGNvbHVtbiBuYW1lcy4gR2l2ZW4gb2JqZWN0XG4gICAgICAgICAgICAgKiAgICAgaXMgY2hhbmdlZCBpbi1wbGFjZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgVGhlIG9iamVjdCBvZiBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBTb3J0ZXIucHJvdG90eXBlLmFwcGx5UGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5zZiA9IHRoaXMuZ2V0RmllbGRzKCk7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnNkID0gdGhpcy5nZXREaXJlY3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnNwID0gdGhpcy5nZXRQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEBuZ2RvYyBtZXRob2RcbiAgICAgICAgICAgICAqIEBtZXRob2RPZiBQeW1BcHAuc2VydmljZTogUHltQXBwLkdyaWRUb29sc1xuICAgICAgICAgICAgICogQG5hbWUgYXR0YWNoU29ydGVyXG4gICAgICAgICAgICAgKiBAZGVzY3JpcHRpb24gQXR0YWNoZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBzb3J0ZXIgdG8gdGhlIGdpdmVuXG4gICAgICAgICAgICAgKiAgICAgZ3JpZCBkZWZpbml0aW9uIG9iamVjdC4gU29ydGVyIGluc3RhbmNlIGlzIHRoZW4gYXZhaWxhYmxlIGFzXG4gICAgICAgICAgICAgKiAgICAgYGBncmlkRGVmLnB5bS5zb3J0ZXJgYC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBncmlkRGVmIFRoZSBvYmplY3Qgd2l0aCBncmlkIGRlZmluaXRpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0cyBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gcGFzcyB0byBzb3J0ZXJcbiAgICAgICAgICAgICAqICAgICBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICAgICAqIEByZXR1cm4gSW5zdGFuY2Ugb2YgdGhlIHNvcnRlci5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hTb3J0ZXIgPSBmdW5jdGlvbiAoZ3JpZERlZiwgb3B0cykge1xuICAgICAgICAgICAgICAgIHZhciBzb3J0ZXIgPSBuZXcgU29ydGVyKGdyaWREZWYsIG9wdHMpO1xuICAgICAgICAgICAgICAgIGdyaWREZWYucHltLnNvcnRlciA9IHNvcnRlcjtcbiAgICAgICAgICAgICAgICByZXR1cm4gc29ydGVyO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gPT09WyBFTkhBTkNFTUVOVFMgXT09PT09PT1cblxuICAgICAgICAgICAgZnVuY3Rpb24gaW5kZXhDb2x1bW5EZWZzIChSQykge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpczsgLy8gV2lsbCByZWZlcmVuY2UgdGhlIGdyaWREZWYgb2JqZWN0XG4gICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLmluZGV4ZWRDb2x1bW5EZWZzID0ge307XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNlbGYub3B0aW9ucy5jb2x1bW5EZWZzLCBmdW5jdGlvbiAoY2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLmluZGV4ZWRDb2x1bW5EZWZzW2NkLm5hbWUgfHwgY2QuZmllbGRdID0gY2Q7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKFJDICYmIFJDLmNvbF9kaXNwbGF5X25hbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLm9wdGlvbnMuY29sdW1uRGVmcywgZnVuY3Rpb24gKGNkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjZFsnZGlzcGxheU5hbWUnXSA9IFJDLmNvbF9kaXNwbGF5X25hbWVzW2NkLm5hbWUgfHwgY2QuZmllbGRdO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgICAgICogQG1ldGhvZE9mIFB5bUFwcC5zZXJ2aWNlOiBQeW1BcHAuR3JpZFRvb2xzXG4gICAgICAgICAgICAgKiBAbmFtZSBsb2FkSXRlbXNcbiAgICAgICAgICAgICAqIEBkZXNjcmlwdGlvbiBMb2FkcyB0aGUgaXRlbXMgZm9yIHRoZSBncmlkLiBJdCByZWdhcmRzIG9wdGlvbmFsbHlcbiAgICAgICAgICAgICAqICAgICBhdmFpbGFibGUgc29ydGVyLCBwYWdlciBhbmQgZmlsdGVyLiBJdCBoYW5kbGVzIHRoZSBzcGlubmVyXG4gICAgICAgICAgICAgKiAgICAgYW5kIHVwZGF0ZXMgdGhlIHBhZ2VyJ3MgaXRlbSBjb3VudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIEdFVCBVUkwgdG8gbG9hZCBmcm9tLlxuICAgICAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGh0dHBDb25mIE9iamVjdCB3aXRoIGFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3JcbiAgICAgICAgICAgICAqICAgICBmb3IgdGhlIHJlcXVlc3QuIEl0ICptdXN0KiBoYXZlIHByb3BlcnR5IGBgcGFyYW1zYGAgc2V0IGFzIGFcbiAgICAgICAgICAgICAqICAgICBuZXN0ZWQgb2JqZWN0LCBiZWNhdXNlIHdlIGFwcGx5IGFsbCBxdWVyeSBwYXJhbWV0ZXJzIGhlcmUuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIEEgcHJvbWlzZSB0aGF0IHRoZSBjYWxsZXIgY2FuIGNoYWluIHRvIHdpdGggYGAudGhlbigpYGAuXG4gICAgICAgICAgICAgKiAgICAgVGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNoYWluZWQgcmVzb2x2ZSBhbmQgcmVqZWN0IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogICAgIGFyZSB0aGUgb3JpZ2luYWwgb25lcy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb24gbG9hZEl0ZW1zKHVybCwgaHR0cENvbmYpIHtcbiAgICAgICAgICAgICAgICAvLyBgYHRoaXNgYCBwb2ludHMgdG8gdGhlIGBgcHltYGAgbmFtZXNwYWNlIG9mIHRoZSBncmlkRGVmXG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBodHRwQ29uZi5wYXJhbXM7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZmlsdGVyKSBzZWxmLmZpbHRlci5hcHBseVBhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLnNvcnRlcikgc2VsZi5zb3J0ZXIuYXBwbHlQYXJhbXMocGFyYW1zKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5wYWdlcikgc2VsZi5wYWdlci5hcHBseVBhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgICAgIHNlbGYubG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCh1cmwsIGh0dHBDb25mKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwLmRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3AuZGF0YS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLnBhZ2VyKSBzZWxmLnBhZ2VyLnVwZGF0ZUl0ZW1Db3VudChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS50b3RhbCwgZGF0YS5yb3dzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5weW0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQGRlc2NyaXB0aW9uIEVuaGFuY2VzIGdpdmVuIGdyaWQgZGVmaW5pdGlvbi5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiAtIEluc2VydHMgbWV0aG9kIGBgaW5kZXhDb2x1bW5EZWZzKClgYCB0aGF0IGluZGV4ZXMgdGhlXG4gICAgICAgICAgICAgKiAgIGBgb3B0aW9ucy5jb2x1bW5EZWZzYGAgaW50byBgYG9wdGlvbnMuaW5kZXhlZENvbHVtbkRlZnNgYCBieVxuICAgICAgICAgICAgICogICB0aGVpciBgYGZpZWxkYGAgcHJvcGVydGllcy5cbiAgICAgICAgICAgICAqIC0gSW5pdHMgcHJvcGVydHkgYGBweW1gYCB0byBiZWNvbWUgYW4gb2JqZWN0IGNvbnRhaW5lciBmb3JcbiAgICAgICAgICAgICAqICAgb3RoZXIgZ3JpZCB0b29sIGluc3RhbmNlcyBsaWtlIHNvcnRlciBldGMuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogQHBhcmFtIGdyaWREZWZcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5lbmhhbmNlID0gZnVuY3Rpb24gKGdyaWREZWYpIHtcbiAgICAgICAgICAgICAgICBncmlkRGVmLnB5bSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc29ydGVyOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBwYWdlcjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbG9hZEl0ZW1zOiBsb2FkSXRlbXNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGdyaWREZWYub3B0aW9ucy5pbmRleGVkQ29sdW1uRGVmcyA9IHt9O1xuICAgICAgICAgICAgICAgIGdyaWREZWYuaW5kZXhDb2x1bW5EZWZzID0gaW5kZXhDb2x1bW5EZWZzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfV1cbiAgICApO1xuXG4gICAgLyoqXG4gICAgICogQW5ndWxhckpTIGRlZmF1bHQgZmlsdGVyIHdpdGggdGhlIGZvbGxvd2luZyBleHByZXNzaW9uOlxuICAgICAqIFwicGVyc29uIGluIHBlb3BsZSB8IGZpbHRlcjoge25hbWU6ICRzZWxlY3Quc2VhcmNoLCBhZ2U6ICRzZWxlY3Quc2VhcmNofVwiXG4gICAgICogcGVyZm9ybXMgYSBBTkQgYmV0d2VlbiAnbmFtZTogJHNlbGVjdC5zZWFyY2gnIGFuZCAnYWdlOiAkc2VsZWN0LnNlYXJjaCcuXG4gICAgICogV2Ugd2FudCB0byBwZXJmb3JtIGEgT1IuXG4gICAgICpcbiAgICAgKiBMaWZ0ZWQgZnJvbSBhbmd1bGFyIHVpIHNlbGVjdFxuICAgICAqIGh0dHA6Ly9wbG5rci5jby9lZGl0L2p1cW9OT3QxejFHYjM0OVhhYlEyP3A9cHJldmlld1xuICAgICAqL1xuICAgIFB5bUFwcC5maWx0ZXIoJ3Byb3BzRmlsdGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbXMsIHByb3BzKSB7XG4gICAgICAgIHZhciBvdXQgPSBbXTtcblxuICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgdmFyIGl0ZW1NYXRjaGVzID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgIHZhciBwcm9wID0ga2V5c1tpXTtcbiAgICAgICAgICAgICAgdmFyIHRleHQgPSBwcm9wc1twcm9wXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICBpZiAoaXRlbVtwcm9wXS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0ZXh0KSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBpdGVtTWF0Y2hlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGl0ZW1NYXRjaGVzKSB7XG4gICAgICAgICAgICAgIG91dC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIExldCB0aGUgb3V0cHV0IGJlIHRoZSBpbnB1dCB1bnRvdWNoZWRcbiAgICAgICAgICBvdXQgPSBpdGVtcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgUHltQXBwLmRpcmVjdGl2ZSgncHltU3Bpbm5lcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgc3RhdGU6ICc9J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnPGkgY2xhc3M9XCJmYSBmYS1zcGlubmVyIGZhLXNwaW5cIiBuZy1zaG93PVwic3RhdGVcIj48L2k+J1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgUHltQXBwLmRpcmVjdGl2ZSgncHltR3JpZEZvb3RlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICAgICAgICB0ZW1wbGF0ZTogJydcbiAgICAgICAgICAgICAgICArJzxkaXYgY2xhc3M9XCJweW0tZ3JpZC1mb290ZXJcIiBuZy10cmFuc2NsdWRlPidcbiAgICAgICAgICAgICAgICArJzwvZGl2PidcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIFB5bUFwcC5kaXJlY3RpdmUoJ3B5bUdyaWRUb2dnbGVGaWx0ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGdyaWRGaWx0ZXI6ICc9J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnJ1xuICAgICAgICAgICAgICAgICsnPGJ1dHRvbiBjbGFzcz1cInB5bS1ncmlkLXRvZ2dsZS1maWx0ZXIgYnRuIGJ0bi1kZWZhdWx0IGZvcm0tY29udHJvbCBpbnB1dC1zbVwiIG5nLWNsaWNrPVwiZ3JpZEZpbHRlci50b2dnbGUoKVwiPidcbiAgICAgICAgICAgICAgICArICAnPGkgY2xhc3M9XCJmYSBmYS1maWx0ZXJcIj48L2k+J1xuICAgICAgICAgICAgICAgICsnPC9idXR0b24+J1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgUHltQXBwLmRpcmVjdGl2ZSgncHltR3JpZFBhZ2luYXRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIGdyaWRQYWdlcjogJz0nLFxuICAgICAgICAgICAgICAgIHNwaW5uZXI6ICc9J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnJ1xuICAgICAgICAgICAgICAgICsnICA8ZGl2IGNsYXNzPVwicHltLWdyaWQtcGFnaW5hdGlvblwiPidcbiAgICAgICAgICAgICAgICArICAgICAgJzxwYWdpbmF0aW9uIGNsYXNzPVwicGFnaW5hdGlvbiBwYWdpbmF0aW9uLXNtXCInXG4gICAgICAgICAgICAgICAgKyAgICAgICAgICAgICAgICAgICd0b3RhbC1pdGVtcz1cImdyaWRQYWdlci50b3RhbEl0ZW1zXCInXG4gICAgICAgICAgICAgICAgKyAgICAgICAgICAgICAgICAgICdpdGVtcy1wZXItcGFnZT1cImdyaWRQYWdlci5wYWdlU2l6ZVwiJ1xuICAgICAgICAgICAgICAgICsgICAgICAgICAgICAgICAgICAnbmctbW9kZWw9XCJncmlkUGFnZXIuY3VycmVudFBhZ2VcIidcbiAgICAgICAgICAgICAgICArICAgICAgICAgICAgICAgICAgJ25nLWNoYW5nZT1cImdyaWRQYWdlci5jaGFuZ2VkKClcIidcbiAgICAgICAgICAgICAgICArICAgICAgICAgICAgICAgICAgJ2JvdW5kYXJ5LWxpbmtzPVwidHJ1ZVwiJ1xuICAgICAgICAgICAgICAgICsgICAgICAgICAgICAgICAgICAncHJldmlvdXMtdGV4dD1cIiZsc2FxdW87XCIgbmV4dC10ZXh0PVwiJnJzYXF1bztcIidcbiAgICAgICAgICAgICAgICArICAgICAgICAgICAgICAgICAgJ2ZpcnN0LXRleHQ9XCImbGFxdW87XCIgbGFzdC10ZXh0PVwiJnJhcXVvO1wiJ1xuICAgICAgICAgICAgICAgICsgICAgICAgICAgICAgICAgICAnbWF4LXNpemU9XCIzXCInXG4gICAgICAgICAgICAgICAgKyAgICAgICAgICAgICAgJz4nXG4gICAgICAgICAgICAgICAgKyAgICAgICc8L3BhZ2luYXRpb24+J1xuICAgICAgICAgICAgICAgICsnICA8L2Rpdj4nXG4gICAgICAgICAgICAgICAgKyAgICc8ZGl2IGNsYXNzPVwicGFnZVwiPidcbiAgICAgICAgICAgICAgICArICAgICc8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5nLW1vZGVsPVwiZ3JpZFBhZ2VyLmN1cnJlbnRQYWdlXCInXG4gICAgICAgICAgICAgICAgKyAgICAgICAgICAgICduZy1jaGFuZ2U9XCJncmlkUGFnZXIuY2hhbmdlZCgpXCInXG4gICAgICAgICAgICAgICAgKyAgICAgICAgICAgICdjbGFzcz1cImZvcm0tY29udHJvbCBpbnB1dC1zbVwiPidcbiAgICAgICAgICAgICAgICArJyAgPC9kaXY+J1xuICAgICAgICAgICAgICAgICsnICA8ZGl2IGNsYXNzPVwicGFnZS1zaXplLWNob29zZXJcIj4nXG4gICAgICAgICAgICAgICAgKyAgICAnPHNlbGVjdCBuZy1tb2RlbD1cImdyaWRQYWdlci5wYWdlU2l6ZVwiJ1xuICAgICAgICAgICAgICAgICsgICAgICAgICAgICAnbmctY2hhbmdlPVwiZ3JpZFBhZ2VyLnNpemVDaGFuZ2VkKClcIidcbiAgICAgICAgICAgICAgICArICAgICAgICAgICAgJ25nLW9wdGlvbnM9XCJ2IGZvciB2IGluIGdyaWRQYWdlci5wYWdlU2l6ZXNcIidcbiAgICAgICAgICAgICAgICArICAgICAgICAgICAgJ2NsYXNzPVwiZm9ybS1jb250cm9sIGlucHV0LXNtXCI+J1xuICAgICAgICAgICAgICAgICsgICAgJzwvc2VsZWN0PidcbiAgICAgICAgICAgICAgICArJyAgPC9kaXY+J1xuICAgICAgICAgICAgICAgICsnICA8ZGl2IGNsYXNzPVwic3BhY2VyXCI+PC9kaXY+J1xuICAgICAgICAgICAgICAgICsnICA8ZGl2IGNsYXNzPVwicm93LW51bWJlcnNcIj57e2dyaWRQYWdlci5maXJzdFJvdygpfG51bWJlcn19LXt7Z3JpZFBhZ2VyLmxhc3RSb3coKXxudW1iZXJ9fSBvZiB7e2dyaWRQYWdlci50b3RhbEl0ZW1zfG51bWJlcn19PC9kaXY+J1xuICAgICAgICAgICAgICAgICsnICA8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjxweW0tc3Bpbm5lciBzdGF0ZT1cInNwaW5uZXJcIj48L3B5bS1zcGlubmVyPjwvZGl2PidcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIHJldHVybiBQeW1BcHA7XG59KTtcbiIsIi8qKlxuICogYm9vdHN0cmFwcyBhbmd1bGFyIG9udG8gdGhlIHdpbmRvdy5kb2N1bWVudCBub2RlXG4gKi9cblxuZGVmaW5lKFsnbmcnLCAncHltL2FwcCddLCBmdW5jdGlvbiAoYW5ndWxhcikge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHJlcXVpcmUoWydyZXF1aXJlanMvZG9tUmVhZHkhJ10sIGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICAgICAgICBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCwgWydQeW1BcHAnXSk7XG4gICAgfSk7XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==