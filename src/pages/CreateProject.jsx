import React, { useState, useEffect, useRef } from 'react';
import { useTemplates, useCreateProject, useAnalyzeSow, isCancelled } from '../api/preq';
import lottie from 'lottie-web';
import scanningAnimation from '../assets/scanning-animation.json';
import {
  Upload, Cpu, ArrowRight, Layers, Sparkles, Loader2, CheckCircle2, X, Check,
  Key, Eye, EyeOff, ExternalLink, ShieldCheck, AlertTriangle, RotateCcw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Typography,
  Box
} from '@mui/material';

import { GoMLDatePicker } from '../components/GoMLDatePicker';
import { MaterialSelect } from '../components/MaterialSelect';

const ScanningLottiePlayer = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    let anim = null;
    if (containerRef.current) {
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: scanningAnimation
      });
    }
    return () => {
      if (anim) {
        anim.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '90px',
        height: '90px',
        margin: '0 auto 1.25rem auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1
      }}
    />
  );
};

const renderUploadedFileIcon = (file) => {
  const name = file?.name?.toLowerCase() || '';
  let badgeText = 'DOC';

  if (name.endsWith('.pdf')) {
    badgeText = 'PDF';
  } else if (name.match(/\.(docx|doc|odt|rtf|pages)$/i)) {
    badgeText = 'DOC';
  } else if (name.match(/\.(pptx|ppt|key|odp|potx|ppsx)$/i)) {
    badgeText = 'PPT';
  } else if (name.match(/\.(xlsx|xls|csv|tsv|numbers|ods)$/i)) {
    badgeText = 'XLS';
  } else if (name.match(/\.(txt|md|json|yaml|yml|xml|html)$/i)) {
    badgeText = 'TXT';
  }

  return (
    <div style={{
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      background: 'var(--bg)',
      border: '1.5px solid #E6E1DB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      position: 'relative',
      marginBottom: '0.25rem'
    }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Document Icon in pure BLACK */}
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        {/* Dedicated File Badge (PDF, DOC, PPT, XLS) in solid BLACK with white text */}
        <span style={{
          position: 'absolute',
          bottom: '1px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontSize: '9px',
          fontWeight: 900,
          letterSpacing: '0.05em',
          padding: '1px 4px',
          borderRadius: '3px',
          lineHeight: 1.1
        }}>
          {badgeText}
        </span>
      </div>
    </div>
  );
};

