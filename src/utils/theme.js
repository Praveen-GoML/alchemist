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

// Browser / installed-app status bar: match the app's top bar in each theme
const BAR = { light: '#FFFFFF', dark: '#14110F' };
// While the mobile menu is open the page is dimmed by a scrim; tint the status bar the same way
let dimmed = false;
const dim = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c, s) => Math.round(c * 0.55 + s * 0.45).toString(16).padStart(2, '0');
  return '#' + mix((n >> 16) & 255, 20) + mix((n >> 8) & 255, 14) + mix(n & 255, 8);
};
export const setStatusBarDim = (v) => { dimmed = !!v; syncStatusBar(); };

export const syncStatusBar = () => {
  try {
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.setAttribute('content', dimmed ? dim(BAR[currentTheme()]) : BAR[currentTheme()]);
  } catch { /* ignore */ }
};

export const applyTheme = (t) => {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  syncStatusBar();
};

export const setTheme = (t) => {
  applyTheme(t);
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* ignore */ }
};

export const toggleTheme = () => { const next = currentTheme() === 'dark' ? 'light' : 'dark'; setTheme(next); return next; };

// Apply the saved choice as early as possible (before first paint of the app)
applyTheme(getStoredTheme());

// follow the phone's light/dark setting while no explicit choice is saved
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncStatusBar); } catch { /* ignore */ }
