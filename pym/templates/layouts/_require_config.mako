var require = {
      baseUrl: '${request.resource_url(request.root)}'
    , deps: [
        '${request.static_url('pym:static/app/plugins.js')}',
        '${request.static_url('pym:static/app/boot-ng.js')}'
//        '${request.static_url('pym:static/app/app.min.js')}'
    ]
    , paths: {
          'jquery':          'static-pym/vendor/jquery/dist/jquery.min'
        , 'jq-ui':           'static-pym/vendor/jquery-ui/ui/minified/jquery-ui.min'
        , 'requirejs':       'static-pym/vendor/requirejs'
        , 'd3':              'static-pym/vendor/d3/d3.min'
        , 'pnotify':         'static-pym/vendor/pnotify/pnotify.core'
        , 'pnotify.buttons': 'static-pym/vendor/pnotify/pnotify.buttons'
        , 'select2':         'static-pym/vendor/select2/select2.min'
        , 'ng':              'static-pym/vendor/angular/angular'
        , 'ng-resource':     'static-pym/vendor/angular/angular-resource.min'
        , 'ng-sanitize':     'static-pym/vendor/angular/angular-sanitize.min'
        , 'ng-messages':     'static-pym/vendor/angular/angular-messages.min'
        , 'ng-grid':         'static-pym/vendor/angular-grid/build/ng-grid.min'
        , 'ui-grid':         'static-pym/vendor/ui-grid/ui-grid.min'
        , 'ui-select':       'static-pym/vendor/ui-select/select.min'
        , 'ui-tree':         'static-pym/bower_components/angular-ui-tree/dist/angular-ui-tree.min'
        , 'flexy-layout':    'static-pym/app/flexy-layout/flexy-layout'
        , 'ng-ui':           'static-pym/vendor/angular-ui/build/angular-ui.min'
        , 'ng-ui-select2':   'static-pym/vendor/angular-ui-select2/src/select2'
        , 'ng-ui-bs':        'static-pym/vendor/angular-bootstrap/ui-bootstrap-tpls-0.12.1.min'
        , 'ng-ui-router':    'static-pym/vendor/angular-ui-router/release/angular-ui-router.min'
        , 'moment':          'static-pym/vendor/moment/moment.min'
        , 'angular-moment':  'static-pym/vendor/angular-moment/angular-moment.min'
        , 'ng-fup':          'static-pym/bower_components/ng-file-upload/angular-file-upload.min'
        , 'pym':             'static-pym/app'
        , 'pym-v':           'static-pym/vendor'
        , 'ccg':             'static-ccg/app'
        , 'ccg-v':           'static-ccg/vendor'
        , 'google-client':   'https://apis.google.com/js/client:platform.js?onload=start'
    }
    , shim: {
          'jq-ui':                                ['jquery']
        , 'select2':                              ['ng']
        , 'pnotify.buttons':                      ['pnotify']
        , 'ng':                                   {deps: ['jquery'], exports: 'angular'}
        , 'angular':                              {deps: ['jquery'], exports: 'angular'}
        , 'ng-resource':                          ['ng']
        , 'ng-sanitize':                          ['ng']
        , 'ng-messages':                          ['ng']
        , 'ng-grid':                              ['ng']
        , 'ui-select':                            ['ng', 'ng-sanitize']
        , 'ui-tree':                              ['ng']
        , 'ui-grid':                              ['ng']
        , 'flexy-layout':                         ['ng']
        , 'ng-ui':                                ['ng']
        , 'ng-ui-select2':                        ['ng', 'select2']
        , 'ng-ui-bs':                             ['ng']
        , 'ng-ui-router':                         ['ng']
        , 'ng-fup':                               ['ng']
        , 'google-client':                        ['ng']
    }
    , waitSeconds: 5
};
