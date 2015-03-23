angular.module('pym.fs').factory('pymFsService',
        ['$log', '$http', '$q', '$window', 'RC', 'pymService',
function ($log,   $http,   $q,   $window,   RC,   pym) {

    "use strict";

    var FsService = {
        tree: null,
        browser: null,

        rootPathStr: '',
        path: [],
        prevPath: [],

        globalOptions: {
            includeDeleted: false,
            searchArea: 'here',
            searchFields: 'name',
            search: ''
        },

        onUploadFinished: null,

        lastSearch: {
            path: null,
            incdel: null,
            sarea: null,
            sfields: null,
            s: null
        },
        lastSearchResult: null,

        find: function () {
            if (this.globalOptions.search.length) {
                this.tree.setPathById(-1000);
            }
        },

        refresh: function () {
            this.tree.refresh();
            this.browser.refresh();
        },

        getPath: function () {
            return this.path;
        },

        getPathStr: function () {
            return this.pathToStr(this.path);
        },

        setPath: function (path) {
            if (this.path[this.path.length - 1].id > 0) {
                this.prevPath = this.path;
            }
            this.path = path;
            this.tree.setPath(path);
            this.browser.setPath(path);
        },

        getLeafNode: function () {
            return this.path[this.path.length-1];
        },

        /**
         * Toggles flag includeDeleted and changes path intelligently.
         *
         * If user currently is in a deleted node and decides to not
         * display deleted items anymore, returns to the first not-deleted
         * ancestor.
         *
         * Also reloads tree and browser!
         */
        toggleIncludeDeleted: function () {
            var pp = this.path, p0 = pp[0];
            this.globalOptions.includeDeleted = !this.globalOptions.includeDeleted;
            if (this.getLeafNode().is_deleted && !this.globalOptions.includeDeleted) {
                while (pp.length && pp[pp.length-1].is_deleted) {
                    pp.pop();
                }
                // Make sure, we at least stay on the root node
                if (! pp.length) { pp.push(p0); }
                this.setPath(pp);
            }
            else {
                this.tree.refresh();
                this.browser.refresh();
            }
        },

        /**
         * Initialises Fs by a path string.
         *
         * 1. The page controller calls us with the path string.
         * 2a. We call the browser to load the items of the root path.
         * 2b. Concurrently we call the tree, which loads the initial node tree
         *     and sets up the path as a list of nodes.
         * 3. When the tree has loaded and its path is set up, we grab the path
         *    from there for ourselves and also provide the browser with it.
         *
         * @param {string} pathStr - Root path of tree as string.
         */
        firstLoad: function (pathStr) {
            var self = this;
            this.rootPathStr = pathStr;
            $log.log('firstLoad', this.pathToStr(this.path),  this.rootPathStr);
            this.browser.loadItems();
            this.tree.initNodes()
            .then(function (resp) {
                self.path = self.tree.path;
                self.browser.path = self.path;
            });
        },

        extractMeta: function (nameList) {
            var httpConfig = {},
                postData = {
                    names: nameList,
                    path: this.pathToStr(this.path)
                };
            return $http.put(RC.urls.extract_meta, postData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // Noop
                    }
                    pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        createDirectory: function (dirName) {
            var httpConfig = {},
                postData = {
                    name: dirName,
                    path: this.pathToStr(this.path)
                };
            return $http.post(RC.urls.create_directory, postData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // Noop
                    }
                    pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        deleteItems: function (names, reason) {
            var httpConfig = {
                params: {
                    path: this.pathToStr(this.path),
                    names: names,
                    reason: reason
                }
            };
            return $http.delete(RC.urls.delete_items, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // NOOP
                    }
                    pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        undeleteItems: function (names) {
            var httpConfig = {},
                putData = {
                    path: this.pathToStr(this.path),
                    names: names
                };
            return $http.put(RC.urls.undelete_items, putData, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // NOOP
                    }
                    pym.growler.growlAjaxResp(resp.data);
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        loadItems: function () {
            var self = this,
                httpConfig = {params: {}},
                action = 'load',
                leafNode = this.getLeafNode();

            // The current leaf node tell us which data to load.
            // Handle virtual node
            if (leafNode && leafNode.id <= 0) {
                // Handle search or search results
                if (leafNode.name === 'search') {
                    var searchParams,
                        s = this.globalOptions.search
                            .replace(/^\s+/, '')
                            .replace(/\s+$/, ''),
                        path = this.pathToStr(this.path) || this.rootPathStr;
                    action = 'search';
                    // Assemble search command
                    searchParams = {
                        path: s.length ? path : self.prevPath,
                        incdel: this.globalOptions.includeDeleted,
                        sarea: this.globalOptions.searchArea,
                        sfields: this.globalOptions.searchFields,
                        s: s
                    };
                    // If this command equals the last one, just return our
                    // buffered result.
                    if (angular.equals(searchParams, self.lastSearch)) {
                        var data = {
                                ok: true,
                                data: {
                                    rows: self.lastSearchResult
                                }
                            },
                            dfr = $q.defer();
                        dfr.resolve(data);
                        return dfr.promise;
                    }
                    // Nope, this is a fresh search:
                    else {
                        httpConfig.params = searchParams;
                    }
                }
                else {
                    throw new Error('Unknown virtual node: ' + leafNode.id);
                }
            }
            // Handle regular node / path
            else {
                httpConfig.params = {
                    path: this.pathToStr(this.path) || this.rootPathStr,
                    incdel: this.globalOptions.includeDeleted,
                    sarea: this.globalOptions.searchArea,
                    sfields: this.globalOptions.searchFields,
                    s: ''
                };
            }
            return $http.get(RC.urls.load_items, httpConfig)
                .then(
                function (resp) {
                    // Search results may have both, valid rows and error/warning
                    // messages. So look for rows and not just for the ok flag.
                    if (resp.data.data.rows) {
                        // Process search results
                        if (action === 'search') {
                            // Put them into our buffer
                            self.lastSearchResult = resp.data.data.rows;
                        }
                        // action === 'load' needs no special processing
                    }
                    if (! resp.data.ok) {
                        pym.growler.growlAjaxResp(resp.data);
                    }
                    return resp;
                }, function (result) {
                    return result;
                }
            );
        },

        loadTree: function (filter) {
            var httpConfig = {
                params: {
                    path: this.rootPathStr,
                    filter: filter,
                    incdel: this.globalOptions.includeDeleted
                }
            };
            return $http.get(RC.urls.load_tree, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        // noop
                    }
                    else {
                        pym.growler.growlAjaxResp(resp.data);
                    }
                    return resp;
                },
                function (result) {
                    return result;
                }
            );
        },

        loadFsProperties: function () {
            var httpConfig = {params: {}};
            return $http.get(RC.urls.load_fs_properties, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        return resp;
                    }
                    else {
                        pym.growler.growlAjaxResp(resp.data);
                        return false;
                    }
                },
                function (result) {
                    return result;
                }
            );
        },

        loadItemProperties: function (name) {
            var httpConfig = {
                params: {
                    path: this.pathToStr(this.path),
                    name: name
                }
            };
            return $http.get(RC.urls.load_item_properties, httpConfig)
                .then(
                function (resp) {
                    if (resp.data.ok) {
                        return resp;
                    }
                    else {
                        pym.growler.growlAjaxResp(resp.data);
                        return false;
                    }
                },
                function (result) {
                    return result;
                }
            );
        },

        changeItemAttr: function (itemId, attr, newValue, oldValue) {
            var httpConfig = {},
                putData = {
                    id: itemId,
                    attr: attr,
                    nv: newValue,
                    ov: oldValue
                };
            // Caller need not to differentiate between invalid data and network
            // errors: Return a rejected promise in both cases.
            return $http.put(RC.urls.edit_item, putData, httpConfig)
                .then(
                function (resp) {
                    pym.growler.growlAjaxResp(resp.data);
                    return resp.data.ok ? resp : $q.reject(resp);
                },
                function (result) {
                    return $q.reject(result);
                }
            );
        },

        buildDownloadUrl: function (nameOrEntity) {
            var pp, s, name, entity, uu, loc;
            $log.log(nameOrEntity, typeof nameOrEntity);
            if (angular.isString(nameOrEntity)) {
                name = nameOrEntity;
                // Make local copy of original path
                pp = this.path.slice();
                // Remove filesystem root, because browser is already there:
                // http://HOST:PORT/TENANT/fs/@@_br_
                if (pp[0].name === 'fs') { pp.shift(); }
                // Stringify path and append name
                s = pp.length ? this.pathToStr(pp) + '/' + name : name;
                // Get current url and apply our path string
                return $window.location.href.replace(/@@_br_/, s);
            }
            else {
                entity = nameOrEntity;
                // Get current path from browser and keep only the first 2
                // elements: 0=EMPTY, 1=TENANT. This will discard the 3rd node
                // ("fs") too, because entity.location starts with "fs".
                uu = $window.location.pathname.split('/').slice(0, 2).join('/');
                // From location remove leading /
                s = $window.location.origin + uu + '/'
                    + entity.location + '/' + entity._name;
                $log.log('new path: ', s);
                return s;
            }

        },

        pathToStr: function (path) {
            if (! (angular.isArray(path) && path.length > 0)) { return null; }
            var pp = [];
            angular.forEach(
                path, function (x) {
                    pp.push(x.name);
                }
            );
            return pp.join('/');
        }
    };

    return FsService;
}]);