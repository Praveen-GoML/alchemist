import React, { useEffect, useState } from 'react';

/** Edit the basic details of a Pre-req initiative. */
export default function InitiativeEditModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({
    name: project.name || '',
    client_name: project.client_name || '',
    client_email: project.client_email || '',
    target_kickoff_date: project.target_kickoff_date || '',
    description: project.description || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.client_email.trim();
    if (!name) { setError('Initiative name is required.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid client email.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name,
        client_name: form.client_name.trim(),
        client_email: email,
        target_kickoff_date: form.target_kickoff_date,
        description: form.description.trim(),
      });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not save the changes.');
      setSaving(false);
    }
  };

  return (
    <div className="dlg-backdrop" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <dialog open style={{ display: 'block' }} aria-label="Edit initiative">
        <form onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>Edit initiative</h2>
          <div className="fgrid">
            <label className="full"><span>Initiative name *</span>
              <input autoFocus value={form.name} onChange={set('name')} />
            </label>
            <label><span>Client</span>
              <input value={form.client_name} onChange={set('client_name')} />
            </label>
            <label><span>Client email</span>
              <input type="email" value={form.client_email} onChange={set('client_email')} placeholder="name@client.com" />
            </label>
            <label><span>Target kick-off</span>
              <input type="date" value={form.target_kickoff_date} onChange={set('target_kickoff_date')} />
            </label>
          </div>
          <label className="full" style={{ marginTop: 12, display: 'block' }}><span>Description</span>
            <textarea rows="3" value={form.description} onChange={set('description')} />
          </label>
          {error && <p role="alert" style={{ color: '#D9482F', fontSize: 13, margin: '10px 0 0' }}>{error}</p>}
          <div className="dacts">
            <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
