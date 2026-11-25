import { useEffect, useMemo, useState } from 'react';
import { useProjectContext } from '../api/preq';
import { BookOpen, Copy, Check, Download, X, Loader2, FileText, Code2, Eye } from 'lucide-react';
import {
  CONTEXT_SECTIONS,
  composeProjectContext,
  estimateTokens,
} from '../utils/projectContext';

// Project Context provider: the full project context as one Markdown
// document, ready to paste into any AI assistant. Centered dialog.
export const ProjectContextModal = ({ projectId, projectName, onClose }) => {
  // The context document is a query: fetched when the dialog opens, cached for the next time.
  const contextQ = useProjectContext(projectId, { refetchOnWindowFocus: false });
  const data = contextQ.data ?? null;
  const loading = contextQ.isPending;
  const error = contextQ.isError
    ? `Could not load project context${contextQ.error?.response?.status ? ` (HTTP ${contextQ.error.response.status})` : ''}.`
    : '';
  const [copied, setCopied] = useState(false);
  const [include, setInclude] = useState(() =>
    Object.fromEntries(CONTEXT_SECTIONS.map((s) => [s.key, s.on]))
  );
  // 'md' = copy raw markdown, 'prompt' = copy as plain AI-prompt text
  const [copyFormat, setCopyFormat] = useState('prompt');
  // 'preview' = rendered HTML view, 'raw' = monospace source
  const [previewMode, setPreviewMode] = useState('preview');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const markdown = useMemo(() => composeProjectContext(data, include), [data, include]);
  const tokens = estimateTokens(markdown);
  const fileName = `${(projectName || 'Project').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Context.md`;

  /** Strip markdown syntax so the text reads naturally when pasted into an AI chat. */
  const toPlainPrompt = (md) =>
    md
      .replace(/^#{1,6}\s+/gm, '')          // remove heading markers
      .replace(/\*\*(.+?)\*\*/g, '$1')       // **bold** → plain
      .replace(/\*(.+?)\*/g, '$1')           // *italic* → plain
      .replace(/`(.+?)`/g, '$1')             // `code` → plain
      .replace(/^\s*[-*]\s+/gm, '- ')        // normalise list bullets
      .replace(/\n{3,}/g, '\n\n')            // collapse extra blank lines
      .trim();

  const copyText = copyFormat === 'md' ? markdown : toPlainPrompt(markdown);

  /**
   * Minimal markdown → HTML renderer (no external dep).
   * Handles: h1-h6, bold, italic, inline code, code blocks,
   * unordered lists, ordered lists, blockquotes, horizontal rules,
   * and blank-line paragraphs.
   */
  const renderMarkdown = (md) => {
    if (!md) return '';
    const escape = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const inlineStyles = (s) =>
      s
        .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;padding:1px 5px;border-radius:4px;font-size:0.88em;font-family:ui-monospace,monospace;color:#0F172A">$1</code>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>');

    const lines = md.split('\n');
    const out = [];
    let inCode = false, codeLines = [], codeLang = '';
    let inUl = false, inOl = false, inBlockquote = false;

    const closeList = () => {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
    };
    const closeBq = () => {
      if (inBlockquote) { out.push('</blockquote>'); inBlockquote = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw;

      // Fenced code block
      if (/^```/.test(line)) {
        if (!inCode) {
          closeList(); closeBq();
          codeLang = line.slice(3).trim();
          inCode = true; codeLines = [];
        } else {
          out.push(`<pre style="background:#1E293B;color:#E2E8F0;padding:14px 18px;border-radius:10px;overflow-x:auto;font-size:12.5px;line-height:1.6;margin:12px 0"><code>${escape(codeLines.join('\n'))}</code></pre>`);
          inCode = false; codeLines = []; codeLang = '';
        }
        continue;
      }
      if (inCode) { codeLines.push(raw); continue; }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        closeList(); closeBq();
        out.push('<hr style="border:none;border-top:1px solid #E2E8F0;margin:18px 0"/>');
        continue;
      }

      // Headings
      const hm = line.match(/^(#{1,6})\s+(.*)/);
      if (hm) {
        closeList(); closeBq();
        const lvl = hm[1].length;
        const sizes = ['1.5rem','1.25rem','1.1rem','1rem','0.95rem','0.9rem'];
        const mt = lvl === 1 ? '28px' : lvl === 2 ? '22px' : '14px';
        out.push(`<h${lvl} style="font-size:${sizes[lvl-1]};font-weight:${lvl<=2?700:600};color:#0F172A;margin:${mt} 0 6px;line-height:1.3;border-bottom:${lvl<=2?'1px solid #F1F5F9':''};padding-bottom:${lvl<=2?'6px':'0'}">${inlineStyles(escape(hm[2]))}</h${lvl}>`);
        continue;
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        closeList();
        if (!inBlockquote) { out.push('<blockquote style="border-left:3px solid #ED7D31;padding:4px 14px;margin:10px 0;color:#475569;background:#FFFDF9;border-radius:0 6px 6px 0">'); inBlockquote = true; }
        out.push(`<p style="margin:4px 0">${inlineStyles(escape(line.replace(/^>\s?/,'')))}</p>`);
        continue;
      } else { closeBq(); }

      // Unordered list
      const ulm = line.match(/^(\s*)([-*+])\s+(.*)/);
      if (ulm) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul style="margin:8px 0 8px 0;padding-left:20px;list-style:none">'); inUl = true; }
        out.push(`<li style="padding:3px 0;display:flex;gap:7px;align-items:baseline"><span style="color:#ED7D31;font-weight:700;flex-shrink:0">•</span><span>${inlineStyles(escape(ulm[3]))}</span></li>`);
        continue;
      }

      // Ordered list
      const olm = line.match(/^\d+\.\s+(.*)/);
      if (olm) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol style="margin:8px 0 8px 0;padding-left:20px">'); inOl = true; }
        out.push(`<li style="padding:3px 0">${inlineStyles(escape(olm[1]))}</li>`);
        continue;
      }

      // Blank line = close lists + paragraph break
      if (!line.trim()) {
        closeList(); closeBq();
        out.push('<div style="height:8px"></div>');
        continue;
      }

      // Plain paragraph
      closeList(); closeBq();
      out.push(`<p style="margin:4px 0;line-height:1.65;color:#1E293B">${inlineStyles(escape(line))}</p>`);
    }
    closeList(); closeBq();
    if (inCode) out.push(`<pre style="background:#1E293B;color:#E2E8F0;padding:14px 18px;border-radius:10px;overflow-x:auto;font-size:12.5px"><code>${escape(codeLines.join('\n'))}</code></pre>`);
    return out.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggle = (key) => setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  const setAll = (on) => setInclude(Object.fromEntries(CONTEXT_SECTIONS.map((s) => [s.key, on])));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, padding: '24px',
        background: 'rgba(31, 27, 23, 0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="prereq-context-dialog"
        style={{
          width: 'min(1080px, 100%)', height: 'min(760px, 100%)',
          background: 'var(--surface, #fff)', border: '1px solid var(--line, #E6E1DB)',
          borderRadius: 'var(--r, 14px)', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(30,20,10,.16), 0 2px 8px rgba(30,20,10,.08)',
          display: 'flex', flexDirection: 'column', animation: 'popInDialog 0.18s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line, #E6E1DB)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft, #FDEEE2)', color: 'var(--accent-text, #E0761A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Project context</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted, #6E6862)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Everything about {projectName || 'this project'}, ready to paste into an AI assistant. Secrets are never included.
            </p>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Close" style={{ padding: '5px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="prereq-context-body" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* Section picker */}
          <div style={{ width: 270, flexShrink: 0, borderRight: '1px solid var(--line, #E6E1DB)', padding: '14px 16px', overflowY: 'auto', background: 'var(--soft, #F5F1EC)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted, #6E6862)' }}>Include</span>
              <span style={{ fontSize: 12 }}>
                <a href="#all" onClick={(e) => { e.preventDefault(); setAll(true); }} style={{ color: 'var(--accent-text, #E0761A)' }}>All</a>
                {' / '}
                <a href="#none" onClick={(e) => { e.preventDefault(); setAll(false); }} style={{ color: 'var(--accent-text, #E0761A)' }}>None</a>
              </span>
            </div>
            {CONTEXT_SECTIONS.map((s) => (
              <label key={s.key} className="ctx-opt" data-on={include[s.key] ? 'true' : 'false'}>
                <input type="checkbox" checked={!!include[s.key]} onChange={() => toggle(s.key)} />
                <span className="ctx-opt-text">
                  <span className="ctx-opt-title">{s.label}</span>
                  <span className="ctx-opt-hint">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Preview */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Preview / Raw toggle bar */}
            {!loading && !error && markdown && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--line, #E6E1DB)', background: 'var(--soft, #F5F1EC)' }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('preview')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                    background: previewMode === 'preview' ? '#FFFFFF' : 'transparent',
                    color: previewMode === 'preview' ? 'var(--accent-text, #E0761A)' : 'var(--muted, #6E6862)',
                    boxShadow: previewMode === 'preview' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('raw')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                    background: previewMode === 'raw' ? '#FFFFFF' : 'transparent',
                    color: previewMode === 'raw' ? 'var(--accent-text, #E0761A)' : 'var(--muted, #6E6862)',
                    boxShadow: previewMode === 'raw' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Code2 size={13} /> Raw
                </button>
              </div>
            )}
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted, #6E6862)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Building project context...
              </div>
            ) : error ? (
              <div style={{ padding: 24, color: 'var(--bad, #E8604A)', fontSize: 14 }}>{error}</div>
            ) : previewMode === 'preview' ? (
              <div
                style={{
                  flex: 1, overflow: 'auto', padding: '20px 28px',
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontSize: 13.5, lineHeight: 1.65,
                  background: 'var(--surface, #fff)', color: 'var(--ink, #1F1B17)',
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
              />
            ) : (
              <pre
                id="prereq-context-text"
                style={{
                  flex: 1, margin: 0, padding: '16px 20px', overflow: 'auto',
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: 'var(--surface, #fff)', color: 'var(--ink, #1F1B17)',
                }}
              >
                {markdown}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line, #E6E1DB)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted, #6E6862)', marginRight: 'auto' }}>
            {loading || error ? '' : `${markdown.length.toLocaleString()} characters  |  about ${tokens.toLocaleString()} tokens`}
          </span>

          {/* Format toggle: Prompt vs Markdown */}
          {!loading && !error && markdown && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--line, #E6E1DB)',
              borderRadius: 8,
              overflow: 'hidden',
              fontSize: 12.5,
              fontWeight: 600,
            }}>
              <button
                type="button"
                onClick={() => setCopyFormat('prompt')}
                title="Copy as plain AI prompt text (no markdown symbols)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px',
                  border: 'none', cursor: 'pointer',
                  background: copyFormat === 'prompt' ? 'var(--accent-soft, #FDEEE2)' : 'transparent',
                  color: copyFormat === 'prompt' ? 'var(--accent-text, #E0761A)' : 'var(--muted, #6E6862)',
                  fontWeight: copyFormat === 'prompt' ? 700 : 500,
                  transition: 'background 0.15s',
                }}
              >
                <FileText size={13} /> Prompt
              </button>
              <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--line, #E6E1DB)' }} />
              <button
                type="button"
                onClick={() => setCopyFormat('md')}
                title="Copy with full markdown formatting (#, **, etc.)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px',
                  border: 'none', cursor: 'pointer',
                  background: copyFormat === 'md' ? 'var(--accent-soft, #FDEEE2)' : 'transparent',
                  color: copyFormat === 'md' ? 'var(--accent-text, #E0761A)' : 'var(--muted, #6E6862)',
                  fontWeight: copyFormat === 'md' ? 700 : 500,
                  transition: 'background 0.15s',
                }}
              >
                <Code2 size={13} /> Markdown
              </button>
            </div>
          )}

          <button type="button" className="btn ghost" onClick={handleDownload} disabled={loading || !!error || !markdown}>
            <Download size={15} /> Download .md
          </button>
          <button type="button" className="btn" onClick={handleCopy} disabled={loading || !!error || !markdown}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : copyFormat === 'md' ? 'Copy as Markdown' : 'Copy as Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
};
