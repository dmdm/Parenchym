import abc
import collections.abc
import fcntl
import os
from pathlib import PurePath
import pickle
import re
import time
import uuid
import magic
import sqlalchemy as sa
import sqlalchemy.orm.interfaces
import sqlalchemy.orm.query as saqry
import sqlalchemy.orm.session
from hashlib import md5

# noinspection PyPackageRequirements
from dogpile.cache import make_region
# noinspection PyPackageRequirements
from dogpile.cache.api import NO_VALUE
import yaml
import pym.exc
from pym.i18n import _
from pym.lib import dump_yaml
import pym.security


def _stringify(s):
    if isinstance(s, sa.orm.session.Session):
        return 'sess'
    return str(s)


def md5_key_mangler(key):
    """Receive cache keys as long concatenated strings;
    distill them into an md5 hash.

    """
    return md5(key.encode('ascii')).hexdigest()


# noinspection PyUnusedLocal
def default_keygen(namespace, fn, **kwargs):
    fname = fn.__name__

    def generate_key(*arg):
        return 'default:{namespace}:{fname}:{other}'.format(
            namespace=namespace, fname=fname,
            other=":".join(_stringify(s) for s in arg)
        )
    return generate_key


# noinspection PyUnusedLocal
def auth_short_term_keygen(namespace, fn, **kwargs):
    fname = fn.__name__

    def generate_key(*arg):
        return 'auth:short_term:{namespace}:{fname}:{other}'.format(
            namespace=namespace, fname=fname,
            other=":".join(_stringify(s) for s in arg)
        )
    return generate_key


# noinspection PyUnusedLocal
def auth_long_term_keygen(namespace, fn, **kwargs):
    fname = fn.__name__

    def generate_key(*arg):
        return 'auth:long_term:{namespace}:{fname}:{other}'.format(
            namespace=namespace, fname=fname,
            other=":".join(_stringify(s) for s in arg)
        )
    return generate_key


region_default = make_region(
    function_key_generator=default_keygen
)


region_auth_short_term = make_region(
    function_key_generator=auth_short_term_keygen
)


region_auth_long_term = make_region(
    function_key_generator=auth_long_term_keygen
)


class CachingQuery(saqry.Query):
    """A Query subclass which optionally loads full results from a dogpile
    cache region.

    The CachingQuery optionally stores additional state that allows it to consult
    a dogpile.cache cache before accessing the database, in the form
    of a FromCache or RelationshipCache object.   Each of these objects
    refer to the name of a :class:`dogpile.cache.Region` that's been configured
    and stored in a lookup dictionary.  When such an object has associated
    itself with the CachingQuery, the corresponding :class:`dogpile.cache.Region`
    is used to locate a cached result.  If none is present, then the
    Query is invoked normally, the results being cached.

    The FromCache and RelationshipCache mapper options below represent
    the "public" method of configuring this state upon the CachingQuery.

    """

    def __init__(self, regions, *args, **kw):
        self.cache_regions = regions
        saqry.Query.__init__(self, *args, **kw)

    # noinspection PyCallByClass
    def __iter__(self):
        """override __iter__ to pull results from dogpile
           if particular attributes have been configured.

           Note that this approach does *not* detach the loaded objects from
           the current session. If the cache backend is an in-process cache
           (like "memory") and lives beyond the scope of the current session's
           transaction, those objects may be expired. The method here can be
           modified to first expunge() each loaded item from the current
           session before returning the list of items, so that the items
           in the cache are not the same ones in the current Session.

        """
        if hasattr(self, '_cache_region'):
            return self.get_value(createfunc=lambda: list(
                saqry.Query.__iter__(self)))
        else:
            return saqry.Query.__iter__(self)

    def _get_cache_plus_key(self):
        """Return a cache region plus key."""

        dogpile_region = self.cache_regions[self._cache_region.region]
        if self._cache_region.cache_key:
            if callable(self._cache_region.cache_key):
                key = self._cache_region.cache_key(self)
            else:
                key = self._cache_region.cache_key
        else:
            key = key_from_query(self)
        return dogpile_region, key

    def invalidate(self):
        """Invalidate the cache value represented by this Query."""

        dogpile_region, cache_key = self._get_cache_plus_key()
        dogpile_region.delete(cache_key)

    def get_value(self, merge=True, createfunc=None,
            expiration_time=None, ignore_expiration=False):
        """Return the value from the cache for this query.

        Raise KeyError if no value present and no
        createfunc specified.

        """
        dogpile_region, cache_key = self._get_cache_plus_key()

        # ignore_expiration means, if the value is in the cache
        # but is expired, return it anyway.   This doesn't make sense
        # with createfunc, which says, if the value is expired, generate
        # a new value.
        assert not ignore_expiration or not createfunc, \
            "Can't ignore expiration and also provide createfunc"

        if ignore_expiration or not createfunc:
            cached_value = dogpile_region.get(cache_key,
                                expiration_time=expiration_time,
                                ignore_expiration=ignore_expiration)
        else:
            cached_value = dogpile_region.get_or_create(
                cache_key,
                createfunc,
                expiration_time=expiration_time
            )
        if cached_value is NO_VALUE:
            raise KeyError(cache_key)
        if merge:
            cached_value = self.merge_result(cached_value, load=False)
        return cached_value

    def set_value(self, value):
        """Set the value in the cache for this query."""

        dogpile_region, cache_key = self._get_cache_plus_key()
        dogpile_region.set(cache_key, value)


