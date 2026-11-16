import React, { useState } from 'react';
import {
  Handshake,
  ClipboardList,
  UserCheck,
  Users,
  Flag,
  ShieldCheck,
  Rocket,
  Cpu,
  CalendarDays,
  Zap,
  CheckCircle2,
  Target,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  Table
} from 'lucide-react';

const STEPS = [
  { title: 'Pre-sales KT', desc: 'Pre-sales briefs Thasleema and Akshay', icon: Handshake },
  { title: 'Pre-req tracker', desc: 'Akshay prepares it from the template', icon: ClipboardList },
  { title: 'Client intro', desc: 'Kapil introduces the PM and lead', icon: UserCheck },
  { title: 'Resource allocation', desc: 'Thasleema and Akshay onboard the team', icon: Users },
  { title: 'Team KT & early blockers', desc: 'Akshay flags risks up front', icon: Flag },
  { title: 'Readiness gate', desc: 'No pre-reqs, no kick-off', icon: ShieldCheck },
  { title: 'Kick-off', desc: 'Thasleema: deck, scope, schedule', icon: Rocket },
  { title: 'Infra cost & deploy plan', desc: 'Cost to DevOps only after kick-off; deployment plan in Sprint 0', icon: Cpu },
  { title: 'Exact sprint plan', desc: 'Thasleema and the team, from the template', icon: CalendarDays },
  { title: 'Execution', desc: 'DSM, Lattice, timesheets, WSR', icon: Zap },
  { title: 'UAT', desc: 'Confirmed dates, daily UAT calls', icon: CheckCircle2 },
  { title: 'Sign-off & retro', desc: 'Lessons go back into the templates', icon: Target },
];
const STEP_PHASES = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4, 4];

const PHASE_META = [
  { label: 'Pre-project' },
  { label: 'Readiness' },
  { label: 'Kick-off & plan' },
  { label: 'Execution' },
  { label: 'UAT & closure' },
];

const CADENCE = [
  ['Daily stand-up (DSM)', 'Daily', 'Whole project team', 'Thasleema', 'Lattice updated, blockers logged'],
  ['Senior connect', 'Twice a week', 'Thasleema, Akshay, Sr. MLs, leads', 'Thasleema', 'Delay tracker review, risks, decisions'],
  ['Client cadence', 'Weekly', 'Client, Thasleema, Akshay', 'Thasleema', 'WSR'],
  ['DSR', 'As needed', 'Client stakeholders', 'Thasleema', 'Daily status report'],
  ['Sprint demo', 'End of each sprint', 'Client, project team', 'Akshay', 'Demo, client feedback'],
  ['UAT call', 'Daily during UAT', 'Client users, Thasleema, Akshay, module owners', 'Thasleema', 'Defect list, fix plan, sign-off progress'],
  ['Retrospective', 'End of milestone or project', 'Project team', 'Thasleema', 'Retro doc, template updates']
];

const RACI_COLS = ['Pre-sales', 'Kapil', 'Thasleema', 'Akshay', 'ML combo', 'BE / FE / DE', 'DevOps'];
const RACI_ROWS = [
  ['Pre-sales KT & handover', 'R', 'I', 'A', 'C', '–', '–', '–'],
  ['Pre-req tracker preparation', 'C', '–', 'C', 'A/R', '–', '–', '–'],
  ['Client introduction', 'C', 'A/R', 'I', 'I', '–', '–', '–'],
  ['Sharing & chasing pre-reqs', '–', 'I', 'A/R', 'C', '–', '–', '–'],
  ['Resource allocation & onboarding', '–', 'C', 'A/R', 'R', 'I', 'I', '–'],
  ['Project KT & early blockers', 'C', 'I', 'R', 'A/R', 'C', 'C', '–'],
  ['Kick-off gate & meeting', 'C', 'C', 'A/R', 'R', 'I', 'I', '–'],
  ['Infra cost estimate (post kick-off)', '–', 'I', 'I', 'A/R', 'C', 'C', 'R'],
  ['Deployment plan shared early', '–', '–', 'I', 'A', 'C', 'R', 'C'],
  ['Exact sprint plan', '–', 'I', 'A/R', 'R', 'C', 'C', '–'],
  ['Lattice, timesheets, blockers', '–', '–', 'A', 'C', 'R', 'R', '–'],
  ['Delay tracker', '–', 'I', 'C', 'A', 'R', 'R', '–'],
  ['WSR / DSR / MOM', '–', 'I', 'A/R', 'C', 'I', 'I', '–'],
  ['Escalations', '–', 'A/R', 'R', 'R', 'C', 'C', 'C'],
  ['UAT calls & defect fixes', '–', 'I', 'A', 'R', 'R', 'R', 'C'],
  ['Sign-off & retrospective', 'I', 'I', 'A/R', 'R', 'C', 'C', '–']
];

