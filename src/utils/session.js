// Every localStorage key that belongs to a signed-in user's session.
const SESSION_KEYS = ['alchemist_token', 'alchemist_user', 'alchemist-data', 'alchemist-ui', 'groq_api_key'];

export function clearSession() {
  for (const k of SESSION_KEYS) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
  try { sessionStorage.removeItem('groq_api_key'); } catch { /* ignore */ }
}
