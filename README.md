Parenchym
=========

Web application Framework based on Pyramid.

Licensed under the same license as Pyramid, see LICENSE.

You can run Parenchym directly, or use it as a library. As-is, Parenchym
presents a small application with login and registration facilities, the latter
uses Google+ as auth provider.

See https://parenchym.com/py-pym-demo/


---
We have a starter application, see https://github/dmdm/GreatFormsOfFire
---


What is it good for?
--------------------

Pyramid "is a small, fast, down-to-earth Python web framework"[1] with
which you can write simple web applications with just a handful lines of code.
It also provides components useful in larger applications. To use these, and
third-party components, however, you may have to write code yourself to glue
them together.

Parenchym, as its name may suggest, does exactly that.

It connects you to a database (SQLAlchemy), and sets up a schema for user
authentication and authorization (users, groups, permissions). It also lays
the foundation for multi-tenancy.

It uses Pyramids traversal and ACL facilities for routing, with a dynamic
resource tree stored in the database. Dynamic means, it can be expanded at
run-time. Each resource may have an individual ACL attached and/or inherit from
its parent.

On the client-side, it integrates SASS, bootstrap, and angularjs and some of its
third-party components via requirejs.

Caching with Redis.


Miscellaneous notes
-------------------


### Directories

Server-side code is modeled as components, where-as each component should be
a self-containing Python package. E.g. the ``auth`` package contains:

- module ``const``
- module ``setup`` which installs this module including DB records. Called from
  ``pym.init-db``
- module ``models`` with the SA models for this package
- sub-package ``views`` with another sub-package for each view. These view pkgs
  contain the Python code and the mako templates together.

Client-side code is in a directory structure under ``client``. It follows
a pattern used to develop and test purely client-sided apps. So e.g. a grunt
task or watcher may be setup to compile all JS into one file and distribute it
into ``pym/static``. The latter we do not have yet, so ``pym/static`` contains
symlinks to ``client``.


### AngularJS application

We bootstrap a complete angularjs application from ``client/src/app/app.js``.

The master template loads the angular application, bootstraps it and also
configures paths to conditionally load external scripts via requirejs.

The master template does not know beforehand, which other angular components a
page needs to have injected into the application. Therefore we define a global
variable `PYM_APP_INJECTS` with a list of all components to inject into the
application.

Ditto we define the global ``PYM_APP_REQUIREMENTS`` to inform requirejs to load
that component asynchronously.

A page template should configure it like so:

    <%block name="require_config">
        ${parent.require_config()}
        PYM_APP_REQUIREMENTS.push(
            'ng-ui-bs'
        );
        PYM_APP_INJECTS.push('ui.bootstrap');
    </%block>

All URLs for XHR calls are provided from the Python view method on page call,
none are hard-coded in the JavaScript.

The view method delivers data to the page template by returning a dict with key
``rc`` to the mako renderer. This rc is set as angular constant ``RC`` that can
be injected into the controller. Configured URLs are then available e.g. as
``RC.urls.foo_bar``.

The client-side of each XHR call expects a JSON structure as return value. It
has a certain architecture to provide payload as well as messages that the client
may growl. See :class:`pym.resp.JsonResp` for details.


### SASS/CSS

We have a file-watcher that compiles our SASS files into the appropriate CSS
files via the provided SASS compiler (``bin/sassc``):

    $ ./bin/watch-sass -c development.ini

Our SASS files are in ``parenchym/client/src/sass``.

Typically, web pages include CSS of more than one component, e.g.
- reset
- base css for our project
- 3rd party css 1
- 3rd party css 2
- overriding css of our project, where we may override CSS from the 3rd party files

``pym-1.scss`` governs the reset styles, the inclusion of bootstrap, our styles
etc. and is compiled into ``styles1.css``.
``pym-2.scss`` contains the overriding styles (if any) and is compiled into ``styles2.css``.

The master template includes the CSS files in the described order. Since the master template
cannot know which other CSS a page template may need, you can override the styles block
in a page template like this:

    <%block name="styles">
    ${parent.styles()}
    My other <link rel="stylesheet" href="blah">
    <styles>
        My local styles
    </styles
    </%block>


### Other stuff

- Basics to run a separate process as a scheduler using APScheduler, see ``pym-scheduler``

- Generic importer to import arbitrary Excel or CSV files into a table: ``pym-import-raw``.

- Basics to use remote headless LibreOffice, esp. LOCalc: ``pym/libuno.py``







[1] http://docs.pylonsproject.org/projects/pyramid/en/1.5-branch/#the-pyramid-web-framework
