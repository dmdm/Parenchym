<%namespace name="pym" file="pym:templates/lib/pym.mako" inheritable="True"/>

<!DOCTYPE html>
<html class="no-js" lang="en">
    <head>
        <meta charset="utf-8">
  		<meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <title><%block name="meta_title">${request.registry.settings['project.title']}
            % if 'project.subtitle' in request.registry.settings:
                <small>${request.registry.settings['project.subtitle']}</small>
            % endif
        </%block></title>
        <meta name="description" content="<%block name="meta_descr">${request.registry.settings['project.description']}</%block>">
        <meta name="keywords"    content="<%block name="meta_keywords">${request.registry.settings['project.keywords']}</%block>">
        <meta name="author"      content="<%block name="meta_author">${request.registry.settings['project.author']}</%block>">
        <%block name="styles">
            <link rel="stylesheet" href="${request.static_url('pym:static/assets/css/pym-1.css')}">
            % if request.registry.settings['environment'] != 'production':
                <link rel="stylesheet" href="${request.static_url('pym:static/assets/css/styles-' + request.registry.settings['environment'] + '.css')}">
            % endif
		</%block>
		<%block name="scripts">
            <script>var XSRF_TOKEN='${request.session.get_csrf_token()}', INTERNET_ERROR=false;</script>
            <!--[if lt IE 11]>
                <script>INTERNET_ERROR=true;</script>
            <![endif]-->
			<script src="${request.static_url('pym:static/jspm_packages/system.js')}"></script>
			<script src="${request.static_url('pym:static/app/config.js')}"></script>
			## BEGIN PRODUCTION
##            <script src="${request.static_url('pym:static/app/all-bundle.js')}"></script>
			## END PRODUCTION
			## BEGIN DEVELOPMENT
            <script>
                if (INTERNET_ERROR) {
                    System.import('app/app/bootstrap-ie');
                }
                else {
                    System.import('app/app/bootstrap').catch(console.error.bind(console));  // IE does not like bind() here
                }
                var PYM_PAGE_RC = {
                    wantedLanguages: ${h.json_serializer(h.wanted_languages(request))|n}
                };
            </script>
			## END DEVELOPMENT
		</%block>
    </head>
    <body>
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
        <div id="page_container"><!-- BEGIN #page_container -->

            <%include file="pym:templates/layouts/page_header.mako" args="parent=self, pym=pym" />

            <div id="page_content"><!-- BEGIN #page_content -->
                  ${next.body()}
            </div><!-- END #page_content -->

		</div><!-- END #page_container -->

        <%include file="pym:templates/layouts/page_footer.mako" />
    </body>
</html>
