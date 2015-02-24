<%doc>
Library to construct forms that use AngularJS and Bootstrap.

The Form
========

In AngularJS create a controller for a form and bind it to the HTML form by
assigning it to the form tag's ``controller`` attribute in "controller-as"
syntax. The form also gets a name, under which AngularJS registers a
FormController.

E.g.:

To build a simple dialog to edit configuration settings, create an AngularJS
controller with the name "ConfFormCtrl". Give the form the name "confForm" and
register our Controller like this:

    <%frm:form controller="ConfFormCtrl as confFormCtrl" name="confForm">
        blah
    </%frm:form>

Our controller is then available as ``confFormCtrl``. Use it to access the data
model of the form, and any other methods.

AngularJS registers its form controller under the form's name ``confForm``. Use
this one to access the state flags and API of the form and its fields.

In this library, whenever a model is asked for, use our controller. If e.g.
it stores the form data as its attribute ``data``, set the model of e.g.
the field ``revenue_weight`` to ``confFormCtrl.data.revenue_weight``.

If you want to check if that field is valid, use NG's controller:
``confForm.revenue_weight.$valid``. Typically this library references it via
attributes ``form`` (e.g. "confForm") and ``field`` (e.g. "revenue_weight").

.. important: You need to create the block with the default messages in your
              form template, otherwise Angular does not find them. Call this at
              the top of your template::

                  ${frm.error_messages()}


Typical Rendering of a Form Element
===================================

Into a form-group container, put these three as siblings: a label, the form
control and, the messages block:

    <%frm:form_group form="confForm" field="revenue_weight">
        <%frm:label for_="revenue_weight">Revenue Weight</%frm:label>
        <%frm:input name="revenue_weight" model="confFormCtrl.data.revenue_weight"
            type_="number" attr="${dict(required=True)}"></%frm:input>
        <%frm:messages form="confForm" field="revenue_weight">
        </%frm:messages>
    </%frm:form_group>

Horizontal Forms
----------------

For horizontal forms, set the ``orient`` attribute of the form, the label and,
the control to "horizontal". Set their attribute ``col_width`` to the number of
columns that element shall occupy.

Server-Side Validation
----------------------

An async validator must return truesy/falsy: status 200 if value is valid,
status 4xx otherwise.

Validation of the whole form on submit:

Server validates the whole data structure and returns a JsonResp. If all values
are valid, JsonResp.ok == True, and JsonResp.data contains the saved data.
Server may have adjusted some data, and client has now the opprtunity to update
its model.

If data was not valid, JsonResp.ok == False, and JsonResp.data is a hash with
keys "errors" and "warnings" of hashes with the error messages (values) per
each field (keys). Client updates its controller attributes ``serverErrors``
and ``serverWarnings`` accordingly, and for each field with an error, uses
Angular's model controller to set the validity to False using error key 'server',
e.g. ``confForm.revenueWeight.$setValidity('server', false)``. Also call
``$setDirty()``, to tell that this control must be saved again, and ``setTouched()``
to display the error messages.

</%doc>

<%def name="form(controller, name, real=True, validate=False, id_=None,
        submit=None,
        orient='vertical', classes=None, styles=None, attr=None)">
    <%doc>
    Creates the <form></form> tag.

    Arguments:

    - controller: Controller this form is associated with. Use controller-as
                  syntax!
    - name: Name of the form, also set as its ID.
    - real: If True (default), renders a HTML form tag, else renders a div tag with
            an "ng-form" attribute.
    - validate: If False (default), sets the 'novalidate' attribute on the form.
    - id_: The ID attribute; if not set (default), name is used.
    - submit: The submit handler to set on the form. By default none.
    - orient: Orientation sets the Bootstrap CSS class: 'vertical' = default (no
              class), 'horizontal' or 'inline'.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        if real:
            form_tag = 'form'
            attr['name'] = name
        else:
            form_tag = 'div'
            attr['ng-form'] = name
        attr['id'] = id_ or name
        attr['ng-controller'] = controller
        if submit:
            if '.' in submit:
                attr['ng-submit'] = submit
            else:
                attr['ng-submit'] = '{}.{}'.format(controller, submit)
        if orient != 'vertical':
            classes.append('form-' + orient)
        if not validate:
            attr['novalidate'] = True
    %>
    <%self:tag t="${form_tag}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
</%def>


