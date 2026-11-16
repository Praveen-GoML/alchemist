import React, { useState, useMemo, Fragment } from 'react';
import { Mail, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertTriangle, ShieldCheck, ListChecks, Calendar, Rocket, Activity, CheckSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Simple GitHub icon component
const GitHubIcon = ({ size = 16, color = "#000" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);
import { PHASES, CSTAT, COMBO, slug, pct, clSummary } from '../../utils/helpers';

const PHASE_ICONS = {
  1: ListChecks,
  2: ShieldCheck,
  3: Rocket,
  4: Activity,
  5: CheckSquare,
};

export default function Checklist({ data, updateData, ui, setUi }) {
  const { canManageChecklist, isManagementUser, isOwnMember, user } = useAuth();
  const canEdit = canManageChecklist();
  const { checklist={}, clProjects=[], clMeta={}, items=[], members=[] } = data;
  const { clProject, clView='project' } = ui;
  const set = patch => setUi(prev => ({...prev,...patch}));
  const [collapsedPhases, setCollapsedPhases] = useState({});

  const togglePhase = phaseKey => {
    setCollapsedPhases(prev => ({
      ...prev,
      [phaseKey]: !prev[phaseKey]
    }));
  };

  // Filter clProjects for members — only show their assigned projects
  const visibleProjects = useMemo(() => {
    if (!user || isManagementUser) return clProjects; // PM/TL see all
    const myMember = (members || []).find(m => isOwnMember(m.name, m.email));
    if (!myMember) return [];
    const myProjects = (myMember.projects || []).map(p => p.replace(/\s+/g, '').toLowerCase());
    return clProjects.filter(n => myProjects.includes(n.replace(/\s+/g, '').toLowerCase()));
  }, [user, isManagementUser, members, clProjects, isOwnMember]);

  // Default active project
  const names = visibleProjects;
  const active = (clProject && names.includes(clProject)) ? clProject : names[0];

  const setItem = (name, n, val) => {
    if (!canEdit) return;
    updateData(prev => {
      const ck = {...prev.checklist, [name]: {...(prev.checklist[name]||{})}};
      if (val) ck[name][n] = val; else delete ck[name][n];
      return {...prev, checklist: ck};
    });
  };

  const setMeta = (name, key, val) => {
    if (!canEdit) return;
    updateData(prev => ({
      ...prev,
      clMeta: {...prev.clMeta, [name]: {...(prev.clMeta[name]||{}), [key]: val}}
    }));
  };

  const addProject = () => {
    if (!canEdit) return;
    const n = prompt('Project name for the checklist');
    if (n && n.trim() && !clProjects.includes(n.trim())) {
      updateData(prev => ({...prev, clProjects: [...prev.clProjects, n.trim()]}));
      set({clProject: n.trim()});
    }
  };

  const toolbar = (
    <div className="toolbar">
      <div className="seg">
        {[['project','One project'],['hub','All projects']].map(([v,l]) => (
          <button key={v} className={clView===v?'on':''} onClick={() => set({clView:v})}>{l}</button>
        ))}
      </div>
    </div>
  );

  const sub = '46 steps from pre-sales to retro. Gate items must be Done or N/A before the kick-off invite goes out.';

  // ── HUB view: all projects × all items
  if (clView === 'hub') {
    const colors = {'Done':'c-done','In progress':'c-in-progress','Blocked':'c-blocked','N/A':'c-n-a'};
    
    // Group items by phase for separate card sections
    const hubByPhase = {};
    items.forEach(it => {
      (hubByPhase[it.phase] = hubByPhase[it.phase] || []).push(it);
    });

    return (
      <div>
        <p className="hint">{sub}</p>
        {toolbar}
        <div className="legend pad" style={{ marginBottom: '16px' }}>
          {[['c-done','Done'],['c-in-progress','In progress'],['c-blocked','Blocked'],['c-n-a','N/A']].map(([c,l]) => (
            <span key={c}><i className={`cdot ${c}`}></i>{l}</span>
          ))}
          <span><i className="cdot"></i>Not started</span>
        </div>

        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            background: 'var(--surface)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="scroll">
            <table className="tbl mx" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#FAFAFA' }}>
                  <th className="sticky" style={{ background: '#FAFAFA', fontWeight: 700, letterSpacing: '0.04em', padding: '14px 20px', zIndex: 3 }}>
                    CHECKLIST ITEM
                  </th>
                  {names.map(n => (
                    <th key={n} className="vert" style={{ background: '#FAFAFA', verticalAlign: 'bottom', textAlign: 'center' }}>
                      <button onClick={() => set({ clProject: n, clView: 'project' })} title={`Open ${n}`}>
                        {n}
                      </button>
                    </th>
                  ))}
                  <th className="r" style={{ background: '#FAFAFA', fontWeight: 700, letterSpacing: '0.04em', padding: '14px 20px' }}>
                    DONE
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hubByPhase).map(([phase, phItems], idx, arr) => {
                  const phaseKey = `hub-${phase}`;
                  const isCollapsed = !!collapsedPhases[phaseKey];
                  const PhaseIcon = PHASE_ICONS[phase] || ListChecks;
                  const totalCols = names.length + 2;

                  // Calculate overall done count across projects for this phase
                  let totalDoneAcross = 0;
                  const totalPossible = phItems.length * (names.length || 1);
                  phItems.forEach(it => {
                    names.forEach(n => {
                      if (((checklist[n] || {})[it.n] || '') === 'Done') totalDoneAcross++;
                    });
                  });
                  const donePercent = totalPossible > 0 ? Math.round((totalDoneAcross / totalPossible) * 100) : 0;

                  return (
                    <React.Fragment key={phase}>
                      {/* Phase Dropdown Accordion Row */}
                      <tr
                        style={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                          borderBottom: isCollapsed ? '1px solid var(--line)' : '1px solid var(--line)',
                          background: isCollapsed ? 'var(--surface)' : 'linear-gradient(180deg, #FFF9F5 0%, var(--surface) 100%)',
                          transition: 'background 0.15s ease',
                        }}
                        onClick={() => togglePhase(phaseKey)}
                        onMouseEnter={(e) => {
                          if (isCollapsed) e.currentTarget.style.background = 'var(--soft)';
                        }}
                        onMouseLeave={(e) => {
                          if (isCollapsed) e.currentTarget.style.background = 'var(--surface)';
                        }}
                      >
                        <td
                          colSpan={totalCols}
                          style={{
                            padding: '12px 20px',
                            background: 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                                  {phase}. {PHASES[phase - 1]}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: 'var(--soft)',
                                  border: '1px solid var(--line)',
                                  color: 'var(--muted)',
                                  fontWeight: 600,
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                  {phItems.length} items
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Across {names.length} projects: <strong style={{ color: donePercent > 70 ? '#15803D' : 'var(--ink)' }}>{totalDoneAcross}/{totalPossible} done</strong></span>
                                <span style={{ color: 'var(--line)' }}>•</span>
                                <span style={{ fontWeight: 600, color: donePercent === 100 ? '#15803D' : 'var(--accent-text)' }}>{donePercent}%</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '100px',
                                height: '6px',
                                borderRadius: '999px',
                                background: 'var(--line)',
                                overflow: 'hidden',
                                display: 'flex',
                              }}>
                                <div style={{
                                  width: `${donePercent}%`,
                                  background: donePercent === 100 ? '#22C55E' : 'var(--accent)',
                                  borderRadius: '999px',
                                  transition: 'width 0.3s ease',
                                }} />
                              </div>

                              <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                background: 'var(--soft)',
                                border: '1px solid var(--line)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--ink)',
                                transition: 'all 0.2s ease',
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                              }}>
                                <ChevronDown size={15} strokeWidth={2.4} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Items rows when not collapsed - shares the exact table columns */}
                      {!isCollapsed && phItems.map(it => {
                        let dn = 0;
                        return (
                          <tr key={it.n}>
                            <td className="sticky" style={{ paddingLeft: '20px' }}>
                              <span className="muted" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', marginRight: '8px', minWidth: '18px', display: 'inline-block' }}>{it.n}</span>
                              <span>{it.text}</span>
                              {it.gate && <span className="gate" style={{ marginLeft: '6px' }}>gate</span>}
                            </td>
                            {names.map(n => {
                              const s = (checklist[n] || {})[it.n] || '';
                              if (s === 'Done') dn++;
                              return (
                                <td key={n} className="cc">
                                  <i className={`cdot ${colors[s] || ''}`} title={`${n}: ${s || 'Not started'}`}></i>
                                </td>
                              );
                            })}
                            <td className="r muted" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', paddingRight: '20px' }}>
                              {dn}/{names.length}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── PROJECT view
  if (!active) return <div className="empty">No projects in the checklist yet. <button className="lnkbtn" onClick={addProject}>Add project</button></div>;

  const s = clSummary(active, checklist, items);
  const st = checklist[active] || {};
  const meta = clMeta[active] || {};

  // Group items by phase
  const byPhase = {};
  items.forEach(it => { (byPhase[it.phase]=byPhase[it.phase]||[]).push(it); });

  return (
    <div>
      <p className="hint">{sub}</p>
      {toolbar}

      {/* Project tabs */}
      <div className="chips" role="tablist">
        {names.map(n => {
          const ns = clSummary(n, checklist, items);
          const projectMeta = clMeta[n] || {};
          
          return (
            <button key={n} role="tab" aria-selected={n===active}
              className={`chip${n===active?' on':''}`}
              onClick={() => set({clProject:n})}
              style={{
                minWidth: '160px',
                maxWidth: '200px'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <b>{n}</b>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                  {projectMeta.email && (
                    <a 
                      href={`mailto:${projectMeta.email}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: n===active ? '#FEF3C7' : '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FCD34D';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = n===active ? '#FEF3C7' : '#F3F4F6';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title={`Email: ${projectMeta.email}`}
                    >
                      <Mail size={13} color="#6B7280" />
                    </a>
                  )}
                  {projectMeta.github && (
                    <a 
                      href={projectMeta.github.startsWith('http') ? projectMeta.github : `https://github.com/${projectMeta.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: n===active ? '#DBEAFE' : '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#93C5FD';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = n===active ? '#DBEAFE' : '#F3F4F6';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title={`GitHub: ${projectMeta.github}`}
                    >
                      <GitHubIcon size={13} color="#6B7280" />
                    </a>
                  )}
                </div>
              </div>
              <span>{ns.stage} · {pct(ns.overall)}</span>
            </button>
          );
        })}
        {canEdit && <button className="chip add" onClick={addProject}>+ Add project</button>}
      </div>

      {/* Summary card */}
      <section className="card">
        <div className="ch">
          <h2>{active}</h2>
          <span className={`pill ${s.gate?'st-delayed':'st-on-schedule'}`}>
            {s.gate ? `Kick-off gate: not ready (${s.gate} open)` : 'Kick-off gate: ready'}
          </span>
        </div>
        <div className="fgrid four">
          <label><span>Client</span><input value={meta.client||''} onChange={e=>setMeta(active,'client',e.target.value)} disabled={!canEdit} style={!canEdit?{background:'#F9FAFB',cursor:'default'}:{}} /></label>
          <label><span>ML combo</span>
            <select value={meta.combo||''} onChange={e=>setMeta(active,'combo',e.target.value)} disabled={!canEdit} style={!canEdit?{background:'#F9FAFB',cursor:'default'}:{}}>
              <option value="">—</option>
              {Object.keys(COMBO).map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label><span>Kick-off date</span><input type="date" value={meta.kickoff||''} onChange={e=>setMeta(active,'kickoff',e.target.value)} disabled={!canEdit} style={!canEdit?{background:'#F9FAFB',cursor:'default'}:{}} /></label>
          <label><span>UAT date</span><input type="date" value={meta.uat||''} onChange={e=>setMeta(active,'uat',e.target.value)} disabled={!canEdit} style={!canEdit?{background:'#F9FAFB',cursor:'default'}:{}} /></label>
        </div>
        <div className="fgrid four" style={{ marginTop: '12px' }}>
          <label><span>Contact Email</span><input type="email" placeholder="email@example.com" value={meta.email||''} onChange={e=>setMeta(active,'email',e.target.value)} disabled={!canEdit} style={!canEdit?{background:'#F9FAFB',cursor:'default'}:{}} /></label>
          <label><span>GitHub Repo/User</span><input placeholder="username or repo url" value={meta.github||''} onChange={e=>setMeta(active,'github',e.target.value)} disabled={!canEdit} style={!canEdit?{background:'#F9FAFB',cursor:'default'}:{}} /></label>
        </div>
        <div className="phases">
          {PHASES.map((ph,i) => (
            <div key={ph} className="phase">
              <span>{ph}</span>
              <div className="track"><i style={{width:Math.round(s.pp[i]*100)+'%'}}></i></div>
              <em>{pct(s.pp[i])}</em>
            </div>
          ))}
        </div>
        <p className="small">
          Current stage <b>{s.stage}</b> · overall <b>{pct(s.overall)}</b> · blocked <b>{s.blocked}</b>
          {s.warn && <span className="neg"> · Infra cost started before kick-off was held</span>}
        </p>
      </section>

      {/* Item sections */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          background: 'var(--surface)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: '20px',
        }}
      >
        {Object.entries(byPhase).map(([phase, phItems], idx, arr) => {
          const phaseKey = `single-${phase}`;
          const isCollapsed = !!collapsedPhases[phaseKey];
          const PhaseIcon = PHASE_ICONS[phase] || ListChecks;
          const doneCount = phItems.filter(it => (st[it.n] || '') === 'Done').length;
          const isLast = idx === arr.length - 1;

          const donePercent = phItems.length > 0 ? Math.round((doneCount / phItems.length) * 100) : 0;

          return (
            <div
              key={phase}
              style={{
                borderBottom: isLast && isCollapsed ? 'none' : '1px solid var(--line)',
                transition: 'background 0.15s ease',
              }}
            >
            <div
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: isCollapsed ? 'var(--surface)' : 'linear-gradient(180deg, #FFF9F5 0%, var(--surface) 100%)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                transition: 'background 0.2s ease',
              }}
              onClick={() => togglePhase(phaseKey)}
              onMouseEnter={(e) => {
                if (isCollapsed) e.currentTarget.style.background = 'var(--soft)';
              }}
              onMouseLeave={(e) => {
                if (isCollapsed) e.currentTarget.style.background = 'var(--surface)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                      {phase}. {PHASES[phase - 1]}
                    </h2>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: doneCount === phItems.length ? '#DCFCE7' : 'var(--soft)',
                      color: doneCount === phItems.length ? '#15803D' : 'var(--muted)',
                      border: '1px solid var(--line)',
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {doneCount}/{phItems.length} Done
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Progress: <strong style={{ color: donePercent > 70 ? '#15803D' : 'var(--ink)' }}>{doneCount} of {phItems.length} tasks completed</strong></span>
                    <span style={{ color: 'var(--line)' }}>•</span>
                    <span style={{ fontWeight: 600, color: donePercent === 100 ? '#15803D' : 'var(--accent-text)' }}>{donePercent}%</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '100px',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'var(--line)',
                  overflow: 'hidden',
                  display: 'flex',
                }}>
                  <div style={{
                    width: `${donePercent}%`,
                    background: donePercent === 100 ? '#22C55E' : 'var(--accent)',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--soft)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink)',
                  transition: 'all 0.2s ease',
                  transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                }}>
                  <ChevronDown size={16} strokeWidth={2.4} />
                </div>
              </div>
            </div>

            {!isCollapsed && (
              <ul className="items">
                {phItems.map(it => {
                  const v = st[it.n] || '';
                  return (
                    <li key={it.n} className={v === 'Done' ? 'done' : ''}>
                      <div className="it">
                        <span className="muted" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', minWidth: '20px' }}>{it.n}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {it.text}
                            {it.gate && <span className="gate" style={{ marginLeft: '8px' }}>gate</span>}
                          </div>
                          <div className="small muted">Owner {it.owner} · verified by {it.verifier}</div>
                        </div>
                      </div>
                      <div className="sset" role="radiogroup" aria-label={`Status for item ${it.n}`}>
                        {CSTAT.map(c => (
                          <button key={c || 'blank'} role="radio" aria-checked={c === v}
                            disabled={!canEdit}
                            style={!canEdit ? { cursor: 'default', opacity: c === v ? 1 : 0.4 } : {}}
                            className={`sb c-${slug(c || 'none')}${c === v ? ' on' : ''}`}
                            onClick={() => setItem(active, it.n, c)}>
                            {c || 'Not started'}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

