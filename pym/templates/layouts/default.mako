<%namespace name="pym" file="pym:templates/lib/pym.mako" inheritable="True"/>

<!DOCTYPE html>
<html class="no-js" lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><%block name="meta_title">${request.registry['rc'].g('project.title')}
    % if 'project.subtitle' in request.registry.settings:
        <small>${request.registry['rc'].g('project.subtitle')}</small>
    % endif
    </%block></title>
    <meta name="description" content="<%block name="meta_descr">${request.registry['rc'].g('project.description')}</%block>">
    <meta name="keywords" content="<%block name="meta_keywords">${request.registry['rc'].g('project.keywords')}</%block>">
    <meta name="author" content="<%block name="meta_author">${request.registry['rc'].g('project.author')}</%block>">
    <%block name="styles">
        <link rel="stylesheet" href="${request.static_url('pym:static/assets/css/pym-1.css')}">
    % if request.registry['rc'].g('environment') != 'production':
        <link rel="stylesheet" href="${request.static_url('pym:static/assets/css/styles-' + request.registry['rc'].g('environment') + '.css')}">
    % endif
    </%block>
    <%block name="scripts">
        <script>var XSRF_TOKEN = '${request.session.get_csrf_token()}', INTERNET_ERROR = false;</script>
        <!--[if lt IE 11]>
        <script>INTERNET_ERROR = true;</script>
        <![endif]-->
        <!--[if lt IE 12]>
        <script src="${request.static_url('pym:static/node_modules/es6-shim/es6-shim.min.js')}"></script>
        <script src="${request.static_url('pym:static/node_modules/systemjs/dist/system-polyfills.js')}"></script>
        <script src="${request.static_url('pym:static/node_modules/angular2/es6/dev/src/testing/shims_for_IE.js')}"></script>
        <![endif]-->
        <script src="${request.static_url('pym:static/node_modules/angular2/bundles/angular2-polyfills.min.js')}"></script>
        <script src="${request.static_url('pym:static/jspm_packages/system.js')}"></script>
        <script src="${request.static_url('pym:static/node_modules/rxjs/bundles/Rx.min.js')}"></script> <%doc>RXJS NEEDS TO BE FROM NODE MODULES!</%doc>
        <script src="${request.static_url('pym:static/node_modules/angular2/bundles/angular2.min.js')}"></script>
        <script src="${request.static_url('pym:static/node_modules/angular2/bundles/http.min.js')}"></script>
    <%doc>
    - Cannot use DefaultJSExtensions: angular loader gets confused
    - Cannot use baseUrl: angular loader gets confused
    - Cannot use JSPM setup for angular2: angular then loads each module separately and ignores the bundle
    </%doc>
        <script src="${request.static_url('pym:static/app/config.js')}"></script>
    ## BEGIN PRODUCTION
##            <script src="${request.static_url('pym:static/app/all-bundle.js')}"></script>
            ## END PRODUCTION
            ## BEGIN DEVELOPMENT

        <script>
            var PYM_PAGE_RC = {
                wantedLanguages: ${h.json_serializer(h.wanted_languages(request))|n},
                isAuth: ${1 if request.user.is_auth() else 0} ? true : false,
            };
            if (INTERNET_ERROR) {
                System.import('app/app/bootstrap');
            }
            else {
                System.import('app/app/bootstrap').catch(console.error.bind(console));  // IE does not like bind() here
            }
        </script>
    ## END DEVELOPMENT
        </%block>
</head>
<body>
<template id="app-content-html">
    <div id="page_container"><!-- BEGIN #page_container -->

        <%include file="pym:templates/layouts/page_header.mako" args="parent=self, pym=pym" />

        <div id="page_content"><!-- BEGIN #page_content -->
            <zippy (open)="sayOpen()" (close)="sayClose()" title="Details">
                <p>This is some content.</p>
            </zippy>
            <clicker></clicker>
            <hr>

                    <span id="testDropdown1" ngb-dropdown [is-open]="false" auto-close="never">
                        <button class="btn btn-secondary" tabindex="0" ngb-dropdown-toggle style="cursor: pointer;">
                            Test Dropdown 1<span class="caret"></span>
                        </button>
                        <div ngb-dropdown-menu role="menu" class="ng-cloak">
                            <a class="dropdown-item">Gimly</a>
                            <a class="dropdown-item">Oin</a>
                            <a class="dropdown-item">Gloin</a>
                        </div>
                    </span>



            <hr>
            ${next.body()}
        </div><!-- END #page_content -->

    </div><!-- END #page_container -->
    <%include file="pym:templates/layouts/page_footer.mako" />
</template>
<script>
    PYM_PAGE_RC.appContent = document.getElementById('app-content-html').innerHTML;
</script>
<app></app>
<noscript>
    <div class="alert alert-warning">
        <strong><i class="fa fa-warning"></i>&nbsp;Please enable JavaScript.</strong>
        Parenchym requires your browser to have JavaScript enabled. <a href="http://enable-javascript.com" target="_blank" class="alert-link">Learn more</a>
    </div>
</noscript>
<!--[if lt IE 11]>
<div class="alert alert-warning">
    <i class="fa fa-warning"></i>&nbsp;You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.
</div>
<![endif]-->
</body>
</html>
