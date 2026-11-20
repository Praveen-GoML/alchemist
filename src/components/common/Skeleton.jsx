import React from 'react';

/* ====================================================
   Loading skeletons. Each view's skeleton mirrors its real layout
   (borderless cards, soft rows, pills) so nothing jumps on load.
   Styles live in styles/polish.css under ".sk-*".
   ==================================================== */

/* ── Atoms ── */
export function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', style = {}, className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} style={{ width, height, borderRadius, ...style }} />;
}

export function SkeletonCircle({ size = '36px', style = {} }) {
  return <Skeleton width={size} height={size} borderRadius="50%" style={style} />;
}

const Pill = ({ w = 96, h = 28 }) => <Skeleton width={w} height={h} borderRadius="999px" />;
const Card = ({ children, className = '', style }) => <div className={`sk-card ${className}`} style={style}>{children}</div>;
const Row = ({ children, className = '' }) => <div className={`sk-row ${className}`}>{children}</div>;
const range = n => Array.from({ length: Math.max(0, n | 0) }, (_, i) => i);
const clamp = (n, lo, hi, fallback) => Math.min(hi, Math.max(lo, Number.isFinite(n) && n > 0 ? n : fallback));
// stagger so the placeholders fade in one after another
const stg = i => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });

const Hint = ({ w = '60%' }) => <Skeleton width={w} height="14px" style={{ marginBottom: 18 }} />;
const CardHead = ({ titleW = 160, right }) => (
  <div className="sk-head">
    <Skeleton width={titleW} height="20px" />
    {right}
  </div>
);
const SoftRows = ({ n = 3, h = 64 }) => (
  <div className="sk-stack">{range(n).map(i => <Skeleton key={i} height={`${h}px`} borderRadius="14px" />)}</div>
);
const StatTiles = ({ n = 3 }) => (
  <div className="sk-tiles" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
    {range(n).map(i => <Skeleton key={i} height="92px" borderRadius="16px" />)}
  </div>
);

