CREATE OR REPLACE VIEW pym.vw_user_browse AS
  (
    SELECT
      "user".id             AS id,
      "user".is_enabled     AS is_enabled,
      "user".disable_reason AS disable_reason,
      "user".is_blocked     AS is_blocked,
      "user".blocked_since  AS blocked_since,
      "user".blocked_until  AS blocked_until,
      "user".block_reason   AS block_reason,
      "user".principal      AS principal,
      "user".pwd            AS pwd,
      "user".pwd_expires    AS pwd_expires,
      "user".identity_url   AS identity_url,
      "user".email          AS email,
      "user".first_name     AS first_name,
      "user".last_name      AS last_name,
      "user".display_name   AS display_name,
      "user".login_time     AS login_time,
      "user".login_ip       AS login_ip,
      "user".access_time    AS access_time,
      "user".kick_session   AS kick_session,
      "user".kick_reason    AS kick_reason,
      "user".logout_time    AS logout_time,
      "user".descr          AS descr,
      "user".mtime          AS mtime,
      "user".editor_id      AS editor_id,
      e.display_name        AS editor_display_name,
      "user".ctime          AS ctime,
      "user".owner_id       AS owner_id,
      o.display_name        AS owner_display_name
    FROM pym."user"
      JOIN pym."user"      AS o ON pym."user".owner_id = o.id
      LEFT JOIN pym."user" AS e ON pym."user".editor_id = e.id
  );

COMMENT ON VIEW pym.vw_user_browse IS
'Browse users with looked up names.';
