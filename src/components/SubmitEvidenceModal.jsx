import { useEffect, useRef, useState } from 'react';
import axios from '../api/client';
import {
  X, Upload, Link2, KeyRound, Eye, EyeOff, ShieldCheck, FileText, Trash2, Send, Check, Plus,
  ExternalLink, ChevronDown, ChevronUp, Copy, Loader2, AlertTriangle, CheckCircle2, ClipboardPaste, Lock,
} from 'lucide-react';
import { API_URL } from '../apiConfig';
import { fetchDynamicCredentialGuidance, looksLikeCredential } from '../utils/credentialGuide';

import { dialog } from '../utils/dialog';
// Client-facing evidence + secure credential handover dialog.
// Everything shown comes from the item itself; nothing is pre-filled with sample data.
// A client can share any number of credentials in one submission.

const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
let rowSeq = 0;
const newRow = (name = '', value = '') => ({ id: `c${++rowSeq}`, name, value, show: false });

const field = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 13.5, fontFamily: 'inherit',
  border: '1px solid var(--line, #E6E1DB)', borderRadius: 10, background: 'var(--surface, #fff)',
  color: 'var(--ink, #1F1B17)', outline: 'none', margin: 0,
};
const label = { display: 'block', fontSize: 12, fontWeight: 650, color: 'var(--muted, #6E6862)', margin: '0 0 6px', letterSpacing: '.02em' };
const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 9px',
  borderRadius: 8, background: 'var(--soft, #F5F1EC)', border: '1px solid var(--line, #E6E1DB)', color: 'var(--ink, #1F1B17)',
};
const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted, #6E6862)', margin: '0 0 8px' };
const card = { border: '1px solid var(--line, #E6E1DB)', borderRadius: 12, background: 'var(--surface, #fff)' };
const iconBtn = { background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'var(--muted, #6E6862)', borderRadius: 8, display: 'inline-flex' };

const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

