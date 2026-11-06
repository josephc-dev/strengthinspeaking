import { json } from "../../_lib/common.js";
import { isOwner, unauthorized } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!(await isOwner(request, env))) {
    return unauthorized();
  }

  const rows = await env.DB
    .prepare(
      `SELECT
         c.id,
         c.created_at,
         c.updated_at,
         m.body AS latest_body,
         m.created_at AS latest_at
       FROM conversations c
       LEFT JOIN messages m ON m.id = (
         SELECT id
         FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       )
       ORDER BY c.updated_at DESC
       LIMIT 100`
    )
    .all();

  return json({ conversations: rows.results || [] });
}
