import { iso, ym, pad, parse, today, hygMembers } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

import { queueLeaveNotice, cancelLeaveNotice } from '../../services/notifications';
const LEAVE = [
  ['CL','Casual leave'],['EL','Earned leave'],['CO','Comp off'],
  ['MWB','Mental well-being'],['LOP','Loss of pay'],['BRV','Bereavement'],
  ['MAR','Marriage'],['SAB','Sabbatical'],['HOL','Holiday']
];

export default function Leave({ data, updateData, ui, setUi }) {
  const { user, canEditLeave, isOwnMember, isManagementUser } = useAuth();
  const { leave={}, members=[] } = data;
  const { leaveMonth } = ui;
  // A saved selection of a removed type (Sick / Floater) falls back to Casual leave
  const brush = LEAVE.some(([c]) => c === ui.brush) ? ui.brush : 'CL';
  const set = patch => setUi(prev => ({...prev,...patch}));

  const [y, m] = leaveMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const t = iso(today());

  const cols = [];
  for (let d=1; d<=daysInMonth; d++) {
    const dt = new Date(y, m-1, d);
    cols.push({ k: iso(dt), d, w: dt.getDay() });
  }

  const prevMonth = () => set({ leaveMonth: ym(new Date(y, m-2, 1)) });
  const nextMonth = () => set({ leaveMonth: ym(new Date(y, m, 1)) });
  const thisMonth = () => set({ leaveMonth: ym(new Date()) });

  const toggleCell = (memberName, memberEmail, dateKey) => {
    if (!canEditLeave(memberName, memberEmail)) {
      alert(`You can only mark your own leave.`);
      return;
    }
    // Tell the PMs and TLs when someone applies for leave (several clicks become one message)
    const clearing = (leave[memberName] || {})[dateKey] === brush;
    if (clearing) {
      cancelLeaveNotice(dateKey);
    } else if (brush !== 'HOL') {
      queueLeaveNotice({ who: user?.name || memberName, label: (LEAVE.find(([c]) => c === brush) || [, 'leave'])[1], date: dateKey });
    }
    updateData(prev => {
      const lv = {...prev.leave};
      lv[memberName] = {...(lv[memberName]||{})};
      if (lv[memberName][dateKey] === brush) {
        delete lv[memberName][dateKey];
      } else {
        lv[memberName][dateKey] = brush;
      }
      return {...prev, leave: lv};
    });
  };

  // Include PM Thasleema and Neha but exclude other PMs
  const people = members.filter(m =>
    m.role !== 'PM' || /Thasleema|Neha/.test(m.name)
  );

  const monthLabel = new Date(y, m-1, 1).toLocaleDateString('en-GB', {month:'long', year:'numeric'});

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = leaveMonth === currentMonth;

  // Calculate monthly stats
  let totalLeavesMarked = 0;
  people.forEach(p => {
    const L = leave[p.name] || {};
    cols.forEach(c => {
      if (L[c.k] && L[c.k] !== 'HOL') totalLeavesMarked++;
    });
  });

  return (
    <div className="leave-container">
      {/* Top Header & Navigation Bar */}
      <div className="leave-header-bar">
        <div className="leave-nav-group">
          <button
            onClick={prevMonth}
            className="leave-nav-btn"
            title="Previous month">
            <span style={{ fontSize: '15px', lineHeight: 1 }}>‹</span> Prev
          </button>
          <button
            onClick={thisMonth}
            className={`leave-nav-btn ${isCurrentMonth ? 'active-month' : ''}`}
            title="Jump to current month">
            Today
          </button>
          <button
            onClick={nextMonth}
            className="leave-nav-btn"
            title="Next month">
            Next <span style={{ fontSize: '15px', lineHeight: 1 }}>›</span>
          </button>

          <div className="leave-title-badge">
            <span>{monthLabel}</span>
            {isCurrentMonth && <span className="leave-pill-badge">This month</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--muted)' }}>
          <span>Total leaves taken: <b style={{ color: 'var(--ink)', fontSize: '14px' }}>{totalLeavesMarked}</b></span>
          <span style={{ height: '14px', width: '1px', background: 'var(--line)' }} />
          <span>Active brush: <b style={{ color: 'var(--accent-text)', textTransform: 'uppercase' }}>{brush}</b></span>
        </div>
      </div>

      {/* Brush selector card */}
      <div className="leave-brush-card">
        <div className="leave-brush-title">
          <span>Leave type</span>
          <span style={{ fontWeight: 500, textTransform: 'none', fontSize: '12px' }}>
            Pick a type, then tap any day in your row to apply or clear
          </span>
        </div>
        <div className="leave-brush-strip" role="radiogroup" aria-label="Leave type to apply">
          {LEAVE.map(([code, label]) => {
            const isSelected = brush === code;
            return (
              <button
                key={code}
                role="radio"
                aria-checked={isSelected}
                className={`lb lv-${code.toLowerCase()}${isSelected ? ' on' : ''}`}
                onClick={() => set({ brush: code })}
                title={`${label} (${code})`}>
                <i className="lb-dot" aria-hidden="true" />
                <span className="lb-name">{label}</span>
                <b className="lb-code">{code}</b>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar table card */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="ch" style={{ padding: '20px 24px 8px' }}>
          <h2 style={{ fontSize: '15px' }}>{monthLabel} — Team Attendance Calendar</h2>
          <span className="small" style={{ color: 'var(--muted)' }}>
            Weekends shaded · Blue border denotes today
          </span>
        </div>
        <div className="lv-wrap">
          <table className="tbl lv">
            <thead>
              <tr>
                <th className="sticky">
                  <div className="lv-nav">
                    <button type="button" onClick={prevMonth} aria-label="Previous month">‹</button>
                    <span>{new Date(y, m-1, 1).toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</span>
                    <button type="button" onClick={nextMonth} aria-label="Next month">›</button>
                  </div>
                </th>
                {cols.map(c => {
                  const we = c.w === 0 || c.w === 6;
                  const isTd = c.k === t;
                  return (
                    <th key={c.k} className={`c${we ? ' we' : ''}${isTd ? ' td' : ''}`} title={`${c.k}`}>
                      <span className="lv-dow">{['Su','Mo','Tu','We','Th','Fr','Sa'][c.w]}</span>
                      <i className="lv-dot" />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {people.map(member => {
                const L = leave[member.name] || {};
                const isMe = canEditLeave(member.name, member.email);
                const canEditRow = canEditLeave(member.name, member.email);
                const monthCount = cols.filter(c => L[c.k] && L[c.k] !== 'HOL').length;

                return (
                  <tr key={member.name} className={isMe ? 'is-me' : ''}>
                    <td className="sticky">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="lv-av" aria-hidden="true">{(member.name || '?')[0].toUpperCase()}</span>
                        <span className="lv-name" title={member.name} style={{ fontWeight: isMe ? 700 : 500, color: 'var(--ink)' }}>{member.name}</span>
                        {isMe && (
                          <span style={{
                            fontSize: '10px',
                            background: '#DCFCE7',
                            color: '#15803D',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            border: '1px solid #BBF7D0'
                          }}>
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    {cols.map((c, ci) => {
                      const v = L[c.k] || '';
                      const we = c.w === 0 || c.w === 6;
                      const isTd = c.k === t;
                      const off = we && !v;
                      const prevC = ci > 0 ? cols[ci - 1] : null;
                      const nextC = ci < cols.length - 1 ? cols[ci + 1] : null;
                      const joined = (o) => o && (v ? L[o.k] : we && (o.w === 0 || o.w === 6) && !L[o.k]);
                      const band = (v || off) ? `${joined(prevC) ? ' band-l' : ''}${joined(nextC) ? ' band-r' : ''} ${v ? 'has-leave' : 'is-off'}` : '';
                      return (
                        <td key={c.k} className={`lc${we ? ' we' : ''}${isTd ? ' td' : ''} ${band}`}>
                          <button
                            className={`lcell${v ? ' lv-' + v.toLowerCase() : ''}`}
                            disabled={off}
                            onClick={() => toggleCell(member.name, member.email, c.k)}
                            style={!canEditRow ? { cursor: 'not-allowed' } : {}}
                            title={off ? 'Weekly off' : canEditRow ? `${v ? 'Clear' : 'Mark'} leave for ${member.name} on ${c.k}${v ? ' (' + v + ')' : ''}` : `Read-only for ${member.name}`}
                            aria-label={`${member.name} ${c.k}: ${v || (off ? 'weekly off' : 'working')}`}>
                            {c.d}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

