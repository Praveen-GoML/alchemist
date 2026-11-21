import { useAuth } from '../../context/AuthContext';
import { useProjectScope } from '../../hooks/useProjectScope';
import { parse, today, days, fmt, pct, slug, sym, uatDelay, clSummary, hygMembers, hygPct, mondayOf, iso, PSTAT } from '../../utils/helpers';

export default function Overview({ data }) {
  const { user } = useAuth();
  const { projects: allProjects=[], improvements=[], members=[], hygiene={}, leave={}, checklist={}, clProjects: allClProjects=[], items=[] } = data;
  const { canSee } = useProjectScope(members);
  // Members only see the projects they are involved in (Team > Project matrix)
  const projects = allProjects.filter(p => canSee(p.name));
  const clProjects = allClProjects.filter(n => canSee(n));
  const t = today();

  // Status counts
  const counts = {};
  PSTAT.forEach(s => { counts[s] = 0; });
  projects.forEach(p => { counts[p.status] = (counts[p.status]||0) + 1; });

  // UAT windows ±60 days
  const upcoming = projects
    .filter(p => {
      const d = parse(p.rUatStart||p.pUatStart);
      return d && p.status !== 'Completed' && days(t,d) >= -30 && days(t,d) <= 60;
    })
    .sort((a,b) => (a.rUatStart||a.pUatStart) < (b.rUatStart||b.pUatStart) ? -1 : 1);

  // Blockers
  const bl = projects.filter(p => p.blocker);

  // Checklist gate summary
  const names = clProjects;
  let ready=0, warn=0, blocked=0;
  const sums = names.map(n => {
    const s = clSummary(n, checklist, items);
    if (!s.gate) ready++;
    if (s.warn) warn++;
    blocked += s.blocked;
    return [n, s];
  });

  // Hygiene this week
  const wk = mondayOf(t);
  const hm = hygMembers(members);
  let lsum=0, ln=0, tsum=0, tn=0;
  hm.forEach(m => {
    const h = hygPct(m.name, wk, hygiene);
    if (h.l != null) { lsum += h.l; ln++; }
    if (h.t != null) { tsum += h.t; tn++; }
  });

  // Away today
  const tk = iso(t);
  const away = members.filter(m => (leave[m.name]||{})[tk]);

  // Improvements
  const imp = improvements;
  const idone = imp.filter(i => i.status==='Done').length;
  const iprog = imp.filter(i => i.status==='In progress').length;

  // Charts ---------------------------------------------------------------
  const STATUS_COLOR = { 'On Schedule': '#3DA56A', 'Behind': '#F2A23A', 'Delayed': '#E2553F', 'Not Started': '#A39C95', 'Completed': '#4A7CF0' };
  const totalProj = projects.length;
  const R = 54, CIRC = 2 * Math.PI * R;
  let acc = 0;
  const segs = PSTAT.filter(s => counts[s]).map(s => {
    const len = (counts[s] / (totalProj || 1)) * CIRC;
    const seg = { s, n: counts[s], len, off: acc };
    acc += len;
    return seg;
  });

  const avg = (sum, n) => (n ? sum / n : null);
  const ringData = [
    { label: 'Lattice', v: avg(lsum, ln), hint: 'Lattice compliance this week' },
    { label: 'Timesheet', v: avg(tsum, tn), hint: 'Timesheet compliance this week' },
    { label: 'Checklist', v: sums.length ? sums.reduce((a, [, s]) => a + s.overall, 0) / sums.length : null, hint: 'Average delivery-checklist progress' },
  ];

  // UAT sign-offs by month: overdue first, then the next four months
  const signs = projects.filter(p => p.status !== 'Completed' && (p.rUatSign || p.pUatSign)).map(p => parse(p.rUatSign || p.pUatSign));
  const cols = [{ label: 'Overdue', n: signs.filter(d => d < t).length, late: true }];
  for (let i = 0; i < 4; i++) {
    const m0 = new Date(t.getFullYear(), t.getMonth() + i, 1), m1 = new Date(t.getFullYear(), t.getMonth() + i + 1, 1);
    cols.push({ label: m0.toLocaleDateString('en-GB', { month: 'short' }), n: signs.filter(d => d >= t && d >= m0 && d < m1).length });
  }
  const colMax = Math.max(1, ...cols.map(c => c.n));

  return (
    <div>
      <div className="greet">
        <h2>Good to see you, {(user?.name || '').split(' ')[0] || 'there'}</h2>
      </div>
      <p className="hint">
        Every Go Alchemists tracker in one place. Today is{' '}
        {t.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}.
      </p>

      {/* At a glance: three small charts */}
      <div className="hg">
        <section className="card hg-card">
          <div className="ch"><h2>Projects by status</h2></div>
          <div className="hg-donut">
            <svg viewBox="0 0 140 140" role="img" aria-label={`${totalProj} projects by status`}>
              <circle cx="70" cy="70" r={R} fill="none" stroke="var(--soft)" strokeWidth="16" />
              {segs.map(g => (
                <circle key={g.s} cx="70" cy="70" r={R} fill="none" stroke={STATUS_COLOR[g.s]} strokeWidth="16"
                  strokeDasharray={`${Math.max(g.len - 3, 0.5)} ${CIRC}`} strokeDashoffset={-g.off}
                  transform="rotate(-90 70 70)" strokeLinecap="butt"><title>{`${g.s}: ${g.n}`}</title></circle>
              ))}
              <text x="70" y="68" textAnchor="middle" className="hg-big">{totalProj}</text>
              <text x="70" y="86" textAnchor="middle" className="hg-small">projects</text>
            </svg>
            <ul className="hg-leg">
              {segs.map(g => (
                <li key={g.s}><i style={{ background: STATUS_COLOR[g.s] }} />{g.s}<b>{g.n}</b></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card hg-card">
          <div className="ch"><h2>Health this week</h2></div>
          <div className="hg-rings">
            {ringData.map(r => {
              const rr = 30, c = 2 * Math.PI * rr, val = r.v == null ? 0 : Math.max(0, Math.min(1, r.v));
              return (
                <div key={r.label} className="hg-ring" title={r.hint}>
                  <svg viewBox="0 0 80 80" role="img" aria-label={`${r.label} ${r.v == null ? 'no data' : Math.round(val * 100) + '%'}`}>
                    <circle cx="40" cy="40" r={rr} fill="none" stroke="var(--soft)" strokeWidth="9" />
                    {val > 0 && <circle cx="40" cy="40" r={rr} fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
                      strokeDasharray={`${val * c} ${c}`} transform="rotate(-90 40 40)" />}
                    <text x="40" y="45" textAnchor="middle" className="hg-ringnum">{r.v == null ? '—' : Math.round(val * 100) + '%'}</text>
                  </svg>
                  <span>{r.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card hg-card">
          <div className="ch"><h2>UAT sign-offs ahead</h2></div>
          <div className="hg-cols" role="img" aria-label="UAT sign-offs by month">
            {cols.map(c => (
              <div key={c.label} className={`hg-col${c.late ? ' late' : ''}`} title={`${c.label}: ${c.n} sign-off${c.n === 1 ? '' : 's'}`}>
                <b>{c.n}</b>
                <i style={{ height: Math.max(c.n / colMax * 100, c.n ? 8 : 3) + '%' }} />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Portfolio */}
      <section className="card">
        <div className="ch">
          <h2>Project portfolio</h2>
          <div className="legend">
            {PSTAT.map(s => counts[s] ? (
              <span key={s}><i className={`dot st-${slug(s)}`}></i>{s} <b>{counts[s]}</b></span>
            ) : null)}
          </div>
        </div>
        <div className="pgrid">
          {projects.map(p => {
            const u = p.rUatSign||p.pUatSign;
            const ud = parse(u);
            const left = ud ? days(t, ud) : null;
            const label = {
              'On Schedule': 'On track', 'Behind': 'Behind', 'Delayed': 'Delayed',
              'Not Started': 'Not started', 'Completed': 'Done'
            }[p.status] || p.status;
            const s0 = parse(p.start), e0 = parse(p.end);
            let elapsed = null;
            if (s0 && e0 && e0 > s0) elapsed = Math.max(0, Math.min(100, Math.round(((t - s0) / (e0 - s0)) * 100)));
            if (p.status === 'Completed') elapsed = 100;
            if (p.status === 'Not Started') elapsed = 0;
            const rel = left === null ? 'Dates TBC'
              : left < 0 ? `${-left}d past UAT sign-off`
              : left === 0 ? 'UAT sign-off today'
              : `${left}d to UAT sign-off`;
            const cl = clProjects.includes(p.name) ? clSummary(p.name, checklist, items) : null;
            const clPct = cl ? Math.round(cl.overall * 100) : null;
            const people = (p.team || '').split(',').map(x => x.trim()).filter(Boolean);
            const overdue = left !== null && left < 0 && p.status !== 'Completed';
            return (
              <a key={p.sno} className={`pcard st-${slug(p.status)}`} href="#projects" title={`${p.name} — ${p.status}`}>
                <div className="pc-top">
                  <span className="pc-av" aria-hidden="true">{sym(p.name)}</span>
                  <div className="pc-id">
                    <span className="pc-name">{p.name}</span>
                    <span className="pc-sub">#{p.sno}{p.sub ? ` · ${p.sub}` : ''}</span>
                  </div>
                  <span className="pc-pill">{label}</span>
                </div>

                <div className="pc-metrics">
                  <div className="pc-m" title="How much of the planned build window has passed">
                    <div className="pc-mh"><span>Build time</span><b>{elapsed !== null ? elapsed + '%' : '—'}</b></div>
                    <div className="pc-bar"><i style={{ width: (elapsed || 0) + '%' }} /></div>
                  </div>
                  <div className="pc-m" title="Delivery checklist progress">
                    <div className="pc-mh"><span>Checklist</span><b>{clPct !== null ? clPct + '%' : '—'}</b></div>
                    <div className="pc-bar alt"><i style={{ width: (clPct || 0) + '%' }} /></div>
                  </div>
                </div>

                <div className="pc-meta">
                  <span className="pc-people" title={people.join(', ') || 'No one assigned'}>
                    {people.slice(0, 2).map(n => <i key={n}>{n[0].toUpperCase()}</i>)}
                    {people.length > 0 && <em className="pn">{people[0].split(' ')[0]}{people.length > 1 ? ` +${people.length - 1}` : ''}</em>}
                    {!people.length && <em>No one assigned</em>}
                  </span>
                  <span className={`pc-uat${overdue ? ' late' : ''}`}>
                    {p.status === 'Completed' ? 'Completed' : rel}
                    {u && <b>{fmt(u)}</b>}
                  </span>
                </div>
                {p.blocker && <div className="pc-blk" title={p.blocker}>⚠ {p.blocker}</div>}
              </a>
            );
          })}
        </div>
      </section>


      <div className="grid2">
        {/* UAT windows */}
        <section className="card">
          <div className="ch">
            <h2>UAT windows</h2>
            <a href="#projects" className="lnk">All projects</a>
          </div>
          {upcoming.length ? (
            <ol className="tl">
              {upcoming.map(p => {
                const s = p.rUatStart||p.pUatStart, e = p.rUatSign||p.pUatSign;
                const ds = days(t, parse(s)), de = days(t, parse(e));
                const when = ds > 0 ? `starts in ${ds} d`
                  : de >= 0 ? (de ? `in UAT, sign-off in ${de} d` : 'in UAT, sign-off due today')
                  : `sign-off was ${-de} d ago`;
                return (
                  <li key={p.sno}>
                    <span className={`dot st-${slug(p.status)}`}></span>
                    <div>
                      <b>{p.name}</b><span className="muted"> · {fmt(s)} → {fmt(e)}</span>
                      <div className="small">
                        {when}{uatDelay(p) > 0 ? ` · UAT slipped ${uatDelay(p)} d` : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="muted">No UAT windows in the next 60 days.</p>
          )}
        </section>

        {/* This week */}
        <section className="card">
          <div className="ch"><h2>This week</h2></div>
          <div className="stats">
            <div><b>{ln ? pct(lsum/ln) : '—'}</b><span>Lattice compliance</span></div>
            <div><b>{tn ? pct(tsum/tn) : '—'}</b><span>Timesheet compliance</span></div>
            <div><b>{idone}/{imp.length}</b><span>hub improvements done, {iprog} in progress</span></div>
          </div>
          {away.length ? (
            <div>
              <div className="away-header">Away today</div>
              <div className="away-list">
                {away.map(m => (
                  <div key={m.name} className="away-card">
                    <span className="away-avatar">{m.name[0].toUpperCase()}</span>
                    <div className="away-info">
                      <div className="away-name">{m.name}</div>
                      <div className="away-type">{leave[m.name][tk]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✓</span>
              <p className="empty-text">Nobody is marked on leave today</p>
            </div>
          )}
        </section>

        {/* Checklist gate */}
        <section className="card">
          <div className="ch">
            <h2>Delivery checklist</h2>
            <a href="#checklist" className="lnk">Open checklist</a>
          </div>
          <div className="stats">
            <div><b>{ready}</b><span>of {names.length} cleared the kick-off gate</span></div>
            <div><b>{blocked}</b><span>checklist items blocked</span></div>
            <div><b>{warn}</b><span>infra-cost timing warnings</span></div>
          </div>
          <div className="bars">
            {sums.slice().sort((a,b) => b[1].overall - a[1].overall).slice(0,6).map(([n,s]) => (
              <div key={n} className="bar">
                <span>{n}</span>
                <div className="track"><i style={{width: Math.round(s.overall*100)+'%'}}></i></div>
                <em>{pct(s.overall)}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
