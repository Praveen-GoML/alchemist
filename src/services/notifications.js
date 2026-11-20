import api from '../api/client';
import { AUTH_API_URL } from '../apiConfig';

const base = () => `${AUTH_API_URL}/notifications`;

export async function fetchNotifications(limit = 40) {
  if (!AUTH_API_URL) return { unread: 0, items: [] };
  const { data } = await api.get(base(), { params: { limit } });
  return data;
}

export async function markRead({ ids = [], all = false }) {
  if (!AUTH_API_URL) return;
  await api.post(`${base()}/read`, { ids, all });
}

export async function removeNotification(id) {
  if (!AUTH_API_URL) return;
  await api.delete(`${base()}/${id}`);
}

/** Fire-and-forget: a failed notification must never break the action that caused it. */
export function sendNotification(payload) {
  if (!AUTH_API_URL) return Promise.resolve();
  return api.post(base(), payload).catch(() => {});
}

/* ── Leave: several days clicked in a row become one notification ── */
const WINDOW_MS = 6000;
let leaveBatch = null; // { who, label, dates:Set, timer }

const fmtDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

function flushLeave() {
  if (!leaveBatch) return;
  const { who, label, dates } = leaveBatch;
  leaveBatch = null;
  if (!dates.size) return;
  const sorted = [...dates].sort();
  const text = sorted.length <= 4 ? sorted.map(fmtDay).join(', ') : `${fmtDay(sorted[0])} to ${fmtDay(sorted[sorted.length - 1])} (${sorted.length} days)`;
  sendNotification({
    roles: ['pm', 'tl'],
    kind: 'leave',
    title: `${who} applied for ${label.toLowerCase()}`,
    body: text,
    link: '#leave',
  });
}

export function queueLeaveNotice({ who, label, date }) {
  if (!leaveBatch || leaveBatch.who !== who || leaveBatch.label !== label) {
    clearTimeout(leaveBatch?.timer);
    flushLeave();
    leaveBatch = { who, label, dates: new Set(), timer: null };
  }
  leaveBatch.dates.add(date);
  clearTimeout(leaveBatch.timer);
  leaveBatch.timer = setTimeout(flushLeave, WINDOW_MS);
}

/** The person un-clicked a day before the notice went out. */
export function cancelLeaveNotice(date) {
  leaveBatch?.dates.delete(date);
}

/* ── Project assignment ── */
export function notifyAssignment({ actor, project, people = [], removed = false }) {
  people.forEach((m) => {
    if (!m?.email) return;
    sendNotification({
      recipients: [m.email],
      kind: 'assignment',
      title: removed ? `You were removed from ${project}` : `You were added to ${project}`,
      body: `${actor || 'A project manager'} ${removed ? 'removed you from' : 'assigned you to'} ${project}.`,
      link: '#projects',
    });
  });
}
