"""
==========
Filesystem
==========

Parenchym builds the filesystem upon its resource tree, thus leveraging
traversal and inheritable properties like the ACL for download URLs.

The filesystem is a hierarchy of nodes (:class:`~pym.fs.models.FsNode`), and its
root node is typically the first and only FsNode child of the tenant node.

A file, i.e. its properties like ``size``, ``mime_type``, ``xattr``
(extended attributes) etc., and its content, is stored as a separate entity,
with a reference to the FsNode to which it belongs.

We can store different revisions of the same file, and the containing FsNode
reflects the properties of the most recent (=active) revision.

On storing a file, Parenchym determines its mime-type, and stores its content
accordingly in a text field, a JSON field or, in a binary field.

If the file is an archive, like zip, but also like any modern office file (odt,
docx) we read the table of contents of that archive and store it in its own
field (``toc``).

A file may even be further processed, e.g. by TIKA, and the resulting meta data
is stored in field ``xattr`` as a JSON structure.

"""