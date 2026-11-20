import React, { useState, useEffect } from 'react';
import axios from '../api/client';
import { 
  CheckCircle, Clock, AlertTriangle, Upload, Plus, 
  ExternalLink, Lock, Sparkles, Award, Search, 
  CheckCircle2, XCircle, FileText, Send, Loader2, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Key,
  Building2, Copy, Calendar, Layers, Zap, ListChecks, Check, ShieldCheck, Filter, Eye, Download, RefreshCw,
  ArrowUpRight, LayoutGrid
} from 'lucide-react';
import { API_URL, BASE_URL } from '../apiConfig';
import { cleanOwner } from '../utils/helpers';
import { SubmitEvidenceModal } from '../components/SubmitEvidenceModal';
import { ViewProofModal } from '../components/ViewProofModal';
import { AddItemModal } from '../components/AddItemModal';
import { EscalateModal } from '../components/EscalateModal';
import { RejectModal } from '../components/RejectModal';
import { WeeklyPlanner } from '../components/WeeklyPlanner';

import { BRDViewerModal } from '../components/BRDViewerModal';
import { AIBundleModal } from '../components/AIBundleModal';
import { ProjectContextModal } from '../components/ProjectContextModal';
import { CredentialsTrackerModal } from '../components/CredentialsTrackerModal';

import { dialog } from '../utils/dialog';
const asArr = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
function PrereqDetails({ item }) {
  const Block = ({ title, children }) => (
    <div>
      <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: '#6E6862', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '13px', lineHeight: 1.55, color: '#1F1B17' }}>{children}</div>
    </div>
  );
  const list = (arr) => (
    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {arr.map((x, i) => <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>)}
    </ul>
  );
  const actions = asArr(item.client_actions);
  const done = asArr(item.completion_criteria);
  const deps = asArr(item.depends_on);
  return (
    <>
      {item.category && <Block title="Category">{item.category}</Block>}
      {item.why_it_is_needed && <Block title="Why it is needed">{item.why_it_is_needed}</Block>}
      {item.expected_evidence && <Block title="Expected evidence">{item.expected_evidence}</Block>}
      {actions.length > 0 && <Block title="What the client needs to do">{list(actions)}</Block>}
      {done.length > 0 && <Block title="Done when">{list(done)}</Block>}
      {item.risk_if_incomplete && <Block title="Risk if incomplete">{item.risk_if_incomplete}</Block>}
      {deps.length > 0 && <Block title="Depends on">{list(deps)}</Block>}
      {item.source_reference && <Block title="Source">{item.source_reference}</Block>}
    </>
  );
}

// Remember the order items first appeared in, so changing a status never makes a row jump.
const _order = {};
function stableOrder(projectId, items) {
  const map = (_order[projectId] = _order[projectId] || new Map());
  items.forEach((it) => { if (it && !map.has(it.id)) map.set(it.id, map.size); });
  return [...items].sort((a, b) => (map.get(a?.id) ?? 1e9) - (map.get(b?.id) ?? 1e9));
}

