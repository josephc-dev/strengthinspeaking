import {
  json,
  readJson,
  randomHex,
  codeHash,
  cleanBody,
  rateLimit,
  validOrigin,
} from "../_lib/common.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ error: "Request not allowed." }, 403);
  }

  if (!env.DB) {
    return json({ error: "Messaging is not configured yet." }, 503);
  }

  if (!(await rateLimit(request, env, 5))) {
    return json(
      { error: "Please wait before sending another message." },
      429
    );
  }

  const data = await readJson(request);

  if (!data) {
    return json({ error: "Please enter a message." }, 400);
  }

  // Hidden anti-spam field. Real visitors should leave this empty.
  if (data.website) {
    return json({ error: "Message could not be accepted." }, 400);
  }

  const body = cleanBody(data.body);

  if (body.length < 2) {
    return json(
      { error: "Please write a little more before sending." },
      400
    );
  }

  const code = randomHex(16)
    .toUpperCase()
    .match(/.{1,4}/g)
    .join("-");

  const conversationId = randomHex(16);
  const messageId = randomHex(16);
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `INSERT INTO conversations (id, code_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(conversationId, await codeHash(code), now, now)
    .run();

  await env.DB
    .prepare(
      `INSERT INTO messages (id, conversation_id, sender, body, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(messageId, conversationId, "visitor", body, now)
    .run();

  return json(
    {
      code,
      messages: [
        {
          sender: "visitor",
          body,
          created_at: now,
        },
      ],
    },
    201
  );
}