export const CreateProject = () => {
  // Hash-based navigation (Alchemist shell): read ?tab= from the current hash
  const hashQuery = typeof window !== 'undefined' ? window.location.hash.split('?')[1] || '' : '';
  const hashSearchParams = new URLSearchParams(hashQuery);
  const initialTab = hashSearchParams.get('tab') === 'sow' ? 'sow' : 'wizard';
  const [tab, setTab] = useState(initialTab);
  const navigate = (path) => {
    if (path.startsWith('/dashboard/')) {
      window.location.hash = `#prereq/${path.replace('/dashboard/', '')}`;
    } else if (path === '/' || path === '/dashboard') {
      window.location.hash = '#prereq';
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    const basePath = (window.location.hash.split('?')[0] || '#prereq/new');
    window.location.hash = newTab === 'sow' ? `${basePath}?tab=sow` : basePath;
  };

  // Dynamic Catalog State
  const [projectTypes, setProjectTypes] = useState([
    { id: "GenAI / LLM Application", label: "GenAI & LLM Application", desc: "Foundation models, RAG, token limits, AI safety" },
    { id: "Cloud Migration & Modernization", label: "Cloud Migration", desc: "Landing zone, IAM federation, VPN/interconnect" },
    { id: "Enterprise Data Platform & Lakehouse", label: "Data Platform & Lakehouse", desc: "Object storage, CDC replicas, data governance" },
    { id: "Full-Stack Web & Microservices", label: "Web & Microservices", desc: "Kubernetes, CI/CD runners, OIDC auth" },
    { id: "Cybersecurity & Zero Trust Architecture", label: "Cybersecurity & Zero Trust", desc: "MFA tokens, SIEM ingestion, ZTNA connector" },
    { id: "ERP / CRM Enterprise System Integration", label: "ERP / CRM Integration", desc: "Sandboxes, OData APIs, mTLS certs" }
  ]);
  const [industries, setIndustries] = useState([
    "BFSI (Banking & Financial Services)",
    "Healthcare & Life Sciences",
    "Retail & E-Commerce",
    "Manufacturing & Supply Chain",
    "Public Sector & GovTech",
    "FinTech & Digital Payments"
  ]);
  const [deployments, setDeployments] = useState([
    "AWS Cloud",
    "Microsoft Azure",
    "Google Cloud Platform (GCP)",
    "Hybrid & On-Premise",
    "Multi-Cloud Kubernetes"
  ]);

  // Wizard state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [projectType, setProjectType] = useState("GenAI / LLM Application");
  const [customProjectType, setCustomProjectType] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);

  const [industry, setIndustry] = useState("BFSI (Banking & Financial Services)");
  const [customIndustry, setCustomIndustry] = useState('');
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);

  const [deployment, setDeployment] = useState("AWS Cloud");
  const [customDeployment, setCustomDeployment] = useState('');
  const [isCustomDeployment, setIsCustomDeployment] = useState(false);

  const [kickoffDate, setKickoffDate] = useState('');
  const createProject = useCreateProject();
  const wizardLoading = createProject.isPending;
  const [wizardError, setWizardError] = useState('');

  // SOW state
  const [file, setFile] = useState(null);
  const [sowText, setSowText] = useState('');
  const analyzeSow = useAnalyzeSow();
  const sowLoading = analyzeSow.isPending;
  const [sowStatus, setSowStatus] = useState('');
  // Live countdown while the proposal is being analysed
  const [sowElapsed, setSowElapsed] = useState(0);
  const sowEstimateRef = useRef(40);
  useEffect(() => {
    if (!sowLoading) { setSowElapsed(0); return undefined; }
    const startedAt = Date.now();
    setSowElapsed(0);
    const timer = setInterval(() => setSowElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(timer);
  }, [sowLoading]);
  const [sowError, setSowError] = useState('');
  const [sowErrorDetail, setSowErrorDetail] = useState('');
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [isDropzoneHovered, setIsDropzoneHovered] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);


  // Template options come from the server (a query, fetched once). They set the starting choices the first time they arrive.
  const templatesQ = useTemplates({ staleTime: Infinity, refetchOnWindowFocus: false });
  const templatesApplied = useRef(false);
  useEffect(() => {
    const data = templatesQ.data;
    if (!data || templatesApplied.current) return;
    templatesApplied.current = true;
    if (Array.isArray(data.project_types) && data.project_types.length > 0) {
      const formatted = data.project_types.map(t => {
        if (typeof t === 'string') {
          return { id: t, label: t, desc: 'Enterprise architecture delivery blueprint' };
        }
        return t;
      });
      setProjectTypes(formatted);
      setProjectType(formatted[0].id);
    }
    if (Array.isArray(data.industries) && data.industries.length > 0) {
      setIndustries(data.industries);
      setIndustry(data.industries[0]);
    }
    if (Array.isArray(data.deployment_targets) && data.deployment_targets.length > 0) {
      setDeployments(data.deployment_targets);
      setDeployment(data.deployment_targets[0]);
    }
  }, [templatesQ.data]);

  const handleCreateWizard = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setWizardError('Initiative name is required.');
      return;
    }
    setWizardError('');

    const finalType = isCustomType ? (customProjectType.trim() || 'Custom Archetype') : projectType;
    const finalIndustry = isCustomIndustry ? (customIndustry.trim() || 'General Enterprise') : industry;
    const finalDeployment = isCustomDeployment ? (customDeployment.trim() || 'Multi-Cloud') : deployment;

    try {
      const created = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        client_name: clientName.trim() || 'Enterprise Client',
        client_email: clientEmail.trim() || 'sponsor@client.com',
        type: finalType,
        industry: finalIndustry,
        deployment: finalDeployment,
        target_kickoff_date: kickoffDate || ''
      });

      navigate(`/dashboard/${created.id}`);
    } catch (err) {
      console.error(err);
      setWizardError(err.response?.data?.detail || 'Failed to initialize project.');
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSowStatus('');
  };

  const handleClearSowForm = () => {
    setFile(null);
    setSowText('');
    setSowError('');
    setSowErrorDetail('');
    setShowErrorDetail(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault?.();
    if (!file && !sowText.trim()) {
      setSowError('Please upload any project document, slide deck, spreadsheet, or paste Statement of Work text.');
      return;
    }
    setSowError('');
    setSowErrorDetail('');
    setShowErrorDetail(false);
    await executeAnalyzeSOW();
  };

  const executeAnalyzeSOW = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Estimate total time from document size (chunks are analysed in parallel)
    const approxChars = file ? Math.round((file.size || 0) * 0.5) : (sowText || '').length;
    sowEstimateRef.current = Math.min(120, 18 + 8 * Math.max(1, Math.ceil(approxChars / 7600)));
    setSowError('');
    setSowErrorDetail('');
    setShowErrorDetail(false);
    setSowStatus('Connecting to Gemini ultra-fast inference engine...');

    try {
      setTimeout(() => {
        if (!controller.signal.aborted) setSowStatus('Extracting client scope, technology stack & security boundaries...');
      }, 1200);
      setTimeout(() => {
        if (!controller.signal.aborted) setSowStatus('Generating tailored prerequisites across Data, Env, Compliance & People...');
      }, 2400);

      const analysed = await analyzeSow.mutateAsync({ file, text: sowText, signal: controller.signal });

      navigate(`/dashboard/${analysed.id}`);
    } catch (err) {
      if (isCancelled(err)) {
        console.log('SOW analysis cancelled by user.');
        setSowStatus('');
        return;
      }

      console.error('SOW analysis request failed:', err.response?.status, JSON.stringify(err.response?.data?.detail ?? err.message), {
        status: err.response?.status,
        detail: err.response?.data?.detail,
        data: err.response?.data,
        message: err.message
      });

      let rawDetail = err.response?.data?.detail;
      if (Array.isArray(rawDetail)) {
        rawDetail = rawDetail.map((item) => {
          const field = Array.isArray(item.loc) ? item.loc.join(' → ') : 'request';
          return `${field}: ${item.msg || 'Invalid value'}`;
        }).join('; ');
      } else if (typeof rawDetail !== 'string') {
        rawDetail = err.message || '';
      }

      const isTechnicalDump = /Gemini models failed|Groq models failed|rate-limited|rate limit|truncated at max_tokens|json_validate_failed|Error code: 400|Traceback/i.test(rawDetail);

      const friendlyMsg = isTechnicalDump
        ? "We couldn't complete the full analysis for this proposal. This can occur when Gemini API quota limits are reached or the document requires more processing tokens. Please try a shorter section, or ask an admin to check the AI service key on the server."
        : (rawDetail || (err.response?.status === 422
          ? 'The uploaded proposal format is not readable. Try a standard text PDF, DOCX, or plain text file.'
          : (err.response?.status === 503
            ? 'Gemini inference failed or key is invalid. Please verify your Gemini API key and retry.'
            : 'AI SOW analysis encountered an issue while processing your document.')));

      setSowError(friendlyMsg);
      setSowErrorDetail(isTechnicalDump ? rawDetail : '');
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Full-Page AI SOW Analysis Screen
  if (sowLoading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 68px)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif'
      }}>
        {/* Ambient Warm Glow in Header */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '240px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(237, 125, 49, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Lottie Animation */}
        <ScanningLottiePlayer />

        {/* Title */}
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: 800,
          color: '#1F1B17',
          margin: '0 0 0.75rem 0',
          letterSpacing: '-0.03em',
          position: 'relative',
          zIndex: 1
        }}>
          AI SOW Analysis in Progress
        </h2>

        {/* Live Dynamic Status Message */}
        <div style={{
          fontWeight: 700,
          color: '#ED7D31',
          fontSize: '16.5px',
          minHeight: '26px',
          marginBottom: '2rem',
          lineHeight: 1.45,
          position: 'relative',
          zIndex: 1,
          maxWidth: '640px'
        }}>
          {sowStatus || 'Extracting scope and architectural requirements...'}
        </div>

        {/* Progress Track with time remaining */}
        {(() => {
          const est = sowEstimateRef.current;
          const remaining = Math.max(0, est - sowElapsed);
          const overrun = sowElapsed > est;
          const pct = overrun ? 95 : Math.min(95, Math.round((sowElapsed / est) * 90));
          const fmtT = (t) => (t >= 60 ? `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, '0')}s` : `${t}s`);
          return (
            <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto 2rem auto', position: 'relative', zIndex: 1 }}>
              <div style={{
                height: '8px', borderRadius: '9999px', background: '#FDEEE2',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`,
                  background: 'linear-gradient(90deg, #ED7D31, #FB923C)', borderRadius: '9999px',
                  transition: 'width 0.5s ease'
                }} />
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: '30%',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                  animation: 'gomlScanBeam 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: '10px',
                fontSize: '13px', fontWeight: 600, color: '#6E6862'
              }}>
                <span>{pct}%</span>
                <span>
                  {overrun
                    ? 'Taking a little longer than usual - still working...'
                    : `About ${fmtT(remaining)} left`}
                </span>
                <span>Elapsed {fmtT(sowElapsed)}</span>
              </div>
            </div>
          );
        })()}

        {/* Pipeline Stages */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '13.5px',
          fontWeight: 700,
          position: 'relative',
          zIndex: 1,
          marginBottom: '2.5rem'
        }}>
          <span style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            background: sowStatus.includes('Uploading') ? '#000000' : '#F5F1EC',
            color: sowStatus.includes('Uploading') ? '#FFFFFF' : '#475569',
            border: sowStatus.includes('Uploading') ? '1.5px solid #000000' : '1.5px solid #E6E1DB',
            transition: 'all 0.2s ease'
          }}>
            1. Ingest SOW
          </span>
          <span style={{ color: '#D8D0C7', fontSize: '16px' }}>→</span>
          <span style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            background: sowStatus.includes('Extracting') ? '#000000' : '#F5F1EC',
            color: sowStatus.includes('Extracting') ? '#FFFFFF' : '#475569',
            border: sowStatus.includes('Extracting') ? '1.5px solid #000000' : '1.5px solid #E6E1DB',
            transition: 'all 0.2s ease'
          }}>
            2. Scope Extraction
          </span>
          <span style={{ color: '#D8D0C7', fontSize: '16px' }}>→</span>
          <span style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            background: sowStatus.includes('Generating') ? '#000000' : '#F5F1EC',
            color: sowStatus.includes('Generating') ? '#FFFFFF' : '#475569',
            border: sowStatus.includes('Generating') ? '1.5px solid #000000' : '1.5px solid #E6E1DB',
            transition: 'all 0.2s ease'
          }}>
            3. Day-1 Matrix
          </span>
        </div>

        {/* Cancel Analysis Button */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            onClick={handleCancelAnalysis}
            style={{
              padding: '12px 36px',
              borderRadius: '9999px',
              border: '2px solid #000000',
              background: 'var(--surface)',
              color: '#000000',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              transition: 'all 0.18s ease',
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#000000';
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = '#000000';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <X size={17} strokeWidth={2.5} />
            <span>Cancel Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: 'var(--bg)',
      padding: '3rem 2rem 5rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      boxSizing: 'border-box',
      fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Executive Page Title & Intro */}
      <div style={{ textAlign: 'center', marginBottom: '2.25rem', maxWidth: '840px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          color: '#1F1B17',
          letterSpacing: '-0.03em',
          margin: '0 0 0.75rem 0',
          lineHeight: 1.25,
          fontFamily: 'inherit'
        }}>
          Initialize New Project Matrix
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: '#6E6862',
          margin: 0,
          lineHeight: 1.55,
          fontWeight: 500
        }}>
          Configure enterprise blueprint parameters or ingest client proposal documents to generate day-1 readiness matrices and BRDs.
        </p>
      </div>

      {/* Material Segmented Switcher (Large & Tactile) */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg)',
        border: '2px solid #E6E1DB',
        padding: '7px',
        borderRadius: '9999px',
        gap: '8px',
        marginBottom: '3rem'
      }}>
        <button
          type="button"
          onClick={() => handleTabChange('wizard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 38px',
            borderRadius: '9999px',
            fontSize: '16.5px',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            background: tab === 'wizard' ? '#ED7D31' : 'transparent',
            color: tab === 'wizard' ? '#FFFFFF' : '#475569',
            boxShadow: tab === 'wizard' ? '0 4px 16px rgba(237, 125, 49, 0.35)' : 'none',
            fontFamily: 'inherit'
          }}
        >
          <span>Interactive Blueprint Wizard</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('sow')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 38px',
            borderRadius: '9999px',
            fontSize: '16.5px',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            background: tab === 'sow' ? '#ED7D31' : 'transparent',
            color: tab === 'sow' ? '#FFFFFF' : '#475569',
            boxShadow: tab === 'sow' ? '0 4px 16px rgba(237, 125, 49, 0.35)' : 'none',
            fontFamily: 'inherit'
          }}
        >
          <span>Proposal Upload & BRD Generator</span>
        </button>
      </div>

      {/* SOW / Proposal View: Large, Grand, Seamless Canvas */}
      {tab === 'sow' && (
        <div style={{
          maxWidth: '960px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <form onSubmit={handleAnalyze} style={{ width: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>


              <h2 style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: '#1F1B17',
                margin: '0 0 0.6rem 0',
                letterSpacing: '-0.025em',
                fontFamily: 'inherit'
              }}>
                Proposal Ingestion & BRD Generator
              </h2>
              <p style={{
                color: '#475569',
                fontSize: '16.5px',
                margin: 0,
                lineHeight: 1.6,
                maxWidth: '780px',
                marginLeft: 'auto',
                marginRight: 'auto',
                fontWeight: 500
              }}>
                Upload DOC/DOCX, PPT/PPTX, or PDF proposal documents. The AI engine automatically generates a <strong>27-Section BRD Document</strong> and a <strong>Minimal Pre-Req Tracker</strong> for internal review by Akshay (Team Lead) &amp; Thasleema (Project Manager).
              </p>
            </div>

            {/* Hidden file input for changing file */}
            <input
              type="file"
              ref={fileInputRef}
              accept="*/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setSowError('');
                  setSowErrorDetail('');
                  setShowErrorDetail(false);
                }
              }}
              style={{ display: 'none' }}
            />

            {/* Material Tactile Dropzone */}
            {file ? (
              <div
                style={{
                  border: 'none',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '24px',
                  padding: '2.5rem 2rem',
                  textAlign: 'center',
                  marginBottom: '2rem',
                  boxShadow: '0 1px 2px rgba(31,27,23,.04), 0 10px 30px rgba(31,27,23,.07)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                  {renderUploadedFileIcon(file)}
                  <span style={{ fontWeight: 800, fontSize: '18px', color: '#1F1B17' }}>{file.name}</span>
                  <span style={{ fontSize: '14.5px', color: '#6E6862', fontWeight: 600 }}>
                    {(file.size / 1024).toFixed(1)} KB • {
                      file.name.match(/\.(pptx|ppt|potx|ppsx|odp|key)$/i) ? 'PowerPoint / Presentation Deck' :
                        file.name.match(/\.pdf$/i) ? 'PDF Document' :
                          file.name.match(/\.(docx|doc|odt|pages|rtf)$/i) ? 'Word / Rich Text Document' :
                            file.name.match(/\.(xlsx|xls|csv|tsv|numbers|ods)$/i) ? 'Spreadsheet / Tabular Data' :
                              file.name.match(/\.(txt|md|json|yaml|yml|xml|html)$/i) ? 'Text / Markup / Structured' :
                                file.name.match(/\.(zip|tar|gz)$/i) ? 'Archive Package' : 'Universal Document'
                    } • Ready for AI extraction
                  </span>

                  {/* Immediate Action Buttons on Uploaded File */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setSowError('');
                        setSowErrorDetail('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        background: 'color-mix(in srgb, #E11D48 10%, var(--surface))',
                        color: '#E11D48',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 22px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#FFE4E6';
                        e.currentTarget.style.borderColor = '#FDA4AF';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#FFF1F2';
                        e.currentTarget.style.borderColor = '#FECDD3';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <X size={15} /> Cancel / Remove file
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'var(--soft)',
                        color: 'var(--ink)',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '8px 22px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#E6E1DB';
                        e.currentTarget.style.borderColor = '#9A928A';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#F5F1EC';
                        e.currentTarget.style.borderColor = '#D8D0C7';
                      }}
                    >
                      <Upload size={15} /> Change file
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onMouseEnter={() => setIsDropzoneHovered(true)}
                onMouseLeave={() => setIsDropzoneHovered(false)}
                style={{
                  border: isDropzoneHovered ? '2.5px dashed #ED7D31' : '2px dashed #FDBA74',
                  backgroundColor: isDropzoneHovered ? 'var(--accent-soft)' : 'var(--soft)',
                  borderRadius: '20px',
                  padding: '3.25rem 2.25rem',
                  textAlign: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  marginBottom: '2rem',
                  boxShadow: isDropzoneHovered ? '0 8px 24px rgba(237, 125, 49, 0.14)' : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.18s ease'
                }}
              >
                <input
                  type="file"
                  accept="*/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setSowError('');
                      setSowErrorDetail('');
                      setShowErrorDetail(false);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#1F1B17',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
                  }}>
                    <Upload size={28} color="#FFFFFF" />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '19px', color: '#1F1B17', letterSpacing: '-0.01em' }}>
                    Click or drag any Document, Slide Deck, or Spreadsheet here
                  </span>

                  <span style={{ fontSize: '14px', color: '#6E6862', fontWeight: 500, marginTop: '2px' }}>
                    Universal AI Ingestion: <strong style={{ color: '#1F1B17' }}>Any file format supported</strong> (Presentations, Docs, Sheets, Archives, Raw Text)
                  </span>
                </div>
              </div>
            )}

            {/* Material Outlined Text Field (Larger) */}
            <div style={{ marginBottom: '2.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '15.5px', fontWeight: 800, color: '#1F1B17', marginBottom: '0.65rem' }}>
                Or Paste Proposal / Scope Narrative
              </label>
              <textarea
                className="goml-input"
                rows={4}
                placeholder="Paste the Statement of Work text, deliverables, architecture stack, and client responsibilities..."
                value={sowText}
                onChange={(e) => {
                  setSowText(e.target.value);
                  if (sowError) {
                    setSowError('');
                    setSowErrorDetail('');
                  }
                }}
                style={{
                  width: '100%',
                  borderRadius: '18px',
                  border: 'none',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                  background: 'var(--soft)',
                  color: 'var(--ink)',
                  padding: '18px 22px',
                  boxShadow: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px #ED7D31, 0 8px 24px rgba(31,27,23,.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'var(--soft)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {sowError && (
              <div style={{
                background: '#FFFDF9',
                border: '1.5px solid #FED7AA',
                borderRadius: '18px',
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 16px rgba(237, 125, 49, 0.08)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: '#FEF7F0',
                      border: '1.5px solid #FDBA74',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ED7D31',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <AlertTriangle size={20} strokeWidth={2.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '16.5px',
                        fontWeight: 800,
                        color: '#1F1B17',
                        letterSpacing: '-0.01em'
                      }}>
                        Analysis Incomplete
                      </h4>
                      <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '14.5px',
                        color: '#475569',
                        lineHeight: 1.55,
                        fontWeight: 500
                      }}>
                        {sowError}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleAnalyze}
                          style={{
                            background: 'var(--soft)',
                            color: '#575049',
                            border: '1px solid #D8D0C7',
                            borderRadius: '9999px',
                            padding: '6px 16px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#E6E1DB'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#F5F1EC'; }}
                        >
                          <RotateCcw size={14} /> Retry Analysis
                        </button>

                        {sowErrorDetail && (
                          <button
                            type="button"
                            onClick={() => setShowErrorDetail(!showErrorDetail)}
                            style={{
                              background: 'transparent',
                              color: '#6E6862',
                              border: 'none',
                              padding: '6px 10px',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{showErrorDetail ? 'Hide details' : 'Show details'}</span>
                            {showErrorDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>

                      {showErrorDetail && sowErrorDetail && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px 14px',
                          background: 'var(--bg)',
                          borderRadius: '8px',
                          border: '1px solid #E6E1DB',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: '#6E6862',
                          wordBreak: 'break-word',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {sowErrorDetail}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSowError('');
                      setSowErrorDetail('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9A928A',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#1F1B17'; e.currentTarget.style.background = '#F5F1EC'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = '#9A928A'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              {(file || sowText) && (
                <button
                  type="button"
                  onClick={handleClearSowForm}
                  disabled={sowLoading}
                  style={{
                    padding: '17px 36px',
                    fontSize: '16.5px',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    border: '2px solid #D8D0C7',
                    background: 'var(--surface)',
                    color: '#475569',
                    cursor: sowLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseOver={(e) => {
                    if (!sowLoading) {
                      e.currentTarget.style.borderColor = '#9A928A';
                      e.currentTarget.style.background = '#FAF8F5';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!sowLoading) {
                      e.currentTarget.style.borderColor = '#D8D0C7';
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <X size={17} />
                  <span>Cancel / Clear</span>
                </button>
              )}

              <button
                type="submit"
                disabled={sowLoading}
                style={{
                  padding: '18px 52px',
                  fontSize: '17.5px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: sowLoading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ED7D31 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  opacity: sowLoading ? 0.7 : 1,
                  boxShadow: '0 8px 26px rgba(237, 125, 49, 0.42)',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => {
                  if (!sowLoading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FF8A3D 0%, #ED7D31 100%)';
                    e.currentTarget.style.boxShadow = '0 10px 32px rgba(237, 125, 49, 0.52)';
                    e.currentTarget.style.transform = 'translateY(-1.5px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!sowLoading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ED7D31 0%, #EA580C 100%)';
                    e.currentTarget.style.boxShadow = '0 8px 26px rgba(237, 125, 49, 0.42)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!sowLoading) {
                    e.currentTarget.style.transform = 'translateY(1px)';
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(237, 125, 49, 0.3)';
                  }
                }}
              >
                <span>{sowLoading ? 'Analyzing SOW...' : 'Analyze SOW & Generate Kick-off Graph'}</span>
              </button>
            </div>
          </form>


        </div>
      )}

      {/* Wizard View: Spacious, Grand, Structured */}
      {tab === 'wizard' && (
        <div style={{
          maxWidth: '1180px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <form onSubmit={handleCreateWizard}>
            {/* Top Grid: Profile + Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#1F1B17', marginBottom: '0.75rem' }}>
                  Initiative Name *
                </label>
                <input
                  type="text"
                  className="goml-input"
                  placeholder="e.g. Apex Wealth Advisory AI Copilot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    background: 'var(--surface)',
                    border: '2px solid #D8D0C7',
                    borderRadius: '16px',
                    fontSize: '17.5px',
                    padding: '18px 22px',
                    height: '58px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#1F1B17', marginBottom: '0.75rem' }}>
                  Client Organization
                </label>
                <input
                  type="text"
                  className="goml-input"
                  placeholder="e.g. Apex Global Wealth Management"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    background: 'var(--surface)',
                    border: '2px solid #D8D0C7',
                    borderRadius: '16px',
                    fontSize: '17.5px',
                    padding: '18px 22px',
                    height: '58px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Archetype Selector (Dynamic Grid + Custom Option) */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                <label style={{ fontSize: '17px', fontWeight: 800, color: '#1F1B17', margin: 0 }}>
                  Select Archetype Blueprint
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomType(!isCustomType)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ED7D31',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {isCustomType ? '← Choose from Catalog' : '+ Define Custom Blueprint'}
                </button>
              </div>

              {isCustomType ? (
                <div style={{ background: '#FFFDFB', border: '2px solid #FED7AA', borderRadius: '16px', padding: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '14.5px', fontWeight: 800, color: '#1F1B17', marginBottom: '0.55rem' }}>
                    Custom Archetype / Delivery Scope *
                  </label>
                  <input
                    type="text"
                    className="goml-input"
                    placeholder="e.g. AI-Powered Autonomous Supply Chain Forecaster"
                    value={customProjectType}
                    onChange={(e) => setCustomProjectType(e.target.value)}
                    required={isCustomType}
                    style={{ background: 'var(--surface)', border: '2px solid #D8D0C7', borderRadius: '14px', fontSize: '17px', padding: '16px 20px', height: '56px', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    {projectTypes.map(pt => {
                      const isSelected = (!isCustomType && projectType === pt.id);
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => {
                            setProjectType(pt.id);
                            setIsCustomType(false);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '15px 28px',
                            borderRadius: '9999px',
                            fontSize: '16px',
                            fontWeight: isSelected ? 800 : 700,
                            border: isSelected ? '2.5px solid #ED7D31' : '2px solid #E6E1DB',
                            background: isSelected ? '#FEF7F0' : '#FFFFFF',
                            color: isSelected ? '#ED7D31' : '#575049',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 4px 14px rgba(237, 125, 49, 0.22)' : 'none',
                            fontFamily: 'inherit'
                          }}
                        >
                          {isSelected && <Check size={18} color="#ED7D31" strokeWidth={3} />}
                          <span>{pt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!isCustomType && (
                    <div style={{
                      fontSize: '15px',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingLeft: '6px',
                      fontWeight: 600,
                      marginTop: '8px'
                    }}>
                      <span style={{ color: '#ED7D31', fontWeight: 900, fontSize: '18px' }}>•</span>
                      <span>{projectTypes.find(pt => pt.id === projectType)?.desc || ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Dropdowns row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2.25rem', marginBottom: '2.75rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '16.5px', fontWeight: 800, color: '#1F1B17', margin: 0 }}>
                    Industry Vertical
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomIndustry(!isCustomIndustry)}
                    style={{ background: 'transparent', border: 'none', color: '#ED7D31', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isCustomIndustry ? 'Standard' : 'Custom'}
                  </button>
                </div>
                {isCustomIndustry ? (
                  <input
                    type="text"
                    className="goml-input"
                    placeholder="Enter custom industry"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    style={{ background: 'var(--surface)', border: '2px solid #D8D0C7', borderRadius: '16px', fontSize: '16.5px', padding: '16px 20px', height: '58px', boxSizing: 'border-box' }}
                  />
                ) : (
                  <MaterialSelect
                    value={industry}
                    onChange={(val) => setIndustry(val)}
                    options={industries}
                    placeholder="Select industry vertical"
                  />
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '16.5px', fontWeight: 800, color: '#1F1B17', margin: 0 }}>
                    Deployment Platform
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDeployment(!isCustomDeployment)}
                    style={{ background: 'transparent', border: 'none', color: '#ED7D31', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isCustomDeployment ? 'Standard' : 'Custom'}
                  </button>
                </div>
                {isCustomDeployment ? (
                  <input
                    type="text"
                    className="goml-input"
                    placeholder="e.g. On-Prem OpenShift & AWS"
                    value={customDeployment}
                    onChange={(e) => setCustomDeployment(e.target.value)}
                    style={{ background: 'var(--surface)', border: '2px solid #D8D0C7', borderRadius: '16px', fontSize: '16.5px', padding: '16px 20px', height: '58px', boxSizing: 'border-box' }}
                  />
                ) : (
                  <MaterialSelect
                    value={deployment}
                    onChange={(val) => setDeployment(val)}
                    options={deployments}
                    placeholder="Select deployment platform"
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '16.5px', fontWeight: 800, color: '#1F1B17', marginBottom: '0.75rem' }}>
                  Target Kick-Off Date
                </label>
                <GoMLDatePicker
                  value={kickoffDate}
                  onChange={(dateStr) => setKickoffDate(dateStr)}
                  placeholder="Select kick-off date"
                />
              </div>
            </div>

            {wizardError && (
              <div style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '15px', fontWeight: 700 }}>
                {wizardError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', marginTop: '1.75rem' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '18px 42px',
                  fontSize: '16.5px',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  border: '2px solid #D8D0C7',
                  background: 'var(--surface)',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#9A928A';
                  e.currentTarget.style.color = '#1F1B17';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#D8D0C7';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={wizardLoading}
                style={{
                  padding: '19px 54px',
                  fontSize: '18px',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ED7D31 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 28px rgba(237, 125, 49, 0.42)',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #FF8A3D 0%, #ED7D31 100%)';
                  e.currentTarget.style.boxShadow = '0 10px 34px rgba(237, 125, 49, 0.52)';
                  e.currentTarget.style.transform = 'translateY(-1.5px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ED7D31 0%, #EA580C 100%)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(237, 125, 49, 0.42)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(237, 125, 49, 0.3)';
                }}
              >
                {wizardLoading && <Loader2 className="animate-spin" size={20} />}
                <span>Initialize Pre-requisite Matrix</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

