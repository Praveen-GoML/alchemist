import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import Icon from './Icon';
import { currentTheme, toggleTheme } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

const VIEW_TITLES = {
  overview:     'Home',
  projects:     'Projects',
  prereq:       'Pre-req Trackers',
  checklist:    'Delivery Checklist',
  hygiene:      'Daily Hygiene',
  leave:        'Leave Tracker',
  team:         'Team',
  improvements: 'Hub Improvements',
  links:        'Tracker Links',
  playbook:     'Playbook',
};

export default function TopBar({ view, onMenuClick, onExpandSidebar, isCollapsed }) {
  const { user, logout, isManagementUser, activePortal, togglePortal } = useAuth();
  const [theme, setThemeState] = useState(() => currentTheme());

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  // Get initials from user name
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="tbar">
      {/* Mobile menu button */}
      <button className="menu" aria-label="Open navigation" onClick={onMenuClick}>
        <Icon name="menu" />
      </button>

      {/* Expand sidebar button — only visible when sidebar is collapsed */}
      {isCollapsed && (
        <button
          onClick={onExpandSidebar}
          title="Expand sidebar"
          style={{
            border: 0,
            background: 'transparent',
            padding: '6px',
            cursor: 'pointer',
            color: 'var(--muted)',
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
          aria-label="Expand sidebar"
        >
          <Icon name="collapse" />
        </button>
      )}

      <h1 className="tname">{VIEW_TITLES[view] || 'Home'}</h1>

      {/* Portal Mode Indicator Badge */}


      <span id="save" role="status">Saved on this device</span>

      <button
        type="button"
        className="theme-toggle"
        onClick={() => setThemeState(toggleTheme())}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="who">
        <Icon name="bell" className="bell" />
        <span className="av" title={user?.email}>{user ? getInitials(user.name) : 'U'}</span>
        <span className="wn">{user?.name || 'User'}</span>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          padding: '2px 6px',
          borderRadius: '4px',
          background: isManagementUser ? '#FEF3C7' : '#E5E7EB',
          color: isManagementUser ? '#92400E' : '#4B5563',
          marginLeft: '4px'
        }}>
          {user?.role || 'member'}
        </span>
        <button
          onClick={handleLogout}
          style={{
            marginLeft: '12px',
            padding: '6px 12px',
            background: '#FEE2E2',
            color: '#DC2626',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#FEE2E2';
          }}
          title="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
