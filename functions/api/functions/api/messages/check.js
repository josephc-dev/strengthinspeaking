import {
  json,
  readJson,
  codeHash,
  rateLimit,
  validOrigin
} from "../../_lib/common.js";

export async function onRequestPost({request,env}) {
  if(!validOrigin(request)) {
    return json({error:"Request not allowed."},403);
  }

  if(!env.DB) {
    return json({error:"Messaging is not configured yet."},503);
  }

  if(!await rateLimit(request,env,10)) {
    return json({error:"Please wait before checking again."},429);
  }

  const data=await readJson(request);
  const code=typeof data?.code==="string" ? data.code.trim() : "";

  if(!code) {
    return json({error:"Please enter your conversation code."},400);
  }

  const conversation=await env.DB.prepare(
    "SELECT id FROM conversations WHERE code_hash=?"
  ).bind(await codeHash(code)).first();

  if(!conversation) {
    return json({error:"We couldn't find that conversation. Please check your code."},404);
  }

  const result=await env.DB.prepare(
    "SELECT sender,body,created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC"
  ).bind(conversation.id).all();

  return json({
    messages:result.results || []
  });
}
