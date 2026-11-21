import api from '../api/client';
import { AUTH_API_URL } from '../apiConfig';
import { playSound } from '../utils/sound';

/** Device notifications (Web Push): a notification on the phone or computer even when the app is closed. */

const urlBase64ToUint8Array = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** What this device can do right now. */
export function pushSupport() {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasApis) {
    // iPhones only allow push for apps added to the Home Screen
    if (isIOS() && !isStandalone()) return { ok: false, reason: 'ios-install' };
    return { ok: false, reason: 'unsupported' };
  }
  if (!AUTH_API_URL) return { ok: false, reason: 'no-server' };
  return { ok: true, reason: 'ok' };
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const go = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  // tapping a notification while the app is open: jump to the right page
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'navigate' && e.data.hash) window.location.hash = e.data.hash;
    if (e.data?.type === 'chime') playSound('notify');
  });
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing || navigator.serviceWorker.register('/sw.js');
}

export async function currentSubscription() {
  if (!pushSupport().ok) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}

/** Ask permission, subscribe this device and register it with the server. Throws an Error with a readable message. */
export async function enableDeviceNotifications() {
  const s = pushSupport();
  if (!s.ok) throw new Error('This browser cannot show device notifications.');

  const { data: cfg } = await api.get(`${AUTH_API_URL}/push/public-key`);
  if (!cfg?.enabled || !cfg.key) throw new Error('Device notifications are not set up on the server yet.');

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied'
    ? 'Notifications are blocked for this site. Allow them in your browser settings, then try again.'
    : 'Permission was not granted.');

  await getRegistration();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.key) });
  }
  const json = sub.toJSON();
  await api.post(`${AUTH_API_URL}/push/subscribe`, { endpoint: json.endpoint, keys: json.keys });
  return true;
}

/** Turn off for this device (stops the browser subscription and tells the server). */
export async function disableDeviceNotifications() {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try { await api.post(`${AUTH_API_URL}/push/unsubscribe`, { endpoint }); } catch { /* ignore */ }
  try { await sub.unsubscribe(); } catch { /* ignore */ }
}

/** On sign-out: stop this device receiving the previous person's notifications. */
export async function forgetDeviceOnServer(token) {
  try {
    const sub = await currentSubscription();
    if (!sub || !token || !AUTH_API_URL) return;
    await fetch(`${AUTH_API_URL}/push/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint: sub.endpoint }),
      keepalive: true,
    });
  } catch { /* best effort */ }
}

/** After signing in on a device that already allowed notifications: make sure the server knows about it. */
export async function resyncIfAllowed() {
  try {
    if (!pushSupport().ok || Notification.permission !== 'granted') return;
    const sub = await currentSubscription();
    if (!sub) return;
    const json = sub.toJSON();
    await api.post(`${AUTH_API_URL}/push/subscribe`, { endpoint: json.endpoint, keys: json.keys });
  } catch { /* ignore */ }
}

/** Sends a sample notification to this person's own devices. Returns { devices, pushed }. */
export async function sendTestNotification() {
  const { data } = await api.post(`${AUTH_API_URL}/push/test`);
  return data;
}

/** How many devices the server will notify for the signed-in person. */
export async function deviceCount() {
  try {
    const { data } = await api.get(`${AUTH_API_URL}/push/status`);
    return data?.devices ?? 0;
  } catch { return 0; }
}
