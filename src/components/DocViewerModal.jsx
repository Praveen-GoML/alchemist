import { useEffect, useMemo, useState } from 'react';
import { X, ExternalLink, Download, Copy, Check, FileText, Loader2 } from 'lucide-react';
import { safeUrl } from '../utils/safeUrl';
import { fetchPrivateFile, canPreviewPrivate } from '../services/documentStorage';
import { fileType } from './DocCard';
import DocRenderer from './DocRenderer';

const OFFICE = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const IMAGES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

const extOf = (u, name = '') => {
  const clean = (s) => (s || '').split('?')[0].split('#')[0].toLowerCase();
  const m = clean(name).match(/\.([a-z0-9]+)$/) || clean(u).match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
};

/** Works out how to show a document inside the page. Returns { kind: 'frame' | 'image' | 'none', src, raw }. */
export function previewFor(url, fileName) {
  const safe = safeUrl(url);
  if (!safe) return { kind: 'none', src: '', raw: '' };
  let u;
  try { u = new URL(safe); } catch { return { kind: 'none', src: '', raw: safe }; }
  const host = u.hostname.toLowerCase();
  const ext = extOf(u.pathname, fileName);

  // Google Drive / Docs / Sheets / Slides: their own embeddable preview
  const drive = u.pathname.match(/\/file\/d\/([^/]+)/);
  if (host === 'drive.google.com' && drive) return { kind: 'frame', src: `https://drive.google.com/file/d/${drive[1]}/preview`, raw: safe };
  const gdoc = u.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
  if (host === 'docs.google.com' && gdoc) return { kind: 'frame', src: `https://docs.google.com/${gdoc[1]}/d/${gdoc[2]}/preview`, raw: safe };

  // Dropbox: use the direct-file address so the browser can display it
  let raw = safe;
  let download = safe;
  if (host.endsWith('dropbox.com')) {
    const r = new URL(safe); r.searchParams.delete('dl'); r.searchParams.set('raw', '1'); raw = r.toString();
    const d = new URL(safe); d.searchParams.delete('raw'); d.searchParams.set('dl', '1'); download = d.toString();
  }

  if (IMAGES.includes(ext)) return { kind: 'image', src: raw, raw: download };
  if (OFFICE.includes(ext)) return { kind: 'frame', src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(raw)}`, raw: download };
  // PDFs: Chrome refuses to show a PDF inside a sandboxed frame, so these load without the sandbox attribute
  if (ext === 'pdf' || host.endsWith('dropbox.com')) return { kind: 'frame', src: raw, raw: download, file: true };
  // SharePoint / OneDrive and everything else: try the page itself
  return { kind: 'frame', src: safe, raw: download };
}

export default function DocViewerModal({ doc, categoryLabel, canDownload = true, onClose: onDone }) {
  const [closing, setClosing] = useState(false);
  const onClose = () => { if (closing) return; setClosing(true); setTimeout(onDone, 200); };
  const isPrivate = !!doc.isPrivate;
  const [blobUrl, setBlobUrl] = useState('');
  const [privErr, setPrivErr] = useState('');
  const fileName = doc.fileName || doc.title || '';
  const previewable = !isPrivate || !!doc.path;
  const ext = ((doc.path || fileName).split('.').pop() || '').toLowerCase();
  const [blob, setBlob] = useState(null);
  const view = useMemo(() => {
    if (!isPrivate) return previewFor(doc.url, doc.fileName);
    if (!previewable) return { kind: 'none', src: '', raw: '' };
    if (!blob) return { kind: 'wait', src: '', raw: '' };
    // PDFs and pictures use the browser's own viewer; everything else is drawn by DocRenderer
    // (toolbar=0 hides the PDF viewer's own download and print buttons)
    if (ext === 'pdf') return { kind: 'frame', src: `${blobUrl}#toolbar=0&navpanes=0&view=FitH`, raw: blobUrl, file: true };
    if (['png', 'jpg', 'jpeg'].includes(ext)) return { kind: 'image', src: blobUrl, raw: blobUrl };
    return { kind: 'render', src: '', raw: blobUrl };
  }, [isPrivate, previewable, blob, blobUrl, ext, doc.url, doc.fileName]);
  const [loaded, setLoaded] = useState(false);
  const { label: tlabel } = fileType(doc);

  useEffect(() => {
    if (!isPrivate || !previewable || !doc.path) return undefined;
    let url = '', alive = true;
    fetchPrivateFile(doc.path).then(b => { if (alive) { url = URL.createObjectURL(b); setBlobUrl(url); setBlob(b); } }).catch(e => alive && setPrivErr(e.message));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [isPrivate, previewable, doc.path]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [closing]);

  const open = isPrivate ? '' : safeUrl(doc.url);
  const copy = () => {
    try { navigator.clipboard.writeText(doc.url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  return (
    <div className={`dv-bg${closing ? ' out' : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-label={doc.title}>
      <div className="dv max" onClick={(e) => e.stopPropagation()}>
        <header className="dv-head">
          <span className="dv-ico"><FileText size={18} /></span>
          <div className="dv-title">
            <b title={doc.title}>{doc.title.replace(/_+/g, ' ')}</b>
            {categoryLabel && <span>{[categoryLabel, tlabel, doc.size, isPrivate ? 'Read-only' : ''].filter(Boolean).join(' · ')}</span>}
          </div>
          <div className="dv-actions">
            {!isPrivate && <button type="button" className="dv-btn" onClick={copy} title="Copy link">{copied ? <Check size={15} /> : <Copy size={15} />}<span>{copied ? 'Copied' : 'Copy link'}</span></button>}
            {canDownload && view.raw && (isPrivate
              ? <a className="dv-btn" href={view.raw} download={fileName} title="Download"><Download size={15} /><span>Download</span></a>
              : <a className="dv-btn" href={view.raw} target="_blank" rel="noopener noreferrer" title="Download"><Download size={15} /><span>Download</span></a>)}
            {open && <a className="dv-btn" href={open} target="_blank" rel="noopener noreferrer" title="Open in a new tab"><ExternalLink size={15} /><span>New tab</span></a>}
            <button type="button" className="dv-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        </header>

        <div className="dv-body">
          {view.kind === 'none' && <div className="dv-empty">{isPrivate ? "This file type (Word, Excel, PowerPoint or zip) can't be read inside the app. Ask a PM or TL for a PDF version." : <>This link can't be previewed. Use <b>New tab</b> to open it.</>}</div>}
          {privErr && <div className="dv-empty">{privErr}</div>}
          {!privErr && view.kind !== 'none' && !loaded && (
            <div className="dv-loading"><div className="dv-sheet"><i /><i /><i /><i /><i /></div><span><Loader2 size={16} className="dv-spin" /> Opening document…</span></div>
          )}
          {view.kind === 'render' && <div className={`dv-render${loaded ? ' in' : ''}`}><DocRenderer blob={blob} ext={ext} onReady={() => setLoaded(true)} /></div>}
          {view.kind === 'image' && <img src={view.src} alt={doc.title} className={`dv-img${loaded ? ' in' : ''}`} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />}
          {view.kind === 'frame' && (
            <iframe
              title={doc.title}
              src={view.src}
              className={`dv-frame${loaded ? ' in' : ''}`}
              onLoad={() => setLoaded(true)}
              sandbox={view.file ? undefined : 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads'}
              referrerPolicy="no-referrer"
              allow="fullscreen"
            />
          )}
        </div>
        {!isPrivate && <footer className="dv-foot">If the preview stays blank, the file's owner has blocked embedding. Use <b>New tab</b>.</footer>}
      </div>
    </div>
  );
}
