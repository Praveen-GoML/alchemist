import React, { createContext, useState, useContext, useEffect } from 'react';

import { initialState } from '../data/initialState';

const AuthContext = createContext();

const API_BASE_URL = (import.meta.env.VITE_AUTH_API_URL || (import.meta.env.DEV ? 'http://localhost:8001' : '')).replace(/\/+$/, '');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('alchemist_token');
    const storedUser = localStorage.getItem('alchemist_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
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

    const data = await response.json();
    localStorage.setItem('alchemist_token', data.access_token);
    localStorage.setItem('alchemist_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const [portalMode, setPortalMode] = useState('auto'); // 'auto', 'management', 'member'

  const logout = () => {
    localStorage.removeItem('alchemist_token');
    localStorage.removeItem('alchemist_user');
    setUser(null);
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

    // 2. Look up member in initialState to cross-check email
    if (targetName && uEmail && initialState?.members) {
      const found = initialState.members.find(
        m => (m.name || '').trim().toLowerCase() === targetName.trim().toLowerCase()
      );
      if (found && found.email && found.email.trim().toLowerCase() === uEmail) {
        return true;
      }
    }

    // 3. Name check
    if (!targetName) return false;
    const uName = (user.name || '').trim().toLowerCase();
    const mName = targetName.trim().toLowerCase();
    if (uName === mName) return true;

    const uParts = uName.split(/\s+/);
    const mParts = mName.split(/\s+/);
    if (uParts.length > 1 && mParts.length > 1) {
      if (uParts[0] === mParts[0] && uParts[1] === mParts[1]) return true;
    }
    return uName.includes(mName) || mName.includes(uName);
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
