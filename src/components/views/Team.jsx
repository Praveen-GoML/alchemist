import { COMBO, norm } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { Zap, Wrench } from 'lucide-react';

export default function Team({ data, updateData, ui, setUi }) {
  const { canEditMembers, canEditTeamInvolvement, isOwnMember } = useAuth();
  const canEdit = canEditMembers();
  const { members=[], matrixProjects=[] } = data;
  const { teamView='people', teamFilter='' } = ui;
  const set = patch => setUi(prev => ({...prev,...patch}));

  const comboDesc = {
    Gold:'Mentor combo: the senior leads design while the intern covers data prep and evals.',
    Silver:'Complex or high-stakes ML where depth and review rigour matter most.',
    Mercury:'Two peers moving fast on builds and iterations; Sr. ML review from Gold or Silver.',
    Copper:'AI builds, POCs and experiments.'
  };

  // People view
  const renderPeople = () => {
    const q = teamFilter.toLowerCase();
    const filtered = members.filter(m =>
      !q || (m.name+' '+m.role+' '+m.skills+' '+m.combo).toLowerCase().includes(q)
    );

    return (
      <>
        <input className="search" type="search" placeholder="Search name, role or skill"
          value={teamFilter} onChange={e => set({teamFilter:e.target.value})}
          aria-label="Search team" />
        <div className="people">
          {filtered.map(m => {
            const active = m.projects.filter(p => {
              const mp = matrixProjects.find(x => x.name === p);
              return !mp || mp.status !== 'Closed';
            });
            const initials = m.name.split(' ').map(w=>w[0]).slice(0,2).join('');
            const isMe = isOwnMember(m.name, m.email);
            return (
              <article key={m.name} className="person" style={isMe ? { border: '1.5px solid #86EFAC', background: '#F8FAF8' } : {}}>
                <div className="ph">
                  {m.combo
                    ? <span className={`tile t-${m.combo.toLowerCase()}`} title={m.combo}>{COMBO[m.combo]}</span>
                    : <span className="tile t-none">{initials}</span>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>
                      <span>{m.name}</span>
                      {isMe && (
                        <span style={{ fontSize: '10.5px', background: '#DCFCE7', color: '#15803D', padding: '1.5px 7px', borderRadius: '10px', fontWeight: 700, border: '1px solid #BBF7D0' }}>
                          You
                        </span>
                      )}
                    </h3>
                    <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.role}</span>
                      {m.combo && (
                        <span style={{ fontSize: '11px', background: 'var(--soft)', padding: '1px 6px', borderRadius: '4px' }}>
                          {m.combo} combo
                        </span>
                      )}
                      {m.note && <span style={{ fontStyle: 'italic' }}>· {m.note}</span>}
                    </div>
                  </div>

                  {/* Mail & GitHub Action Icons in header */}
                  <div className="person-header-actions">
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        className="person-icon-btn"
                        title={`Send email to ${m.email}`}
                        aria-label={`Email ${m.name}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </a>
                    )}
                    {m.github && (
                      <a
                        href={`https://github.com/${m.github}`}
                        target="_blank"
                        rel="noopener"
                        className="person-icon-btn github"
                        title={`GitHub: @${m.github}`}
                        aria-label={`GitHub profile for ${m.name}`}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {m.skills && (
                  <div className="skills-badge-container">
                    {m.skills.split(/[,;]/).map((s, idx) => {
                      const trimmed = s.trim();
                      if (!trimmed) return null;
                      return (
                        <span key={idx} className="skill-pill">
                          {trimmed}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="person-projects-section">
                  <div className="person-projects-header">
                    <span>Active Projects</span>
                    <span style={{ fontWeight: 700, color: active.length ? 'var(--accent-text)' : 'var(--muted)' }}>
                      {active.length} {active.length === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  {active.length > 0 ? (
                    <div className="projects-badge-list">
                      {active.map((p, idx) => (
                        <span key={idx} className="project-tag">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>None assigned</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  };

  // Combos view
  const renderCombos = () => (
    <>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '8px'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: 'var(--accent-soft)',
          color: 'var(--accent-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Zap size={16} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
          <b>ML Pairing Philosophy:</b> Every ML project goes to a pair, never one person: faster delivery, built-in review, and no single point of failure.
        </span>
      </div>

      <div className="combos">
        {Object.entries(COMBO).map(([combo, symbol]) => {
          const ms = members.filter(m => m.combo === combo);
          return (
            <section key={combo} className={`combo t-${combo.toLowerCase()}`}>
              <div className="combo-head">
                <div className="csym"><span>{symbol}</span></div>
                <div className="combo-title-area">
                  <h2>{combo}</h2>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {ms.length} {ms.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>

              <p className="combo-desc">{comboDesc[combo]}</p>

              <ul className="combo-members-list">
                {ms.map(m => {
                  const isMe = isOwnMember(m.name, m.email);
                  return (
                    <li key={m.name} className="combo-member-item" style={isMe ? { border: '1px solid #86EFAC', background: '#F0FDF4' } : {}}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.name}</span>
                        {isMe && (
                          <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            You
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        {m.role}{m.note ? ` · ${m.note}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {canEdit && (
                <div className="combo-add-select">
                  <span>Add member to {combo}</span>
                  <select onChange={e => {
                    const mm = members.find(x => x.name === e.target.value);
                    if (mm) {
                      updateData(prev => ({
                        ...prev,
                        members: prev.members.map(x => x.name === mm.name ? { ...x, combo } : x)
                      }));
                      e.target.value = '';
                    }
                  }}>
                    <option value="">Choose member…</option>
                    {members.filter(m => /ML/i.test(m.role) && m.combo !== combo).map(m => (
                      <option key={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="specialist-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
          <span style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'var(--soft)',
            color: 'var(--accent-text)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wrench size={14} strokeWidth={2.2} />
          </span>
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 700 }}>Specialist Engineering Pool</h2>
        </div>
        <div className="specialist-grid">
          <div className="specialist-item">
            <div className="specialist-role-title">Python Backend</div>
            <div className="specialist-names">Saurav, Suren, Megh, Pranav, Praveen</div>
          </div>
          <div className="specialist-item">
            <div className="specialist-role-title">Frontend & Full-Stack</div>
            <div className="specialist-names">Syed, Abhishek, Praveen <span style={{ fontSize: '11px', color: 'var(--muted)' }}>(Syed reviews)</span></div>
          </div>
          <div className="specialist-item">
            <div className="specialist-role-title">Data Engineering</div>
            <div className="specialist-names">Mani Sekar</div>
          </div>
        </div>
      </section>
    </>
  );

  // Matrix view
  const renderMatrix = () => {
    const statusOptions = ['Proposal Review','Pre-requisite','Arch Development','Dev in progress','Hold','Closed'];

    const setProjectStatus = (idx, val) => {
      if (!canEdit) return;
      updateData(prev => {
        const mp = [...prev.matrixProjects];
        mp[idx] = {...mp[idx], status: val};
        return {...prev, matrixProjects: mp};
      });
    };

    const toggleInvolvement = (memberIdx, projectName, memberName, memberEmail) => {
      if (!canEditTeamInvolvement(memberName, memberEmail)) {
        alert(`You can only update your own project involvement. PMs and TLs can edit all team members.`);
        return;
      }
      updateData(prev => {
        const ms = [...prev.members];
        const m = {...ms[memberIdx]};
        const pi = m.projects.indexOf(projectName);
        m.projects = pi >= 0
          ? m.projects.filter(p => p !== projectName)
          : [...m.projects, projectName];
        ms[memberIdx] = m;
        return {...prev, members: ms};
      });
    };

    return (
      <>
        <p className="small muted">
          {canEdit
            ? 'Tap a cell to mark someone involved or not. Closed projects are excluded from active counts.'
            : 'You can tap your own row to update your project involvement. Other rows are view-only.'}
        </p>
        <div className="scroll">
          <table className="tbl mx tm">
            <thead>
              <tr>
                <th className="sticky">Team member</th>
                <th className="r">Active</th>
                {matrixProjects.map(p => (
                  <th key={p.name} className="vert"><span>{p.name}</span></th>
                ))}
              </tr>
              <tr>
                <th className="sticky">Status</th>
                <th></th>
                {matrixProjects.map((p,i) => (
                  <th key={p.name} className="c">
                    <select
                      className="mini"
                      value={p.status}
                      onChange={e => setProjectStatus(i, e.target.value)}
                      disabled={!canEdit}
                      style={!canEdit ? { opacity: 0.85, cursor: 'default' } : {}}
                      aria-label={`${p.name} status`}>
                      {statusOptions.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, mi) => {
                const active = m.projects.filter(p => {
                  const mp = matrixProjects.find(x => x.name === p);
                  return mp && mp.status !== 'Closed';
                }).length;
                const isMe = isOwnMember(m.name, m.email);
                const canEditRow = canEditTeamInvolvement(m.name, m.email);
                return (
                  <tr key={m.name} style={isMe ? { background: '#F0FDF4' } : {}}>
                    <td className="sticky">
                      <b>{m.name}</b>
                      {isMe && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>You</span>}
                      {' '}<span className="small muted">{m.role}</span>
                    </td>
                    <td className="r">{active}</td>
                    {matrixProjects.map(p => {
                      const on = m.projects.includes(p.name);
                      return (
                        <td key={p.name} className={`cc${p.status==='Closed'?' closed':''}`}>
                          <button
                            className={`inv${on?' on':''}`}
                            onClick={() => toggleInvolvement(mi, p.name, m.name, m.email)}
                            style={!canEditRow ? { cursor: 'not-allowed', opacity: on ? 0.9 : 0.3 } : {}}
                            title={canEditRow ? `Click to toggle ${m.name} on ${p.name}` : `Only PMs/TLs can edit other members`}
                            aria-pressed={on}
                            aria-label={`${m.name} on ${p.name}`}>
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
      </>
    );
  };

  return (
    <div>
      <p className="hint">{members.length} people across PM, lead, ML, backend, frontend and data.</p>
      <div className="toolbar">
        <div className="seg">
          {[['people','People'],['combos','ML combos'],['matrix','Project matrix']].map(([v,l]) => (
            <button key={v} className={teamView===v?'on':''} onClick={() => set({teamView:v})}>{l}</button>
          ))}
        </div>
      </div>
      {teamView==='people' && renderPeople()}
      {teamView==='combos' && renderCombos()}
      {teamView==='matrix' && renderMatrix()}
    </div>
  );
}
