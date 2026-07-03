(function () {
  "use strict";

  const seed = window.ORRICK_SEED_DATA;
  const storageKey = "orrick.blindPoolFund.workspace.v1";

  if (!seed) {
    document.body.innerHTML = "<main class=\"empty-state\">Seed data did not load.</main>";
    return;
  }

  const typeLabels = {
    decision: "Decision",
    "drafting-change": "Drafting",
    question: "Question",
    checklist: "Checklist",
    "supporting-document": "Document"
  };

  const statusLabels = {
    open: "Open",
    "in-progress": "In progress",
    drafted: "Drafted",
    "follow-up": "Follow-up",
    resolved: "Resolved"
  };

  const typeOrder = ["decision", "drafting-change", "question", "checklist", "supporting-document"];
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const els = {
    metrics: document.getElementById("metrics"),
    searchInput: document.getElementById("searchInput"),
    typeFilter: document.getElementById("typeFilter"),
    statusFilter: document.getElementById("statusFilter"),
    followFilter: document.getElementById("followFilter"),
    sectionFilter: document.getElementById("sectionFilter"),
    issueList: document.getElementById("issueList"),
    documentTitle: document.getElementById("documentTitle"),
    documentContent: document.getElementById("documentContent"),
    selectedTitle: document.getElementById("selectedTitle"),
    saveState: document.getElementById("saveState"),
    issueDetail: document.getElementById("issueDetail"),
    answerForm: document.getElementById("answerForm"),
    statusInput: document.getElementById("statusInput"),
    ownerInput: document.getElementById("ownerInput"),
    answerInput: document.getElementById("answerInput"),
    changeInput: document.getElementById("changeInput"),
    followInput: document.getElementById("followInput"),
    followNotesInput: document.getElementById("followNotesInput"),
    markResolvedBtn: document.getElementById("markResolvedBtn"),
    resetLocalBtn: document.getElementById("resetLocalBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    addIssueBtn: document.getElementById("addIssueBtn"),
    newIssueDialog: document.getElementById("newIssueDialog"),
    newIssueForm: document.getElementById("newIssueForm"),
    newIssueTitle: document.getElementById("newIssueTitle"),
    newIssueType: document.getElementById("newIssueType"),
    newIssueSection: document.getElementById("newIssueSection"),
    newIssuePrompt: document.getElementById("newIssuePrompt")
  };

  const sectionMap = new Map(seed.termSheet.sections.map((section) => [section.id, section]));

  let workspace = loadWorkspace();
  let saveTimer = null;
  let state = {
    selectedId: workspace.lastSelectedId || seed.issues[0].id,
    selectedSectionId: "",
    docTab: "relevant",
    query: "",
    typeFilter: "all",
    statusFilter: "all",
    followFilter: "all",
    sectionFilter: "all"
  };

  function loadWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        answers: parsed.answers || {},
        customIssues: Array.isArray(parsed.customIssues) ? parsed.customIssues : [],
        lastSelectedId: parsed.lastSelectedId || ""
      };
    } catch (error) {
      console.warn("Could not load saved workspace", error);
      return { answers: {}, customIssues: [], lastSelectedId: "" };
    }
  }

  function persistWorkspace() {
    const payload = {
      ...workspace,
      lastSelectedId: state.selectedId,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nl2br(value) {
    return escapeHtml(value).replace(/\n/g, "<br />");
  }

  function slugClass(value) {
    return String(value || "").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }

  function allIssues() {
    return [...seed.issues, ...workspace.customIssues];
  }

  function answerFor(issueId) {
    return workspace.answers[issueId] || {};
  }

  function issueView(issue) {
    const answer = answerFor(issue.id);
    return {
      ...issue,
      ...answer,
      status: answer.status || issue.status || "open",
      followUp: Boolean(answer.followUp),
      answer: answer.answer || "",
      proposedChange: answer.proposedChange || "",
      followUpNotes: answer.followUpNotes || "",
      owner: answer.owner || ""
    };
  }

  function currentIssue() {
    const found = allIssues().find((issue) => issue.id === state.selectedId);
    return found ? issueView(found) : issueView(allIssues()[0]);
  }

  function sectionTitle(sectionId) {
    const section = sectionMap.get(sectionId);
    return section ? section.title : "Unlinked";
  }

  function linkedSections(issue) {
    return (issue.termSectionIds || []).map((id) => sectionMap.get(id)).filter(Boolean);
  }

  function compactText(parts) {
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function isFollowUp(issue) {
    return issue.followUp || issue.status === "follow-up";
  }

  function filteredIssues() {
    const sourceIssues = allIssues();
    const orderMap = new Map(sourceIssues.map((issue, index) => [issue.id, index]));
    const query = state.query.trim().toLowerCase();
    return sourceIssues
      .map(issueView)
      .filter((issue) => {
        if (state.typeFilter !== "all" && issue.issueType !== state.typeFilter) return false;
        if (state.statusFilter !== "all" && issue.status !== state.statusFilter) return false;
        if (state.followFilter === "flagged" && !isFollowUp(issue)) return false;
        if (state.followFilter === "not-flagged" && isFollowUp(issue)) return false;
        if (state.sectionFilter !== "all" && !(issue.termSectionIds || []).includes(state.sectionFilter)) return false;
        if (!query) return true;
        const sectionNames = (issue.termSectionIds || []).map(sectionTitle).join(" ");
        const haystack = compactText([
          issue.title,
          issue.prompt,
          issue.details,
          issue.provisionalAnswer,
          issue.category,
          issue.source,
          sectionNames,
          ...(issue.tags || [])
        ]);
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const typeDelta = typeOrder.indexOf(a.issueType) - typeOrder.indexOf(b.issueType);
        if (typeDelta !== 0) return typeDelta;
        const priorityDelta = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        if (priorityDelta !== 0) return priorityDelta;
        return (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0);
      });
  }

  function renderFilters() {
    const types = typeOrder.filter((type) => allIssues().some((issue) => issue.issueType === type));
    els.typeFilter.innerHTML = [
      "<option value=\"all\">All</option>",
      ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(typeLabels[type] || type)}</option>`)
    ].join("");

    els.statusFilter.innerHTML = [
      "<option value=\"all\">All</option>",
      ...Object.entries(statusLabels).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    ].join("");

    const sectionOptions = seed.termSheet.sections
      .filter((section) => !section.isGroup)
      .map((section) => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title)}</option>`);
    els.sectionFilter.innerHTML = ["<option value=\"all\">All</option>", ...sectionOptions].join("");
    els.newIssueSection.innerHTML = sectionOptions.join("");

    els.typeFilter.value = state.typeFilter;
    els.statusFilter.value = state.statusFilter;
    els.followFilter.value = state.followFilter;
    els.sectionFilter.value = state.sectionFilter;
  }

  function renderMetrics() {
    const issues = allIssues().map(issueView);
    const total = issues.length;
    const resolved = issues.filter((issue) => issue.status === "resolved").length;
    const flagged = issues.filter(isFollowUp).length;
    const drafted = issues.filter((issue) => issue.status === "drafted").length;
    els.metrics.innerHTML = [
      metricHtml(total, "Total"),
      metricHtml(resolved, "Resolved"),
      metricHtml(flagged, "Follow-up"),
      metricHtml(drafted, "Drafted")
    ].join("");
  }

  function metricHtml(value, label) {
    return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderIssueList() {
    const issues = filteredIssues();
    if (!issues.some((issue) => issue.id === state.selectedId) && issues.length) {
      state.selectedId = issues[0].id;
    }

    if (!issues.length) {
      els.issueList.innerHTML = "<div class=\"empty-state\">No matching items.</div>";
      return;
    }

    els.issueList.innerHTML = issues
      .map((issue) => {
        const active = issue.id === state.selectedId ? " active" : "";
        const follow = isFollowUp(issue) ? "<span class=\"pill status-follow-up\">Flagged</span>" : "";
        const sectionCount = (issue.termSectionIds || []).length;
        return `
          <button class="issue-card${active}" data-issue-id="${escapeHtml(issue.id)}" type="button">
            <h3>${escapeHtml(issue.title)}</h3>
            <div class="issue-meta">
              <span class="pill type-${slugClass(issue.issueType)}">${escapeHtml(typeLabels[issue.issueType] || issue.issueType)}</span>
              <span class="pill status-${slugClass(issue.status)}">${escapeHtml(statusLabels[issue.status] || issue.status)}</span>
              <span class="pill">${sectionCount} section${sectionCount === 1 ? "" : "s"}</span>
              ${follow}
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderSelectedIssue() {
    const issue = currentIssue();
    if (!issue) return;

    els.selectedTitle.textContent = issue.title;
    const sections = linkedSections(issue);
    const sectionChips = sections.length
      ? `<div class="section-chip-row">${sections
          .map((section) => `<button class="section-chip${section.id === state.selectedSectionId ? " active" : ""}" data-chip-section="${escapeHtml(section.id)}" type="button">${escapeHtml(section.title)}</button>`)
          .join("")}</div>`
      : "";

    els.issueDetail.innerHTML = `
      <div class="issue-meta">
        <span class="pill type-${slugClass(issue.issueType)}">${escapeHtml(typeLabels[issue.issueType] || issue.issueType)}</span>
        <span class="pill status-${slugClass(issue.status)}">${escapeHtml(statusLabels[issue.status] || issue.status)}</span>
        ${issue.priority ? `<span class="pill">${escapeHtml(issue.priority)} priority</span>` : ""}
      </div>
      <div class="memo-block">
        <div class="detail-label">Prompt</div>
        <p>${nl2br(issue.prompt || issue.title)}</p>
        ${issue.details ? `<div class="detail-label">Notes</div><p>${nl2br(issue.details)}</p>` : ""}
        ${issue.provisionalAnswer ? `<div class="detail-label">Provisional material</div><p>${nl2br(issue.provisionalAnswer)}</p>` : ""}
        <div class="detail-label">Source</div>
        <p>${escapeHtml(issue.source || "Workspace")}</p>
      </div>
      ${sectionChips}
    `;

    els.statusInput.value = issue.status;
    els.ownerInput.value = issue.owner;
    els.answerInput.value = issue.answer;
    els.changeInput.value = issue.proposedChange;
    els.followInput.checked = issue.followUp;
    els.followNotesInput.value = issue.followUpNotes;
    els.changeInput.placeholder = issue.provisionalAnswer || "";
    els.answerInput.placeholder = issue.issueType === "decision" ? "Record the selected answer and rationale." : "";
  }

  function renderDocument() {
    document.querySelectorAll("[data-doc-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.docTab === state.docTab);
    });

    if (state.docTab === "full") {
      renderFullTermSheet();
    } else if (state.docTab === "memo") {
      renderMemo();
    } else {
      renderRelevantSections();
    }
  }

  function renderRelevantSections() {
    const issue = currentIssue();
    const sections = linkedSections(issue);
    els.documentTitle.textContent = "Relevant Sections";

    if (!sections.length) {
      els.documentContent.innerHTML = "<div class=\"empty-state\">No term-sheet section is linked yet.</div>";
      return;
    }

    els.documentContent.innerHTML = `<div class="section-stack">${sections.map(sectionHtml).join("")}</div>`;
  }

  function renderFullTermSheet() {
    els.documentTitle.textContent = "Full Term Sheet";
    els.documentContent.innerHTML = `<div class="section-stack">${seed.termSheet.sections.map(sectionHtml).join("")}</div>`;
  }

  function renderMemo() {
    els.documentTitle.textContent = "Open Items Memo";
    const sourceNote = seed.meta.sourceFiles
      .filter((source) => source.note)
      .map((source) => `<p class="source-note">${escapeHtml(source.label)}: ${escapeHtml(source.note)}</p>`)
      .join("");
    const paragraphs = seed.openItemsMemo.paragraphs
      .map((paragraph) => {
        const isHeading = /^(\d+\.|[A-H]\.)\s/.test(paragraph) || paragraph === "Executive Summary";
        return isHeading ? `<h3>${escapeHtml(paragraph)}</h3>` : `<p>${escapeHtml(paragraph)}</p>`;
      })
      .join("");
    const tables = seed.openItemsMemo.tables
      .map((table, index) => {
        const rows = table
          .map((row, rowIndex) => {
            const tag = rowIndex === 0 && row.length > 1 ? "th" : "td";
            return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
          })
          .join("");
        return `
          <details class="memo-block">
            <summary>Memo table ${index + 1}</summary>
            <table class="memo-table">${rows}</table>
          </details>
        `;
      })
      .join("");

    els.documentContent.innerHTML = `
      ${sourceNote}
      <div class="memo-block">${paragraphs}</div>
      ${tables}
    `;
  }

  function sectionHtml(section) {
    const selected = section.id === state.selectedSectionId ? " selected" : "";
    const group = section.isGroup ? " group-row" : "";
    return `
      <article class="term-section${selected}${group}" data-section-id="${escapeHtml(section.id)}">
        <div class="section-header">
          <div>
            <h3>${escapeHtml(section.title)}</h3>
            <div class="section-row-label">Row ${section.row} · ${escapeHtml(section.group || "Term Sheet")}</div>
          </div>
          ${section.isGroup ? "" : `<button type="button" data-use-section="${escapeHtml(section.id)}">Focus</button>`}
        </div>
        ${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}
      </article>
    `;
  }

  function renderAll() {
    renderMetrics();
    renderIssueList();
    renderSelectedIssue();
    renderDocument();
  }

  function updateAnswer(patch, rerenderList) {
    const issue = currentIssue();
    if (!issue) return;
    workspace.answers[issue.id] = {
      ...(workspace.answers[issue.id] || {}),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistWorkspace();
    showSaveState("Saved", "saved");
    if (rerenderList) {
      renderMetrics();
      renderIssueList();
      renderSelectedIssue();
      renderDocument();
    }
  }

  function showSaveState(label, className) {
    window.clearTimeout(saveTimer);
    els.saveState.textContent = label;
    els.saveState.className = `save-state ${className || ""}`;
    saveTimer = window.setTimeout(() => {
      els.saveState.textContent = "Saved";
      els.saveState.className = "save-state saved";
    }, 900);
  }

  function setSelectedIssue(issueId) {
    state.selectedId = issueId;
    persistWorkspace();
    const issue = currentIssue();
    state.selectedSectionId = (issue.termSectionIds || [])[0] || "";
    renderAll();
  }

  function setFocusedSection(sectionId) {
    state.selectedSectionId = sectionId;
    state.sectionFilter = sectionId;
    els.sectionFilter.value = sectionId;
    renderIssueList();
    renderSelectedIssue();
    renderDocument();
  }

  function createCustomIssue() {
    const title = els.newIssueTitle.value.trim();
    if (!title) return;
    const sectionId = els.newIssueSection.value;
    const id = `custom-${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}`;
    const issue = {
      id,
      issueType: els.newIssueType.value,
      status: "open",
      priority: "medium",
      category: "Custom",
      title,
      prompt: els.newIssuePrompt.value.trim() || title,
      details: "",
      provisionalAnswer: "",
      source: "User-added item",
      termSectionIds: sectionId ? [sectionId] : [],
      tags: ["custom"]
    };
    workspace.customIssues.push(issue);
    persistWorkspace();
    state.selectedId = id;
    state.selectedSectionId = sectionId;
    els.newIssueForm.reset();
    renderFilters();
    renderAll();
  }

  function exportWorkspace() {
    const payload = {
      exportedAt: new Date().toISOString(),
      project: seed.meta.project,
      seedGeneratedAt: seed.meta.generatedAt,
      answers: workspace.answers,
      customIssues: workspace.customIssues
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orrick-blind-pool-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importWorkspace(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        workspace.answers = { ...workspace.answers, ...(imported.answers || {}) };
        const existingCustom = new Map(workspace.customIssues.map((issue) => [issue.id, issue]));
        (imported.customIssues || []).forEach((issue) => existingCustom.set(issue.id, issue));
        workspace.customIssues = Array.from(existingCustom.values());
        persistWorkspace();
        renderFilters();
        renderAll();
        showSaveState("Imported", "saved");
      } catch (error) {
        window.alert("That JSON file could not be imported.");
      }
    };
    reader.readAsText(file);
  }

  function resetWorkspace() {
    if (!window.confirm("Clear saved answers and custom issues from this browser?")) return;
    localStorage.removeItem(storageKey);
    workspace = { answers: {}, customIssues: [], lastSelectedId: "" };
    state.selectedId = seed.issues[0].id;
    state.selectedSectionId = "";
    state.sectionFilter = "all";
    renderFilters();
    renderAll();
    showSaveState("Reset", "saved");
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", () => {
      state.query = els.searchInput.value;
      renderAll();
    });

    els.typeFilter.addEventListener("change", () => {
      state.typeFilter = els.typeFilter.value;
      renderAll();
    });

    els.statusFilter.addEventListener("change", () => {
      state.statusFilter = els.statusFilter.value;
      renderAll();
    });

    els.followFilter.addEventListener("change", () => {
      state.followFilter = els.followFilter.value;
      renderAll();
    });

    els.sectionFilter.addEventListener("change", () => {
      state.sectionFilter = els.sectionFilter.value;
      state.selectedSectionId = state.sectionFilter === "all" ? "" : state.sectionFilter;
      renderAll();
    });

    els.issueList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-issue-id]");
      if (!card) return;
      setSelectedIssue(card.dataset.issueId);
    });

    document.querySelectorAll("[data-doc-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.docTab = button.dataset.docTab;
        renderDocument();
      });
    });

    els.documentContent.addEventListener("click", (event) => {
      const button = event.target.closest("[data-use-section]");
      if (button) {
        setFocusedSection(button.dataset.useSection);
      }
    });

    els.issueDetail.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-chip-section]");
      if (chip) {
        state.selectedSectionId = chip.dataset.chipSection;
        renderSelectedIssue();
        renderDocument();
      }
    });

    els.statusInput.addEventListener("change", () => {
      updateAnswer({ status: els.statusInput.value }, true);
    });

    els.ownerInput.addEventListener("input", () => {
      updateAnswer({ owner: els.ownerInput.value }, false);
    });

    els.answerInput.addEventListener("input", () => {
      updateAnswer({ answer: els.answerInput.value }, false);
    });

    els.changeInput.addEventListener("input", () => {
      updateAnswer({ proposedChange: els.changeInput.value }, false);
    });

    els.followInput.addEventListener("change", () => {
      updateAnswer({ followUp: els.followInput.checked }, true);
    });

    els.followNotesInput.addEventListener("input", () => {
      updateAnswer({ followUpNotes: els.followNotesInput.value }, false);
    });

    els.markResolvedBtn.addEventListener("click", () => {
      els.statusInput.value = "resolved";
      els.followInput.checked = false;
      updateAnswer({ status: "resolved", followUp: false }, true);
    });

    els.resetLocalBtn.addEventListener("click", resetWorkspace);
    els.exportBtn.addEventListener("click", exportWorkspace);
    els.importBtn.addEventListener("click", () => els.importFile.click());
    els.importFile.addEventListener("change", () => {
      const file = els.importFile.files && els.importFile.files[0];
      if (file) importWorkspace(file);
      els.importFile.value = "";
    });

    els.addIssueBtn.addEventListener("click", () => {
      const issue = currentIssue();
      const defaultSection = state.selectedSectionId || (issue.termSectionIds || [])[0] || seed.termSheet.sections.find((section) => !section.isGroup).id;
      els.newIssueSection.value = defaultSection;
      if (els.newIssueDialog.showModal) {
        els.newIssueDialog.showModal();
      }
    });

    els.newIssueForm.addEventListener("submit", (event) => {
      if (event.submitter && event.submitter.id === "createIssueBtn") {
        event.preventDefault();
        createCustomIssue();
        els.newIssueDialog.close();
      }
    });
  }

  function init() {
    const selected = allIssues().find((issue) => issue.id === state.selectedId) || seed.issues[0];
    state.selectedId = selected.id;
    state.selectedSectionId = (selected.termSectionIds || [])[0] || "";
    renderFilters();
    bindEvents();
    renderAll();
    showSaveState("Saved", "saved");
  }

  init();
})();
