import React, { useEffect, useRef, useState, useCallback } from 'react';
import { dialog, describe } from '../../utils/dialog';
import { Art } from './DialogArt';

export default function DialogHost() {
  const [queue, setQueue] = useState([]);
  const primaryRef = useRef(null);
  const current = queue[0];

  useEffect(() => dialog._subscribe(item => setQueue(q => [...q, item])), []);

  const close = useCallback((result) => {
    setQueue(q => {
      if (q[0]) q[0].resolve(result);
      return q.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    primaryRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(current.kind === 'confirm' ? false : true); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [current, close]);

  if (!current) return null;
  const { variant, title, message } = describe(current);
  const isConfirm = current.kind === 'confirm';
  const danger = variant === 'danger';

  return (
    <div className="dlgx-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(isConfirm ? false : true); }}>
      <div className={`dlgx dlgx-${variant}`} role={isConfirm ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="dlgx-title" aria-describedby="dlgx-msg">
        <button type="button" className="dlgx-x" aria-label="Close" onClick={() => close(isConfirm ? false : true)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <div className="dlgx-top"><div className="dlgx-art">{Art[variant] || Art.info}</div></div>
        <div className="dlgx-body">
          <h2 id="dlgx-title">{title}</h2>
          <p id="dlgx-msg">{message}</p>
        </div>
        <div className="dlgx-actions">
          {isConfirm && (
            <button type="button" className="dlgx-btn ghost" onClick={() => close(false)}>{current.cancelLabel || 'Cancel'}</button>
          )}
          <button ref={primaryRef} type="button" className={`dlgx-btn ${danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>
            {current.confirmLabel || (isConfirm ? 'Confirm' : 'Got it')}
          </button>
        </div>
      </div>
    </div>
  );
}