// Parses pasted "NAME=value" / "NAME: value" lines into credential rows.
const parseBulk = (text) =>
  text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const m = l.match(/^([^=:]{1,80}?)\s*[=:]\s*(.+)$/);
    return m ? newRow(m[1].trim().replace(/^export\s+/i, ''), m[2].trim().replace(/^["']|["']$/g, '')) : null;
  }).filter(Boolean);

export const SubmitEvidenceModal = ({ isOpen = true, item, onClose, onUpdated, onSubmitted, allowVerify = false }) => {
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [creds, setCreds] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [guide, setGuide] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);

  const isCred = looksLikeCredential(item);

  useEffect(() => {
    if (!item) return;
    setEvidenceUrl(item.evidence_url || '');
    setNotes('');
    setFiles([]);
    setCreds(looksLikeCredential(item) ? [newRow(item.api_key_name && !String(item.api_key_name).includes(',') ? '' : '')] : []);
    setBulkOpen(false);
    setBulkText('');
    setError('');
    setGuide(null);
    setGuideOpen(false);
  }, [item?.id]);

  useEffect(() => {
    if (!isOpen || !item) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onPaste = (e) => {
      const pasted = Array.from(e.clipboardData?.items || [])
        .filter((it) => it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter(Boolean)
        .map((blob) => new File([blob], `screenshot-${Date.now().toString().slice(-5)}.png`, { type: blob.type }));
      if (pasted.length) setFiles((prev) => [...prev, ...pasted]);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste); };
  }, [isOpen, item?.id, onClose]);

  if (!isOpen || !item) return null;

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2600); };
  const addFiles = (list) => setFiles((prev) => [...prev, ...Array.from(list || [])]);
  const existingFiles = (item.evidence_file || '').split(',').map((f) => f.trim()).filter(Boolean);
  const updateCred = (id, patch) => setCreds((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeCred = async (id) => {
    const row = creds.find((r) => r.id === id);
    const hasData = row && Object.entries(row).some(([k, v]) => k !== 'id' && typeof v === 'string' && v.trim());
    if (hasData && !(await dialog.confirm('The details you entered for this credential will be discarded.', { title: 'Remove this credential?', variant: 'danger', confirmLabel: 'Remove' }))) return;
    setCreds((rows) => rows.filter((r) => r.id !== id));
  };

  const importBulk = () => {
    const rows = parseBulk(bulkText);
    if (!rows.length) { flash('No NAME=value lines found'); return; }
    setCreds((prev) => [...prev.filter((r) => r.name.trim() || r.value.trim()), ...rows]);
    setBulkText('');
    setBulkOpen(false);
    flash(`${rows.length} credential${rows.length > 1 ? 's' : ''} added`);
  };

  const loadGuide = async () => {
    setGuideOpen((o) => !o);
    if (guide || guideLoading) return;
    setGuideLoading(true);
    try { setGuide(await fetchDynamicCredentialGuidance(item)); } finally { setGuideLoading(false); }
  };

  const filledCreds = creds.filter((c) => c.value.trim());
  const hasContent = files.length > 0 || evidenceUrl.trim() || notes.trim() || filledCreds.length > 0;

  const submit = async (status) => {
    const unnamed = filledCreds.find((c) => !c.name.trim());
    if (unnamed) { setError('Give each credential a name so the goML team knows what it is.'); return; }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      if (evidenceUrl.trim()) form.append('evidence_url', evidenceUrl.trim());
      if (notes.trim()) form.append('evidence_notes', notes.trim());
      if (filledCreds.length) {
        form.append('credentials', JSON.stringify(filledCreds.map((c) => ({ name: c.name.trim(), value: c.value.trim() }))));
      }
      form.append('status', status);
      await axios.post(`${API_URL}/items/${item.id}/submit-evidence`, form);
      if (status === 'Verified') await axios.post(`${API_URL}/items/${item.id}/verify`);
      setCreds([]);               // never keep secrets in memory longer than needed
      onUpdated && onUpdated();
      onSubmitted && onSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not submit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = { Verified: '#3E9B5C', Submitted: '#E0761A', Rejected: '#E8604A' }[item.status] || '#6E6862';
  const clientActions = asList(item.client_actions);
  const doneWhen = asList(item.completion_criteria);
  const hasLeftDetails = item.expected_evidence || clientActions.length || doneWhen.length || item.why_it_is_needed || item.risk_if_incomplete;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(31, 27, 23, 0.55)', backdropFilter: 'blur(3px)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: 'min(1160px, 100%)', height: 'min(860px, 100%)', display: 'flex', flexDirection: 'column',
          background: 'var(--surface, #fff)', border: '1px solid var(--line, #E6E1DB)', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(30,20,10,.18), 0 2px 8px rgba(30,20,10,.08)', animation: 'popInDialog 0.18s ease-out',
          color: 'var(--ink, #1F1B17)',
        }}
      >
        {toast && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: '#1F1B17', color: '#fff', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 5 }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--line, #E6E1DB)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {item.category && <span style={chip}>{item.category}</span>}
                {item.owner && <span style={chip}>Owner: {item.owner}</span>}
                {item.due_date && <span style={chip}>Due {item.due_date}</span>}
                {item.is_critical && <span style={{ ...chip, background: '#FDEEE2', borderColor: '#F5D9BE', color: '#B8530F' }}>Critical for kick-off</span>}
              </div>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 650, lineHeight: 1.3, letterSpacing: '-0.015em' }}>{item.name}</h3>
              {item.description && <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted, #6E6862)' }}>{item.description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="btn ghost sm" style={{ padding: '5px 8px' }}><X size={16} /></button>
          </div>
        </div>

        {/* Body: two columns */}
        <div className="se-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(260px, 5fr) minmax(0, 7fr)' }}>
          {/* Left: what is needed */}
          <div style={{ padding: '18px 22px', overflowY: 'auto', background: 'var(--soft, #F5F1EC)', borderRight: '1px solid var(--line, #E6E1DB)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {item.status === 'Rejected' && item.rejection_reason && (
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13.5 }}>
                <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div><strong>Sent back for changes:</strong> {item.rejection_reason}</div>
              </div>
            )}

            {item.expected_evidence && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface, #fff)', borderLeft: '3px solid #F28C28', border: '1px solid var(--line, #E6E1DB)', borderLeftWidth: 3, borderLeftColor: '#F28C28' }}>
                <div style={{ ...sectionTitle, color: '#B8530F', marginBottom: 3 }}>What we need from you</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>{item.expected_evidence}</div>
              </div>
            )}

            {clientActions.length > 0 && (
              <div>
                <div style={sectionTitle}>What you need to do</div>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13.5, lineHeight: 1.5 }}>
                  {clientActions.map((a, i) => <li key={i}>{typeof a === 'string' ? a : JSON.stringify(a)}</li>)}
                </ol>
              </div>
            )}

            {doneWhen.length > 0 && (
              <div>
                <div style={sectionTitle}>This is done when</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13.5, lineHeight: 1.5 }}>
                  {doneWhen.map((a, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8 }}><CheckCircle2 size={15} color="#3E9B5C" style={{ flexShrink: 0, marginTop: 2 }} /><span>{typeof a === 'string' ? a : JSON.stringify(a)}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {item.why_it_is_needed && (
              <div>
                <div style={sectionTitle}>Why it matters</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{item.why_it_is_needed}</p>
              </div>
            )}

            {item.risk_if_incomplete && (
              <div>
                <div style={sectionTitle}>If it is missing</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{item.risk_if_incomplete}</p>
              </div>
            )}

            {!hasLeftDetails && (
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted, #6E6862)' }}>Share what is described above using the form on the right. The goML team will review it and get back to you.</p>
            )}

            {isCred && (
              <div style={{ ...card }}>
                <button type="button" onClick={loadGuide} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'inherit' }}>
                  <ShieldCheck size={16} color="#E0761A" />
                  <span style={{ flex: 1, textAlign: 'left' }}>How do I get this? Step-by-step guide</span>
                  {guideLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : guideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {guideOpen && guide && (
                  <div style={{ padding: '2px 16px 14px', fontSize: 13.5, lineHeight: 1.55 }}>
                    {guide.serviceName && <div style={{ fontWeight: 650, marginBottom: 8 }}>{guide.serviceName}{guide.estimatedTime ? ` · about ${guide.estimatedTime}` : ''}</div>}
                    <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(guide.quickSteps || []).map((s, i) => (
                        <li key={i}>{typeof s === 'string' ? s : (<><strong>{s.action}.</strong> {s.detail}</>)}</li>
                      ))}
                    </ol>
                    {guide.requiredPermissions && <p style={{ margin: '10px 0 0' }}><strong>Permissions needed:</strong> {guide.requiredPermissions}</p>}
                    {guide.securityRecommendation && <p style={{ margin: '6px 0 0', color: 'var(--muted, #6E6862)' }}>{guide.securityRecommendation}</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      {guide.consoleUrl && (
                        <a className="btn ghost sm" href={guide.consoleUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open {guide.consoleName || 'console'}</a>
                      )}
                      {guide.delegationMessage && (
                        <button type="button" className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(guide.delegationMessage); flash('Message for your IT admin copied'); }}>
                          <Copy size={13} /> Copy message for your IT admin{guide.delegationRole ? ` (${guide.delegationRole})` : ''}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: what you share */}
          <div style={{ padding: '18px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Credentials */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <KeyRound size={16} color="#E0761A" />
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 650 }}>Credentials</h4>
                <span style={{ fontSize: 12.5, color: 'var(--muted, #6E6862)' }}>{creds.length > 0 ? `${filledCreds.length} ready to send` : 'Optional'}</span>
                {item.has_api_key && <span style={{ ...chip, marginLeft: 'auto', color: '#2F7A48' }}><Check size={12} /> On file: {item.masked_api_key}</span>}
              </div>

              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--muted, #6E6862)', lineHeight: 1.5, padding: '10px 12px', background: '#F1F8F3', border: '1px solid #D5E9DA', borderRadius: 10, marginBottom: 12 }}>
                <Lock size={14} color="#3E9B5C" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Encrypted before it is stored and never shown again after you submit. The goML team sees only a masked hint. Share as many as you need, and prefer limited, read-only keys. Please do not send secrets by email or chat.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {creds.map((c, idx) => (
                  <div key={c.id} style={{ ...card, padding: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr) auto', gap: 10, alignItems: 'end' }} className="se-cred-row">
                      <div>
                        <span style={label}>Name {creds.length > 1 ? `#${idx + 1}` : ''}</span>
                        <input style={field} value={c.name} onChange={(e) => updateCred(c.id, { name: e.target.value })} placeholder="e.g. AWS access key ID" autoComplete="off" />
                      </div>
                      <div>
                        <span style={label}>Secret value</span>
                        <div style={{ position: 'relative' }}>
                          <input
                            style={{ ...field, paddingRight: 38, fontFamily: c.show ? 'ui-monospace, Menlo, Consolas, monospace' : 'inherit' }}
                            type={c.show ? 'text' : 'password'} value={c.value} onChange={(e) => updateCred(c.id, { value: e.target.value })}
                            placeholder="Paste key, token or password" autoComplete="new-password" spellCheck={false}
                          />
                          <button type="button" onClick={() => updateCred(c.id, { show: !c.show })} aria-label={c.show ? 'Hide' : 'Show'} style={{ ...iconBtn, position: 'absolute', right: 4, top: 4 }}>
                            {c.show ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeCred(c.id)} aria-label="Remove credential" title="Remove" style={{ ...iconBtn, marginBottom: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: creds.length ? 10 : 0 }}>
                <button type="button" className="btn ghost sm" onClick={() => setCreds((r) => [...r, newRow()])}><Plus size={14} /> Add {creds.length ? 'another ' : 'a '}credential</button>
                <button type="button" className="btn ghost sm" onClick={() => setBulkOpen((o) => !o)}><ClipboardPaste size={14} /> Paste several at once</button>
              </div>

              {bulkOpen && (
                <div style={{ ...card, padding: 12, marginTop: 10 }}>
                  <span style={label}>One per line, as NAME=value (an .env block works)</span>
                  <textarea
                    style={{ ...field, minHeight: 110, resize: 'vertical', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12.5 }}
                    value={bulkText} onChange={(e) => setBulkText(e.target.value)} spellCheck={false} autoComplete="off"
                    placeholder={'DB_HOST=db.example.com\nDB_USER=readonly\nDB_PASSWORD=...'}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn ghost sm" onClick={() => { setBulkOpen(false); setBulkText(''); }}>Cancel</button>
                    <button type="button" className="btn sm" onClick={importBulk} disabled={!bulkText.trim()}>Add to list</button>
                  </div>
                </div>
              )}
            </section>

            {/* Evidence */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <FileText size={16} color="#E0761A" />
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 650 }}>Evidence</h4>
                <span style={{ fontSize: 12.5, color: 'var(--muted, #6E6862)' }}>Links and files</span>
              </div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Link2 size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted, #6E6862)' }} />
                <input style={{ ...field, paddingLeft: 36 }} value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Link to a document, repo or dashboard (optional)" />
              </div>

              <div
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px dashed ${dragOver ? '#F28C28' : 'var(--line, #E6E1DB)'}`, background: dragOver ? '#FDEEE2' : 'var(--soft, #F5F1EC)',
                  fontSize: 13.5, color: 'var(--muted, #6E6862)', textAlign: 'center', flexWrap: 'wrap',
                }}
              >
                <Upload size={16} /> Drop files here, click to browse, or press Ctrl+V to paste a screenshot
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </div>

              {(files.length > 0 || existingFiles.length > 0) && (
                <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {existingFiles.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '7px 10px', border: '1px solid var(--line, #E6E1DB)', borderRadius: 8 }}>
                      <Check size={14} color="#3E9B5C" /> <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.split('/').pop().replace(/^[^_]*_[^_]*_/, '')}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted, #6E6862)' }}>already submitted</span>
                    </li>
                  ))}
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '7px 10px', border: '1px solid var(--line, #E6E1DB)', borderRadius: 8 }}>
                      <FileText size={14} color="#E0761A" /> <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted, #6E6862)' }}>{fmtSize(f.size)}</span>
                      <button type="button" aria-label="Remove file" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} style={iconBtn}><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Notes */}
            <section>
              <span style={label}>Notes for the goML team (optional)</span>
              <textarea style={{ ...field, minHeight: 84, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know about what you are submitting" />
            </section>

            {error && <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B42318', fontSize: 13.5 }}>{error}</div>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line, #E6E1DB)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--soft, #F5F1EC)', flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--muted, #6E6862)', marginRight: 'auto' }}>
            Status: <strong style={{ color: statusColor }}>{item.status || 'Pending'}</strong>
          </span>
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          {allowVerify && (
            <button type="button" className="btn ghost" onClick={() => submit('Verified')} disabled={saving}>
              <CheckCircle2 size={15} /> Mark verified
            </button>
          )}
          <button type="button" className="btn" onClick={() => submit('Submitted')} disabled={saving || !hasContent}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
            {filledCreds.length > 1 ? ` Submit ${filledCreds.length} credentials for review` : ' Submit for review'}
          </button>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .se-grid { grid-template-columns: 1fr !important; overflow-y: auto; }
          .se-grid > div { overflow: visible !important; border-right: 0 !important; }
          .se-cred-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
