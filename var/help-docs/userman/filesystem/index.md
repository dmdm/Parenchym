title: Filesystem

Filesystem
==========

One of Parenchym's cornerstones is the resource tree. It describes a hierarchy
of nodes that e.g. is reflected in the URLs, the places within Parenchym you can
visit. One nice feature of such a tree is that each node may have additional data
attached, and descendant nodes may inherit that data. Parenchym uses this
technique for permission checks in its authorization policy.

The filesystem is an extension of the resource tree. Additionally to the above
the filesystem allows you to upload arbitrary data to each node. In traditional
terms, the filesystem shows you the resource tree as a hierarchy of directories
and enables you to upload files into those directories.

Typically, the filesystem is a direct descendant of the tenant node, like this:

~~~{.text}
    \                              the root node of the resource tree
    |
    +-- default                    the default tenant
         |
         +-- fs                    the root node of the filesystem
              |
              +-- a.txt            a file
              +-- foo              a directory
                   |
                   +-- b.txt       another file
~~~

Strictly speaking, Parenchym does not discern between files and directories,
it only knows nodes, and the same node may have uploaded data (be
file-ish) and also may have children (be folder-ish) at the same time.

Open the [browse view](/default/fs/@@_br_) of the filesystem.


