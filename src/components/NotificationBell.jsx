import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CalendarDays, UserPlus, Info, Check, X, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { AUTH_API_URL } from '../apiConfig';

const KIND = {
  leave: { Icon: CalendarDays, tone: 'leave' },
  assignment: { Icon: UserPlus, tone: 'assign' },
  info: { Icon: Info, tone: 'info' },
};

const ago = (iso) => {
  const t = new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [toast, setToast] = useState(null);
  const [perm, setPerm] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'));
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 64, right: 16 });

  const onNew = useCallback((fresh) => {
    const n = fresh[0];
    setToast(fresh.length > 1 ? { title: `${fresh.length} new notifications`, body: n.title } : { title: n.title, body: n.body });
    setTimeout(() => setToast(null), 6000);
    // desktop alert when the tab is in the background
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(n.title, { body: n.body, tag: `alchemist-${n.id}` }); } catch { /* ignore */ }
    }
  }, []);

  const { items, unread, loaded, read, readAll, remove } = useNotifications({ enabled: !!user && !!AUTH_API_URL, onNew });

  useEffect(() => {
    if (!open) return undefined;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 10, right: Math.max(12, window.innerWidth - r.right - 4) });
    const onDown = (e) => { if (!panelRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const go = (n) => {
    if (!n.read_at) read([n.id]);
    setOpen(false);
    if (n.link) window.location.hash = n.link.replace(/^#?/, '#');
  };

  const enableDesktop = async () => {
    try { setPerm(await Notification.requestPermission()); } catch { /* ignore */ }
  };

  const shown = tab === 'unread' ? items.filter(n => !n.read_at) : items;
  const canAskDesktop = typeof Notification !== 'undefined' && perm === 'default';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`who-icon nbell${open ? ' open' : ''}`}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Bell size={18} />
        {unread > 0 && <span className="nbell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && createPortal(
        <div ref={panelRef} className="npanel" role="dialog" aria-label="Notifications" style={{ top: pos.top, right: pos.right }}>
          <div className="npanel-head">
            <div>
              <h3>Notifications</h3>
              <span>{unread ? `${unread} unread` : 'You are all caught up'}</span>
            </div>
            <button type="button" className="npanel-link" onClick={readAll} disabled={!unread}><Check size={14} /> Mark all read</button>
          </div>

          <div className="npanel-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All</button>
            <button type="button" role="tab" aria-selected={tab === 'unread'} className={tab === 'unread' ? 'on' : ''} onClick={() => setTab('unread')}>Unread{unread ? <span>{unread}</span> : null}</button>
          </div>

          <ul className="nlist">
            {!loaded && <li className="nempty">Loading…</li>}
            {loaded && shown.length === 0 && (
              <li className="nempty">
                <svg viewBox="0 0 120 90" width="120" height="90" aria-hidden="true">
                  <ellipse cx="60" cy="80" rx="34" ry="4" fill="rgba(0,0,0,.08)" />
                  <path d="M60 10c-16 0-26 12-26 28v14l-8 12h68l-8-12V38c0-16-10-28-26-28z" fill="var(--accent-soft, #FDEEE2)" stroke="var(--accent, #ED7D31)" strokeWidth="3" strokeLinejoin="round" />
                  <path d="M52 68a8 8 0 0 0 16 0" fill="none" stroke="var(--accent, #ED7D31)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="92" cy="22" r="4" fill="var(--accent, #ED7D31)" opacity=".5" /><circle cx="26" cy="30" r="3" fill="var(--accent, #ED7D31)" opacity=".4" />
                </svg>
                <b>{tab === 'unread' ? 'Nothing unread' : 'No notifications yet'}</b>
                <span>{tab === 'unread' ? 'New activity will show up here.' : 'You will hear about leave requests, project assignments and more.'}</span>
              </li>
            )}
            {shown.map(n => {
              const k = KIND[n.kind] || KIND.info;
              return (
                <li key={n.id} className={`nitem${n.read_at ? '' : ' unread'}`}>
                  <button type="button" className="nitem-main" onClick={() => go(n)}>
                    <span className={`nico ${k.tone}`}><k.Icon size={17} /></span>
                    <span className="ntext">
                      <b>{n.title}</b>
                      {n.body && <span>{n.body}</span>}
                      <small>{ago(n.created_at)}{n.actor_name ? ` · ${n.actor_name}` : ''}</small>
                    </span>
                    {!n.read_at && <i className="ndot" aria-label="Unread" />}
                  </button>
                  <button type="button" className="nitem-x" aria-label="Dismiss notification" title="Dismiss" onClick={() => remove(n.id)}><X size={14} /></button>
                </li>
              );
            })}
          </ul>

          {canAskDesktop && (
            <button type="button" className="npanel-foot" onClick={enableDesktop}>
              <BellRing size={15} /> Turn on desktop alerts
            </button>
          )}
        </div>,
        document.body
      )}

      {toast && createPortal(
        <div className="ntoast" role="status" onClick={() => { setToast(null); setOpen(true); }}>
          <span className="nico assign"><Bell size={17} /></span>
          <span className="ntext"><b>{toast.title}</b>{toast.body && <span>{toast.body}</span>}</span>
          <button type="button" aria-label="Close" onClick={(e) => { e.stopPropagation(); setToast(null); }}><X size={14} /></button>
        </div>,
        document.body
      )}
    </>
  );
}
