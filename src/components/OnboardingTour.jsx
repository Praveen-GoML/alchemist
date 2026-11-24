import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * First-visit product tour: dims and blurs everything except the element being explained,
 * and points at it with a curly hand-drawn arrow from a small explanation card.
 * Shown once per person (remembered in localStorage); replay with the "Take the tour" link
 * in the sidebar, which fires the `alchemist:start-tour` event.
 */
const STORE = 'alchemist-tour-v1';
const PAD = 8;       // breathing room around the highlighted element
const GAP = 104;      // distance between the card and the element (room for the arrow)
const MARGIN = 16;   // minimum distance from the screen edge
const CARD_W = 352;
const HERO_W = 620;

const seenKey = (u) => `${STORE}:${(u?.email || u?.name || 'user').toLowerCase()}`;
const readSeen = (u) => { try { return localStorage.getItem(seenKey(u)) === '1'; } catch { return false; } };
const writeSeen = (u) => { try { localStorage.setItem(seenKey(u), '1'); } catch { /* ignore */ } };

const onScreen = (r) => !!r && r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
const find = (sel) => (sel ? document.querySelector(sel) : null);

function buildSteps(isManager) {
  const nav = (href, title, text) => ({ sel: `.snav a.slink[href="#${href}"]`, prefer: 'right', title, text });
  return [
    {
      hero: true,
      title: 'Welcome to Go Alchemists',
      text: 'Your delivery hub for projects, people and daily routines. This short tour walks through every page.',
    },
    ...(isManager ? [nav('overview', 'Home',
      'Your overview of delivery health: project status, who is busy and what needs attention today.')] : []),
    nav('projects', 'Projects', isManager
      ? 'Every project with its status, dates and team. Add projects, update their status and open any one for the details. The badge shows how many are behind or delayed.'
      : 'The projects you are on, with their status, timeline and team. The badge shows how many are behind or delayed.'),
    nav('prereq', 'Pre-req',
      'The prerequisites each project needs before work can start. Submit evidence for yours and escalate anything that is blocked.'),
    nav('checklist', 'Checklist', isManager
      ? 'The 46-step delivery checklist for each project, from pre-sales to retro. Update step statuses and check that the kick-off gate is ready.'
      : 'Your project\'s delivery checklist: the current stage, overall progress and the steps coming up next.'),
    nav('docs', 'Docs & Drive',
      'Project documents and cloud storage in one place. Open files right here in the built-in reader.'),
    nav('team', 'Team', isManager
      ? 'Everyone on the team, grouped by role, with skills and current projects. See each person\'s workload and manage who is on what.'
      : 'Meet the team, grouped by role, and see the projects you are on.'),
    nav('hygiene', 'Daily hygiene', isManager
      ? 'Whether everyone has filled in Lattice and their timesheet each day. Tap a cell to mark Y done, N missed or L leave.'
      : 'Mark your Lattice and timesheet each day: Y when done, N if missed, L if on leave. This page shows only your own row.'),
    nav('leave', 'Leave tracker',
      'Apply for leave and see who is away today. The badge shows how many people are off right now.'),
    nav('improvements', 'Improvements',
      'Ideas to improve how we deliver, from not started to done. Add your own and follow the ones in progress.'),
    nav('links', 'Tracker links',
      'Quick links to the trackers and tools the team uses, so nobody has to hunt for them.'),
    {
      sel: '#save', prefer: 'bottom',
      title: 'Always in sync',
      text: 'Changes save automatically and are shared live with the team. A green dot means you are up to date.',
    },
    {
      sel: '.who .nbell', prefer: 'bottom',
      title: 'Notifications',
      text: 'Assignments, approvals and updates land here. Turn on device notifications to get them on your phone too.',
    },
    {
      sel: '.tbar .who', prefer: 'bottom',
      title: 'You',
      text: 'Your name and role live here, and this is where you log out.',
    },
    {
      title: 'You are all set',
      text: 'You can replay this tour any time from the "Take the tour" link at the bottom of the sidebar.',
      hero: true, last: true,
    },
  ];
}

