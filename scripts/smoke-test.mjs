// Headless smoke test: boots the app in jsdom in local (no-Supabase) mode and
// verifies the queue, filters, document panel, detail panel, and the clause
// election editor all render and behave.
import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync("index.html", "utf8");
// Strip external script tags; we evaluate the app scripts ourselves.
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true
});

const { window } = dom;
window.HTMLDialogElement.prototype.showModal ||= function () {};
window.HTMLDialogElement.prototype.close ||= function () {};

// No Supabase config -> app boots into setup mode, then we enter local mode.
window.eval(fs.readFileSync("data/seed-data.js", "utf8"));
window.eval("window.ORRICK_SUPABASE_CONFIG = {};");
window.eval(fs.readFileSync("app.js", "utf8"));

const doc = window.document;
const failures = [];
const check = (label, ok) => {
  if (!ok) failures.push(label);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
};
const changeEvent = () => new window.Event("change", { bubbles: true });

check("setup shell visible", !doc.getElementById("setupShell").hidden);
doc.getElementById("localModeBtn").click();
check("workspace visible after local mode", !doc.getElementById("workspaceShell").hidden);

const issueCards = doc.querySelectorAll(".issue-card");
const groupLabels = [...doc.querySelectorAll(".issue-group-label")].map((el) => el.textContent);
check(`105 issue cards rendered (got ${issueCards.length})`, issueCards.length === 105);
check(`topic group headers rendered (got ${groupLabels.length})`, groupLabels.length === 16);
check("first group is Immediate decisions", groupLabels[0] === "Immediate decisions");

const topicFilter = doc.getElementById("topicFilter");
check(`topic filter populated (got ${topicFilter.options.length})`, topicFilter.options.length === 17);

// Pure fill-in questions were retired in favor of clause elections.
check(
  "retired fill-in questions absent",
  ![...issueCards].some(
    (el) => el.textContent.includes("What is the carry percentage") || el.textContent.includes("target fund size")
  )
);

// Tier filter and tier pills.
const tierFilter = doc.getElementById("tierFilter");
check(
  `tier filter has 4 tiers (got ${tierFilter.options.length - 1})`,
  tierFilter.options.length === 5
);
tierFilter.value = "fill-in";
tierFilter.dispatchEvent(changeEvent());
check(`fill-in tier narrows queue (got ${doc.querySelectorAll(".issue-card").length})`, doc.querySelectorAll(".issue-card").length === 9);
check("tier pill rendered on card", Boolean(doc.querySelector(".issue-card .pill.tier-fill-in")));
tierFilter.value = "all";
tierFilter.dispatchEvent(changeEvent());

// Filter to one topic and confirm the queue narrows (B lost its 7 pure fill-ins).
topicFilter.value = "B. Fund economics";
topicFilter.dispatchEvent(changeEvent());
const filteredCards = doc.querySelectorAll(".issue-card");
check(`topic filter narrows queue (got ${filteredCards.length})`, filteredCards.length === 2);
check("queue count text", doc.getElementById("queueCount").textContent === "Showing 2 of 105");

// Select the waterfall question and verify curated content shows.
const waterfallCard = [...filteredCards].find((el) => el.textContent.includes("European waterfall"));
waterfallCard.click();
await new Promise((resolve) => setTimeout(resolve, 20));
const detail = doc.getElementById("issueDetail").textContent;
check("curated how-to-decide note shown", detail.includes("How to decide:"));
check("linked clause is Distributions", detail.includes("Distributions"));
check("tier pill shown in detail", Boolean(doc.querySelector("#issueDetail .pill.tier-multi-clause")));

// Gap questions exist and are linked to previously-orphaned sections.
topicFilter.value = "J. Distributions, liability, and tax (gap review)";
topicFilter.dispatchEvent(changeEvent());
check(`gap topic renders (got ${doc.querySelectorAll(".issue-card").length})`, doc.querySelectorAll(".issue-card").length === 3);

