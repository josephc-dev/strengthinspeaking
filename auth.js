
import { json } from "./common.js";

export function unauthorized() {
  return json({error:"Please sign in to access this page."},401);
}

export async function isOwner(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)owner_session=([a-f0-9]+)/);

  if (!match || !env.SESSION_SECRET) return false;

  const expected = await sessionToken(env.SESSION_SECRET);
  return match[1] === expected;
}

export async function sessionToken(secret) {
  const data = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(digest)]
    .map(b=>b.toString(16).padStart(2,"0"))
    .join("");
}
