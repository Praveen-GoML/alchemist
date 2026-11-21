import { useEffect, useState } from 'react';

/**
 * Reads Excel, CSV, Word, PowerPoint, zip and text files in the page itself (nothing is sent anywhere).
 * Props: blob (the file), ext (lowercase extension), onReady (called once something is on screen).
 */

const MAX_ROWS = 2000;
const MAX_COLS = 60;

const colName = (i) => { let n = i, s = ''; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; if (rows.length > MAX_ROWS + 1) break; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const cellText = (v) => (v == null ? '' : v instanceof Date ? v.toLocaleDateString('en-GB') : String(v));

function Grid({ rows, query }) {
  const head = rows[0] || [];
  const body = rows.slice(1);
  const q = query.trim().toLowerCase();
  const filtered = q ? body.filter(r => r.some(c => cellText(c).toLowerCase().includes(q))) : body;
  const shown = filtered.slice(0, MAX_ROWS);
  const cols = Math.min(MAX_COLS, Math.max(1, head.length, ...shown.map(r => r.length)));
  return (
    <>
      <div className="dr-card">
        <div className="dr-gridwrap">
          <table className="dr-grid">
            <thead>
              <tr><th className="rn">#</th>{Array.from({ length: cols }, (_, i) => <th key={i}>{cellText(head[i]) || colName(i)}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r, ri) => (
                <tr key={ri}>
                  <td className="rn">{ri + 1}</td>
                  {Array.from({ length: cols }, (_, ci) => <td key={ci} className={r[ci] == null || r[ci] === '' ? 'nil' : ''}>{cellText(r[ci])}</td>)}
                </tr>
              ))}
              {!shown.length && <tr><td className="rn" /><td colSpan={cols} className="dr-none">{q ? 'No rows match your search.' : 'This sheet is empty.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length > MAX_ROWS && <p className="dr-note">Showing the first {MAX_ROWS} of {filtered.length} rows.</p>}
    </>
  );
}

export default function DocRenderer({ blob, ext, onReady }) {
  const [state, setState] = useState({ kind: 'loading' });
  const [sheet, setSheet] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    const done = (s) => { if (alive) { setState(s); onReady?.(); } };
    (async () => {
      try {
        if (ext === 'xlsx') {
          const { default: readExcel } = await import('read-excel-file/web-worker');
          const sheets = await readExcel(blob);
          done({ kind: 'sheets', sheets: (Array.isArray(sheets) ? sheets : [{ sheet: 'Sheet 1', data: sheets }]).map(s => ({ name: s.sheet, rows: s.data })) });
        } else if (ext === 'csv') {
          done({ kind: 'sheets', sheets: [{ name: 'Data', rows: parseCsv(await blob.text()) }] });
        } else if (ext === 'docx') {
          const [{ default: mammoth }, { default: DOMPurify }] = await Promise.all([import('mammoth/mammoth.browser'), import('dompurify')]);
          const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
          done({ kind: 'html', html: DOMPurify.sanitize(value) });
        } else if (ext === 'pptx') {
          const { default: JSZip } = await import('jszip');
          const zip = await JSZip.loadAsync(await blob.arrayBuffer());
          const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
          const slides = [];
          for (const n of names) {
            const xml = await zip.files[n].async('string');
            const paras = [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map(m => [...m[1].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map(t => t[1]).join('')).map(t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).filter(Boolean);
            slides.push(paras);
          }
          done({ kind: 'slides', slides });
        } else if (ext === 'zip') {
          const { default: JSZip } = await import('jszip');
          const zip = await JSZip.loadAsync(await blob.arrayBuffer());
          done({ kind: 'zip', files: Object.values(zip.files).filter(f => !f.dir).map(f => ({ name: f.name, size: f._data?.uncompressedSize || 0 })) });
        } else if (ext === 'txt' || ext === 'md') {
          done({ kind: 'text', text: await blob.text() });
        } else {
          done({ kind: 'unsupported' });
        }
      } catch (e) {
        done({ kind: 'error' });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, ext]);

  if (state.kind === 'loading') return null;
  if (state.kind === 'unsupported') return <div className="dr-msg">Older Word, Excel and PowerPoint formats (.doc, .xls, .ppt) can't be read in the app. Save the file as .docx, .xlsx or .pptx, or as a PDF, and upload it again.</div>;
  if (state.kind === 'error') return <div className="dr-msg">This file couldn't be opened. It may be damaged or password protected.</div>;

  if (state.kind === 'sheets') {
    const cur = state.sheets[Math.min(sheet, state.sheets.length - 1)];
    return (
      <div className="dr dr-sheets">
        <Grid rows={cur?.rows || []} query={query} />
        {state.sheets.length > 1 && (
          <div className="dr-tabs" role="tablist">
            {state.sheets.map((s, i) => <button key={s.name + i} type="button" role="tab" aria-selected={i === sheet} className={i === sheet ? 'on' : ''} onClick={() => { setSheet(i); setQuery(''); }}>{s.name}</button>)}
          </div>
        )}
      </div>
    );
  }
  if (state.kind === 'html') return <div className="dr dr-paperwrap"><article className="dr-paper" dangerouslySetInnerHTML={{ __html: state.html }} /></div>;
  if (state.kind === 'text') return <div className="dr dr-paperwrap"><pre className="dr-paper dr-pre">{state.text}</pre></div>;
  if (state.kind === 'slides') {
    return (
      <div className="dr dr-slides">
        {state.slides.map((paras, i) => (
          <section key={i} className="dr-slide">
            <span className="dr-sn">{i + 1}</span>
            {paras.length ? paras.map((p, j) => (j === 0 ? <h3 key={j}>{p}</h3> : <p key={j}>{p}</p>)) : <p className="dr-empty">No text on this slide</p>}
          </section>
        ))}
        <p className="dr-note">Text and speaker layout only. Images and shapes are not shown.</p>
      </div>
    );
  }
  if (state.kind === 'zip') {
    return (
      <div className="dr dr-paperwrap">
        <article className="dr-paper">
          <h3 style={{ marginTop: 0 }}>Files in this archive ({state.files.length})</h3>
          <ul className="dr-ziplist">{state.files.map(f => <li key={f.name}><span>{f.name}</span><em>{f.size ? (f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`) : ''}</em></li>)}</ul>
        </article>
      </div>
    );
  }
  return null;
}
