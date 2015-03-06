CREATE OR REPLACE VIEW pym.vw_resource_tree AS
  (
    WITH RECURSIVE other AS (
      SELECT
        ARRAY [ARRAY [p.id :: TEXT, p.name :: TEXT]] AS path,
        NULL :: TEXT []                              AS parents,
        0                                            AS lvl,
        p.id,
        p.parent_id,
        p.name,
        p.sortix
      FROM pym.resource_tree p
      WHERE p.parent_id IS NULL
      UNION ALL
      SELECT
        ARRAY [p.id :: TEXT, p.name :: TEXT] || o.path AS path,
        o.path [0 :array_upper(o.path, 1) + 1]         AS parents,
        o.lvl + 1                                      AS lvl,
        p.id,
        p.parent_id,
        p.name,
        p.sortix
      FROM pym.resource_tree p
        JOIN other o ON p.parent_id = o.id
    )
    SELECT
      other.id,
      other.name,
      other.parents,
      other.lvl,
      other.sortix
    FROM other
    ORDER BY other.lvl, other.sortix, other.name
  );

COMMENT ON VIEW pym.vw_resource_tree IS
'View resource nodes as a tree.';

