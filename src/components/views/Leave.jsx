import { useState } from 'react';
import { iso, ym, pad, parse, today, hygMembers } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

import { notifyLeaveSubmitted } from '../../services/notifications';
import { playSound } from '../../utils/sound';
import LeaveSubmitModal from '../LeaveSubmitModal';
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

  // Days tapped here are a draft until the person presses Submit: { 'YYYY-MM-DD': 'CL' | '' }
  // ('' means "remove the leave already saved on that day").
  const [draft, setDraft] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleCell = (memberName, memberEmail, dateKey) => {
    if (!canEditLeave(memberName, memberEmail)) {
      alert(`You can only mark your own leave.`);
      return;
    }
    const saved = (leave[memberName] || {})[dateKey] || '';
    const effective = dateKey in draft ? draft[dateKey] : saved;
    const target = effective === brush ? '' : brush;
    setDraft(prev => {
      const next = { ...prev };
      if (target === saved) delete next[dateKey]; // back to what is already saved: no change
      else next[dateKey] = target;
      return next;
    });
  };

  const labelOf = (code) => (LEAVE.find(([c]) => c === code) || [code, code])[1];
  const savedOf = (dateKey) => ((leave[myName] || {})[dateKey]) || '';
  const draftKeys = Object.keys(draft).sort();
  const adds = draftKeys.filter(k => draft[k]).map(k => ({ date: k, code: draft[k], label: labelOf(draft[k]) }));
  const removes = draftKeys.filter(k => !draft[k]).map(k => ({ date: k, code: savedOf(k), label: labelOf(savedOf(k)) }));

  const submitAttendance = () => {
    if (!myName || !draftKeys.length) return;
    setSaving(true);
    updateData(prev => {
      const lv = { ...prev.leave };
      const row = { ...(lv[myName] || {}) };
      draftKeys.forEach(k => { if (draft[k]) row[k] = draft[k]; else delete row[k]; });
      lv[myName] = row;
      return { ...prev, leave: lv };
    });
    notifyLeaveSubmitted({ who: user?.name || myName, adds, removes });
    playSound('success');
    setDraft({});
    setReviewing(false);
    setSaving(false);
  };

  // Everyone on the team is listed (PMs and TLs too). If the signed-in user is not on the
  // team list yet, they still get their own row so they can mark attendance.
  const mine = members.find(m => isOwnMember(m.name, m.email));
  const people = (!mine && user)
    ? [{ name: user.name, email: user.email, role: user.role }, ...members]
    : members;
  const myName = mine?.name || user?.name;

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
            Pick a type, tap your days, then press Submit to save
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
                      const own = member.name === myName;
                      const savedV = L[c.k] || '';
                      const pend = own && (c.k in draft);
                      const v = pend ? draft[c.k] : savedV;
                      const removing = pend && !draft[c.k] && !!savedV;
                      const we = c.w === 0 || c.w === 6;
                      const isTd = c.k === t;
                      const off = we && !v;
                      const prevC = ci > 0 ? cols[ci - 1] : null;
                      const nextC = ci < cols.length - 1 ? cols[ci + 1] : null;
                      const eff = (k) => (own && (k in draft) ? draft[k] : L[k]);
                      const joined = (o) => o && (v ? eff(o.k) : we && (o.w === 0 || o.w === 6) && !eff(o.k));
                      const band = (v || off) ? `${joined(prevC) ? ' band-l' : ''}${joined(nextC) ? ' band-r' : ''} ${v ? 'has-leave' : 'is-off'}` : '';
                      return (
                        <td key={c.k} className={`lc${we ? ' we' : ''}${isTd ? ' td' : ''} ${band}`}>
                          <button
                            className={`lcell${v ? ' lv-' + v.toLowerCase() : removing ? ' lv-' + savedV.toLowerCase() : ''}${pend && v ? ' pending' : ''}${removing ? ' removing' : ''}`}
                            disabled={off}
                            onClick={() => toggleCell(member.name, member.email, c.k)}
                            style={!canEditRow ? { cursor: 'not-allowed' } : {}}
                            title={off ? 'Weekly off' : canEditRow ? `${v ? 'Clear' : 'Mark'} leave on ${c.k}${v ? ' (' + labelOf(v) + ')' : ''}${pend ? ', not submitted yet' : ''}` : `Read-only for ${member.name}`}
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

      {draftKeys.length > 0 && (
        <div className="lv-submitbar" role="region" aria-label="Unsubmitted attendance">
          <div className="lv-sb-text">
            <b>{draftKeys.length} {draftKeys.length === 1 ? 'change' : 'changes'} not submitted</b>
            <span>
              {adds.length > 0 && `${adds.length} ${adds.length === 1 ? 'day' : 'days'} to add`}
              {adds.length > 0 && removes.length > 0 && ' · '}
              {removes.length > 0 && `${removes.length} to remove`}
            </span>
          </div>
          <button type="button" className="btn ghost" onClick={() => setDraft({})}>Discard</button>
          <button type="button" className="btn" onClick={() => setReviewing(true)}>Submit attendance</button>
        </div>
      )}

      {reviewing && (
        <LeaveSubmitModal
          adds={adds}
          removes={removes}
          who={(user?.name || '').split(' ')[0]}
          saving={saving}
          onCancel={() => setReviewing(false)}
          onConfirm={submitAttendance}
        />
      )}

    </div>
  );
}

