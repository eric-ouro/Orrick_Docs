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

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