def query_callable(regions, query_cls=CachingQuery):
    def query(*arg, **kw):
        return query_cls(regions, *arg, **kw)
    return query


# noinspection PyUnusedLocal
def key_from_query(query):
    """Given a Query, create a cache key.

    There are many approaches to this; here we use the simplest,
    which is to create an md5 hash of the text of the SQL statement,
    combined with stringified versions of all the bound parameters
    within it.     There's a bit of a performance hit with
    compiling out "query.statement" here; other approaches include
    setting up an explicit cache key with a particular Query,
    then combining that with the bound parameter values.
    """
    stmt = query.with_labels().statement
    compiled = stmt.compile()
    params = compiled.params
    a = md5_key_mangler(str(compiled))
    return " ".join([a] + [str(params[k]) for k in sorted(params)])
    # return " ".join([str(compiled)] + [str(params[k]) for k in sorted(params)])


class FromCache(sa.orm.interfaces.MapperOption):
    """Specifies that a Query should load results from a cache."""

    propagate_to_loaders = False

    def __init__(self, region="default", cache_key=None):
        """Construct a new FromCache.

        :param region: the cache region.  Should be a
        region configured in the dictionary of dogpile
        regions.

        :param cache_key: optional.  A string cache key
        that will serve as the key to the query.   Use this
        if your query has a huge amount of parameters (such
        as when using in_()) which correspond more simply to
        some other identifier.

        """
        self.region = region
        self.cache_key = cache_key

    def process_query(self, query):
        """Process a Query during normal loading operation."""
        query._cache_region = self


