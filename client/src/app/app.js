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
                $compileProvider.debugInfoEnabled(false);
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
     *          <div class="spinner"><pym-spinner state="BrowseGrid.pym.spinner"></pym-spinner></div>
     *      </div>
     */
    PymApp.service('PymApp.GridTools',
        function (  ) {

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
                this.filterText = '';
                this.filterField = '';
                this.delay = 500;
                angular.extend(this, opts);
                this._timer = null;
            };

            Filter.prototype.changed = function () {
                var self = this;
                if (self._timer) {
                    $timeout.cancel(self._timer);
                }
                self._timer = $timeout(function () {
                    self.gridDef.loadItems();
                    if (self.gridDef.pym.pager) {
                        self.gridDef.pym.pager.currentPage = 1;
                    }
                }, self.delay);
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
            Sorter.prototype.gridApplyInitialSort = function () {
                var self = this;
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
                    spinner: false
                };
                gridDef.options.indexedColumnDefs = {};
                gridDef.indexColumnDefs = indexColumnDefs;
            };
        }
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
            scope: {
                gridPager: '=',
                spinner: '='
            },
            template: ''
                +'<div class="pym-grid-footer">'
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
                +            'class="form-control">'
                +'  </div>'
                +'  <div class="pageSizeChooser">'
                +    '<select ng-model="gridPager.pageSize"'
                +            'ng-change="gridPager.sizeChanged()"'
                +            'ng-options="v for v in gridPager.pageSizes"'
                +            'class="form-control">'
                +    '</select>'
                +'  </div>'
                +'  <div class="spacer"></div>'
                +'  <div class="rowNumbers">{{gridPager.firstRow()|number}}-{{gridPager.lastRow()|number}} of {{gridPager.totalItems|number}}</div>'
                +'  <div class="spinner"><pym-spinner state="spinner"></pym-spinner></div>'
                +'</div>'
        };
    });

    return PymApp;
});
