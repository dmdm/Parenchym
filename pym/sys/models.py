import pyramid.i18n
import zope.interface
import pym.i18n


_ = pyramid.i18n.TranslationStringFactory(pym.i18n.DOMAIN)


class ISysNode(zope.interface.Interface):
    pass


class ISysCacheMgmtNode(zope.interface.Interface):
    pass
