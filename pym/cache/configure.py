import pym.cache


def configure_cache_regions(rc):
    regions = rc.g('cache.regions')
    for reg in regions:
        backend = rc.g('cache.{}.backend'.format(reg))
        arguments = rc.get_these('cache.{}.arguments.'.format(reg))
        r = getattr(pym.cache, reg)
        r.configure(backend, arguments=arguments)
