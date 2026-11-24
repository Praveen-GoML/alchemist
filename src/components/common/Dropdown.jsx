import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Custom select with a styled, keyboard-accessible list.
 *
 *   <Dropdown value={v} onChange={setV} options={['A', 'B']} placeholder="All" />
 *   options may be strings or { value, label, hint }.
 *   Lists with more than `searchAt` options get a search box.
 */
export default function Dropdown({
  value, onChange, options = [], placeholder = 'Select…', label, disabled = false,
  searchAt = 8, className = '', size = 'md', clearLabel,
}) {
  const id = useId();
  const items = useMemo(
    () => options.map(o => (typeof o === 'object' ? o : { value: o, label: String(o) })),
    [options]
  );
  const selected = items.find(o => o.value === value);

  const btnRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState(null);

  const searchable = items.length > searchAt;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(o => o.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) btnRef.current?.focus();
  }, []);

  const openList = () => {
    if (disabled) return;
    setRect(btnRef.current.getBoundingClientRect());
    setActive(Math.max(0, items.findIndex(o => o.value === value)));
    setOpen(true);
  };

  const choose = (o) => {
    onChange?.(o.value);
    close();
  };

  // Position the popover below the button (flip above when there isn't room)
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0, maxHeight: 320 });
  useLayoutEffect(() => {
    if (!open || !rect) return;
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap - 12;
    const above = rect.top - gap - 12;
    const flip = below < 200 && above > below;
    const maxHeight = Math.max(160, Math.min(340, flip ? above : below));
    setPlace({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)),
      width: Math.max(rect.width, 220),
      maxHeight,
      ...(flip ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
    });
  }, [open, rect]);

  useEffect(() => {
    if (!open) return undefined;
    (searchable ? searchRef.current : listRef.current)?.focus();
    const onDown = (e) => {
      if (!listRef.current?.parentElement?.contains(e.target) && !btnRef.current?.contains(e.target)) close(false);
    };
    // scrolling the page closes the list, but scrolling inside the popover itself (it nudges its own list when it opens) must not
    const onScroll = (e) => { if (!listRef.current?.parentElement?.contains(e.target)) close(false); };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, searchable, close]);

  // keep the active option in view
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, shown]);

  const onKey = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(shown.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) choose(shown[active]); }
    else if (e.key === 'Tab') close(false);
    else if (!searchable && e.key.length === 1) {
      // type-ahead for short lists
      const k = e.key.toLowerCase();
      const i = shown.findIndex((o, idx) => idx > active && o.label.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : shown.findIndex(o => o.label.toLowerCase().startsWith(k));
      if (j >= 0) setActive(j);
    }
  };

  return (
    <div className={`dd dd-${size} ${className}`} onKeyDown={onKey}>
      {label && <span className="dd-label" id={`${id}-l`}>{label}</span>}
      <button
        ref={btnRef}
        type="button"
        className={`dd-btn${open ? ' open' : ''}${selected ? '' : ' empty'}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-l` : undefined}
        onClick={() => (open ? close() : openList())}
      >
        <span className="dd-value">{selected ? selected.label : placeholder}</span>
        <svg className="dd-caret" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && createPortal(
        <div className="dd-pop" style={place} onKeyDown={onKey}>
          {searchable && (
            <div className="dd-search">
              <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input ref={searchRef} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} placeholder="Search…" aria-label="Search options" />
            </div>
          )}
          <ul ref={listRef} className="dd-list" role="listbox" tabIndex={-1} aria-activedescendant={shown[active] ? `${id}-o${active}` : undefined}>
            {shown.length === 0 && <li className="dd-none">No matches</li>}
            {shown.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li
                  key={String(o.value)}
                  id={`${id}-o${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={isSel}
                  className={`dd-opt${i === active ? ' active' : ''}${isSel ? ' selected' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => choose(o)}
                >
                  <span className="dd-text">{o.label}{o.hint && <small>{o.hint}</small>}</span>
                  {isSel && <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
