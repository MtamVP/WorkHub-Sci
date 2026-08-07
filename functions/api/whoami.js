import { getUserEmail, jsonResponse } from "./_utils.js";

export async function onRequestGet({ request }) {
  return jsonResponse({ email: getUserEmail(request) });
}
