CREATE OR REPLACE VIEW pym.vw_resource_acl_browse AS
  (
    SELECT
      acl.id,
      acl.resource_id,
      res.name    AS resource_name,
      res.parents AS resource_parents,
      acl.group_id,
      g.name      AS group_name,
      g.kind      AS group_kind,
      acl.user_id,
      u.principal AS user_principal,
      acl.permission_id,
      p.name      AS perm_name,
      p.parents   AS perm_parents,
      acl.allow,
      acl.descr,
      acl.ctime,
      acl.owner_id,
      o.principal AS owner,
      acl.mtime,
      acl.editor_id,
      e.principal AS editor,
      acl.dtime,
      acl.deleter_id,
      d.principal AS deleter
    FROM pym.resource_acl acl
      LEFT JOIN pym.vw_resource_tree res ON res.id = acl.resource_id
      LEFT JOIN pym."user" u ON u.id = acl.user_id
      LEFT JOIN pym."group" g ON g.id = acl.group_id
      LEFT JOIN pym.vw_permission_tree p ON p.id = acl.permission_id
      LEFT JOIN pym."user" o ON o.id = acl.owner_id
      LEFT JOIN pym."user" e ON e.id = acl.editor_id
      LEFT JOIN pym."user" d ON d.id = acl.deleter_id
  );

COMMENT ON VIEW pym.vw_resource_acl_browse IS
'Browse ACL with their resource nodes.';
