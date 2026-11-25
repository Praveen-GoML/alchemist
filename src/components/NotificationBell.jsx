import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Bell, CalendarDays, UserPlus, Info, Check, X, BellRing, BellOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { AUTH_API_URL } from '../apiConfig';
import { pushSupport, currentSubscription, enableDeviceNotifications, resyncIfAllowed } from '../services/push';

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
  // device notifications (Web Push)
  const support = pushSupport();
  const [perm, setPerm] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'));
  const [deviceOn, setDeviceOn] = useState(false);
  const enableMutation = useMutation({ mutationFn: enableDeviceNotifications });
  const deviceBusy = enableMutation.isPending;
  const [askBanner, setAskBanner] = useState(false);
  const deviceOnRef = useRef(false);
  deviceOnRef.current = deviceOn;
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 64, right: 16 });

  const onNew = useCallback((fresh) => {
    const n = fresh[0];
    setToast(fresh.length > 1 ? { title: `${fresh.length} new notifications`, body: n.title } : { title: n.title, body: n.body });
    setTimeout(() => setToast(null), 6000);
    // desktop alert when the tab is in the background
    if (!deviceOnRef.current && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(n.title, { body: n.body, tag: `alchemist-${n.id}` }); } catch { /* ignore */ }
    }
  }, []);

  const { items, unread, loaded, read, readAll, remove } = useNotifications({ enabled: !!user && !!AUTH_API_URL, onNew });

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    (async () => {
      await resyncIfAllowed();
      let sub = await currentSubscription();
      // permission was already granted (e.g. earlier) but this device is not registered: register it quietly
      if (!sub && support.ok && Notification.permission === 'granted') {
        try { await enableDeviceNotifications(); sub = await currentSubscription(); } catch { /* shown when they open the panel */ }
      }
      if (!alive) return;
      setDeviceOn(!!sub && Notification.permission === 'granted');
      // one friendly nudge per device, only if it could work and hasn't been answered
      let asked = false;
      try { asked = !!sessionStorage.getItem('alchemist-push-asked'); } catch { /* ignore */ }
      if (!asked && support.ok && Notification.permission === 'default' && !sub) setTimeout(() => alive && setAskBanner(true), 4000);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    if (/^https?:\/\//i.test(n.link || '')) window.open(n.link, '_blank', 'noopener');
    else if (n.link) window.location.hash = n.link.replace(/^#?/, '#');
  };

  const dismissAsk = () => {
    setAskBanner(false);
    try { sessionStorage.setItem('alchemist-push-asked', '1'); } catch { /* ignore */ }
  };

  const turnOnDevice = async () => {
    setDeviceMsg('');
    try {
      await enableMutation.mutateAsync();
      setDeviceOn(true);
      setPerm(Notification.permission);
      dismissAsk();
    } catch (err) {
      setDeviceMsg(err.message || 'Could not turn on device notifications.');
      if (typeof Notification !== 'undefined') setPerm(Notification.permission);
    }
  };

  const sendTest = async () => {
    setDeviceMsg('');
    try {
      const r = await testMutation.mutateAsync();
      setDeviceMsg(r.devices === 0
        ? 'No device is registered for your account yet. Press Turn on on the device you want.'
        : r.pushed === 0 ? 'Your device did not accept it. Turn notifications off and on again.'
        : `Sample sent to ${r.pushed} ${r.pushed === 1 ? 'device' : 'devices'}. It should appear in a few seconds.`);
    } catch {
      setDeviceMsg('Could not send the sample. Check your connection and try again.');
    }
  };

  const turnOffDevice = async () => {
    setDeviceMsg('');
    try { await disableMutation.mutateAsync(); setDeviceOn(false); } catch { /* the button stays as it was */ }
  };

  const shown = tab === 'unread' ? items.filter(n => !n.read_at) : items;
  const dayLabel = (iso) => {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z'); const now = new Date();
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 86400000);
    return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
  };
  const groups = [];
  shown.forEach(n => {
    const label = dayLabel(n.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n); else groups.push({ label, items: [n] });
  });

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
        {unread === 0 && support.ok && !deviceOn && perm !== 'denied' && <span className="nbell-attn" title="Turn on device notifications" />}
      </button>

      {open && createPortal(
        <div ref={panelRef} className="npanel" role="dialog" aria-label="Notifications" style={{ top: pos.top, right: pos.right }}>
          <div className="npanel-head">
            <h3>Notifications{unread > 0 && <em className="np-count">{unread}</em>}</h3>
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
            {groups.map(g => (
              <React.Fragment key={g.label}>
                <li className="ngroup">{g.label}</li>
                {g.items.map(n => {
                  const k = KIND[n.kind] || KIND.info;
                  return (
                    <li key={n.id} className={`nitem${n.read_at ? '' : ' unread'}`}>
                      <button type="button" className="nitem-main" onClick={() => go(n)}>
                        {!n.read_at && <i className="ndot" aria-label="Unread" />}
                        <span className={`nico ${k.tone}`}><k.Icon size={17} /></span>
                        <span className="ntext">
                          <b>{n.title}</b>
                          {n.body && <span>{n.body}</span>}
                          <small>{n.actor_name && n.actor_name !== 'Alchemist' ? `From ${n.actor_name}` : 'Alchemist'}</small>
                        </span>
                        <time className="ntime">{ago(n.created_at)}</time>
                      </button>
                      <button type="button" className="nitem-x" aria-label="Dismiss notification" title="Dismiss" onClick={() => remove(n.id)}><X size={14} /></button>
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
          </ul>

          <div className="npanel-device">
            {deviceOn ? (
              <div className="npd-row on">
                <span className="npd-ico"><BellRing size={16} /></span>
                <span className="npd-text"><b>Device notifications are on</b><small>You will get them on this device even when Alchemist is closed.</small></span>
                <span className="npd-actions">
                  <button type="button" className="npd-btn" onClick={sendTest} disabled={deviceBusy}>Send test</button>
                  <button type="button" className="npd-btn ghost" onClick={turnOffDevice} disabled={deviceBusy}>Turn off</button>
                </span>
              </div>
            ) : null}
            {!deviceOn && (support.ok ? (
              perm === 'denied' ? (
                <div className="npd-row"><span className="npd-ico"><BellRing size={16} /></span><span className="npd-text"><b>Blocked in your browser</b><small>Allow notifications for this site in the browser settings, then come back.</small></span></div>
              ) : (
                <div className="npd-row">
                  <span className="npd-ico"><BellRing size={16} /></span>
                  <span className="npd-text"><b>Get notified on this device</b><small>Like a phone notification, even when the app is closed.</small></span>
                  <button type="button" className="npd-btn" onClick={turnOnDevice} disabled={deviceBusy}>{deviceBusy ? 'Turning on…' : 'Turn on'}</button>
                </div>
              )
            ) : support.reason === 'ios-install' ? (
              <div className="npd-row"><span className="npd-ico"><BellRing size={16} /></span><span className="npd-text"><b>Add Alchemist to your Home Screen</b><small>On iPhone: tap Share, then “Add to Home Screen”, and open Alchemist from there to turn on notifications.</small></span></div>
            ) : null)}
            {deviceMsg && <p className="npd-err" role="alert">{deviceMsg}</p>}
          </div>
        </div>,
        document.body
      )}

      {askBanner && !open && createPortal(
        <div className="ntoast ask" role="dialog" aria-label="Turn on device notifications">
          <span className="nico assign"><BellRing size={17} /></span>
          <span className="ntext"><b>Get notified on this device</b><span>Leave requests and project assignments, like a phone notification, even when the app is closed.</span>
            <span className="ask-actions"><button type="button" onClick={turnOnDevice} disabled={deviceBusy}>{deviceBusy ? 'Turning on…' : 'Turn on'}</button><button type="button" className="ghost" onClick={dismissAsk}>Not now</button></span>
          </span>
          <button type="button" aria-label="Close" onClick={dismissAsk}><X size={14} /></button>
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
