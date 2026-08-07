import { getUserEmail, jsonResponse, nowIso, validateTopic } from "../_utils.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT data FROM topics ORDER BY updated_at DESC").all();
  const topics = results.map((row) => JSON.parse(row.data));
  return jsonResponse({ topics });
}

export async function onRequestPost({ request, env }) {
  let topic;
  try {
    topic = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  const problem = validateTopic(topic);
  if (problem) return jsonResponse({ error: problem }, 400);

  const updatedAt = nowIso();
  const updatedBy = getUserEmail(request);
  const savedTopic = { ...topic, updatedAt, updatedBy };

  await env.DB.prepare(
    "INSERT INTO topics (id, data, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by"
  ).bind(savedTopic.id, JSON.stringify(savedTopic), updatedAt, updatedBy).run();

  return jsonResponse({ topic: savedTopic }, 201);
}