// "Not resolved" status filter shows every non-resolved item.
topicFilter.value = "all";
topicFilter.dispatchEvent(changeEvent());
const statusFilter = doc.getElementById("statusFilter");
check(
  "status filter has Not resolved option",
  [...statusFilter.options].some((o) => o.value === "not-resolved")
);
statusFilter.value = "not-resolved";
statusFilter.dispatchEvent(changeEvent());
// Local seed has no resolved issues, so all 105 should remain.
check(`not-resolved shows all non-resolved (got ${doc.querySelectorAll(".issue-card").length})`, doc.querySelectorAll(".issue-card").length === 105);

// Clear filters restores the full queue.
doc.getElementById("clearFiltersBtn").click();
check("clear filters restores queue", doc.querySelectorAll(".issue-card").length === 105);

// ---------------------------------------------------------------------------
// Clause election editor
// ---------------------------------------------------------------------------

// Clauses metric starts at 0/N.
const clausesMetric = [...doc.querySelectorAll("#metrics .metric")].find((el) => el.textContent.includes("Clauses"));
check("clauses metric rendered", Boolean(clausesMetric));
const metricStart = clausesMetric.querySelector("strong").textContent;
check(`clauses metric starts unsettled (got ${metricStart})`, /^0\/\d+$/.test(metricStart));

// Open the full term sheet and click the LP giveback clause.
[...doc.querySelectorAll("[data-doc-tab]")].find((el) => el.dataset.docTab === "full").click();
const givebackSection = doc.querySelector('[data-section-id="sec-39-limited-partner-giveback"]');
check("LP giveback clause rendered in full view", Boolean(givebackSection));
givebackSection.click();

const clausePanel = doc.getElementById("clausePanel");
check("clause panel visible after clicking a clause", !clausePanel.hidden);
check("answer form hidden in clause mode", doc.getElementById("answerForm").hidden);
check("clause guidance shows retired-question note", doc.getElementById("clauseGuidance").textContent.includes("giveback cap"));

const electionRows = doc.querySelectorAll("#clauseElections .election-row");
check(`giveback clause has 2 elections (got ${electionRows.length})`, electionRows.length === 2);
check("options render as readable radio cards", doc.querySelectorAll("#clauseElections .election-option").length >= 5);

const acceptBtn = doc.getElementById("clauseAcceptBtn");
check("accept disabled until elections resolved", acceptBtn.disabled);

// Resolve both elections by picking the first option of each group.
for (let i = 0; i < 2; i += 1) {
  const rows = doc.querySelectorAll("#clauseElections .election-row");
  const radio = rows[i].querySelector('input[type="radio"][value="option:0"]');
  radio.checked = true;
  radio.dispatchEvent(changeEvent());
}
check("clause header shows 2/2 choices made", doc.getElementById("clauseHeader").textContent.includes("2/2 choices made"));
check("preview shows filled election", Boolean(doc.querySelector("#clausePreview .election-filled")));
check("accept enabled once resolved", !doc.getElementById("clauseAcceptBtn").disabled);

// Clause AI panel is present in the clause editor.
check("clause AI panel present", Boolean(doc.getElementById("clauseAskAiBtn") && doc.getElementById("clauseAiResponse")));

doc.getElementById("clauseAcceptBtn").click();
check("clause marked accepted", doc.getElementById("clauseHeader").textContent.includes("Accepted"));
const metricAfter = [...doc.querySelectorAll("#metrics .metric")]
  .find((el) => el.textContent.includes("Clauses"))
  .querySelector("strong").textContent;
check(`clauses metric advanced (got ${metricAfter})`, /^1\/\d+$/.test(metricAfter));

// Document pane now shows the finalized (edited) clause text, not raw brackets.
const givebackDoc = doc.querySelector('[data-section-id="sec-39-limited-partner-giveback"]');
check("document shows finalized clause block", Boolean(givebackDoc.querySelector(".clause-final")));
check("finalized clause has no open brackets", !givebackDoc.querySelector(".clause-final-text").textContent.includes("["));
check("original form language available in disclosure", Boolean(givebackDoc.querySelector(".clause-original")));

