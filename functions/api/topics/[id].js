import { getUserEmail, jsonResponse, nowIso, validateTopic } from "../_utils.js";

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  const { topic, expectedUpdatedAt } = body || {};
  if (!topic) return jsonResponse({ error: "Request must include a topic." }, 400);
  const problem = validateTopic({ ...topic, id: params.id });
  if (problem) return jsonResponse({ error: problem }, 400);

  const existing = await env.DB.prepare("SELECT data, updated_at FROM topics WHERE id = ?").bind(params.id).first();

  if (existing && expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    return jsonResponse({ conflict: true, serverTopic: JSON.parse(existing.data) }, 409);
  }

  const updatedAt = nowIso();
  const updatedBy = getUserEmail(request);
  const savedTopic = { ...topic, id: params.id, updatedAt, updatedBy };

  if (existing) {
    await env.DB.prepare("UPDATE topics SET data = ?, updated_at = ?, updated_by = ? WHERE id = ?")
      .bind(JSON.stringify(savedTopic), updatedAt, updatedBy, params.id).run();
  } else {
    await env.DB.prepare("INSERT INTO topics (id, data, updated_at, updated_by) VALUES (?, ?, ?, ?)")
      .bind(params.id, JSON.stringify(savedTopic), updatedAt, updatedBy).run();
  }

  return jsonResponse({ topic: savedTopic });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM topics WHERE id = ?").bind(params.id).run();
  return jsonResponse({ ok: true });
}
