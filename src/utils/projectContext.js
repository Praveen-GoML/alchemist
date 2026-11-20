// ======================================================================
//   ALCHEMIST - PROJECT CONTEXT PROVIDER
//   Turns the /projects/:id/context payload into one Markdown document
//   that can be pasted straight into any AI assistant. Secrets are never
//   part of the payload (the backend strips them).
// ======================================================================

import { API_URL } from '../apiConfig';
import { renderBrd } from './aiContextBuilder';

export const CONTEXT_SECTIONS = [
  { key: 'summary', label: 'Executive summary', hint: 'Readiness, what needs attention, next actions', on: true },
  { key: 'overview', label: 'Project overview', hint: 'Client, type, deployment, readiness', on: true },
  { key: 'requirements', label: 'Requirements', hint: 'REQ items with acceptance criteria', on: true },
  { key: 'prerequisites', label: 'Prerequisites', hint: 'Status, owner, evidence, why needed', on: true },
  { key: 'dependencies', label: 'Dependencies', hint: 'What blocks what', on: true },
  { key: 'risks', label: 'Blockers & risks', hint: 'Open critical items and analysed risks', on: true },
  { key: 'questions', label: 'Open questions & assumptions', hint: 'Unresolved items to confirm', on: true },
  { key: 'escalations', label: 'Recent escalations', hint: 'Latest escalation log', on: true },
  { key: 'brd', label: 'Business Requirements Doc', hint: '27-section BRD (long)', on: true },
  { key: 'proposal', label: 'Source proposal text', hint: 'Original SOW text (very long)', on: false },
];

export async function fetchProjectContext(projectId) {
  const res = await fetch(`${API_URL}/projects/${projectId}/context`);
  if (!res.ok) throw new Error(`Could not load project context (HTTP ${res.status}).`);
  return res.json();
}

const val = (v, fallback = 'Not specified') =>
  v === null || v === undefined || String(v).trim() === '' ? fallback : String(v).trim();

const list = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

const bullets = (arr, indent = '  ') =>
  list(arr).map((x) => `${indent}- ${typeof x === 'string' ? x : JSON.stringify(x)}`).join('\n');

const isDone = (s) => ['verified', 'cleared'].includes(String(s || '').toLowerCase());