// Elections persist to local storage.
const stored = JSON.parse(window.localStorage.getItem("orrick.blindPoolFund.workspace.v2"));
const storedClause = stored.clauseStates["sec-39-limited-partner-giveback"];
check("clause state persisted locally", storedClause?.status === "accepted" && Object.keys(storedClause.elections).length === 2);

// Nested elections (Closings clause): the "$▢ million" provision is a keep/omit
// optional whose nested blank only appears once it is kept.
doc.querySelector('[data-section-id="sec-05-closings"]').click();
const nestedOption = [...doc.querySelectorAll("#clauseElections .election-option")].find((label) =>
  label.textContent.includes("\u25a2 million")
);
check("nested-blank provision shown readably with a placeholder", Boolean(nestedOption));
const keepRadio = nestedOption.querySelector('input[value="include"]');
check("keep radio present for the nested provision", Boolean(keepRadio));
keepRadio.checked = true;
keepRadio.dispatchEvent(changeEvent());
const nestedInput = doc.querySelector("#clauseElections .election-nested-group [data-election-input]");
check("nested blank input appears once its provision is kept", Boolean(nestedInput));
nestedInput.value = "25";
nestedInput.dispatchEvent(new window.Event("input", { bubbles: true }));
check("nested blank fill resolves that election", doc.querySelector("#clausePreview").textContent.includes("$25 million"));

// A deeper case: the "extend such period" provision holds a choice nested inside
// a kept optional (sole discretion vs. LPAC consent).
const extendOption = [...doc.querySelectorAll("#clauseElections .election-option")].find((label) =>
  label.textContent.includes("extend such period")
);
check("deeply nested optional provision present", Boolean(extendOption));
const extendKeep = extendOption.querySelector('input[value="include"]');
extendKeep.checked = true;
extendKeep.dispatchEvent(changeEvent());
const nestedChoiceOptions = [...doc.querySelectorAll("#clauseElections .election-nested-group .election-option")].filter(
  (label) => label.textContent.includes("sole discretion") || label.textContent.includes("consent")
);
check("nested choice appears inside the kept provision", nestedChoiceOptions.length >= 2);

// Management Fee (the reported clause): an [A][OR][B] choice whose chosen option
// contains a further nested rate choice ([0.25][0.1]).
doc.querySelector('[data-section-id="sec-10-management-fee"]').click();
const mgmtRows = doc.querySelectorAll("#clauseElections .election-row");
check(`management fee clause exposes several elections (got ${mgmtRows.length})`, mgmtRows.length >= 5);

// Each election shows the verbatim sentence it lives in, with its bracket marked.
const firstCtx = mgmtRows[0].querySelector(".election-context");
check("election shows in-context sentence", Boolean(firstCtx) && firstCtx.textContent.includes("Management Fee"));
const firstTarget = mgmtRows[0].querySelector(".election-context-target");
check(
  "context highlights this election's exact bracket text",
  Boolean(firstTarget) && firstTarget.textContent.includes("[2.5]") && firstTarget.textContent.includes("[2.0]")
);
const earlierRow = [...mgmtRows].find((r) => (r.querySelector(".election-context-target")?.textContent || "").includes("the earlier of"));
check("keep/omit election marks its own phrase in context", Boolean(earlierRow));
check(
  "context around the earlier-of phrase reads naturally",
  Boolean(earlierRow) && earlierRow.querySelector(".election-context").textContent.includes("Following")
);
const stepdownOption = [...doc.querySelectorAll("#clauseElections .election-option")].find((label) =>
  label.textContent.includes("percentage points")
);
check("OR stepdown option present", Boolean(stepdownOption));
const stepdownRadio = stepdownOption.querySelector('input[value^="option:"]');
stepdownRadio.checked = true;
stepdownRadio.dispatchEvent(changeEvent());
const rateChoice = [...doc.querySelectorAll("#clauseElections .election-nested-group .election-option")].filter(
  (label) => label.textContent.trim() === "0.25" || label.textContent.trim() === "0.1"
);
check("nested rate choice appears inside the chosen OR option", rateChoice.length >= 2);
// Choosing the nested rate should surface it in the live preview.
rateChoice[0].querySelector("input").checked = true;
rateChoice[0].querySelector("input").dispatchEvent(changeEvent());
check("nested rate flows into preview", doc.querySelector("#clausePreview").textContent.includes("0.25 percentage points"));

