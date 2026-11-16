export const PHASES = ['Pre-project','Readiness','Kick-off & planning','Execution','UAT & closure'];
export const PSTAT  = ['On Schedule','Behind','Delayed','Not Started','Completed'];
export const CSTAT  = ['','In progress','Done','Blocked','N/A'];
export const ISTAT  = ['Not started','In progress','Done','Blocked'];
export const LEAVE  = [['CL','Casual leave'],['SL','Sick leave'],['EL','Earned leave'],['CO','Comp off'],['FL','Floater'],['MWB','Mental well-being'],['LOP','Loss of pay'],['BRV','Bereavement'],['MAR','Marriage'],['SAB','Sabbatical'],['HOL','Holiday']];
export const COMBO  = {Gold:'Au',Silver:'Ag',Mercury:'Hg',Copper:'Cu'};

export function pad(n) { return n < 10 ? '0' + n : '' + n; }
export function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
export function ym(d)  { return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }

export function parse(s) {
  if (!s) return null;
  const [y,m,d] = s.split('-');
  return new Date(+y, +m-1, +d);
}

export function today() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

export function days(a, b) { return Math.round((b - a) / 864e5); }

export function mondayOf(d) {
  d = new Date(d);
  d.setHours(0,0,0,0);
  const w = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - w);
  return iso(d);
}

export function fmt(s, withYear) {
  const d = parse(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', withYear
    ? { day:'numeric', month:'short', year:'numeric' }
    : { day:'numeric', month:'short' });
}

export function pct(x) { return Math.round(x * 100) + '%'; }

export function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

export function sym(name) {
  const w = name.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/);
  return (w.length > 1 && /^[A-Z]/.test(w[1])
    ? w[0][0] + w[1][0].toLowerCase()
    : w[0].slice(0,2)
  ).replace(/^./, c => c.toUpperCase());
}

export function d2(s) {
  const d = parse(s);
  if (!d) return 'N/A';
  return pad(d.getDate()) + '-' + d.toLocaleDateString('en-GB',{month:'short'}).slice(0,3) + '-' + d.getFullYear();
}

export function initials(n) {
  const w = String(n).trim().split(/\s+/);
  return (w[0] ? w[0][0] : '?').toUpperCase();
}

export function norm(n) {
  return String(n).toLowerCase().replace(/phase/g,'ph').replace(/[^a-z0-9]/g,'');
}

export function projDelay(p) {
  const e = parse(p.end);
  if (!e || p.status === 'Completed' || p.status === 'Not Started') return 0;
  return Math.max(0, days(e, today()));
}

export function uatDelay(p) {
  const a = parse(p.pUatSign), b = parse(p.rUatSign);
  return a && b ? days(a, b) : 0;
}

export function clSummary(name, checklist, items) {
  const st  = checklist[name] || {};
  const ph  = [0,0,0,0,0].map(() => ({done:0,tot:0}));
  let done=0, tot=0, gate=0, blocked=0;
  items.forEach(it => {
    const s = st[it.n] || '';
    if (s === 'N/A') return;
    const P = ph[it.phase-1];
    P.tot++; tot++;
    if (s === 'Done')    { P.done++; done++; }
    if (s === 'Blocked') blocked++;
    if (it.gate && s !== 'Done') gate++;
  });
  const pp = ph.map(P => P.tot ? P.done/P.tot : 1);
  let stage = 'Closed';
  for (let i = 0; i < 5; i++) { if (pp[i] < 1) { stage = PHASES[i]; break; } }
  const warn = ((st[22]||st[23]) && st[20] !== 'Done');
  return { pp, overall: tot ? done/tot : 1, stage, gate, blocked, warn };
}

export function hygMembers(members) {
  return members.filter(m => m.role !== 'PM');
}

export function hygPct(memberName, wk, hygiene) {
  const w = (hygiene[wk] || {})[memberName] || {};
  let l=[0,0], t=[0,0];
  for (let d=0; d<5; d++) {
    const c = w[d] || {};
    if (c.l==='Y'||c.l==='N') { l[1]++; if(c.l==='Y') l[0]++; }
    if (c.t==='Y'||c.t==='N') { t[1]++; if(c.t==='Y') t[0]++; }
  }
  return { l: l[1] ? l[0]/l[1] : null, t: t[1] ? t[0]/t[1] : null };
}

export function projTeam(p, members) {
  const k = norm(p.name);
  return members
    .filter(m => m.projects.some(x => norm(x) === k))
    .map(m => m.name);
}

export function projProgress(p, checklist, clProjects, items) {
  return clProjects.indexOf(p.name) >= 0
    ? clSummary(p.name, checklist, items).overall
    : 0;
}

export function exportCSV(rows, filename) {
  const q = v => {
    v = String(v == null ? '' : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v;
  };
  const csv = '\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n');
  const b = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

export function exportJSON(data, filename) {
  const b = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
