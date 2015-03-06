CREATE OR REPLACE VIEW pym.vw_group_member_browse AS
(
    SELECT
      gm.id           AS id,
      gr.id           AS group_id,
      t.id            AS tenant_id,
      t.name          AS tenant_name,
      gr.name         AS group_name,
      mu.id           AS member_user_id,
      mu.principal    AS member_user_principal,
      mu.email        AS member_user_email,
      mu.display_name AS member_user_display_name,
      mgr.id          AS member_group_id,
      mgr.name        AS member_group_name,
      gm.ctime        AS ctime,
      gm.owner_id     AS owner_id,
      o.display_name  AS owner_display_name
    FROM pym.group_member gm
      JOIN pym."user" AS o ON gm.owner_id = o.id
      JOIN pym."group" AS gr ON gm.group_id = gr.id
      LEFT JOIN pym."user" AS mu ON gm.member_user_id = mu.id
      LEFT JOIN pym."group" AS mgr ON gm.member_group_id = mgr.id
      LEFT JOIN pym.resource_tree t ON gr.tenant_id = t.id AND t.kind = 'tenant'
);

COMMENT ON VIEW pym.vw_group_member_browse IS
'Browse group members with looked up names of members.';
