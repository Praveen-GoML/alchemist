import { parse, today, days, fmt, pct, slug, sym, uatDelay, clSummary, hygMembers, hygPct, mondayOf, iso, PSTAT } from '../../utils/helpers';

export default function Overview({ data }) {
  const { projects=[], improvements=[], members=[], hygiene={}, leave={}, checklist={}, clProjects=[], items=[] } = data;
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
        <h2>Good to see you, Thasleema</h2>
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
        <div className="ptable">
          {projects.map(p => {
            const u = p.rUatSign||p.pUatSign;
            const label = {
              'On Schedule': 'On Track',
              'Behind': 'Behind',
              'Delayed': 'Delayed',
              'Not Started': 'Not Started',
              'Completed': 'Done'
            }[p.status] || p.status;
            return (
              <a key={p.sno} className={`el st-${slug(p.status)}`} href="#projects" title={`${p.name} — ${p.status}`}>
                <span className="num">{p.sno}</span>
                <span className="epill">{label}</span>
                <span className="sym">{sym(p.name)}</span>
                <span className="ename">{p.name}</span>
                <span className="emeta">{u ? 'UAT '+fmt(u) : 'Dates TBC'}</span>
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
