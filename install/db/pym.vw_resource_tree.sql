CREATE OR REPLACE VIEW pym.vw_resource_tree AS
  (
    WITH RECURSIVE other AS (
      SELECT
        NULL :: text [] AS parents,
        p.sortix::text || p.name                     AS sortpath,
        0                                            AS lvl,
        ''::text                                     AS ind,
        p.id,
        p.parent_id,
        p.name :: text as name,
        p.sortix
      FROM pym.resource_tree p
      WHERE p.parent_id IS NULL
      UNION ALL
      SELECT
        ARRAY [o.id :: TEXT, o.name :: TEXT] || o.parents AS parents,
        o.sortpath || ',' || (p.sortix :: text || p.name) AS sortpath,
        o.lvl + 1                                         AS lvl,
        o.ind || '  '                                     AS ind,
        p.id,
        p.parent_id,
        p.name,
        p.sortix
      FROM pym.resource_tree p
        JOIN other o ON p.parent_id = o.id
    )
    SELECT
      other.id,
      other.ind || other.name as name_ind,
      other.name,
      other.parent_id,
      other.lvl,
      other.parents,
      other.sortpath,
      other.sortix
    FROM other
    ORDER BY other.sortpath NULLS FIRST, other.sortix, other.name
  );

COMMENT ON VIEW pym.vw_resource_tree IS
'View resource nodes as a tree.';

