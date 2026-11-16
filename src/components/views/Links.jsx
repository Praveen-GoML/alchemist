import { useState } from 'react';
import { iso, today } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function Links({ data, updateData }) {
  const { canManageLinks } = useAuth();
  const canEdit = canManageLinks();
  const { links=[] } = data;
  const [form, setForm] = useState({ name:'', url:'', note:'' });

  const addLink = e => {
    e.preventDefault();
    if (!canEdit || !form.name.trim() || !form.url.trim()) return;
    updateData(prev => ({
      ...prev,
      links: [...prev.links, { name:form.name.trim(), url:form.url.trim(), note:form.note.trim() }]
    }));
    setForm({ name:'', url:'', note:'' });
  };

  const removeLink = idx => {
    if (!canEdit) return;
    updateData(prev => ({
      ...prev,
      links: prev.links.filter((_,i) => i !== idx)
    }));
  };

  const exportAllJSON = () => {
    const d = JSON.stringify(data);
    const b = new Blob([d], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `go-alchemists-hub-data-${iso(today())}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };

  const importJSON = e => {
    if (!canEdit) {
      alert('Only Project Managers and Team Leads can import data.');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(t => {
      let o;
      try { o = JSON.parse(t); } catch { alert('That file isn\'t valid JSON.'); return; }
      if (!o || !Array.isArray(o.projects) || !Array.isArray(o.members)) {
        alert('That file isn\'t a Go Alchemists Hub export.'); return;
      }
      if (!confirm(`Replace all data with ${file.name}?`)) return;
      updateData(() => ({...o, prereqs:o.prereqs||[], prSeq:o.prSeq||0}));
    });
    e.target.value = '';
  };

  return (
    <div>
      {!canEdit && (
        <div style={{
          marginBottom: '1rem',
          padding: '10px 16px',
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#4B5563'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>👁️</span>
            <span><strong>View-Only Portal:</strong> Tracker links are curated by PMs and TLs.</span>
          </div>
          <span style={{ fontSize: '11px', background: '#E5E7EB', color: '#374151', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Read Only
          </span>
        </div>
      )}
      <p className="hint">Shortcuts to trackers that live elsewhere. Add any link you keep reaching for.</p>

      <section className="card">
        <ul className="links">
          {links.length ? links.map((l, i) => (
            <li key={i}>
              <div>
                <a href={l.url} target="_blank" rel="noopener"><b>{l.name}</b></a>
                {l.note && <div className="small muted">{l.note}</div>}
                <div className="small muted url">
                  {l.url.replace(/^https?:\/\//,'').slice(0,60)}{l.url.length>68?'…':''}
                </div>
              </div>
              {canEdit && <button className="btn ghost danger sm" onClick={() => removeLink(i)}>Remove</button>}
            </li>
          )) : (
            <li className="muted">No links yet.</li>
          )}
        </ul>

        {canEdit && (
          <form className="fgrid three addlink" onSubmit={addLink} style={{borderTop:'1px solid var(--line)',paddingTop:14,marginTop:0}}>
            <label><span>Name</span>
              <input required placeholder="e.g. Sprint plan – Gifto"
                value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
            </label>
            <label><span>URL</span>
              <input type="url" required placeholder="https://"
                value={form.url} onChange={e => setForm(f=>({...f,url:e.target.value}))} />
            </label>
            <label><span>Note (optional)</span>
              <input value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} />
            </label>
            <div><button className="btn" type="submit">Add link</button></div>
          </form>
        )}
      </section>

      <section className="card">
        <div className="ch"><h2>Backup and move data</h2></div>
        <p className="small muted">Download everything on this site as one file, or import a file exported from another copy.</p>
        <div className="acts">
          <button className="btn ghost" onClick={exportAllJSON}>Export all data</button>
          {canEdit && (
            <label className="btn ghost">
              Import data
              <input type="file" accept=".json,application/json" className="sr" onChange={importJSON} />
            </label>
          )}
        </div>
      </section>
    </div>
  );
}
