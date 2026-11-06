import { json, readJson, validOrigin } from "../../_lib/common.js";
import { createSession } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ error: "Request not allowed." }, 403);
  }

  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json(
      { error: "Owner login is not configured yet." },
      503
    );
  }

  const data = await readJson(request);
  const supplied =
    typeof data?.password === "string" ? data.password : "";

  const suppliedBytes = new TextEncoder().encode(supplied);
  const passwordBytes = new TextEncoder().encode(env.ADMIN_PASSWORD);

  let difference = suppliedBytes.length ^ passwordBytes.length;

  for (
    let i = 0;
    i < Math.max(suppliedBytes.length, passwordBytes.length);
    i++
  ) {
    difference |=
      (suppliedBytes[i] || 0) ^ (passwordBytes[i] || 0);
  }

  if (difference !== 0) {
    return json({ error: "Password not recognised." }, 401);
  }

  const token = await createSession(env.SESSION_SECRET);

  return json(
    { ok: true },
    200,
    {
      "Set-Cookie":
        `sis_owner=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`,
    }
  );
}