export function composeProjectContext(data, include) {
  if (!data) return '';
  const p = data.project || {};
  const m = data.metrics || {};
  const items = list(data.checklist);
  const out = [];

  out.push(`# Project context: ${val(p.name, 'Untitled project')}`);
  out.push(
    `_Generated ${new Date().toLocaleString()} from the Alchemist PreQ tracker. ` +
      `This is a document-based snapshot; items marked pending are not yet verified. ` +
      `Credentials and secrets are never included._`
  );
  out.push(
    '## How to use this context\n' +
      '- You are helping the delivery team get this project ready for kick-off. Treat the sections below as the source of truth.\n' +
      '- Do not assume anything marked "Not specified"; ask or flag it instead.\n' +
      '- Unverified critical prerequisites are blockers: raise them in any plan you produce.\n' +
      '- Cite items by their IDs (PRE-001, REQ-001) so the team can find them in the tracker.\n' +
      '- Keep answers short and actionable: who needs to do what, by when.'
  );

  if (include.summary) {
    const total = items.length;
    const verified = items.filter((it) => isDone(it.status)).length;
    const openCritical = items.filter((it) => it.is_critical && !isDone(it.status));
    const pct = total ? Math.round((verified / total) * 100) : 0;
    let kick = 'not set';
    if (p.target_kickoff_date) {
      const d = Math.round((new Date(p.target_kickoff_date) - new Date(new Date().toDateString())) / 864e5);
      kick = Number.isFinite(d) ? `${p.target_kickoff_date} (${d >= 0 ? `in ${d} days` : `${-d} days ago`})` : String(p.target_kickoff_date);
    }
    // readiness by category, weakest first
    const byCat = {};
    items.forEach((it) => {
      const c = val(it.category, 'General');
      byCat[c] = byCat[c] || { total: 0, done: 0, critical: 0 };
      byCat[c].total += 1;
      if (isDone(it.status)) byCat[c].done += 1;
      else if (it.is_critical) byCat[c].critical += 1;
    });
    const catRows = Object.entries(byCat)
      .sort((x, y) => x[1].done / x[1].total - y[1].done / y[1].total)
      .map(([c, v]) => `| ${c} | ${v.done}/${v.total} | ${Math.round((v.done / v.total) * 100)}% | ${v.critical} |`);
    // next actions: open items, critical first, then earliest due date
    const openItems = items
      .map((it, i) => ({ it, id: `PRE-${String(i + 1).padStart(3, '0')}` }))
      .filter(({ it }) => !isDone(it.status))
      .sort((x, y) => (y.it.is_critical ? 1 : 0) - (x.it.is_critical ? 1 : 0) || String(x.it.due_date || '9999').localeCompare(String(y.it.due_date || '9999')))
      .slice(0, 8);

    const verdict = !total
      ? 'No prerequisites tracked yet.'
      : openCritical.length === 0
        ? 'Ready: every critical prerequisite is verified.'
        : `Not ready: ${openCritical.length} critical prerequisite${openCritical.length > 1 ? 's' : ''} still open.`;

    out.push(
      '## At a glance\n' +
        `- **Readiness:** ${pct}% (${verified} of ${total} prerequisites verified)\n` +
        `- **Critical blockers open:** ${openCritical.length}\n` +
        `- **Target kick-off:** ${kick}\n` +
        `- **Verdict:** ${verdict}\n\n` +
        (catRows.length
          ? '### Readiness by category (weakest first)\n| Category | Verified | Done | Critical open |\n|---|---|---|---|\n' + catRows.join('\n') + '\n\n'
          : '') +
        '### Do next\n' +
        (openItems.length
          ? openItems.map(({ it, id }) => `- ${id} **${val(it.name)}**${it.is_critical ? ' (critical)' : ''}: owner ${val(it.owner, 'unassigned')}, due ${val(it.due_date, 'not set')}`).join('\n')
          : '_Nothing outstanding._')
    );
  }

  if (include.overview) {
    out.push(
      '## 1. Project overview\n' +
        [
          `- **Name:** ${val(p.name)}`,
          `- **Client:** ${val(p.client_name)}`,
          `- **Type:** ${val(p.type)}`,
          `- **Industry:** ${val(p.industry)}`,
          `- **Deployment target:** ${val(p.deployment)}`,
          `- **Target kick-off:** ${val(p.target_kickoff_date, 'TBD')}`,
          `- **Status:** ${val(p.status)}`,
          `- **Readiness:** ${val(p.score, 0)}% (${val(m.verified_items, 0)} of ${val(m.total_items, items.length)} prerequisites verified, ${val(m.critical_blockers, 0)} critical blockers)`,
          `- **Summary:** ${val(p.description)}`,
        ].join('\n')
    );
  }

  if (include.requirements) {
    const reqs = list(data.requirements);
    out.push(
      '## 2. Requirements\n' +
        (reqs.length
          ? reqs
              .map((r) => {
                const ac = list(r.acceptance_criteria);
                return (
                  `### ${val(r.id, 'REQ')} - ${val(r.name, 'Requirement')}\n` +
                  `${val(r.description, '')}\n` +
                  `- Type: ${val(r.requirement_type)} | Priority: ${val(r.priority)} | Provenance: ${val(r.provenance)}\n` +
                  (r.source_reference ? `- Source: ${r.source_reference}\n` : '') +
                  (ac.length ? `- Acceptance criteria:\n${bullets(ac, '  ')}\n` : '')
                );
              })
              .join('\n')
          : '_No requirements were extracted for this project._')
    );
  }

  if (include.prerequisites) {
    out.push(
      `## 3. Prerequisites (${items.length})\n` +
        (items.length
          ? items
              .map((it, i) => {
                const lines = [
                  `### PRE-${String(i + 1).padStart(3, '0')} - ${val(it.name)}  [${isDone(it.status) ? 'VERIFIED' : String(it.status || 'Pending').toUpperCase()}${it.is_critical ? ', CRITICAL' : ''}]`,
                  `- Category: ${val(it.category)} | Owner: ${val(it.owner)} | Due: ${val(it.due_date, 'not set')}`,
                  `- What is needed: ${val(it.description, '')}`,
                ];
                if (it.why_it_is_needed) lines.push(`- Why: ${it.why_it_is_needed}`);
                if (it.source_reference) lines.push(`- Source: ${it.source_reference}`);
                if (it.expected_evidence) lines.push(`- Expected evidence: ${it.expected_evidence}`);
                if (list(it.client_actions).length) lines.push(`- Client actions:\n${bullets(it.client_actions, '  ')}`);
                if (list(it.completion_criteria).length) lines.push(`- Done when:\n${bullets(it.completion_criteria, '  ')}`);
                if (it.risk_if_incomplete) lines.push(`- Risk if incomplete: ${it.risk_if_incomplete}`);
                if (list(it.depends_on).length) lines.push(`- Depends on: ${list(it.depends_on).join('; ')}`);
                lines.push(
                  `- Evidence submitted: ${it.has_evidence ? 'yes' : 'no'}` +
                    (it.credential_provided ? ' | credential provided (value withheld)' : '') +
                    (it.verification_score != null ? ` | AI verification score: ${it.verification_score}` : '')
                );
                if (it.rejection_reason) lines.push(`- Rejected because: ${it.rejection_reason}`);
                if (it.verification_notes) lines.push(`- Verification notes: ${it.verification_notes}`);
                return lines.join('\n');
              })
              .join('\n\n')
          : '_No prerequisites tracked yet._')
    );
  }

  if (include.dependencies) {
    const deps = list(data.dependencies);
    out.push(
      '## 4. Dependencies\n' +
        (deps.length
          ? deps
              .map(
                (d) =>
                  `- ${val(d.predecessor_id)} -> ${val(d.dependent_id)} (${val(d.relationship_type, 'BLOCKING')}): ${val(d.reason, '')}` +
                  (d.blocked_activity ? ` Blocks: ${d.blocked_activity}` : '')
              )
              .join('\n')
          : '_No explicit dependencies recorded._')
    );
  }

  if (include.risks) {
    const open = items.filter((it) => it.is_critical && !isDone(it.status));
    const risks = list(data.risks);
    let txt = '## 5. Blockers & risks\n';
    txt += '### Open critical prerequisites\n';
    txt += open.length
      ? open.map((it) => `- **${val(it.name)}** (${val(it.status)}, owner: ${val(it.owner)})${it.risk_if_incomplete ? ` - ${it.risk_if_incomplete}` : ''}`).join('\n')
      : '_None - every critical prerequisite is verified._';
    txt += '\n\n### Analysed risks\n';
    txt += risks.length
      ? risks
          .map((r) => {
            const head = `- **${val(r.id, 'RISK')}**${r.category ? ` [${r.category}]` : ''}${r.perspective ? ` (${r.perspective})` : ''}: ${val(r.problem_statement || r.description, '')}`;
            const tail = [
              r.likelihood ? `likelihood ${r.likelihood}` : '',
              r.impact ? `impact ${r.impact}` : '',
              r.mitigation ? `mitigation: ${r.mitigation}` : '',
            ].filter(Boolean).join('; ');
            return tail ? `${head}\n  - ${tail}` : head;
          })
          .join('\n')
      : '_No risks were recorded for this project._';
    out.push(txt);
  }

  if (include.questions) {
    const qs = list(data.clarification_questions);
    const as = list(data.assumptions);
    out.push(
      '## 6. Open questions & assumptions\n### Questions to confirm\n' +
        (qs.length
          ? qs.map((q) => `- ${val(q.question)}${q.why_it_matters ? ` (why: ${q.why_it_matters})` : ''}${q.suggested_owner ? ` [owner: ${q.suggested_owner}]` : ''}`).join('\n')
          : '_None._') +
        '\n\n### Assumptions\n' +
        (as.length
          ? as.map((a) => `- ${val(a.description)}${a.impact_if_wrong ? ` (if wrong: ${a.impact_if_wrong})` : ''}`).join('\n')
          : '_None._')
    );
  }

  if (include.escalations) {
    const es = list(data.escalations);
    out.push(
      '## 7. Recent escalations\n' +
        (es.length
          ? es.map((e) => `- L${val(e.level, 1)} ${val(e.item, '')}: ${val(e.title, '')} -> ${val(e.recipient, '')} (${val(e.at, '')})`).join('\n')
          : '_No escalations logged._')
    );
  }

  if (include.brd) {
    out.push('## 8. Business Requirements Document\n```text\n' + renderBrd(data.brd) + '\n```');
  }

  if (include.proposal) {
    out.push(
      '## 9. Source proposal text\n```text\n' +
        (data.proposal_text ? data.proposal_text : 'The original proposal text was not stored for this project (re-run the analysis to capture it).') +
        '\n```'
    );
  }

  return out.join('\n\n') + '\n';
}

export const estimateTokens = (text) => Math.ceil((text || '').length / 4);
