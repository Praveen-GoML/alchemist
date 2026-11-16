import { ISTAT, pct } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function Improvements({ data, updateData }) {
  const { canManageImprovements } = useAuth();
  const canEdit = canManageImprovements();
  const { improvements=[] } = data;

  const done    = improvements.filter(i => i.status==='Done').length;
  const blocked = improvements.filter(i => i.status==='Blocked').length;

  const setField = (idx, field, val) => {
    if (!canEdit) return;
    updateData(prev => {
      const imp = [...prev.improvements];
      imp[idx] = {...imp[idx], [field]: val};
      return {...prev, improvements: imp};
    });
  };

  const renderGroup = (type) => {
    const group = improvements.filter(i => i.type === type);
    return (
      <section key={type} className="card">
        <div className="ch"><h2>{type} improvements</h2></div>
        <ul className="imps">
          {group.map(item => {
            const idx = improvements.indexOf(item);
            return (
              <li key={item.n}>
                <div className="imain">
                  <b>{item.title}</b>
                  <p>{item.desc}</p>
                  <div className="small muted">Owner {item.owner}</div>
                </div>
                <div className="ictl">
                  <select 
                    value={item.status} 
                    onChange={e => setField(idx,'status',e.target.value)}
                    disabled={!canEdit}
                    style={!canEdit ? { background: '#F9FAFB', cursor: 'default' } : {}}
                    aria-label="Status">
                    {ISTAT.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input 
                    type="date" 
                    value={item.target||''} 
                    onChange={e => setField(idx,'target',e.target.value)}
                    disabled={!canEdit}
                    style={!canEdit ? { background: '#F9FAFB', cursor: 'default' } : {}}
                    aria-label="Target date" 
                  />
                  <input 
                    type="text" 
                    value={item.remarks||''} 
                    onChange={e => setField(idx,'remarks',e.target.value)}
                    disabled={!canEdit}
                    style={!canEdit ? { background: '#F9FAFB', cursor: 'default' } : {}}
                    placeholder={canEdit ? "Remarks" : "No remarks"} 
                    aria-label="Remarks" 
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
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
            <span><strong>View-Only Portal:</strong> Hub improvements and roadmap milestones are managed by PMs and TLs.</span>
          </div>
          <span style={{ fontSize: '11px', background: '#E5E7EB', color: '#374151', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Read Only
          </span>
        </div>
      )}
      <p className="hint">
        Owned by Thasleema and reviewed monthly with Kapil. {done} of {improvements.length} done
        {blocked ? `, ${blocked} blocked` : ''}.
      </p>
      <div className="track big">
        <i style={{width: improvements.length ? Math.round(done/improvements.length*100)+'%' : '0%'}}></i>
      </div>
      {renderGroup('Hub')}
      {renderGroup('Process')}
    </div>
  );
}
