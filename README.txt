#########
Parenchym
#########

Web application Framework based on Pyramid.


Installation
============

1. Create a Python virtual environment and activate it

    $ pyvenv-3.4 parenchym-py34-venv
    $ source parenchym-py34-venv/bin/activate

2. Clone the repository

    $ git clone https://github.com/dmdm/parenchym
    $ cd parenchym

3. Install packages and setup folders

    $ ./bin/install_parenchym
    $ sudo ./bin/setup-dirs

4. Create the database

    $ psql install/db/create_database.sql

5. Create config folders for your host and environment and put a file
   rcsecrets.yaml in it.

6. Setup DB contents

    $ pym-init-db -c development.ini