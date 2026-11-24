import { useMemo, useState } from 'react';
import { ChevronDown, Rocket, Users, Layers } from 'lucide-react';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { iso, today } from '../utils/helpers';

/**
 * Sidebar with collapsible sections and a tree connector down the children.
 * Items: [href, label, icon]. A few items show a small live count badge.
 */
const HOME = ['overview', 'Home', 'home'];
const SECTIONS = [
  { key: 'delivery', label: 'Delivery', icon: Rocket, items: [
    ['projects', 'Projects', 'projects'],
    ['prereq', 'Pre-req', 'prereq'],
    ['checklist', 'Checklist', 'checklist'],
    ['docs', 'Docs & Drive', 'folder'],
  ] },
  { key: 'people', label: 'People', icon: Users, items: [
    ['team', 'Team', 'team'],
    ['hygiene', 'Daily hygiene', 'hygiene'],
    ['leave', 'Leave tracker', 'leave'],
  ] },
  { key: 'hub', label: 'Hub', icon: Layers, items: [
    ['improvements', 'Improvements', 'improvements'],
    ['links', 'Tracker links', 'links'],
  ] },
];

// Home is for managers; members land on their own pages
const MEMBER_HIDDEN_HREFS = new Set(['overview']);
const STORE_KEY = 'alchemist-nav-closed';

function loadClosed() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY));
    if (v && typeof v === 'object') return v;
  } catch { /* ignore */ }
  return {};
}

function NavLink({ href, label, icon, child, active, badge, onNavigate }) {
  return (
    <a
      href={`#${href}`}
      title={label}
      className={`slink${child ? ' child' : ''}${active ? ' on' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <Icon name={icon} />
      <span className="slabel">{label}</span>
      {badge && <em className={`sbadge ${badge.tone}`} title={badge.tip}>{badge.n}</em>}
    </a>
  );
}

export default function Sidebar({ view, data = {}, onToggleCollapse, onNavigate }) {
  const { isManagementUser } = useAuth();
  const [closed, setClosed] = useState(loadClosed); // { sectionKey: true } = collapsed by the user

  const toggle = (key) => setClosed(prev => {
    const next = { ...prev, [key]: !prev[key] };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  // small live counts next to a few items
  const badges = useMemo(() => {
    const out = {};
    const late = (data.projects || []).filter(p => ['Delayed', 'Behind'].includes(p.status)).length;
    if (late) out.projects = { n: late, tone: 'warn', tip: `${late} behind or delayed` };

    const t = iso(today());
    const away = (data.members || []).filter(m => (data.leave?.[m.name] || {})[t]).length;
    if (away) out.leave = { n: away, tone: 'ok', tip: `${away} away today` };

    const going = (data.improvements || []).filter(i => i.status === 'In progress').length;
    if (going) out.improvements = { n: going, tone: 'soft', tip: `${going} in progress` };
    return out;
  }, [data.projects, data.members, data.leave, data.improvements]);

  const showHome = isManagementUser || !MEMBER_HIDDEN_HREFS.has(HOME[0]);

  return (
    <aside className="side" id="side">
      {/* Brand */}
      <div className="sbrand">
        <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3 3 26h26z" fill="#F7B267" />
          <path d="M16 9.5 8 24h16z" fill="#F28C28" />
          <path d="M16 15.5 12 23h8z" fill="#E0761A" />
        </svg>
        <span className="bname">Go Alchemists</span>
        <button className="colbtn" aria-label="Collapse sidebar" onClick={onToggleCollapse}>
          <Icon name="collapse" />
        </button>
      </div>

      {/* Nav */}
      <nav className="snav" aria-label="Main navigation">
        {showHome && (
          <NavLink href={HOME[0]} label={HOME[1]} icon={HOME[2]} active={view === HOME[0]} onNavigate={onNavigate} />
        )}

        {SECTIONS.map(({ key, label, icon: SIcon, items }) => {
          const visible = items.filter(([href]) => isManagementUser || !MEMBER_HIDDEN_HREFS.has(href));
          if (!visible.length) return null;
          const hasActive = visible.some(([href]) => href === view);
          const isOpen = hasActive || !closed[key];
          const total = visible.reduce((n, [href]) => n + (badges[href]?.n || 0), 0);
          return (
            <div className={`ssec${isOpen ? ' open' : ''}${hasActive ? ' has-active' : ''}`} key={key}>
              <button
                type="button"
                className="sparent"
                aria-expanded={isOpen}
                aria-controls={`sec-${key}`}
                onClick={() => toggle(key)}
              >
                <SIcon size={18} strokeWidth={1.9} />
                <span className="slabel">{label}</span>
                {!isOpen && total > 0 && <em className="sbadge soft">{total}</em>}
                <ChevronDown size={16} className="schev" aria-hidden="true" />
              </button>
              <div className="sbody" id={`sec-${key}`}>
                <div className="sbody-in">
                  <div className="schildren">
                    {visible.map(([href, lbl, ic]) => (
                      <div className="sitem" key={href}>
                        <NavLink href={href} label={lbl} icon={ic} child active={view === href} badge={badges[href]} onNavigate={onNavigate} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sfoot">
        <button type="button" className="tour-replay" onClick={() => window.dispatchEvent(new Event('alchemist:start-tour'))}>Take the tour</button>
        © GOAL · Go Alchemists
      </div>
    </aside>
  );
}
