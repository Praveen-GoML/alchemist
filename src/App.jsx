import { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import OnboardingTour from './components/OnboardingTour';
import { ClientPortal } from './pages/ClientPortal';
import { CertificateView } from './pages/CertificateView';
import { initialState } from './data/initialState';
import { useHubData } from './hooks/useHubData';
import { mondayOf } from './utils/helpers';
import './utils/theme';
import './styles.css';
import './styles/polish.css';
import { setStatusBarDim } from './utils/theme';

import SplashScreen from './components/common/SplashScreen';
function AuthenticatedApp() {
  // Shared data: everyone sees the same projects, leave, docs and team (saved on the backend)
  const { isManagementUser } = useAuth();
  const { data, updateData, syncStatus } = useHubData(initialState, { canSeed: !!isManagementUser });

  const [ui, setUi] = useState(() => {
    try {
      const saved = localStorage.getItem('alchemist-ui');
      const parsed = saved ? JSON.parse(saved) : {};
      const hash = window.location.hash.slice(1);
      const view = hash || parsed.view || 'overview';
      // Always compute current Monday — never restore stale week from localStorage
      const currentWeek = mondayOf(new Date());
      
      return {
        view: view,
        param: parsed.param || null,
        collapsed: false,
        selectedProject: parsed.selectedProject || 'Integrin',
        leaveMonth: parsed.leaveMonth || new Date().toISOString().slice(0,7),
        week: currentWeek,
      };
    } catch {
      return {
        view: 'overview',
        param: null,
        collapsed: false,
        selectedProject: 'Integrin',
        leaveMonth: new Date().toISOString().slice(0,7),
        week: mondayOf(new Date()),
      };
    }
  });

  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('collapsed', !!ui.collapsed);
    return () => document.body.classList.remove('collapsed');
  }, [ui.collapsed]);

  useEffect(() => {
    document.body.classList.toggle('navopen', !!navOpen);
    setStatusBarDim(!!navOpen);
    return () => { document.body.classList.remove('navopen'); setStatusBarDim(false); };
  }, [navOpen]);

  // Save UI state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('alchemist-ui', JSON.stringify(ui));
    } catch (e) {
      console.error('Failed to save UI state:', e);
    }
  }, [ui]);

  // Handle hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #
      const [pathPart] = hash.split('?'); // Separate path from query string
      const [view, param] = pathPart.split('/');
      if (view) {
        setUi(prev => ({ ...prev, view, param: param || null }));
      }
      setNavOpen(false);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const toggleCollapse = () => {
    setUi(prev => ({ ...prev, collapsed: !prev.collapsed }));
  };

  return (
    <div className={`app${ui.collapsed ? ' collapsed' : ''}${navOpen ? ' navopen' : ''}`}>
      <Sidebar 
        view={ui.view} 
        data={data}
        onToggleCollapse={toggleCollapse} 
        onNavigate={() => setNavOpen(false)}
      />
      <div className="mainwrap">
        <TopBar 
          view={ui.view} 
          onMenuClick={() => setNavOpen(prev => !prev)} 
          syncStatus={syncStatus}
        />
        <MainContent 
          view={ui.view} 
          param={ui.param}
          data={data} 
          updateData={updateData}
          ui={ui}
          setUi={setUi}
        />
      </div>
      <OnboardingTour />
      <div 
        className="scrim" 
        onClick={() => setNavOpen(false)} 
        aria-hidden="true"
      />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [hash, setHash] = useState(() => window.location.hash.slice(1));
  const hashView = hash.split(/[/?]/)[0];
  const hashParam = hash.split('?')[0].split('/')[1] || null;

  useEffect(() => {
    const onHash = () => setHash(window.location.hash.slice(1));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Client-facing pages are always light, regardless of the visitor's OS theme
  const publicNow = hashView === 'client' || hashView === 'certificate';
  useEffect(() => {
    if (!publicNow) return undefined;
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
    document.body.style.background = '#FAF8F5';
    return () => {
      if (prev) root.setAttribute('data-theme', prev); else root.removeAttribute('data-theme');
      document.body.style.background = '';
    };
  }, [publicNow]);

  // Public, externally-shared views (client portal & certificate) bypass tracker login
  const isPublicView = hashView === 'client' || hashView === 'certificate';

  // Check if user should see loading screen
  if (loading) {
    return <SplashScreen />;
  }

  // Public pages render on their own: no Alchemist sidebar/top bar, no login.
  if (isPublicView) {
    return hashView === 'client'
      ? <ClientPortal key={hashParam} projectId={hashParam} />
      : <CertificateView key={hashParam} projectId={hashParam} />;
  }

  // Show login page if not authenticated
  if (!user && !isPublicView) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
