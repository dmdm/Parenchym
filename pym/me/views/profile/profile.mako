<%inherit file="pym:templates/layouts/default.mako" />

<%block name="styles">
${parent.styles()}
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Profile")}</%block>
<div ng-controller="pym.me.profileController as profileCtrl" ng-cloak>
    <div class="row">
        <div class="col-md-10">
            <p>The current user's profile.</p>
        </div>
        <div class="col-md-2">
            <div class="btn-group pull-right" uib-dropdown is-open="profileCtrl.ToolsMenu.isOpen">
              <button type="button" class="btn btn-secondary" uib-dropdown-toggle ng-disabled="profileCtrl.ToolsMenu.isDisabled">
                <i class="fa fa-cog text-primary"></i> <span class="caret"></span>
              </button>
              <ul uib-dropdown-menu role="menu">
                <li class="dropdown-item"><a href="#" ng-click="profileCtrl.doThis()">${_("Do this")}</a></li>
                <li class="dropdown-item"><a href="#">${_("Do that")}</a></li>
                <li class="dropdown-item"><a href="#">${_("No rest for the wicked")}</a></li>
              </ul>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-md-12">
            <h1>Account</h1>

            <table class="table">
                <colgroup>
                    <col width="200">
                    <col width="*">
                </colgroup>
                <tbody>
                    <tr><th>First Name</th><td>{{profileCtrl.account.first_name}}</td></tr>
                    <tr><th>Last Name</th><td>{{profileCtrl.account.last_name}}</td></tr>
                    <tr><th>Display Name</th><td>{{profileCtrl.account.display_name}}</td></tr>
                    <tr><th>Email</th><td>{{profileCtrl.account.email}}</td></tr>
                    <tr><th>Principal<br><small>(Login Name)</small></th><td>{{profileCtrl.account.principal}}</td></tr>
                    <tr><th>Password</th><td>{{profileCtrl.account.pwd}}</td></tr>
                </tbody>
            </table>

            <h1>General</h1>

            <table class="table">
                <colgroup>
                    <col width="200">
                    <col width="*">
                </colgroup>
                <tbody>
                    <tr><th>Gender</th><td>{{profileCtrl.profile.gender}}<br><small>(Obtained from G+ profile but of general use.)</small></td></tr>
                    <tr><th>Locale Name</th><td>{{profileCtrl.profile.locale_name}}<br><small>(Obtained from G+ profile but of general use.)</small></td></tr>
                </tbody>
            </table>

            <h1>Google+</h1>

            <table class="table">
                <colgroup>
                    <col width="200">
                    <col width="*">
                </colgroup>
                <tbody>
                    <tr><th>Picture</th><td><img ng-src="{{profileCtrl.profile.gplus.picture_url}}" alt="G+ Picture"></td></tr>
                    <tr><th>Profile</th><td><a href="{{profileCtrl.profile.gplus.profile_url}}">Goto G+ Profile</a></td></tr>
                </tbody>
            </table>

            <h1>Raw Data</h1>
            <pre>{{profileCtrl.profile|json}}</pre>
        </div>
    </div>
</div>