class RelationshipCache(sa.orm.interfaces.MapperOption):
    """Specifies that a Query as called within a "lazy load"
       should load results from a cache."""

    propagate_to_loaders = True

    def __init__(self, attribute, region="default", cache_key=None):
        """Construct a new RelationshipCache.

        :param attribute: A Class.attribute which
        indicates a particular class relationship() whose
        lazy loader should be pulled from the cache.

        :param region: name of the cache region.

        :param cache_key: optional.  A string cache key
        that will serve as the key to the query, bypassing
        the usual means of forming a key from the Query itself.

        """
        self.region = region
        self.cache_key = cache_key
        self._relationship_options = {
            (attribute.property.parent.class_, attribute.property.key): self
        }

    def process_query_conditionally(self, query):
        """Process a Query that is used within a lazy loader.

        (the process_query_conditionally() method is a SQLAlchemy
        hook invoked only within lazyload.)

        """
        # noinspection PyProtectedMember
        if query._current_path:
            # noinspection PyProtectedMember
            mapper, prop = query._current_path[-2:]
            key = prop.key

            for cls in mapper.class_.__mro__:
                if (cls, key) in self._relationship_options:
                    relationship_option = self._relationship_options[(cls, key)]
                    query._cache_region = relationship_option
                    break

    def and_(self, option):
        """Chain another RelationshipCache option to this one.

        While many RelationshipCache objects can be specified on a single
        Query separately, chaining them together allows for a more efficient
        lookup during load.

        """
        # noinspection PyProtectedMember
        self._relationship_options.update(option._relationship_options)
        return self


