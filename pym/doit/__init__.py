"""
###############################
Simple multi-user TODO manager.
###############################


Task:

- owner                 User who created this task
- assigned_to: []       List of users who shall work on this task.
                        May be, or include, owner.
- subject               A single line of text
- body                  Text, may be markdown formatted
- due_date              Date when this task is due

For the owner, a task has state

- open: at least one assignee has not closed it
- closed-done: all assignees have marked it done
  closed-done_but: all assignees have closed it, but at least one assignee has
    said 'but'
  closed-rejected: all assignees have closed it, but at least one has rejected it

For the assignees, a task has state

- open       If current user has not closed it
- closed     If current user has said 'done', 'done, but', 'reject'



*********
Tasks API
*********

See also `Google Tasks API <https://developers.google.com/google-apps/tasks/v1/reference/>`_

URIs are relative to 'https://HOST/api/tasks/v1', unless otherwise noted.


Tasks management as owner
=========================

list
    GET /users/@me/tasks

    Returns all tasks owned by given user.

get
    GET /users/@me/tasks/:id

    Returns task identified by ``:id``.

insert
    POST /users/@me/tasks

    Creates a new task.

update
    PUT /users/@me/tasks/:id

    Updates task identified by ``:id``.

delete
    DELETE /users/@me/tasks/:id

    Deletes task identified by ``:id``.

clear
    POST /users/@me/tasks/clear

    Clears all completed tasks. Affected tasks will be marked as 'hidden' and no
    longer be returned by default.

hide
    POST /users/@me/tasks/hide/:id

    Hides task identified by ``:id``.


Tasks management as assignee
============================

list
    GET /users/@me/assigned_tasks

    Returns all tasks assigned to given user.

close
    POST /users/@me/tasks/close/:id

    Closes task identified by ``:id``.


Tasks: list
===========

This defines method to list owned tasks as well as assigned tasks.

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

None.

Query Parameters
^^^^^^^^^^^^^^^^

completedMax
    string. Upper bound for a task's completion date (as a RFC 3339 timestamp)
    to filter by. Optional. The default is not to filter by completion date.

completedMin
    string. Lower bound for a task's completion date (as a RFC 3339 timestamp)
    to filter by. Optional. The default is not to filter by completion date.

dueMax
    string. Upper bound for a task's due date (as a RFC 3339 timestamp) to
    filter by. Optional. The default is not to filter by due date.

dueMin
    string. Lower bound for a task's due date (as a RFC 3339 timestamp) to
    filter by. Optional. The default is not to filter by due date.

showCompleted
    boolean. Flag indicating whether completed tasks are returned in the result.
    Optional. The default is True.

showDeleted
    boolean. Flag indicating whether deleted tasks are returned in the result.
    Optional. The default is False.

showHidden
    boolean Flag indicating whether hidden tasks are returned in the result.
    Optional. The default is False.


Request Body
^^^^^^^^^^^^

None.

Response
--------

.. code-block:: javascript

    {
      "items": [
        tasks Resource
      ]
    }



Tasks: get
==========

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^


:id

    string. Task identifier.

Query Parameters
^^^^^^^^^^^^^^^^

None.


Request Body
^^^^^^^^^^^^

None.

Response
--------

A tasks resource in the response body.



Tasks: insert
=============

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

None.

Query Parameters
^^^^^^^^^^^^^^^^

None.


Request Body
^^^^^^^^^^^^

A tasks resource in the request body.

Response
--------

A tasks resource in the response body.



Tasks: update
=============

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

:id

    string. Task identifier.

Query Parameters
^^^^^^^^^^^^^^^^

None.


Request Body
^^^^^^^^^^^^

A tasks resource in the request body.

Response
--------

A tasks resource in the response body.


Tasks: delete
=============

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

:id

    string. Task identifier.

Query Parameters
^^^^^^^^^^^^^^^^

None.


Request Body
^^^^^^^^^^^^

None.

Response
--------

Empty response body.


Tasks: clear
============

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

None.

Query Parameters
^^^^^^^^^^^^^^^^

None.


Request Body
^^^^^^^^^^^^

None.

Response
--------

Empty response body.



Tasks: hide
===========

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

:id

    string. Task identifier.

Query Parameters
^^^^^^^^^^^^^^^^

None.


Request Body
^^^^^^^^^^^^

None.

Response
--------

Empty response body.




Tasks: close
============

Parameters
----------

Path Parameters
^^^^^^^^^^^^^^^

:id

    string. Task identifier.

Query Parameters
^^^^^^^^^^^^^^^^

resolution

    string. Mandatory! One of "done", "done-but", "rejected".

notes

    string. Some notes about resolution. Mandatory unless resolution is "done".


Request Body
^^^^^^^^^^^^

None.

Response
--------

Empty response body.

"""
