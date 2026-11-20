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

  return (
    <div>
      <div className="greet">
        <h2>Good to see you, {(user?.name || '').split(' ')[0] || 'there'}</h2>
      </div>
      <p className="hint">
        Every Go Alchemists tracker in one place. Today is{' '}
        {t.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}.
      </p>

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
            return (
              <a key={p.sno} className={`pcard st-${slug(p.status)}`} href="#projects" title={`${p.name} — ${p.status}`}>
                <div className="pc-top">
                  <span className="pc-av" aria-hidden="true">{sym(p.name)}</span>
                  <span className="pc-pill">{label}</span>
                </div>
                <div className="pc-name">{p.name}</div>
                <div className="pc-sub">#{p.sno}{p.team ? ` · ${p.team}` : ''}{p.sub ? ` · ${p.sub}` : ''}</div>
                {elapsed !== null && (
                  <div className="pc-bar" role="progressbar" aria-valuenow={elapsed} aria-valuemin={0} aria-valuemax={100} aria-label="Timeline elapsed">
                    <i style={{ width: elapsed + '%' }} />
                  </div>
                )}
                <div className="pc-foot">
                  <span className={left !== null && left < 0 && p.status !== 'Completed' ? 'pc-late' : ''}>
                    {p.status === 'Completed' ? 'Completed' : rel}
                  </span>
                  {u && <span className="pc-date">{fmt(u)}</span>}
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

        {/* Blockers */}
        <section className="card">
          <div className="ch">
            <h2>Open blockers</h2>
            <span className="count">{bl.length}</span>
          </div>
          {bl.length ? (
            <ul className="blk">
              {bl.map(p => (
                <li key={p.sno}><b>{p.name}</b><span>{p.blocker}</span></li>
              ))}
            </ul>
          ) : (
            <p className="muted">No blockers logged.</p>
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
