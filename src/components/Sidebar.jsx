import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

const NAV_GROUPS = [
  ['Overview',  [['overview',     'Home',          'home'      ]]],
  ['Delivery',  [['projects',     'Projects',      'projects'  ],
                 ['prereq',       'Pre-req',        'prereq'    ],
                 ['checklist',    'Checklist',      'checklist' ],
                 ['docs',         'Docs & Drive',   'folder'    ]]],
  ['People',    [['team',         'Team',           'team'      ],
                 ['hygiene',      'Daily hygiene',  'hygiene'   ],
                 ['leave',        'Leave tracker',  'leave'     ]]],
  ['Hub',       [['improvements', 'Improvements',  'improvements'],
                 ['links',        'Tracker links',  'links'     ]]],
];

// Items hidden from regular members (non-PM/TL/Admin)
const MEMBER_HIDDEN_HREFS = new Set(['overview']);

export default function Sidebar({ view, onToggleCollapse, onNavigate }) {
  const { isManagementUser } = useAuth();

  return (
    <aside className="side" id="side">
      {/* Brand */}
      <div className="sbrand">
        <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3 3 26h26z" fill="#F7B267"/>
          <path d="M16 9.5 8 24h16z" fill="#F28C28"/>
          <path d="M16 15.5 12 23h8z" fill="#E0761A"/>
        </svg>
        <span className="bname">Go Alchemists</span>
        <button className="colbtn" aria-label="Collapse sidebar" onClick={onToggleCollapse}>
          <Icon name="collapse" />
        </button>
      </div>

      {/* Nav */}
      <nav id="nav" aria-label="Main navigation">
        {NAV_GROUPS.map(([group, items]) => {
          const visibleItems = items.filter(([href]) =>
            isManagementUser || !MEMBER_HIDDEN_HREFS.has(href)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div className="ng" key={group}>
              <div className="nglab">{group}</div>
              {visibleItems.map(([href, label, icon]) => (
                <a
                  key={href}
                  href={`#${href}`}
                  title={label}
                  className={view === href ? 'on' : ''}
                  aria-current={view === href ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sfoot">© GOAL · Go Alchemists</div>
    </aside>
  );
}
