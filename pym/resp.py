from .exc import ValidationError, WorkerError


class JsonResp(object):

    def __init__(self):
        """
        Constructs data structure in a standard response format for AJAX
        services.

        Rationale:

        If the service involves a lengthy operation, use this object as a
        minimalistic logger on the way. If the result data is ready, add it to
        this object too. The service view can now respond with the result data
        and all occurred messages in a well-defined structure.
        """
        self._msgs = []
        self._is_ok = True
        self._data = None

    def add_msg(self, msg):
        """
        Adds a message of user-defined kind.

        :param msg: The message
        :type msg: Dict(kind=..., text=...)
        """
        if msg['kind'] in ['error', 'fatal']:
            self._is_ok = False
        self._msgs.append(msg)

    def notice(self, txt):
        self.add_msg(dict(kind='notice', text=txt))

    def info(self, txt):
        self.add_msg(dict(kind='info', text=txt))

    def warn(self, txt):
        self.add_msg(dict(kind='warning', text=txt))

    def error(self, txt):
        self.add_msg(dict(kind='error', text=txt))

    def fatal(self, txt):
        self.add_msg(dict(kind='fatal', text=txt))

    def ok(self, txt):
        self.add_msg(dict(kind='success', text=txt))

    def print(self):
        for m in self._msgs:
            print(m['kind'].upper(), m['text'])

    @property
    def is_ok(self):
        """
        Returns True is no error messages are present, else False
        """
        return self._is_ok

    @property
    def msgs(self):
        """
        Returns the list of messages.

        Each message is a dict with at least keys ``kind`` and ``text``. This
        format is suitable for the PYM.growl() JavaScript.

        ``kind`` is one of (notice, info, warning, error, fatal, success).
        """
        return self._msgs

    @property
    def data(self):
        """
        Returns the data
        """
        return self._data

    @data.setter
    def data(self, v):
        """
        Sets the data
        """
        self._data = v

    @property
    def resp(self):
        """
        The response is::

            resp = {
                'ok': True/False,
                'msgs': [ {'kind': 'success', 'text': 'foo'}, ... ]
                'data: ... # arbitrary response data
            }
        """
        return dict(
            ok=self._is_ok,
            msgs=self._msgs,
            data=self._data
        )

    @property
    def is_ok(self):
        return self._is_ok


def build_json_response(lgg, validator, keys, func, request=None, die_on_error=True):
    resp = JsonResp()
    # Fetch validated parameter values
    kwargs = {}
    for k in keys:
        try:
            v = getattr(validator, k)
        except ValidationError as exc:
            lgg.exception(exc)
            resp.error(str(exc))
        else:
            kwargs[k] = v
    # Do the work
    # Check that we have an arg for each requested key. If not, one or more
    # args could not be validated, and we must not work.
    if len(keys) == len(kwargs):
        try:
            func(resp=resp, **kwargs)
        except WorkerError as exc:
            lgg.exception(exc)
            resp.error(str(exc))
    # Handle error
    if die_on_error and not resp.is_ok:
        if request:
            request.response.status = 500
    return resp
