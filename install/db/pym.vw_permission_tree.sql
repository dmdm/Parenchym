-- List all permissions with their respective parent path.
-- Root permissions (i.e. without parent) are also listed.

--    ID      name           parents
--    ---------------------------------------------
--     1      *              NULL
--     2      visit          NULL
--     3      delete         {{2,visit}}
--     4      read           {{2,visit}}
--     5      admin          {{2,visit}}
--     6      write          {{4,read},{2,visit}}
--     7      admin_auth     {{5,admin},{2,visit}}
--     8      admin_res      {{5,admin},{2,visit}}

CREATE OR REPLACE VIEW pym.vw_permission_tree AS
  (
    WITH RECURSIVE other AS (
      SELECT
        ARRAY [ARRAY [p.id :: TEXT, p.name :: TEXT]] AS path,
        NULL :: TEXT []                              AS parents,
        p.id,
        p.parent_id,
        p.name
      FROM pym.permission_tree p
      WHERE p.parent_id IS NULL
      UNION ALL
      SELECT
        ARRAY [p.id :: TEXT, p.name :: TEXT] || other_1.path AS path,
        other_1.path [0 :array_upper(other_1.path, 1) + 1]   AS parents,
        p.id,
        p.parent_id,
        p.name
      FROM pym.permission_tree p
        JOIN other other_1 ON p.parent_id = other_1.id
    )
    SELECT
      other.id,
      other.name,
      other.parents
    FROM other
    ORDER BY other.parents NULLS FIRST
  );

COMMENT ON VIEW pym.vw_permission_tree IS
'List all permissions with their respective parent path.';

