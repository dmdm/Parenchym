import abc
import collections.abc
import pickle
import time
import uuid
from hashlib import md5

import sqlalchemy as sa
import sqlalchemy.orm.interfaces
import sqlalchemy.orm.query as saqry
import sqlalchemy.orm.session

# noinspection PyPackageRequirements
from dogpile.cache import make_region
# noinspection PyPackageRequirements
from dogpile.cache.api import NO_VALUE


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

        If no expire time is set, returns None.
        """
        if self.cache:
            v = self.cache.ttl(self.key)
            if v == -1:
                return None
        else:
            if self._expire is None:
                return None
            else:
                return self.ctime + self._expire - time.time()

    def clear(self):
        """Clears collection in memory and in cache."""
        self.memory.clear()
        self.cache.delete(self.key)
        self.ctime = time.time()

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
            if secs is None:
                self.cache.persist(self.key)
            else:
                self.cache.expire(self.key, secs)


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
            if self.ttl() is None or self.ttl() > 0:
                return self.memory[key]
            else:
                raise KeyError("Key expired", key)
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
            if self.ttl() is None or self.ttl() > 0:
                return self.memory[key]
            else:
                raise KeyError("Key expired", key)
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
            if self.ttl() is None or self.ttl() > 0:
                return self.memory[key]
            else:
                raise KeyError("Key expired", key)
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