// Pick the side of the element with room for the card, then position the card and compute the arrow
function layout(spot, cw, ch, prefer) {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!spot) {
    const x = Math.round((vw - cw) / 2), y = Math.round((vh - ch) / 2);
    return { x, y, side: null, arrow: null };
  }
  const right = spot.left + spot.width, bottom = spot.top + spot.height;
  const space = { right: vw - right, left: spot.left, bottom: vh - bottom, top: spot.top };
  const need = { right: cw + GAP + MARGIN, left: cw + GAP + MARGIN, bottom: ch + GAP + MARGIN, top: ch + GAP + MARGIN };
  const side = [prefer, 'bottom', 'right', 'left', 'top'].find(k => k && space[k] >= need[k])
    || Object.keys(space).sort((a, b) => space[b] - space[a])[0];

  const cx = spot.left + spot.width / 2, cy = spot.top + spot.height / 2;
  let x, y;
  if (side === 'right') { x = right + GAP; y = cy - ch / 2; }
  else if (side === 'left') { x = spot.left - GAP - cw; y = cy - ch / 2; }
  else if (side === 'bottom') { x = cx - cw / 2; y = bottom + GAP; }
  else { x = cx - cw / 2; y = spot.top - GAP - ch; }
  x = Math.min(Math.max(MARGIN, x), vw - cw - MARGIN);
  y = Math.min(Math.max(MARGIN, y), vh - ch - MARGIN);

  // a long element (like the whole sidebar) gets its arrow aimed near the top of it, not the far-off middle
  const aimY = Math.min(cy, spot.top + Math.min(spot.height / 2, 90));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  let S, E, horizontal = true;
  if (side === 'right') { S = { x: x - 6, y: clamp(aimY, y + 28, y + ch - 28) }; E = { x: right + 12, y: aimY }; }
  else if (side === 'left') { S = { x: x + cw + 6, y: clamp(aimY, y + 28, y + ch - 28) }; E = { x: spot.left - 12, y: aimY }; }
  else if (side === 'bottom') { horizontal = false; S = { x: clamp(cx, x + 28, x + cw - 28), y: y - 6 }; E = { x: cx, y: bottom + 12 }; }
  else { horizontal = false; S = { x: clamp(cx, x + 28, x + cw - 28), y: y + ch + 6 }; E = { x: cx, y: spot.top - 12 }; }

  // hand-drawn swoosh: leaves the text, makes a little loop, then lands on the element
  const dx = E.x - S.x, dy = E.y - S.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;       // unit vector from text to element
  const nx = -uy, ny = ux;                   // its normal
  const bow = Math.min(46, len * 0.3);       // sideways bow so the line is never ruler-straight
  const sgn = horizontal ? (dy >= 0 ? 1 : -1) : (dx >= 0 ? -1 : 1);
  let line, c2;
  if (len > 110) {
    const R = 19;
    const M = { x: S.x + dx * 0.5, y: S.y + dy * 0.5 };
    const A = { x: M.x - ux * R * 0.7, y: M.y - uy * R * 0.7 };
    const B = { x: M.x + ux * R * 0.7, y: M.y + uy * R * 0.7 };
    const c1a = { x: S.x + ux * len * 0.22 + nx * bow * sgn, y: S.y + uy * len * 0.22 + ny * bow * sgn };
    const c2a = { x: A.x - ux * 26, y: A.y - uy * 26 };
    c2 = { x: B.x + ux * len * 0.12 - nx * bow * 0.5 * sgn, y: B.y + uy * len * 0.12 - ny * bow * 0.5 * sgn };
    line = `M ${S.x} ${S.y} C ${c1a.x} ${c1a.y}, ${c2a.x} ${c2a.y}, ${A.x} ${A.y} A ${R} ${R} 0 1 ${sgn > 0 ? 1 : 0} ${B.x} ${B.y} C ${B.x + ux * 24} ${B.y + uy * 24}, ${c2.x} ${c2.y}, ${E.x} ${E.y}`;
  } else {
    const c1 = { x: S.x + ux * len * 0.3 + nx * bow * sgn, y: S.y + uy * len * 0.3 + ny * bow * sgn };
    c2 = { x: E.x - ux * len * 0.3 - nx * bow * sgn, y: E.y - uy * len * 0.3 - ny * bow * sgn };
    line = `M ${S.x} ${S.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${E.x} ${E.y}`;
  }
  const ang = Math.atan2(E.y - c2.y, E.x - c2.x);
  const head = (d) => `${E.x - 17 * Math.cos(ang + d)},${E.y - 17 * Math.sin(ang + d)}`;
  return {
    x, y, side,
    arrow: { tip: E, start: S, line, head: `M ${head(0.45)} L ${E.x},${E.y} L ${head(-0.45)}` },
  };
}

