<%page args="parent, pym" />
<%!
    from pym.res.helper import linkto_help
    from pym.auth.helper import linkto_auth
    from pym.me.helper import linkto_me
    from pym.sys.helper import linkto_sys, execution_permitted_sys
%>
${pym.alert_flash() | n}
<%block name="pageHeader" args="parent, pym">

    <script type="text/ng-template"  id="menu_item_renderer.html">
        <i ng-if="item.children.length > 0" class="fa fa-caret-right pull-right"></i>
        <a href="{{item.href}}">{{item.text}}</a>
        <ul ng-if="item.children.length > 0">
            <li ng-repeat="item in item.children" ng-include="'menu_item_renderer.html'"></li>
        </ul>
    </script>

    <header ng-controller="pym.controller as pymCtrl">
        <div class="row" id="page_header_top_row">
            <div class="col-md-9" style="vertical-align: top;">
                <div id="logo" style="display: table-cell; padding-right: 2em;">
                    <a href="${request.resource_url(request.root)}">
                        <img class="img" src="${request.static_url('pym:static/assets/img/parenchym-logo.png')}" border="0" alt="Parenchym" />
                    </a>
                </div>
                <div class="page-header" style="display: table-cell;">
                    <h1>${parent.meta_title()}</h1>
                </div>
            </div>
            <div class="col-md-3" id="userInfo">

            % if request.user.is_auth():
                <div style="display: inline-block;" class="pull-right hidden-print">
                    <a href="<%block name="help_href_block">${h.url_help(request)}</%block>" target="help">
                        <i class="fa fa-question-circle fa-2x" title="${_('Help')}"></i>
                    </a>
                </div>
            % endif


                <div id="user_display_name" style="display: inline-block;">
                    <span uib-dropdown is-open="pymCtrl.UserMenu.isOpen">
                        <span uib-dropdown-toggle style="cursor: pointer;">
                            ${request.user.display_name}
                            <span class="caret"></span>
                        </span>
                        <div uib-dropdown-menu role="menu" class="ng-cloak">
                            % if request.user.is_auth():
                                <a class="dropdown-item" href="${linkto_me(request, '')}">Dashboard</a>
                                <a class="dropdown-item" href="${linkto_me(request, 'profile')}">Profile</a>
                                % if execution_permitted_sys(request, '', ''):
                                    <div class="dropdown-divider"></div>
                                    <a class="dropdown-item" href="${linkto_sys(request, '')}">System</a>
                                % endif
                                <div class="dropdown-divider"></div>
                                <a class="dropdown-item" href="${linkto_auth(request, 'logout')}">Logout</a>
                            % else:
                                <a class="dropdown-item" href="${linkto_auth(request, 'login')}">Login</a>
                            % endif
                        </div>
                    </span>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12" id="breadcrumbs" pym-sticky-breadcrumbs>
                <div class="inner">
                    <nav>
                        <i class="fa fa-bars button"></i>
##                         <div class="menu">
##                             <ul>
##                                 <li ng-repeat="item in MainMenu.items" ng-include="'menu_item_renderer.html'"></li>
##                             </ul>
##                         </div>
                    </nav>
                    <div class="crumbs">${pym.breadcrumbs()}</div>
##                    <div ng-if="model.lastRefresh" title="{{model.lastRefresh | date:'medium'}}" class="pull-right" style="display: inline-block">{{model.lastRefreshMsg}} <span am-time-ago="model.lastRefresh"></span></div>
                </div>
            </div>
        </div>
    </header>
</%block>
