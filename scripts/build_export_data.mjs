// Assembles exports/export_data.json for the lawyer deliverables.
//
// Boots the app in jsdom so we can use the app's own clause parser/resolver
// (exposed via window.ORRICK_INTERNALS), then for every clause emits:
//   - finalText: the fully resolved clause text (same as the app displays)
//   - ops: character-range edit operations against the ORIGINAL body text
//          (drop / replace), which let the docx builder splice the elections
//          into the original Word file while preserving its formatting.
// Remote clause rows come from exports/clause_states.json (Supabase).
import fs from "node:fs";
import { JSDOM } from "jsdom";

const clauseRows = JSON.parse(fs.readFileSync("exports/clause_states.json", "utf8"));
const issueRows = JSON.parse(fs.readFileSync("exports/issues.json", "utf8"));
const byStableKey = new Map(clauseRows.map((row) => [row.stable_key, row]));

const html = fs.readFileSync("index.html", "utf8");
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true
});
const { window } = dom;
window.HTMLDialogElement.prototype.showModal ||= function () {};
window.HTMLDialogElement.prototype.close ||= function () {};
window.eval(fs.readFileSync("data/seed-data.js", "utf8"));
window.eval("window.ORRICK_SUPABASE_CONFIG = {};");
window.eval(fs.readFileSync("app.js", "utf8"));

const internals = window.ORRICK_INTERNALS;
if (!internals) throw new Error("window.ORRICK_INTERNALS not exposed by app.js");

const seed = window.ORRICK_SEED_DATA;

// Emit edit operations over the original clause body for a set of elections.
//   drop    - remove [start,end): omitted optionals, unchosen options, form
//             notes, and the bracket delimiters themselves
//   replace - swap [start,end) for user-provided text (custom language, blanks)
function emitOps(nodes, elections, ops) {
  for (const seg of nodes || []) {
    if (seg.kind === "text") continue;
    if (seg.kind === "note") {
      ops.push({ type: "drop", start: seg.range[0], end: seg.range[1] });
      continue;
    }
    if (seg.kind !== "election") continue;
    const el = (elections && elections[seg.path]) || {};
    const [start, end] = seg.range;
    if (el.mode === "omit") {
      ops.push({ type: "drop", start, end });
      continue;
    }
    if (el.mode === "custom") {
      const value = String(el.value || "").trim();
      ops.push({ type: "replace", start, end, text: value });
      continue;
    }
    if (seg.type === "optional" && el.mode === "include") {
      ops.push({ type: "drop", start, end: start + 1 });
      ops.push({ type: "drop", start: end - 1, end });
      emitOps(seg.nodes, elections, ops);
      continue;
    }
    if (seg.type === "choice" && el.mode === "option") {
      const option = seg.options[el.optionIndex];
      if (option) {
        ops.push({ type: "drop", start, end: option.innerRange[0] });
        ops.push({ type: "drop", start: option.innerRange[1], end });
        emitOps(option.nodes, elections, ops);
        continue;
      }
    }
    ops.push({ type: "unresolved", start, end });
  }
}

// Same whitespace cleanup the app applies in clauseFinalText.
function cleanupText(text) {
  return text
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyOps(body, ops) {
  const sorted = [...ops].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const op of sorted) {
    out += body.slice(cursor, op.start);
    if (op.type === "replace") out += op.text;
    cursor = op.end;
  }
  out += body.slice(cursor);
  return out;
}

const sections = [];
const problems = [];

for (const section of seed.termSheet.sections) {
  if (section.isGroup) {
    sections.push({ stableKey: section.id, title: section.title, isGroup: true, row: section.row });
    continue;
  }
  const remote = byStableKey.get(section.id) || null;
  const status = remote?.status || "none";
  const elections = remote?.elections || {};
  const body = section.body || "";
  const nodes = internals.parseClauseTokens(body);
  const { total, resolved } = internals.countElections(nodes, elections);
  const finalText = internals.clauseFinalText({ body }, { elections });

  const ops = [];
  emitOps(nodes, elections, ops);
  const unresolvedCount = ops.filter((op) => op.type === "unresolved").length;
  const fullyResolved = total === resolved && unresolvedCount === 0;

  // Verify the splice ops reproduce the app's resolved text exactly.
  if (fullyResolved && (status === "accepted" || status === "rewrite")) {
    const spliced = cleanupText(applyOps(body, ops));
    if (spliced !== finalText) {
      problems.push(`ops/finalText mismatch for ${section.id}`);
    }
  }

  sections.push({
    stableKey: section.id,
    row: section.row,
    title: section.title,
    group: section.group,
    isGroup: false,
    status,
    electionsResolved: resolved,
    electionsTotal: total,
    fullyResolved,
    finalText,
    originalBody: body,
    ops,
    rewriteText: (remote?.rewrite_text || "").trim(),
    notes: (remote?.notes || "").trim(),
    guidance: section.guidance || []
  });

  if ((status === "accepted" || status === "rewrite") && !fullyResolved && status !== "rewrite") {
    problems.push(`incomplete elections on accepted clause: ${section.id} ${resolved}/${total}`);
  }
  if (status === "none" && total > 0) {
    problems.push(`clause has ${total} elections but no saved state: ${section.id}`);
  }
}

fs.writeFileSync(
  "exports/export_data.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), sections, issues: issueRows }, null, 2)
);

const clauses = sections.filter((s) => !s.isGroup);
console.log(`sections: ${sections.length} (${clauses.length} clauses)`);
console.log(
  "statuses:",
  JSON.stringify(clauses.reduce((acc, s) => ((acc[s.status] = (acc[s.status] || 0) + 1), acc), {}))
);
console.log(
  "fully resolved:",
  clauses.filter((s) => s.fullyResolved).length,
  "| with ops:",
  clauses.filter((s) => s.ops.length).length
);
if (problems.length) {
  console.log("\nPROBLEMS:");
  problems.forEach((p) => console.log(" -", p));
} else {
  console.log("no problems detected");
}
