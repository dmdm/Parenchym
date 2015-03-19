NODE_NAME_FS = 'fs'

MIME_TYPE_DIRECTORY = 'inode/directory'
MIME_TYPE_JSON = 'application/json'
MIME_TYPE_DEFAULT = 'application/octet-stream'
MIME_TYPE_UNKNOWN = 'application/x-unknown'

TIKA_CMD = 'tika'

DEFAULT_RC_SCHEMA = {
    'max_size': 20 * 1024 * 1024,
    'max_total_size': 1000 * 1024 * 1024,
    'max_total_items': -1,
    'allowed_mimes': ['*/*'],
    'denied_mimes': [],
    'force_revision': False
}
