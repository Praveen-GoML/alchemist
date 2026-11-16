import { iso, ym, pad, parse, today, hygMembers } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const LEAVE = [
  ['CL','Casual leave'],['SL','Sick leave'],['EL','Earned leave'],['CO','Comp off'],
  ['FL','Floater'],['MWB','Mental well-being'],['LOP','Loss of pay'],['BRV','Bereavement'],
  ['MAR','Marriage'],['SAB','Sabbatical'],['HOL','Holiday']
];

export default function Leave({ data, updateData, ui, setUi }) {
  const { user, canEditLeave, isOwnMember, isManagementUser } = useAuth();
  const { leave={}, members=[] } = data;
  const { leaveMonth, brush='CL' } = ui;
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
          <span>🎨 Select Leave Type To Apply</span>
          <span style={{ fontWeight: 500, textTransform: 'none', fontSize: '12px' }}>
            Tap any cell in your row to apply or clear
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
                <b>{code}</b>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar table card */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="ch" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
          <h2 style={{ fontSize: '15px' }}>{monthLabel} — Team Attendance Calendar</h2>
          <span className="small" style={{ color: 'var(--muted)' }}>
            Weekends shaded · Blue border denotes today
          </span>
        </div>
        <div className="scroll">
          <table className="tbl lv">
            <thead>
              <tr>
                <th className="sticky">Team Member</th>
                {cols.map(c => {
                  const we = c.w === 0 || c.w === 6;
                  const isTd = c.k === t;
                  return (
                    <th key={c.k} className={`c${we ? ' we' : ''}${isTd ? ' td' : ''}`} title={`${c.k}`}>
                      <span style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase' }}>
                        {'SMTWTFS'[c.w]}
                      </span>
                      <br />
                      <span style={{ fontSize: '12px', fontWeight: isTd ? 800 : 600 }}>{c.d}</span>
                    </th>
                  );
                })}
                <th className="r" style={{ padding: '8px 14px', minWidth: '60px' }}>Total</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: isMe ? 700 : 500, color: 'var(--ink)' }}>{member.name}</span>
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
                    {cols.map(c => {
                      const v = L[c.k] || '';
                      const we = c.w === 0 || c.w === 6;
                      const isTd = c.k === t;
                      return (
                        <td key={c.k} className={`lc${we ? ' we' : ''}${isTd ? ' td' : ''}`}>
                          <button
                            className={`lcell${v ? ' lv-' + v.toLowerCase() : ''}`}
                            onClick={() => toggleCell(member.name, member.email, c.k)}
                            style={!canEditRow ? { cursor: 'not-allowed', opacity: v ? 0.85 : 0.25 } : {}}
                            title={canEditRow ? `Click to mark/clear leave for ${member.name} on ${c.k}` : `Read-only for ${member.name}`}
                            aria-label={`${member.name} ${c.k}: ${v || 'working'}`}>
                            {v || ''}
                          </button>
                        </td>
                      );
                    })}
                    <td className="r" style={{ padding: '8px 14px' }}>
                      <span className={`leave-count-pill${monthCount > 0 ? ' has-leave' : ''}`}>
                        {monthCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modern Legend Bar */}
      <div className="leave-legend-bar">
        <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Legend:
        </span>
        {LEAVE.map(([code, label]) => (
          <div key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className={`lcell lv-${code.toLowerCase()}`} style={{ width: 22, height: 22, fontSize: '9px', pointerEvents: 'none' }}>
              {code}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

