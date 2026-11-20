import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Small right-click / kebab menu.
 * items: [{ label, icon, hint, onClick, danger, disabled }, 'sep']
 */
export default function ContextMenu({ x, y, items, onClose, title }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // keep the menu inside the viewport
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const m = 8;
    setPos({
      left: Math.max(m, Math.min(x, window.innerWidth - width - m)),
      top: Math.max(m, Math.min(y, window.innerHeight - height - m)),
    });
  }, [x, y, items.length]);

  useEffect(() => {
    const buttons = () => Array.from(ref.current?.querySelectorAll('button:not(:disabled)') || []);
    buttons()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const list = buttons();
        const i = list.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[next]?.focus();
      }
    };
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div ref={ref} className="ctxm" role="menu" aria-label={title || 'Actions'} style={pos} onContextMenu={e => e.preventDefault()}>
      {title && <div className="ctxm-title" title={title}>{title}</div>}
      {items.map((it, i) =>
        it === 'sep' ? <div key={`s${i}`} className="ctxm-sep" role="separator" /> : (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            className={`ctxm-item${it.danger ? ' danger' : ''}`}
            disabled={it.disabled}
            onClick={() => { onClose(); it.onClick?.(); }}
          >
            {it.icon && <span className="ctxm-ico">{it.icon}</span>}
            <span className="ctxm-label">{it.label}</span>
            {it.hint && <span className="ctxm-hint">{it.hint}</span>}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
