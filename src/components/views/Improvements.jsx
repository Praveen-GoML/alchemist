import { useState } from 'react';
import { ISTAT, fmt } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

import { dialog } from '../../utils/dialog';
const STAT_CLASS = {
  'Not started': 'is-none',
  'In progress': 'is-prog',
  'Done': 'is-done',
  'Blocked': 'is-block',
};

export default function Improvements({ data, updateData }) {
  const { canManageImprovements } = useAuth();
  const canEdit = canManageImprovements();
  const { improvements = [] } = data;

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ type: 'Hub', title: '', desc: '', owner: '' });

  const count = s => improvements.filter(i => i.status === s).length;
  const done = count('Done');
  const pctDone = improvements.length ? Math.round((done / improvements.length) * 100) : 0;

  const setField = (n, field, val) => {
    if (!canEdit) return;
    updateData(prev => ({
      ...prev,
      improvements: prev.improvements.map(i => (i.n === n ? { ...i, [field]: val } : i)),
    }));
  };

  const removeItem = async (item) => {
    if (!canEdit) return;
    if (!(await dialog.confirm(`"${item.title}" will be removed from the list.`, { title: 'Delete improvement?', variant: 'danger', confirmLabel: 'Delete' }))) return;
    updateData(prev => ({ ...prev, improvements: prev.improvements.filter(i => i.n !== item.n) }));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!canEdit || !draft.title.trim()) return;
    updateData(prev => {
      const n = Math.max(0, ...prev.improvements.map(i => i.n || 0)) + 1;
      return {
        ...prev,
        improvements: [...prev.improvements, {
          n, type: draft.type, title: draft.title.trim(), desc: draft.desc.trim(),
          owner: draft.owner.trim() || '—', target: '', status: 'Not started', remarks: '',
        }],
      };
    });
    setDraft({ type: 'Hub', title: '', desc: '', owner: '' });
    setAdding(false);
  };

  const renderItem = (item) => (
    <li key={item.n} className="imp2-row">
      <div className="imp2-main">
        <div className="imp2-title">{item.title}</div>
        {item.desc && <p className="imp2-desc">{item.desc}</p>}
        <div className="imp2-meta">
          <span className="imp2-owner">Owner · {item.owner}</span>
          {!canEdit && item.target && <span className="imp2-due">Due {fmt(item.target, true)}</span>}
        </div>
        {!canEdit && item.remarks && <p className="imp2-remarks">{item.remarks}</p>}
      </div>

      {canEdit ? (
        <div className="imp2-edit">
          <div className="imp2-seg" role="radiogroup" aria-label={`Status for ${item.title}`}>
            {ISTAT.map(s => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={item.status === s}
                className={`${STAT_CLASS[s]}${item.status === s ? ' on' : ''}`}
                onClick={() => setField(item.n, 'status', s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="imp2-fields">
            <input type="date" value={item.target || ''} onChange={e => setField(item.n, 'target', e.target.value)} aria-label="Target date" />
            <input type="text" value={item.remarks || ''} onChange={e => setField(item.n, 'remarks', e.target.value)} placeholder="Add a remark" aria-label="Remarks" />
            <button type="button" className="imp2-del" onClick={() => removeItem(item)} aria-label={`Delete ${item.title}`} title="Delete">×</button>
          </div>
        </div>
      ) : (
        <span className={`imp2-pill ${STAT_CLASS[item.status] || 'is-none'}`}>{item.status}</span>
      )}
    </li>
  );

  const renderGroup = (type) => {
    const group = improvements.filter(i => i.type === type);
    if (!group.length) return null;
    return (
      <section key={type} className="imp2-card">
        <h2>{type} improvements</h2>
        <ul className="imp2-list">{group.map(renderItem)}</ul>
      </section>
    );
  };

  return (
    <div className="imp2">
      <div className="imp2-summary">
        <div className="imp2-top">
          <p>Owned by Thasleema and reviewed monthly with Kapil.</p>
          {canEdit && (
            <button type="button" className="btn" onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : '+ Add improvement'}</button>
          )}
        </div>
        <div className="imp2-bar" role="progressbar" aria-valuenow={pctDone} aria-valuemin={0} aria-valuemax={100} aria-label="Overall progress">
          <i style={{ width: pctDone + '%' }} />
        </div>
        <div className="imp2-counts">
          <span><b>{done}</b> of {improvements.length} done</span>
          <span><i className="d is-prog" /> {count('In progress')} in progress</span>
          <span><i className="d is-block" /> {count('Blocked')} blocked</span>
          <span><i className="d is-none" /> {count('Not started')} not started</span>
        </div>
      </div>

      {canEdit && adding && (
        <form className="imp2-add" onSubmit={addItem}>
          <input autoFocus placeholder="Title *" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <input placeholder="What will be done?" value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })} />
          <input placeholder="Owner" value={draft.owner} onChange={e => setDraft({ ...draft, owner: e.target.value })} />
          <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} aria-label="Type">
            <option>Hub</option>
            <option>Process</option>
          </select>
          <button type="submit" className="btn" disabled={!draft.title.trim()}>Add</button>
        </form>
      )}

      {renderGroup('Hub')}
      {renderGroup('Process')}

      {!canEdit && <p className="imp2-note">Read-only. PMs and TLs update this list.</p>}
    </div>
  );
}
