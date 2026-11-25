// ══════════════════════════════════════════════════════════════════════
//   ALCHEMIST — AI CONTEXT BUNDLE BUILDER
//   Fetches project data + prerequisites + 27-section BRD and composes
//   a single copyable plain-text context bundle that can be fed to any
//   AI coding agent (Aimatic, Cursor, Claude Code, Copilot Workspace…).
// ══════════════════════════════════════════════════════════════════════

import { queryClient } from '../lib/queryClient';
import { projectQuery, checklistQuery, brdQuery, statsQuery } from '../api/preq';

const DIVIDER = '════════════════════════════════════════════════════════════════';
const THIN = '────────────────────────────────────────────────────────────────';

// ── Data fetching ────────────────────────────────────────────────────
export async function fetchBundleData(projectId) {
  // each piece comes through the query cache, so anything the page already loaded is reused
  // and one that fails simply comes back empty instead of stopping the whole bundle
  const safe = (options) => queryClient.fetchQuery(options).catch(() => null);

  const [project, checklist, brd, stats] = await Promise.all([
    safe(projectQuery(projectId)),
    safe(checklistQuery(projectId)),
    safe(brdQuery(projectId)),
    safe(statsQuery()),
  ]);

  const items = Array.isArray(checklist) ? checklist : checklist?.items || checklist?.checklist || [];
  return { project, items, brd, stats };
}

// ── JSON → readable plain text (recursive, section aware) ────────────
const sectionTitle = (key) =>
  key
    .replace(/^section_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

function renderValue(value, depth = 0) {
  const pad = '  '.repeat(depth);

  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'object') return `${pad}${String(value)}`;

  if (Array.isArray(value)) {
    return value
      .map((entry, i) => {
        if (entry === null || typeof entry !== 'object') {
          return `${pad}${i + 1}. ${String(entry)}`;
        }
        // Compact single-line render for flat objects
        const entries = Object.entries(entry);
        if (entries.every(([, v]) => v === null || v === undefined || typeof v !== 'object' || String(v).length < 60)) {
          const line = entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v === null || v === undefined || v === '' ? '—' : v}`).join(' | ');
          return `${pad}${i + 1}. ${line}`;
        }
        const inner = Object.entries(entry)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => renderValue(v, depth + 2).trimEnd())
          .filter(Boolean)
          .map(line => `${pad}   ${line}`);
        return `${pad}${i + 1}. ${inner.join('\n')}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  return Object.entries(value)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      if (typeof v === 'object') {
        return `${pad}${k.replace(/_/g, ' ')}:\n${renderValue(v, depth + 1)}`;
      }
      return `${pad}${k.replace(/_/g, ' ')}: ${v}`;
    })
    .join('\n');
}

export function renderBrd(brd) {
  if (!brd || typeof brd !== 'object') return 'BRD not generated yet. Open the BRD viewer and generate it first.';

  const blocks = [];
  for (const [key, value] of Object.entries(brd)) {
    if (!/^section_/i.test(key)) continue;
    const rendered = renderValue(value).trim();
    if (!rendered) continue;
    blocks.push(`■ ${sectionTitle(key)}\n${THIN}\n${rendered}`);
  }
  return blocks.join(`\n\n${THIN}\n\n`);
}

// ── Status line for prerequisites ────────────────────────────────────
const statusMark = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'verified' || s === 'cleared') return '[✔ VERIFIED]';
  if (s === 'blocked' || s === 'rejected') return '[✘ BLOCKED ]';
  if (s === 'in progress' || s === 'verifying') return '[◐ WIP    ]';
  return '[○ PENDING ]';
};

