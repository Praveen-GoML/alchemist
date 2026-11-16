import React from 'react';

/* ====================================================
   BASE SKELETON ATOM
   ==================================================== */
export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', style = {}, className = '' }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonCircle({ size = '36px', style = {} }) {
  return <Skeleton width={size} height={size} borderRadius="50%" style={style} />;
}

/* ====================================================
   SHARED MICRO-COMPONENTS
   ==================================================== */

// A card wrapper that looks like `.card`
function SkelCard({ children, style = {}, padless = false }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      padding: padless ? 0 : '16px 20px',
      overflow: padless ? 'hidden' : undefined,
      ...style
    }}>
      {children}
    </div>
  );
}

// A section header row (title on left, optional action on right)
function SkelCardHeader({ titleW = '140px', actionW = '80px', noAction = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <Skeleton width={titleW} height="16px" borderRadius="6px" />
      {!noAction && <Skeleton width={actionW} height="14px" borderRadius="4px" />}
    </div>
  );
}

// A table inside a card (with header row + N body rows, each with C cols)
function SkelTable({ cols = 5, rows = 6, colWidths = null }) {
  const defaultWidths = Array.from({ length: cols }, (_, i) =>
    i === 0 ? '25%' : `${Math.floor(75 / (cols - 1))}%`
  );
  const widths = colWidths || defaultWidths;

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Header row */}
      <div style={{
        display: 'flex', gap: '8px', padding: '10px 20px',
        background: '#FAFAFA', borderBottom: '1px solid var(--line)'
      }}>
        {widths.map((w, i) => (
          <Skeleton key={i} width={w} height="12px" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'flex', gap: '8px', padding: '13px 20px',
          borderBottom: r === rows - 1 ? 'none' : '1px solid var(--line)',
          alignItems: 'center'
        }}>
          {widths.map((w, c) => (
            <Skeleton key={c}
              width={c === 0 ? `${parseInt(w) - (r % 3) * 5}%` : w}
              height="12px"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ====================================================
   EXPORTED LEGACY COMPONENTS (used by dashboards)
   ==================================================== */
export function SkeletonCard({ height = '160px', style = {} }) {
  return (
    <SkelCard style={{ height, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width="40px" height="40px" borderRadius="10px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width="55%" height="16px" />
          <Skeleton width="35%" height="12px" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="100%" height="8px" borderRadius="4px" />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton width="25%" height="12px" />
          <Skeleton width="15%" height="12px" />
        </div>
      </div>
    </SkelCard>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <SkelCard padless>
      <SkelTable rows={rows} cols={cols} />
    </SkelCard>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="220px" height="24px" borderRadius="8px" />
          <Skeleton width="300px" height="13px" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton width="120px" height="36px" borderRadius="8px" />
          <Skeleton width="90px" height="36px" borderRadius="8px" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkelCard key={i}>
            <Skeleton width="80px" height="11px" style={{ marginBottom: '10px' }} />
            <Skeleton width="60px" height="28px" borderRadius="6px" style={{ marginBottom: '8px' }} />
            <Skeleton width="110px" height="11px" />
          </SkelCard>
        ))}
      </div>
      <SkelCard padless><SkelTable rows={5} cols={6} /></SkelCard>
    </div>
  );
}

/* ====================================================
   PER-VIEW SKELETONS — matching exact element counts
   ==================================================== */

/* ── OVERVIEW ──────────────────────────────────────────
   Structure:
   - .greet h2 + hint p
   - section.card: "Project portfolio" header + 14 project tiles in .ptable
   - .grid2:
       - card: "UAT windows" header + list of 3 upcoming items
       - card: "This week" header + 3 stat items
       - card: "Open blockers" header + 3 blocker items
       - card: "Delivery checklist" header + 3 stat items + 6 progress bars
*/
function SkeletonOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* greet */}
      <div>
        <Skeleton width="240px" height="22px" borderRadius="6px" style={{ marginBottom: '8px' }} />
        <Skeleton width="380px" height="13px" />
      </div>

      {/* Project portfolio card */}
      <SkelCard padless>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="160px" height="16px" />
          <div style={{ display: 'flex', gap: '10px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="70px" height="13px" />
            ))}
          </div>
        </div>
        {/* 14 project tiles as rows */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton width="28px" height="28px" borderRadius="6px" />
              <Skeleton width={`${30 + (i % 5) * 8}%`} height="13px" />
              <Skeleton width="80px" height="11px" style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </SkelCard>

      {/* grid2: 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* UAT windows - 3 items */}
        <SkelCard>
          <SkelCardHeader titleW="120px" actionW="70px" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px' }}>
              <Skeleton width="10px" height="10px" borderRadius="50%" style={{ marginTop: '4px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width={`${50 + i * 10}%`} height="14px" />
                <Skeleton width="75%" height="11px" />
                <Skeleton width="50%" height="11px" />
              </div>
            </div>
          ))}
        </SkelCard>

        {/* This week - 3 stats */}
        <SkelCard>
          <SkelCardHeader titleW="100px" noAction />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Skeleton width="50px" height="22px" borderRadius="6px" />
                <Skeleton width={`${45 + i * 12}%`} height="12px" />
              </div>
            ))}
          </div>
        </SkelCard>

        {/* Open blockers - 3 items */}
        <SkelCard>
          <SkelCardHeader titleW="130px" actionW="20px" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
              <Skeleton width="40%" height="13px" />
              <Skeleton width={`${55 + i * 8}%`} height="12px" />
            </div>
          ))}
        </SkelCard>

        {/* Delivery checklist - 3 stats + 6 progress bars */}
        <SkelCard>
          <SkelCardHeader titleW="160px" actionW="90px" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
              <Skeleton width="50px" height="22px" borderRadius="6px" />
              <Skeleton width={`${40 + i * 15}%`} height="12px" />
            </div>
          ))}
          {/* 6 progress bars */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Skeleton width={`${25 + i * 5}%`} height="12px" />
              <Skeleton width="100%" height="6px" borderRadius="3px" style={{ flex: 1 }} />
              <Skeleton width="30px" height="12px" />
            </div>
          ))}
        </SkelCard>
      </div>
    </div>
  );
}

