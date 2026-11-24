import { useState } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import Icon from './Icon';
import { currentTheme, toggleTheme } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

import { dialog } from '../utils/dialog';
import NotificationBell from './NotificationBell';
const SYNC_TEXT = { local: 'Saved on this device', loading: 'Loading shared data', synced: 'Synced with team', saving: 'Saving…', offline: 'Offline' };
const SYNC_HINT = {
  local: 'Data is stored in this browser only.',
  loading: 'Fetching the latest team data.',
  synced: 'Everyone sees the same data. Your changes are saved.',
  saving: 'Saving your changes to the team.',
  offline: 'Cannot reach the server. Your changes are kept here and will sync when it is back.',
};
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
  docs:         'Docs & Drive',
};

export default function TopBar({ view, onMenuClick, onExpandSidebar, isCollapsed, syncStatus = 'local' }) {
  const { user, logout, isManagementUser, activePortal, togglePortal } = useAuth();
  const [theme, setThemeState] = useState(() => currentTheme());

  const handleLogout = async () => {
    if (await dialog.confirm('You will need to sign in again to continue.', { title: 'Log out?', variant: 'question', confirmLabel: 'Log out' })) {
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


      <span id="save" role="status" data-state={syncStatus} title={SYNC_HINT[syncStatus]}>{SYNC_TEXT[syncStatus]}</span>

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
        <NotificationBell />
        <span className="who-sep" aria-hidden="true" />
        <span className="av" title={user?.email}>{user ? getInitials(user.name) : 'U'}</span>
        <span className="who-text">
          <span className="wn">{user?.name || 'User'}</span>
          <span className={`who-role${isManagementUser ? ' mgmt' : ''}`}>{user?.role || 'member'}</span>
        </span>
        <button type="button" className="who-logout" onClick={handleLogout} title="Log out" aria-label="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
