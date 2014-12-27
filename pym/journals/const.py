from enum import Enum

NODE_NAME_JOURNALS = 'journals'


class Journals(Enum):
    proceedings_of_foo = {'name': 'proceedings_of_foo', 'title': 'Proceedings of Foo'}
    the_bar = {'name': 'the_bar', 'title': 'The Bar'}