export default function OnboardingTour() {
  const { user, isManagementUser } = useAuth();
  const [steps, setSteps] = useState(null);   // null = tour closed
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [spot, setSpot] = useState(null);
  const [size, setSize] = useState({ w: CARD_W, h: 220 });
  const [, bump] = useState(0);
  const cardRef = useRef(null);

  const start = useCallback(() => {
    const all = buildSteps(!!isManagementUser);
    // keep only the steps whose element is actually on screen (e.g. the sidebar is hidden on phones)
    const usable = all.filter(s => !s.sel || onScreen(find(s.sel)?.getBoundingClientRect()));
    setIdx(0); setDir(1); setSteps(usable);
  }, [isManagementUser]);

  const finish = useCallback(() => { writeSeen(user); setSteps(null); }, [user]);

  // first visit: open automatically once the app has settled
  useEffect(() => {
    if (!user || readSeen(user)) return undefined;
    const t = setTimeout(start, 1100);
    return () => clearTimeout(t);
  }, [user, start]);

  // replay from the sidebar link
  useEffect(() => {
    window.addEventListener('alchemist:start-tour', start);
    return () => window.removeEventListener('alchemist:start-tour', start);
  }, [start]);

  const step = steps ? steps[idx] : null;

  // measure the element being explained, and keep following it on resize / scroll
  useEffect(() => {
    if (!step) return undefined;
    const measure = () => {
      const el = find(step.sel);
      if (!el) { setSpot(null); return; }
      const r = el.getBoundingClientRect();
      setSpot({ left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    const el = find(step.sel);
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    measure();
    const t = setTimeout(measure, 320); // after any sidebar/section animation settles
    const onChange = () => { measure(); bump(n => n + 1); };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => { clearTimeout(t); window.removeEventListener('resize', onChange); window.removeEventListener('scroll', onChange, true); };
  }, [step]);

  // measure the card so it can be placed without overflowing the screen
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    if (Math.abs(r.height - size.h) > 1 || Math.abs(r.width - size.w) > 1) setSize({ w: r.width, h: r.height });
  });

  const go = useCallback((d) => {
    if (!steps) return;
    const next = idx + d;
    if (next < 0) return;
    if (next >= steps.length) { finish(); return; }
    setDir(d); setIdx(next);
  }, [steps, idx, finish]);

  // if a step's element disappeared (window resized, sidebar collapsed), skip over it
  useEffect(() => {
    if (!step || !step.sel) return;
    const t = setTimeout(() => {
      if (!onScreen(find(step.sel)?.getBoundingClientRect())) go(dir);
    }, 380);
    return () => clearTimeout(t);
  }, [step, dir, go]);

  useEffect(() => {
    if (!steps) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps, go, finish]);

  const pos = useMemo(
    () => (step ? layout(step.sel ? spot : null, size.w, size.h, step.prefer) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, spot, size.w, size.h, window.innerWidth, window.innerHeight],
  );

  if (!steps || !step || !pos) return null;

  const vw = window.innerWidth, vh = window.innerHeight;
  const hole = step.sel && spot ? spot : { left: vw / 2, top: vh / 2, width: 0, height: 0 };
  const hr = hole.left + hole.width, hb = hole.top + hole.height;
  const total = steps.length;

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tour: ${step.title}`}>
      {/* four blurred, dimmed panels leave a crisp hole around the highlighted element */}
      <div className="tour-pane" style={{ clipPath: `polygon(0 0, ${vw}px 0, ${vw}px ${vh}px, 0 ${vh}px, 0 0, ${hole.left}px ${hole.top}px, ${hole.left}px ${hb}px, ${hr}px ${hb}px, ${hr}px ${hole.top}px, ${hole.left}px ${hole.top}px)` }} />
      {step.sel && spot && (
        <div className="tour-ring" style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} />
      )}

      {pos.arrow && (
        <svg className="tour-arrow" key={idx} width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} aria-hidden="true">
          <circle className="tour-arrow-start" cx={pos.arrow.start.x} cy={pos.arrow.start.y} r="4.5" />
          <path d={pos.arrow.line} pathLength="1" className="tour-arrow-line" />
          <path d={pos.arrow.head} className="tour-arrow-head" />
          <circle className="tour-arrow-ping" cx={pos.arrow.tip.x} cy={pos.arrow.tip.y} r="6" />
        </svg>
      )}

      <div ref={cardRef} className={`tour-card${step.hero ? ' is-hero' : ''}`} style={{ left: pos.x, top: pos.y, width: step.hero ? HERO_W : CARD_W }} key={`c${idx}`}>
        {!step.hero && <span className="tour-kicker">{`Step ${idx} of ${total - 2}`}</span>}
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="tour-foot">
          {!step.hero && !step.last && <button type="button" className="tour-skip" onClick={finish}>Skip tour</button>}
          <span className="tour-btns">
            {idx === 0 && <button type="button" className="tour-skip" onClick={finish}>Skip</button>}
            {idx > 0 && <button type="button" className="tour-back" onClick={() => go(-1)} aria-label="Previous step"><ArrowLeft size={16} /></button>}
            <button type="button" className="tour-next" onClick={() => go(1)} autoFocus>
              {idx === 0 ? 'Start the tour' : step.last ? 'Finish' : 'Next'}
              {!step.last && <ArrowRight size={16} />}
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
