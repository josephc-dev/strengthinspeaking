import { json } from "./common.js";

function b64url(bytes) {
  let binary = "";

  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return b64url(signature);
}

export async function createSession(secret) {
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        exp: Date.now() + 8 * 60 * 60 * 1000,
        role: "owner",
      })
    )
  );

  return `${payload}.${await sign(payload, secret)}`;
}

export async function isOwner(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = (cookie.match(/(?:^|;\s*)sis_owner=([^;]+)/) || [])[1];

  if (!token || !env.SESSION_SECRET) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const expected = await sign(parts[0], env.SESSION_SECRET);

  if (expected.length !== parts[1].length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ parts[1].charCodeAt(i);
  }

  if (difference !== 0) {
    return false;
  }

  try {
    const payloadText = parts[0]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(atob(payloadText));

    return payload.role === "owner" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function unauthorized() {
  return json(
    { error: "Please sign in again." },
    401,
    {
      "Set-Cookie":
        "sis_owner=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0",
    }
  );
}
