import React, { createContext, useState, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../api/keys';

import { clearSession } from '../utils/session';
import { forgetDeviceOnServer } from '../services/push';
import { initialState } from '../data/initialState';

const AuthContext = createContext();

const API_BASE_URL = (import.meta.env.VITE_AUTH_API_URL || (import.meta.env.DEV ? 'http://localhost:8001' : '')).replace(/\/+$/, '');

const readCachedUser = () => {
  try { return JSON.parse(localStorage.getItem('alchemist_user')); } catch { return null; }
};

/** Asks the server who this token belongs to. Resolves the user, or null when the token is no longer valid. */
async function fetchMe(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const me = await res.json();
      localStorage.setItem('alchemist_user', JSON.stringify(me));
      return me;
    }
    if (res.status === 401 || res.status === 403) { clearSession(); return null; }
    // Server error: fall back to the cached profile but keep the token for a retry
    return readCachedUser();
  } catch {
    return readCachedUser();
  }
}

async function postLogin(email, password) {
  if (!API_BASE_URL) {
    throw new Error('Authentication backend is not configured. Set VITE_AUTH_API_URL in the frontend deployment.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username: email, password })
    });
  } catch (networkErr) {
    throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Is the backend running?`);
  }

  if (!response.ok) {
    let errorMessage = 'Login failed';
    try {
      const error = await response.json();
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        errorMessage = error.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
    } catch (_) {
      errorMessage = `Login failed (${response.status}: ${response.statusText})`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  // Was there a saved session when the app opened? Only then do we need to ask the server who it is.
  const [bootToken] = useState(() => { try { return localStorage.getItem('alchemist_token'); } catch { return null; } });
  const [checkSession, setCheckSession] = useState(!!bootToken && !!API_BASE_URL);
  if (bootToken && !API_BASE_URL) clearSession(); // a token with no server to check it against is not trusted

  // Trust the server, not localStorage: validate the token and use the role it returns.
  const meQuery = useQuery({
    queryKey: keys.auth.me,
    queryFn: () => fetchMe(bootToken),
    enabled: checkSession,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  const loading = checkSession && meQuery.isPending;

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => postLogin(email, password),
    onSuccess: (data) => {
      localStorage.setItem('alchemist_token', data.access_token);
      localStorage.setItem('alchemist_user', JSON.stringify(data.user));
      queryClient.setQueryData(keys.auth.me, data.user);
    },
  });

  const login = async (email, password) => (await loginMutation.mutateAsync({ email, password })).user;

  const [portalMode, setPortalMode] = useState('auto'); // 'auto', 'management', 'member'

  const logout = () => {
    forgetDeviceOnServer(localStorage.getItem('alchemist_token'));
    clearSession();
    setCheckSession(false); // do not re-check the old token after signing out
    queryClient.clear(); // nothing from this person's session may linger for the next one
    setPortalMode('auto');
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('alchemist_token');
  };

  const isManagementUser = !!user && ['admin', 'tl', 'pm'].includes((user.role || '').toLowerCase());
  const activePortal = portalMode === 'auto' ? (isManagementUser ? 'management' : 'member') : portalMode;

  const togglePortal = () => {
    if (!isManagementUser) return;
    setPortalMode(prev => (prev === 'member' ? 'management' : 'member'));
  };

  const isOwnMember = (memberName, memberEmail) => {
    if (!user) return false;
    
    let targetName = memberName;
    let targetEmail = memberEmail;

    if (typeof memberName === 'object' && memberName !== null) {
      targetName = memberName.name;
      targetEmail = memberName.email || memberEmail;
    }

    const uEmail = (user.email || '').trim().toLowerCase();

    // 1. Direct email check if target email provided
    if (targetEmail && uEmail && targetEmail.trim().toLowerCase() === uEmail) {
      return true;
    }

    // Identity is matched on email only; names are not unique or trustworthy.
    return false;
  };

  // Permission helpers - only PM & TL can edit project, checklist, improvements, links
  const canEditProjects = () => isManagementUser && activePortal === 'management';
  const canEditMembers = () => isManagementUser && activePortal === 'management';
  const canManageChecklist = () => isManagementUser && activePortal === 'management';
  const canManageImprovements = () => isManagementUser && activePortal === 'management';
  const canManageLinks = () => isManagementUser && activePortal === 'management';
  const canEditAll = () => isManagementUser && activePortal === 'management';

  // Project Matrix Involvement: PM/TL can edit all, team members can edit their own row
  const canEditTeamInvolvement = (memberName, memberEmail) => {
    if (!user) return false;
    if (isManagementUser && activePortal === 'management') return true;
    return isOwnMember(memberName, memberEmail);
  };

  // Member Profile (skills, github, note): PM/TL can edit all, team members can edit their own
  const canEditMemberProfile = (memberName, memberEmail) => {
    if (!user) return false;
    if (isManagementUser && activePortal === 'management') return true;
    return isOwnMember(memberName, memberEmail);
  };

  // Strict identity match: email, or full-name equality. (No substring matching, so one
  // person can never be mistaken for another.)
  const isSameMember = (memberName, memberEmail) => {
    if (!user) return false;
    const uEmail = (user.email || '').trim().toLowerCase();
    const mEmail = (memberEmail || '').trim().toLowerCase();
    if (uEmail && mEmail) return uEmail === mEmail;
    let email = mEmail;
    if (!email && memberName && initialState?.members) {
      const found = initialState.members.find(
        m => (m.name || '').trim().toLowerCase() === memberName.trim().toLowerCase()
      );
      email = (found?.email || '').trim().toLowerCase();
    }
    if (uEmail && email) return uEmail === email;
    const norm = (v) => (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return !!memberName && norm(user.name) === norm(memberName);
  };

  // Daily Hygiene: every person (PM and TL included) can edit only their own row
  const canEditHygiene = (memberName, memberEmail) => isSameMember(memberName, memberEmail);

  // Leave / attendance sheet: every person (PM and TL included) can edit only their own row
  const canEditLeave = (memberName, memberEmail) => isSameMember(memberName, memberEmail);

  const isAdmin = () => user && user.role === 'admin';
  const isPMOrAbove = () => isManagementUser;
  const isTLOrAbove = () => user && ['admin', 'tl'].includes((user.role || '').toLowerCase());

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      login,
      logout, 
      isAuthenticated,
      isManagementUser,
      activePortal,
      togglePortal,
      isOwnMember,
      canEditProjects,
      canEditMembers,
      canManageChecklist,
      canManageImprovements,
      canManageLinks,
      canEditTeamInvolvement,
      canEditMemberProfile,
      canEditHygiene,
      isSameMember,
      canEditLeave,
      canEditAll,
      isAdmin,
      isPMOrAbove,
      isTLOrAbove
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