class UploadCache():

    def __init__(self, root_dir='/tmp/upload_cache'):
        """
        Class to manage a cache for uploaded files.

        :param root_dir: Root directory for the cache, default '/tmp'. As a
            precaution, ``root_dir`` must be '/tmp' or have at least 3 elements,
            like '/home/professor_xavier/foo'.
        :param fs_node: :class:`~pym.fs.models.FsNode` of current request, if
            available
        """
        self._root_dir = root_dir
        """Root directory for the cache"""
        os.makedirs(self.root_dir, exist_ok=True)

        self._fs_node = None
        """:type : pym.fs.models.FsNode"""
        """:class:`~pym.fs.models.FsNode` of current request, if available"""
        self.min_size = 1
        """Minimum file size in bytes"""
        self.max_size = 1024 * 1024 * 2
        """Maximum file size in bytes"""
        self.max_total_size = None
        """Maximum size of this node plus children in bytes"""
        self.max_children = None
        """Maximum amount of children"""
        self.timeout = 60 * 60 * 24  # 1 day
        """Files older than this are purged from cache [seconds]"""
        self.chunk_size = 8192
        """Chunk size for copy operations"""
        self.magic = magic.Magic(mime=True, mime_encoding=True)
        """Instance of mime-type resolver, e.g. :class:`magic.Magic`"""
        self._allow = ['image/*', 'application/pdf']
        self._allow_re = []
        self._deny = []
        self._deny_re = []

        self._files = []
        self.init_mime_pattern()

    def _check_root_dir(self):
        # root_dir must have at least 3 parts, e.g. '/home/dm/foo' or be '/tmp'
        if self._root_dir != '/tmp' and len(self._root_dir.split(os.path.sep)) < 3:
            raise pym.exc.PymError("Invalid root dir: '{}'".format(self._root_dir))

    def _init_quota(self):
        kk = self.fs_node.__class__.RC_KEYS_QUOTA
        for k in kk:
            try:
                setattr(self, k, self.fs_node.rc[k])
            except KeyError:
                pass

    def init_mime_pattern(self):
        """Compiles regexps for the mime-type patterns."""
        star = re.compile(r'(?<!\.)\*')
        rr = []
        a = self._allow
        if isinstance(a, str):
            a = [a]
        for pat in a:
            # replace '*' with '.*' but don't touch '.*'
            pat = star.sub('.*', pat)
            pat = pat.split('/')
            rr.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
        self._allow_re = rr
        rr = []
        a = self._deny
        if isinstance(a, str):
            a = [a]
        for pat in a:
            pat = star.sub('.*', pat)
            pat = pat.split('/')
            rr.append((re.compile(pat[0], re.I), re.compile(pat[1], re.I)))
        self._deny_re = rr

    def create_file(self, f, local_filename=None):
        """
        Factory for :class:`UploadedFile`.

        Does not store uploaded file in cache yet, just creates instance and
        checks the data. Call :meth:`save` to save file in cache.
        """
        if not local_filename:
            local_filename = str(uuid.uuid4())  # .replace('-', os.path.sep)
        u = UploadedFile(self, f, local_filename)
        self._files.append(u)
        return u

    def build_abs_filename(self, local_filename, check=True):
        """
        Builds absolute filename for cached file and ensures, path exists.

        :param local_filename: Name of cached file relative to ``root_dir``.
        :param check: Check if file exists and create local path if necessary.
        :returns: Absolute file name.
        :raises FileExistsError: If cache already has a file with this name.
        """
        fn = os.path.join(self.root_dir, local_filename)
        if check:
            if os.path.exists(fn):
                raise FileExistsError("Cache file exists", fn)
            # Ensure, path for this file exists
            d = os.path.dirname(fn)
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=False)
        return fn

    def save(self, lgg, overwrite=False):
        """
        Saves uploaded data in cache.

        Two files are created: 1 for the data, 2 with ext '.yaml' with metadata.

        :param lgg: Instance of logger
        :param overwrite: Whether an existing file in cache my be overwritten or
            not.
        """
        for f in self.files:
            # Do not save if check denied this file
            if not f.is_ok:
                continue
            try:
                fn = self.build_abs_filename(f.local_filename, check=True)
            except FileExistsError as exc:
                if overwrite:
                    fn = exc.args[1]
                else:
                    lgg.exception(exc)
                    f.exc = exc
                    continue
            # 1. Save content
            fh = open(fn, 'wb')
            try:
                fcntl.flock(fh, fcntl.LOCK_EX)
                f.save_content(fh)
            except OSError as exc:
                lgg.exception(exc)
                f.exc = exc
                continue
            finally:
                fh.close()
            # 2. Save meta incl. xattr
            fn += '.yaml'
            fh = open(fn, 'wt', encoding='utf-8')
            try:
                fcntl.flock(fh, fcntl.LOCK_EX)
                f.save_meta(fh)
            except OSError as exc:
                lgg.exception(exc)
                f.exc = exc
            finally:
                fh.close()

    def read(self, fn, size=-1):
        """
        Reads the file and returns content as bytes.

        :param fn: Filename
        :param size: Size on bytes to read, if -1 reads all.
        :return: bytes
        """
        fn_data = os.path.join(self.root_dir, fn)
        with open(fn_data, 'rb') as fh:
            return fh.read(size)

    def open(self, fn):
        """
        Returns settings and an opened file handle

        DO NOT FORGET TO CLOSE THE FILE HANDLE AFTER USE!

        :param fn: Filename
        :return: 2-tuple: (file handle, meta data)
        """
        fn_data = os.path.join(self.root_dir, fn)
        fn_rc = os.path.join(self.root_dir, fn) + '.yaml'
        with open(fn_rc, 'rt', encoding='utf-8') as fh:
            rc = yaml.load(fh)
        fh = open(fn_data, 'rb')
        return fh, rc

    def delete(self, fn):
        """
        Deletes this file from cache, incl. metadata file.
        """
        self._check_root_dir()
        fn_data = os.path.join(self.root_dir, fn)
        fn_rc = os.path.join(self.root_dir, fn) + '.yaml'
        try:
            os.remove(fn_data)
        except OSError:
            pass
        try:
            os.remove(fn_rc)
        except OSError:
            pass

    def purge(self, timeout=None):
        """
        Deletes all files from cache older than ``timeout`` in seconds.
        """
        if not timeout:
            timeout = self.timeout
        rp = PurePath(self.root_dir)
        threshold = time.time() - timeout
        for root, dirs, files in os.walk(self.root_dir):
            for f in files:
                fn = PurePath(root, f)
                if fn.name.endswith('.yaml'):
                    continue
                if os.path.getctime(str(fn)) < threshold:
                    self.delete(str(fn.relative_to(rp)))

    @property
    def fs_node(self):
        return self._fs_node

    @fs_node.setter
    def fs_node(self, v):
        self._fs_node = v
        self._init_quota()

    @property
    def root_dir(self):
        """Root directory of cache."""
        self._check_root_dir()
        return self._root_dir

    @property
    def allow(self):
        """
        List of mime-type patterns that are allowed. Set '*/*' to allow all
        mime-types.
        """
        return self._allow

    @allow.setter
    def allow(self, v):
        self._allow = v
        self.init_mime_pattern()

    @property
    def allow_re(self):
        """Compiled regex"""
        return self._allow_re

    @property
    def deny(self):
        """
        List of mime-type patterns that are denied. If empty, no mime-types
        are denied.
        """
        return self._deny

    @deny.setter
    def deny(self, v):
        self._deny = v
        self.init_mime_pattern()

    @property
    def deny_re(self):
        """Compiled regex"""
        return self._deny_re

    @property
    def files(self):
        """List of file instances"""
        return self._files


