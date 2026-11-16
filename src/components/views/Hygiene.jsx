import { parse, iso, fmt, pct, pad, hygMembers, hygPct, mondayOf } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function Hygiene({ data, updateData, ui, setUi }) {
  const { user, canEditHygiene, isOwnMember, isManagementUser } = useAuth();
  const { hygiene={}, members=[] } = data;
  const { week } = ui;
  const set = patch => setUi(prev => ({...prev,...patch}));

  const dd = parse(week);
  const D = ['Mon','Tue','Wed','Thu','Fri'];

  const W = hygiene[week] || {};
  let colL=[0,0], colT=[0,0];

  const cycleVal = v => ({ '':'Y', 'Y':'N', 'N':'L', 'L':'' }[v||''] ?? '');

  const toggle = (memberName, memberEmail, dayIdx, key) => {
    if (!canEditHygiene(memberName, memberEmail)) {
      alert(`You can only update your own daily hygiene row.`);
      return;
    }
    updateData(prev => {
      const h = {...prev.hygiene};
      h[week] = {...(h[week]||{})};
      h[week][memberName] = {...(h[week][memberName]||{})};
      h[week][memberName][dayIdx] = {...(h[week][memberName][dayIdx]||{})};
      const current = h[week][memberName][dayIdx][key] || '';
      const next = cycleVal(current);
      if (next) h[week][memberName][dayIdx][key] = next;
      else delete h[week][memberName][dayIdx][key];
      return {...prev, hygiene: h};
    });
  };

  const prevWeek = () => {
    const d = parse(week); d.setDate(d.getDate()-7); set({week: iso(d)});
  };
  const nextWeek = () => {
    const d = parse(week); d.setDate(d.getDate()+7); set({week: iso(d)});
  };
  const thisWeek = () => set({week: mondayOf(new Date())});

  const hm = hygMembers(members);

  const rows = hm.map(m => {
    const mw = W[m.name] || {};
    const h = hygPct(m.name, week, hygiene);
    const isMe = canEditHygiene(m.name, m.email);
    const canEditRow = canEditHygiene(m.name, m.email);
    if (h.l != null) { colL[0] += h.l; colL[1]++; }
    if (h.t != null) { colT[0] += h.t; colT[1]++; }

    return (
      <tr key={m.name} style={isMe ? { background: '#F0FDF4' } : {}}>
        <td>
          <b>{m.name}</b>
          {isMe && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>You</span>}
          <div className="small muted">{m.role}{m.combo ? ` · ${m.combo}` : ''}</div>
        </td>
        {D.map((_, i) => {
          const c = mw[i] || {};
          return ['l','t'].map(k => {
            const v = c[k] || '';
            return (
              <td key={k} className="cc">
                <button
                  className={`yn yn-${(v||'x').toLowerCase()}`}
                  onClick={() => toggle(m.name, m.email, i, k)}
                  style={!canEditRow ? { cursor: 'not-allowed', opacity: v ? 0.9 : 0.4 } : {}}
                  title={canEditRow ? `Click to cycle status (${m.name})` : `Only ${m.name} can edit this`}
                  aria-label={`${m.name} ${D[i]} ${k==='l'?'Lattice':'Timesheet'}: ${v||'blank'}`}>
                  {v||'·'}
                </button>
              </td>
            );
          });
        })}
        <td className="r">{h.l == null ? '—' : pct(h.l)}</td>
        <td className="r">{h.t == null ? '—' : pct(h.t)}</td>
      </tr>
    );
  });

  const d2 = new Date(dd);
  d2.setDate(d2.getDate()+4);

  const currentWeek = mondayOf(new Date());
  const isCurrentWeek = week === currentWeek;

  // Format: "Mon 13 Oct – Fri 17 Oct 2026"
  const fmtDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDayYear = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const weekLabel = dd ? `${fmtDay(dd)} – ${fmtDayYear(d2)}` : '—';

  return (
    <div>
      <p className="hint">Lattice and timesheets, checked after each DSM. Tap a cell to cycle Y (done) → N (missed) → L (leave, excluded) → blank. You can edit only your own row; everyone else's is read-only.</p>

      <div className="leave-header-bar" style={{ marginBottom: '16px' }}>
        <div className="leave-nav-group">
          <button
            onClick={prevWeek}
            className="leave-nav-btn"
            title="Previous week">
            <span style={{ fontSize: '15px', lineHeight: 1 }}>‹</span> Prev
          </button>
          <button
            onClick={thisWeek}
            className={`leave-nav-btn ${isCurrentWeek ? 'active-month' : ''}`}
            title="Go to current week">
            Today
          </button>
          <button
            onClick={nextWeek}
            className="leave-nav-btn"
            title="Next week">
            Next <span style={{ fontSize: '15px', lineHeight: 1 }}>›</span>
          </button>

          <div className="leave-title-badge">
            <span>{weekLabel}</span>
            {isCurrentWeek && <span className="leave-pill-badge">This week</span>}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="ch">
          <h2>{weekLabel}</h2>
          <span className="small">
            Team: Lattice <b>{colL[1] ? pct(colL[0]/colL[1]) : '—'}</b> · Timesheets <b>{colT[1] ? pct(colT[0]/colT[1]) : '—'}</b>
          </span>
        </div>
        <div className="scroll">
          <table className="tbl hyg">
            <thead>
              <tr>
                <th rowSpan="2">Team member</th>
                {D.map((d, i) => {
                  const x = new Date(dd);
                  x.setDate(x.getDate() + i);
                  return <th key={d} colSpan="2" className="c">{d} {x.getDate()}</th>;
                })}
                <th rowSpan="2" className="r">Lattice</th>
                <th rowSpan="2" className="r">Timesheet</th>
              </tr>
              <tr>
                {D.map(d => [
                  <th key={d+'l'} className="c sm">Lat</th>,
                  <th key={d+'t'} className="c sm">TS</th>
                ])}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </section>

      <div className="legend">
        <span><span style={{fontWeight:700,color:'var(--ok)'}}>Y</span> Done</span>
        <span><span style={{fontWeight:700,color:'var(--bad)'}}>N</span> Missed</span>
        <span><span style={{fontWeight:700,color:'var(--muted)'}}>L</span> Leave (excluded)</span>
        <span>· Not entered</span>
      </div>
    </div>
  );
}
