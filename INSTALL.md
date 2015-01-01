Installation
============

1. Create a Python virtual environment and activate it
------------------------------------------------------

    $ pyvenv-3.4 parenchym-py34-venv
    $ source parenchym-py34-venv/bin/activate


2. Clone the repository
-----------------------

    $ git clone https://github.com/dmdm/parenchym
    $ cd parenchym


3. Install packages
-------------------

    $ ./bin/install_parenchym

Alternatively you can use modern pip which now maintains its own cache like so
(make sure you allow external dependencies as done in the script):

    $ pip install -e .

CAVEAT: Currently, requirements.txt contains more packages than Parenchym needs;
these result from conducted experiments and future plans. Some of them are a
PITA to install, because they need a bunch of development C libraries.

In any case you definitely need the Python headers (Debian: Python3-dev).

For PostgreSQL:

- PostgreSQL-dev for psycopg2

For MySQL via ODBC

- unixODBC, unixODBC-dev for pyodbc

For lxml:

- libxml2-dev, libxslt1-dev

For matplotlib:

- Thousands. You can safely leave this one out.

For pygit2:

- May not install at all. You can safely leave this one out.

For CFFI:

- libffi-dev. You can safely leave this one out.


4. Setup folders
----------------

In the following shell script, adjust USER and GROUP settings to your needs and
execute it.

    $ sudo ./bin/setup-dirs


5. Create the database
----------------------

    $ psql install/db/create_database.sql

You may want to adjust name of database and user account (OWNER).


6. Configure Parenchym
----------------------

Create config folders for your host and environment and put a file
rcsecrets.yaml in it.

E.g.:

    $ cp -av etc/{Morrigan,MYHOST}

The rcsecrets should at least contain the proper SQLAlchemy connection string
that matches your settings from the previous step. A sample is here:
``etc/Morrigan/development/rcsecrets.yaml-sample``.


7. Setup DB contents
--------------------

    $ pym-init-db -c development.ini

(If pym-init-db doesn't seem to to do anything, I may have forgotten to uncomment some
setup methods. Go to

    pym/scripts/init_db.py

and uncomment all calls to

    create_schema()

and

    setup()

The line

    pym.auth.setup.populate()

must also be active.)


8. Other dependencies
---------------------

Redis, the latest version (>=2.6)!

Configure it to use unix socket at /tmp/redis.sock and permission 777
(advised for development only), or adjust the cache settings in etc/rc.yaml to
your environment.


9. Start
--------

pserve development.ini


10. Production server
---------------------

production.ini is configured to be used by e.g. gunicorn behind Apache, i.e.
it requires HTTPS and allows you to set an URL prefix so that you don't need to
install this application directly under root:

    [filter:proxy-prefix]
    use = egg:PasteDeploy#prefix
    prefix = /SOME-PREFIX
    scheme = https

and in the Apache SSL config you may say:

    RewriteEngine On
    RewriteRule ^/SOME-PREFIX/(.*) http://localhost:7100/$1 [L,P]

In etc/Morrigan/development/ there is also a sample configuration to run the
green unicorn under supervisor. You have to adjust all paths and user settings.