class UploadedFile():

    def __init__(self, cache, f, local_filename):
        """
        Instance of an uploaded file.

        :param cache: Instance of the cache manager.
        :param f: A file-like object as created by ``cgi.fieldStorage``.
        :param local_filename: Save file with this name in cache. If None, we
            use a UUID. Original name is available as ``client_filename``.
        """
        self.cache = cache
        """Instance of the cache manager"""
        self.f = f
        """A file-like object as created by ``cgi.fieldStorage``"""
        self._local_filename = local_filename

        self._size = None
        self._local_mime_type = None
        self._exc = None
        self._xattr = None

        self.check()

    def check(self):
        """
        Determines whether we accept this file or not.

        Currently performs checks on mime-types and sizes.

        If file is not accepted, we return False, and the corresponding
        exception is available in attribute ``exc``.
        """
        try:
            self.check_mime_type()
            self.check_size()
            return True
        except pym.exc.UploadDeniedError as exc:
            self._exc = exc
        return False

    def check_mime_type(self):
        """Performs checks on mime-types."""
        good = False
        ty = self.local_mime_type.split('/')

        rr = self.cache.allow_re
        for r in rr:
            if r[0].search(ty[0]) and r[1].search(ty[1]):
                good = True
                break
        if not good:
            raise pym.exc.UploadDeniedError(
                "Mime-type not allowed: '{}'".format(ty))

        rr = self.cache.deny_re
        for r in rr:
            if r[0].search(ty[0]) or r[1].search(ty[1]):
                good = False
                break
        if not good:
            raise pym.exc.UploadDeniedError("Mime-type denied: '{}'".format(ty))

    def check_size(self):
        """Performs checks on sizes."""
        ok = self.cache.min_size <= self.size <= self.cache.max_size
        if not ok:
            raise pym.exc.UploadDeniedError("File too large")
        if self.cache.fs_node:
            if self.cache.max_total_size:
                ok = self.cache.max_size >= (self.cache.fs_node.total_size
                                             + self.size)
                if not ok:
                    raise pym.exc.UploadDeniedError("File too large")
            if self.cache.max_children:
                ok = self.cache.fs_node.cnt_children < self.cache.max_children
                if not ok:
                    raise pym.exc.UploadDeniedError("Too many files")

    def save_content(self, fout):
        """
        Saves content in given file handle.

        Caller should have opened file as binary for writing.
        """
        while True:
            data = self.f.file.read(self.cache.chunk_size)
            if not data:
                break
            fout.write(data)

    def save_meta(self, fout):
        """
        Saves meta data as YAML in given file handle.

        Caller should have opened file a text with encoding 'utf-8' for writing.
        """
        if not self.is_ok:
            raise self._exc
        d = self.meta
        d['xattr'] = self.xattr
        dump_yaml(d, fout)

    @property
    def is_ok(self):
        """Is True, if checks did not produce an exception. False otherwise."""
        return self._exc is None

    @property
    def exc(self):
        """Exception produced by checks or None."""
        return self._exc

    @exc.setter
    def exc(self, v):
        self._exc = v

    @property
    def xattr(self):
        """Extended attributes, e.g. determined with TIKA"""
        return self._xattr

    @xattr.setter
    def xattr(self, v):
        self._xattr = v

    @property
    def meta(self):
        """
        Meta data as determined from uploaded data:

            {
                'size': self.size,
                'client_filename': self.client_filename,
                'client_mime_type': self.client_mime_type,
                'local_mime_type': self.local_mime_type
            }
        """
        return {
            'size': self.size,
            'client_filename': self.client_filename,
            'client_mime_type': self.client_mime_type,
            'local_mime_type': self.local_mime_type
        }

    @property
    def size(self):
        """Size of uploaded data in bytes"""
        if not self._size:
            self.f.file.seek(0, 2)  # Seek to the end of the file
            self._size = self.f.file.tell()  # Get the position of EOF
            self.f.file.seek(0)  # Reset the file position to the beginning
        return self._size

    @property
    def client_filename(self):
        """Filename as given by client, sanitised with
        :func:`pym.security.safepath`."""
        return pym.security.safepath(self.f.filename)

    @property
    def local_filename(self):
        """Filename used locally in cache"""
        return self._local_filename

    @property
    def client_mime_type(self):
        """Mime-type as given by client"""
        return self.f.type

    @property
    def local_mime_type(self):
        """Mime-type as locally determined from uploaded data."""
        if not self._local_mime_type:
            self.f.file.seek(0)
            self._local_mime_type = self.cache.magic.from_buffer(
                self.f.file.read(1024)).decode('ASCII')
            self.f.file.seek(0)
        return self._local_mime_type


