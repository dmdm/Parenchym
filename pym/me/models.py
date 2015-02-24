import pyramid.i18n
import zope.interface
import pym.i18n


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


class IMeNode(zope.interface.Interface):
    pass


class IMeProfileNode(zope.interface.Interface):
    pass
