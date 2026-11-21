import { Trash2, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react';
import { safeUrl } from '../utils/safeUrl';

const TYPES = {
  pdf: { label: 'PDF', color: '#E2553F' },
  doc: { label: 'DOC', color: '#4A7CF0' }, docx: { label: 'DOC', color: '#4A7CF0' },
  xls: { label: 'XLS', color: '#3DA56A' }, xlsx: { label: 'XLS', color: '#3DA56A' }, csv: { label: 'CSV', color: '#3DA56A' },
  ppt: { label: 'PPT', color: '#F2A23A' }, pptx: { label: 'PPT', color: '#F2A23A' },
  png: { label: 'IMG', color: '#8B5CF6' }, jpg: { label: 'IMG', color: '#8B5CF6' }, jpeg: { label: 'IMG', color: '#8B5CF6' },
  txt: { label: 'TXT', color: '#6B7280' }, md: { label: 'MD', color: '#6B7280' }, zip: { label: 'ZIP', color: '#6B7280' },
};

export const fileType = (doc) => {
  const name = (doc.fileName || doc.path || doc.url || '').split('?')[0];
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (TYPES[ext]) return TYPES[ext];
  return doc.isUploaded || doc.isPrivate ? { label: 'FILE', color: '#6B7280' } : { label: 'LINK', color: '#4A7CF0' };
};

const sizeOf = (doc) => doc.size || (doc.notes || '').match(/\(([\d.]+\s?(?:KB|MB))\)/i)?.[1] || '';
const cleanNotes = (doc) => (doc.notes || '').replace(/^(Dropbox|Server storage)\s*[•·-]\s*/i, '').replace(/\s*\([\d.]+\s?(?:KB|MB)\)\s*$/i, '').replace(/^(BRD Document|Excel Sheet)$/i, '');

const ago = (iso) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function DocCard({ doc, category, canEdit, copied, onCopy, onDelete, onRead }) {
  const t = fileType(doc);
  const note = cleanNotes(doc);
  const size = sizeOf(doc);

  return (
    <article className="dc" style={{ '--tc': t.color }}>
      <header className="dc-top">
        <span className="dc-type" aria-hidden="true">{t.label}</span>
        <span className="dc-cat">{category.label}</span>
        <span className="dc-tools">
          {!doc.isPrivate && (
            <button type="button" title="Copy link" aria-label="Copy link" onClick={onCopy}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          )}
          {canEdit && <button type="button" title="Remove" aria-label="Remove document" className="del" onClick={onDelete}><Trash2 size={14} /></button>}
        </span>
      </header>

      <h4 className="dc-title" onClick={onRead} title={doc.title}>{doc.title.replace(/_+/g, ' ')}</h4>
      {note && <p className="dc-note">{note}</p>}

      <div className="dc-meta">
        {size && <span>{size}</span>}
        {doc.addedBy && <span>{doc.addedBy}</span>}
        {doc.addedAt && <span>{ago(doc.addedAt)}</span>}
      </div>

      <footer className="dc-foot">
        <button type="button" className="dc-read" onClick={onRead}>Read document <ArrowRight size={15} /></button>
        {!doc.isPrivate && (
          <a className="dc-ext" href={safeUrl(doc.url) || undefined} target="_blank" rel="noopener noreferrer" title="Open in a new tab" aria-label="Open in a new tab"><ExternalLink size={15} /></a>
        )}
      </footer>
    </article>
  );
}
