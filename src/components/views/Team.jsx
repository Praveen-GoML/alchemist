import { useState } from 'react';
import { COMBO, norm } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { Zap, Pencil, Copy, Trash2, ChevronRight, X } from 'lucide-react';

import { dialog } from '../../utils/dialog';
import Dropdown from '../common/Dropdown';
import ContextMenu from '../common/ContextMenu';
import PersonEditModal from '../PersonEditModal';
import { notifyAssignment } from '../../services/notifications';
export default function Team({ data, updateData, ui, setUi }) {
  const { user, canEditMembers, canEditTeamInvolvement, isOwnMember } = useAuth();
  const canEdit = canEditMembers();
  const { members=[], matrixProjects=[] } = data;
  const { teamView='people', teamFilter='' } = ui;
  const set = patch => setUi(prev => ({...prev,...patch}));
  const [addOpen, setAddOpen] = useState(false);
  const [mxFilter, setMxFilter] = useState('');
  const [wlFilter, setWlFilter] = useState('');
  const [wlSort, setWlSort] = useState('load'); // 'load' | 'name'
  const [wlBand, setWlBand] = useState(null); // clicked a summary tile to filter: 'free' | 'light' | 'busy' | 'over' | null
  const [wlOpen, setWlOpen] = useState(() => new Set()); // names whose row is expanded
  const [hideClosed, setHideClosed] = useState(false);
  const [joinSel, setJoinSel] = useState('');
  const blankPerson = { name:'', role:'', email:'', github:'', skills:'', combo:'', projects:[] };
  const [np, setNp] = useState(blankPerson);
  const [npErr, setNpErr] = useState('');

  const ROLES = ['PM','Lead','ML','Sr. ML','Jr. ML','ML-Intern','BE','FE','FE + BE','DE','Intern'];

  const submitPerson = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const name = np.name.trim(), role = np.role.trim(), email = np.email.trim().toLowerCase();
    if (!name || !role) { setNpErr('Name and role are required.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setNpErr('Enter a valid email address.'); return; }
    if (members.some(m => m.name.trim().toLowerCase() === name.toLowerCase())) { setNpErr('Someone with this name already exists.'); return; }
    if (email && members.some(m => (m.email||'').toLowerCase() === email)) { setNpErr('This email is already on the team.'); return; }
    updateData(prev => ({
      ...prev,
      members: [...prev.members, { role, name, projects: np.projects, email, github: np.github.trim().replace(/^@/, ''), skills: np.skills.trim(), combo: np.combo, note: '' }],
    }));
    np.projects.forEach(pn => notifyAssignment({ actor: user?.name, project: pn, people: [{ email }] }));
    setNp(blankPerson); setNpErr(''); setAddOpen(false);
  };

  const closeAdd = () => { setAddOpen(false); setNpErr(''); setNp(blankPerson); };

  // Right-click menu on a person card, and the edit dialog it opens
  const [pctx, setPctx] = useState(null);       // { x, y, m }
  const [editing, setEditing] = useState(null); // { m, mode: 'self' | 'full' }

  const copyText = async (text) => { try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } };

  const savePerson = (orig, patch) => {
    updateData(prev => {
      const next = { ...prev, members: prev.members.map(x => (x.name === orig.name ? { ...x, ...patch } : x)) };
      // keep leave and hygiene history attached if the name changed
      if (patch.name && patch.name !== orig.name) {
        if (next.leave && next.leave[orig.name]) {
          next.leave = { ...next.leave, [patch.name]: next.leave[orig.name] };
          delete next.leave[orig.name];
        }
        if (next.hygiene) {
          const h = {};
          Object.entries(next.hygiene).forEach(([wk, people]) => {
            const copy = { ...people };
            if (copy[orig.name]) { copy[patch.name] = copy[orig.name]; delete copy[orig.name]; }
            h[wk] = copy;
          });
          next.hygiene = h;
        }
      }
      return next;
    });
    setEditing(null);
  };

  const personMenu = (m) => {
    const mine = isOwnMember(m.name, m.email);
    const items = [];
    if (mine) {
      items.push({ label: 'Edit my skills', icon: <Pencil size={15} />, onClick: () => setEditing({ m, mode: 'self' }) });
    }
    if (canEdit) {
      items.push({ label: 'Edit details…', icon: <Pencil size={15} />, onClick: () => setEditing({ m, mode: 'full' }) });
    }
    if (m.email) items.push({ label: 'Copy email', icon: <Copy size={15} />, onClick: () => copyText(m.email) });
    if (canEdit) {
      items.push({ label: m.inactive ? 'Mark as active' : 'Mark as inactive', icon: <Pencil size={15} />, onClick: () => savePerson(m, { inactive: !m.inactive }) });
    }
    if (canEdit && !mine) {
      items.push('sep');
      items.push({ label: 'Remove from team', icon: <Trash2 size={15} />, danger: true, onClick: () => removeMember(m) });
    }
    return items;
  };

  const comboDesc = {
    Gold:'Mentor combo: the senior leads design while the intern covers data prep and evals.',
    Silver:'Complex or high-stakes ML where depth and review rigour matter most.',
    Mercury:'Two peers moving fast on builds and iterations; Sr. ML review from Gold or Silver.',
    Copper:'AI builds, POCs and experiments.'
  };

  // People view
  const removeMember = async (m) => {
    if (!canEdit) return;
    if (!(await dialog.confirm(`${m.name} (${m.role}) will no longer appear in the Team, Leave or Hygiene views.`, { title: 'Remove from the team?', variant: 'danger', confirmLabel: 'Remove' }))) return;
    updateData(prev => ({
      ...prev,
      members: prev.members.filter(x => x.name !== m.name),
    }));
  };

  // Shared by the matrix, the workload tab and "My projects": a project's status dot colour
  const dotFor = st => st === 'Closed' ? '#A39C95' : st === 'Hold' ? '#F2A23A' : st === 'Dev in progress' ? '#3DA56A' : '#4A7CF0';

  // Add/remove one person from one project. Anyone can do this for themselves; PMs/TLs can do it for anyone.
  const toggleInvolvement = (memberIdx, projectName, memberName, memberEmail) => {
    if (!canEditTeamInvolvement(memberName, memberEmail)) {
      alert(`You can only update your own project involvement. PMs and TLs can edit all team members.`);
      return;
    }
    const target = members[memberIdx];
    if (target && !isOwnMember(target.name, target.email)) {
      const had = (target.projects || []).some(x => norm(x) === norm(projectName));
      notifyAssignment({ actor: user?.name, project: projectName, people: [target], removed: had });
    }
    updateData(prev => {
      const ms = [...prev.members];
      const m = {...ms[memberIdx]};
      const has = m.projects.some(p => norm(p) === norm(projectName));
      m.projects = has
        ? m.projects.filter(p => norm(p) !== norm(projectName))
        : [...m.projects, projectName];
      ms[memberIdx] = m;
      return {...prev, members: ms};
    });
  };

  const renderPeople = () => {
    const q = teamFilter.toLowerCase();
    const filtered = members.filter(m =>
      !q || (m.name+' '+m.role+' '+m.skills+' '+m.combo).toLowerCase().includes(q)
    );

    // group by role category, in a fixed order
    const categoryOf = (role = '') =>
      /^(pm|lead)\b/i.test(role) ? 'Leadership'
      : /\bml\b/i.test(role) ? 'ML & AI'
      : /\bfe\b.*\bbe\b|\bbe\b.*\b(fe|react)\b|react.*\bbe\b|full/i.test(role) ? 'Full-stack'
      : /\bfe\b|front|react|angular/i.test(role) ? 'Frontend'
      : /\bbe\b|backend|python|java|node/i.test(role) ? 'Backend'
      : /^de\b|data/i.test(role) ? 'Data' : 'Others';
    const ORDER = ['Leadership', 'ML & AI', 'Backend', 'Frontend', 'Full-stack', 'Data', 'Others'];
    const groups = ORDER
      .map(key => ({ key, items: filtered.filter(m => categoryOf(m.role) === key) }))
      .filter(g => g.items.length);

    return (
      <>
        <input className="search" type="search" placeholder="Search name, role or skill"
          value={teamFilter} onChange={e => set({teamFilter:e.target.value})}
          aria-label="Search team" />
        {groups.map(g => (
        <section key={g.key} className="people-group" aria-label={g.key}>
        <h3 className="people-group-head"><span>{g.key}</span><b>{g.items.length}</b></h3>
        <div className="people">
          {g.items.map(m => {
            const active = m.projects.filter(p => {
              const mp = matrixProjects.find(x => norm(x.name) === norm(p));
              return !mp || mp.status !== 'Closed';
            });
            const initials = m.name.split(' ').map(w=>w[0]).slice(0,2).join('');
            const isMe = isOwnMember(m.name, m.email);
            return (
              <article key={m.name} className={`person${m.inactive ? ' is-inactive' : ''}`} data-me={isMe ? 'true' : undefined} onContextMenu={(e) => { e.preventDefault(); setPctx({ x: e.clientX, y: e.clientY, m }); }}>
                <div className="ph">
                  <span className="tile t-none">{initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>
                      <span>{m.name}</span>
                      {m.inactive && <span className="inactive-tag"><i />Inactive</span>}
                      {isMe && (
                        <span style={{ fontSize: '10.5px', background: '#DCFCE7', color: '#15803D', padding: '1.5px 7px', borderRadius: '10px', fontWeight: 700, border: '1px solid #BBF7D0' }}>
                          You
                        </span>
                      )}
                    </h3>
                    <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.role}</span>
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
                    {canEdit && !isMe && (
                      <button
                        type="button"
                        className="person-icon-btn person-remove"
                        title={`Remove ${m.name} from the team`}
                        aria-label={`Remove ${m.name}`}
                        onClick={() => removeMember(m)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                        </svg>
                      </button>
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
        </section>
        ))}
        {groups.length === 0 && <p className="wl-none" style={{ padding: '26px 0', textAlign: 'center' }}>No one matches that search.</p>}
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
                    <li key={m.name} className="combo-member-item" data-me={isMe ? 'true' : undefined}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.name}</span>
                        {isMe && (
                          <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            You
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        {m.role}
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

    </>
  );

  // Workload: how many active projects each person carries, pulled from the project matrix
  const renderWorkload = () => {
    const activeOf = (m) => m.projects
      .map(pn => matrixProjects.find(x => norm(x.name) === norm(pn)))
      .filter(mp => mp && mp.status !== 'Closed');
    const band = (n) => n === 0 ? 'free' : n <= 2 ? 'light' : n <= 4 ? 'busy' : 'over';
    const BAND = {
      free: { label: 'Free', short: 'Free', hint: 'No active projects' },
      light: { label: 'Light load', short: 'Light', hint: '1–2 active projects' },
      busy: { label: 'Busy', short: 'Busy', hint: '3–4 active projects' },
      over: { label: 'Overloaded', short: 'Over', hint: '5+ active projects' },
    };
    const BAND_ORDER = ['free', 'light', 'busy', 'over'];
    const BAND_SPAN = { free: '1 / 2', light: '2 / 4', busy: '4 / 6', over: '6 / 8' };
    const METER_SCALE = 6; // six capacity slots per person; anything past six gets an outer ring

    const goToProject = (name) => { set({ pq: name }); window.location.hash = '#projects'; };
    const goToMatrix = (name) => { setMxFilter(name); set({ teamView: 'matrix' }); };
    const removeFromProject = (m, projectName) => {
      if (!canEditTeamInvolvement(m.name, m.email)) return;
      const mi = members.findIndex(x => x.name === m.name);
      if (mi < 0) return;
      if (!isOwnMember(m.name, m.email)) notifyAssignment({ actor: user?.name, project: projectName, people: [m], removed: true });
      updateData(prev => {
        const ms = [...prev.members];
        ms[mi] = { ...ms[mi], projects: ms[mi].projects.filter(p => norm(p) !== norm(projectName)) };
        return { ...prev, members: ms };
      });
    };

    const q = wlFilter.trim().toLowerCase();
    const pool = members
      .filter(m => !q || (m.name + ' ' + m.role).toLowerCase().includes(q))
      .map(m => { const active = activeOf(m); return { m, active, n: active.length, b: band(active.length) }; });
    const counts = { free: 0, light: 0, busy: 0, over: 0 };
    pool.forEach(r => { counts[r.b]++; });
    const loadCounts = Array.from({ length: 7 }, (_, n) => pool.filter(r => Math.min(r.n, 6) === n).length);
    const peak = Math.max(1, ...loadCounts);
    const total = pool.length;
    const axisMax = Math.max(6, ...pool.map(r => r.n));
    const axisStep = axisMax > 12 ? 4 : axisMax > 8 ? 2 : 1;
    const axisTicks = Array.from({ length: Math.floor(axisMax / axisStep) + 1 }, (_, i) => i * axisStep);
    const overCount = counts.over;
    const sorted = pool.slice().sort(wlSort === 'name'
      ? (a, b) => a.m.name.localeCompare(b.m.name)
      : (a, b) => b.n - a.n || a.m.name.localeCompare(b.m.name));
    const rows = wlBand ? sorted.filter(r => r.b === wlBand) : sorted;
    const toggleExpand = (name) => setWlOpen(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });

    return (
      <div className="wl3">
        <section className="wl3-top" aria-labelledby="wl3-title">
          <div className="wl3-intro">
            <h2 id="wl3-title">Team capacity</h2>
            <p>
              {total === 0
                ? 'No one matches the current search.'
                : overCount > 0
                  ? <><b>{overCount} of {total}</b> {total === 1 ? 'person is' : 'people are'} over capacity — five or more active projects.</>
                  : <>No one is over capacity right now. The busiest person carries {sorted[0]?.n ?? 0} active {sorted[0]?.n === 1 ? 'project' : 'projects'}.</>}
            </p>
          </div>

          {total > 0 && (
            <div className="wl3-figure">
              <div className="wl3-hist" role="img"
                aria-label={loadCounts.map((c, n) => `${c} ${c === 1 ? 'person' : 'people'} with ${n === 6 ? 'six or more' : n} active ${n === 1 ? 'project' : 'projects'}`).join('; ')}>
                {loadCounts.map((c, n) => (
                  <span key={n} className={`wl3-col wl3-b-${band(n)}`}>
                    <span className="wl3-col-count">{c}</span>
                    <span className="wl3-col-track">
                      <i style={{ height: c ? `${Math.max(9, (c / peak) * 100)}%` : 0 }} />
                    </span>
                    <span className="wl3-col-x">{n === 6 ? '6+' : n}</span>
                  </span>
                ))}
              </div>
              <div className="wl3-brackets" role="group" aria-label="Filter by capacity band">
                {BAND_ORDER.map(k => (
                  <button key={k} type="button"
                    className={`wl3-bracket wl3-b-${k}${wlBand === k ? ' is-on' : ''}`}
                    style={{ gridColumn: BAND_SPAN[k] }}
                    onClick={() => setWlBand(cur => cur === k ? null : k)}
                    aria-pressed={wlBand === k}
                    aria-label={`${BAND[k].label}: ${counts[k]} ${counts[k] === 1 ? 'person' : 'people'}`}
                    title={`${BAND[k].label} · ${BAND[k].hint}`}>
                    <span>{BAND[k].short}</span><b>{counts[k]}</b>
                  </button>
                ))}
              </div>
              <span className="wl3-hist-x">active projects per person</span>
            </div>
          )}
        </section>

        <div className="wl3-tools">
          <input className="search" type="search" placeholder="Find a person or role"
            value={wlFilter} onChange={e => setWlFilter(e.target.value)} aria-label="Filter workload by person" />
          <div className="wl-sort" role="group" aria-label="Sort workload">
            <button type="button" className={wlSort === 'load' ? 'on' : ''} onClick={() => setWlSort('load')}>Busiest first</button>
            <button type="button" className={wlSort === 'name' ? 'on' : ''} onClick={() => setWlSort('name')}>By name</button>
          </div>
        </div>

        <div className="wl3-caption">
          <span>One bar per person, counting active projects. The red zone is five or more. Click a row to see the projects.</span>
          {wlBand && <button type="button" className="wl3-clear" onClick={() => setWlBand(null)}>Show everyone</button>}
        </div>

        <div className="wl3-axisrow" aria-hidden="true" style={{ '--max': axisMax }}>
          <span className="wl3-axis-title">Active projects</span>
          <span className="wl3-chart"><span className="wl3-area wl3-ticks">
            {axisTicks.map(t => <em key={t} style={{ left: `${(t / axisMax) * 100}%` }}>{t}</em>)}
          </span></span>
        </div>

        <ul className="wl3-rows">
          {rows.map(({ m, active, n, b }) => {
            const open = wlOpen.has(m.name);
            const canManage = canEditTeamInvolvement(m.name, m.email);
            return (
              <li key={m.name} className={`wl3-row wl3-b-${b}${open ? ' is-open' : ''}${m.inactive ? ' is-inactive' : ''}`}>
                <button type="button" className="wl3-row-main" onClick={() => toggleExpand(m.name)} aria-expanded={open}
                  aria-label={`${m.name}, ${n} active ${n === 1 ? 'project' : 'projects'}, ${BAND[b].label}. ${open ? 'Collapse' : 'Expand'} details`}
                  onContextMenu={(e) => { e.preventDefault(); setPctx({ x: e.clientX, y: e.clientY, m }); }}>
                  <span className="wl3-who">
                    <b>{m.name}{isOwnMember(m.name, m.email) && <em className="wl3-you">You</em>}</b>
                    <span>{m.role}</span>
                  </span>
                  <span className="wl3-chart" aria-hidden="true" style={{ '--max': axisMax }}>
                    <span className="wl3-area">
                      {n > 0 && <i className="wl3-gbar" style={{ width: `${(n / axisMax) * 100}%` }} />}
                    </span>
                    <b className="wl3-gval" style={{ left: `calc((100% - 34px) * ${n / axisMax} + 8px)` }}>{n}</b>
                  </span>
                  <span className={`wl3-tag wl3-tag-${b}`}><i />{BAND[b].label}</span>
                  <span className="wl3-chev"><ChevronRight size={16} /></span>
                </button>

                <div className="wl3-detail" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                  <div className="wl3-detail-in">
                    {active.length > 0 ? (
                      <ul className="wl3-plist">
                        {active.map(p => (
                          <li key={p.name}>
                            <i style={{ background: dotFor(p.status) }} />
                            <button type="button" className="wl3-plink" onClick={() => goToProject(p.name)} title={`Open ${p.name} in Projects`}>{p.name}</button>
                            <span className="wl3-pstatus">{p.status}</span>
                            {canManage && (
                              <button type="button" className="wl3-premove" title={`Remove ${m.name} from ${p.name}`} aria-label={`Remove from ${p.name}`}
                                onClick={() => removeFromProject(m, p.name)}><X size={13} /></button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="wl-none" style={{ margin: '4px 0 10px' }}>Not on any active project right now.</p>}
                    {canEdit && <button type="button" className="wl3-matrixlink" onClick={() => goToMatrix(m.name)}>View in project matrix <ChevronRight size={14} /></button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="wl-none" style={{ padding: '26px 0', textAlign: 'center' }}>No one matches that filter.</p>}
      </div>
    );
  };

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
      // notify the person when someone else adds them to / removes them from a project
      const target = members[memberIdx];
      if (target && !isOwnMember(target.name, target.email)) {
        const had = (target.projects || []).some(x => norm(x) === norm(projectName));
        notifyAssignment({ actor: user?.name, project: projectName, people: [target], removed: had });
      }
      updateData(prev => {
        const ms = [...prev.members];
        const m = {...ms[memberIdx]};
        const has = m.projects.some(p => norm(p) === norm(projectName));
        m.projects = has
          ? m.projects.filter(p => norm(p) !== norm(projectName))
          : [...m.projects, projectName];
        ms[memberIdx] = m;
        return {...prev, members: ms};
      });
    };

    const q = mxFilter.trim().toLowerCase();
    const cols = matrixProjects
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !(hideClosed && p.status === 'Closed'));
    const rows = members
      .map((m, mi) => ({ m, mi }))
      .filter(({ m }) => !q || (m.name + ' ' + m.role).toLowerCase().includes(q));
    const headcount = name => members.filter(m => m.projects.some(x => norm(x) === norm(name))).length;
    const dotFor = st => st === 'Closed' ? '#A39C95' : st === 'Hold' ? '#F2A23A' : st === 'Dev in progress' ? '#3DA56A' : '#4A7CF0';

    return (
      <>
        <div className="mx2-bar">
          <input className="search" type="search" placeholder="Filter people by name or role"
            value={mxFilter} onChange={e => setMxFilter(e.target.value)} aria-label="Filter matrix by person" />
          <label className="mx2-toggle">
            <input type="checkbox" checked={hideClosed} onChange={e => setHideClosed(e.target.checked)} />
            <span>Hide closed projects</span>
          </label>
          <span className="mx2-legend"><i className="inv on">✓</i> Involved <i className="inv" /> Not involved</span>
        </div>
        <p className="small muted" style={{ margin: '4px 0 12px' }}>
          {canEdit
            ? 'Click a cell to add or remove someone from a project. The bottom row shows headcount per project.'
            : 'You can click your own row to update your project involvement. Other rows are view-only.'}
        </p>
        <div className="scroll mx2-wrap">
          <table className="mx2">
            <thead>
              <tr>
                <th className="sticky mx2-person">Team member</th>
                <th className="c">Active</th>
                {cols.map(({ p, i }) => (
                  <th key={p.name} className={`mx2-proj${p.status==='Closed' ? ' closed' : ''}`}>
                    <div className="mx2-pname" title={p.name}>{p.name}</div>
                    <div className="mx2-pstatus">
                      <i style={{ background: dotFor(p.status) }} />
                      {canEdit ? (
                        <select value={p.status} onChange={e => setProjectStatus(i, e.target.value)} aria-label={`${p.name} status`}>
                          {statusOptions.map(st => <option key={st}>{st}</option>)}
                        </select>
                      ) : <span>{p.status}</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, mi }) => {
                const active = m.projects.filter(pn => {
                  const mp = matrixProjects.find(x => norm(x.name) === norm(pn));
                  return mp && mp.status !== 'Closed';
                }).length;
                const isMe = isOwnMember(m.name, m.email);
                const canEditRow = canEditTeamInvolvement(m.name, m.email);
                return (
                  <tr key={m.name} data-me={isMe ? 'true' : undefined}>
                    <td className="sticky mx2-person">
                      <b>{m.name}</b>
                      {isMe && <span className="mx2-you">You</span>}
                      <span className="small muted"> {m.role}</span>
                    </td>
                    <td className="c"><span className="mx2-count">{active}</span></td>
                    {cols.map(({ p }) => {
                      const on = m.projects.some(x => norm(x) === norm(p.name));
                      return (
                        <td key={p.name} className={`c${p.status==='Closed' ? ' closed' : ''}`}>
                          <button
                            className={`inv${on ? ' on' : ''}`}
                            disabled={!canEditRow}
                            onClick={() => toggleInvolvement(mi, p.name, m.name, m.email)}
                            title={canEditRow ? `${on ? 'Remove' : 'Add'} ${m.name} ${on ? 'from' : 'to'} ${p.name}` : 'Only PMs/TLs can edit other members'}
                            aria-pressed={on}
                            aria-label={`${m.name} on ${p.name}`}>
                            {on ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={cols.length + 2} className="muted" style={{ padding: 24, textAlign: 'center' }}>No one matches that filter.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky mx2-person"><b>Headcount</b></td>
                <td className="c"></td>
                {cols.map(({ p }) => <td key={p.name} className="c"><span className="mx2-count">{headcount(p.name)}</span></td>)}
              </tr>
            </tfoot>
          </table>
        </div>
      </>
    );
  };

  // Member view of "Project matrix": not the whole-team grid, just their own projects and who else is on them
  const renderMyProjects = () => {
    const me = members.find(m => isOwnMember(m.name, m.email));
    if (!me) {
      return <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>You are not listed as a team member yet. Ask a PM or TL to add you.</p>;
    }
    const active = me.projects
      .map(pn => matrixProjects.find(x => norm(x.name) === norm(pn)))
      .filter(mp => mp && mp.status !== 'Closed');
    const teammatesOn = (projectName) => members.filter(x => x.name !== me.name && x.projects.some(p => norm(p) === norm(projectName)));
    const initialsOf = (name) => name.split(' ').map(w => w[0]).slice(0, 2).join('');

    return (
      <>
        <div className="mypj-hero">
          <div>
            <h2>My projects</h2>
            <p>The projects you're currently active on.</p>
          </div>
          <div className="mypj-stats">
            <span><b>{active.length}</b>{active.length === 1 ? 'project' : 'projects'}</span>
            <span><b>{new Set(active.flatMap(p => teammatesOn(p.name).map(t => t.name))).size}</b>teammates</span>
          </div>
        </div>

        {active.length > 0 ? (
          <div className="mypj-grid">
            {active.map(p => (
              <div key={p.name} className="mypj-card">
                <div className="mypj-head">
                  <b>{p.name}</b>
                  <span className="mypj-status"><i style={{ background: dotFor(p.status) }} />{p.status}</span>
                </div>
                {(() => {
                  const mates = teammatesOn(p.name);
                  return mates.length > 0 ? (
                    <div className="mypj-chips">
                      {mates.map(t => (
                        <span key={t.name} className="mypj-chip" title={`${t.name} · ${t.role}`}>
                          <span className="mypj-av">{initialsOf(t.name)}</span>
                          <span className="mypj-chipname">{t.name}<small>{t.role}</small></span>
                        </span>
                      ))}
                    </div>
                  ) : <p className="wl-none" style={{ margin: 0 }}>Just you so far.</p>;
                })()}
              </div>
            ))}
          </div>
        ) : (
          <p className="wl-none" style={{ padding: '18px 0' }}>You are not marked as active on any project yet.</p>
        )}
      </>
    );
  };

  // Workload is for PMs/TLs only; ML combos for PMs/TLs and people in ML roles
  const me = members.find(m => isOwnMember(m.name, m.email));
  const isML = !!me && /ml/i.test(me.role || '');
  const canSeeCombos = canEdit || isML;
  const tabs = [
    ['people', 'People'],
    ...(canEdit ? [['workload', 'Workload']] : []),
    ...(canSeeCombos ? [['combos', 'ML combos']] : []),
    ['matrix', canEdit ? 'Project matrix' : 'My projects'],
  ];
  const view = tabs.some(([v]) => v === teamView) ? teamView : 'people';

  return (
    <div>
      <p className="hint">{members.length} people across PM, lead, ML, backend, frontend and data.</p>
      <div className="toolbar">
        <div className="seg">
          {tabs.map(([v,l]) => (
            <button key={v} className={view===v?'on':''} onClick={() => set({teamView:v})}>{l}</button>
          ))}
        </div>
        {canEdit && (
          <button type="button" className="btn" style={{ marginLeft: 'auto' }} onClick={() => setAddOpen(true)}>+ Add person</button>
        )}
      </div>
      {addOpen && canEdit && (
        <div className="dlg-backdrop" onClick={e => e.target===e.currentTarget && closeAdd()}>
          <dialog open style={{display:'block'}} aria-label="Add person">
            <form onSubmit={submitPerson}>
              <h2 style={{ marginTop: 0 }}>Add person</h2>
              <div className="fgrid">
                <label><span>Name *</span>
                  <input autoFocus value={np.name} onChange={e => setNp({...np, name:e.target.value})} />
                </label>
                <div className="dd-field"><span>Role *</span>
                  <Dropdown value={np.role} onChange={v => setNp({ ...np, role: v })} options={ROLES} placeholder="Select role" searchAt={6} />
                </div>
                <label><span>Email</span>
                  <input type="email" value={np.email} onChange={e => setNp({...np, email:e.target.value})} />
                </label>
                <label><span>GitHub</span>
                  <input value={np.github} onChange={e => setNp({...np, github:e.target.value})} placeholder="username" />
                </label>
                <div className="dd-field"><span>ML combo</span>
                  <Dropdown value={np.combo} onChange={v => setNp({ ...np, combo: v })} options={[{ value: '', label: 'None' }, ...Object.keys(COMBO)]} />
                </div>
                <label><span>Skills</span>
                  <input value={np.skills} onChange={e => setNp({...np, skills:e.target.value})} placeholder="comma separated" />
                </label>
              </div>
              <div className="team-picker" style={{ marginTop: 12 }}>
                <div className="team-picker-head"><span>Projects</span><em>{np.projects.length} selected</em></div>
                <div className="team-picker-grid">
                  {matrixProjects.filter(p => p.status !== 'Closed').map(p => (
                    <label key={p.name} className="member-check">
                      <input type="checkbox" checked={np.projects.includes(p.name)}
                        onChange={() => setNp({...np, projects: np.projects.includes(p.name) ? np.projects.filter(x => x!==p.name) : [...np.projects, p.name]})} />
                      <span><b>{p.name}</b></span>
                    </label>
                  ))}
                </div>
              </div>
              {npErr && <p role="alert" style={{ color: '#D9482F', fontSize: 13, margin: '10px 0 0' }}>{npErr}</p>}
              <div className="dacts">
                <button type="button" className="btn ghost" onClick={closeAdd}>Cancel</button>
                <button type="submit" className="btn">Add person</button>
              </div>
            </form>
          </dialog>
        </div>
      )}
      {pctx && <ContextMenu x={pctx.x} y={pctx.y} title={pctx.m.name} items={personMenu(pctx.m)} onClose={() => setPctx(null)} />}
      {editing && (
        <PersonEditModal
          member={editing.m}
          mode={editing.mode}
          combos={Object.keys(COMBO)}
          takenNames={members.filter(x => x.name !== editing.m.name).map(x => x.name)}
          takenEmails={members.filter(x => x.name !== editing.m.name).map(x => (x.email || '').toLowerCase()).filter(Boolean)}
          onClose={() => setEditing(null)}
          onSave={(patch) => savePerson(editing.m, patch)}
        />
      )}
      {view==='people' && renderPeople()}
      {view==='workload' && renderWorkload()}
      {view==='combos' && renderCombos()}
      {view==='matrix' && (canEdit ? renderMatrix() : renderMyProjects())}
    </div>
  );
}
