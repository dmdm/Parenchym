<%inherit file="pym:templates/layouts/default.mako" />

<%block name="styles">
${parent.styles()}
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Me")}</%block>
<div ng-controller="pym.me.meController as meCtrl" ng-cloak>
    <div class="row">
        <div class="col-md-10">
            <p>Here can the personal dashboard be built.</p>
            <p>See the Tools Menu on the right for more functionality.</p>
            <p>a</p>
            <p>b</p>
            <p>c</p>
            <p>d</p>
            <p>e</p>
            <p>foo <a href="#" ng-click="meCtrl.doThis()">${_("Do this")}</a></p>
        </div>
        <div class="col-md-2">
            <div class="btn-group pull-right" uib-dropdown is-open="meCtrl.ToolsMenu.isOpen">
              <button type="button" class="btn btn-secondary" uib-dropdown-toggle ng-disabled="meCtrl.ToolsMenu.isDisabled">
                <i class="fa fa-cog text-primary"></i> <span class="caret"></span>
              </button>
              <ul uib-dropdown-menu role="menu">
                <li class="dropdown-item"><a href="#" ng-click="meCtrl.doThis()">${_("Do this")}</a></li>
                <li class="dropdown-item"><a href="#">${_("Do that")}</a></li>
                <li class="dropdown-item"><a href="#">${_("No rest for the wicked")}</a></li>
              </ul>
            </div>
        </div>
    </div>
</div>
