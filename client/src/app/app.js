define(PYM_APP_REQUIREMENTS,
           // ng
function (angular) {
    'use strict';

    var PymApp = angular.module('PymApp', PYM_APP_INJECTS);

    PymApp.constant('angularMomentConfig', {
        timezone: 'Europe/Berlin'
    });

    PymApp.config(
        [
                     '$provide', '$httpProvider', 'uiSelectConfig', '$compileProvider', 'pymServiceProvider',
            function ($provide,   $httpProvider,   uiSelectConfig,   $compileProvider,   pymServiceProvider) {
                /**
                 * Intercept HTTP errors to growl
                 */
                $provide.factory('PymHttpErrorInterceptor',
                    [
                        '$q', 'pymService',
                        function ($q, pym) {
                            return {
                                responseError: function (rejection) {
                                    pym.growler.growl({'kind': 'error', 'title': rejection.status, 'text': rejection.statusText});
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
                * angular-pnotify aka notificationServiceProvider
                */
                pymServiceProvider.setDefaults({
                    growler: {
                        delay: 7000,
                        opacity: 0.9,
                        styling: 'fontawesome',
                        buttons: {
                            closer: true,
                            sticker: true
                        },
                        type: 'error'
                    }
                });
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
                            t = f.term.slice(2);
                            console.log('try 1', op, t);
                            if (self.allowedOperators.indexOf(op) < 0) {
                                op = f.term[0];
                                t = f.term.slice(1);
                                console.log('try 2', op, t);
                                if (self.allowedOperators.indexOf(op) < 0) {
                                    op = 'like';
                                    t = f.term;
                                }
                            }
                            if (op === '!') {op = '!like';}
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
            };

            Filter.prototype.changed = function (grid) {
                var self = this;
                if (this.timer) {$timeout.cancel(this.timer);}
                this.timer = $timeout(function () {
                    self.buildFilter.call(self, grid);
                }, this.delay);
            };

            Filter.prototype.clear = function () {
                // We might get called before gridApi was published.
                if (! this.gridDef.api) {return;}
                angular.forEach(this.gridDef.api.grid.columns, function (col) {
                    angular.forEach(col.filters, function (f) {
                        f.term = null;
                    });
                });
                this.filter = null;
            };

            Filter.prototype.toggle = function () {
                console.log('toggling');
                var self = this;
                if (self.activationState === 0) {
                    self.activationState = 1;
                }
                else if (self.activationState === 1) {
                    self.activationState = 2;
                }
                else if (self.activationState === 2) {
                    self.activationState = 0;
                }
                self.gridDef.api.core.refresh();
                console.log('new activationState', self.activationState);
            };

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
                console.log('FILTER', params.fil);
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
                if (this.currentPage === '') {return;}
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
                if (! self.opts.sortDef.length) {self.opts.sortDef = self.opts.initialSortDef.slice(0);}
                self.gridDef.loadItems();
            };
            Sorter.prototype.gridApplyInitialSort = function (isd) {
                var self = this;
                if (isd) {self.opts.initialSortDef = isd;}
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
                        cd.displayName = RC.col_display_names[cd.name || cd.field];
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
                if (self.filter) {self.filter.applyParams(params);}
                if (self.sorter) {self.sorter.applyParams(params);}
                if (self.pager) {self.pager.applyParams(params);}
                self.loading = true;
                return $http.get(url, httpConf)
                    .then(function (resp) {
                        var data = resp.data.data;
                        self.loading = false;
                        if (resp.data.ok) {
                            if (self.pager) {
                                self.pager.updateItemCount(
                                    data.total, data.rows.length
                                );
                            }
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


    /**
     * Wrapper to use pnotify as angular service.
     */
    PymApp.provider('pymService', [ function() {

        var log, q;

        var conf = {
            growler: {
                delay: 7000,
                opacity: 0.9,
                styling: 'fontawesome',
                buttons: {
                    closer: true,
                    sticker: true
                },
                type: 'error'
            }
        };

        this.setDefaults = function(defaults) {
            conf = defaults;
            return this;
        };

        var Growler = {
            stacks: {},
            defaultStack: false,

            initGrowlerOpts: function(stackName) {
                var opts = angular.copy(conf.growler);

                if ((stackName || (stackName = this.defaultStack)) &&
                        stackName in this.stacks) {
                    opts.stack = this.stacks[stackName].stack;
                    if (this.stacks[stackName].addclass) {
                        opts.addclass = ('addclass' in opts
                            ? opts.addclass + ' '
                              + this.stacks[stackName].addclass
                              : this.stacks[stackName].addclass);
                    }
                }
                return opts;
            },

            setStack: function(name, addclass, stack) {
                if (angular.isObject(addclass)) {
                    stack = addclass;
                    addclass = false;
                }

                this.stacks[name] = {
                    stack: stack,
                    addclass: addclass
                };
                return this;
            },
            
            setDefaultStack: function(name) {
                this.defaultStack = name;
                return this;
            },

            notice: function(text, title, stack) {
                var opts = this.initGrowlerOpts(stack);
                opts.type = 'notice';
                opts.title = title;
                opts.text = text;
                return this.growl(opts);
            },

            info: function(text, title, stack) {
                var opts = this.initGrowlerOpts(stack);
                opts.type = 'info';
                opts.title = title;
                opts.text = text;
                return this.growl(opts);
            },

            warn: function(text, title, stack) {
                var opts = this.initGrowlerOpts(stack);
                opts.type = 'warn';
                opts.title = title;
                opts.text = text;
                return this.growl(opts);
            },

            success: function(text, title, stack) {
                var opts = this.initGrowlerOpts(stack);
                opts.type = 'success';
                opts.title = title;
                opts.text = text;
                return this.growl(opts);
            },

            error: function(text, title, stack) {
                var opts = this.initGrowlerOpts(stack);
                opts.type = 'error';
                opts.title = title;
                opts.text = text;
                return this.growl(opts);
            },

            growl: function(msg, stack) {
                if (! msg.kind) { msg.kind = msg.type ? msg.type : 'notice'; }
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
                if (! msg.title) { msg.title = msg.kind.charAt(0).toUpperCase() + msg.kind.slice(1); }
                msg.title = msg.title
                    + '<br><span style="font-weight:normal;font-size:xx-small;">'
                    + dt.toString()
                    + '</span>';
                // Setup type, icon and persistance according to kind
                switch (msg.kind[0]) {
                    case 'n':
                        msg.type = 'notice';
                        break;
                    case 'i':
                        msg.type = 'info';
                        break;
                    case 'w':
                        msg.type = 'warning';
                        break;
                    case 'e':
                        msg.type = 'error';
                        break;
                    case 'f':
                        msg.type = 'error';
                        break;
                    case 's':
                        msg.type = 'success';
                        break;
                }
                msg.hide = ! (msg.kind[0] === 'e' || msg.kind[0] === 'f');
                msg.buttons = {
                    closer: true,
                    sticker: true
                };
                msg.history = { menu: true };

                var defaults = this.initGrowlerOpts(stack);
                var combined = angular.extend(defaults, msg);
                return new PNotify(combined);
            },

            confirm: function (text, title) {
                var msg = {
                    title: title || 'Please confirm',
                    text: text,
                    icon: 'fa fa-question',
                    hide: false,
                    confirm: {
                        confirm: true
                    },
                    buttons: {
                        closer: false,
                        sticker: false
                    },
                    history: {
                        history: false
                    }
                }, dfrr;
                dfrr = q.defer();
                new PNotify(msg).get().on(
                    'pnotify.confirm', function () {
                        log.log('CONFIRMED');
                        dfrr.resolve();
                    }
                ).on(
                    'pnotify.cancel', function () {
                        log.log('NOT CONFIRMED');
                        dfrr.reject();
                    }
                );
                return dfrr.promise;
            },

            prompt: function (text, title) {
                var msg = {
                    title: title || 'Please enter',
                    text: text,
                    icon: 'fa fa-question',
                    hide: false,
                    confirm: {
                        prompt: true
                    },
                    buttons: {
                        closer: false,
                        sticker: false
                    },
                    history: {
                        history: false
                    }
                }, dfrr;
                dfrr = q.defer();
                new PNotify(msg).get().on(
                    'pnotify.confirm', function (e, notice, val) {
                        dfrr.resolve(val);
                    }
                ).on(
                    'pnotify.cancel', function (e, notice) {
                        dfrr.reject();
                    }
                );
                return dfrr.promise;
            },

            growlAjaxResp: function (resp) {
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
            }
        };


        this.$get = ['$log', '$q', function($log, $q) {
            log = $log;
            q = $q;
            return {
                getConf: function() {
                    return conf;
                },

                /**
                 * Growler API
                 */
                growler: Growler
            };

        }];

    }]);

    return PymApp;
});