<%def name="form_group(form, field, as_form_group=True, classes=None, styles=None, attr=None)">
    <%doc>
    Renders a form group, i.e. a div container.

    Caller's body is the content of the div-block.

    Uses ``form`` and ``field`` to determine the validation state.

    Arguments:

    - form: Name of the form
    - field: Name of the field
    - as_form_group: If True (default) renders the div block with Bootstrap's
                     'form-group' class. If False, renders just a regular div.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        if as_form_group:
            classes.append('form-group')
        ng_class = [
            "'has-error': ({0}.{1}.$touched && {0}.{1}.$invalid)".format(form, field)
        ]
        attr['ng-class'] = '{' + ','.join(ng_class) + '}'
    %>
    <%self:tag t="div" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
</%def>


<%def name="messages(form, field, include=None,
        classes=None, styles=None, attr=None)">
    <%doc>
    Renders the messages block for a form element.

    Messages overriding those of the template, or adding to them, can be passed
    as the caller's body.

    In a horizontal form, use class "col-sm-offset-{}" to indent by {} columns.

    Arguments:

    - form: Name of the form
    - field: Name of the field
    - include: Name of the template to include. Defaults to "error-messages.html".
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if not include:
            include = 'error-messages.html'
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        attr['ng-messages'] = '{}.{}.$error'.format(form, field)
        attr['ng-messages-include'] = include
        attr['ng-if'] = "{0}.$submitted || {0}.{1}.$touched".format(form, field)
        svr_error = '{{' + '{}.$error.{}.server'.format(form, field) + '}}'
        test_svr_error = 'ng-if="' + '{}.$error.{}.server'.format(form, field) + '"'
    %>
    <%self:tag t="div" classes="${classes}" styles="${styles}" attr="${attr}">
        <div ng-cloak class="text-danger" ${test_svr_error} ng-message="server">${svr_error}</div>
        ${caller.body()}
    </%self:tag>
</%def>


<%def name="label(for_=None, visible=True,
        classes=None, styles=None, attr=None)">
    <%doc>
    Renders the control's label.

    The control can be passed as the caller's body, or referenced by setting the
    ``for_`` argument to the control's ID.

    In horizontal forms, add a column class, e.g. "col-sm-2".

    Arguments:

    - for_: Optional. ID of the control.
    - visible: If False, class 'sr-only' is added to keep label for screen
               readers, but make it invisible.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        if for_:
            attr['for'] = for_
        classes.append('control-label')
        if not visible:
            classes.append('sr-only')
    %>
    <%self:tag t="label" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
</%def>


<%def name="input(name, model, type_='text', id_=None, orient='vertical',
        classes=None, styles=None, attr=None, container_classes=None,
        addon_before=None, addon_after=None)">
    <%doc>
    Renders an input control.

    Renders caller's body below the input tag, e.g. for help text etc.

    In horizontal forms, add a column class, e.g. "col-sm-10", to the ``div_classes``.

    Arguments:

    - name: Name of the checkbox, also set as its ID.
    - model: Angular model to store the value.
    - type_: Type of the input, defaults to 'text'. Type may also be 'static'.
    - id_: Optional ID. If omitted, name is used.
    - orient: see form.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    - container_classes: Optional list of CSS classes for the surrounding div.
                         Only applicable in horizontal orientation.
    - addon_before: Content of an optional input group addon, rendered before
                    the input control. May contain HTML.
    - addon_after: Content of an optional input group addon, rendered after
                   the input control. May contain HTML.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        classes.append('form-control')
        attr['id'] = id_ or name
        attr['ng-model'] = model
        if type_ == 'static':
            close = True
            t = 'p'
        else:
            close = False
            attr['name'] = name
            attr['type'] = type_
            t = 'input'
        if container_classes is None:
            container_classes = []
        container_classes = ' '.join(container_classes)
        if addon_before:
            addon_before_id = attr['id'] + '_addon_before'
        if addon_after:
            addon_after_id = attr['id'] + '_addon_after'
    %>
    %if orient in ('horizontal', ):
        <div class="${container_classes}">
    %endif
        %if addon_before or addon_after:
            <div class="input-group">
        %endif
        %if addon_before:
            <span class="input-group-addon" id="${addon_before_id}">${addon_before|n}</span>
        %endif
        <%self:tag t="${t}" close="${close}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
        %if addon_after:
            <span class="input-group-addon" id="${addon_after_id}">${addon_after|n}</span>
        %endif
        %if addon_before or addon_after:
            </div>
        %endif
    %if orient in ('horizontal', ):
        </div>
    %endif
</%def>