/* ── Home ── */
function SkeletonOverview({ n = 12 }) {
  return (
    <div>
      <Skeleton width="300px" height="30px" style={{ marginBottom: 10 }} />
      <Hint w="420px" />
      <Card>
        <CardHead titleW={150} right={<div className="sk-legend">{range(4).map(i => <Skeleton key={i} width="92px" height="14px" />)}</div>} />
        <div className="sk-pgrid">
          {range(n).map(i => (
            <div key={i} className="sk-pcard" style={stg(i)}>
              <Row className="sk-between"><Skeleton width="42px" height="42px" borderRadius="14px" /><Pill w={78} h={24} /></Row>
              <Skeleton width="70%" height="18px" style={{ marginTop: 14 }} />
              <Skeleton width="50%" height="12px" style={{ marginTop: 8 }} />
              <Skeleton height="5px" borderRadius="999px" style={{ marginTop: 20 }} />
              <Row className="sk-between" ><Skeleton width="45%" height="12px" /><Skeleton width="20%" height="12px" /></Row>
            </div>
          ))}
        </div>
      </Card>
      <div className="sk-grid2">
        <Card><CardHead titleW={120} right={<Pill w={90} h={28} />} /><SoftRows n={3} h={70} /></Card>
        <Card><CardHead titleW={100} /><StatTiles n={3} /><Skeleton height="54px" borderRadius="14px" style={{ marginTop: 14 }} /></Card>
        <Card><CardHead titleW={130} right={<SkeletonCircle size="28px" />} /><SoftRows n={4} h={58} /></Card>
        <Card>
          <CardHead titleW={150} right={<Pill w={110} h={28} />} />
          <StatTiles n={3} />
          <div className="sk-stack" style={{ marginTop: 18 }}>
            {range(5).map(i => <Row key={i}><Skeleton width="110px" height="12px" /><Skeleton height="8px" borderRadius="999px" style={{ flex: 1 }} /><Skeleton width="36px" height="12px" /></Row>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Projects ── */
function SkeletonProjects({ n = 9 }) {
  return (
    <div>
      <Row className="sk-toolbar">
        <Skeleton width="260px" height="44px" borderRadius="12px" />
        <Pill w={90} h={40} /><Pill w={96} h={40} /><Pill w={96} h={40} />
        <Skeleton width="280px" height="40px" borderRadius="12px" />
        <span style={{ flex: 1 }} />
        <Pill w={100} h={40} /><Pill w={130} h={40} />
      </Row>
      <Card className="sk-flush">
        <Row className="sk-th">{range(8).map(i => <Skeleton key={i} width={i === 1 ? '16%' : '9%'} height="12px" />)}</Row>
        {range(n).map(i => (
          <Row key={i} className="sk-tr" style={stg(i)}>
            <Skeleton width="7%" height="12px" /><Skeleton width="16%" height="14px" />
            <Pill w={118} h={30} /><Pill w={118} h={30} />
            <Skeleton width="9%" height="8px" borderRadius="999px" />
            <Skeleton width="8%" height="12px" /><Skeleton width="8%" height="12px" />
            <Row><SkeletonCircle size="28px" /><Skeleton width="70px" height="12px" /></Row>
          </Row>
        ))}
      </Card>
    </div>
  );
}

/* ── Pre-req trackers ── */
export function SkeletonPrereqRows({ rows = 5 }) {
  return (
    <Card className="sk-flush">
      <Row className="sk-th">{range(6).map(i => <Skeleton key={i} width={i === 0 ? '20%' : '10%'} height="12px" />)}</Row>
      {range(rows).map(i => (
        <Row key={i} className="sk-tr sk-tall" style={stg(i)}>
          <div style={{ width: '26%' }}><Skeleton width="85%" height="16px" /><Skeleton width="55%" height="12px" style={{ marginTop: 8 }} /></div>
          <div style={{ width: '16%' }}><Skeleton width="70%" height="14px" /><Skeleton width="45%" height="12px" style={{ marginTop: 8 }} /></div>
          <Skeleton width="10%" height="14px" />
          <div style={{ width: '16%' }}><Skeleton height="8px" borderRadius="999px" /></div>
          <Pill w={140} h={32} />
          <Skeleton width="90px" height="34px" borderRadius="10px" />
        </Row>
      ))}
    </Card>
  );
}

function SkeletonPrereq() {
  return (
    <div>
      <Row className="sk-between"><div><Skeleton width="260px" height="28px" /><Skeleton width="380px" height="13px" style={{ marginTop: 10 }} /></div><Row><Pill w={110} h={40} /><Pill w={170} h={40} /></Row></Row>
      <Row className="sk-toolbar"><Skeleton width="300px" height="40px" borderRadius="12px" />{range(3).map(i => <Pill key={i} w={96} h={34} />)}</Row>
      <SkeletonPrereqRows rows={6} />
    </div>
  );
}

/* ── Delivery checklist ── */
function SkeletonChecklist({ n = 7 }) {
  return (
    <div>
      <Hint w="55%" />
      <Skeleton width="220px" height="44px" borderRadius="12px" style={{ marginBottom: 18 }} />
      <Row className="sk-chips">{range(n).map(i => <Skeleton key={i} width="190px" height="60px" borderRadius="18px" />)}</Row>
      <Card>
        <CardHead titleW={120} right={<Pill w={190} h={30} />} />
        <div className="sk-fields">{range(4).map(i => <div key={i}><Skeleton width="70px" height="11px" style={{ marginBottom: 8 }} /><Skeleton height="42px" borderRadius="12px" /></div>)}</div>
        <div className="sk-phases">{range(5).map(i => <div key={i}><Skeleton width="80px" height="12px" /><Skeleton height="6px" borderRadius="999px" style={{ margin: '10px 0 8px' }} /><Skeleton width="30px" height="11px" /></div>)}</div>
      </Card>
      {range(2).map(p => (
        <Card key={p} className="sk-flush" style={{ marginTop: 18 }}>
          <Row className="sk-between sk-phasehead"><div><Skeleton width="190px" height="18px" /><Skeleton width="260px" height="12px" style={{ marginTop: 8 }} /></div><Row><Skeleton width="100px" height="6px" borderRadius="999px" /><Skeleton width="32px" height="32px" borderRadius="10px" /></Row></Row>
          {range(p === 0 ? 5 : 3).map(i => (
            <Row key={i} className="sk-tr sk-between">
              <Row><Skeleton width="16px" height="12px" /><div><Skeleton width="340px" height="14px" /><Skeleton width="220px" height="11px" style={{ marginTop: 8 }} /></div></Row>
              <Skeleton width="400px" height="38px" borderRadius="12px" />
            </Row>
          ))}
        </Card>
      ))}
    </div>
  );
}

/* ── Team ── */
function SkeletonTeam({ n = 9 }) {
  return (
    <div>
      <Hint w="380px" />
      <Row className="sk-toolbar"><Skeleton width="360px" height="44px" borderRadius="12px" /><span style={{ flex: 1 }} /><Pill w={130} h={40} /></Row>
      <Skeleton width="340px" height="44px" borderRadius="12px" style={{ marginBottom: 18 }} />
      <div className="sk-people">
        {range(n).map(i => (
          <Card key={i} style={stg(i)}>
            <Row className="sk-between"><Row><Skeleton width="48px" height="48px" borderRadius="14px" /><div><Skeleton width="140px" height="16px" /><Skeleton width="60px" height="12px" style={{ marginTop: 8 }} /></div></Row><Row><Skeleton width="32px" height="32px" borderRadius="10px" /><Skeleton width="32px" height="32px" borderRadius="10px" /></Row></Row>
            <Row className="sk-between" style={{ marginTop: 22 }}><Skeleton width="100px" height="12px" /><Skeleton width="60px" height="12px" /></Row>
            <Row className="sk-wrap">{range(4).map(j => <Pill key={j} w={70 + j * 8} h={26} />)}</Row>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Daily hygiene ── */
function SkeletonHygiene({ n = 8 }) {
  return (
    <div>
      <Hint w="70%" />
      <Card style={{ marginBottom: 18 }}><Row><Pill w={84} h={38} /><Pill w={84} h={38} /><Pill w={84} h={38} /><Skeleton width="320px" height="22px" /><Pill w={90} h={26} /></Row></Card>
      <Card className="sk-flush">
        <div className="sk-pad"><CardHead titleW={260} right={<Skeleton width="280px" height="14px" />} /></div>
        <Row className="sk-th"><Skeleton width="16%" height="12px" />{range(5).map(i => <Skeleton key={i} width="9%" height="12px" />)}<Skeleton width="7%" height="12px" /><Skeleton width="7%" height="12px" /></Row>
        {range(n).map(i => (
          <Row key={i} className="sk-tr" style={stg(i)}>
            <div style={{ width: '16%' }}><Skeleton width="80%" height="14px" /><Skeleton width="40%" height="11px" style={{ marginTop: 6 }} /></div>
            {range(10).map(j => <Skeleton key={j} width="34px" height="34px" borderRadius="10px" />)}
            <Skeleton width="40px" height="12px" /><Skeleton width="40px" height="12px" />
          </Row>
        ))}
      </Card>
    </div>
  );
}

/* ── Leave tracker ── */
function SkeletonLeave({ days = 30, n = 9 }) {
  return (
    <div className="sk-stack" style={{ gap: 18 }}>
      <Card><Row><Pill w={80} h={38} /><Pill w={84} h={38} /><Pill w={80} h={38} /><Skeleton width="180px" height="22px" /><span style={{ flex: 1 }} /><Skeleton width="220px" height="14px" /></Row></Card>
      <Card>
        <CardHead titleW={90} right={<Skeleton width="300px" height="13px" />} />
        <div className="sk-leavepick">{range(11).map(i => <Skeleton key={i} height="46px" borderRadius="14px" />)}</div>
      </Card>
      <Card>
        <Row className="sk-leavehead"><Row><Skeleton width="26px" height="26px" borderRadius="8px" /><Skeleton width="80px" height="16px" /><Skeleton width="26px" height="26px" borderRadius="8px" /></Row><div className="sk-days" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>{range(days).map(i => <Skeleton key={i} height="11px" />)}</div></Row>
        {range(n).map(r => (
          <Row key={r} className="sk-leaverow">
            <Row><SkeletonCircle size="28px" /><Skeleton width="120px" height="13px" /></Row>
            <div className="sk-days" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>{range(days).map(i => <SkeletonCircle key={i} size="22px" style={{ margin: '0 auto', opacity: (i + r) % 7 === 0 ? 1 : 0.45 }} />)}</div>
          </Row>
        ))}
      </Card>
    </div>
  );
}

/* ── Docs & Drive ── */
function SkeletonDocs({ n = 6 }) {
  return (
    <div>
      <Row className="sk-between" ><div><Skeleton width="360px" height="30px" /><Skeleton width="560px" height="13px" style={{ marginTop: 10 }} /></div><Pill w={190} h={42} /></Row>
      <Row className="sk-chips" style={{ margin: '18px 0' }}>{range(n).map(i => <Skeleton key={i} width="190px" height="58px" borderRadius="16px" />)}</Row>
      <div className="sk-docs">
        <div>
          <Card><Skeleton width="130px" height="11px" style={{ marginBottom: 14 }} /><SoftRows n={6} h={42} /></Card>
          <Skeleton height="170px" borderRadius="16px" style={{ marginTop: 18 }} />
        </div>
        <div>
          <Skeleton height="46px" borderRadius="12px" style={{ marginBottom: 14 }} />
          <div className="sk-docgrid">{range(4).map(i => <Card key={i}><Row><Skeleton width="40px" height="40px" borderRadius="12px" /><div style={{ flex: 1 }}><Skeleton width="80%" height="15px" /><Skeleton width="50%" height="11px" style={{ marginTop: 8 }} /></div></Row><Skeleton height="40px" borderRadius="12px" style={{ marginTop: 16 }} /></Card>)}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Hub improvements ── */
function SkeletonImprovements({ n = 6 }) {
  return (
    <div className="sk-stack" style={{ gap: 18, maxWidth: 1100 }}>
      <Card>
        <Row className="sk-between"><Skeleton width="300px" height="14px" /><Pill w={170} h={40} /></Row>
        <Skeleton height="8px" borderRadius="999px" style={{ margin: '16px 0 14px' }} />
        <Row>{range(4).map(i => <Skeleton key={i} width="110px" height="12px" />)}</Row>
      </Card>
      <Card>
        <Skeleton width="160px" height="20px" style={{ marginBottom: 10 }} />
        {range(n).map(i => (
          <Row key={i} className="sk-between sk-item" style={stg(i)}>
            <div style={{ flex: 1 }}><Skeleton width="38%" height="16px" /><Skeleton width="62%" height="12px" style={{ margin: '10px 0' }} /><Skeleton width="20%" height="11px" /></div>
            <div style={{ width: 420 }}><Skeleton height="40px" borderRadius="12px" /><Row style={{ marginTop: 10 }}><Skeleton width="150px" height="36px" borderRadius="10px" /><Skeleton height="36px" borderRadius="10px" style={{ flex: 1 }} /></Row></div>
          </Row>
        ))}
      </Card>
    </div>
  );
}

/* ── Tracker links ── */
function SkeletonLinks() {
  return (
    <div className="sk-stack" style={{ gap: 18 }}>
      <Card>
        {range(5).map(i => (
          <Row key={i} className="sk-between sk-item">
            <Row><Skeleton width="40px" height="40px" borderRadius="12px" /><div><Skeleton width="200px" height="15px" /><Skeleton width="320px" height="11px" style={{ marginTop: 8 }} /></div></Row>
            <Skeleton width="84px" height="32px" borderRadius="999px" />
          </Row>
        ))}
      </Card>
      <Card>
        <Skeleton width="180px" height="20px" style={{ marginBottom: 14 }} />
        <Row><Pill w={150} h={40} /><Pill w={150} h={40} /></Row>
      </Card>
    </div>
  );
}

/* ====================================================
   SkeletonView: picks the skeleton for a view
   ==================================================== */
export function SkeletonView({ view, data = {}, ui = {} }) {
  const projects = (data.projects || []).length;
  const members = (data.members || []).length;
  const imps = (data.improvements || []).length;
  const clp = (data.clProjects || []).length;
  const [ly, lm] = String(ui.leaveMonth || '').split('-').map(Number);
  const monthDays = ly && lm ? new Date(ly, lm, 0).getDate() : 30;
  switch (view) {
    case 'overview':     return <SkeletonOverview n={clamp(projects, 4, 16, 12)} />;
    case 'projects':     return <SkeletonProjects n={clamp(projects, 4, 12, 9)} />;
    case 'prereq':       return <SkeletonPrereq />;
    case 'checklist':    return <SkeletonChecklist n={clamp(clp, 3, 8, 7)} />;
    case 'team':         return <SkeletonTeam n={clamp(members, 3, 9, 9)} />;
    case 'hygiene':      return <SkeletonHygiene n={clamp(members, 4, 10, 8)} />;
    case 'leave':        return <SkeletonLeave days={monthDays} n={clamp(members, 4, 12, 9)} />;
    case 'docs':         return <SkeletonDocs n={clamp(projects, 3, 8, 6)} />;
    case 'improvements': return <SkeletonImprovements n={clamp(imps, 3, 8, 6)} />;
    case 'links':        return <SkeletonLinks />;
    default:
      return (
        <Card>
          <Skeleton width="260px" height="22px" style={{ marginBottom: 16 }} />
          <SoftRows n={5} h={52} />
        </Card>
      );
  }
}
