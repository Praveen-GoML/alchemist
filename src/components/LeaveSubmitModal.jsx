import React, { useEffect, useMemo } from 'react';

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const monthOf = (iso) => iso.slice(0, 7);
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtLong = (s) => parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function MiniMonth({ ym, adds, removes }) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const key = (d) => `${ym}-${String(d).padStart(2, '0')}`;
  return (
    <div className="lsp-month">
      <div className="lsp-mhead">{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
      <div className="lsp-grid">
        {WEEK.map(w => <span key={w} className="lsp-dow">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const k = key(d);
          const add = adds.find(a => a.date === k);
          const rem = removes.find(r => r.date === k);
          const cls = add ? `lsp-day on lv-${add.code.toLowerCase()}` : rem ? `lsp-day off lv-${rem.code.toLowerCase()}` : 'lsp-day';
          return <span key={k} className={cls} title={add ? `${add.label}` : rem ? `Removing ${rem.label}` : undefined}>{d}</span>;
        })}
      </div>
    </div>
  );
}

/**
 * Preview and confirmation for submitting attendance.
 * adds: [{ date, code, label }], removes: [{ date, code, label }]
 */
export default function LeaveSubmitModal({ adds, removes, who, onCancel, onConfirm, saving }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  const months = useMemo(() => [...new Set([...adds, ...removes].map(x => monthOf(x.date)))].sort(), [adds, removes]);

  // "Casual leave × 3" style summary
  const summary = useMemo(() => {
    const by = new Map();
    adds.forEach(a => by.set(a.code, { label: a.label, code: a.code, n: (by.get(a.code)?.n || 0) + 1 }));
    return [...by.values()];
  }, [adds]);

  const sortedAdds = [...adds].sort((a, b) => a.date.localeCompare(b.date));
  const sortedRemoves = [...removes].sort((a, b) => a.date.localeCompare(b.date));
  const notifies = adds.some(a => a.code !== 'HOL') || removes.some(r => r.code !== 'HOL');

  return (
    <div className="dlg-backdrop lsp-backdrop" onMouseDown={e => e.target === e.currentTarget && !saving && onCancel()}>
      <dialog open style={{ display: 'block' }} className="lsp" aria-label="Confirm attendance">
        <h2>Confirm your attendance</h2>
        <p className="lsp-lead">
          Please review the days below{who ? `, ${who}` : ''}. Nothing is saved until you confirm.
        </p>

        <div className="lsp-chips">
          {summary.map(s => (
            <span key={s.code} className={`lsp-chip lv-${s.code.toLowerCase()}`}><i />{s.label}<b>{s.n} {s.n === 1 ? 'day' : 'days'}</b></span>
          ))}
          {removes.length > 0 && <span className="lsp-chip rm"><i />Removing<b>{removes.length} {removes.length === 1 ? 'day' : 'days'}</b></span>}
        </div>

        <div className="lsp-preview">
          {months.map(ym => <MiniMonth key={ym} ym={ym} adds={adds} removes={removes} />)}
        </div>

        <div className="lsp-lists">
          {sortedAdds.length > 0 && (
            <div>
              <h4>Adding</h4>
              <ul>{sortedAdds.map(a => <li key={a.date} className={`lv-${a.code.toLowerCase()}`}><i />{fmtLong(a.date)}<span>{a.label}</span></li>)}</ul>
            </div>
          )}
          {sortedRemoves.length > 0 && (
            <div>
              <h4>Removing</h4>
              <ul>{sortedRemoves.map(r => <li key={r.date} className={`rm lv-${r.code.toLowerCase()}`}><i />{fmtLong(r.date)}<span>{r.label}</span></li>)}</ul>
            </div>
          )}
        </div>

        {notifies && <p className="lsp-note">Your PMs and TLs will be notified when you submit.</p>}

        <div className="dacts">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>Back to editing</button>
          <button type="button" className="btn" onClick={onConfirm} disabled={saving} autoFocus>{saving ? 'Submitting…' : 'Confirm & submit'}</button>
        </div>
      </dialog>
    </div>
  );
}
