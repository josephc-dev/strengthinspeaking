import { json, readJson } from "../../_lib/common.js";
import { isOwner, unauthorized } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!(await isOwner(request, env))) {
    return unauthorized();
  }

  const data = await readJson(request);
  const id = typeof data?.id === "string" ? data.id : "";

  if (!id) {
    return json({ error: "Conversation not found." }, 404);
  }

  const rows = await env.DB
    .prepare(
      `SELECT sender, body, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC
       LIMIT 200`
    )
    .bind(id)
    .all();

  return json({ messages: rows.results || [] });
}
