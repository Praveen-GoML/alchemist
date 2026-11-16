// Theme preference: 'light' | 'dark' | null (follow the OS). Stored per browser.
const KEY = 'alchemist-theme';

export const getStoredTheme = () => {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch { return null; }
};

export const currentTheme = () => {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (t) => {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
};

export const setTheme = (t) => {
  applyTheme(t);
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* ignore */ }
};

export const toggleTheme = () => { const next = currentTheme() === 'dark' ? 'light' : 'dark'; setTheme(next); return next; };

// Apply the saved choice as early as possible (before first paint of the app)
applyTheme(getStoredTheme());