// Selecting an issue switches the right pane back to the issue editor.
doc.querySelector(".issue-card").click();
await new Promise((resolve) => setTimeout(resolve, 20));
check("issue editor restored after selecting issue", doc.getElementById("clausePanel").hidden && !doc.getElementById("answerForm").hidden);

// Every clause body must have balanced square brackets. An unbalanced bracket
// makes the parser swallow the rest of the clause into one giant option, so its
// elections lose the sentence they refer to.
{
  const unbalanced = window.ORRICK_SEED_DATA.termSheet.sections
    .filter((section) => !section.isGroup && section.body)
    .filter((section) => {
      let depth = 0;
      let ok = true;
      for (const ch of section.body) {
        if (ch === "[") depth += 1;
        else if (ch === "]") {
          depth -= 1;
          if (depth < 0) ok = false;
        }
      }
      return depth !== 0 || !ok;
    })
    .map((section) => section.id);
  check(`all clause bodies have balanced brackets${unbalanced.length ? ` (bad: ${unbalanced.join(", ")})` : ""}`, unbalanced.length === 0);
}

// Investment Limitations has nested (sub) elections; each election - including
// nested ones - must show the in-context sentence it refers to.
{
  doc.querySelector('[data-doc-tab="full"]').click();
  const limitsSection = doc.querySelector('[data-section-id="sec-20-investment-limitations"]');
  check("investment limitations clause is present in full view", Boolean(limitsSection));
  if (limitsSection) {
    limitsSection.click();
    // Keep every optional so nested elections become visible.
    let guard = 0;
    while (guard++ < 60) {
      const keep = doc.querySelector('#clauseElections input[value="include"]:not(:checked)');
      if (!keep) break;
      keep.checked = true;
      keep.dispatchEvent(changeEvent());
    }
    const rows = [...doc.querySelectorAll("#clauseElections .election-row")];
    const nestedRows = rows.filter((row) => (row.getAttribute("data-election-row") || "").match(/[>:]/));
    const rowsWithoutContext = rows.filter((row) => !row.querySelector(".election-context"));
    check(`investment limitations exposes nested elections (got ${nestedRows.length})`, nestedRows.length >= 4);
    check(
      `every investment-limitations election shows its clause sentence${rowsWithoutContext.length ? ` (missing: ${rowsWithoutContext.length})` : ""}`,
      rows.length > 0 && rowsWithoutContext.length === 0
    );
    const scoutRow = rows.find((row) => (row.getAttribute("data-election-row") || "").startsWith("5>"));
    check(
      "nested scout-fund election is anchored in its sentence",
      Boolean(scoutRow) && /scout fund/.test(scoutRow.querySelector(".election-context")?.textContent || "")
    );
  }
  // Restore the relevant view for later checks.
  doc.querySelector('[data-doc-tab="relevant"]').click();
}