<%def name="select(name, model, options, id_=None, orient='vertical',
        classes=None, styles=None, attr=None, container_classes=None)">
    <%doc>
    Renders a select control.

    Renders caller's body below the input tag, e.g. for help text etc.

    If you need a default option with a null value, supply it via caller's body.

    Arguments:

    - name: Name of the checkbox, also set as its ID.
    - model: Angular model to store the value.
    - id_: Optional ID. If omitted, name is used.
    - orient: see form.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    - container_classes: Optional list of CSS classes for the surrounding div.
                         Only applicable in horizontal orientation.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        classes.append('form-control')
        attr['name'] = name
        attr['id'] = id_ or name
        attr['ng-model'] = model
        attr['ng-options'] = options
    %>
    %if orient in ('horizontal', ):
        <%self:tag t="div" classes="${container_classes}">
            <%self:tag t="select" close="${True}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
        </%self:tag>
    %else:
        <%self:tag t="select" close="${True}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
    %endif
</%def>


<%def name="button(type_='button', name=None, id_=None,
        classes=None, styles=None, attr=None)">
    <%doc>
    Renders a button.

    Renders caller's body as button's text.

    Arguments:

    - type_: Type of the button, defaults to 'button'.
    - name: Name of the button, also set as its ID.
    - id_: Optional ID. If omitted, name is used.
    - classes: Optional list of CSS classes. If empty, classes 'btn btn-default'
               are inserted.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = ['btn', 'btn-default']
        if name:
            attr['name'] = name
        if id_ or name:
            attr['id'] = id_ or name
        attr['type'] = type_
    %>
    <%self:tag t="button" close="${True}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
</%def>


<%def name="submit_button(form, name='btnSubmit', id_=None,
        classes=None, styles=None, attr=None)">
    <%doc>
    Renders a submit button.

    Renders "Submit" or, if present, caller's body as button's text.

    Arguments:

    - form: Angular Form Controller. If form is not $valid, we disable submit
            button.
    - name: Name of the button, also set as its ID. Defaults to "btnSubmit".
    - id_: Optional ID. If omitted, name is used.
    - classes: Optional list of CSS classes. If empty, classes 'btn btn-default'
               are inserted.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        classes += ['btn', 'btn-default']
        attr['name'] = 'btnSubmit'
        if name:
            attr['name'] = name
        attr['id'] = attr['name']
        if id_ or name:
            attr['id'] = id_ or name
        attr['type'] = 'submit'
        attr['ng-disabled'] = '! {}.$valid'.format(form)
        text = ('<i class="fa fa-save fa-lg text-primary"></i> ' + _("Save")) or caller.body()
    %>
    <%self:tag t="button" close="${True}" classes="${classes}" styles="${styles}" attr="${attr}">${text|n}</%self:tag>
</%def>


<%def name="cancel_button(click, name='btnCancel', id_=None,
        classes=None, styles=None, attr=None)">
    <%doc>
    Renders a cancel button.

    Renders "Cancel" or, if present, caller's body as button's text.

    If ``attr['ng-click']`` is not set, connects the click handler with your
    controller's ``cancel()`` method.

    Arguments:

    - click: Click-handler; set this to your controller's ``cancel()`` method.
    - name: Name of the button, also set as its ID. Defaults to "btnCancel".
    - id_: Optional ID. If omitted, name is used.
    - classes: Optional list of CSS classes. If empty, classes 'btn btn-default'
               are inserted.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    </%doc>
    <%
        if attr is None:
            attr = {}
        if classes is None:
            classes = []
        classes += ['btn', 'btn-default btn-cancel']
        attr['name'] = 'btnCancel'
        if name:
            attr['name'] = name
        attr['id'] = attr['name']
        if id_ or name:
            attr['id'] = id_ or name
        attr['type'] = 'button'
        attr['ng-click'] = click
        text = ('<i class="fa fa-close fa-lg text-primary"></i> ' + _("Cancel")) or caller.body()
    %>
    <%self:tag t="button" close="${True}" classes="${classes}" styles="${styles}" attr="${attr}">${text|n}</%self:tag>
</%def>

<%def name="form_button_row(col_classes, form, cancel=None)">
    <%doc>
    Renders a button row below the form with cancel and save button.

    Arguments:

    - cancel: Click handler for the cancel button. Set it to your controller's
              ``cancel()`` method.
    - col_classes: CSS column classes to describe which columns this row should
                   span.
    - form: Angular Form Controller. If form is not $valid, we disable submit
            button.
    </%doc>
    <%
        if not isinstance(col_classes, str):
            col_classes = ' '.join(col_classes)
    %>
    <div class="row">
        <div class="${col_classes}">
            <div class="form-button-row">
                <%self:submit_button form="${form}"></%self:submit_button>
                %if cancel:
                    <%self:cancel_button click="${cancel}"></%self:cancel_button>
                %endif
                ${caller.body()}
            </div>
        </div>
    </div>
