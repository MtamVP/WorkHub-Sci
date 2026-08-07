import { jsonResponse } from "../_utils.js";

export async function onRequestGet({ env, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return jsonResponse({ error: "Invalid backup id." }, 400);
  const row = await env.DB.prepare(
    "SELECT id, created_at, topic_count, data FROM backups WHERE id = ?"
  ).bind(id).first();
  if (!row) return jsonResponse({ error: "Backup not found." }, 404);
  return jsonResponse({
    id: row.id,
    createdAt: row.created_at,
    topicCount: row.topic_count,
    topics: JSON.parse(row.data)
  });
}
