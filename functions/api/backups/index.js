import { jsonResponse } from "../_utils.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, created_at, topic_count FROM backups ORDER BY created_at DESC"
  ).all();
  return jsonResponse({ backups: results });
}
