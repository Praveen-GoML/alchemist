import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';
import { PSTAT, slug, d2, pct, parse, today, iso, days, projDelay, uatDelay, projProgress, projTeam, norm, exportCSV } from '../../utils/helpers';

import { dialog } from '../../utils/dialog';
import Dropdown from '../common/Dropdown';
import { notifyAssignment } from '../../services/notifications';
const SORT_OPTS = [
  ['sno','ID'],['name','Project name'],['status','Status'],
  ['start','Start date'],['end','End date'],['rUatSign','UAT sign-off'],
  ['delay','Delay'],['progress','Progress']
];

function Pill({ status, cls }) {
  return <span className={`pill ${cls}-${slug(status||'none')}`}>{status||'Not started'}</span>;
}

function Avatar({ name }) {
  return <span className="ava" title={name}>{(name||'?')[0].toUpperCase()}</span>;
}

function AvatarStack({ names, max = 3, members = [] }) {
  const [open, setOpen] = useState(false);
  const [popPos, setPopPos] = useState(null);
  const hasMore = names.length > max;

  const getMember = name =>
    members.find(m => m.name === name) || { name, role: '' };

  return (
    <span className="avs-wrap">
      <span className="avs">
        {names.slice(0, max).map(n => <Avatar key={n} name={n} />)}

        {hasMore && (
          <button
            type="button"
            className="ava more ava-more-btn"
            title="Show all team members"
            onClick={e => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const width = Math.min(460, window.innerWidth - 48);
              const margin = 16;
              const left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin);
              const spaceBelow = window.innerHeight - rect.bottom;
              // Open below the badge; flip above only if there isn't enough room.
              setPopPos(spaceBelow >= 320 || spaceBelow >= rect.top
                ? { top: rect.bottom + 10, left, maxHeight: Math.max(200, spaceBelow - 24), overflowY: 'auto' }
                : { bottom: window.innerHeight - rect.top + 10, left, maxHeight: Math.max(200, rect.top - 24), overflowY: 'auto' });
              setOpen(true);
            }}
            aria-haspopup="true"
            aria-expanded={open}
          >
            +{names.length - max}
          </button>
        )}
      </span>

      {open && (
        <>
          <div
            className="ava-pop-scrim"
            onClick={e => { e.stopPropagation(); setOpen(false); }}
          />
          <div className="ava-pop" role="dialog" aria-label="Team members" style={popPos || undefined}>
            <div className="ava-pop-head">Team — {names.length} members</div>
            <div className="ava-pop-body" data-count={names.length}>
              {names.map(n => {
                const m = getMember(n);
                return (
                  <div key={n} className="ava-pop-row">
                    <Avatar name={n} />
                    <div>
                      <div className="ava-pop-name">{n}</div>
                      {m.role && <div className="ava-pop-role">{m.role}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </span>
  );
}

export default function Projects({ data, updateData, ui, setUi }) {
  const { canEditProjects, isManagementUser, isOwnMember, user } = useAuth();
  const canEdit = canEditProjects();
  const { projects=[], members=[], checklist={}, clProjects=[], items=[], matrixProjects=[] } = data;
  const [dlgProj, setDlgProj] = useState(null); // null=closed, {}=new, proj=edit

  const { psort={k:'sno',dir:-1}, pf=[], pq='', powner='', projView='list', pop=null } = ui;
  const set = patch => setUi(prev => ({...prev, ...patch}));

  // Compute member's assigned projects (null = see all, [] = see none)
  const userAssignedProjectNames = useMemo(() => {
    if (!user || isManagementUser) return null; // PM/TL/admin see everything
    const myMember = (members || []).find(m => isOwnMember(m.name, m.email));
    // Normalize: strip spaces and lowercase for fuzzy matching (e.g. "MovilVentas" == "Movil Ventas")
    return myMember
      ? (myMember.projects || []).map(norm)
      : [];
  }, [user, isManagementUser, members, isOwnMember]);

  // Owners list
  const owners = [];
  projects.forEach(p => String(p.team).split(/,\s*/).forEach(o => { if(o && !owners.includes(o)) owners.push(o); }));

  // Filter - members only see their assigned projects
  let P = projects.filter(p => {
    if (userAssignedProjectNames !== null) {
      const normName = norm(p.name || '');
      if (!userAssignedProjectNames.includes(normName)) return false;
    }
    const q = pq.toLowerCase();
    return (!q || (p.name+' '+p.team+' '+p.update+' '+p.blocker+' '+p.sub).toLowerCase().includes(q))
      && (!pf.length || pf.includes(p.status))
      && (!powner || String(p.team).split(/,\s*/).includes(powner));
  });

  // Sort
  const { k, dir } = psort;
  P = [...P].sort((a, b) => {
    const x = k==='progress' ? projProgress(a,checklist,clProjects,items) : k==='delay' ? projDelay(a) : a[k];
    const y = k==='progress' ? projProgress(b,checklist,clProjects,items) : k==='delay' ? projDelay(b) : b[k];
    if (x===y) return 0;
    if (x===''||x==null) return 1;
    if (y===''||y==null) return -1;
    return (x < y ? -1 : 1) * dir;
  });

  const t = today();

  // Sort header cell
  const SH = ({ k: key, label }) => {
    const on = psort.k === key;
    return (
      <th className="srt" onClick={() => set({psort: psort.k===key ? {k:key,dir:-psort.dir} : {k:key,dir:1}, pop:null})}
          aria-sort={on ? (psort.dir>0?'ascending':'descending') : 'none'}>
        {label} <span className={`sa${on?' on':''}`}>{on ? (psort.dir>0?'↑':'↓') : '⇅'}</span>
      </th>
    );
  };

  const openEdit = sno => {
    if (!canEdit) return;
    const p = projects.find(x => x.sno === sno);
    setDlgProj(p ? {...p} : null);
  };

  const saveProj = (form) => {
    const o = form._data ? {...form._data} : {};
    const selectedTeam = Array.isArray(form._teamMembers) ? form._teamMembers : null;
    o.sno = +o.sno;
    if (!o.name) return;
    // notify people added to / removed from this project
    if (selectedTeam) {
      const i0 = projects.findIndex(x => x.sno === (dlgProj.sno || 0));
      const prevName = i0 >= 0 ? projects[i0].name : o.name;
      const was = (members || []).filter(m => (m.projects || []).some(p => norm(p) === norm(prevName) || norm(p) === norm(o.name))).map(m => m.name);
      const added = (members || []).filter(m => selectedTeam.includes(m.name) && !was.includes(m.name) && !isOwnMember(m.name, m.email));
      const dropped = (members || []).filter(m => was.includes(m.name) && !selectedTeam.includes(m.name) && !isOwnMember(m.name, m.email));
      notifyAssignment({ actor: user?.name, project: o.name, people: added });
      notifyAssignment({ actor: user?.name, project: o.name, people: dropped, removed: true });
    }

    updateData(prev => {
      const projs = [...prev.projects];
      const idx = projs.findIndex(x => x.sno === (dlgProj.sno||0));
      const oldName = idx >= 0 ? projs[idx].name : o.name;
      let clP = [...prev.clProjects];
      let clCk = {...prev.checklist};
      let clM  = {...prev.clMeta};
      let teamMembers = prev.members || [];
      if (idx >= 0) {
        const old = projs[idx].name;
        projs[idx] = o;
        if (old !== o.name) {
          const ci = clP.indexOf(old);
          if (ci >= 0) clP[ci] = o.name;
          if (clCk[old]) { clCk[o.name]=clCk[old]; delete clCk[old]; }
          if (clM[old])  { clM[o.name]=clM[old];  delete clM[old];  }
        }
      } else {
        projs.push(o);
        if (!clP.includes(o.name)) clP.push(o.name);
      }
      if (selectedTeam) {
        teamMembers = teamMembers.map(m => {
          const projects = (m.projects || []).filter(p => norm(p) !== norm(oldName) && norm(p) !== norm(o.name));
          if (selectedTeam.includes(m.name)) projects.push(o.name);
          return {...m, projects};
        });
      }
      return {...prev, projects:projs, members:teamMembers, clProjects:clP, checklist:clCk, clMeta:clM};
    });
    setDlgProj(null);
  };

  const deleteProj = async () => {
    if (!(await dialog.confirm(`${dlgProj.name} and its checklist entry will be removed.`, { title: 'Delete project?', variant: 'danger', confirmLabel: 'Delete' }))) return;
    updateData(prev => ({
      ...prev,
      projects: prev.projects.filter(x => x.sno !== dlgProj.sno),
      clProjects: prev.clProjects.filter(n => n !== dlgProj.name)
    }));
    setDlgProj(null);
  };

  const nextSno = () => Math.max(...projects.map(x => x.sno), 0) + 1;

  const emptyProj = () => ({sno:nextSno(),name:'',team:'',start:'',end:'',pUatStart:'',pUatSign:'',rUatStart:'',rUatSign:'',status:'Not Started',sub:'',update:'',blocker:''});

  // Gantt timeline
  const renderTimeline = () => {
    const ds = [];
    P.forEach(p => ['start', 'end', 'pUatStart', 'pUatSign', 'rUatStart', 'rUatSign'].forEach(f => { if (p[f]) ds.push(p[f]); }));
    ds.push(iso(t)); ds.sort();
    if (ds.length < 2) return <p className="muted">Not enough date data to show a timeline.</p>;
    const a = parse(ds[0]); a.setDate(1);
    const z = parse(ds[ds.length - 1]); z.setMonth(z.getMonth() + 1); z.setDate(1);
    const span = days(a, z) || 1;
    const pos = d => Math.max(0, Math.min(100, (days(a, d) / span) * 100));
    const posS = s => pos(parse(s));
    const todayX = pos(t);
    const months = [];
    for (let d = new Date(a); d < z; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
    const monthEdge = m => pos(new Date(m.getFullYear(), m.getMonth(), 1));
    const dur = (s, e) => { const n = days(parse(s), parse(e)); return n >= 14 ? `${Math.round(n / 7)} wk` : `${n} d`; };
    const long = s => parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // what each project needs next
    const info = p => {
      const done = p.status === 'Completed';
      const uSign = p.rUatSign || p.pUatSign;
      const endLate = p.end && !done && t > parse(p.end) ? days(parse(p.end), t) : 0;
      let next = 'No dates set yet', tone = 'muted';
      if (done) { next = 'Completed'; tone = 'ok'; }
      else if (uSign) {
        const d = days(t, parse(uSign));
        if (d > 0) { next = `UAT sign-off in ${d} d`; tone = d <= 14 ? 'warn' : 'muted'; }
        else if (d === 0) { next = 'UAT sign-off today'; tone = 'warn'; }
        else { next = `Sign-off ${-d} d overdue`; tone = 'late'; }
      } else if (p.end) {
        const d = days(t, parse(p.end));
        next = d >= 0 ? `Build ends in ${d} d` : `Build ${-d} d past end`;
        tone = d < 0 ? 'late' : 'muted';
      }
      const slip = uatDelay(p);
      if (slip > 0 && !done) next += ` · UAT slipped ${slip} d`;
      return { done, uSign, endLate, next, tone };
    };

    const rows = P.map(p => ({ p, ...info(p) }));
    const overdue = rows.filter(r => r.tone === 'late').length;
    const upcoming = rows.filter(r => !r.done && r.uSign && days(t, parse(r.uSign)) >= 0)
      .sort((x, y) => (x.uSign < y.uSign ? -1 : 1))[0];
    const count = st => P.filter(p => p.status === st).length;

    return (
      <div className="tbox">
        <div className="gx-sum">
          <div><b>{count('On Schedule')}</b><span>On schedule</span></div>
          <div><b>{count('Behind') + count('Delayed')}</b><span>Behind or delayed</span></div>
          <div className={overdue ? 'hot' : ''}><b>{overdue}</b><span>Past their dates</span></div>
          <div className="wide"><b>{upcoming ? upcoming.p.name : '—'}</b><span>{upcoming ? `Next sign-off · ${d2(upcoming.uSign)} (${days(t, parse(upcoming.uSign))} d)` : 'No upcoming sign-off'}</span></div>
        </div>

        <div className="gx">
          <div className="gx-head">
            <div className="gx-left">Project</div>
            <div className="gx-lane">
              <span className="gx-today-tag" style={{ left: todayX + '%' }}>Today</span>
              {months.map((m, i) => (
                <span key={+m} className={`gx-month${i % 2 ? ' alt' : ''}`} style={{ left: monthEdge(m) + '%', width: (pos(new Date(m.getFullYear(), m.getMonth() + 1, 1)) - monthEdge(m)) + '%' }}>
                  {m.toLocaleDateString('en-GB', { month: 'short' })}<small>{m.toLocaleDateString('en-GB', { year: '2-digit' })}</small>
                </span>
              ))}
            </div>
          </div>

          {rows.map(({ p, done, uSign, endLate, next, tone }) => {
            const hasBuild = p.start && p.end;
            const sX = hasBuild ? posS(p.start) : 0;
            const eX = hasBuild ? posS(p.end) : 0;
            const w = Math.max(eX - sX, 0.6);
            const total = hasBuild ? Math.max(days(parse(p.start), parse(p.end)), 1) : 1;
            const elapsed = hasBuild ? (done ? 1 : Math.max(0, Math.min(1, days(parse(p.start), t) / total))) : 0;
            const uStart = p.rUatStart || p.pUatStart;
            const slipped = p.rUatSign && p.pUatSign && p.rUatSign !== p.pUatSign;
            const uLeft = uStart ? posS(uStart) : 0;
            const uW = uStart && uSign ? Math.max(posS(uSign) - uLeft, 0.8) : 0;
            const noDates = !hasBuild && !uStart;
            return (
              <button key={p.sno} className={`gx-row st-${slug(p.status)}`} onClick={() => openEdit(p.sno)}>
                <div className="gx-left">
                  <b>{p.name}</b>
                  <span className="gx-sub"><i className="gx-dot" />{p.status}{p.team ? ` · ${p.team}` : ''}</span>
                  <span className={`gx-next ${tone}`}>{next}</span>
                </div>
                <div className="gx-lane">
                  {months.map(m => <i key={+m} className="gx-mline" style={{ left: monthEdge(m) + '%' }} />)}
                  <i className="gx-today" style={{ left: todayX + '%' }} />

                  {hasBuild && (
                    <i
                      className="gx-bar"
                      style={{ left: sX + '%', width: w + '%' }}
                      title={`${p.name} · build\n${long(p.start)} → ${long(p.end)} (${dur(p.start, p.end)})\n${done ? 'Completed' : `${Math.round(elapsed * 100)}% of the build window has passed`}`}
                    >
                      <i className="gx-fill" style={{ width: Math.round(elapsed * 100) + '%' }} />
                      <em>{dur(p.start, p.end)}</em>
                    </i>
                  )}
                  {endLate > 0 && (
                    <i className="gx-late" style={{ left: eX + '%', width: Math.max(todayX - eX, 0.6) + '%' }} title={`Past planned end\n${endLate} days after ${long(p.end)}`}>
                      <em>+{endLate}d</em>
                    </i>
                  )}

                  {uStart && uSign && (
                    <>
                      <i
                        className="gx-uat"
                        style={{ left: uLeft + '%', width: uW + '%' }}
                        title={`${slipped ? 'Revised UAT' : 'UAT window'}\n${long(uStart)} → ${long(uSign)}${slipped ? `\nSlipped ${uatDelay(p)} days from the plan` : ''}`}
                      />
                      <i className="gx-ms" style={{ left: posS(uSign) + '%' }} title={`UAT sign-off\n${long(uSign)}`} />
                    </>
                  )}

                  {noDates && <i className="gx-empty" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="gx-legend">
          <span><i className="k bar" />Build (solid = time passed)</span>
          <span><i className="k late" />Past planned end</span>
          <span><i className="k uat" />UAT window</span>
          <span><i className="k ms" />UAT sign-off</span>
          <span><i className="k today" />Today</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {!canEdit && (
        <div style={{
          marginBottom: '1rem',
          padding: '10px 16px',
          background: 'var(--soft)',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#4B5563'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>👁️</span>
            <span><strong>View-Only Portal:</strong> Projects can only be created or modified by Project Managers and Team Leads.</span>
          </div>
          <span style={{ fontSize: '11px', background: '#E5E7EB', color: '#374151', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Read Only
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        {/* View toggle */}
        <div className="seg2">
          {[['list','List'],['tile','Tile'],['timeline','Timeline']].map(([v,l]) => (
            <button key={v} className={`tb${projView===v?' on':''}`} onClick={() => set({projView:v})}>
              {v==='list'?<Icon name="list"/>:v==='tile'?<Icon name="tile"/>:<Icon name="cal"/>}
              <span>{l}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <span className="popwrap">
          <button className={`tb${pop==='sort'?' on':''}`} onClick={e=>{e.stopPropagation();set({pop:pop==='sort'?null:'sort'})}}>
            <Icon name="sort"/><span>Sort</span>
          </button>
          {pop==='sort' && (
            <div className="pop" role="menu">
              {SORT_OPTS.map(([key,label]) => {
                const on = psort.k === key;
                return (
                  <button key={key} className={`pi${on?' on':''}`}
                    onClick={() => set({psort: psort.k===key?{k:key,dir:-psort.dir}:{k:key,dir:1}, pop:null})}>
                    {label}{on && <em>{psort.dir>0?'Ascending':'Descending'}</em>}
                  </button>
                );
              })}
            </div>
          )}
        </span>

        {/* Filters */}
        <span className="popwrap">
          <button className={`tb${pop==='filter'||pf.length?' on':''}`} onClick={e=>{e.stopPropagation();set({pop:pop==='filter'?null:'filter'})}}>
            <Icon name="filter"/><span>Filters{pf.length?` · ${pf.length}`:''}</span>
          </button>
          {pop==='filter' && (
            <div className="pop" role="menu">
              <div className="plab">Status</div>
              {PSTAT.map(s => (
                <label key={s} className="pi chk">
                  <input type="checkbox" checked={pf.includes(s)}
                    onChange={e => set({pf: e.target.checked ? [...pf,s] : pf.filter(x=>x!==s)})} />
                  <Pill status={s} cls="st" />
                </label>
              ))}
              {pf.length ? <button className="pi clear" onClick={() => set({pf:[],pop:null})}>Clear filters</button> : null}
            </div>
          )}
        </span>

        {/* Owner filter */}
        <span className="popwrap">
          <button className={`tb${pop==='owner'||powner?' on':''}`} onClick={e=>{e.stopPropagation();set({pop:pop==='owner'?null:'owner'})}}>
            <Icon name="user"/><span>{powner||'Owner'}</span>
          </button>
          {pop==='owner' && (
            <div className="pop" role="menu">
              <button className={`pi${!powner?' on':''}`} onClick={() => set({powner:'',pop:null})}>Everyone</button>
              {owners.map(o => (
                <button key={o} className={`pi${powner===o?' on':''}`} onClick={() => set({powner:o,pop:null})}>
                  <Avatar name={o} />{o}
                </button>
              ))}
            </div>
          )}
        </span>

        {/* Search */}
        <label className="sbox">
          <Icon name="search" />
          <input type="search" placeholder="Search projects…" value={pq}
            onChange={e => set({pq:e.target.value})} aria-label="Search projects" />
        </label>

        <span style={{flex:1}}></span>

        {/* Export */}
        <button className="btn ghost" onClick={() => {
          exportCSV(
            [['ID','Project','Team','Status','Stage','Progress','Start','End','Delay','UAT start','UAT sign-off','Update','Blocker'],
             ...P.map(p => [`GA-${String('00'+p.sno).slice(-3)}`,p.name,p.team,p.status,p.sub||'',pct(projProgress(p,checklist,clProjects,items)),p.start,p.end,projDelay(p),p.rUatStart||p.pUatStart,p.rUatSign||p.pUatSign,p.update,p.blocker])],
            `Go_Alchemists_Projects_${iso(t)}.csv`
          );
        }}>
          <Icon name="download" /><span>Export</span>
        </button>

        {/* New project — only visible if PM or TL */}
        {canEdit && (
          <button className="btn" onClick={() => setDlgProj(emptyProj())}>
            <Icon name="plus" /><span>New Project</span>
          </button>
        )}
      </div>

      {/* Search clear */}
      {(pq||pf.length||powner) && !P.length && (
        <div className="empty">
          No projects match. <button className="lnkbtn" onClick={() => set({pq:'',pf:[],powner:''})}>Clear search and filters</button>
        </div>
      )}

      {/* Views */}
      {projView === 'timeline' ? renderTimeline() : projView === 'tile' ? (
        <div className="tiles">
          {P.map(p => {
            const pg = projProgress(p, checklist, clProjects, items);
            const team = projTeam(p, members);
            return (
              <button key={p.sno} className="ptile" onClick={() => openEdit(p.sno)}>
                <div className="tt">
                  <span className="idc">GA-{String('00'+p.sno).slice(-3)}</span>
                  <Pill status={p.status} cls="st" />
                </div>
                <h3>{p.name}</h3>
                <div className="small muted">{p.sub||''}</div>
                <div className="prow">
                  <div className="bar2"><i style={{width:Math.round(pg*100)+'%'}}></i></div>
                  <span>{pct(pg)}</span>
                </div>
                <div className="tdates">
                  <span><b>Start</b>{d2(p.start)}</span>
                  <span><b>UAT sign-off</b>{p.rUatSign?d2(p.rUatSign):'N/A'}</span>
                </div>
                {p.blocker && <div className="tblk">{p.blocker}</div>}
                <div className="tfoot">
                  <span className="own"><Avatar name={p.team} />{p.team}</span>
                  <AvatarStack names={team} max={3} members={members} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="tbox">
          <table className="tbl lat">
            <thead>
              <tr>
                {SH({ k: 'sno', label: 'ID' })}
                {SH({ k: 'name', label: 'Project Name' })}
                {SH({ k: 'status', label: 'Status' })}
                <th>Stage</th>
                {SH({ k: 'progress', label: 'Progress' })}
                {SH({ k: 'start', label: 'Start' })}
                {SH({ k: 'end', label: 'End' })}
                {SH({ k: 'rUatSign', label: 'UAT Sign-off' })}
                <th>Owner</th><th>Team</th><th>Blocker</th>
              </tr>
            </thead>
            <tbody>
              {P.map(p => {
                const pg = projProgress(p, checklist, clProjects, items);
                const dl = projDelay(p);
                const team = projTeam(p, members);
                const late = p.end && p.end < iso(t) && p.status !== 'Completed';
                return (
                  <tr key={p.sno} onClick={() => openEdit(p.sno)} style={{cursor: canEdit ? 'pointer' : 'default'}}>
                    <td className="c idc">GA-{String('00'+p.sno).slice(-3)}</td>
                    <td className="pname">{p.name}</td>
                    <td className="c"><Pill status={p.status} cls="st" /></td>
                    <td className="c">{p.sub ? <Pill status={p.sub} cls="sg" /> : '—'}</td>
                    <td>
                      <div className="prow">
                        <div className="bar2"><i style={{width:Math.round(pg*100)+'%'}}></i></div>
                        <span>{pct(pg)}</span>
                      </div>
                    </td>
                    <td className="c">{d2(p.start)}</td>
                    <td className={`c${late?' neg':''}`} title={dl?`${dl} days past planned end`:''}>
                      {d2(p.end)}{dl ? <div className="late">{dl} d late</div> : null}
                    </td>
                    <td className={`c${uatDelay(p)>0?' neg':''}`}>{p.rUatSign?d2(p.rUatSign):'N/A'}</td>
                    <td><span className="own"><Avatar name={p.team}/><span className="ot">{p.team}</span></span></td>
                    <td className="c">{team.length ? <AvatarStack names={team} max={3} members={members}/> : <span className="muted">—</span>}</td>
                    <td className="bk" title={p.blocker}>{p.blocker||<span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint">Progress comes from the delivery checklist. Delay counts days past the planned end date.</p>

      {/* Project dialog */}
      {dlgProj && (
        <ProjectDialog
          proj={dlgProj}
          members={members}
          canEdit={canEdit}
          isNew={!projects.find(x => x.sno === dlgProj.sno)}
          onSave={saveProj}
          onDelete={deleteProj}
          onClose={() => setDlgProj(null)}
        />
      )}
    </div>
  );
}

const STAGES = ['Prerequisites', 'Kick-off', 'Development', 'UAT', 'Production', 'Attention', 'On Hold', 'Completed'];
const LEAD_ROLES = ['lead', 'tl', 'pm', 'admin'];

// Dropdown that lets you pick one or several values (stored comma-separated, as the project table expects).
function MultiPick({ label, value, options, onChange, disabled, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = String(value || '').split(/,\s*/).filter(Boolean);
  const all = [...options];
  selected.forEach(v => { if (!all.some(o => o.value === v)) all.push({ value: v, label: v }); });

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = v => {
    const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
    onChange(next.join(', '));
  };

  return (
    <label ref={ref} style={{ position: 'relative' }} onClick={e => e.preventDefault()}>
      <span>{label}</span>
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between',
          padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)',
          font: 'inherit', cursor: disabled ? 'default' : 'pointer', minHeight: 44 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected.length ? 'var(--ink)' : 'var(--ns)' }}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>&#9662;</span>
      </button>
      {open && !disabled && (
        <div style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', marginTop: 4, maxHeight: 260, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-pop)', padding: 6 }}>
          {all.map(o => {
            const on = selected.includes(o.value);
            return (
              <button type="button" key={o.value} onClick={() => toggle(o.value)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: 0, borderRadius: 8,
                  background: on ? 'var(--accent-soft)' : 'transparent', color: 'var(--ink)', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent)' : 'transparent', color: '#fff', fontSize: 11, lineHeight: 1 }}>{on ? '\u2713' : ''}</span>
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.hint && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}

function ProjectDialog({ proj, members = [], canEdit = true, isNew, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({...proj});
  const [teamMembers, setTeamMembers] = useState(() => projTeam(proj, members));
  const set = k => e => setForm(f => ({...f, [k]:e.target.value}));
  const leadOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    [...members].sort((a, b) => (LEAD_ROLES.includes(String(b.role).toLowerCase()) ? 1 : 0) - (LEAD_ROLES.includes(String(a.role).toLowerCase()) ? 1 : 0))
      .forEach(m => {
        const first = String(m.name || '').split(' ')[0];
        if (!first || seen.has(first)) return;
        seen.add(first);
        list.push({ value: first, label: m.name, hint: m.role });
      });
    return list;
  }, [members]);
  const toggleMember = name => {
    if (!canEdit) return;
    setTeamMembers(list => list.includes(name) ? list.filter(n => n !== name) : [...list, name]);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!canEdit || !form.name) return;
    onSave({ elements: {}, _data: form, _teamMembers: teamMembers });
  };

  const F = ({ k, label, type='text' }) => (
    <label>
      <span>{label}</span>
      <input 
        name={k} 
        type={type} 
        value={form[k]||''} 
        onChange={set(k)} 
        disabled={!canEdit}
        style={!canEdit ? { background: 'var(--soft)', cursor: 'default' } : {}}
      />
    </label>
  );

  return (
    <div className="dlg-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <dialog open style={{display:'block'}}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{isNew ? 'Add project' : form.name}</h2>
          {!canEdit && (
            <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
              👁️ View Only Mode
            </span>
          )}
        </div>
        <div className="fgrid">
          {F({ k: 'name', label: 'Project' })}
          {F({ k: 'sno', label: 'S.No', type: 'number' })}
          <MultiPick label="Team / lead" value={form.team} disabled={!canEdit} placeholder="Select lead(s)"
            options={leadOptions} onChange={v => setForm(f => ({ ...f, team: v }))} />
          <div className="dd-field"><span>Status</span>
            <Dropdown
              value={form.status || 'Not Started'}
              onChange={v => setForm(f => ({ ...f, status: v }))}
              options={['On Schedule', 'Behind', 'Delayed', 'Not Started', 'Completed']}
              disabled={!canEdit}
            />
          </div>
          <div className="dd-field"><span>Stage</span>
            <Dropdown
              value={form.sub || ''}
              onChange={v => setForm(f => ({ ...f, sub: v }))}
              options={[{ value: '', label: 'Select stage' }, ...[...STAGES, ...(form.sub && !STAGES.includes(form.sub) ? [form.sub] : [])]]}
              disabled={!canEdit}
            />
          </div>
          {F({ k: 'start', label: 'Start date', type: 'date' })}
          {F({ k: 'end', label: 'Planned end', type: 'date' })}
          {F({ k: 'pUatStart', label: 'Planned UAT start', type: 'date' })}
          {F({ k: 'pUatSign', label: 'Planned UAT sign-off', type: 'date' })}
          {F({ k: 'rUatStart', label: 'Revised UAT start', type: 'date' })}
          {F({ k: 'rUatSign', label: 'Revised UAT sign-off', type: 'date' })}
        </div>
        <label className="full"><span>Latest update</span>
          <textarea 
            rows="2" 
            value={form.update||''} 
            onChange={set('update')}
            disabled={!canEdit}
            style={!canEdit ? { background: 'var(--soft)', cursor: 'default' } : {}}
          ></textarea>
        </label>
        <label className="full"><span>Blocker</span>
          <textarea 
            rows="2" 
            value={form.blocker||''} 
            onChange={set('blocker')}
            disabled={!canEdit}
            style={!canEdit ? { background: 'var(--soft)', cursor: 'default' } : {}}
          ></textarea>
        </label>
        <div className="full team-picker">
          <div className="team-picker-head">
            <span>Team members</span>
            <em>{teamMembers.length} selected</em>
          </div>
          <div className="team-picker-grid">
            {members.map(m => (
              <label key={m.name} className="member-check" style={!canEdit ? { cursor: 'default' } : {}}>
                <input
                  type="checkbox"
                  checked={teamMembers.includes(m.name)}
                  onChange={() => toggleMember(m.name)}
                  disabled={!canEdit}
                />
                <Avatar name={m.name} />
                <span>
                  <b>{m.name}</b>
                  {m.role && <small>{m.role}</small>}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="dacts">
          {canEdit ? (
            <>
              {!isNew && <button type="button" className="btn ghost danger" onClick={onDelete}>Delete project</button>}
              <span></span>
              <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="btn" onClick={() => {
                if (!form.name) return;
                const fakeForm = { _data: form };
                onSave({...fakeForm, _teamMembers: teamMembers});
              }}>{isNew ? 'Add project' : 'Save changes'}</button>
            </>
          ) : (
            <>
              <span></span>
              <button type="button" className="btn" onClick={onClose}>Close</button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
