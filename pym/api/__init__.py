"""
Package as starting point for REST API resource nodes.

Keep the actual implementation of API URIs inside their respective modules::

    pym
     |
     +-- module1
     |    |
     |    +-- implementation
     |
     +-- module2


However, they must install the API endpoints in the resource tree here::

    /api
     |
     +-- rest
          |
          +-- module1
          |    |
          |    +--verb1
          |
          +-- module2

This package provides the nodes "api" and "rest".
"""
