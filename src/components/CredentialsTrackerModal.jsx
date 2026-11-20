import { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import { X, Search, KeyRound, Check, Clock, ExternalLink, ShieldCheck, Link2, ArrowRight, Plus, Copy, Mail, Send, Loader2 } from 'lucide-react';
import { API_URL } from '../apiConfig';
import { looksLikeCredential } from '../utils/credentialGuide';

// Credentials tracker: every credential / access / link the project needs, grouped by
// service with its logo and current state. Never shows secret values (masked hint only).

const SERVICES = [
  { key: 'aws', label: 'AWS', slug: 'amazonaws', color: '#FF9900', re: /\b(aws|amazon web services|s3|ec2|iam|athena|opensearch|bedrock|lambda|sagemaker|redshift|cloudfront|dynamodb|rds)\b/i },
  { key: 'github', label: 'GitHub', slug: 'github', color: '#181717', re: /\bgithub\b/i },
  { key: 'gitlab', label: 'GitLab', slug: 'gitlab', color: '#FC6D26', re: /\bgitlab\b/i },
  { key: 'bitbucket', label: 'Bitbucket', slug: 'bitbucket', color: '#0052CC', re: /\bbitbucket\b/i },
  { key: 'azure', label: 'Azure', slug: 'microsoftazure', color: '#0078D4', re: /\bazure\b/i },
  { key: 'gcp', label: 'Google Cloud', slug: 'googlecloud', color: '#4285F4', re: /\b(gcp|google cloud|bigquery|vertex)\b/i },
  { key: 'google', label: 'Google', slug: 'google', color: '#4285F4', re: /\b(google|gmail|gsuite|workspace)\b/i },
  { key: 'slack', label: 'Slack', slug: 'slack', color: '#4A154B', re: /\bslack\b/i },
  { key: 'jira', label: 'Jira', slug: 'jira', color: '#0052CC', re: /\bjira\b/i },
  { key: 'confluence', label: 'Confluence', slug: 'confluence', color: '#172B4D', re: /\bconfluence\b/i },
  { key: 'salesforce', label: 'Salesforce', slug: 'salesforce', color: '#00A1E0', re: /\bsalesforce\b/i },
  { key: 'snowflake', label: 'Snowflake', slug: 'snowflake', color: '#29B5E8', re: /\bsnowflake\b/i },
  { key: 'databricks', label: 'Databricks', slug: 'databricks', color: '#FF3621', re: /\bdatabricks\b/i },
  { key: 'postgres', label: 'PostgreSQL', slug: 'postgresql', color: '#4169E1', re: /\b(postgres|postgresql)\b/i },
  { key: 'mysql', label: 'MySQL', slug: 'mysql', color: '#4479A1', re: /\bmysql\b/i },
  { key: 'mongodb', label: 'MongoDB', slug: 'mongodb', color: '#47A248', re: /\bmongo(db)?\b/i },
  { key: 'odoo', label: 'Odoo', slug: 'odoo', color: '#714B67', re: /\bodoo\b/i },
  { key: 'sap', label: 'SAP', slug: 'sap', color: '#0FAAFF', re: /\bsap\b/i },
  { key: 'zendesk', label: 'Zendesk', slug: 'zendesk', color: '#03363D', re: /\bzendesk\b/i },
  { key: 'hubspot', label: 'HubSpot', slug: 'hubspot', color: '#FF7A59', re: /\bhubspot\b/i },
  { key: 'stripe', label: 'Stripe', slug: 'stripe', color: '#635BFF', re: /\bstripe\b/i },
  { key: 'twilio', label: 'Twilio', slug: 'twilio', color: '#F22F46', re: /\btwilio\b/i },
  { key: 'openai', label: 'OpenAI', slug: 'openai', color: '#412991', re: /\bopenai\b/i },
  { key: 'docker', label: 'Docker', slug: 'docker', color: '#2496ED', re: /\bdocker\b/i },
  { key: 'kubernetes', label: 'Kubernetes', slug: 'kubernetes', color: '#326CE5', re: /\b(kubernetes|k8s)\b/i },
  { key: 'vpn', label: 'VPN / Network', slug: null, color: '#6E6862', re: /\b(vpn|whitelist|firewall|network)\b/i },
  { key: 'sftp', label: 'SFTP / SSH', slug: null, color: '#6E6862', re: /\b(sftp|ssh|ftp)\b/i },
];
const OTHER = { key: 'other', label: 'Other access', slug: null, color: '#6E6862' };

const earliest = (text) => {
  let best = null;
  SERVICES.forEach((s) => {
    const m = s.re.exec(text);
    if (m && (best === null || m.index < best.idx)) best = { s, idx: m.index };
  });
  return best ? best.s : null;
};
const serviceFor = (item) =>
  earliest(item.name || '') ||
  earliest(`${item.description || ''} ${item.expected_evidence || ''} ${item.api_key_name || ''}`) ||
  OTHER;

const itemLink = (projectId, itemId) =>
  `${window.location.origin}${window.location.pathname}#client/${projectId}${itemId ? `?item=${itemId}` : ''}`;

const requestMessage = (clientName, items, projectId) => {
  const lines = items.map((it, i) => `${i + 1}. ${it.name}${it.due_date ? ` (needed by ${it.due_date})` : ''}\n   ${itemLink(projectId, it.id)}`);
  return (
    `Hi${clientName ? ` ${clientName} team` : ''},\n\n` +
    `To keep the project on track, could you please share the following access ${items.length > 1 ? 'items' : 'item'} through our secure portal? ` +
    `Each link opens the exact request; credentials are encrypted and never shown again after you submit.\n\n${lines.join('\n')}\n\n` +
    `Please do not send secrets by email or chat. Thank you!`
  );
};

const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

const fl = { display: 'block', fontSize: 11.5, fontWeight: 650, color: 'var(--muted, #6E6862)', margin: '0 0 4px' };
const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: '1px solid var(--line, #E6E1DB)', borderRadius: 9, background: 'var(--surface, #fff)', color: 'var(--ink, #1F1B17)', outline: 'none', margin: 0, fontFamily: 'inherit' };