class CachedCollection():
    __metaclass__ = abc.ABCMeta

    def __init__(self, memory, cache=None, key=None, expire=None):
        """
        Abstract base class for cached collections.

        A cached collection, e.g. a list or a dict, has a memory representation,
        which typically is just a Python standard type, and a cached
        representation.

        Each child class may implement more methods, appropriate for the
        respective data type.

        :param memory: The type for in-memory storage, e.g. a list or a dict.
        :param cache: A connection to a backend cache. Currently this must be a
            Redis connection.
        :param key: Key to store this collection in cache. Mind that this is the
            key for the whole data structure, not for individual keys e.g. of a
            dict. If None, we use the default key
            ``"pym:cached_collection:" + uuid.uuid4().hex``.
        :param expire: Seconds after which the cache key (and the memory
            representation) expires. If None, expires never.
        """
        self.ctime = time.time()
        self.memory = memory
        self.cache = cache
        self.key = key if key else 'pym:cached_collection:' + uuid.uuid4().hex
        self._expire = expire

    def ttl(self):
        """
        Returns time-to-live in seconds.
        """
        if self.cache:
            return self.cache.ttl(self.key)
        else:
            if self._expire:
                return self.ctime + self._expire - time.time()
            else:
                return 999999

    def clear(self):
        """Clears collection in memory and in cache."""
        self.memory.clear()
        self.cache.delete(self.key)

    @abc.abstractmethod
    def save(self):
        """
        Saves data of memory representation to cache.

        Since attribute ``memory`` is a reference to another mutable, that
        mutable might be populated independent of the cache. Calling ``save()``
        then stores the complete data in the cache in one go.
        """
        pass

    @abc.abstractmethod
    def load(self):
        """
        Loads data from cache into memory representation.
        """
        pass

    @property
    def expire(self):
        """Returns expire time in seconds"""
        return self._expire

    @expire.setter
    def expire(self, secs):
        """Sets expire time in seconds"""
        self._expire = secs
        if self.cache:
            if secs:
                self.cache.expire(self.key, secs)
            else:
                self.cache.persist(self.key)


