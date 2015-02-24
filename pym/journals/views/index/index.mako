<%inherit file="pym:templates/_layouts/sys.mako" />

<%block name="styles">
${parent.styles()}
</%block>
<%block name="require_config">
	${parent.require_config()}
    PYM_APP_REQUIREMENTS.push(
        'ng-ui-bs'
    );
    PYM_APP_INJECTS.push('ui.bootstrap');
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Journals")}</%block>
<div ng-controller="JournalsCtrl" ng-cloak>
    <div class="outer-gutter">
        <p>Currently we "have" 2 journals:</p>
        <ol>
            <li><a href="${request.resource_url(request.context, Journals.proceedings_of_foo.value['name'])}">Proceedings of Foo</a></li>
            <li><a href="${request.resource_url(request.context, Journals.the_bar.value['name'])}">The Bar</a></li>
        </ol>
        <p>As you will see, each journal has its discussion board at the bottom of the page. Our journals currently consist only of
        one page, but in practice it is possible for each article to have its individual board.</p>
        <p>Look here for an overview about the <a href="https://help.disqus.com/customer/portal/articles/466182-publisher-quick-start-guide">moderation facilities</a>.</p>
        <p>They also implemented some kind of <a href="https://help.disqus.com/customer/portal/articles/466247-user-reputation">User Reputation</a>, but its not what we want (although it might help).</p>
        <p>The service provider is <a href="">Disqus</a>, and the service is for free (don't ask me how they do this). <a href="https://help.disqus.com/customer/portal/articles/1104796">Single-Sign-On</a> can be implemented (meaning, users that logged into
        our site are automatically authenticated within discuss and need not login there again).</p>
    </div>
</div>

<script>
require(['requirejs/domReady!', 'ng',     'pym/pym', 'pym/app'],
function( doc,                   angular,  PYM,       PymApp) {

    PymApp.constant('RC', ${h.json_serializer(rc)|n});

    var JournalsCtrl = PymApp.controller('JournalsCtrl',
            ['$scope', '$http', '$q', '$window', 'RC',
    function ($scope,   $http,   $q,   $window,   RC) {

        $scope.model = {};

        /*
         * Tools menu
         */
        $scope.ToolsMenu = {
            isOpen: false,
            isDisabled: false
        };

        $scope.init = function() {
            // NOOP
        };

        /*
         * Run immediately
         */
        $scope.init();
    }]);

    return JournalsCtrl;
});

</script>