const Logo = ({ svc, size = 34 }) => {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface, #fff)', border: '1px solid var(--line, #E6E1DB)' };
  if (svc.slug && !failed) {
    return (
      <span style={box}>
        <img src={`https://cdn.simpleicons.org/${svc.slug}/${svc.color.replace('#', '')}`} alt={svc.label} width={size * 0.58} height={size * 0.58} onError={() => setFailed(true)} style={{ display: 'block' }} />
      </span>
    );
  }
  return (
    <span style={{ ...box, background: svc.color + '1A', color: svc.color, fontWeight: 700, fontSize: size * 0.4 }}>
      {svc.slug === null && svc.key !== 'other' ? <ShieldCheck size={size * 0.5} /> : svc.key === 'other' ? <KeyRound size={size * 0.5} /> : svc.label.slice(0, 1)}
    </span>
  );
};

const stateOf = (it) => {
  const s = String(it.status || '').toLowerCase();
  if (s === 'verified' || s === 'cleared') return { key: 'verified', label: 'Verified', color: '#2F7A48', bg: '#E8F4EC' };
  if (it.has_api_key || it.credential_provided || it.evidence_url || it.has_evidence || s === 'submitted' || s === 'verifying') return { key: 'received', label: 'Received', color: '#B8530F', bg: '#FDEEE2' };
  if (s === 'rejected') return { key: 'rejected', label: 'Sent back', color: '#B42318', bg: '#FEF2F2' };
  return { key: 'awaiting', label: 'Awaiting client', color: '#6E6862', bg: '#F5F1EC' };
};