class CachedSequence(CachedCollection, collections.abc.MutableSequence):

    def save(self):
        if self.cache and self.memory is not None:
            self.cache.delete(self.key)
            for v in self.memory:
                self.cache.rpush(self.key, pickle.dumps(v))

    def load(self):
        if self.cache and self.memory is not None:
            self.memory.clear()
            y = self.cache.llen(self.key)
            mm = [pickle.loads(m) for m in self.cache.lrange(self.key, 0, y)]
            self.memory.extend(mm)

    def load_range(self, x=0, y=None):
        if self.cache and self.memory is not None:
            if y is None:
                y = self.cache.llen(self.key)
            mm = [pickle.loads(m) for m in self.cache.lrange(self.key, x, y)]
            self.memory.extend(mm)

    def insert(self, index, value):
        raise NotImplementedError('TODO')

    def append(self, value):
        self.memory.append(value)
        if self.cache:
            self.cache.rpush(self.key, pickle.dumps(value))

    def __getitem__(self, key):
        try:
            if self.ttl() < 1:
                raise IndexError("Key expired", key)
            return self.memory[key]
        except IndexError:
            if self.cache and key < self.cache.llen(self.key):
                # Load wanted index from cache
                v = pickle.loads(self.cache.lindex(self.key, key))
                # Make sure that memory has enough items to satisfy the same key
                # next time.
                # (No need to append v to memory, load_range includes v.)
                if key >= len(self.memory):
                    self.load_range(len(self.memory), key)
                lm = len(self.memory)
                assert lm == key + 1, 'len memory {} != key+1 {}'.format(lm, key + 1)
                return v
            else:
                raise

    def __setitem__(self, key, value):
        self.memory[key] = value
        if self.cache:
            self.cache.lset(self.key, key, pickle.dumps(value))

    def __len__(self):
        if self.cache:
            return self.cache.llen(self.key)
        else:
            return len(self.memory)

    def __delitem__(self, key):
        raise NotImplementedError('TODO')


class CachedMapping(CachedCollection, collections.abc.MutableMapping):

    def save(self):
        self.cache.delete(self.key)
        for k, v in self.memory.items():
            self.cache.hset(self.key, k, pickle.dumps(v))

    def load(self):
        if self.cache and self.memory:
            self.memory.clear()
            self.memory.update(self.cache.hgetall(self.key))

    def __getitem__(self, key):
        try:
            if self.ttl() < 1:
                raise KeyError("Key expired", key)
            return self.memory[key]
        except KeyError:
            if self.cache and self.cache.hexists(self.key, key):
                v = pickle.loads(self.cache.hget(self.key, key))
                self[key] = v
                return v
            else:
                raise

    def __setitem__(self, key, value):
        self.memory[key] = value
        if self.cache:
            self.cache.hset(self.key, key, pickle.dumps(value))

    def __iter__(self):
        if self.cache:
            for k, v in self.cache.hscan_iter(self.key):
                yield k
        else:
            return self.memory.__iter__()

    def __len__(self):
        if self.cache:
            return self.cache.hlen(self.key)
        else:
            return len(self.memory)

    def __delitem__(self, key):
        del self.memory[key]
        if self.cache:
            self.cache.hdel(self.key)

    def __contains__(self, key):
        if self.cache:
            return True if self.cache.hexists(self.key, key) else False
        else:
            return key in self.memory


class CachedDefaultMapping(CachedMapping):

    def __init__(self, default_factory, memory, cache=None, key='pym:cached_hash', expire=None):
        super().__init__(memory=memory, cache=cache, key=key, expire=expire)
        self.default_factory = default_factory

    def __getitem__(self, key):
        try:
            if self.ttl() < 1:
                raise KeyError("Key expired", key)
            return self.memory[key]
        except KeyError:
            if self.cache and self.cache.hexists(self.key, key):
                v = pickle.loads(self.cache.hget(self.key, key))
                self[key] = v
                return v
            else:
                return self.__missing__(key)

    def __missing__(self, key):
        if not self.default_factory:
            raise KeyError(key)
        v = self.default_factory(key)
        self[key] = v
        return v