</%def>

<%def name="checkbox(name, model, id_=None, orient='vertical',
        classes=None, styles=None, attr=None,
        label_visible=True, label_classes=None, label_styles=None,
        label_attr=None, container_classes=None)">
    <%doc>
    Renders a checkbox control.

    Renders caller's body as checkbox's label.

    In horizontal forms, add column classes to ``container_classes``,
    e.g. ["col-sm-offset-2", "col-sm-10"]

    Arguments:

    - name: Name of the checkbox, also set as its ID.
    - model: Angular model to store the value.
    - orient: Orientation, see ``form``.
    - label_visible: If False, makes the label invisible (see ``label``)
    - col_width: Number of colums for this cell. Only for horizontal forms.
    - id_: Optional ID. If omitted, name is used.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    - label_visible: True (default) to display label, False to hide it and mark
                     it as for screen readers only.
    - label_classes: Optional list of CSS classes for the label.
    - label_styles: Optional dict of CSS styles for the label.
    - label_attr: Optional dict of additional attributes for the label.
    </%doc>
    <%
        if attr is None:
            attr = {}
        attr['name'] = name
        attr['id'] = id_ or name
        attr['ng-model'] = model
        attr['type'] = 'checkbox'
        div_classes = ['checkbox']
    %>
    %if orient in ('horizontal', ):
        <%self:tag t="div" classes="${container_classes}">
            <%self:tag t="div" classes="${div_classes}">
                <%self:label classes="${label_classes}" styles="${label_styles}" attr="${label_attr}" visible="${label_visible}">
                    <%self:tag t="input" close="${False}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
                </%self:label>
            </%self:tag>
        </%self:tag>
    %else:
        <%self:tag t="div" classes="${div_classes}">
            <%self:label classes="${label_classes}" styles="${label_styles}" attr="${label_attr}" visible="${label_visible}">
                <%self:tag t="input" close="${False}" classes="${classes}" styles="${styles}" attr="${attr}">${caller.body()}</%self:tag>
            </%self:label>
        </%self:tag>
    %endif
</%def>

<%def name="input_form_group(form, field, model, type_, label,
        orient='vertical', columns=None,
        classes=None, styles=None, attr=None,
        label_visible=True, label_classes=None, label_styles=None, label_attr=None,
        input_container_classes=None, messages_classes=None,
        addon_before=None, addon_after=None)">
    <%doc>
    Renders a complete form group with input control.

    Arguments:

    - form: Name of the form
    - field: Name of the field
    - model: Angular model to store the value.
    - type_: Type of input.
    - label: Text of label.
    - orient: Orientation, see ``form``.
    - columns: Optional 3-tuple: [0] = Prefix string for column classes, e.g.
               "col-sm-". This will be used as e.g. "col-sm-6" or
               "col-sm-offset-6". [1] Number of columns for the label. [2] Number
               of columns for the control.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    - label_visible: True (default) to display label, False to hide it and mark
                     it as for screen readers only.
    - label_classes: Optional list of CSS classes for the label.
    - label_styles: Optional dict of CSS styles for the label.
    - label_attr: Optional dict of additional attributes for the label.
    - input_container_classes: Optional list of CSS classes for the container of
                               the input control.
    - messages_classes: Optional list of CSS classes for the message block.
    - addon_before: Content of an optional input group addon, rendered before
                    the input control.
    - addon_after: Content of an optional input group addon, rendered after
                   the input control.
    </%doc>
    <%
        if columns is None:
            columns = ()
        if label_classes is None:
            label_classes = []
        label_classes.append(columns[0] + str(columns[1]))
        if input_container_classes is None:
            input_container_classes = []
        input_container_classes.append(columns[0] + str(columns[2]))
        if messages_classes is None:
            messages_classes = []
        messages_classes.append(columns[0] + 'offset-' + str(columns[1]))
    %>
    <%self:form_group form="${form}" field="${field}">
        <%self:label for_="${field}" visible="${label_visible}"
            classes="${label_classes}" styles="${label_styles}"
            attr="${label_attr}">${label}</%self:label>
        <%self:input name="${field}" model="${model}"
            type_="${type_}" classes="${classes}" styles="${styles}" attr="${attr}"
            orient="${orient}" container_classes="${input_container_classes}"
            addon_before="${addon_before}" addon_after="${addon_after}"></%self:input>
        <%self:messages form="${form}" field="${field}" classes="${messages_classes}">
        </%self:messages>
        ${caller.body()}
    </%self:form_group>
