<%!
    from pprint import pformat
%>

<%block name="pageFooter">
    <footer class="hidden-print">
        <div class="row">
            <div class="col-md-2">
                ${request.registry['rc'].g('project.title')} ${request.registry['rc'].g('project.version')}
            </div>
            <div class="col-md-10" style="text-align: right;">
                <div style="display: inline-block; margin-right: 2em;"><a href="${request.registry['rc'].g('project.copyright_link')}" target="_blank">${request.registry['rc'].g('project.copyright')|n}</a></div>
                <div style="display: inline-block;"><a href="${request.resource_url(request.root, 'imprint')}">Imprint</a></div>
            </div>
        </div>
    </footer>
</%block>

% if request.registry['rc'].g('debug'):
    <hr>
    <h3>SESSION</h3>
    <table class="tblLayout">
        <tbody>
            <tr style="border-bottom: solid 1px silver;">
                <td style="vertical-align: top;">XSRF Token</td><td style="white-space:pre;">${request.session.get_csrf_token()}</td>
            </tr>
            % for k, v in request.session.items():
                <tr style="border-bottom: solid 1px silver;">
                    <td style="vertical-align: top;">${k}</td><td style="white-space:pre;">${pformat(v)}</td>
                </tr>
            % endfor
        </tbody>
    </table>
    <h3>HEADERS</h3>
    <table class="tblLayout">
        <tbody>
            % for k, v in request.headers.items():
                <tr style="border-bottom: solid 1px silver;">
                    <td style="vertical-align: top;">${k}</td><td style="white-space:pre;">${pformat(v)}</td>
                </tr>
            % endfor
        </tbody>
    </table>
    <h3>COOKIES</h3>
    <table class="tblLayout">
        <tbody>
            % for k, v in request.cookies.items():
                <tr style="border-bottom: solid 1px silver;">
                    <td style="vertical-align: top;">${k}</td><td style="white-space:pre;">${pformat(v)}</td>
                </tr>
            % endfor
        </tbody>
    </table>



    <h3>AUTH</h3>

	<h4>USER</h4>
	<div>${pformat(request.user)}</div>
	<h4>GROUPS</h4>
	%for g in request.user.groups:
		<div>${pformat(g)}</div>
	%endfor

    <h3>Context ACL</h3>

<%def name="this_acl(c)">
    <p>${c}</p>
    % if hasattr(c, '__acl__'):
        <table class="tblLayout">
            <tbody>
                % for ace in c.__acl__():
                    <tr>
                        % for x in ace:
                            <td style="border: solid 1px silver; padding: 2px 4px;">${pformat(x)}</td>
                        % endfor
                    </tr>
                % endfor
            </tbody>
        </table>
    % endif
    %if c.__parent__:
        ${this_acl(c.parent)}
    %endif
</%def>

    ${this_acl(request.context)}

    ## Bust footer
    <p style="margin-top: 8ex;">&nbsp;</p>
% endif
