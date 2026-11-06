import {
  json,
  readJson,
  cleanBody,
  randomHex,
  validOrigin,
} from "../../_lib/common.js";
import { isOwner, unauthorized } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ error: "Request not allowed." }, 403);
  }

  if (!(await isOwner(request, env))) {
    return unauthorized();
  }

  const data = await readJson(request);
  const conversationId =
    typeof data?.id === "string" ? data.id : "";
  const body = cleanBody(data?.body);

  if (!conversationId || body.length < 2) {
    return json({ error: "Please enter a reply." }, 400);
  }

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `INSERT INTO messages
       (id, conversation_id, sender, body, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(randomHex(16), conversationId, "owner", body, now)
    .run();

  await env.DB
    .prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
    .bind(now, conversationId)
    .run();

  return json({ ok: true });
}
