
export function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function sha256(value) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(bytes)]
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");
}

export function randomHex(bytes=24) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map(b => b.toString(16).padStart(2,"0")).join("");
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function validOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function rateLimit(request, env, max=5) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const salt = env.RATE_LIMIT_SALT || env.SESSION_SECRET || "missing-secret";
  const ipHash = await sha256(ip + salt);
  const bucket = new Date().toISOString().slice(0,13);

  await env.DB.prepare(
    "DELETE FROM rate_limits WHERE bucket < ?"
  ).bind(
    new Date(Date.now()-48*3600000).toISOString().slice(0,13)
  ).run();

  const row = await env.DB.prepare(
    "SELECT hits FROM rate_limits WHERE bucket=? AND ip_hash=?"
  ).bind(bucket,ipHash).first();

  if (row && row.hits >= max) return false;

  await env.DB.prepare(
    "INSERT INTO rate_limits(bucket,ip_hash,hits) VALUES(?,?,1) " +
    "ON CONFLICT(bucket,ip_hash) DO UPDATE SET hits=hits+1"
  ).bind(bucket,ipHash).run();

  return true;
}

export async function codeHash(code) {
  return sha256(code.trim().toUpperCase());
}

export function cleanBody(body) {
  if (typeof body !== "string") return "";
  return body.trim().replace(/\u0000/g,"").slice(0,4000);
}