export const ProjectDashboard = ({ projectId, onOpenCopilot }) => {
  const id = projectId;
  // Hash-based navigation (Alchemist shell)
  const navigate = (path) => {
    if (path.startsWith('/dashboard/')) {
      window.location.hash = `#prereq/${path.replace('/dashboard/', '')}`;
    } else if (path.startsWith('/client/')) {
      window.location.hash = `#client/${path.replace('/client/', '')}`;
    } else if (path.startsWith('/certificate/')) {
      window.location.hash = `#certificate/${path.replace('/certificate/', '')}`;
    } else if (path === '/dashboard' || path === '/portfolio' || path === '/' || path === '/portfolio/') {
      window.location.hash = '#prereq';
    }
  };

  const [project, setProject] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [dashboardView, setDashboardView] = useState('SIMPLE'); // 'SIMPLE' | 'MATRIX' | 'PLANNER'

  // Modals & UI action states
  const [submitModalItem, setSubmitModalItem] = useState(null);
  const [viewProofModalItem, setViewProofModalItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBrdModalOpen, setIsBrdModalOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [escalateModalItem, setEscalateModalItem] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [internalSignoffLoading, setInternalSignoffLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const [reanalyzing, setReanalyzing] = useState(false);
  const [editingOwnerId, setEditingOwnerId] = useState(null);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [savingOwnerId, setSavingOwnerId] = useState(null);

  const startOwnerEdit = (item) => {
    setEditingOwnerId(item.id);
    setOwnerDraft(item.owner && item.owner !== 'Unassigned' ? item.owner : '');
  };

  const saveOwner = async (item) => {
    const nextOwner = ownerDraft.trim();
    if (!nextOwner) {
      alert('Enter an owner or responsible role before saving.');
      return;
    }
    setSavingOwnerId(item.id);
    try {
      const response = await axios.put(`${API_URL}/items/${item.id}`, { owner: nextOwner });
      setChecklist(current => current.map(row => row.id === item.id
        ? { ...row, ...(response.data || {}), owner: nextOwner }
        : row));
      setEditingOwnerId(null);
      setOwnerDraft('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not update prerequisite owner.');
    } finally {
      setSavingOwnerId(null);
    }
  };


  const handleRetryAnalysis = async () => {
    if (reanalyzing) return;
    setReanalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/projects/${id}/retry-analysis`, {});
      alert(`✅ Reanalysis complete: ${res.data.checklist_count} evidence-backed prerequisites extracted.`);
      await fetchProjectData();
    } catch (err) {
      console.error("Retry analysis error:", err);
      const errMsg = err.response?.data?.detail || err.message || "Failed to reanalyze SOW.";
      alert(`⚠️ Reanalysis failed: ${errMsg}`);
      await fetchProjectData();
    } finally {
      setReanalyzing(false);
    }
  };

  const fetchProjectData = async (retryCount = 0) => {
    try {
      const [projRes, checkRes] = await Promise.all([
        axios.get(`${API_URL}/projects/${id}`),
        axios.get(`${API_URL}/projects/${id}/checklist`)
      ]);
      setProject(projRes.data);
      setChecklist(Array.isArray(checkRes.data) ? checkRes.data : []);
      setFetchError(false);
      setLoading(false);
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.warn(`Error fetching project data (attempt ${retryCount + 1}):`, err);
      
      // Auto-retry up to 3 times in case of DB sync delay after document upload
      if (retryCount < 3) {
        setTimeout(() => {
          fetchProjectData(retryCount + 1);
        }, 600 * (retryCount + 1));
        return;
      }
      setFetchError(true);
      setLoading(false);
    }
  };

  const handleInternalSignoff = async () => {
    if (!(await dialog.confirm('This confirms the Pre-Req Tracker has been reviewed and is cleared for client handover.', { title: 'Confirm internal sign-off?', variant: 'question', confirmLabel: 'Sign off' }))) {
      return;
    }
    setInternalSignoffLoading(true);
    try {
      const res = await axios.post(`${API_URL}/projects/${id}/internal-review-signoff`, {
        reviewer: "Akshay (Team Lead) & Thasleema (Project Manager)",
        action: "Approve",
        notes: "Pre-Req Tracker verified internally according to minimal standard format."
      });
      setProject(res.data);
      alert("✅ Internal Governance Sign-off complete! Tracker is verified and approved by Akshay (Team Lead) & Thasleema (Project Manager).");
    } catch (err) {
      console.error("Signoff error:", err);
      alert("Failed to complete internal sign-off.");
    } finally {
      setInternalSignoffLoading(false);
    }
  };

  const isInternalApproved = project?.internal_review_status?.includes("Approved");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setFetchError(false);
    fetchProjectData();

    const interval = setInterval(() => {
      if (isMounted && !fetchError) {
        fetchProjectData(0);
      }
    }, 3000);

    const onFocus = () => {
      if (isMounted) fetchProjectData(0);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [id]);

  const handleManualVerify = async (itemId) => {
    try {
      await axios.post(`${API_URL}/items/${itemId}/verify`);
      fetchProjectData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Verification failed');
    }
  };

  const handleToggleCheck = async (e, item) => {
    e?.stopPropagation();
    const nextStatus = item.status === 'Verified' ? 'Pending' : 'Verified';
    try {
      await axios.put(`${API_URL}/items/${item.id}`, { status: nextStatus });
      fetchProjectData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update milestone status');
    }
  };

  const handleAiVerify = async (itemId) => {
    setVerifyingId(itemId);
    try {
      await axios.post(`${API_URL}/items/${itemId}/ai-verify`);
      fetchProjectData();
    } catch (err) {
      alert(err.response?.data?.detail || 'AI verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading || (!project && !fetchError)) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '4rem' }}>
        {/* Workspace Header Skeleton */}
        <section style={{ background: 'var(--surface)', paddingTop: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #E6E1DB' }}>
          <div className="goml-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div className="goml-skeleton" style={{ width: '160px', height: '18px', borderRadius: '6px' }} />
              <div className="goml-skeleton" style={{ width: '130px', height: '26px', borderRadius: '9999px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.65rem' }}>
                  <div className="goml-skeleton" style={{ width: '280px', height: '32px', borderRadius: '8px' }} />
                  <div className="goml-skeleton" style={{ width: '110px', height: '24px', borderRadius: '9999px' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                  <div className="goml-skeleton" style={{ width: '130px', height: '22px', borderRadius: '6px' }} />
                  <div className="goml-skeleton" style={{ width: '160px', height: '22px', borderRadius: '6px' }} />
                  <div className="goml-skeleton" style={{ width: '110px', height: '22px', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="goml-skeleton" style={{ width: '180px', height: '38px', borderRadius: '9999px' }} />
                <div className="goml-skeleton" style={{ width: '150px', height: '38px', borderRadius: '9999px' }} />
              </div>
            </div>
          </div>
        </section>

        {/* KPI Scorecard Grid Skeleton */}
        <section style={{ paddingTop: '1.75rem', paddingBottom: '1rem' }}>
          <div className="goml-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} style={{ background: 'var(--surface)', border: '1px solid #E6E1DB', borderRadius: '14px', padding: '1.35rem 1.5rem' }}>
                  <div className="goml-skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px', marginBottom: '12px' }} />
                  <div className="goml-skeleton" style={{ width: '80px', height: '36px', borderRadius: '6px', marginBottom: '8px' }} />
                  <div className="goml-skeleton" style={{ width: '140px', height: '12px', borderRadius: '4px' }} />
                </div>
              ))}
            </div>

            {/* Verification Table & Filter Skeleton */}
            <div style={{ background: 'var(--surface)', border: '1px solid #E6E1DB', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="goml-skeleton" style={{ width: '220px', height: '24px', borderRadius: '6px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="goml-skeleton" style={{ width: '90px', height: '32px', borderRadius: '8px' }} />
                  <div className="goml-skeleton" style={{ width: '90px', height: '32px', borderRadius: '8px' }} />
                  <div className="goml-skeleton" style={{ width: '90px', height: '32px', borderRadius: '8px' }} />
                </div>
              </div>

              {/* Table Rows Skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4, 5].map(rowIdx => (
                  <div key={rowIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid #F5F1EC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="goml-skeleton" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                      <div>
                        <div className="goml-skeleton" style={{ width: `${180 + (rowIdx * 35)}px`, height: '16px', borderRadius: '4px', marginBottom: '6px' }} />
                        <div className="goml-skeleton" style={{ width: '140px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="goml-skeleton" style={{ width: '90px', height: '24px', borderRadius: '9999px' }} />
                      <div className="goml-skeleton" style={{ width: '80px', height: '32px', borderRadius: '8px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!project || fetchError) {
    return (
      <div className="goml-container" style={{ padding: '6rem 1rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FEF7F0', border: '1px solid #FDEEE2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <AlertTriangle size={28} color="#ED7D31" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F1B17', margin: 0 }}>Initiative Workspace Sync Pending</h2>
        <p style={{ color: '#6E6862', fontSize: '13.5px', marginTop: '0.6rem', lineHeight: 1.6 }}>
          The requested project workspace (<code style={{ background: 'var(--soft)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{id?.slice(0, 12)}...</code>) is finalizing setup or experienced a brief sync delay.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              setLoading(true);
              setFetchError(false);
              fetchProjectData(0);
            }} 
            style={{
              background: '#ED7D31',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9999px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(237, 125, 49, 0.3)'
            }}
          >
            <RefreshCw size={14} />
            <span>Retry Workspace Load</span>
          </button>

          <button 
            onClick={() => navigate('/')} 
            style={{
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9999px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Return to Executive Portfolio
          </button>
        </div>
      </div>
    );
  }

  const safeChecklist = Array.isArray(checklist) ? checklist : [];

  const categories = Array.from(new Set(safeChecklist.map(i => i?.category || 'General')));

  const filteredItems = stableOrder(projectId, safeChecklist).filter(item => {
    if (!item) return false;
    const nameStr = (item.name || '').toLowerCase();
    const descStr = (item.description || '').toLowerCase();
    const ownerStr = (item.owner || '').toLowerCase();
    const query = (search || '').toLowerCase();

    const matchesSearch = nameStr.includes(query) ||
                          descStr.includes(query) ||
                          ownerStr.includes(query);
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' ||
      (selectedStatus === 'LOCKED' && item.is_locked) ||
      (item.status === selectedStatus);
    const matchesCritical = !onlyCritical || item.is_critical;

    return matchesSearch && matchesCategory && matchesStatus && matchesCritical;
  });

  const getStatusBadge = (status) => {
    if (status === 'Kick-off Cleared') {
      return (
        <span style={{
          background: '#1F1B17',
          color: '#FFFFFF',
          padding: '4px 14px',
          borderRadius: '9999px',
          fontSize: '11.5px',
          fontWeight: 700
        }}>
          Cleared for Kick-off
        </span>
      );
    }
    if (status === 'Critical / Blocked') {
      return (
        <span style={{
          background: '#FEF7F0',
          color: '#EA580C',
          border: '1.5px solid #FED7AA',
          padding: '4px 14px',
          borderRadius: '9999px',
          fontSize: '11.5px',
          fontWeight: 800
        }}>
          Critical Blocker
        </span>
      );
    }
    if (status === 'At Risk') {
      return (
        <span style={{
          background: '#FEF7F0',
          color: '#EA580C',
          border: '1.5px solid #FED7AA',
          padding: '4px 14px',
          borderRadius: '9999px',
          fontSize: '11.5px',
          fontWeight: 800
        }}>
          At Risk
        </span>
      );
    }
    return (
      <span style={{
        background: 'var(--bg)',
        color: '#1F1B17',
        border: '1.5px solid #E6E1DB',
        padding: '4px 14px',
        borderRadius: '9999px',
        fontSize: '11.5px',
        fontWeight: 600
      }}>
        In Progress
      </span>
    );
  };

  const blockersCount = safeChecklist.filter(i => i?.is_critical && i?.status !== 'Verified').length;
  const lockedCount = safeChecklist.filter(i => i?.is_locked).length;
  const inReviewCount = safeChecklist.filter(i => i?.status === 'Submitted' || i?.status === 'Verifying').length;
  const verifiedCount = safeChecklist.filter(i => i?.status === 'Verified').length;
  const pendingCount = safeChecklist.filter(i => i?.status !== 'Verified').length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Top Workspace Header Bar */}
      <section style={{ background: 'var(--surface)', paddingTop: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <div className="goml-container">
          {/* Breadcrumb & Client Link */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#6E6862' }}>
              <a
                href="#prereq"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#6E6862',
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'color 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#ED7D31'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#6E6862'; }}
                title="Return to Executive Portfolio"
              >
                <span>← Portfolio</span>
              </a>
              <span style={{ color: '#D8D0C7' }}>/</span>
              <span style={{ color: '#1F1B17', fontWeight: 600 }}>{project.client_name}</span>
              <span style={{ color: '#D8D0C7' }}>/</span>
              <span>Readiness Audit & Delivery Workspace</span>
            </div>

          </div>

          {/* Project Title & Action Pill Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ maxWidth: '720px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h1 style={{ fontSize: '1.95rem', fontWeight: 800, margin: 0, color: '#1F1B17', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                  {project.name}
                </h1>
                {getStatusBadge(project.status)}
              </div>

              {/* Clean Inline Metadata (Orange, Black & White Only - Zero Icon Clutter) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: '#6E6862', marginTop: '0.35rem' }}>
                <span>Client: <strong style={{ color: '#1F1B17', fontWeight: 700 }}>{project.client_name}</strong></span>

                <span style={{ color: '#D8D0C7' }}>•</span>

                <span>Type: <strong style={{ color: '#1F1B17', fontWeight: 600 }}>{project.type}</strong></span>

                <span style={{ color: '#D8D0C7' }}>•</span>

                <span>Kick-off: <strong style={{ color: '#1F1B17', fontWeight: 700 }}>{project.target_kickoff_date || 'TBD'}</strong></span>

                {project.deployment && (
                  <>
                    <span style={{ color: '#D8D0C7' }}>•</span>
                    <span style={{
                      background: '#FEF7F0',
                      color: '#EA580C',
                      border: '1.5px solid #FED7AA',
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: 700
                    }}>
                      {project.deployment}
                    </span>
                  </>
                )}

                {project.industry && (
                  <>
                    <span style={{ color: '#D8D0C7' }}>•</span>
                    <span style={{
                      background: 'var(--bg)',
                      color: '#1F1B17',
                      border: '1.5px solid #E6E1DB',
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: 700
                    }}>
                      {project.industry}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Clean Cohesive Material Action Pill Buttons (Text-First, Icon-Clutter-Free) */}
            <div className="pa-row">
              <button type="button" className="pa-btn" onClick={() => setIsBrdModalOpen(true)} title="View interactive 27-section Business Requirements Document">
                <Eye size={15} /> <span>View BRD</span>
              </button>
              <a className="pa-btn" href={`${API_URL}/projects/${id}/export-excel-tracker`} target="_blank" rel="noreferrer" title="Download the Excel pre-req tracker">
                <Download size={15} /> <span>Tracker (.xlsx)</span>
              </a>
              <a className="pa-btn" href={`${API_URL}/projects/${id}/export-brd-docx`} target="_blank" rel="noreferrer" title="Download the Word BRD">
                <FileText size={15} /> <span>BRD (.docx)</span>
              </a>

              <span className="pa-sep" aria-hidden="true" />

              <button type="button" className="pa-btn" title="Aimatic integration">
                <Sparkles size={15} /> <span>Aimatic</span>
              </button>
              <button type="button" className="pa-btn" onClick={() => setIsContextModalOpen(true)} title="Full project context to feed to an AI assistant">
                <Layers size={15} /> <span>Context</span>
              </button>
              {project.score >= 90 && blockersCount === 0 && (
                <button type="button" className="pa-btn" onClick={() => navigate(`/certificate/${id}`)}>
                  <Award size={15} /> <span>Certificate</span>
                </button>
              )}

              <span className="pa-sep" aria-hidden="true" />

              <button type="button" className="pa-btn" onClick={handleRetryAnalysis} disabled={reanalyzing} title="Re-run AI extraction on the original SOW text">
                <RefreshCw size={15} style={reanalyzing ? { animation: 'spin 1s linear infinite' } : undefined} /> <span>{reanalyzing ? 'Reanalyzing...' : 'Reanalyze SOW'}</span>
              </button>
              <button type="button" className="pa-btn primary" onClick={() => setIsAddModalOpen(true)}>
                <Plus size={15} /> <span>Add pre-requisite</span>
              </button>
            </div>
          </div>

          {/* Internal Governance Strip (Orange, Black & White Only - Clean & Uncluttered) */}
          <div style={{
            marginTop: '1.25rem',
            padding: '14px 24px',
            borderRadius: '20px',
            background: 'var(--surface)',
            border: '2px solid #E6E1DB',
            borderLeft: '5px solid #ED7D31',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1F1B17' }}>
                Internal Governance Review
              </span>
              <span style={{ fontSize: '12.5px', color: '#6E6862', fontWeight: 500 }}>
                {isInternalApproved
                  ? '• Approved & signed off by Akshay (Team Lead) & Thasleema (Project Manager)'
                  : '• Pending review by Akshay (Team Lead) & Thasleema (Project Manager)'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isInternalApproved ? (
                <button
                  type="button"
                  onClick={handleInternalSignoff}
                  disabled={internalSignoffLoading}
                  style={{
                    background: '#1F1B17',
                    color: '#FFFFFF',
                    border: '2px solid #1F1B17',
                    padding: '8px 22px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: internalSignoffLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(31, 27, 23, 0.15)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#ED7D31';
                    e.currentTarget.style.borderColor = '#ED7D31';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#1F1B17';
                    e.currentTarget.style.borderColor = '#1F1B17';
                  }}
                >
                  <span>{internalSignoffLoading ? 'Signing off...' : 'Sign Off (Akshay & Thasleema)'}</span>
                </button>
              ) : (
                <span style={{ fontSize: '12.5px', color: '#FFFFFF', fontWeight: 800, display: 'inline-flex', alignItems: 'center', background: '#1F1B17', padding: '6px 18px', borderRadius: '9999px' }}>
                  Signed & Cleared
                </span>
              )}
            </div>
          </div>

          {/* SOW Analysis Failed Alert Banner (Strict Orange, Black & White) */}
          {(project?.analysis_status === 'FAILED' || project?.status === 'Analysis Failed') && (
            <div style={{
              marginTop: '1rem',
              padding: '1.1rem 1.6rem',
              borderRadius: '20px',
              background: '#FEF7F0',
              border: '2px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 10px rgba(237, 125, 49, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#EA580C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>SOW Analysis Attention Required</span>
                    <span style={{ fontSize: '11px', background: '#1F1B17', color: '#FFFFFF', padding: '2px 9px', borderRadius: '9999px', fontWeight: 800 }}>
                      ACTION REQUIRED
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#6E6862', marginTop: '3px', maxWidth: '750px', lineHeight: 1.45, fontWeight: 500 }}>
                    {project.analysis_error || 'The AI model was unable to extract prerequisites from the proposal document.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRetryAnalysis}
                disabled={reanalyzing}
                style={{
                  background: '#1F1B17',
                  color: '#FFFFFF',
                  border: '2px solid #1F1B17',
                  padding: '8px 22px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: reanalyzing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(31, 27, 23, 0.15)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#ED7D31'; e.currentTarget.style.borderColor = '#ED7D31'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#1F1B17'; e.currentTarget.style.borderColor = '#1F1B17'; }}
              >
                <span>{reanalyzing ? 'Reanalyzing...' : 'Retry SOW Analysis'}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Dashboard Canvas: Unified Executive Workspace (Zero Card Clutter) */}
      <section style={{ paddingTop: '1.5rem', paddingBottom: '2.5rem' }}>
        <div className="goml-container">
          {/* Unified Executive Overview Surface */}
          <div style={{ marginBottom: '2.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1F1B17', margin: 0, letterSpacing: '-0.025em' }}>
                  Overview
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '13.5px', color: '#6E6862', fontWeight: 500 }}>
                  Real-time readiness velocity, gatekeeper status, and client deliverable progress.
                </p>
              </div>

              {/* Status pill toggles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#6E6862',
                  marginRight: '2px'
                }}>
                  Quick Filter:
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedStatus('ALL'); setOnlyCritical(true); }}
                  style={{
                    background: onlyCritical ? '#ED7D31' : '#FFFFFF',
                    color: onlyCritical ? '#FFFFFF' : '#1F1B17',
                    border: '2px solid',
                    borderColor: onlyCritical ? '#ED7D31' : '#E6E1DB',
                    borderRadius: '9999px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Blockers ({blockersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedStatus('ALL'); setOnlyCritical(false); setSelectedCategory('ALL'); }}
                  style={{
                    background: selectedStatus === 'ALL' && !onlyCritical && selectedCategory === 'ALL' ? '#1F1B17' : '#FFFFFF',
                    color: selectedStatus === 'ALL' && !onlyCritical && selectedCategory === 'ALL' ? '#FFFFFF' : '#1F1B17',
                    border: '2px solid',
                    borderColor: '#1F1B17',
                    borderRadius: '9999px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Seamless 4-Metric Executive Strip with Divider Rules (Material 3 Surface - Orange, Black & White Only) */}
            <div style={{
              background: 'var(--surface)',
              border: '2px solid #E6E1DB',
              borderRadius: '24px',
              padding: '1.6rem 2.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              {/* Metric 1: Readiness Score */}
              <div style={{ borderRight: '2px solid #F5F1EC', paddingRight: '1.5rem' }}>
                <div style={{ fontSize: '11.5px', color: '#6E6862', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Readiness Index
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1F1B17', letterSpacing: '-0.03em' }}>
                    {project.score}%
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: '#1F1B17',
                    background: 'var(--soft)',
                    border: '1px solid #E6E1DB',
                    padding: '2px 10px',
                    borderRadius: '9999px'
                  }}>
                    {verifiedCount} of {project.total_items} Cleared
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--soft)', borderRadius: '9999px', overflow: 'hidden', marginTop: '10px' }}>
                  <div style={{
                    width: `${project.score}%`,
                    height: '100%',
                    background: '#ED7D31',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Metric 2: Critical Gatekeepers */}
              <div style={{ borderRight: '2px solid #F5F1EC', paddingRight: '1.5rem' }}>
                <div style={{ fontSize: '11.5px', color: '#6E6862', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Critical Gatekeepers
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 800, color: blockersCount > 0 ? '#EA580C' : '#1F1B17', letterSpacing: '-0.03em' }}>
                    {blockersCount}
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: blockersCount > 0 ? '#EA580C' : '#1F1B17',
                    background: blockersCount > 0 ? '#FEF7F0' : '#FAF8F5',
                    border: blockersCount > 0 ? '1.5px solid #FED7AA' : '1px solid #E6E1DB',
                    padding: '2px 10px',
                    borderRadius: '9999px'
                  }}>
                    {blockersCount > 0 ? 'Action Required' : 'All Clear'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#6E6862', marginTop: '8px', fontWeight: 500 }}>
                  {blockersCount > 0 ? 'Mandatory for Day-1 client launch' : 'Zero blockers active'}
                </div>
              </div>

              {/* Metric 3: Total Milestones */}
              <div style={{ borderRight: '2px solid #F5F1EC', paddingRight: '1.5rem' }}>
                <div style={{ fontSize: '11.5px', color: '#6E6862', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Ledger Milestones
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1F1B17', letterSpacing: '-0.03em' }}>
                    {project.total_items}
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: '#1F1B17',
                    background: 'var(--soft)',
                    border: '1px solid #E6E1DB',
                    padding: '2px 10px',
                    borderRadius: '9999px'
                  }}>
                    {pendingCount} Open
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#6E6862', marginTop: '8px', fontWeight: 500 }}>
                  {inReviewCount > 0 ? `${inReviewCount} submitted for review` : 'Extracted from proposal SOW'}
                </div>
              </div>

              {/* Metric 4: Target Kick-off */}
              <div>
                <div style={{ fontSize: '11.5px', color: '#6E6862', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Target Kick-off
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F1B17', letterSpacing: '-0.02em' }}>
                    {project.target_kickoff_date || 'Day-1 Target'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: '#EA580C',
                    background: '#FEF7F0',
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    border: '1.5px solid #FED7AA'
                  }}>
                    {project.deployment || project.type || 'AWS Bedrock'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Domain Filter Chips (Orange, Black & White Only - Zero Icons) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '1.25rem',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569', marginRight: '4px' }}>
                Filter by Category:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '9999px',
                  fontSize: '13.5px',
                  fontWeight: selectedCategory === 'ALL' ? 800 : 700,
                  border: selectedCategory === 'ALL' ? '2.5px solid #ED7D31' : '2px solid #E6E1DB',
                  background: selectedCategory === 'ALL' ? '#ED7D31' : '#FFFFFF',
                  color: selectedCategory === 'ALL' ? '#FFFFFF' : '#1F1B17',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedCategory === 'ALL' ? '0 4px 14px rgba(237, 125, 49, 0.3)' : 'none',
                  fontFamily: 'inherit'
                }}
              >
                <span>All Categories ({checklist.length})</span>
              </button>

              {(project.category_scores || categories.map(c => ({ category: c, score: 0, verified: 0, total: 1 }))).map((cat, idx) => {
                const isSelected = selectedCategory === cat.category;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.category)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '9999px',
                      fontSize: '13.5px',
                      fontWeight: isSelected ? 800 : 700,
                      border: isSelected ? '2.5px solid #ED7D31' : '2px solid #E6E1DB',
                      background: isSelected ? '#ED7D31' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#1F1B17',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 14px rgba(237, 125, 49, 0.3)' : 'none',
                      fontFamily: 'inherit'
                    }}
                  >
                    <span>{cat.category}</span>
                    <span style={{
                      fontSize: '11.5px',
                      background: isSelected ? '#FFFFFF' : '#F5F1EC',
                      color: isSelected ? '#ED7D31' : '#6E6862',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 800
                    }}>
                      {cat.verified}/{cat.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PREREQUISITES & DELIVERABLES (100% TABLE-FREE!) */}
          <div style={{ marginTop: '1rem' }}>
            {/* Header & View Switcher */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: '#1F1B17', letterSpacing: '-0.02em' }}>
                  {dashboardView === 'PLANNER' ? 'Weekly Sprint Planner' : 'Prerequisites & Milestones'}
                </h2>
                <p style={{ color: '#6E6862', fontSize: '13px', margin: '0.25rem 0 0' }}>
                  {dashboardView === 'PLANNER'
                    ? 'Sprint delivery alignment mapped directly to technical prerequisites.'
                    : 'Interactive milestone cards — click any circle to verify or inspect evidence directly.'}
                </p>
              </div>

              {/* Material Segmented View Switcher (Exact CreateProject.jsx Signature) */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--bg)',
                border: '2px solid #E6E1DB',
                padding: '6px',
                borderRadius: '9999px',
                gap: '6px'
              }}>
                <button
                  type="button"
                  onClick={() => setDashboardView('SIMPLE')}
                  style={{
                    background: dashboardView === 'SIMPLE' ? '#ED7D31' : 'transparent',
                    color: dashboardView === 'SIMPLE' ? '#FFFFFF' : '#475569',
                    boxShadow: dashboardView === 'SIMPLE' ? '0 4px 14px rgba(237, 125, 49, 0.35)' : 'none',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: dashboardView === 'SIMPLE' ? 800 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <span>Cards Feed</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDashboardView('MATRIX')}
                  style={{
                    background: dashboardView === 'MATRIX' ? '#ED7D31' : 'transparent',
                    color: dashboardView === 'MATRIX' ? '#FFFFFF' : '#475569',
                    boxShadow: dashboardView === 'MATRIX' ? '0 4px 14px rgba(237, 125, 49, 0.35)' : 'none',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: dashboardView === 'MATRIX' ? 800 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <span>2-Col Grid</span>
                </button>

              </div>
            </div>

            {/* If Planner view is selected */}
            {dashboardView === 'PLANNER' ? (
              <WeeklyPlanner
                checklist={checklist}
                project={project}
                onProvideHandover={(item) => setSubmitModalItem(item)}
                onToggleCheck={handleToggleCheck}
              />
            ) : (
              <div>
                {/* Filter Toolbar with Material Segmented Pill Buttons (Zero Icon Clutter) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '1.4rem'
                }}>
                  {/* Material Segmented Status Switcher (Orange, Black & White Only) */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'var(--bg)',
                    border: '2px solid #E6E1DB',
                    padding: '6px',
                    borderRadius: '9999px',
                    gap: '6px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedStatus('ALL'); setOnlyCritical(false); }}
                      style={{
                        background: selectedStatus === 'ALL' && !onlyCritical ? '#1F1B17' : 'transparent',
                        color: selectedStatus === 'ALL' && !onlyCritical ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: selectedStatus === 'ALL' && !onlyCritical ? 800 : 700,
                        cursor: 'pointer',
                        boxShadow: selectedStatus === 'ALL' && !onlyCritical ? '0 4px 14px rgba(31, 27, 23, 0.25)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      All ({checklist.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => { setOnlyCritical(true); setSelectedStatus('ALL'); }}
                      style={{
                        background: onlyCritical ? '#ED7D31' : 'transparent',
                        color: onlyCritical ? '#FFFFFF' : '#EA580C',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: onlyCritical ? 800 : 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        boxShadow: onlyCritical ? '0 4px 14px rgba(237, 125, 49, 0.35)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <span>Blockers ({blockersCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSelectedStatus('Submitted'); setOnlyCritical(false); }}
                      style={{
                        background: selectedStatus === 'Submitted' ? '#ED7D31' : 'transparent',
                        color: selectedStatus === 'Submitted' ? '#FFFFFF' : '#EA580C',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: selectedStatus === 'Submitted' ? 800 : 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        boxShadow: selectedStatus === 'Submitted' ? '0 4px 14px rgba(237, 125, 49, 0.35)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <span>In Review ({inReviewCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSelectedStatus('Pending'); setOnlyCritical(false); }}
                      style={{
                        background: selectedStatus === 'Pending' ? '#1F1B17' : 'transparent',
                        color: selectedStatus === 'Pending' ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: selectedStatus === 'Pending' ? 800 : 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        boxShadow: selectedStatus === 'Pending' ? '0 4px 14px rgba(31, 27, 23, 0.25)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <span>To Do ({pendingCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSelectedStatus('Verified'); setOnlyCritical(false); }}
                      style={{
                        background: selectedStatus === 'Verified' ? '#1F1B17' : 'transparent',
                        color: selectedStatus === 'Verified' ? '#FFFFFF' : '#1F1B17',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: selectedStatus === 'Verified' ? 800 : 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        boxShadow: selectedStatus === 'Verified' ? '0 4px 14px rgba(31, 27, 23, 0.25)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <span>Verified ({verifiedCount})</span>
                    </button>
                  </div>

                  {/* Search Input Pill (Material 3 Styling aligned with CreateProject.jsx) */}
                  <div style={{ position: 'relative', minWidth: '260px' }}>
                    <Search size={16} color="#9A928A" strokeWidth={2.4} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search milestones, owners, tags..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{
                        padding: '10px 18px 10px 42px',
                        borderRadius: '9999px',
                        border: '2px solid #D8D0C7',
                        fontSize: '13.5px',
                        outline: 'none',
                        width: '100%',
                        background: 'var(--surface)',
                        color: '#1F1B17',
                        boxShadow: '0 1px 3px rgba(31, 27, 23, 0.03)',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'all 0.18s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#ED7D31';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(237, 125, 49, 0.18)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#D8D0C7';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* CLEAN MATERIAL MILESTONE LEDGER (Matching CreateProject.jsx) */}
                <div style={{
                  background: dashboardView === 'MATRIX' ? 'transparent' : '#FFFFFF',
                  borderRadius: dashboardView === 'MATRIX' ? '0' : '24px',
                  border: dashboardView === 'MATRIX' ? 'none' : '2px solid #E6E1DB',
                  overflow: 'hidden',
                  boxShadow: dashboardView === 'MATRIX' ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.03)',
                  display: dashboardView === 'MATRIX' ? 'grid' : 'block',
                  gridTemplateColumns: dashboardView === 'MATRIX' ? 'repeat(auto-fill, minmax(540px, 1fr))' : '1fr',
                  gap: dashboardView === 'MATRIX' ? '12px' : '0'
                }}>
                  {filteredItems.map((item, idx) => {
                    const isVerified = item.status === 'Verified';
                    const isSubmitted = item.status === 'Submitted' || item.status === 'Verifying';
                    const isVerifying = verifyingId === item.id;
                    const isLast = idx === filteredItems.length - 1;

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--surface)',
                          borderRadius: dashboardView === 'MATRIX' ? '20px' : '0',
                          border: dashboardView === 'MATRIX' ? '2px solid #E6E1DB' : 'none',
                          borderBottom: dashboardView === 'MATRIX' ? '2px solid #E6E1DB' : isLast ? 'none' : '1px solid #F5F1EC',
                          padding: '1.1rem 1.4rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1.25rem',
                          flexWrap: 'wrap',
                          boxShadow: dashboardView === 'MATRIX' ? '0 2px 10px rgba(0, 0, 0, 0.02)' : 'none'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#FAF8F5';
                          if (dashboardView === 'MATRIX') e.currentTarget.style.borderColor = '#1F1B17';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#FFFFFF';
                          if (dashboardView === 'MATRIX') e.currentTarget.style.borderColor = '#E6E1DB';
                        }}
                        title="Click to inspect proof and deliverable verification details"
                      >
                        {/* Left Side: Check Toggle + Badges + Title + Description + Metadata */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '320px' }}>
                          {/* Circular Toggle Check Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(e, item);
                            }}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: isVerified ? '#1F1B17' : isSubmitted ? '#FEF7F0' : '#FFFFFF',
                              border: isVerified ? 'none' : isSubmitted ? '2.5px solid #ED7D31' : item.is_critical ? '2.5px solid #ED7D31' : '2px solid #D8D0C7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                              transition: 'all 0.15s ease',
                              boxShadow: isVerified ? '0 2px 8px rgba(31, 27, 23, 0.25)' : 'none'
                            }}
                            title={isVerified ? "Mark as Pending" : "Mark as Verified"}
                          >
                            {isVerified && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                            {isSubmitted && !isVerified && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ED7D31' }} />}
                          </button>

                          {/* Content Details */}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {/* Badges strip (Orange, Black & White Only - Zero Icon Clutter) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              {item.is_critical && (
                                <span style={{
                                  background: '#FEF7F0',
                                  color: '#EA580C',
                                  border: '1.5px solid #FED7AA',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  padding: '3px 10px',
                                  borderRadius: '9999px'
                                }}>
                                  Critical Gatekeeper
                                </span>
                              )}

                            </div>

                            {/* Milestone Title */}
                            <div style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              color: '#1F1B17',
                              textDecoration: 'none',
                              lineHeight: 1.35,
                              marginBottom: '4px',
                              letterSpacing: '-0.01em'
                            }}>
                              {item.name}
                            </div>

                            {/* Brief Description */}
                            <div style={{ fontSize: '13px', color: '#6E6862', lineHeight: 1.45, marginBottom: '8px', fontWeight: 500 }}>
                              {item.description}
                            </div>

                            {/* Rejection alert if any */}
                            {item.rejection_reason && (
                              <div style={{ background: '#FEF7F0', border: '1.5px solid #FED7AA', color: '#EA580C', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '8px' }}>
                                <strong>Rejection Note:</strong> {item.rejection_reason}
                              </div>
                            )}

                            {expandedItemId === item.id && (
                            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '10px', padding: '14px 16px', background: 'var(--bg)', border: '1px solid #E6E1DB', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <PrereqDetails item={item} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#6E6862', flexWrap: 'wrap' }}>
                              {editingOwnerId === item.id ? (
                                <>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Owner</span>
                                    <input
                                      value={ownerDraft}
                                      onChange={(e) => setOwnerDraft(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveOwner(item);
                                        if (e.key === 'Escape') setEditingOwnerId(null);
                                      }}
                                      placeholder="Name or responsible role"
                                      aria-label={`Owner for ${item.name}`}
                                      style={{ width: '180px', padding: '5px 10px', border: '2px solid #D8D0C7', borderRadius: '9999px', fontSize: '12px', color: '#1F1B17', outline: 'none' }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    disabled={savingOwnerId === item.id}
                                    onClick={(e) => { e.stopPropagation(); saveOwner(item); }}
                                    style={{ border: '2px solid #000000', background: '#000000', color: '#FFFFFF', borderRadius: '9999px', padding: '4px 12px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 800 }}
                                  >
                                    {savingOwnerId === item.id ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setEditingOwnerId(null); }}
                                    style={{ border: '2px solid #E6E1DB', background: 'var(--surface)', borderRadius: '9999px', padding: '4px 12px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700 }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span>Owner: <strong style={{ color: '#1F1B17' }}>{cleanOwner(item.owner)}</strong></span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); startOwnerEdit(item); }}
                                    aria-label={`Edit owner for ${item.name}`}
                                    title="Assign or change owner"
                                    style={{ border: '1.5px solid #D8D0C7', background: 'var(--surface)', borderRadius: '9999px', padding: '2px 9px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#575049' }}
                                  >
                                    Assign
                                  </button>
                                </>
                              )}

                              {item.due_date && (
                                <>
                                  <span>•</span>
                                  <span>Due: <strong style={{ color: '#1F1B17' }}>{item.due_date}</strong></span>
                                </>
                              )}
                            </div>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Status Badge + Direct Action Buttons (Zero Clutter) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {/* Status Badge */}
                          {isVerified ? (
                            <span className="pd-pill ok">
                              <Check size={13} strokeWidth={3} /> Verified
                            </span>
                          ) : isSubmitted ? (
                            <span className="pd-pill warn">In Review</span>
                          ) : null}

                          <button
                            type="button"
                            className="pr-expand"
                            aria-expanded={expandedItemId === item.id}
                            aria-label={expandedItemId === item.id ? 'Hide details' : 'Show details'}
                            title={expandedItemId === item.id ? 'Hide details' : 'Show details'}
                            onClick={(e) => { e.stopPropagation(); setExpandedItemId(expandedItemId === item.id ? null : item.id); }}
                          >
                            {expandedItemId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {/* Verify & AI Verify buttons if in review */}
                          {isSubmitted && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManualVerify(item.id);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #ED7D31 0%, #EA580C 100%)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '9999px',
                                  padding: '7px 18px',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  boxShadow: '0 3px 10px rgba(237, 125, 49, 0.35)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                              >
                                <span>Verify</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAiVerify(item.id);
                                }}
                                disabled={isVerifying}
                                style={{
                                  background: 'var(--surface)',
                                  color: '#ED7D31',
                                  border: '2px solid #FED7AA',
                                  borderRadius: '9999px',
                                  padding: '7px 16px',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ED7D31'; e.currentTarget.style.background = '#FEF7F0'; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#FED7AA'; e.currentTarget.style.background = '#FFFFFF'; }}
                              >
                                {isVerifying && <Loader2 className="animate-spin" size={13} />}
                                <span>{isVerifying ? 'Evaluating...' : 'AI Verify'}</span>
                              </button>
                            </>
                          )}

                          {/* Submit Evidence Button if not cleared & not in review */}
                          {!isVerified && !isSubmitted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubmitModalItem(item);
                              }}
                              style={{
                                background: '#1F1B17',
                                color: '#FFFFFF',
                                border: '2px solid #1F1B17',
                                borderRadius: '9999px',
                                padding: '7px 18px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                boxShadow: '0 2px 8px rgba(31, 27, 23, 0.15)',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#ED7D31';
                                e.currentTarget.style.borderColor = '#ED7D31';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = '#1F1B17';
                                e.currentTarget.style.borderColor = '#1F1B17';
                              }}
                            >
                              <span>Submit</span>
                            </button>
                          )}

                          {/* Reset Button if verified */}
                          {isVerified && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCheck(e, item);
                              }}
                              className="pd-soft-btn"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                  {filteredItems.length === 0 && (
                    <div style={{
                      background: 'var(--surface)',
                      borderRadius: '20px',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      border: '1px solid #E6E1DB',
                      color: '#6E6862'
                    }}>
                      {project?.analysis_status === 'FAILED' ? (
                        <div>
                          <div style={{ fontWeight: 800, color: '#EA580C', fontSize: '15px', marginBottom: '6px' }}>AI SOW Analysis Attention Required</div>
                          <div style={{ fontSize: '13px', color: '#6E6862', maxWidth: '500px', margin: '0 auto 16px auto', lineHeight: 1.5, fontWeight: 500 }}>
                            {project.analysis_error || 'Prerequisites could not be generated. Use the Reanalyze button to retry extraction.'}
                          </div>
                          <button
                            type="button"
                            onClick={handleRetryAnalysis}
                            disabled={reanalyzing}
                            style={{
                              background: '#1F1B17',
                              color: '#FFFFFF',
                              border: '2px solid #1F1B17',
                              borderRadius: '9999px',
                              padding: '8px 22px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: reanalyzing ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              boxShadow: '0 2px 8px rgba(31, 27, 23, 0.15)',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#ED7D31'; e.currentTarget.style.borderColor = '#ED7D31'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#1F1B17'; e.currentTarget.style.borderColor = '#1F1B17'; }}
                          >
                            <span>{reanalyzing ? 'Reanalyzing...' : 'Retry SOW Analysis'}</span>
                          </button>
                        </div>
                      ) : checklist.length === 0 ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#575049', fontSize: '15px', marginBottom: '6px' }}>No Prerequisites Extracted</div>
                          <div style={{ fontSize: '13px', color: '#9A928A', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
                            The document analysis completed, but no explicit client prerequisites were identified in the source text.
                          </div>
                        </div>
                      ) : (
                        <div>No prerequisites match your current filters.</div>
                      )}
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      <ViewProofModal
        isOpen={!!viewProofModalItem}
        item={viewProofModalItem}
        project={project}
        onClose={() => setViewProofModalItem(null)}
        onUpdated={fetchProjectData}
        onOpenRejectModal={(it) => setRejectModalItem(it)}
      />

      <SubmitEvidenceModal
        isOpen={!!submitModalItem}
        onClose={() => setSubmitModalItem(null)}
        item={submitModalItem}
        allowVerify
        onSubmitted={fetchProjectData}
      />

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectId={id}
        existingItems={checklist}
        onItemAdded={fetchProjectData}
      />

      <EscalateModal
        isOpen={!!escalateModalItem}
        onClose={() => setEscalateModalItem(null)}
        item={escalateModalItem}
        onEscalated={fetchProjectData}
      />

      <RejectModal
        isOpen={!!rejectModalItem}
        onClose={() => setRejectModalItem(null)}
        item={rejectModalItem}
        onRejected={fetchProjectData}
      />

      {isBrdModalOpen && (
        <BRDViewerModal
          projectId={id}
          projectName={project.name}
          onClose={() => setIsBrdModalOpen(false)}
        />
      )}

      {isCredsModalOpen && (
        <CredentialsTrackerModal
          checklist={checklist}
          projectName={project.name}
          projectId={id}
          clientName={project.client_name}
          onItemAdded={() => { try { fetchProjectData(); } catch (e) {} }}
          onClose={() => setIsCredsModalOpen(false)}
          onOpenItem={(it) => { setIsCredsModalOpen(false); setSubmitModalItem(it); }}
        />
      )}

      {isContextModalOpen && (
        <ProjectContextModal
          projectId={id}
          projectName={project.name}
          onClose={() => setIsContextModalOpen(false)}
        />
      )}

      {isBundleModalOpen && (
        <AIBundleModal
          projectId={id}
          projectName={project.name}
          onClose={() => setIsBundleModalOpen(false)}
        />
      )}
    </div>
  );
};
