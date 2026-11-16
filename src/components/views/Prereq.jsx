import { useState, useEffect } from 'react';
import { ExecutiveDashboard } from '../../pages/ExecutiveDashboard';
import { CreateProject } from '../../pages/CreateProject';
import { ProjectDashboard } from '../../pages/ProjectDashboard';
import '../../styles/prereq.css';

// Mock navigate function for hash-based routing
const useMockNavigate = () => {
  return (path) => {
    if (path.startsWith('/dashboard/')) {
      const id = path.replace('/dashboard/', '');
      window.location.hash = `#prereq/${id}`;
    } else if (path === '/dashboard' || path === '/portfolio') {
      window.location.hash = '#prereq';
    } else if (path === '/new') {
      window.location.hash = '#prereq/new';
    }
  };
};

// Wrapper to provide navigate context
function WithMockRouter({ children, projectId }) {
  return children;
}

export default function Prereq({ data, updateData, param }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState(null);

  useEffect(() => {
    if (param === 'new') {
      setCurrentView('create');
      setCurrentProjectId(null);
    } else if (param && param !== 'new') {
      setCurrentView('project');
      setCurrentProjectId(param);
    } else {
      setCurrentView('dashboard');
      setCurrentProjectId(null);
    }
  }, [param]);

  // Route to different views based on param
  if (currentView === 'create') {
    // Show Create Project page (with Groq modal)
    return (
      <div className="prereq-container">
        <CreateProject />
      </div>
    );
  }
  
  if (currentView === 'project' && currentProjectId) {
    // Show specific project dashboard - pass projectId as prop
    return (
      <div className="prereq-container">
        <ProjectDashboard projectId={currentProjectId} appData={data} />
      </div>
    );
  }
  
  // Default: show executive dashboard (portfolio view)
  return (
    <div className="prereq-container">
      <ExecutiveDashboard appData={data} updateData={updateData} />
    </div>
  );
}