export const CredentialsTrackerModal = ({ checklist, projectName, projectId, clientName, onClose, onOpenItem, onItemAdded, audience = 'staff' }) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const staff = audience !== 'client';
  const [toast, setToast] = useState('');
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({ service: 'aws', what: '', description: '', owner: 'Client', due: '', critical: true });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createRequest = async () => {
    const svc = SERVICES.find((s) => s.key === form.service) || OTHER;
    if (!form.what.trim()) { setFormErr('Say what you need, for example "Production read-only access".'); return; }
    setSaving(true); setFormErr('');
    try {
      const name = `${svc.key === 'other' ? '' : svc.label + ' '}${form.what.trim()}`.trim();
      const res = await axios.post(`${API_URL}/projects/${projectId}/items`, {
        name,
        category: 'Security',
        description: form.description.trim() || `${name}: credentials or access required from the client.`,
        owner: form.owner.trim() || 'Client',
        is_critical: form.critical,
        due_date: form.due || '',
        expected_evidence: `${svc.label === OTHER.label ? 'Service' : svc.label} credential or access details (API key, token, service account or link)`,
        depends_on: [],
      });
      onItemAdded && onItemAdded();
      setCreated(res.data && res.data.id ? res.data : { id: null, name, due_date: form.due });
      setForm({ service: form.service, what: '', description: '', owner: 'Client', due: '', critical: true });
    } catch (e) {
      setFormErr(e.response?.data?.detail || 'Could not create the request.');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = useMemo(
    () => (Array.isArray(checklist) ? checklist : [])
      .filter((it) => looksLikeCredential(it) || it.has_api_key || it.credential_provided)
      .map((it) => ({ it, svc: serviceFor(it), st: stateOf(it) })),
    [checklist]
  );

  const counts = useMemo(() => {
    const c = { all: rows.length, awaiting: 0, received: 0, verified: 0, rejected: 0 };
    rows.forEach((r) => { c[r.st.key] += 1; });
    return c;
  }, [rows]);

  const outstanding = rows.filter((r) => r.st.key === 'awaiting' || r.st.key === 'rejected').map((r) => r.it);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map();
    rows
      .filter((r) => (filter === 'all' || r.st.key === filter) && (!needle || `${r.it.name} ${r.svc.label} ${r.it.owner || ''}`.toLowerCase().includes(needle)))
      .forEach((r) => {
        if (!map.has(r.svc.key)) map.set(r.svc.key, { svc: r.svc, list: [] });
        map.get(r.svc.key).list.push(r);
      });
    return Array.from(map.values());
  }, [rows, q, filter]);

  const tab = (key, label) => (
    <button key={key} type="button" onClick={() => setFilter(key)} className={filter === key ? 'btn sm' : 'btn ghost sm'}>
      {label} <span style={{ opacity: 0.7 }}>{counts[key] || 0}</span>
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, padding: 20, background: 'rgba(31,27,23,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1100px, 100%)', height: 'min(800px, 100%)', display: 'flex', flexDirection: 'column', background: 'var(--surface, #fff)', border: '1px solid var(--line, #E6E1DB)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px rgba(30,20,10,.18)', color: 'var(--ink, #1F1B17)', animation: 'popInDialog 0.18s ease-out' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line, #E6E1DB)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft, #FDEEE2)', color: 'var(--accent-text, #E0761A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KeyRound size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>Credentials tracker</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted, #6E6862)' }}>{audience === 'client' ? 'Everything we need you to share, by service. Pick an item to send it securely.' : `Access, keys and links ${projectName ? `for ${projectName}` : 'for this project'}, by service. Secret values are never shown.`}</p>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Close" style={{ padding: '5px 8px' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '12px 22px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--line, #E6E1DB)', background: 'var(--soft, #F5F1EC)' }}>
          {tab('all', 'All')}{tab('awaiting', 'Awaiting')}{tab('received', 'Received')}{tab('verified', 'Verified')}{counts.rejected > 0 && tab('rejected', 'Sent back')}
          {staff && (
            <>
              <button type="button" className="btn sm" onClick={() => { setFormOpen((o) => !o); setCreated(null); }} style={{ marginLeft: 'auto' }}><Plus size={14} /> Request credential</button>
              <button type="button" className="btn ghost sm" disabled={!outstanding.length} title="Copy one message listing everything still outstanding" onClick={async () => { flash((await copyText(requestMessage(clientName, outstanding, projectId))) ? `Message for ${outstanding.length} outstanding item${outstanding.length > 1 ? 's' : ''} copied` : 'Copy failed'); }}><Send size={14} /> Request all outstanding ({outstanding.length})</button>
            </>
          )}
          <div style={{ position: 'relative', marginLeft: staff ? 0 : 'auto', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted, #6E6862)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search service, item or owner" style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px', fontSize: 13, border: '1px solid var(--line, #E6E1DB)', borderRadius: 10, background: 'var(--surface, #fff)', color: 'inherit', outline: 'none', margin: 0 }} />
          </div>
        </div>

        {staff && formOpen && (
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line, #E6E1DB)', background: 'var(--surface, #fff)' }}>
            {created ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Check size={16} color="#2F7A48" />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Request created: {created.name}</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn ghost sm" onClick={async () => flash((await copyText(itemLink(projectId, created.id))) ? 'Link copied' : 'Copy failed')}><Link2 size={13} /> Copy link</button>
                  <button type="button" className="btn ghost sm" onClick={async () => flash((await copyText(requestMessage(clientName, [created], projectId))) ? 'Message copied' : 'Copy failed')}><Copy size={13} /> Copy message</button>
                  <a className="btn ghost sm" href={`mailto:?subject=${encodeURIComponent(`Access needed: ${created.name}`)}&body=${encodeURIComponent(requestMessage(clientName, [created], projectId))}`}><Mail size={13} /> Email client</a>
                  <button type="button" className="btn sm" onClick={() => setCreated(null)}>Add another</button>
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, alignItems: 'end' }}>
                <label style={{ gridColumn: 'span 2' }}><span style={fl}>Service</span>
                  <select value={form.service} onChange={(e) => setF('service', e.target.value)} style={inp}>
                    {SERVICES.filter((s) => s.slug).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    <option value="vpn">VPN / Network</option><option value="sftp">SFTP / SSH</option><option value="other">Other</option>
                  </select></label>
                <label style={{ gridColumn: 'span 4' }}><span style={fl}>What do you need?</span>
                  <input value={form.what} onChange={(e) => setF('what', e.target.value)} placeholder="e.g. repository access, production read-only IAM user" style={inp} /></label>
                <label style={{ gridColumn: 'span 3' }}><span style={fl}>Details for the client (optional)</span>
                  <input value={form.description} onChange={(e) => setF('description', e.target.value)} placeholder="Scope, permissions, environment" style={inp} /></label>
                <label style={{ gridColumn: 'span 1' }}><span style={fl}>Owner</span>
                  <input value={form.owner} onChange={(e) => setF('owner', e.target.value)} style={inp} /></label>
                <label style={{ gridColumn: 'span 1' }}><span style={fl}>Due</span>
                  <input type="date" value={form.due} onChange={(e) => setF('due', e.target.value)} style={inp} /></label>
                <div style={{ gridColumn: 'span 1', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" className={form.critical ? 'btn sm' : 'btn ghost sm'} onClick={() => setF('critical', !form.critical)} title="Critical for kick-off">Critical</button>
                  <button type="button" className="btn sm" onClick={createRequest} disabled={saving}>{saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />} Create</button>
                </div>
                {formErr && <div style={{ gridColumn: 'span 6', color: '#B42318', fontSize: 13 }}>{formErr}</div>}
              </div>
            )}
          </div>
        )}

        <div style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {toast && <div style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', background: '#1F1B17', color: '#fff', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 10 }}>{toast}</div>}
          {rows.length === 0 && <p style={{ color: 'var(--muted, #6E6862)', fontSize: 14 }}>No credential or access items were found for this project.</p>}
          {rows.length > 0 && groups.length === 0 && <p style={{ color: 'var(--muted, #6E6862)', fontSize: 14 }}>Nothing matches this filter.</p>}
          {groups.map(({ svc, list }) => (
            <section key={svc.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Logo svc={svc} />
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 650 }}>{svc.label}</h4>
                <span style={{ fontSize: 12.5, color: 'var(--muted, #6E6862)' }}>{list.length} item{list.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ border: '1px solid var(--line, #E6E1DB)', borderRadius: 12, overflow: 'hidden' }}>
                {list.map(({ it, st }, i) => (
                  <div key={it.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.2fr) minmax(0,1.5fr) auto auto auto', gap: 14, alignItems: 'center', padding: '11px 14px', borderTop: i ? '1px solid var(--line, #E6E1DB)' : 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}{it.is_critical && <span style={{ marginLeft: 8, fontSize: 11, color: '#B8530F', fontWeight: 700 }}>CRITICAL</span>}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted, #6E6862)', marginTop: 2 }}>{it.owner || 'Unassigned'}{it.due_date ? ` · Due ${it.due_date}` : ''}</div>
                    </div>
                    <div style={{ minWidth: 0, fontSize: 12.5, color: 'var(--muted, #6E6862)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {(it.has_api_key || it.credential_provided) ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#2F7A48' }}><Check size={13} /> {it.masked_api_key || 'Credential on file'}{it.api_key_name ? ` (${it.api_key_name})` : ''}</span>
                      ) : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> No credential yet</span>)}
                      {it.evidence_url && (<a href={/^https?:/i.test(it.evidence_url) ? it.evidence_url : `https://${it.evidence_url}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent-text, #E0761A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Link2 size={13} /> {it.evidence_url.replace(/^https?:\/\//i, '')} <ExternalLink size={11} /></a>)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 650, padding: '3px 10px', borderRadius: 999, color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>{st.label}</span>
                    {staff && (st.key === 'awaiting' || st.key === 'rejected') && (
                      <button type="button" className="btn ghost sm" title="Copy a request message with a direct link for the client" onClick={async () => flash((await copyText(requestMessage(clientName, [it], projectId))) ? 'Request message copied' : 'Copy failed')}><Copy size={13} /> Request</button>
                    )}
                    <button type="button" className="btn ghost sm" onClick={() => onOpenItem && onOpenItem(it)}>{audience === 'client' ? (st.key === 'awaiting' || st.key === 'rejected' ? 'Share' : 'Update') : 'Open'} <ArrowRight size={13} /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
