import { json, validOrigin } from "../../_lib/common.js";

export async function onRequestPost({ request }) {
  if (!validOrigin(request)) {
    return json({ error: "Request not allowed." }, 403);
  }

  return json(
    { ok: true },
    200,
    {
      "Set-Cookie":
        "sis_owner=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0",
    }
  );
}
