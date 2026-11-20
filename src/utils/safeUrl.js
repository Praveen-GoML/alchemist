const ALLOWED = new Set(['http:', 'https:', 'mailto:']);

/** Returns the URL if it uses an allowed scheme, otherwise ''. Blocks javascript:, data:, etc. */
export function safeUrl(value) {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  try {
    const u = new URL(v, window.location.origin);
    return ALLOWED.has(u.protocol) ? v : '';
  } catch {
    return '';
  }
}

/** Opens a validated URL in a new tab without leaking window.opener. */
export function openSafe(value) {
  const url = safeUrl(value);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
