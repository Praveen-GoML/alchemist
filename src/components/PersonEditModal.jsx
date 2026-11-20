import React, { useEffect, useState } from 'react';
import Dropdown from './common/Dropdown';

const ROLES = ['PM', 'Lead', 'ML', 'Sr. ML', 'Jr. ML', 'ML-Intern', 'BE', 'FE', 'FE + BE', 'DE', 'Intern'];

/**
 * Edit a team member.
 *  mode "self": the person edits their own skills and GitHub only.
 *  mode "full": PM / TL edits everything except project involvement (that lives in the matrix).
 */
export default function PersonEditModal({ member, mode = 'self', combos = [], takenNames = [], takenEmails = [], onClose, onSave }) {
  const full = mode === 'full';
  const [f, setF] = useState({
    name: member.name || '', role: member.role || '', email: member.email || '',
    github: member.github || '', skills: member.skills || '', combo: member.combo || '',
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const roleOptions = ROLES.includes(f.role) || !f.role ? ROLES : [f.role, ...ROLES];

  const submit = (e) => {
    e.preventDefault();
    const name = f.name.trim(), role = f.role.trim(), email = f.email.trim().toLowerCase();
    if (full) {
      if (!name || !role) { setErr('Name and role are required.'); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid email address.'); return; }
      if (takenNames.some(n => n.toLowerCase() === name.toLowerCase())) { setErr('Someone with this name already exists.'); return; }
      if (email && takenEmails.includes(email)) { setErr('This email is already on the team.'); return; }
    }
    const skills = f.skills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).join(', ');
    const patch = full
      ? { name, role, email, github: f.github.trim().replace(/^@/, ''), skills, combo: f.combo }
      : { github: f.github.trim().replace(/^@/, ''), skills };
    onSave(patch);
  };

  return (
    <div className="dlg-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <dialog open style={{ display: 'block' }} aria-label={full ? 'Edit team member' : 'Edit my profile'}>
        <form onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>{full ? `Edit ${member.name}` : 'Edit my profile'}</h2>
          {!full && <p className="muted" style={{ margin: '-6px 0 14px', fontSize: 13 }}>You can update your own skills and GitHub. Ask a PM or TL to change anything else.</p>}
          <div className="fgrid">
            {full && (
              <>
                <label><span>Name *</span><input autoFocus value={f.name} onChange={set('name')} /></label>
                <div className="dd-field"><span>Role *</span>
                  <Dropdown value={f.role} onChange={v => setF(p => ({ ...p, role: v }))} options={roleOptions} placeholder="Select role" searchAt={6} />
                </div>
                <label><span>Email</span><input type="email" value={f.email} onChange={set('email')} /></label>
              </>
            )}
            <label><span>GitHub</span><input value={f.github} onChange={set('github')} placeholder="username" autoFocus={!full} /></label>
            {full && (
              <div className="dd-field"><span>ML combo</span>
                <Dropdown value={f.combo} onChange={v => setF(p => ({ ...p, combo: v }))} options={[{ value: '', label: 'None' }, ...combos]} />
              </div>
            )}
          </div>
          <label className="full" style={{ display: 'block', marginTop: 12 }}><span>Skills</span>
            <textarea rows="3" value={f.skills} onChange={set('skills')} placeholder="e.g. RAG, Chatbots, Python, AWS" />
          </label>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>Separate skills with commas.</p>
          {err && <p role="alert" style={{ color: '#C2570F', fontSize: 13, margin: '10px 0 0' }}>{err}</p>}
          <div className="dacts">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn">Save</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