// Regression: clause_states saved by an older parser can carry election shapes
// that no longer match the current tree (e.g. a path that used to be a pick-one
// choice is now a keep/omit optional). Rendering must not throw on that data.
{
  const staleDom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const w2 = staleDom.window;
  w2.HTMLDialogElement.prototype.showModal ||= function () {};
  w2.HTMLDialogElement.prototype.close ||= function () {};
  w2.localStorage.setItem(
    "orrick.blindPoolFund.workspace.v2",
    JSON.stringify({
      version: 2,
      clauseStates: {
        // option-mode data landing on an optional/blank; out-of-range and missing indexes
        "sec-05-closings": {
          status: "accepted",
          elections: { "0": { mode: "option", optionIndex: 1, blank: "25" }, "1": { mode: "option" }, "2": { mode: "include" } },
          rewriteText: "",
          notes: ""
        },
        "sec-10-management-fee": {
          status: "accepted",
          elections: { "0": { mode: "option", optionIndex: 0 }, "1": { mode: "option", optionIndex: 9 }, "2": { mode: "include" } },
          rewriteText: "",
          notes: ""
        }
      }
    })
  );
  w2.eval(fs.readFileSync("data/seed-data.js", "utf8"));
  w2.eval("window.ORRICK_SUPABASE_CONFIG = {};");
  let staleThrew = null;
  try {
    w2.eval(fs.readFileSync("app.js", "utf8"));
    w2.document.getElementById("localModeBtn").click();
    ["sec-05-closings", "sec-10-management-fee"].forEach((id) => {
      const el = w2.document.querySelector(`[data-section-id="${id}"]`);
      if (el) el.click();
    });
  } catch (error) {
    staleThrew = error;
  }
  check(
    `stale/mismatched clause elections render without throwing${staleThrew ? ` (threw: ${staleThrew.message})` : ""}`,
    !staleThrew && !w2.document.getElementById("workspaceShell").hidden
  );
}