</%def>


<%def name="select_form_group(form, field, model, label, options,
        orient='vertical', columns=None,
        classes=None, styles=None, attr=None,
        label_visible=True, label_classes=None, label_styles=None, label_attr=None,
        input_container_classes=None, messages_classes=None)">
    <%doc>
    Renders a complete form group with select control.

    Arguments:

    - form: Name of the form
    - field: Name of the field
    - model: Angular model to store the value.
    - options: Angular expression for ng-options.
    - label: Text of label.
    - orient: Orientation, see ``form``.
    - columns: Optional 3-tuple: [0] = Prefix string for column classes, e.g.
               "col-sm-". This will be used as e.g. "col-sm-6" or
               "col-sm-offset-6". [1] Number of columns for the label. [2] Number
               of columns for the control.
    - classes: Optional list of CSS classes.
    - styles: Optional dict of CSS styles.
    - attr: Optional dict of additional attributes.
    - label_visible: True (default) to display label, False to hide it and mark
                     it as for screen readers only.
    - label_classes: Optional list of CSS classes for the label.
    - label_styles: Optional dict of CSS styles for the label.
    - label_attr: Optional dict of additional attributes for the label.
    - input_container_classes: Optional list of CSS classes for the container of
                               the input control.
    - messages_classes: Optional list of CSS classes for the message block.
    </%doc>
    <%
        if columns is None:
            columns = ()
        if label_classes is None:
            label_classes = []
        label_classes.append(columns[0] + str(columns[1]))
        if input_container_classes is None:
            input_container_classes = []
        input_container_classes.append(columns[0] + str(columns[2]))
        if messages_classes is None:
            messages_classes = []
        messages_classes.append(columns[0] + 'offset-' + str(columns[1]))
    %>
    <%self:form_group form="${form}" field="${field}">
        <%self:label for_="${field}" visible="${label_visible}"
            classes="${label_classes}" styles="${label_styles}"
            attr="${label_attr}">${label}</%self:label>
        <%self:select name="${field}" model="${model}"
            options="${options}" classes="${classes}" styles="${styles}"
            attr="${attr}" orient="${orient}" container_classes="${input_container_classes}"></%self:select>
        <%self:messages form="${form}" field="${field}" classes="${messages_classes}">
        </%self:messages>
        ${caller.body()}
    </%self:form_group>
</%def>


<%def name="empty_form_group(form, field, label,
        orient='vertical', columns=None,
        label_visible=True, label_classes=None, label_styles=None, label_attr=None,
        input_container_classes=None, messages_classes=None)">
    <%doc>
    Renders an empty form group with caller's body as the control.

    If orient is "horizontal", wraps caller's body in a div with
    ``input_container_classes``.

    Arguments:

    - form: Name of the form
    - field: Name of the field
    - label: Text of label.
    - orient: Orientation, see ``form``.
    - columns: Optional 3-tuple: [0] = Prefix string for column classes, e.g.
               "col-sm-". This will be used as e.g. "col-sm-6" or
               "col-sm-offset-6". [1] Number of columns for the label. [2] Number
               of columns for the control.
    - label_visible: True (default) to display label, False to hide it and mark
                     it as for screen readers only.
    - label_classes: Optional list of CSS classes for the label.
    - label_styles: Optional dict of CSS styles for the label.
    - label_attr: Optional dict of additional attributes for the label.
    - input_container_classes: Optional list of CSS classes for the container of
                               the input control.
    - messages_classes: Optional list of CSS classes for the message block.
    </%doc>
    <%
        if label_classes is None:
            label_classes = []
        if columns is None:
            columns = ()
        if input_container_classes is None:
            input_container_classes = []
        if messages_classes is None:
            messages_classes = []
        if orient == 'horizontal':
            label_classes.append(columns[0] + str(columns[1]))
            input_container_classes.append(columns[0] + str(columns[2]))
            messages_classes.append(columns[0] + 'offset-' + str(columns[1]))
    %>
    <%self:form_group form="${form}" field="${field}">
        <%self:label for_="${field}" visible="${label_visible}"
            classes="${label_classes}" styles="${label_styles}"
            attr="${label_attr}">${label}</%self:label>

        %if orient in ('horizontal', ):
           <%self:tag t="div" classes="${input_container_classes}">
                ${caller.body()}
           </%self:tag>
        %else:
            ${caller.body()}
        %endif

        <%self:messages form="${form}" field="${field}" classes="${messages_classes}">
        </%self:messages>
    </%self:form_group>
