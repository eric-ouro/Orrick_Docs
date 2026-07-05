// Headless smoke test: boots the app in jsdom in local (no-Supabase) mode and
// verifies the queue, filters, document panel, and detail panel all render.
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

check("setup shell visible", !doc.getElementById("setupShell").hidden);
doc.getElementById("localModeBtn").click();
check("workspace visible after local mode", !doc.getElementById("workspaceShell").hidden);

const issueCards = doc.querySelectorAll(".issue-card");
const groupLabels = [...doc.querySelectorAll(".issue-group-label")].map((el) => el.textContent);
check(`126 issue cards rendered (got ${issueCards.length})`, issueCards.length === 126);
check(`topic group headers rendered (got ${groupLabels.length})`, groupLabels.length === 16);
check("first group is Immediate decisions", groupLabels[0] === "Immediate decisions");

const topicFilter = doc.getElementById("topicFilter");
check(`topic filter populated (got ${topicFilter.options.length})`, topicFilter.options.length === 17);

// Filter to one topic and confirm the queue narrows.
topicFilter.value = "B. Fund economics";
topicFilter.dispatchEvent(new window.Event("change", { bubbles: true }));
const filteredCards = doc.querySelectorAll(".issue-card");
check(`topic filter narrows queue (got ${filteredCards.length})`, filteredCards.length === 10);
check("queue count text", doc.getElementById("queueCount").textContent === "Showing 10 of 126");

// Select the carry-percentage question and verify curated content shows.
const carryCard = [...filteredCards].find((el) => el.textContent.includes("carry percentage"));
carryCard.click();
await new Promise((resolve) => setTimeout(resolve, 20));
const detail = doc.getElementById("issueDetail").textContent;
check("curated how-to-decide note shown", detail.includes("How to decide:") && detail.includes("waterfall"));
check("linked clause is Distributions", detail.includes("Distributions"));
check("stale Capital Commitments link removed", !detail.includes("Capital Commitments"));

// Gap questions exist and are linked to previously-orphaned sections.
topicFilter.value = "J. Distributions, liability, and tax (gap review)";
topicFilter.dispatchEvent(new window.Event("change", { bubbles: true }));
check(`gap topic renders (got ${doc.querySelectorAll(".issue-card").length})`, doc.querySelectorAll(".issue-card").length === 4);

// Clear filters restores the full queue.
doc.getElementById("clearFiltersBtn").click();
check("clear filters restores queue", doc.querySelectorAll(".issue-card").length === 126);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