// Offline outbox: boot the app in remote mode against a mock Supabase whose
// writes can be toggled offline. Verify edits queue durably, coalesce (LWW), and
// flush on reconnect.
{
  const waitFor = async (fn, timeout = 4000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (fn()) return true;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return false;
  };

  const mock = {
    online: true,
    writes: [],
    reads: {
      projects: [{ id: "proj-1", name: "Test Project", updated_at: "2026-01-01T00:00:00Z" }],
      documents: [{ id: "doc-1", project_id: "proj-1", title: "TS", document_type: "term_sheet", source_label: "x" }],
      document_sections: [
        {
          id: "sec-x",
          stable_key: "sec-x",
          document_id: "doc-1",
          project_id: "proj-1",
          section_order: 1,
          title: "Closings",
          body: "The GP will hold the closing at $[_____] million in commitments.",
          group_title: "Fund",
          is_group: false,
          section_kind: "clause",
          source_ref: {}
        }
      ],
      issues: [
        {
          id: "iss-1",
          stable_key: "iss-1",
          project_id: "proj-1",
          issue_type: "question",
          initial_status: "open",
          priority: "medium",
          category: "Custom",
          title: "Test question",
          prompt: "Test?",
          details: "",
          tags: [],
          sort_order: 0
        }
      ],
      issue_sections: [{ project_id: "proj-1", issue_id: "iss-1", section_id: "sec-x", position: 0 }],
      issue_states: [],
      clause_states: [],
      profiles: [{ id: "u1", email: "t@e.com", display_name: "t" }],
      project_members: [{ project_id: "proj-1", user_id: "u1", role: "owner", added_by: "u1", created_at: "2026-01-01T00:00:00Z" }],
      issue_events: []
    }
  };

  const makeMockDb = () => {
    const buildQuery = (table) => {
      const b = { _op: null, _payload: null, _single: false };
      const chain = () => b;
      b.select = chain;
      b.eq = chain;
      b.neq = chain;
      b.in = chain;
      b.match = chain;
      b.order = chain;
      b.limit = chain;
      b.single = () => {
        b._single = true;
        return b;
      };
      b.upsert = (payload) => {
        b._op = "upsert";
        b._payload = payload;
        return b;
      };
      b.insert = (payload) => {
        b._op = "insert";
        b._payload = payload;
        return b;
      };
      b.update = (payload) => {
        b._op = "update";
        b._payload = payload;
        return b;
      };
      b.delete = () => {
        b._op = "delete";
        return b;
      };
      b.then = (resolve, reject) =>
        Promise.resolve()
          .then(() => {
            if (b._op) {
              if (!mock.online) throw new TypeError("Failed to fetch");
              mock.writes.push({ table, op: b._op, payload: b._payload });
              return { data: b._payload, error: null };
            }
            return { data: (mock.reads[table] || []).slice(), error: null };
          })
          .then(resolve, reject);
      return b;
    };
    return {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@e.com" } } }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
      },
      from: (table) => buildQuery(table)
    };
  };

  const remoteDom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const w = remoteDom.window;
  w.HTMLDialogElement.prototype.showModal ||= function () {};
  w.HTMLDialogElement.prototype.close ||= function () {};
  w.supabase = { createClient: makeMockDb };
  w.eval(fs.readFileSync("data/seed-data.js", "utf8"));
  w.eval("window.ORRICK_SUPABASE_CONFIG = { url: 'https://x.supabase.co', anonKey: 'test-anon-key' };");
  w.eval(fs.readFileSync("app.js", "utf8"));

  const rdoc = w.document;
  const outboxOf = () => JSON.parse(w.localStorage.getItem("orrick.blindPoolFund.outbox.v1") || "{}").ops || {};

  const booted = await waitFor(() => rdoc.querySelector("#issueList .issue-card"));
  check("remote workspace boots against mock Supabase", booted && !rdoc.getElementById("workspaceShell").hidden);
  check("badge reads Synced when online with empty queue", rdoc.getElementById("saveState").textContent.includes("Synced"));

  // Go offline (writes now fail as network errors) and make edits.
  mock.online = false;
  rdoc.querySelector("#issueList .issue-card").click();
  await new Promise((resolve) => setTimeout(resolve, 30));

  const statusInput = rdoc.getElementById("statusInput");
  statusInput.value = "in-progress";
  statusInput.dispatchEvent(new w.Event("change", { bubbles: true }));
  // Second edit to the same issue should coalesce (last-write-wins), not stack.
  statusInput.value = "resolved";
  statusInput.dispatchEvent(new w.Event("change", { bubbles: true }));

  // Edit a clause election too.
  const sectionEl = rdoc.querySelector('[data-section-id="sec-x"]');
  check("linked clause is available in remote document pane", Boolean(sectionEl));
  if (sectionEl) sectionEl.click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const blank = rdoc.querySelector("#clauseElections [data-election-input]");
  check("clause blank input rendered in remote mode", Boolean(blank));
  if (blank) {
    blank.value = "25";
    blank.dispatchEvent(new w.Event("input", { bubbles: true }));
  }

  // Wait for the debounced flush to fire and fail while offline.
  await new Promise((resolve) => setTimeout(resolve, 900));

  const queuedOffline = outboxOf();
  const queuedKeys = Object.keys(queuedOffline);
  check(
    `offline edits persist to the outbox (got ${queuedKeys.length})`,
    queuedKeys.length === 2 &&
      queuedKeys.includes("proj-1|issue_state|iss-1") &&
      queuedKeys.includes("proj-1|clause_state|sec-x")
  );
  check(
    "repeated edits to one row coalesce to a single op (LWW)",
    queuedKeys.filter((key) => key.includes("|issue_state|")).length === 1 &&
      queuedOffline["proj-1|issue_state|iss-1"].payload.status === "resolved"
  );
  check(
    "no issue/clause writes reached the server while offline",
    mock.writes.filter((wr) => wr.table === "issue_states" || wr.table === "clause_states").length === 0
  );
  check(
    "badge shows offline with queued count",
    rdoc.getElementById("saveState").className.includes("offline") &&
      rdoc.getElementById("saveState").textContent.toLowerCase().includes("offline")
  );
  check("Sync now button is offered while queued", !rdoc.getElementById("syncNowBtn").hidden);

  // Reconnect: dispatch the browser online event and let the queue flush.
  mock.online = true;
  w.dispatchEvent(new w.Event("online"));
  const drained = await waitFor(() => Object.keys(outboxOf()).length === 0);
  check("outbox drains on reconnect", drained);
  check(
    "queued edits reached the server after reconnect",
    mock.writes.some((wr) => wr.table === "issue_states") && mock.writes.some((wr) => wr.table === "clause_states")
  );
  check(
    "the synced issue payload reflects the last write (resolved)",
    mock.writes.filter((wr) => wr.table === "issue_states").pop().payload.status === "resolved"
  );
  check("badge returns to Synced after reconnect", rdoc.getElementById("saveState").textContent.includes("Synced"));
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
process.exit(0);
