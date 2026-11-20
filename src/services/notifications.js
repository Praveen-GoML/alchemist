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

/* ── Leave: one summary message when the person submits their attendance ── */
const fmtDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const fmtList = (dates) => {
  const sorted = [...dates].sort();
  return sorted.length <= 4 ? sorted.map(fmtDay).join(', ') : `${fmtDay(sorted[0])} to ${fmtDay(sorted[sorted.length - 1])} (${sorted.length} days)`;
};

/** adds: [{ date, code, label }], removes: [{ date, code, label }] (Holiday entries are not leave and are ignored). */
export function notifyLeaveSubmitted({ who, adds = [], removes = [] }) {
  const a = adds.filter(x => x.code !== 'HOL');
  const r = removes.filter(x => x.code !== 'HOL');
  if (!a.length && !r.length) return Promise.resolve();

  const byLabel = new Map();
  a.forEach(x => byLabel.set(x.label, [...(byLabel.get(x.label) || []), x.date]));
  const parts = [...byLabel.entries()].map(([label, dates]) => `${label}: ${fmtList(dates)}`);
  if (r.length) parts.push(`Cancelled: ${fmtList(r.map(x => x.date))}`);

  const title = a.length
    ? `${who} applied for ${[...byLabel.keys()].map(l => l.toLowerCase()).join(' and ')}`
    : `${who} cancelled leave`;
  const body = parts.join(' · ');
  // 1) tell the PMs and TLs, 2) confirm to the person themselves (shows on their own phone and computer)
  return Promise.all([
    sendNotification({ roles: ['pm', 'tl'], kind: 'leave', title, body, link: '#leave' }),
    sendNotification({ to_self: true, kind: 'leave', title: a.length ? 'Attendance submitted' : 'Attendance updated', body: `${body}. Your PMs and TLs have been notified.`, link: '#leave' }),
  ]);
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
