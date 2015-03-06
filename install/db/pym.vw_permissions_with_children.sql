-- List all permissions with their children.
--
--  CAVEAT: Permissions without children do not appear in result
--          (this is intended)!
--
--   ID    name          children
--   ------------------------------------------------
--    5    admin         {{7,admin_auth}}
--    5    admin         {{8,admin_res}}
--    4    read          {{6,write}}
--    2    visit         {{3,delete}}
--    2    visit         {{4,read}}
--    2    visit         {{4,read},{6,write}}
--    2    visit         {{5,admin}}
--    2    visit         {{5,admin},{7,admin_auth}}
--    2    visit         {{5,admin},{8,admin_res}}

CREATE OR REPLACE VIEW pym.vw_permissions_with_children AS
  (
    WITH RECURSIVE other AS
    (
      -- non-recursive term
      SELECT
        ARRAY [ARRAY [p.id :: TEXT, p.name :: TEXT]] AS path,
        NULL :: TEXT []                              AS children,
        p.id,
        p.parent_id,
        name
      FROM pym.permission_tree p
      WHERE p.parent_id IS NOT NULL

      UNION ALL

      -- recursive term
      SELECT
        ARRAY [p.id :: TEXT, p.name :: TEXT] || o.path AS path,
        path [1 :array_upper(path, 1)]                 AS children,
        p.id,
        p.parent_id,
        p.name
      FROM
        pym.permission_tree AS p
        JOIN other AS o ON (p.id = o.parent_id)
    )
    SELECT
      id,
      name,
      children
    FROM other
      WHERE array_length(children, 1) > 0
    ORDER BY name, children
  );
select * from pym.vw_permissions_with_children;
COMMENT ON VIEW pym.vw_permissions_with_children IS
'List permissions with children. CAVEAT: Permissions without children do not appear in result (this is intended)!';
