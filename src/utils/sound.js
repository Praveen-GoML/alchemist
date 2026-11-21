// Alchemist's own sound: a short rising "transmutation" chime followed by a glimmer.
// It is synthesised with the Web Audio API, so there is no audio file to download.
const KEY = 'alchemist-sound';

export const soundEnabled = () => {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
};
export const setSoundEnabled = (on) => {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
};

// note schedule: [frequency Hz, start seconds, length seconds, loudness]
const SOUNDS = {
  // new notification: E5, A5, E6 rising, then a high glimmer
  notify: [[659.25, 0, 0.9, 1], [880, 0.11, 0.9, 0.95], [1318.5, 0.22, 1.1, 0.9], [2637, 0.36, 0.5, 0.35], [3322, 0.44, 0.4, 0.2]],
  // done / saved: a soft two-step lift
  success: [[783.99, 0, 0.7, 0.9], [1046.5, 0.12, 0.9, 0.85], [1568, 0.26, 0.5, 0.3]],
};

/** Schedules a sound on any audio context (live or offline). Returns its length in seconds. */
export function scheduleSound(ctx, kind = 'notify', at = 0) {
  const notes = SOUNDS[kind] || SOUNDS.notify;
  const master = ctx.createGain();
  master.gain.value = 0.32;

  // a faint echo gives the chime its shimmer
  const echo = ctx.createDelay(0.5); echo.delayTime.value = 0.17;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  master.connect(ctx.destination);
  master.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(ctx.destination);

  let end = 0;
  notes.forEach(([freq, start, len, vol]) => {
    const t0 = at + start;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    env.connect(master);
    // bell-like body: a pure tone, a quiet octave above, and a slightly detuned partner
    [[freq, 'sine', 1], [freq * 2.01, 'triangle', 0.22], [freq * 1.003, 'sine', 0.5]].forEach(([f, type, g]) => {
      const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = f;
      const gain = ctx.createGain(); gain.gain.value = g;
      osc.connect(gain); gain.connect(env);
      osc.start(t0); osc.stop(t0 + len + 0.05);
    });
    end = Math.max(end, start + len);
  });
  return end + 1; // include the echo tail
}

let ctx = null;
let lastPlayed = 0;

const getCtx = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  } catch { return null; }
};

// browsers only allow sound after the person has interacted with the page
if (typeof window !== 'undefined') {
  const unlock = () => { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, unlock, { once: false, passive: true }));
}

/** Plays Alchemist's sound. `force` ignores the on/off setting (used by the preview button). */
export function playSound(kind = 'notify', { force = false } = {}) {
  if (!force && !soundEnabled()) return;
  const now = Date.now();
  if (!force && now - lastPlayed < 1500) return; // never stack two chimes
  lastPlayed = now;
  const c = getCtx();
  if (!c) return;
  const go = () => { try { scheduleSound(c, kind, c.currentTime + 0.02); } catch { /* ignore */ } };
  if (c.state === 'suspended') c.resume().then(go).catch(() => {}); else go();
}
