export function getUserEmail(request) {
  const header = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (header) return header;
  return "local-dev@example.com";
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export function nowIso() {
  return new Date().toISOString();
}

const MAX_TOPIC_BYTES = 150_000;

export function validateTopic(topic) {
  if (!topic || typeof topic !== "object" || Array.isArray(topic)) return "Topic must be a JSON object.";
  if (typeof topic.id !== "string" || !topic.id.trim() || topic.id.length > 64) return "Topic must include an id (max 64 characters).";
  if (topic.title !== undefined && typeof topic.title !== "string") return "Topic title must be text.";
  if (typeof topic.title === "string" && topic.title.length > 300) return "Topic title is too long (max 300 characters).";
  for (const key of ["papers", "actions", "decisions", "tags", "contributors"]) {
    if (topic[key] !== undefined && !Array.isArray(topic[key])) return `Topic ${key} must be a list.`;
  }
  if (JSON.stringify(topic).length > MAX_TOPIC_BYTES) return "Topic is too large (max 150 KB).";
  return null;
}
