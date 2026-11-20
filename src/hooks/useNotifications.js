import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNotifications, markRead, removeNotification } from '../services/notifications';

const POLL_MS = 15000;

/**
 * Near-real-time notifications: polls every 15 s while the tab is visible and refreshes the moment
 * you return to it. `onNew(items)` fires with notifications that arrived since the last poll.
 */
export function useNotifications({ enabled, onNew }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const lastId = useRef(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await fetchNotifications(40);
      setItems(data.items);
      setUnread(data.unread);
      setLoaded(true);
      const maxId = data.items.reduce((m, n) => Math.max(m, n.id), 0);
      if (lastId.current !== null && maxId > lastId.current) {
        const fresh = data.items.filter(n => n.id > lastId.current && !n.read_at);
        if (fresh.length) onNewRef.current?.(fresh);
      }
      lastId.current = Math.max(lastId.current ?? 0, maxId);
    } catch { /* offline or signed out: keep what we have */ }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const tick = () => { if (!document.hidden) refresh(); };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [enabled, refresh]);

  const read = useCallback(async (ids) => {
    setItems(list => list.map(n => (ids.includes(n.id) ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)));
    setUnread(u => Math.max(0, u - ids.length));
    try { await markRead({ ids }); } catch { refresh(); }
  }, [refresh]);

  const readAll = useCallback(async () => {
    setItems(list => list.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
    try { await markRead({ all: true }); } catch { refresh(); }
  }, [refresh]);

  const remove = useCallback(async (id) => {
    setItems(list => list.filter(n => n.id !== id));
    setUnread(u => (items.find(n => n.id === id && !n.read_at) ? Math.max(0, u - 1) : u));
    try { await removeNotification(id); } catch { refresh(); }
  }, [items, refresh]);

  return { items, unread, loaded, refresh, read, readAll, remove };
}
