CREATE OR REPLACE VIEW pym.vw_group_browse AS
  (
    SELECT
      "group".id        AS id,
      "group".tenant_id AS tenant_id,
      t.name            AS tenant_name,
      "group".name      AS name,
      "group".kind      AS kind,
      "group".descr     AS descr,
      "group".mtime     AS mtime,
      "group".editor_id AS editor_id,
      e.display_name    AS editor_display_name,
      "group".ctime     AS ctime,
      "group".owner_id  AS owner_id,
      o.display_name    AS owner_display_name
    FROM pym."group"
      JOIN pym."user"             AS o ON pym."group".owner_id = o.id
      LEFT JOIN pym."user"        AS e ON pym."group".editor_id = e.id
      LEFT JOIN pym.resource_tree AS t
        ON pym."group".tenant_id = t.id
           AND t.kind = 'tenant'
  );

COMMENT ON VIEW pym.vw_group_browse IS
'Browse groups with looked up names.';
