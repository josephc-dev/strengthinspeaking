import { json, readJson, codeHash } from "../../_lib/common.js";

export async function onRequestPost({ request, env }) {
  const data = await readJson(request);
  const code = typeof data?.code === "string" ? data.code.trim() : "";

  if (code.length < 10 || code.length > 50) {
    return json(
      { error: "That conversation code was not recognised." },
      404
    );
  }

  const conversation = await env.DB
    .prepare("SELECT id FROM conversations WHERE code_hash = ?")
    .bind(await codeHash(code))
    .first();

  if (!conversation) {
    return json(
      { error: "That conversation code was not recognised." },
      404
    );
  }

  const rows = await env.DB
    .prepare(
      `SELECT sender, body, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC
       LIMIT 100`
    )
    .bind(conversation.id)
    .all();

  return json({ messages: rows.results || [] });
}
