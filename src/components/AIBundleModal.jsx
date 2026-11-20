import { useState, useEffect, useMemo } from 'react';
import { Package, Copy, Check, Download, X, Loader2, FileText, Layers, Sparkles } from 'lucide-react';
import { buildAIContextBundle } from '../utils/aiContextBuilder';

// ══════════════════════════════════════════════════════════════════════
//   AIBundleModal — Alchemist-styled AI Context Bundle viewer
//   Shows the full copyable project context and auto-downloads the
//   bundle so it can be dropped straight into any AI coding tool.
// ══════════════════════════════════════════════════════════════════════

export const AIBundleModal = ({ projectId, projectName, onClose }) => {
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Build the context once on open
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    buildAIContextBundle(projectId)
      .then(text => { if (active) setContext(text); })
      .catch(err => { if (active) setError(err?.message || 'Failed to generate the bundle.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  // Auto-download the bundle as soon as it is ready
  useEffect(() => {
    if (!loading && context && !downloaded) {
      triggerDownload();
      setDownloaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, context]);

  const meta = useMemo(() => {
    const words = context.trim() ? context.trim().split(/\s+/).length : 0;
    const sections = (context.match(/^SECTION \d+/gm) || []).length;
    return { words: words.toLocaleString(), chars: context.length.toLocaleString(), sections };
  }, [context]);

  const fileName = `${(projectName || 'Project').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_AI_Context_Bundle.txt`;

  const triggerDownload = () => {
    const blob = new Blob([context || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(context);
    } catch {
      // Fallback: select the <pre> content via Selection API and copy
      try {
        const ta = document.getElementById('ai-bundle-context');
        if (ta) {
          const range = document.createRange();
          range.selectNodeContents(ta);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
        }
      } catch (_) {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(31, 27, 23, 0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(960px, 96vw)', height: '86vh',
          background: 'var(--surface)', borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(31,27,23,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* ── Header ── */}
        <div style={{
          flexShrink: 0, padding: '18px 24px',
          background: 'linear-gradient(135deg, #FDF6EE 0%, #FDEEE2 100%)',
          borderBottom: '1px solid #E6E1DB',
          display: 'flex', alignItems: 'center', gap: '14px'
        }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, #F28C28 0%, #E0761A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(242, 140, 40, 0.3)', color: '#fff'
          }}>
            <Package size={22} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#1F1B17', letterSpacing: '-0.01em' }}>
                AI Context Bundle
              </h3>
              <span style={{
                fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em',
                padding: '3px 8px', borderRadius: '9999px',
                background: '#1F1B17', color: '#F28C28', textTransform: 'uppercase'
              }}>
                Aimatic Ready
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6E6862', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Full project context for {projectName || 'this initiative'} — paste into any AI coding agent
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px', height: '34px', flexShrink: 0,
              borderRadius: '50%', border: '1px solid #E6E1DB',
              background: 'var(--surface)', color: '#6E6862', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#1F1B17'; e.currentTarget.style.color = '#1F1B17'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#E6E1DB'; e.currentTarget.style.color = '#6E6862'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Meta strip ── */}
        {!loading && !error && (
          <div style={{
            flexShrink: 0, padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            background: 'var(--bg)', borderBottom: '1px solid #E6E1DB'
          }}>
            {[
              { icon: <Layers size={13} />, label: `${meta.sections} sections` },
              { icon: <FileText size={13} />, label: `${meta.words} words` },
              { icon: <Package size={13} />, label: `${meta.chars} chars` },
              { icon: <Sparkles size={13} />, label: 'Auto-downloaded ✓' }
            ].map((chip, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '9999px',
                background: 'var(--soft)', border: '1px solid #E6E1DB',
                fontSize: '11.5px', fontWeight: 700, color: '#575049'
              }}>
                {chip.icon}{chip.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
              <Loader2 size={34} color="#F28C28" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6E6862' }}>
                Fetching project, prerequisites & 27-section BRD…
              </p>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '2rem' }}>
              <div style={{ fontSize: '40px' }}>⚠️</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#E8604A' }}>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px', borderRadius: '9999px', border: 'none',
                  background: '#1F1B17', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <pre
              id="ai-bundle-context"
              tabIndex={0}
              style={{
                flex: 1, margin: 0, padding: '20px 24px',
                overflow: 'auto', outline: 'none',
                fontFamily: "ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace",
                fontSize: '12.5px', lineHeight: 1.6,
                color: '#1F1B17', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                userSelect: 'text', cursor: 'text'
              }}
            >
              {context}
            </pre>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && !error && (
          <div style={{
            flexShrink: 0, padding: '14px 24px',
            background: 'var(--bg)', borderTop: '1px solid #E6E1DB',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <span style={{ fontSize: '12px', color: '#9A928A', fontWeight: 600 }}>
              Select all → Ctrl+C also works · {fileName}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={triggerDownload}
                style={{
                  height: '40px', padding: '0 20px', borderRadius: '9999px',
                  background: 'var(--surface)', color: '#1F1B17',
                  border: '1.5px solid #E6E1DB', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
                  transition: 'all 0.15s'
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#1F1B17'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#E6E1DB'; }}
              >
                <Download size={14} />
                Download .txt
              </button>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  height: '40px', padding: '0 24px', borderRadius: '9999px', border: 'none',
                  background: copied ? '#3E9B5C' : '#1F1B17',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(31,27,23,0.25)', transition: 'all 0.15s'
                }}
                onMouseOver={e => { if (!copied) e.currentTarget.style.background = '#000'; }}
                onMouseOut={e => { if (!copied) e.currentTarget.style.background = '#1F1B17'; }}
              >
                {copied ? <Check size={15} color="#C9F2D6" /> : <Copy size={14} />}
                {copied ? 'Copied to clipboard!' : 'Copy Context'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIBundleModal;
