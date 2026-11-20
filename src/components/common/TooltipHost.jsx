import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * App-wide custom tooltips.
 * Any element with a `title` attribute (or `data-tip`) gets a styled tooltip instead of the browser's.
 * The title is moved to data-tip so the native tooltip never shows, and copied to aria-label
 * on icon-only controls so screen readers still get a name.
 */
export default function TooltipHost() {
  const [tip, setTip] = useState(null); // { text, x, y, place }
  const timer = useRef(null);
  const target = useRef(null);
  const bubble = useRef(null);

  useEffect(() => {
    const adopt = (el) => {
      const t = el.getAttribute('title');
      if (t && t.trim()) {
        el.setAttribute('data-tip', t.trim());
        el.removeAttribute('title');
        if (!el.getAttribute('aria-label') && !(el.textContent || '').trim()) el.setAttribute('aria-label', t.trim());
      }
    };

    const hide = () => {
      clearTimeout(timer.current);
      target.current = null;
      setTip(null);
    };

    const show = (el) => {
      adopt(el);
      const text = el.getAttribute('data-tip');
      if (!text) return;
      target.current = el;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (target.current !== el || !document.contains(el)) return;
        const r = el.getBoundingClientRect();
        setTip({ text, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
      }, 320);
    };

    const find = (node) => (node instanceof Element ? node.closest('[title], [data-tip]') : null);

    const onOver = (e) => {
      const el = find(e.target);
      if (!el || el === target.current) return;
      show(el);
    };
    const onOut = (e) => {
      if (target.current && !target.current.contains(e.relatedTarget)) hide();
    };
    const onFocus = (e) => { const el = find(e.target); if (el) show(el); };

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('focusout', hide, true);
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('focusout', hide, true);
      document.removeEventListener('mousedown', hide, true);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // clamp inside the viewport once we know the bubble's size
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!tip) { setPos(null); return; }
    const el = bubble.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const m = 8;
    const flip = tip.top - height - 12 < m;
    const left = Math.max(m, Math.min(tip.x - width / 2, window.innerWidth - width - m));
    setPos({ left, top: flip ? tip.bottom + 10 : tip.top - height - 10, flip, arrow: Math.max(12, Math.min(width - 12, tip.x - left)) });
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div
      ref={bubble}
      role="tooltip"
      className={`tt${pos ? ' show' : ''}${pos?.flip ? ' below' : ''}`}
      style={pos ? { left: pos.left, top: pos.top, '--arrow': pos.arrow + 'px' } : { left: -9999, top: -9999 }}
    >
      {tip.text}
    </div>,
    document.body
  );
}