/* ── PROJECTS ──────────────────────────────────────────
   Structure:
   - hint p
   - toolbar: sort select + search input + 2 buttons
   - 14-row table: sno, name, status, start, end, uat, team, progress, delay, actions
*/
function SkeletonProjects() {
  const COL_WIDTHS = ['4%', '18%', '10%', '8%', '8%', '8%', '8%', '12%', '7%', '6%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* hint */}
      <Skeleton width="300px" height="13px" />

      {/* toolbar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Skeleton width="160px" height="34px" borderRadius="8px" />
        <Skeleton width="220px" height="34px" borderRadius="8px" />
        <Skeleton width="100px" height="34px" borderRadius="8px" style={{ marginLeft: 'auto' }} />
        <Skeleton width="90px" height="34px" borderRadius="8px" />
      </div>

      {/* table - 14 projects */}
      <SkelCard padless>
        <SkelTable cols={COL_WIDTHS.length} rows={14} colWidths={COL_WIDTHS} />
      </SkelCard>
    </div>
  );
}

/* ── CHECKLIST ─────────────────────────────────────────
   Structure:
   - hint p
   - toolbar: 2 tabs (One project / All projects)
   - project tab pills: ~8 project names
   - 5 phase accordion blocks, each collapsed/expanded with items
*/
function SkeletonChecklist() {
  // 5 phases, approximate item counts per phase: 7, 10, 10, 11, 8
  const phaseCounts = [7, 10, 10, 11, 8];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* hint */}
      <Skeleton width="460px" height="13px" />

      {/* toolbar: 2 view tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <Skeleton width="110px" height="34px" borderRadius="8px" />
        <Skeleton width="120px" height="34px" borderRadius="8px" />
      </div>

      {/* project select tabs (8 projects visible in checklist) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width={`${60 + i * 8}px`} height="30px" borderRadius="8px" />
        ))}
        <Skeleton width="30px" height="30px" borderRadius="8px" />
      </div>

      {/* project meta row */}
      <SkelCard>
        <div style={{ display: 'flex', gap: '24px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Skeleton width="60px" height="11px" />
              <Skeleton width="100px" height="20px" borderRadius="6px" />
            </div>
          ))}
        </div>
      </SkelCard>

      {/* 5 phase blocks */}
      {phaseCounts.map((count, p) => (
        <div key={p} style={{ border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Phase header accordion row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: '#FAFAFA', borderBottom: '1px solid var(--line)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton width={`${120 + p * 10}px`} height="16px" />
              <Skeleton width="55px" height="20px" borderRadius="12px" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton width="70px" height="13px" />
              <Skeleton width="16px" height="16px" borderRadius="4px" />
            </div>
          </div>
          {/* Item rows - show 4 items in skeleton (actual count in header) */}
          {Array.from({ length: Math.min(count, 4) }).map((_, r) => (
            <div key={r} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 20px',
              borderBottom: r === 3 || r === count - 1 ? 'none' : '1px solid var(--line)'
            }}>
              <Skeleton width="20px" height="20px" borderRadius="4px" style={{ flexShrink: 0 }} />
              <Skeleton width={`${40 + r * 10}%`} height="13px" />
              <Skeleton width="70px" height="22px" borderRadius="6px" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              <Skeleton width="80px" height="13px" style={{ flexShrink: 0 }} />
              <Skeleton width="60px" height="13px" style={{ flexShrink: 0 }} />
            </div>
          ))}
          {/* "...and N more" indicator if phase has more than 4 items */}
          {count > 4 && (
            <div style={{ padding: '8px 20px', borderTop: '1px solid var(--line)' }}>
              <Skeleton width="120px" height="11px" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── TEAM ──────────────────────────────────────────────
   Structure:
   - hint p: "N people across..."
   - toolbar: 3 tabs (People / ML combos / Project matrix)
   - People view (default): search input + people card grid
   - Person cards: avatar tile + name + role + skill pills + active projects
*/
function SkeletonTeam() {
  // Approximate members count from initialState: ~15 people
  const MEMBER_COUNT = 12;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* hint */}
      <Skeleton width="320px" height="13px" />

      {/* toolbar: 3 tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <Skeleton width="80px" height="34px" borderRadius="8px" />
        <Skeleton width="110px" height="34px" borderRadius="8px" />
        <Skeleton width="130px" height="34px" borderRadius="8px" />
      </div>

      {/* search input */}
      <Skeleton width="100%" height="38px" borderRadius="8px" />

      {/* people card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {Array.from({ length: MEMBER_COUNT }).map((_, i) => (
          <div key={i} style={{
            border: '1px solid var(--line)', borderRadius: '12px',
            padding: '16px', background: 'var(--surface)',
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            {/* avatar + name + role row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Skeleton width="42px" height="42px" borderRadius="10px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width={`${45 + (i % 4) * 8}%`} height="14px" />
                <Skeleton width={`${30 + (i % 3) * 6}%`} height="12px" />
              </div>
              {/* action icons */}
              <Skeleton width="26px" height="26px" borderRadius="50%" />
            </div>

            {/* skill pills: 2–4 pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Array.from({ length: 2 + (i % 3) }).map((_, s) => (
                <Skeleton key={s} width={`${42 + s * 14}px`} height="22px" borderRadius="20px" />
              ))}
            </div>

            {/* divider */}
            <Skeleton width="100%" height="1px" />

            {/* Active projects section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="100px" height="12px" />
                <Skeleton width="30px" height="12px" />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Array.from({ length: 1 + (i % 3) }).map((_, t) => (
                  <Skeleton key={t} width={`${50 + t * 20}px`} height="20px" borderRadius="6px" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── HYGIENE ───────────────────────────────────────────
   Structure:
   - hint p
   - leave-header-bar: prev/today/next buttons + week label
   - section.card:
       - ch: week label + team compliance stats
       - table: name col + Mon–Fri × (Lat|TS) cols + Lattice% + Timesheet% cols
         ~15 rows (ML + some non-PM members)
   - legend row: Y/N/L/blank
*/
function SkeletonHygiene() {
  const MEMBER_COUNT = 14;
  const DAYS = 5; // Mon–Fri
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* hint */}
      <Skeleton width="480px" height="13px" />

      {/* nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px' }}>
        <Skeleton width="70px" height="32px" borderRadius="8px" />
        <Skeleton width="70px" height="32px" borderRadius="8px" />
        <Skeleton width="70px" height="32px" borderRadius="8px" />
        <Skeleton width="180px" height="16px" style={{ marginLeft: '8px' }} />
      </div>

      {/* main table card */}
      <SkelCard padless>
        {/* ch header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <Skeleton width="220px" height="16px" />
          <Skeleton width="220px" height="13px" />
        </div>
        {/* table header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '10px 20px', background: '#FAFAFA', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
          <Skeleton width="130px" height="12px" style={{ flexShrink: 0 }} />
          {Array.from({ length: DAYS }).map((_, d) => (
            <div key={d} style={{ display: 'flex', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
              <Skeleton width="36px" height="24px" borderRadius="4px" />
              <Skeleton width="36px" height="24px" borderRadius="4px" />
            </div>
          ))}
          <Skeleton width="55px" height="12px" style={{ marginLeft: '12px', flexShrink: 0 }} />
          <Skeleton width="70px" height="12px" style={{ marginLeft: '12px', flexShrink: 0 }} />
        </div>
        {/* member rows */}
        {Array.from({ length: MEMBER_COUNT }).map((_, r) => (
          <div key={r} style={{
            display: 'flex', alignItems: 'center', gap: '0',
            padding: '10px 20px',
            borderBottom: r === MEMBER_COUNT - 1 ? 'none' : '1px solid var(--line)',
            overflowX: 'auto'
          }}>
            <div style={{ width: '130px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Skeleton width={`${60 + (r % 4) * 10}%`} height="13px" />
              <Skeleton width="55%" height="11px" />
            </div>
            {Array.from({ length: DAYS }).map((_, d) => (
              <div key={d} style={{ display: 'flex', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
                <Skeleton width="36px" height="32px" borderRadius="6px" />
                <Skeleton width="36px" height="32px" borderRadius="6px" />
              </div>
            ))}
            <Skeleton width="55px" height="13px" style={{ marginLeft: '12px', flexShrink: 0 }} />
            <Skeleton width="55px" height="13px" style={{ marginLeft: '12px', flexShrink: 0 }} />
          </div>
        ))}
      </SkelCard>

      {/* legend row: 4 items */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={`${40 + i * 20}px`} height="13px" />
        ))}
      </div>
    </div>
  );
}

/* ── LEAVE ─────────────────────────────────────────────
   Structure:
   - leave-header-bar: prev/today/next + month title + stats
   - leave-brush-card: title + 11 brush buttons (LEAVE types)
   - section.card: month calendar table
       - header: "Name" sticky + 28-31 date cols + "Total"
       - ~20 member rows
   - leave-legend-bar: 11 color items
*/
function SkeletonLeave() {
  const LEAVE_COUNT = 11; // CL SL EL CO FL MWB LOP BRV MAR SAB HOL
  const MEMBER_COUNT = 16;
  const DAYS_COUNT = 31; // max days in a month
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* leave-header-bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: '10px', flexWrap: 'wrap', gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Skeleton width="70px" height="32px" borderRadius="8px" />
          <Skeleton width="70px" height="32px" borderRadius="8px" />
          <Skeleton width="70px" height="32px" borderRadius="8px" />
          <Skeleton width="140px" height="16px" style={{ marginLeft: '8px' }} />
          <Skeleton width="80px" height="20px" borderRadius="10px" />
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Skeleton width="120px" height="14px" />
          <Skeleton width="100px" height="14px" />
        </div>
      </div>

      {/* brush selector card: title + 11 brush buttons */}
      <SkelCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <Skeleton width="200px" height="14px" />
          <Skeleton width="160px" height="12px" />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Array.from({ length: LEAVE_COUNT }).map((_, i) => (
            <Skeleton key={i} width="74px" height="40px" borderRadius="8px" />
          ))}
        </div>
      </SkelCard>

      {/* calendar table card */}
      <SkelCard padless>
        {/* card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <Skeleton width="260px" height="16px" />
          <Skeleton width="200px" height="13px" />
        </div>
        {/* scrollable table area */}
        <div style={{ overflowX: 'auto' }}>
          {/* Column headers: Name + 31 date cols + Total */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', background: '#FAFAFA', borderBottom: '1px solid var(--line)', gap: '4px', minWidth: 'max-content' }}>
            <Skeleton width="140px" height="32px" borderRadius="6px" style={{ flexShrink: 0, marginRight: '4px' }} />
            {Array.from({ length: DAYS_COUNT }).map((_, d) => (
              <Skeleton key={d} width="34px" height="32px" borderRadius="4px" style={{ flexShrink: 0 }} />
            ))}
            <Skeleton width="50px" height="32px" borderRadius="4px" style={{ flexShrink: 0, marginLeft: '4px' }} />
          </div>
          {/* Member rows */}
          {Array.from({ length: MEMBER_COUNT }).map((_, r) => (
            <div key={r} style={{
              display: 'flex', alignItems: 'center', padding: '6px 20px',
              borderBottom: r === MEMBER_COUNT - 1 ? 'none' : '1px solid var(--line)',
              gap: '4px', minWidth: 'max-content'
            }}>
              <Skeleton width="140px" height="28px" borderRadius="6px" style={{ flexShrink: 0, marginRight: '4px' }} />
              {Array.from({ length: DAYS_COUNT }).map((_, d) => (
                <Skeleton key={d} width="34px" height="28px" borderRadius="4px" style={{ flexShrink: 0 }} />
              ))}
              <Skeleton width="50px" height="24px" borderRadius="10px" style={{ flexShrink: 0, marginLeft: '4px' }} />
            </div>
          ))}
        </div>
      </SkelCard>

      {/* legend bar: 11 leave type items */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Skeleton width="55px" height="12px" />
        {Array.from({ length: LEAVE_COUNT }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Skeleton width="22px" height="22px" borderRadius="4px" />
            <Skeleton width={`${30 + i * 5}px`} height="12px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PLAYBOOK ──────────────────────────────────────────
   Structure:
   - hint p
   - 4 collapsible section cards:
     1. "Twelve steps" — 12 step cards in a grid (3-col)
     2. Escalation section
     3. Cadence table — 7 rows × 5 cols
     4. RACI table — 16 rows × 8 cols
*/
function SkeletonPlaybook() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* hint */}
      <Skeleton width="440px" height="13px" />

      {/* Section 1: Twelve steps — collapsible header */}
      <SkelCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton width="28px" height="28px" borderRadius="6px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Skeleton width="260px" height="15px" />
              <Skeleton width="220px" height="12px" />
            </div>
          </div>
          <Skeleton width="80px" height="13px" />
        </div>
        {/* 12 step cards in grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton width="26px" height="26px" borderRadius="6px" />
                <Skeleton width="80px" height="20px" borderRadius="4px" />
              </div>
              <Skeleton width={`${50 + (i % 4) * 10}%`} height="14px" />
              <Skeleton width="90%" height="12px" />
            </div>
          ))}
        </div>
      </SkelCard>

      {/* Section 2: Escalation — just header (collapsed by default) */}
      <SkelCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton width="28px" height="28px" borderRadius="6px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Skeleton width="200px" height="15px" />
              <Skeleton width="180px" height="12px" />
            </div>
          </div>
          <Skeleton width="70px" height="13px" />
        </div>
      </SkelCard>

      {/* Section 3: Cadence table — 7 rows × 5 cols */}
      <SkelCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton width="28px" height="28px" borderRadius="6px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Skeleton width="180px" height="15px" />
              <Skeleton width="160px" height="12px" />
            </div>
          </div>
          <Skeleton width="70px" height="13px" />
        </div>
        <div style={{ border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
          <SkelTable rows={7} cols={5} colWidths={['22%', '12%', '20%', '13%', '33%']} />
        </div>
      </SkelCard>

      {/* Section 4: RACI table — 16 rows × 8 cols */}
      <SkelCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton width="28px" height="28px" borderRadius="6px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Skeleton width="120px" height="15px" />
              <Skeleton width="200px" height="12px" />
            </div>
          </div>
          <Skeleton width="70px" height="13px" />
        </div>
        <div style={{ border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
          <SkelTable rows={16} cols={8} colWidths={['22%', '9%', '9%', '9%', '9%', '9%', '9%', '9%']} />
        </div>
      </SkelCard>
    </div>
  );
}

/* ── DOCS ──────────────────────────────────────────────
   Structure:
   - .greet header: title + "Storage Settings" btn + "Add/Upload" btn
   - .chips project selector bar: 14 project chips
   - grid: 260px left sidebar + 1fr right
     Left: "Document Folders" label + "All Documents" btn + 5 category buttons + tip box
     Right: search bar + category filter tabs + doc list rows
*/
function SkeletonDocs() {
  const PROJECT_COUNT = 14;
  const CATEGORY_COUNT = 5; // DEFAULT_CATEGORIES length
  const DOC_ROWS = 5;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton width="24px" height="24px" borderRadius="6px" />
            <Skeleton width="280px" height="20px" borderRadius="6px" />
          </div>
          <Skeleton width="400px" height="13px" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton width="150px" height="36px" borderRadius="8px" />
          <Skeleton width="180px" height="36px" borderRadius="8px" />
        </div>
      </div>

      {/* project chips: 14 projects */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Array.from({ length: PROJECT_COUNT }).map((_, i) => (
          <Skeleton key={i} width={`${60 + (i % 5) * 12}px`} height="36px" borderRadius="8px" />
        ))}
      </div>

      {/* main grid: sidebar + content */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left sidebar card */}
        <SkelCard>
          {/* "Document Folders" label */}
          <Skeleton width="130px" height="11px" style={{ marginBottom: '12px' }} />
          {/* "All Documents" button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', marginBottom: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton width="16px" height="16px" borderRadius="3px" />
              <Skeleton width="100px" height="14px" />
            </div>
            <Skeleton width="20px" height="14px" />
          </div>
          {/* 5 category buttons */}
          {Array.from({ length: CATEGORY_COUNT }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Skeleton width="16px" height="16px" borderRadius="3px" />
                <Skeleton width={`${70 + i * 14}px`} height="14px" />
              </div>
              <Skeleton width="16px" height="14px" />
            </div>
          ))}
          {/* Storage tip box */}
          <div style={{ marginTop: '20px', padding: '12px', background: 'var(--soft)', borderRadius: '8px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="140px" height="13px" />
            <Skeleton width="100%" height="12px" />
            <Skeleton width="85%" height="12px" />
          </div>
        </SkelCard>

        {/* Right content area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* search bar */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Skeleton width="100%" height="38px" borderRadius="8px" style={{ flex: 1 }} />
            <Skeleton width="120px" height="38px" borderRadius="8px" />
          </div>

          {/* doc list card */}
          <SkelCard padless>
            {/* category filter tabs */}
            <div style={{ display: 'flex', gap: '6px', padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <Skeleton width="90px" height="28px" borderRadius="6px" />
              {Array.from({ length: CATEGORY_COUNT }).map((_, i) => (
                <Skeleton key={i} width={`${70 + i * 12}px`} height="28px" borderRadius="6px" />
              ))}
            </div>
            {/* doc rows */}
            {Array.from({ length: DOC_ROWS }).map((_, r) => (
              <div key={r} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 20px',
                borderBottom: r === DOC_ROWS - 1 ? 'none' : '1px solid var(--line)'
              }}>
                <Skeleton width="36px" height="36px" borderRadius="8px" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <Skeleton width={`${35 + r * 8}%`} height="14px" />
                  <Skeleton width={`${50 + r * 5}%`} height="12px" />
                </div>
                <Skeleton width="70px" height="22px" borderRadius="6px" style={{ flexShrink: 0 }} />
                <Skeleton width="80px" height="22px" borderRadius="8px" style={{ flexShrink: 0 }} />
                <Skeleton width="30px" height="30px" borderRadius="6px" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </SkelCard>
        </div>
      </div>
    </div>
  );
}

/* ── IMPROVEMENTS ──────────────────────────────────────
   Structure:
   - hint p + overall progress bar
   - 2 section cards (Hub / Process):
     Each: card header + ul.imps list of items
     Each item: title + desc + owner (left) + status dropdown + date input + remarks input (right)
*/
function SkeletonImprovements() {
  // Hub: ~6 items, Process: ~4 items
  const groups = [
    { label: 'Hub', count: 6 },
    { label: 'Process', count: 4 }
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* hint */}
      <Skeleton width="360px" height="13px" />
      {/* progress bar */}
      <Skeleton width="100%" height="10px" borderRadius="5px" />

      {groups.map(({ label, count }) => (
        <SkelCard key={label}>
          <SkelCardHeader titleW="160px" noAction />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '14px 0',
                borderBottom: i === count - 1 ? 'none' : '1px solid var(--line)',
                gap: '16px'
              }}>
                {/* Left: title + desc + owner */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <Skeleton width={`${35 + (i % 4) * 10}%`} height="14px" />
                  <Skeleton width={`${55 + (i % 3) * 8}%`} height="12px" />
                  <Skeleton width="100px" height="11px" />
                </div>
                {/* Right: status dropdown + date + remarks */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Skeleton width="110px" height="32px" borderRadius="6px" />
                  <Skeleton width="120px" height="32px" borderRadius="6px" />
                  <Skeleton width="140px" height="32px" borderRadius="6px" />
                </div>
              </div>
            ))}
          </div>
        </SkelCard>
      ))}
    </div>
  );
}

/* ── LINKS ─────────────────────────────────────────────
   Structure:
   - hint p
   - section.card: ul.links with N link items
     Each item: name (bold link) + note + url text (left) + "Remove" btn (right)
   - Add link form (3 inputs + button)
   - section.card: "Backup and move data" + description + 2 buttons
*/
function SkeletonLinks() {
  const LINK_COUNT = 6;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* hint */}
      <Skeleton width="340px" height="13px" />

      {/* links card */}
      <SkelCard>
        {/* link list items */}
        {Array.from({ length: LINK_COUNT }).map((_, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: i === LINK_COUNT - 1 ? 'none' : '1px solid var(--line)',
            gap: '12px'
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Skeleton width={`${30 + i * 8}%`} height="14px" />
              <Skeleton width={`${40 + i * 5}%`} height="12px" />
              <Skeleton width="50%" height="11px" />
            </div>
            <Skeleton width="65px" height="28px" borderRadius="6px" style={{ flexShrink: 0 }} />
          </div>
        ))}
        {/* Add link form */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--line)', marginTop: '4px', flexWrap: 'wrap' }}>
          <Skeleton width="200px" height="36px" borderRadius="8px" />
          <Skeleton width="220px" height="36px" borderRadius="8px" />
          <Skeleton width="180px" height="36px" borderRadius="8px" />
          <Skeleton width="90px" height="36px" borderRadius="8px" />
        </div>
      </SkelCard>

      {/* backup card */}
      <SkelCard>
        <SkelCardHeader titleW="180px" noAction />
        <Skeleton width="380px" height="12px" style={{ marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton width="130px" height="36px" borderRadius="8px" />
          <Skeleton width="120px" height="36px" borderRadius="8px" />
        </div>
      </SkelCard>
    </div>
  );
}

/* ====================================================
   SkeletonView — ROUTER: picks the right skeleton
   ==================================================== */
export function SkeletonView({ view }) {
  switch (view) {
    case 'overview':     return <SkeletonOverview />;
    case 'projects':     return <SkeletonProjects />;
    case 'checklist':    return <SkeletonChecklist />;
    case 'team':         return <SkeletonTeam />;
    case 'hygiene':      return <SkeletonHygiene />;
    case 'leave':        return <SkeletonLeave />;
    case 'playbook':     return <SkeletonPlaybook />;
    case 'docs':         return <SkeletonDocs />;
    case 'improvements': return <SkeletonImprovements />;
    case 'links':        return <SkeletonLinks />;
    default:
      // Generic fallback
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton width="300px" height="20px" />
          <Skeleton width="100%" height="14px" />
          <SkelCard padless><SkelTable rows={8} cols={5} /></SkelCard>
        </div>
      );
  }
}