</%def>


<%def name="tag(t, *args, close=True, classes=None, styles=None, attr=None)">
    <%doc>
    Renders an HTML tag.

    Arguments:

    - t: The tag name
    - *args: Optional positional arguments, rendered as attributes without value.
    - close: If True (default), renders a close tag after the content.
    - classes: Optional list of CSS classes (alternative to using attr['class']).
    - styles: Optional dict of CSS styles (alternative to using attr['style']).
    - attr: Optional dict with additional attributes.

            If the value of an attribute is True, renders the attribute without
            a value; if it is False, does not render that attribute at all.

            If the value is an iterable (but not a string), joins its elements
            into a string separated with a blank.

    </%doc>
<%
    if not classes:
        classes = []
    if not styles:
        styles = {}
    aattr = []
    if attr:
        for k, v in attr.items():
            if k == 'class':
                if isinstance(v, str):
                    classes.append(v)
                else:
                    classes += v
                continue
            if k == 'style':
                if isinstance(v, str):
                    styles.append(v)
                else:
                    styles += v
                continue
            if v is True:
                # just use attribute without value
                aattr.append(k)
                continue
            elif v is False:
                # do not set attribute
                continue
            if not isinstance(v, str) and hasattr(v, '__iter__'):
                if len(v):
                    v = ' '.join(v)
                else:
                    continue
            aattr.append('{}="{}"'.format(k, v))
    if classes:
        aattr.append('class="{}"'.format(' '.join(classes)))
    if styles:
        asty = []
        for k, v in styles.items():
            asty.append('{}: {}'.format(k, v))
        aattr.append('style="{}"'.format(';'.join(asty)))
    aa = []
    if args:
        aa.append(' '.join(args))
    if aattr:
        aa.append(' '.join(aattr))
    s = '<{}{}>'.format(t, ' ' + ' '.join(aa) if aa else '')
%>
    ${s|n}
    ${caller.body()}
    %if close:
        </${t}>
    %endif
</%def>


<%def name="error_messages()">
    <script type="text/ng-template" id="error-messages.html">
        <div class="text-danger" ng-message="required">${_("This field cannot be blank")}</div>
        <div class="text-danger" ng-message="minlength">${_("This value is too short")}</div>
        <div class="text-danger" ng-message="maxlength">${_("This value is too long")}</div>
        <div class="text-danger" ng-message="min">${_("This number is too small")}</div>
        <div class="text-danger" ng-message="max">${_("This number is too big")}</div>
        <div class="text-danger" ng-message="email">${_("This email is incorrect")}</div>
        <div class="text-danger" ng-message="url">${_("This URL is incorrect")}</div>
        <div class="text-danger" ng-message="number">${_("This number is incorrect")}</div>
        <div class="text-danger" ng-message="date">${_("This date is incorrect")}</div>
        <div class="text-danger" ng-message="time">${_("This time is incorrect")}</div>
        <div class="text-danger" ng-message="datetime-local">${_("This timestamp is incorrect")}</div>
        <div class="text-danger" ng-message="week">${_("This week is incorrect")}</div>
        <div class="text-danger" ng-message="month">${_("This month is incorrect")}</div>
        <div class="text-danger" ng-message="pattern">${_("This value is not in the correct format")}</div>
        ## Just a generic error message if server-side validation failed.
        ## Server should return a more meaningful message that has to be rendered in the
        ## fields messages block, thus overriding this one.
        <div class="text-danger" ng-message="server">${_("Server validation failed")}</div>
    </script>
</%def>


<%def name="debug_form(form, model)">
    <%doc>
    Renders some debug output about the form's state.

    You must call this inside the DOM block of your form controller, which
    typically means: between '<form>'...'</form>'.
    </%doc>
    <hr>
    <p>Form Errors</p><pre>{{${form}.$error|json}}</pre>
    <p>Fields:</p>
    <div class="row">
        <div ng-repeat="f in ${form}" class="col-sm-2" style="white-space: pre;">
            <strong>{{f.$name}}</strong>
            {{f|json}}
        </div>
    </div>
    <p>Form States</p>
    <pre>{{${form}|json}}</pre>
    <p>Form Data</p><pre>{{${model}|json}}</pre>
</%def>
