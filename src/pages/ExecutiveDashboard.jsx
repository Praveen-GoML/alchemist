import React, { useState, useMemo } from 'react';
import { useProjects, useDashboardStats, useUpdateProject, useDeleteProject, useClearAllProjects, useSeedDemo } from '../api/preq';
import { 
  CheckCircle, Clock, AlertTriangle, Plus, Upload, 
  ExternalLink, ArrowRight, Sparkles, Building2, Server, 
  ChevronRight, Award, ShieldAlert, CheckCircle2, Search,
  ShieldCheck, Lock, Layers, Calendar, ArrowUpRight,
  Trash2, RefreshCw, FileText, Check, Pencil, Copy, MoreHorizontal
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useProjectScope } from '../hooks/useProjectScope';
import { SkeletonPrereqRows } from '../components/common/Skeleton';

import { dialog } from '../utils/dialog';
import ContextMenu from '../components/common/ContextMenu';
import InitiativeEditModal from '../components/InitiativeEditModal';
export const ExecutiveDashboard = ({ onOpenCopilot, appData }) => {
  const { isAdmin, isManagementUser } = useAuth();
  const canAdmin = isAdmin();
  const canManage = !!isManagementUser;
  const canSeed = canAdmin && import.meta.env.DEV; // demo seeding is dev-only
  // Server data: TanStack Query. Refreshed every 8 s, and the moment you come back to the tab.
  const projectsQ = useProjects({ refetchInterval: 8000 });
  const statsQ = useDashboardStats({ refetchInterval: 8000 });
  const allProjects = useMemo(() => projectsQ.data || [], [projectsQ.data]);
  const stats = statsQ.data ?? null;
  const loading = projectsQ.isPending || statsQ.isPending;
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const clearAll = useClearAllProjects();
  const seedDemo = useSeedDemo();
  const isClearing = clearAll.isPending;
  const isSeedingDemo = seedDemo.isPending;
  const { canSeeAny } = useProjectScope(appData?.members || []);
  // Members only see pre-req trackers for their own projects
  const projects = useMemo(() => allProjects.filter(p => canSeeAny(p.client_name, p.name)), [allProjects, canSeeAny]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ctx, setCtx] = useState(null);       // { x, y, proj } for the right-click menu
  const [editProj, setEditProj] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Hash-based navigation (Alchemist shell): map preq routes onto #prereq, #client, #certificate views
  const navigate = (path) => {
    if (path.startsWith('/dashboard/')) {
      window.location.hash = `#prereq/${path.replace('/dashboard/', '')}`;
    } else if (path.startsWith('/client/')) {
      window.location.hash = `#client/${path.replace('/client/', '')}`;
    } else if (path.startsWith('/certificate/')) {
      window.location.hash = `#certificate/${path.replace('/certificate/', '')}`;
    } else if (path.startsWith('/new')) {
      const query = path.split('?')[1];
      window.location.hash = query ? `#prereq/new?${query}` : '#prereq/new';
    } else if (path === '/dashboard' || path === '/portfolio' || path === '/') {
      window.location.hash = '#prereq';
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleClearAll = async () => {
    if (!canAdmin) return;
    try {
      await clearAll.mutateAsync();
      setShowClearConfirm(false);
      triggerToast('All initiatives and prerequisite data cleared successfully.');
    } catch (err) {
      console.error('Failed to clear database:', err);
      triggerToast('Error clearing database. Please try again.');
    }
  };

  const copyText = async (text, okMsg) => {
    try { await navigator.clipboard.writeText(text); triggerToast(okMsg); }
    catch { triggerToast('Could not copy. Your browser blocked clipboard access.'); }
  };

  const saveInitiative = async (payload) => {
    const id = editProj.id;
    await updateProject.mutateAsync({ id, payload });
    setEditProj(null);
    triggerToast('Initiative updated.');
  };

  const openMenu = (e, proj) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, proj });
  };

  const menuItems = (proj) => {
    const certOk = proj.score >= 90 && proj.critical_blockers === 0;
    const items = [
      { label: 'Open workspace', icon: <ArrowUpRight size={15} />, onClick: () => navigate(`/dashboard/${proj.id}`) },
    ];
    if (certOk) items.push({ label: 'View kick-off certificate', icon: <Award size={15} />, onClick: () => navigate(`/certificate/${proj.id}`) });
    items.push({ label: 'Copy initiative name', icon: <Copy size={15} />, onClick: () => copyText(proj.name, 'Name copied.') });
    if (canManage) {
      items.push('sep');
      items.push({ label: 'Edit details…', icon: <Pencil size={15} />, onClick: () => setEditProj(proj) });
      items.push('sep');
      items.push({ label: 'Delete initiative', icon: <Trash2 size={15} />, danger: true, onClick: () => handleDeleteProject(proj.id, proj.name) });
    }
    return items;
  };

  const handleDeleteProject = async (id, name, e) => {
    if (!canManage) return;
    e?.stopPropagation?.();
    if (!(await dialog.confirm(`"${name}" and its prerequisite tracker will be permanently deleted.`, { title: 'Delete initiative?', variant: 'danger', confirmLabel: 'Delete' }))) return;
    try {
      await deleteProject.mutateAsync(id);
      triggerToast(`Initiative "${name}" deleted.`);
    } catch (err) {
      console.error('Failed to delete project:', err);
      triggerToast('Error deleting initiative.');
    }
  };

  const handleSeedDemo = async () => {
    if (!canSeed) return;
    try {
      await seedDemo.mutateAsync();
      triggerToast('Benchmark MovilVentas demo initiative loaded.');
    } catch (err) {
      console.error('Failed to seed demo:', err);
      triggerToast('Error seeding demo initiative.');
    }
  };

  const filteredProjects = projects.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [p.name, p.client_name, p.type, p.industry, p.deployment, p.description]
      .some(v => String(v ?? '').toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'CLEARED' && p.status === 'Kick-off Cleared') ||
      (statusFilter === 'AT_RISK' && (p.status === 'At Risk' || p.status === 'Critical / Blocked')) ||
      (statusFilter === 'IN_PROGRESS' && p.status === 'In Progress');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    if (status === 'Kick-off Cleared') {
      return <span className="goml-badge goml-badge-cleared"><CheckCircle size={12} /> Cleared for Kick-off</span>;
    }
    if (status === 'Critical / Blocked') {
      return <span className="goml-badge goml-badge-critical"><AlertTriangle size={12} /> Critical Blocker</span>;
    }
    if (status === 'At Risk') {
      return <span className="goml-badge goml-badge-risk"><Clock size={12} /> At Risk</span>;
    }
    return <span className="goml-badge goml-badge-neutral">In Progress</span>;
  };

  const clearedCount = projects.filter(p => p.status === 'Kick-off Cleared').length;
  const atRiskCount = projects.filter(p => p.status === 'At Risk' || p.status === 'Critical / Blocked').length;
  const inProgressCount = projects.filter(p => p.status === 'In Progress').length;

  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100vh',
      paddingBottom: '5rem',
      fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1F1B17',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '100px',
          fontSize: '13.5px',
          fontWeight: 700,
          boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <CheckCircle size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(31, 27, 23, 0.72)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            border: '1px solid #E6E1DB'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#FFF3E8',
              border: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EA580C',
              marginBottom: '1.25rem'
            }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1F1B17', margin: '0 0 0.5rem 0' }}>
              Clear All Portfolio Data?
            </h3>
            <p style={{ fontSize: '14px', color: '#6E6862', lineHeight: 1.6, margin: '0 0 1.75rem 0' }}>
              This will wipe all active client initiatives, prerequisite items, evidence attachments, and escalation logs. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #E6E1DB',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#6E6862',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearing}
                style={{
                  background: '#EA580C',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)'
                }}
              >
                {isClearing ? 'Clearing...' : 'Yes, Wipe All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. HEADER + SUMMARY */}
      <section className="pq-head">
        <div className="goml-container">
          <div className="pq-head-row">
            <div>
              <h1>Initiatives</h1>
              <p>{projects.length} {projects.length === 1 ? 'initiative' : 'initiatives'} tracked across delivery clearance and client prerequisites.</p>
            </div>
            <div className="pq-actions">
              {canAdmin && projects.length > 0 && (
                <button type="button" className="pq-btn ghost" onClick={() => setShowClearConfirm(true)} title="Clear all initiatives from the database">
                  <Trash2 size={14} /> Clear all
                </button>
              )}
              {canSeed && (
                <button type="button" className="pq-btn ghost" onClick={handleSeedDemo} disabled={isSeedingDemo}>
                  <RefreshCw size={14} className={isSeedingDemo ? 'spin' : ''} /> {isSeedingDemo ? 'Seeding…' : 'Load demo'}
                </button>
              )}
              <button type="button" className="pq-btn primary" onClick={() => navigate('/new')}>
                <Plus size={16} strokeWidth={2.5} /> New initiative
              </button>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="pq-stats">
              <div className="pq-stat"><span>Total</span><b>{projects.length}</b><small>initiatives tracked</small></div>
              <div className="pq-stat ok"><span>Cleared</span><b>{clearedCount}</b><small>ready for kick-off</small></div>
              <div className="pq-stat warn"><span>At risk</span><b>{atRiskCount}</b><small>need attention</small></div>
              <div className="pq-stat"><span>In progress</span><b>{inProgressCount}</b><small>being prepared</small></div>
              <div className="pq-stat"><span>Avg readiness</span><b>{projects.length ? Math.round(projects.reduce((n, p) => n + (Number(p.score) || 0), 0) / projects.length) : 0}%</b><small>across all trackers</small></div>
            </div>
          )}
        </div>
      </section>

      {/* 2. REGISTRY SECTION */}
      <section style={{ paddingTop: '1.25rem' }}>
        <div className="goml-container">
          {/* Search + status filter (only when initiatives exist) */}
          {projects.length > 0 && (
            <div className="pq-toolbar">
              <div className="pq-search">
                <Search size={20} aria-hidden="true" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search initiatives…" title="Search by name, client, industry, cloud or type"
                  aria-label="Search initiatives"
                />
                {search && (
                  <button type="button" className="pq-clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>
                )}
              </div>
              <div className="pq-tabs" role="tablist" aria-label="Filter by status">
                {[
                  { id: 'ALL', label: 'All', n: projects.length },
                  { id: 'CLEARED', label: 'Cleared', n: clearedCount },
                  { id: 'AT_RISK', label: 'At risk', n: atRiskCount },
                  { id: 'IN_PROGRESS', label: 'In progress', n: inProgressCount },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab.id}
                    className={statusFilter === tab.id ? 'on' : ''}
                    onClick={() => setStatusFilter(tab.id)}
                  >
                    {tab.label}<span>{tab.n}</span>
                  </button>
                ))}
                {search && <span className="pq-count">{filteredProjects.length} of {projects.length} shown</span>}
              </div>
            </div>
          )}

          {ctx && <ContextMenu x={ctx.x} y={ctx.y} title={ctx.proj.name} items={menuItems(ctx.proj)} onClose={() => setCtx(null)} />}
          {editProj && <InitiativeEditModal project={editProj} onClose={() => setEditProj(null)} onSave={saveInitiative} />}

          {/* 3. SKELETON LOADING STATE / TABLE / EMPTY STATE CONTAINER */}
          {loading ? (
            <SkeletonPrereqRows rows={5} />
          ) : projects.length === 0 ? (
            /* EMPTY STATE (Aligned with Client Portal) */
            <div style={{
              background: 'var(--surface)',
              border: '1px solid #E6E1DB',
              borderRadius: '16px',
              padding: '4.5rem 2rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Glowing Icon Container */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: '#FFF5EE',
                border: '1.5px solid #FFD8BF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EA580C',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.15)'
              }}>
                <Sparkles size={30} color="#000000" />
              </div>

              <h3 style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#1F1B17',
                margin: '0 0 0.6rem 0',
                letterSpacing: '-0.025em'
              }}>
                Executive Portfolio Empty
              </h3>

              <p style={{
                fontSize: '14.5px',
                color: '#6E6862',
                maxWidth: '540px',
                lineHeight: 1.6,
                margin: '0 0 2rem 0'
              }}>
                All initiative records have been cleared. Upload an enterprise Statement of Work (SOW) or provision a new initiative to begin automated Day-1 readiness tracking.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/new?tab=sow')}
                  style={{
                    background: '#ED7D31',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px 24px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(237, 125, 49, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#D94E06'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#ED7D31'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Upload size={16} color="#FFFFFF" />
                  <span>Upload SOW / Proposal</span>
                </button>

                <button
                  onClick={() => navigate('/new')}
                  style={{
                    background: '#1F1B17',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px 22px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#1E293B'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#1F1B17'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Provision New Initiative</span>
                </button>

                {canSeed && (
                <button
                  onClick={handleSeedDemo}
                  disabled={isSeedingDemo}
                  style={{
                    background: 'var(--surface)',
                    color: '#1F1B17',
                    border: '1.5px solid #D8D0C7',
                    borderRadius: '10px',
                    padding: '11px 20px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ED7D31'; e.currentTarget.style.color = '#ED7D31'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#D8D0C7'; e.currentTarget.style.color = '#1F1B17'; }}
                >
                  <FileText size={15} color="#1F1B17" />
                  <span>{isSeedingDemo ? 'Loading Demo...' : 'Load MovilVentas Benchmark Demo'}</span>
                </button>
                )}
              </div>
            </div>
          ) : (
            /* DATA TABLE (Enterprise Tabular UI) */
            <div style={{
              background: 'var(--surface, #FFFFFF)',
              borderRadius: '20px',
              border: 'none',
              overflow: 'hidden',
              padding: '8px 12px 12px',
              boxShadow: '0 1px 2px rgba(31,27,23,.04), 0 8px 24px rgba(31,27,23,.05)'
            }}>
              <table className="goml-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Initiative &amp; Client</th>
                    <th style={{ width: '18%' }}>Archetype &amp; Cloud</th>
                    <th style={{ width: '14%' }}>Target Kick-off</th>
                    <th style={{ width: '18%' }}>Readiness Progress</th>
                    <th style={{ width: '12%' }}>Gatekeeper State</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(proj => (
                    <tr key={proj.id} style={{ transition: 'background 0.12s ease' }} onContextMenu={(e) => openMenu(e, proj)}>
                      {/* Initiative & Client */}
                      <td>
                        <div>
                          <a
                            href={`#prereq/${proj.id}`}
                            style={{
                              fontWeight: 700,
                              color: '#1F1B17',
                              textDecoration: 'none',
                              fontSize: '0.94rem',
                              display: 'block',
                              marginBottom: '0.25rem',
                              lineHeight: 1.35
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#ED7D31'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#1F1B17'}
                          >
                            {proj.name}
                          </a>
                          <div style={{ fontSize: '0.8rem', color: '#6E6862', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <Building2 size={13} color="#6E6862" />
                            <strong style={{ color: '#1F1B17' }}>{proj.client_name}</strong>
                            {proj.industry && (
                              <>
                                <span>•</span>
                                <span>{proj.industry.split('(')[0].trim()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Archetype & Cloud */}
                      <td>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#575049' }}>
                            {proj.type}
                          </div>
                          {proj.deployment && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: '#6E6862', marginTop: '0.2rem' }}>
                              <Server size={12} color="#6E6862" />
                              <span>{proj.deployment}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Target Kick-off */}
                      <td>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1F1B17' }}>
                          {proj.target_kickoff_date || 'TBD'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9A928A', marginTop: '0.15rem' }}>
                          Target SLA
                        </div>
                      </td>

                      {/* Readiness Progress */}
                      <td>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                            <span style={{ color: proj.score > 0 ? '#1F1B17' : '#71717A' }}>
                              {proj.score}% Score
                            </span>
                            <span style={{ color: '#71717A', fontWeight: 600 }}>
                              {proj.verified_items} / {proj.total_items}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'var(--soft)', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${proj.score}%`,
                                height: '100%',
                                borderRadius: '9999px',
                                backgroundColor: '#1F1B17'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Gatekeeper State */}
                      <td>
                        <div>
                          {getStatusBadge(proj.status)}
                          {proj.critical_blockers > 0 && (
                            <div style={{ fontSize: '0.74rem', color: '#EA580C', fontWeight: 700, marginTop: '0.25rem' }}>
                              {proj.critical_blockers} blocker{proj.critical_blockers > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            onClick={() => navigate(`/dashboard/${proj.id}`)}
                            style={{
                              background: '#1F1B17',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                            title="Open Initiative Workspace"
                          >
                            Workspace
                          </button>

                          <button
                            type="button"
                            className="row-more"
                            aria-label={`More actions for ${proj.name}`}
                            aria-haspopup="menu"
                            title="More actions (or right-click the row)"
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setCtx({ x: r.right - 4, y: r.bottom + 4, proj });
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {proj.score >= 90 && proj.critical_blockers === 0 && (
                            <button
                              onClick={() => navigate(`/certificate/${proj.id}`)}
                              style={{
                                background: '#FFF5EE',
                                color: '#EA580C',
                                border: '1.5px solid #FFD8BF',
                                borderRadius: '8px',
                                padding: '5px 9px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Official Kick-Off Certificate"
                            >
                              <Award size={14} />
                            </button>
                          )}

                          {canManage && (
                          <button
                            onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#9A928A',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#EA580C'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#9A928A'}
                            title="Delete Initiative"
                          >
                            <Trash2 size={15} />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredProjects.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: '#6E6862', fontSize: '13.5px' }}>
                        No initiatives match your search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 4. ESCALATION CENTER STRIP */}
      {stats?.recent_escalations && stats.recent_escalations.length > 0 && (
        <section style={{ padding: '2.5rem 0 0 0' }}>
          <div className="goml-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#ED7D31', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                  SLA GOVERNANCE
                </div>
                <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800, color: '#1F1B17' }}>Active Escalation Trail</h3>
              </div>
              <span className="goml-badge goml-badge-critical">
                {stats.recent_escalations.length} Active SLA Alerts
              </span>
            </div>

            <div style={{
              background: 'var(--surface)',
              borderRadius: '14px',
              border: '1px solid #E6E1DB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <table className="goml-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>Severity</th>
                    <th style={{ width: '38%' }}>Escalation Event</th>
                    <th style={{ width: '25%' }}>Recipient / Owner</th>
                    <th style={{ width: '15%' }}>Dispatched</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_escalations.map(esc => (
                    <tr key={esc.id}>
                      <td>
                        <span className={`goml-badge ${esc.level === 3 ? 'goml-badge-critical' : esc.level === 2 ? 'goml-badge-risk' : 'goml-badge-orange'}`}>
                          Tier {esc.level}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1F1B17', fontSize: '13px' }}>{esc.title}</div>
                        <div style={{ fontSize: '12px', color: '#6E6862', marginTop: '0.15rem' }}>{esc.message}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#575049', fontWeight: 500 }}>{esc.recipient}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#9A928A' }}>
                          {new Date(esc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a
                          href={`#prereq/${esc.project_id}`}
                          style={{
                            background: 'var(--soft)',
                            color: '#575049',
                            border: '1px solid #E6E1DB',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          Resolve
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