// ── Main composer ────────────────────────────────────────────────────
export function composeAIContext({ project, items, brd }) {
  const p = project || {};
  const list = items || [];
  const verified = list.filter(i => String(i.status).toLowerCase() === 'verified').length;
  const score = list.length ? Math.round((verified / list.length) * 100) : 0;

  const prerequisiteLines = list.length
    ? list
        .map((it, idx) => {
          const name = it.name || it.title || `Prerequisite ${idx + 1}`;
          const cat = it.category || 'General';
          const owner = resolveOwner(it);
          const critical = it.is_critical ? 'CRITICAL' : 'Normal';
          const evidence = it.expected_evidence || it.description || '';
          const status = statusMark(it.status);
          return `${status} #${String(idx + 1).padStart(2, '0')}  ${name}\n            Category: ${cat}   |   Owner: ${owner}   |   Priority: ${critical}\n            Expected evidence: ${evidence || '—'}`;
        })
        .join('\n')
    : 'No prerequisites tracked yet.';

  const overview = [
    `Project Name      : ${p.name || '—'}`,
    `Client            : ${p.client_name || '—'}`,
    `Client Sponsor    : ${p.client_email || '—'}`,
    `Project Type      : ${p.type || '—'}`,
    `Industry          : ${p.industry || '—'}`,
    `Deployment        : ${p.deployment || '—'}`,
    `Target Kick-off   : ${p.target_kickoff_date || '—'}`,
    `Readiness Score   : ${p.score ?? score}% (${verified}/${list.length} prerequisites verified)`,
    `Description       : ${p.description || '—'}`
  ].join('\n');

  return `${DIVIDER}
ALCHEMIST AI CONTEXT BUNDLE
Project: ${p.name || 'Untitled'}  ·  Client: ${p.client_name || '—'}
Generated: ${new Date().toLocaleString()}
${DIVIDER}

INTRODUCTION FOR THE AI CODING AGENT
${THIN}
You are an AI coding agent. The context below is the complete, authoritative
project knowledge for "${p.name || 'this project'}": business requirements,
architecture, delivery milestones and the live prerequisite/readiness state
exported from the Alchemist delivery platform.

Rules of engagement:
1. Treat every requirement below as the source of truth for implementation.
2. Respect every CRITICAL prerequisite that is not yet VERIFIED — surface it
   as an assumption or a blocking question in your plan.
3. Match the client's deployment target (${p.deployment || 'as specified'}) and
   industry compliance needs when proposing a stack.
4. When scope is ambiguous, infer from the BRD section text and state the
   inference explicitly.
${THIN}

SECTION 1 — PROJECT OVERVIEW
${THIN}
${overview}

SECTION 2 — PREREQUISITES & READINESS MATRIX
${THIN}
Total: ${list.length}  |  Verified: ${verified}  |  Pending: ${list.filter(i => ['pending', 'in progress', 'verifying', 'submitted', ''].includes(String(i.status).toLowerCase())).length}  |  Blocked: ${list.filter(i => ['blocked', 'rejected'].includes(String(i.status).toLowerCase())).length}

${prerequisiteLines}

SECTION 3 — BUSINESS REQUIREMENTS DOCUMENT (27-SECTION BRD)
${THIN}
${renderBrd(brd)}

${DIVIDER}
END OF CONTEXT BUNDLE — Alchemist · Go Alchemists Delivery Platform
${DIVIDER}`;
}

// Owner resolver mirrors the backend's functional-owner logic
function resolveOwner(item) {
  const owner = String(item.owner || '').trim();
  if (owner && !['unassigned', 'none', 'null', 'tbd', 'n/a'].includes(owner.toLowerCase())) return owner;
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  if (/aws|azure|gcp|vpn|cluster|kubernetes|ci\/cd/.test(text)) return 'Client DevOps / Cloud Lead';
  if (/api key|token|credential|oauth|secret|ssl/.test(text)) return 'Client Security & API Admin';
  if (/database|dataset|sql|snowflake|bigquery|schema/.test(text)) return 'Client Data Engineering Lead';
  return 'Client Delivery Lead';
}

// ── One-call helper for buttons ──────────────────────────────────────
export async function buildAIContextBundle(projectId) {
  const data = await fetchBundleData(projectId);
  return composeAIContext(data);
}