function raciClass(c) {
  if (c.includes('A')) return 'r-a';
  if (c === 'R') return 'r-r';
  if (c === 'C') return 'r-c';
  if (c === 'I') return 'r-i';
  return 'r-x';
}

export default function Playbook() {
  const [collapsed, setCollapsed] = useState({
    steps: false,
    escalation: false,
    cadence: false,
    raci: false
  });

  const toggle = section => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div>
      <p className="hint">How a project moves through Go Alchemists, who owns each step, and where to escalate.</p>

      {/* 12 steps */}
      <section className="card" style={{ overflow: 'visible', marginBottom: '16px' }}>
        <div
          className="ch"
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}
          onClick={() => toggle('steps')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--soft)',
              color: 'var(--accent-text)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Rocket size={16} strokeWidth={2.2} />
            </span>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Twelve steps, pre-sales to sign-off</h2>
              <span className="small muted">Standard delivery progression from discovery to handover</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px', fontWeight: 500 }}>
            <span>{collapsed.steps ? 'Expand' : 'Collapse'}</span>
            {collapsed.steps ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {!collapsed.steps && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {STEPS.map((s, i) => {
                const ph = PHASE_META[STEP_PHASES[i]];
                return (
                  <div
                    key={i}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-sm, 10px)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      cursor: 'default',
                      transition: 'all 0.18s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--line)';
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'var(--soft)',
                        color: 'var(--ink)',
                        border: '1px solid var(--line)',
                        fontWeight: 700,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '-0.02em',
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: 'var(--muted)',
                        background: 'var(--soft)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        letterSpacing: '0.01em',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        {ph.label}
                      </span>
                    </div>

                    <div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '13.5px',
                        color: 'var(--ink)',
                        lineHeight: 1.35,
                        marginBottom: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        letterSpacing: '-0.015em',
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-text)',
                          flexShrink: 0,
                        }}>
                          {React.createElement(s.icon, { size: 16, strokeWidth: 2.2 })}
                        </span>
                        <span>{s.title}</span>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        lineHeight: 1.55,
                        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                        letterSpacing: '-0.005em',
                      }}>
                        {s.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
              {PHASE_META.map((ph, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--muted)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.85, display: 'inline-block' }} />
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Phase {i + 1}:</span> {ph.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Escalation */}
      <section className="card">
        <div className="ch">
          <h2>Escalation path</h2>
          <span className="small muted">Tiered escalation SLA and designated resolution owners</span>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            {
              level: 'L1', time: 'Within 2 hours', tag: 'Fast-Track',
              desc: 'Combo partner or peer: day-to-day technical doubts, hand-offs, quick reviews.'
            },
            {
              level: 'L2', time: 'Same day', tag: 'Lead Review',
              desc: 'Thasleema for delivery, Akshay for technical: client dependencies, delays, scope, resource gaps, design decisions.'
            },
            {
              level: 'L3', time: 'After 2 working days', tag: 'Executive SLA',
              desc: 'Kapil, Head of Delivery: UAT or go-live at risk, client escalations, cross-hub conflicts, anything Level 2 cannot close.'
            },
          ].map(({ level, time, tag, desc }) => (
            <div key={level} style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm, 10px)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              transition: 'all 0.15s ease',
            }}>
              <div style={{
                minWidth: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--soft)',
                border: '1px solid var(--line)',
                color: 'var(--accent-text)',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'ui-monospace, monospace',
              }}>
                {level}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}>{time}</span>
                  <span style={{
                    fontSize: '10.5px',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-text)',
                    fontWeight: 600,
                  }}>{tag}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.55 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cadence */}
      <section className="card">
        <div className="ch"><h2>Meeting and reporting cadence</h2></div>
        <div className="scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Meeting or report</th><th>Frequency</th><th>Attendees</th><th>Owner</th><th>Output</th>
              </tr>
            </thead>
            <tbody>
              {CADENCE.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => <td key={j} className={j === 0 ? 'b' : 'wrap'}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">MOM goes out the same day for every meeting.</p>
      </section>

      {/* RACI */}
      <section className="card">
        <div className="ch">
          <h2>RACI</h2>
          <span className="small muted">Responsible, Accountable, Consulted, Informed</span>
        </div>
        <div className="scroll">
          <table className="tbl raci">
            <thead>
              <tr>
                <th>Activity</th>
                {RACI_COLS.map(c => <th key={c} className="c">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {RACI_ROWS.map((row, i) => (
                <tr key={i}>
                  <td>{row[0]}</td>
                  {row.slice(1).map((c, j) => (
                    <td key={j} className={`c ${raciClass(c)}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
