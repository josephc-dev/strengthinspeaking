import {
  json,
  readJson,
  codeHash,
  cleanBody,
  rateLimit,
  validOrigin,
  randomHex,
} from "../../_lib/common.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ error: "Request not allowed." }, 403);
  }

  if (!(await rateLimit(request, env, 10))) {
    return json(
      { error: "Please wait before sending another reply." },
      429
    );
  }

  const data = await readJson(request);
  const code = typeof data?.code === "string" ? data.code.trim() : "";
  const body = cleanBody(data?.body);

  if (body.length < 2) {
    return json(
      { error: "Please write a little more before sending." },
      400
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

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `INSERT INTO messages
       (id, conversation_id, sender, body, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(randomHex(16), conversation.id, "visitor", body, now)
    .run();

  await env.DB
    .prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
    .bind(now, conversation.id)
    .run();

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
