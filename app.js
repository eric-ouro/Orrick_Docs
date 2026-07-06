(function () {
  "use strict";

  const seed = window.ORRICK_SEED_DATA;
  const storageKey = "orrick.blindPoolFund.workspace.v2";
  const outboxKey = "orrick.blindPoolFund.outbox.v1";
  const config = window.ORRICK_SUPABASE_CONFIG || {};
  const supabaseUrl = config.url || (config.projectRef ? `https://${config.projectRef}.supabase.co` : "");
  const supabaseAnonKey = config.anonKey || "";
  const hasSupabaseConfig =
    Boolean(window.supabase && supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes("paste-your"));
  const db = hasSupabaseConfig ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

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

  // Resolution tiers: how an item gets decided.
  const tierLabels = {
    "high-level": "High-level",
    "multi-clause": "Multi-clause",
    "fill-in": "Fill-in",
    "addition-removal": "Addition / removal"
  };
  const tierOrderList = ["high-level", "multi-clause", "fill-in", "addition-removal"];

  const clauseStatusLabels = {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    rewrite: "Rewrite"
  };

  const els = {
    setupShell: document.getElementById("setupShell"),
    setupMessage: document.getElementById("setupMessage"),
    localModeBtn: document.getElementById("localModeBtn"),
    authShell: document.getElementById("authShell"),
    authForm: document.getElementById("authForm"),
    authEmail: document.getElementById("authEmail"),
    authPassword: document.getElementById("authPassword"),
    authMessage: document.getElementById("authMessage"),
    signUpBtn: document.getElementById("signUpBtn"),
    workspaceShell: document.getElementById("workspaceShell"),
    projectControls: document.getElementById("projectControls"),
    projectSelect: document.getElementById("projectSelect"),
    shareProjectBtn: document.getElementById("shareProjectBtn"),
    newProjectBtn: document.getElementById("newProjectBtn"),
    seedProjectBtn: document.getElementById("seedProjectBtn"),
    userControls: document.getElementById("userControls"),
    userEmail: document.getElementById("userEmail"),
    signOutBtn: document.getElementById("signOutBtn"),
    metrics: document.getElementById("metrics"),
    searchInput: document.getElementById("searchInput"),
    topicFilter: document.getElementById("topicFilter"),
    typeFilter: document.getElementById("typeFilter"),
    tierFilter: document.getElementById("tierFilter"),
    statusFilter: document.getElementById("statusFilter"),
    followFilter: document.getElementById("followFilter"),
    sectionFilter: document.getElementById("sectionFilter"),
    queueCount: document.getElementById("queueCount"),
    activeFilters: document.getElementById("activeFilters"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    issueList: document.getElementById("issueList"),
    documentTitle: document.getElementById("documentTitle"),
    documentContent: document.getElementById("documentContent"),
    selectedTitle: document.getElementById("selectedTitle"),
    saveState: document.getElementById("saveState"),
    syncNowBtn: document.getElementById("syncNowBtn"),
    issueDetail: document.getElementById("issueDetail"),
    answerForm: document.getElementById("answerForm"),
    aiPanel: document.getElementById("aiPanel"),
    clausePanel: document.getElementById("clausePanel"),
    clauseHeader: document.getElementById("clauseHeader"),
    clauseGuidance: document.getElementById("clauseGuidance"),
    clauseElections: document.getElementById("clauseElections"),
    clauseRewriteInput: document.getElementById("clauseRewriteInput"),
    clauseNotesInput: document.getElementById("clauseNotesInput"),
    clauseAcceptBtn: document.getElementById("clauseAcceptBtn"),
    clauseRejectBtn: document.getElementById("clauseRejectBtn"),
    clauseRewriteBtn: document.getElementById("clauseRewriteBtn"),
    clauseReopenBtn: document.getElementById("clauseReopenBtn"),
    clausePreview: document.getElementById("clausePreview"),
    clauseAiQuestionInput: document.getElementById("clauseAiQuestionInput"),
    clauseAskAiBtn: document.getElementById("clauseAskAiBtn"),
    clauseAskClaudeBtn: document.getElementById("clauseAskClaudeBtn"),
    clauseSaveAiBtn: document.getElementById("clauseSaveAiBtn"),
    clauseAiResponse: document.getElementById("clauseAiResponse"),
    statusInput: document.getElementById("statusInput"),
    ownerInput: document.getElementById("ownerInput"),
    answerInput: document.getElementById("answerInput"),
    changeInput: document.getElementById("changeInput"),
    followInput: document.getElementById("followInput"),
    followNotesInput: document.getElementById("followNotesInput"),
    markResolvedBtn: document.getElementById("markResolvedBtn"),
    resetLocalBtn: document.getElementById("resetLocalBtn"),
    aiQuestionInput: document.getElementById("aiQuestionInput"),
    askAiBtn: document.getElementById("askAiBtn"),
    askClaudeBtn: document.getElementById("askClaudeBtn"),
    saveAiFollowUpBtn: document.getElementById("saveAiFollowUpBtn"),
    aiResponse: document.getElementById("aiResponse"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    addIssueBtn: document.getElementById("addIssueBtn"),
    activityTrail: document.getElementById("activityTrail"),
    newIssueDialog: document.getElementById("newIssueDialog"),
    newIssueForm: document.getElementById("newIssueForm"),
    newIssueTitle: document.getElementById("newIssueTitle"),
    newIssueType: document.getElementById("newIssueType"),
    newIssueSectionLabel: document.getElementById("newIssueSectionLabel"),
    newIssueSection: document.getElementById("newIssueSection"),
    newIssuePrompt: document.getElementById("newIssuePrompt"),
    newProjectDialog: document.getElementById("newProjectDialog"),
    newProjectForm: document.getElementById("newProjectForm"),
    newProjectName: document.getElementById("newProjectName"),
    newProjectDescription: document.getElementById("newProjectDescription"),
    newProjectUseSeed: document.getElementById("newProjectUseSeed"),
    createProjectBtn: document.getElementById("createProjectBtn"),
    shareProjectDialog: document.getElementById("shareProjectDialog"),
    shareProjectForm: document.getElementById("shareProjectForm"),
    shareProjectTitle: document.getElementById("shareProjectTitle"),
    projectMembersList: document.getElementById("projectMembersList"),
    shareEmailInput: document.getElementById("shareEmailInput"),
    shareRoleInput: document.getElementById("shareRoleInput"),
    shareMessage: document.getElementById("shareMessage"),
    inviteMemberBtn: document.getElementById("inviteMemberBtn")
  };

  const app = {
    mode: db ? "remote" : "setup",
    online: typeof navigator !== "undefined" ? navigator.onLine !== false : true,
    session: null,
    user: null,
    profile: null,
    projects: [],
    currentProject: null,
    documents: [],
    sections: [],
    issues: [],
    issueLinks: [],
    issueStates: new Map(),
    clauseStates: new Map(),
    issueEvents: [],
    projectMembers: [],
    profiles: new Map(),
    localWorkspace: loadLocalWorkspace()
  };

  let saveTimer = null;

  const state = {
    selectedId: app.localWorkspace.lastSelectedId || "",
    selectedSectionId: "",
    docTab: "relevant",
    query: "",
    topicFilter: "all",
    typeFilter: "all",
    tierFilter: "all",
    statusFilter: "all",
    followFilter: "all",
    sectionFilter: "all",
    rightPane: "issue",
    selectedClauseId: "",
    aiIssueId: "",
    aiClauseId: ""
  };

  function loadLocalWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        answers: parsed.answers || {},
        clauseStates: parsed.clauseStates || {},
        customIssues: Array.isArray(parsed.customIssues) ? parsed.customIssues : [],
        lastSelectedId: parsed.lastSelectedId || "",
        lastProjectId: parsed.lastProjectId || ""
      };
    } catch (error) {
      console.warn("Could not load local workspace", error);
      return { answers: {}, clauseStates: {}, customIssues: [], lastSelectedId: "", lastProjectId: "" };
    }
  }

  function persistLocalWorkspace() {
    const payload = {
      ...app.localWorkspace,
      lastSelectedId: state.selectedId,
      lastProjectId: app.currentProject ? app.currentProject.id : "",
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  // ---------------------------------------------------------------------------
  // Offline outbox: a durable queue of unsynced remote writes. In remote mode
  // every edit is applied optimistically to the in-memory Maps, coalesced per
  // (project|kind|key) for last-write-wins, persisted to localStorage, and
  // flushed to Supabase on reconnect. This keeps work safe when the network
  // drops mid-session. (Cold-start offline is out of scope by design.)
  // ---------------------------------------------------------------------------
  let flushTimer = null;
  let retryTimer = null;
  let flushing = false;

  function loadOutbox() {
    try {
      const parsed = JSON.parse(localStorage.getItem(outboxKey) || "{}");
      return { version: 1, ops: parsed.ops && typeof parsed.ops === "object" ? parsed.ops : {} };
    } catch (error) {
      console.warn("Could not load outbox", error);
      return { version: 1, ops: {} };
    }
  }

  const outbox = loadOutbox();

  function persistOutbox() {
    try {
      localStorage.setItem(outboxKey, JSON.stringify(outbox));
    } catch (error) {
      console.warn("Could not persist outbox", error);
    }
  }

  function outboxCount() {
    return Object.keys(outbox.ops).length;
  }

  function opKey(projectId, kind, key) {
    return `${projectId}|${kind}|${key}`;
  }

  // Coalesce by (project|kind|key): the newest payload for a given row wins,
  // which is exactly the last-write-wins semantics we want and keeps the queue
  // bounded no matter how many keystrokes happened while offline.
  function enqueueMutation(kind, key, projectId, payload) {
    if (!projectId || !key) return;
    outbox.ops[opKey(projectId, kind, key)] = {
      kind,
      key,
      projectId,
      payload,
      updatedAt: new Date().toISOString()
    };
    persistOutbox();
  }

  // Distinguish "we lost the network" (keep the change queued and retry) from a
  // genuine server/DB rejection (surface it; don't loop forever).
  function isNetworkError(error) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    if (!error) return false;
    if (error instanceof TypeError) return true; // fetch() network failure
    if (error.name === "TypeError" || error.name === "AbortError") return true;
    const status = error.status ?? error.code ?? error.statusCode;
    if (status === undefined || status === null || status === "") {
      const message = String(error.message || "").toLowerCase();
      return (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network request failed") ||
        message.includes("load failed") ||
        message.includes("fetch failed")
      );
    }
    return false;
  }

  function isOnline() {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  }

  // Guard for actions that cannot be safely queued offline (creating rows with
  // server-generated IDs, project/member administration, switching projects).
  function requireOnline(message) {
    if (isOnline()) return true;
    setConnectivity(false);
    throw new Error(message || "You're offline. Reconnect to do that.");
  }

  function setConnectivity(online) {
    if (app.online === online) {
      renderSyncStatus();
      return;
    }
    app.online = online;
    renderSyncStatus();
    if (online) scheduleFlush(0);
  }

  function scheduleFlush(delay = 650) {
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      flushOutbox();
    }, delay);
  }

  function scheduleRetry() {
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      flushOutbox();
    }, 15000);
  }

  async function flushOne(op) {
    if (op.kind === "issue_state") {
      const { data, error } = await db
        .from("issue_states")
        .upsert(op.payload, { onConflict: "issue_id" })
        .select()
        .single();
      if (error) throw error;
      app.issueStates.set(op.key, normalizeState(data));
      return;
    }
    if (op.kind === "clause_state") {
      const { data, error } = await db
        .from("clause_states")
        .upsert(op.payload, { onConflict: "section_id" })
        .select()
        .single();
      if (error) throw error;
      app.clauseStates.set(op.key, normalizeClauseState(data));
      return;
    }
    // Unknown op kind: drop it rather than blocking the queue forever.
  }

  async function flushOutbox() {
    if (!db || !app.user || flushing) return;
    if (!outboxCount()) {
      renderSyncStatus();
      return;
    }
    if (!isOnline()) {
      setConnectivity(false);
      return;
    }
    flushing = true;
    renderSyncStatus();
    let hitNetworkError = false;
    let syncedSelected = false;
    for (const [key, op] of Object.entries(outbox.ops)) {
      try {
        await flushOne(op);
        delete outbox.ops[key];
        persistOutbox();
        if (op.kind === "issue_state" && op.key === state.selectedId) syncedSelected = true;
      } catch (error) {
        if (isNetworkError(error)) {
          hitNetworkError = true;
          break;
        }
        console.error("Dropping outbox op after a server error", op, error);
        delete outbox.ops[key];
        persistOutbox();
      }
    }
    flushing = false;
    if (hitNetworkError) {
      app.online = false;
      scheduleRetry();
    } else {
      app.online = isOnline();
    }
    renderSyncStatus();
    if (syncedSelected && app.online && app.mode === "remote" && state.rightPane === "issue") {
      try {
        await loadIssueEvents(state.selectedId);
        renderSelectedIssue();
        renderIssueList();
      } catch (_error) {
        /* non-fatal */
      }
    }
  }

  // Single source of truth for the save/sync badge. In remote mode it reflects
  // connectivity and how many edits are still waiting to reach Supabase.
  function defaultSaveState() {
    if (app.mode !== "remote") return { label: "Saved", cls: "saved" };
    const pending = outboxCount();
    if (!app.online) return { label: pending ? `Offline - ${pending} queued` : "Offline", cls: "offline" };
    if (flushing) return { label: "Syncing…", cls: "dirty" };
    if (pending) return { label: pending === 1 ? "Saving…" : `Saving ${pending}…`, cls: "dirty" };
    return { label: "Synced", cls: "saved" };
  }

  function renderSyncStatus() {
    window.clearTimeout(saveTimer);
    const { label, cls } = defaultSaveState();
    if (els.saveState) {
      els.saveState.textContent = label;
      els.saveState.className = `save-state ${cls}`;
    }
    if (els.syncNowBtn) {
      els.syncNowBtn.hidden = !(app.mode === "remote" && outboxCount() > 0);
    }
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

  function slugify(value) {
    return String(value || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "project";
  }

  function seedSectionByKey(sectionKey) {
    return (seed.termSheet.sections || []).find((section) => section.id === sectionKey);
  }

  function summaryForSectionKey(sectionKey) {
    return seedSectionByKey(sectionKey)?.summary || "";
  }

  function summaryForDocumentType(documentType) {
    if (documentType === "term_sheet") return seed.termSheet.summary || "";
    if (documentType === "memo") return seed.openItemsMemo?.summary || "";
    return "";
  }

  function setVisible(el, visible) {
    if (el) el.hidden = !visible;
  }

  function setMode(mode) {
    app.mode = mode;
    setVisible(els.setupShell, mode === "setup");
    setVisible(els.authShell, mode === "auth");
    setVisible(els.workspaceShell, mode === "local" || mode === "remote");
    setVisible(els.projectControls, mode === "remote");
    setVisible(els.userControls, mode === "remote");
    els.resetLocalBtn.hidden = mode === "remote";
  }

  function showSaveState(label, className) {
    window.clearTimeout(saveTimer);
    els.saveState.textContent = label;
    els.saveState.className = `save-state ${className || ""}`;
    saveTimer = window.setTimeout(() => {
      renderSyncStatus();
    }, 900);
  }

  function showAuthMessage(message, type) {
    els.authMessage.textContent = message || "";
    els.authMessage.className = `auth-message ${type || ""}`;
  }

  function assertRemote() {
    if (!db || !app.user) {
      throw new Error("Supabase is not configured or the user is not signed in.");
    }
  }

  function normalizeSection(row) {
    return {
      id: row.id,
      stableKey: row.stable_key,
      documentId: row.document_id,
      projectId: row.project_id,
      row: row.section_order,
      title: row.title,
      body: row.body || "",
      group: row.group_title || "",
      isGroup: Boolean(row.is_group),
      sectionKind: row.section_kind,
      sourceRef: row.source_ref || {},
      summary: row.source_ref?.summary || summaryForSectionKey(row.stable_key),
      guidance: seedSectionByKey(row.stable_key)?.guidance || []
    };
  }

  function normalizeDocument(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      documentType: row.document_type,
      sourceLabel: row.source_label,
      sourceUrl: row.source_url,
      originalFilename: row.original_filename,
      storagePath: row.storage_path,
      extractedMetadata: row.extracted_metadata || {},
      summary: row.extracted_metadata?.summary || summaryForDocumentType(row.document_type)
    };
  }

  function normalizeIssue(row) {
    return {
      id: row.id,
      stableKey: row.stable_key,
      projectId: row.project_id,
      issueType: row.issue_type,
      status: row.initial_status || "open",
      priority: row.priority || "medium",
      category: row.category || "",
      title: row.title,
      prompt: row.prompt || row.title,
      details: row.details || "",
      provisionalAnswer: row.provisional_answer || "",
      source: row.source_label || "",
      termSectionIds: [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      sortOrder: row.sort_order || 0,
      createdBy: row.created_by
    };
  }

  function normalizeClauseState(row) {
    return {
      sectionId: row.section_id,
      projectId: row.project_id,
      status: row.status || "pending",
      elections: row.elections || {},
      rewriteText: row.rewrite_text || "",
      notes: row.notes || "",
      updatedBy: row.updated_by || "",
      updatedAt: row.updated_at || ""
    };
  }

  function normalizeState(row) {
    return {
      issueId: row.issue_id,
      projectId: row.project_id,
      status: row.status || "open",
      ownerUserId: row.owner_user_id || "",
      owner: row.owner_note || "",
      answer: row.answer || "",
      proposedChange: row.proposed_change || "",
      followUp: Boolean(row.follow_up),
      followUpNotes: row.follow_up_notes || "",
      resolvedAt: row.resolved_at || "",
      updatedBy: row.updated_by || "",
      updatedAt: row.updated_at || "",
      createdAt: row.created_at || ""
    };
  }

  function profileLabel(userId) {
    if (!userId) return "Unknown";
    const profile = app.profiles.get(userId);
    return profile?.display_name || profile?.email || userId.slice(0, 8);
  }

  function currentProjectMembership() {
    if (!app.user || !app.currentProject) return null;
    return app.projectMembers.find((member) => member.user_id === app.user.id) || null;
  }

  function canManageCurrentProject() {
    return currentProjectMembership()?.role === "owner";
  }

  function sectionMap() {
    return new Map(app.sections.map((section) => [section.id, section]));
  }

  function primaryTermDocument() {
    return app.documents.find((doc) => doc.documentType === "term_sheet") || app.documents[0];
  }

  function memoDocument() {
    return app.documents.find((doc) => doc.documentType === "memo");
  }

  function termSections() {
    const termDoc = primaryTermDocument();
    if (!termDoc) return [];
    return app.sections.filter((section) => section.documentId === termDoc.id);
  }

  function allIssues() {
    return app.issues;
  }

  function answerFor(issueId) {
    if (app.mode === "remote") {
      return app.issueStates.get(issueId) || {};
    }
    return app.localWorkspace.answers[issueId] || {};
  }

  function issueView(issue) {
    if (!issue) return null;
    const answer = answerFor(issue.id);
    return {
      ...issue,
      ...answer,
      status: answer.status || issue.status || "open",
      followUp: Boolean(answer.followUp),
      answer: answer.answer || "",
      proposedChange: answer.proposedChange || "",
      followUpNotes: answer.followUpNotes || "",
      owner: answer.owner || "",
      updatedBy: answer.updatedBy || "",
      updatedAt: answer.updatedAt || ""
    };
  }

  function currentIssue() {
    const found = allIssues().find((issue) => issue.id === state.selectedId);
    return found ? issueView(found) : issueView(allIssues()[0]) || null;
  }

  function sectionTitle(sectionId) {
    const found = sectionMap().get(sectionId);
    return found ? found.title : "Unlinked";
  }

  function linkedSections(issue) {
    const map = sectionMap();
    return (issue.termSectionIds || []).map((id) => map.get(id)).filter(Boolean);
  }

  function isClauseScopedIssue(issue) {
    return issue && issue.issueType !== "decision" && issue.issueType !== "supporting-document";
  }

  function issueMentionsSection(issue, sectionId) {
    return isClauseScopedIssue(issue) && (issue.termSectionIds || []).includes(sectionId);
  }

  function isClauseScopedIssueType(issueType) {
    return issueType !== "decision" && issueType !== "supporting-document";
  }

  function syncNewIssueSectionControl() {
    const shouldShowSection = isClauseScopedIssueType(els.newIssueType.value);
    els.newIssueSectionLabel.hidden = !shouldShowSection;
    els.newIssueSection.disabled = !shouldShowSection;
  }

  function compactText(parts) {
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function issueTopic(issue) {
    return issue.category || "Custom items";
  }

  function issueTier(issue) {
    return (issue.tags || []).find((tag) => tierLabels[tag]) || "";
  }

  function topicOrder() {
    const order = [];
    allIssues()
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .forEach((issue) => {
        const topic = issueTopic(issue);
        if (!order.includes(topic)) order.push(topic);
      });
    return order;
  }

  function isFollowUp(issue) {
    return issue.followUp || issue.status === "follow-up";
  }

  function filteredIssues() {
    const sourceIssues = allIssues();
    const orderMap = new Map(sourceIssues.map((issue, index) => [issue.id, index]));
    const topics = topicOrder();
    const query = state.query.trim().toLowerCase();
    return sourceIssues
      .map(issueView)
      .filter((issue) => {
        if (state.topicFilter !== "all" && issueTopic(issue) !== state.topicFilter) return false;
        if (state.typeFilter !== "all" && issue.issueType !== state.typeFilter) return false;
        if (state.tierFilter !== "all" && issueTier(issue) !== state.tierFilter) return false;
        if (state.statusFilter === "not-resolved") {
          if (issue.status === "resolved") return false;
        } else if (state.statusFilter !== "all" && issue.status !== state.statusFilter) {
          return false;
        }
        if (state.followFilter === "flagged" && !isFollowUp(issue)) return false;
        if (state.followFilter === "not-flagged" && isFollowUp(issue)) return false;
        if (state.sectionFilter !== "all" && !issueMentionsSection(issue, state.sectionFilter)) return false;
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
        const topicDelta = topics.indexOf(issueTopic(a)) - topics.indexOf(issueTopic(b));
        if (topicDelta !== 0) return topicDelta;
        const priorityDelta = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        if (priorityDelta !== 0) return priorityDelta;
        return (a.sortOrder ?? orderMap.get(a.id) ?? 0) - (b.sortOrder ?? orderMap.get(b.id) ?? 0);
      });
  }

  function loadLocalSeed() {
    const termDoc = {
      id: "local-term-sheet",
      title: seed.termSheet.title,
      documentType: "term_sheet",
      extractedMetadata: { summary: seed.termSheet.summary },
      summary: seed.termSheet.summary
    };
    const memoDoc = {
      id: "local-open-items",
      title: "Blind Pool Fund Open Items",
      documentType: "memo",
      extractedMetadata: { memo: seed.openItemsMemo, summary: seed.openItemsMemo.summary },
      summary: seed.openItemsMemo.summary
    };

    app.currentProject = { id: "local-seed", name: seed.meta.project, description: "Local fallback" };
    app.projects = [app.currentProject];
    app.documents = [termDoc, memoDoc];
    app.sections = seed.termSheet.sections.map((section) => ({
      id: section.id,
      stableKey: section.id,
      documentId: termDoc.id,
      projectId: app.currentProject.id,
      row: section.row,
      title: section.title,
      body: section.body,
      group: section.group,
      isGroup: section.isGroup,
      summary: section.summary || "",
      guidance: section.guidance || [],
      sectionKind: section.isGroup ? "group" : "section",
      sourceRef: { row: section.row, summary: section.summary || "" }
    }));
    app.issues = [...seed.issues, ...app.localWorkspace.customIssues].map((issue, index) => ({
      ...issue,
      stableKey: issue.id,
      sortOrder: index
    }));
    app.issueLinks = [];
    app.issueStates = new Map();
    app.issueEvents = [];
    app.projectMembers = [];
    app.profiles = new Map();
    if (!state.selectedId || !app.issues.some((issue) => issue.id === state.selectedId)) {
      state.selectedId = app.issues[0]?.id || "";
    }
    const selected = currentIssue();
    state.selectedSectionId = selected?.termSectionIds?.[0] || "";
  }

  async function loadRemoteSession() {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    app.session = data.session;
    app.user = data.session?.user || null;
    if (!app.user) {
      setMode("auth");
      return;
    }
    els.userEmail.textContent = app.user.email || "";
    setMode("remote");
    await ensureProfile();
    await loadProjects();
  }

  async function ensureProfile() {
    assertRemote();
    const displayName = app.user.email ? app.user.email.split("@")[0] : "User";
    await db.from("profiles").upsert(
      {
        id: app.user.id,
        email: app.user.email || "",
        display_name: app.user.user_metadata?.display_name || displayName
      },
      { onConflict: "id" }
    );
  }

  async function loadProfiles() {
    if (app.mode !== "remote") return;
    const { data, error } = await db.from("profiles").select("id,email,display_name");
    if (error) throw error;
    app.profiles = new Map((data || []).map((profile) => [profile.id, profile]));
  }

  async function loadProjects() {
    assertRemote();
    const { data, error } = await db.from("projects").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    app.projects = data || [];
    renderProjectControls();

    if (!app.projects.length) {
      clearProjectData();
      await loadProfiles();
      renderProjectControls();
      renderAll();
      return;
    }

    const wantedId =
      app.localWorkspace.lastProjectId && app.projects.some((project) => project.id === app.localWorkspace.lastProjectId)
        ? app.localWorkspace.lastProjectId
        : app.projects[0].id;
    await loadProject(wantedId);
  }

  function clearProjectData() {
    app.currentProject = null;
    app.documents = [];
    app.sections = [];
    app.issues = [];
    app.issueLinks = [];
    app.issueStates = new Map();
    app.clauseStates = new Map();
    app.issueEvents = [];
    app.projectMembers = [];
    state.selectedId = "";
    state.selectedSectionId = "";
    state.selectedClauseId = "";
    state.rightPane = "issue";
  }

  async function loadProject(projectId) {
    assertRemote();
    showSaveState("Loading", "dirty");
    app.currentProject = app.projects.find((project) => project.id === projectId) || null;
    app.localWorkspace.lastProjectId = projectId;

    const [documentsResult, sectionsResult, issuesResult, linksResult, statesResult, clauseStatesResult] = await Promise.all([
      db.from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
      db.from("document_sections").select("*").eq("project_id", projectId).order("section_order", { ascending: true }),
      db.from("issues").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      db.from("issue_sections").select("*").eq("project_id", projectId).order("position", { ascending: true }),
      db.from("issue_states").select("*").eq("project_id", projectId),
      db.from("clause_states").select("*").eq("project_id", projectId)
    ]);

    for (const result of [documentsResult, sectionsResult, issuesResult, linksResult, statesResult, clauseStatesResult]) {
      if (result.error) throw result.error;
    }

    app.documents = (documentsResult.data || []).map(normalizeDocument);
    app.sections = (sectionsResult.data || []).map(normalizeSection);
    app.issueLinks = linksResult.data || [];
    app.issueStates = new Map((statesResult.data || []).map((row) => [row.issue_id, normalizeState(row)]));
    app.clauseStates = new Map((clauseStatesResult.data || []).map((row) => [row.section_id, normalizeClauseState(row)]));

    const linksByIssue = new Map();
    app.issueLinks.forEach((link) => {
      const list = linksByIssue.get(link.issue_id) || [];
      list.push(link.section_id);
      linksByIssue.set(link.issue_id, list);
    });

    app.issues = (issuesResult.data || []).map((row) => ({
      ...normalizeIssue(row),
      termSectionIds: linksByIssue.get(row.id) || []
    }));

    if (!state.selectedId || !app.issues.some((issue) => issue.id === state.selectedId)) {
      state.selectedId = app.issues[0]?.id || "";
    }
    const selected = currentIssue();
    state.selectedSectionId = selected?.termSectionIds?.[0] || "";
    await loadProfiles();
    await loadProjectMembers(projectId);
    await loadIssueEvents(state.selectedId);
    renderFilters();
    renderAll();
    persistLocalWorkspace();
    showSaveState("Synced", "saved");
  }

  async function loadIssueEvents(issueId) {
    app.issueEvents = [];
    if (app.mode !== "remote" || !issueId) return;
    const { data, error } = await db
      .from("issue_events")
      .select("id,issue_id,actor_id,event_type,changes,created_at")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    app.issueEvents = data || [];
  }

  async function loadProjectMembers(projectId) {
    app.projectMembers = [];
    if (app.mode !== "remote" || !projectId) return;
    const { data, error } = await db
      .from("project_members")
      .select("project_id,user_id,role,added_by,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    app.projectMembers = data || [];
  }

  async function signIn(email, password) {
    showAuthMessage("Signing in...", "");
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthMessage(error.message, "error");
      return;
    }
    app.session = data.session;
    app.user = data.user;
    showAuthMessage("", "");
    await loadRemoteSession();
  }

  async function signUp(email, password) {
    showAuthMessage("Creating account...", "");
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { display_name: email.split("@")[0] } }
    });
    if (error) {
      showAuthMessage(error.message, "error");
      return;
    }
    if (data.session) {
      app.session = data.session;
      app.user = data.user;
      await loadRemoteSession();
      return;
    }
    showAuthMessage("Account created. Check email confirmation settings if sign-in is not immediate.", "success");
  }

  async function signOut() {
    await db.auth.signOut();
    app.session = null;
    app.user = null;
    clearProjectData();
    setMode("auth");
  }

  function renderProjectControls() {
    if (app.mode !== "remote") return;
    els.projectSelect.innerHTML = app.projects.length
      ? app.projects
          .map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`)
          .join("")
      : "<option value=\"\">No projects</option>";
    els.projectSelect.value = app.currentProject?.id || app.localWorkspace.lastProjectId || app.projects[0]?.id || "";
    els.projectSelect.disabled = !app.projects.length;
    els.shareProjectBtn.disabled = !app.currentProject || !canManageCurrentProject();
    els.shareProjectBtn.title = canManageCurrentProject()
      ? "Invite project members"
      : "Only project owners can invite members";
  }

  function showShareMessage(message, type) {
    els.shareMessage.textContent = message || "";
    els.shareMessage.className = `auth-message ${type || ""}`;
  }

  function renderProjectMembers() {
    if (!app.currentProject) {
      els.projectMembersList.innerHTML = "<div class=\"empty-state\">No project selected.</div>";
      return;
    }

    const canManage = canManageCurrentProject();
    const rows = app.projectMembers.map((member) => {
      const profile = app.profiles.get(member.user_id);
      const email = profile?.email || member.user_id;
      const label = profile?.display_name || email;
      const isCurrentUser = app.user && member.user_id === app.user.id;
      const roleOptions = ["owner", "editor", "viewer"]
        .map((role) => `<option value="${role}"${member.role === role ? " selected" : ""}>${role}</option>`)
        .join("");
      return `
        <div class="member-row" data-member-id="${escapeHtml(member.user_id)}">
          <div>
            <strong>${escapeHtml(label)}${isCurrentUser ? " (you)" : ""}</strong>
            <span>${escapeHtml(email)}</span>
          </div>
          <select data-member-role="${escapeHtml(member.user_id)}"${canManage && !isCurrentUser ? "" : " disabled"}>
            ${roleOptions}
          </select>
          <button class="secondary-action" data-remove-member="${escapeHtml(member.user_id)}" type="button"${canManage && !isCurrentUser ? "" : " disabled"}>Remove</button>
        </div>
      `;
    });

    els.projectMembersList.innerHTML = rows.length ? rows.join("") : "<div class=\"empty-state\">No members yet.</div>";
  }

  async function openShareDialog() {
    if (!app.currentProject) return;
    try {
      await loadProfiles();
      await loadProjectMembers(app.currentProject.id);
      els.shareProjectTitle.textContent = `Share ${app.currentProject.name}`;
      els.shareEmailInput.value = "";
      els.shareRoleInput.value = "editor";
      showShareMessage("", "");
      renderProjectMembers();
      if (els.shareProjectDialog.showModal) {
        els.shareProjectDialog.showModal();
      }
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Could not load project members.");
    }
  }

  async function inviteProjectMember() {
    assertRemote();
    requireOnline("You're offline - reconnect to invite members.");
    if (!app.currentProject) return;
    const email = els.shareEmailInput.value.trim().toLowerCase();
    const role = els.shareRoleInput.value || "editor";
    if (!email) {
      showShareMessage("Enter the user's email address.", "error");
      return;
    }
    const profile = [...app.profiles.values()].find((item) => String(item.email || "").toLowerCase() === email);
    if (!profile) {
      showShareMessage("That user needs to create or sign into an account once before they can be invited.", "error");
      return;
    }

    showShareMessage("Inviting...", "");
    const { error } = await db.from("project_members").upsert(
      {
        project_id: app.currentProject.id,
        user_id: profile.id,
        role,
        added_by: app.user.id
      },
      { onConflict: "project_id,user_id" }
    );
    if (error) throw error;
    await loadProjectMembers(app.currentProject.id);
    renderProjectControls();
    renderProjectMembers();
    els.shareEmailInput.value = "";
    showShareMessage(`${profile.email} can now access this project.`, "success");
  }

  async function updateProjectMemberRole(userId, role) {
    assertRemote();
    requireOnline("You're offline - reconnect to change member roles.");
    if (!app.currentProject || userId === app.user.id) return;
    const { error } = await db
      .from("project_members")
      .update({ role })
      .eq("project_id", app.currentProject.id)
      .eq("user_id", userId);
    if (error) throw error;
    await loadProjectMembers(app.currentProject.id);
    renderProjectControls();
    renderProjectMembers();
    showShareMessage("Member role updated.", "success");
  }

  async function removeProjectMember(userId) {
    assertRemote();
    requireOnline("You're offline - reconnect to remove members.");
    if (!app.currentProject || userId === app.user.id) return;
    const { error } = await db
      .from("project_members")
      .delete()
      .eq("project_id", app.currentProject.id)
      .eq("user_id", userId);
    if (error) throw error;
    await loadProjectMembers(app.currentProject.id);
    renderProjectControls();
    renderProjectMembers();
    showShareMessage("Member removed.", "success");
  }

  function renderFilters() {
    const issueViews = allIssues().map(issueView);
    const topics = topicOrder();
    els.topicFilter.innerHTML = [
      "<option value=\"all\">All topics</option>",
      ...topics.map((topic) => {
        const open = issueViews.filter((issue) => issueTopic(issue) === topic && issue.status !== "resolved").length;
        return `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}${open ? ` (${open})` : ""}</option>`;
      })
    ].join("");

    const types = typeOrder.filter((type) => allIssues().some((issue) => issue.issueType === type));
    els.typeFilter.innerHTML = [
      "<option value=\"all\">All types</option>",
      ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(typeLabels[type] || type)}</option>`)
    ].join("");

    els.tierFilter.innerHTML = [
      "<option value=\"all\">All tiers</option>",
      ...tierOrderList
        .filter((tier) => issueViews.some((issue) => issueTier(issue) === tier))
        .map((tier) => {
          const open = issueViews.filter((issue) => issueTier(issue) === tier && issue.status !== "resolved").length;
          return `<option value="${escapeHtml(tier)}">${escapeHtml(tierLabels[tier])}${open ? ` (${open})` : ""}</option>`;
        })
    ].join("");

    els.statusFilter.innerHTML = [
      "<option value=\"all\">All statuses</option>",
      "<option value=\"not-resolved\">Not resolved</option>",
      ...Object.entries(statusLabels).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    ].join("");

    const sectionOptions = termSections()
      .filter((section) => !section.isGroup)
      .map((section) => {
        const count = sectionQueueCount(section.id);
        const suffix = count ? ` (${count})` : "";
        return `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title + suffix)}</option>`;
      });
    els.sectionFilter.innerHTML = ["<option value=\"all\">All clauses</option>", ...sectionOptions].join("");
    els.newIssueSection.innerHTML = sectionOptions.join("");

    els.topicFilter.value = state.topicFilter;
    if (els.topicFilter.value !== state.topicFilter) {
      state.topicFilter = "all";
      els.topicFilter.value = "all";
    }
    els.typeFilter.value = state.typeFilter;
    els.tierFilter.value = state.tierFilter;
    if (els.tierFilter.value !== state.tierFilter) {
      state.tierFilter = "all";
      els.tierFilter.value = "all";
    }
    els.statusFilter.value = state.statusFilter;
    els.followFilter.value = state.followFilter;
    els.sectionFilter.value = state.sectionFilter;
    renderQueueSummary(filteredIssues());
  }

  function renderMetrics() {
    const issues = allIssues().map(issueView);
    const total = issues.length;
    const resolved = issues.filter((issue) => issue.status === "resolved").length;
    const flagged = issues.filter(isFollowUp).length;
    const clauseSections = clauseSectionsForMetrics();
    const clausesSettled = clauseSections.filter(clauseIsSettled).length;
    els.metrics.innerHTML = [
      metricHtml(total, "Total"),
      metricHtml(resolved, "Resolved"),
      metricHtml(flagged, "Follow-up"),
      metricHtml(`${clausesSettled}/${clauseSections.length}`, "Clauses")
    ].join("");
  }

  function metricHtml(value, label) {
    return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderIssueList() {
    const issues = filteredIssues();
    renderQueueSummary(issues);
    if (!issues.some((issue) => issue.id === state.selectedId) && issues.length) {
      state.selectedId = issues[0].id;
    }

    if (!issues.length) {
      const emptyText =
        app.mode === "remote" && !app.currentProject
          ? "Create or seed a project to begin."
          : state.sectionFilter !== "all"
            ? "No clause-specific work queue items mention this section."
            : "No matching items.";
      els.issueList.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
      return;
    }

    let lastTopic = null;
    els.issueList.innerHTML = issues
      .map((issue) => {
        const topic = issueTopic(issue);
        const header =
          topic !== lastTopic
            ? `<div class="issue-group-label">${escapeHtml(topic)}</div>`
            : "";
        lastTopic = topic;
        const active = issue.id === state.selectedId ? " active" : "";
        const follow = isFollowUp(issue) ? "<span class=\"pill status-follow-up\">Flagged</span>" : "";
        const sectionCount = isClauseScopedIssue(issue) ? (issue.termSectionIds || []).length : 0;
        const updated = issue.updatedBy ? `<span class="pill">By ${escapeHtml(profileLabel(issue.updatedBy))}</span>` : "";
        const priorityPill = issue.priority === "high" ? "<span class=\"pill priority-high\">High</span>" : "";
        const tier = issueTier(issue);
        const tierPill = tier ? `<span class="pill tier-${slugClass(tier)}">${escapeHtml(tierLabels[tier])}</span>` : "";
        const sectionPill = isClauseScopedIssue(issue)
          ? `<span class="pill">${sectionCount} clause${sectionCount === 1 ? "" : "s"}</span>`
          : "<span class=\"pill\">Broad item</span>";
        return `
          ${header}
          <button class="issue-card${active}" data-issue-id="${escapeHtml(issue.id)}" type="button">
            <h3>${escapeHtml(issue.title)}</h3>
            <div class="issue-meta">
              <span class="pill type-${slugClass(issue.issueType)}">${escapeHtml(typeLabels[issue.issueType] || issue.issueType)}</span>
              <span class="pill status-${slugClass(issue.status)}">${escapeHtml(statusLabels[issue.status] || issue.status)}</span>
              ${tierPill}
              ${priorityPill}
              ${sectionPill}
              ${follow}
              ${updated}
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderQueueSummary(filtered) {
    if (!els.queueCount || !els.activeFilters) return;
    const total = allIssues().length;
    els.queueCount.textContent = `Showing ${filtered.length} of ${total}`;

    const chips = [];
    if (state.query.trim()) chips.push(`Search: ${state.query.trim()}`);
    if (state.topicFilter !== "all") chips.push(`Topic: ${state.topicFilter}`);
    if (state.typeFilter !== "all") chips.push(`Type: ${typeLabels[state.typeFilter] || state.typeFilter}`);
    if (state.tierFilter !== "all") chips.push(`Tier: ${tierLabels[state.tierFilter] || state.tierFilter}`);
    if (state.statusFilter === "not-resolved") chips.push("Status: Not resolved");
    else if (state.statusFilter !== "all") chips.push(`Status: ${statusLabels[state.statusFilter] || state.statusFilter}`);
    if (state.followFilter === "flagged") chips.push("Follow-up: flagged");
    if (state.followFilter === "not-flagged") chips.push("Follow-up: not flagged");
    if (state.sectionFilter !== "all") chips.push(`Clause: ${sectionTitle(state.sectionFilter)}`);

    els.activeFilters.innerHTML = chips.length
      ? chips.map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`).join("")
      : "<span class=\"filter-muted\">No active filters</span>";
    if (els.clearFiltersBtn) {
      els.clearFiltersBtn.disabled = !chips.length;
    }
  }

  function clearQueueFilters() {
    state.query = "";
    state.topicFilter = "all";
    state.typeFilter = "all";
    state.tierFilter = "all";
    state.statusFilter = "all";
    state.followFilter = "all";
    state.sectionFilter = "all";
    state.selectedSectionId = "";
    els.searchInput.value = "";
    els.topicFilter.value = "all";
    els.typeFilter.value = "all";
    els.tierFilter.value = "all";
    els.statusFilter.value = "all";
    els.followFilter.value = "all";
    els.sectionFilter.value = "all";
    renderAll();
  }

  function renderSelectedIssue() {
    const issue = currentIssue();
    if (!issue) {
      els.selectedTitle.textContent = "Answer";
      els.issueDetail.innerHTML = "<div class=\"empty-state\">No issue selected.</div>";
      els.statusInput.value = "open";
      els.ownerInput.value = "";
      els.answerInput.value = "";
      els.changeInput.value = "";
      els.followInput.checked = false;
      els.followNotesInput.value = "";
      clearAiResponse();
      renderActivityTrail();
      return;
    }

    els.selectedTitle.textContent = issue.title;
    const sections = linkedSections(issue);
    const sectionChips = sections.length
      ? `<div class="section-chip-row">${sections
          .map((section) => `<button class="section-chip${section.id === state.selectedSectionId ? " active" : ""}" data-chip-section="${escapeHtml(section.id)}" type="button">${escapeHtml(section.title)}</button>`)
          .join("")}</div>`
      : "";
    const updated = issue.updatedBy
      ? `<p class="issue-updated">Last updated by ${escapeHtml(profileLabel(issue.updatedBy))}${issue.updatedAt ? ` · ${escapeHtml(new Date(issue.updatedAt).toLocaleString())}` : ""}</p>`
      : "";

    els.issueDetail.innerHTML = `
      <div class="issue-meta">
        <span class="pill type-${slugClass(issue.issueType)}">${escapeHtml(typeLabels[issue.issueType] || issue.issueType)}</span>
        <span class="pill status-${slugClass(issue.status)}">${escapeHtml(statusLabels[issue.status] || issue.status)}</span>
        ${issueTier(issue) ? `<span class="pill tier-${slugClass(issueTier(issue))}">${escapeHtml(tierLabels[issueTier(issue)])}</span>` : ""}
        ${issue.priority ? `<span class="pill${issue.priority === "high" ? " priority-high" : ""}">${escapeHtml(issue.priority)} priority</span>` : ""}
        ${issue.category ? `<span class="pill">${escapeHtml(issue.category)}</span>` : ""}
      </div>
      <div class="issue-brief">
        <div>
          <h3>Question</h3>
          <p>${nl2br(humanQuestionText(issue))}</p>
          ${whyThisMattersHtml(issue, sections)}
        </div>
        ${
          issue.provisionalAnswer
            ? `<div>
                <h3>Provisional options</h3>
                ${provisionalOptionsHtml(issue)}
              </div>`
            : ""
        }
        ${considerationsHtml(issue, sections)}
        ${issue.details && issue.issueType !== "question" ? `<div><h3>Notes</h3><p>${nl2br(cleanIssueDetails(issue.details))}</p></div>` : ""}
        ${updated}
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
    if (state.aiIssueId && state.aiIssueId !== issue.id) clearAiResponse();
    renderActivityTrail();
  }

  function humanQuestionText(issue) {
    const prompt = String(issue.prompt || issue.title || "").trim();
    return prompt
      .replace(/\?: choose between the listed approaches or draft a custom answer\.$/i, "?")
      .replace(/: choose between the listed approaches or draft a custom answer\.$/i, "?")
      .replace(/Counsel notes \/ decisions:\s*/i, "")
      .trim();
  }

  function issueSignal(issue) {
    return compactText([
      issue.title,
      issue.prompt,
      issue.details,
      issue.provisionalAnswer,
      issue.category,
      issue.source,
      ...(issue.tags || [])
    ]);
  }

  function whyThisMattersHtml(issue, sections) {
    const signal = issueSignal(issue);
    const linked = sections
      .filter((section) => !section.isGroup)
      .slice(0, 4)
      .map((section) => section.title);

    if (issue.issueType === "question" && issue.details) {
      const points = [cleanIssueDetails(issue.details)];
      if (linked.length) {
        points.push(`Linked clauses: ${linked.join(", ")}.`);
      }
      return `<div class="issue-explainer"><strong>How to decide:</strong> ${escapeHtml(points.join(" "))}</div>`;
    }

    const points = [];

    if (/carryco|carry|carried interest|clawback|waterfall/.test(signal)) {
      points.push(
        "This decision controls where carry economics live, who can receive non-voting economics, how vesting or forfeiture would work, and who ultimately bears clawback risk."
      );
    }
    if (/placement|finder|broker|capital formation|solicit/.test(signal)) {
      points.push(
        "This matters because LP placement compensation can affect securities-law compliance, fee and expense disclosure, management-fee offsets, and whether the economics should sit at the Fund, Manager, GP, or CarryCo level."
      );
    }
    if (/management fee|fee offset|organization expense|fund expense|expense/.test(signal)) {
      points.push(
        "The answer changes who economically bears the cost: investors through Fund Expenses, the Manager through its management fee economics, or the GP/CarryCo through carry economics."
      );
    }
    if (/side letter|mfn|special investor/.test(signal)) {
      points.push(
        "Special investor terms can create disclosure, MFN, consistency, and administrative issues, so the core documents should decide what flexibility is permitted before side letters are negotiated."
      );
    }
    if (/investment limitation|conflict|affiliate|related/.test(signal)) {
      points.push(
        "This issue affects conflict controls and consent rights, especially where the GP, affiliates, placement parties, or other vehicles may receive economics or transact with the Fund."
      );
    }
    if (/document|agreement|template|policy/.test(signal) && issue.issueType === "supporting-document") {
      points.push(
        "This document should carry the operational details that are too specific for the term sheet but still need to match the economics and authority granted in the Fund documents."
      );
    }
    if (!points.length) {
      points.push(
        "This item should be resolved before drafting is finalized because it affects the legal authority, economic allocation, disclosure, or operating mechanics reflected elsewhere in the Fund documents."
      );
    }
    if (linked.length) {
      points.push(`It is tied to ${linked.join(", ")}, so the answer should be consistent with those sections.`);
    }

    return `<div class="issue-explainer"><strong>Why this matters:</strong> ${escapeHtml(points.join(" "))}</div>`;
  }

  function provisionalOptionsHtml(issue) {
    const lines = String(issue.provisionalAnswer || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return "";
    const optionLines = lines.filter((line) => /^Option\s+[A-Z0-9]+:/i.test(line));
    if (optionLines.length >= 2) {
      const options = lines
        .map((line) => {
          const match = line.match(/^Option\s+([A-Z0-9]+):\s*(.*)$/i);
          if (match) {
            const optionLabel = `Option ${match[1].toUpperCase()}`;
            const optionText = match[2];
            const tradeoffs = optionTradeoffs(issue, optionText);
            return `
              <li>
                <strong>${escapeHtml(optionLabel)}:</strong> ${escapeHtml(optionText)}
                ${tradeoffs.length ? `<div class="option-tradeoffs">${tradeoffs.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>` : ""}
              </li>
            `;
          }
          return `<li>${escapeHtml(line.replace(/^Comment:\s*/i, "Note: "))}</li>`;
        })
        .join("");
      return `<ul>${options}</ul>`;
    }
    return `
      <p>${nl2br(issue.provisionalAnswer)}</p>
      <div class="issue-explainer"><strong>Drafting note:</strong> Treat this as working language, not a final answer. Counsel should decide where the authority belongs, whether disclosure is enough, and whether a separate agreement is needed.</div>
    `;
  }

  function optionTradeoffs(issue, optionText) {
    const signal = issueSignal(issue);
    const text = String(optionText || "").toLowerCase();
    if (/carryco|carry|carried interest/.test(signal)) {
      if (/no|gp llc|inside gp/.test(text)) {
        return [
          "Pros: fewer entities, simpler administration, and easier to keep control and economics in one GP operating agreement.",
          "Cons: less clean if placement parties, passive participants, vesting, forfeiture, or clawback sharing need fund-specific economics."
        ];
      }
      if (/yes|carryco|sponsorco|separate/.test(text)) {
        return [
          "Pros: cleaner for fund-specific carry splits, non-voting economics, conditional awards, vesting, forfeiture, and clawback allocation.",
          "Cons: adds an entity or agreement, extra tax/accounting administration, and more documents to keep aligned with the Fund waterfall."
        ];
      }
    }
    if (/manager llc|management fee|manager/.test(signal)) {
      if (/direct|you\/zeke|individual/.test(text)) {
        return [
          "Pros: simpler ownership and fewer entity layers.",
          "Cons: harder to isolate fund-specific economics or keep placement/sourcing participants away from broader platform management-fee economics."
        ];
      }
      if (/holdco|sponsor/.test(text)) {
        return [
          "Pros: cleaner platform ownership and easier separation of fund-specific economics from manager-level economics.",
          "Cons: adds governance and tax complexity and requires careful authority documents."
        ];
      }
    }
    if (/disclosure|placement|finder|broker/.test(signal)) {
      if (/generic/.test(text)) {
        return [
          "Pros: keeps the term sheet concise and preserves flexibility for deal-specific arrangements.",
          "Cons: may be too vague for investor expectations if placement compensation is material or unusual."
        ];
      }
      if (/term-sheet|specific|offset|categories/.test(text)) {
        return [
          "Pros: more transparent for LPs and easier to connect fee offsets, Fund Expense treatment, and carry-sharing authority.",
          "Cons: may invite negotiation over economics that would otherwise be handled in separate agreements."
        ];
      }
    }
    return [
      "Pros: may fit the stated business preference and keep drafting focused.",
      "Cons: confirm knock-on effects for disclosure, economics, authority, and related documents before finalizing."
    ];
  }

  function considerationsHtml(issue, sections) {
    const signal = issueSignal(issue);
    const items = [];
    if (/placement|finder|broker|capital formation|solicit/.test(signal)) {
      items.push("Confirm whether the compensated party must be a registered broker-dealer or whether a narrower finder/consultant path is available.");
      items.push("Decide whether compensation is paid by the Fund, Manager, GP, CarryCo, or another affiliate.");
      items.push("Decide whether any Fund-paid placement cost offsets management fees or is simply borne as an Organization Expense / Fund Expense.");
    }
    if (/carry|carryco|carried interest/.test(signal)) {
      items.push("Confirm whether carry sharing is a direct waterfall feature or an internal GP/CarryCo allocation after the Fund pays carry to the GP.");
      items.push("Allocate clawback obligations among ultimate carry recipients if anyone other than the principals receives carry economics.");
    }
    if (/fund expense|expense|organization expense|management fee|fee offset/.test(signal)) {
      items.push("Separate investor-borne Fund Expenses from Manager/GP overhead and from economics that should be paid out of management fees or carry.");
      items.push("Check whether the LPA, PPM, and term sheet all describe the same expense and offset treatment.");
    }
    if (/side letter|mfn|special investor/.test(signal)) {
      items.push("Decide whether this belongs in the main terms, a side letter, or both, and whether MFN rights should pick it up.");
    }
    const sectionSummaries = sections
      .filter((section) => section.summary && !section.isGroup)
      .slice(0, 2)
      .map((section) => `${section.title}: ${section.summary}`);
    sectionSummaries.forEach((summary) => items.push(summary));

    const unique = [...new Set(items)].slice(0, 5);
    if (!unique.length) return "";
    return `
      <div>
        <h3>Considerations</h3>
        <ul class="consideration-list">${unique.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    `;
  }

  function cleanIssueDetails(value) {
    return String(value || "").replace(/^Counsel notes \/ decisions:\s*/i, "").trim();
  }

  // ---------------------------------------------------------------------------
  // Clause elections: parse bracketed drafting options out of a clause body and
  // render selectors so blanks/options are resolved on the clause itself.
  // ---------------------------------------------------------------------------

  const clauseTokensCache = new Map();

  function splitTopLevelBrackets(body) {
    const s = String(body || "");
    const items = [];
    let depth = 0;
    let buffer = "";
    let bracketStart = 0;
    for (let idx = 0; idx < s.length; idx += 1) {
      const char = s[idx];
      if (char === "[") {
        if (depth === 0) {
          if (buffer) items.push({ kind: "text", text: buffer });
          buffer = "";
          bracketStart = idx;
        } else {
          buffer += char;
        }
        depth += 1;
      } else if (char === "]" && depth > 0) {
        depth -= 1;
        if (depth === 0) {
          // `start`/`innerStart`/`end` are offsets within this string, used to map
          // each election back to its exact span in the original clause body.
          items.push({ kind: "bracket", inner: buffer, start: bracketStart, innerStart: bracketStart + 1, end: idx + 1 });
          buffer = "";
        } else {
          buffer += char;
        }
      } else {
        buffer += char;
      }
    }
    if (buffer) {
      if (depth > 0) {
        // An unbalanced (never-closed) bracket: still record its span so the
        // election can map back to the clause text instead of losing its range.
        items.push({
          kind: "bracket",
          inner: buffer,
          text: buffer,
          start: bracketStart,
          innerStart: bracketStart + 1,
          end: s.length
        });
      } else {
        items.push({ kind: "text", text: buffer });
      }
    }
    return items;
  }

  function isBlankInner(inner) {
    return /^\s*_+\s*$/.test(inner);
  }

  function isNoteInner(inner) {
    return /^\s*NTD\b/i.test(inner) || /^\s*(the above limitations|LPAC not needed)/i.test(inner);
  }

  // Parse a clause body into a tree of segments: text, note, or election.
  // Elections NEST - a choice option or a kept optional can contain its own
  // elections, e.g. "[ ...reduced by [0.25][0.1]... ][OR][ ...reduced to [2.5][2.0]... ]".
  //   blank    - [_____] fill-in
  //   choice   - a run of adjacent [A][B] brackets (or [A][OR][B]) - pick one
  //   optional - a lone bracketed provision to keep, omit, or rewrite
  // Each election carries a stable path (built from `.`, `:` and `>`) so user
  // selections persist across renders and reloads.
  function isOrSeparator(inner) {
    return /^\s*or\s*$/i.test(inner);
  }

  function hasNestedBracket(inner) {
    return String(inner || "").includes("[");
  }

  // A readable one-line label for an option/optional, with nested brackets shown
  // as a small placeholder so the radio card stays legible.
  function plainLabel(inner) {
    return splitTopLevelBrackets(String(inner || ""))
      .map((part) => {
        if (part.kind === "text") return part.text;
        if (isNoteInner(part.inner)) return "";
        if (isOrSeparator(part.inner)) return " / ";
        return "\u25a2"; // placeholder for a nested blank/choice
      })
      .join("")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function parseClauseLevel(body, basePath, baseOffset) {
    const raw = splitTopLevelBrackets(String(body || ""));
    const segs = [];
    let ord = 0;
    const nextPath = () => (basePath ? `${basePath}.${ord++}` : String(ord++));
    const abs = (n) => (Number.isFinite(n) ? baseOffset + n : undefined);
    let i = 0;
    while (i < raw.length) {
      const item = raw[i];
      if (item.kind === "text") {
        segs.push({ kind: "text", text: item.text });
        i += 1;
        continue;
      }
      if (isNoteInner(item.inner)) {
        segs.push({ kind: "note", text: item.inner });
        i += 1;
        continue;
      }
      if (isBlankInner(item.inner)) {
        segs.push({ kind: "election", type: "blank", path: nextPath(), range: [abs(item.start), abs(item.end)] });
        i += 1;
        continue;
      }
      // Look ahead for a run of directly-adjacent option brackets (OR allowed).
      const runItems = [item];
      let hasOr = false;
      let j = i + 1;
      while (j < raw.length) {
        const next = raw[j];
        if (next.kind !== "bracket") break;
        if (isBlankInner(next.inner) || isNoteInner(next.inner)) break;
        if (isOrSeparator(next.inner)) {
          hasOr = true;
          j += 1;
          continue;
        }
        runItems.push(next);
        j += 1;
      }
      const allLeaf = runItems.every((it) => !hasNestedBracket(it.inner));
      // A pick-one choice is a run of 2+ brackets that are either OR-separated or
      // all leaves (plain values). A run that mixes in a nested-bracket option is
      // NOT a choice - each of its brackets is an independent optional instead.
      if (runItems.length > 1 && (hasOr || allLeaf)) {
        const path = nextPath();
        const options = runItems.map((it, k) => ({
          label: plainLabel(it.inner),
          nodes: parseClauseLevel(it.inner, `${path}:${k}`, abs(it.innerStart))
        }));
        const last = runItems[runItems.length - 1];
        segs.push({ kind: "election", type: "choice", path, options, range: [abs(item.start), abs(last.end)] });
        i = j;
        continue;
      }
      // Otherwise, this single bracket is a keep/omit optional whose kept text may
      // itself contain nested elections.
      const path = nextPath();
      segs.push({
        kind: "election",
        type: "optional",
        path,
        label: plainLabel(item.inner),
        nodes: parseClauseLevel(item.inner, `${path}>`, abs(item.innerStart)),
        range: [abs(item.start), abs(item.end)]
      });
      i += 1;
    }
    return segs;
  }

  function parseClauseTokens(body) {
    const cacheKey = String(body || "");
    if (clauseTokensCache.has(cacheKey)) return clauseTokensCache.get(cacheKey);
    const segs = parseClauseLevel(cacheKey, "", 0);
    clauseTokensCache.set(cacheKey, segs);
    return segs;
  }

  // Depth-first visit of every election in the tree (active or not).
  function walkElections(nodes, cb) {
    for (const seg of nodes || []) {
      if (seg.kind !== "election") continue;
      cb(seg);
      if (seg.type === "optional") walkElections(seg.nodes, cb);
      else if (seg.type === "choice") seg.options.forEach((opt) => walkElections(opt.nodes, cb));
    }
  }

  // Top-level election segments (used only to test "does this clause have any").
  function electionTokens(section) {
    return parseClauseTokens(section.body).filter((token) => token.kind === "election");
  }

  function electionByPath(section, path) {
    let found = null;
    walkElections(parseClauseTokens(section.body), (seg) => {
      if (seg.path === path) found = seg;
    });
    return found;
  }

  function clauseKeyFor(section) {
    return app.mode === "remote" ? section.id : section.stableKey || section.id;
  }

  function clauseStateFor(section) {
    if (!section) return { status: "pending", elections: {}, rewriteText: "", notes: "" };
    const stored =
      app.mode === "remote"
        ? app.clauseStates.get(section.id)
        : app.localWorkspace.clauseStates[clauseKeyFor(section)];
    return {
      status: stored?.status || "pending",
      elections: stored?.elections || {},
      rewriteText: stored?.rewriteText || "",
      notes: stored?.notes || "",
      updatedBy: stored?.updatedBy || "",
      updatedAt: stored?.updatedAt || ""
    };
  }

  // Resolve a list of segments into { text, resolved } given the elections map.
  // `text` is the drafting output (omitted elections contribute ""), `resolved`
  // is true only when every active election down the tree has a decision.
  function resolveNodes(nodes, elections) {
    let text = "";
    let resolved = true;
    for (const seg of nodes || []) {
      if (seg.kind === "text") {
        text += seg.text;
        continue;
      }
      if (seg.kind === "note") continue;
      if (seg.kind !== "election") continue;
      const r = resolveElection(seg, elections);
      text += r.text;
      if (!r.resolved) resolved = false;
    }
    return { text, resolved };
  }

  function resolveElection(seg, elections) {
    const el = (elections && elections[seg.path]) || {};
    if (el.mode === "omit") return { text: "", resolved: true };
    if (el.mode === "custom") {
      const value = String(el.value || "").trim();
      return value === "" ? { text: "", resolved: false } : { text: value, resolved: true };
    }
    if (seg.type === "blank") return { text: "", resolved: false };
    if (seg.type === "optional") {
      if (el.mode === "include") return resolveNodes(seg.nodes, elections);
      return { text: "", resolved: false };
    }
    if (seg.type === "choice") {
      if (el.mode === "option") {
        const option = seg.options[el.optionIndex];
        if (!option) return { text: "", resolved: false };
        return resolveNodes(option.nodes, elections);
      }
      return { text: "", resolved: false };
    }
    return { text: "", resolved: false };
  }

  // Whether an election's own decision is made (ignores descendants).
  function selfResolved(seg, el) {
    if (!el || !el.mode) return false;
    if (el.mode === "omit") return true;
    if (el.mode === "custom") return String(el.value || "").trim() !== "";
    if (seg.type === "blank") return false;
    if (el.mode === "include") return seg.type === "optional";
    if (el.mode === "option") return seg.type === "choice" && seg.options[el.optionIndex] != null;
    return false;
  }

  // Count active elections (top level always active; nested ones active only once
  // their parent option/optional is chosen) and how many are individually decided.
  function countElections(nodes, elections) {
    let total = 0;
    let resolved = 0;
    for (const seg of nodes || []) {
      if (seg.kind !== "election") continue;
      const el = (elections && elections[seg.path]) || {};
      total += 1;
      if (selfResolved(seg, el)) resolved += 1;
      if (seg.type === "optional" && el.mode === "include") {
        const c = countElections(seg.nodes, elections);
        total += c.total;
        resolved += c.resolved;
      } else if (seg.type === "choice" && el.mode === "option") {
        const option = seg.options[el.optionIndex];
        if (option) {
          const c = countElections(option.nodes, elections);
          total += c.total;
          resolved += c.resolved;
        }
      }
    }
    return { total, resolved };
  }

  function clauseProgress(section) {
    const nodes = parseClauseTokens(section.body);
    const clauseState = clauseStateFor(section);
    const { total, resolved } = countElections(nodes, clauseState.elections);
    return { total, resolved, status: clauseState.status };
  }

  function clauseIsSettled(section) {
    const progress = clauseProgress(section);
    if (progress.status === "rejected" || progress.status === "rewrite") return true;
    return progress.status === "accepted" && progress.resolved === progress.total;
  }

  function clauseSectionsForMetrics() {
    return termSections().filter((section) => !section.isGroup && electionTokens(section).length > 0);
  }

  function selectedClauseSection() {
    return sectionMap().get(state.selectedClauseId) || null;
  }

  function updateClauseState(section, patch) {
    if (!section) return;
    const current = clauseStateFor(section);
    const next = {
      ...current,
      ...patch,
      elections: patch.elections || current.elections,
      updatedAt: new Date().toISOString()
    };
    if (app.mode === "remote") {
      next.updatedBy = app.user?.id || "";
      app.clauseStates.set(section.id, { ...next, sectionId: section.id, projectId: app.currentProject.id });
      enqueueMutation("clause_state", section.id, app.currentProject.id, {
        section_id: section.id,
        project_id: app.currentProject.id,
        status: next.status || "pending",
        elections: next.elections || {},
        rewrite_text: next.rewriteText || null,
        notes: next.notes || null,
        updated_by: app.user.id
      });
      scheduleFlush();
      renderSyncStatus();
    } else {
      app.localWorkspace.clauseStates[clauseKeyFor(section)] = next;
      persistLocalWorkspace();
      showSaveState("Saved", "saved");
    }
  }

  function setClauseElection(section, path, election) {
    const current = clauseStateFor(section);
    const elections = { ...current.elections, [path]: election };
    if (!election || !election.mode) delete elections[path];
    updateClauseState(section, { elections });
  }

  function shortenLabel(text, max = 42) {
    const s = String(text || "").trim();
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  }

  // The verbatim sentence from the clause body around an election, with the exact
  // bracketed text highlighted, so the drafter can read what they are deciding.
  function electionSentenceHtml(section, seg) {
    const body = String(section.body || "");
    const range = seg.range || [];
    let start = range[0];
    let end = range[1];
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
    start = Math.max(0, Math.min(start, body.length));
    end = Math.max(start, Math.min(end, body.length));

    const WINDOW = 260;
    let before = body.slice(Math.max(0, start - WINDOW), start);
    let after = body.slice(end, Math.min(body.length, end + WINDOW));

    // Trim leading context back to the start of the current sentence. A boundary is
    // sentence-ending punctuation (. or ;) plus an optional closing quote/paren and
    // whitespace - NOT a bare closing quote (e.g. after a defined term).
    let sliceFrom = 0;
    const boundaryRe = /[.;][”’")\]]?\s+/g;
    let match;
    while ((match = boundaryRe.exec(before)) !== null) {
      sliceFrom = match.index + match[0].length;
    }
    if (sliceFrom > 0) {
      before = before.slice(sliceFrom);
    } else if (start - WINDOW > 0) {
      before = `…${before.replace(/^\S*\s/, "")}`;
    }

    // Trim trailing context forward to the end of the current sentence.
    const forward = after.search(/[.;][”’")\]]?(\s|$)/);
    if (forward >= 0) {
      after = after.slice(0, forward + 1);
    } else if (end + WINDOW < body.length) {
      after = `${after.replace(/\s\S*$/, "")}…`;
    }

    const target = body.slice(start, end);
    return `
      <p class="election-context">
        ${escapeHtml(before)}<mark class="election-context-target">${escapeHtml(target)}</mark>${escapeHtml(after)}
      </p>
    `;
  }

  // Recursively render the interactive controls for a list of segments. Nested
  // elections appear indented under the option/optional that activates them.
  function renderElectionControls(section, nodes, elections, ctx) {
    return (nodes || [])
      .filter((seg) => seg.kind === "election")
      .map((seg) => electionControlHtml(section, seg, elections, ctx))
      .join("");
  }

  function electionControlHtml(section, seg, elections, ctx) {
    const el = elections[seg.path] || {};
    const resolved = selfResolved(seg, el);
    ctx.n += 1;
    const num = ctx.n;
    const safePath = escapeHtml(seg.path);
    const radioName = `el-${section.id}-${seg.path}`.replace(/[^a-z0-9_-]/gi, "_");

    let body = "";
    let kindLabel = "";
    let nestedHtml = "";

    if (seg.type === "blank") {
      kindLabel = "Fill in the blank";
      body = `<input type="text" class="election-text" data-election-input="${safePath}" value="${escapeHtml(el.value || "")}" placeholder="Type the value to fill this blank" />`;
    } else if (seg.type === "choice") {
      kindLabel = `Choose one of ${seg.options.length}`;
      const optionRows = seg.options
        .map((option, optionIndex) => {
          const selected = el.mode === "option" && Number(el.optionIndex) === optionIndex;
          const label = option.label || "(blank)";
          let inner = "";
          if (selected && option.nodes.some((n) => n.kind === "election")) {
            inner = `<div class="election-nested-group">${renderElectionControls(section, option.nodes, elections, ctx)}</div>`;
          }
          return `
            <label class="election-option${selected ? " selected" : ""}">
              <input type="radio" name="${radioName}" data-election-path="${safePath}" value="option:${optionIndex}"${selected ? " checked" : ""} />
              <span class="election-option-text">${escapeHtml(label)}</span>
            </label>
            ${inner}
          `;
        })
        .join("");
      const omitSelected = el.mode === "omit";
      const customSelected = el.mode === "custom";
      body = `<div class="election-options">
        ${optionRows}
        ${altRow(radioName, safePath, "omit", "None of these (omit)", omitSelected)}
        ${altRow(radioName, safePath, "custom", "Write in custom language…", customSelected)}
        ${customSelected ? `<input type="text" class="election-text" data-election-custom="${safePath}" value="${escapeHtml(el.value || "")}" placeholder="Custom language" />` : ""}
      </div>`;
    } else {
      // optional
      kindLabel = "Keep, omit, or rewrite";
      const includeSelected = el.mode === "include";
      const omitSelected = el.mode === "omit";
      const customSelected = el.mode === "custom";
      if (includeSelected && seg.nodes.some((n) => n.kind === "election")) {
        nestedHtml = `<div class="election-nested-group">${renderElectionControls(section, seg.nodes, elections, ctx)}</div>`;
      }
      body = `<div class="election-options">
        <label class="election-option${includeSelected ? " selected" : ""}">
          <input type="radio" name="${radioName}" data-election-path="${safePath}" value="include"${includeSelected ? " checked" : ""} />
          <span class="election-option-text">Keep: ${escapeHtml(seg.label || "this language")}</span>
        </label>
        ${nestedHtml}
        ${altRow(radioName, safePath, "omit", "Leave this text out", omitSelected)}
        ${altRow(radioName, safePath, "custom", "Write in custom language…", customSelected)}
        ${customSelected ? `<input type="text" class="election-text" data-election-custom="${safePath}" value="${escapeHtml(el.value || "")}" placeholder="Custom language" />` : ""}
      </div>`;
    }

    return `
      <div class="election-row${resolved ? " resolved" : ""}" data-election-row="${safePath}">
        <div class="election-head">
          <span class="election-num">${num}</span>
          <span class="election-kind">${escapeHtml(kindLabel)}</span>
          <span class="election-flag">${resolved ? "Resolved" : "Needs a choice"}</span>
        </div>
        ${electionSentenceHtml(section, seg)}
        ${body}
      </div>
    `;
  }

  function altRow(radioName, path, value, label, selected) {
    return `
      <label class="election-option election-option-alt${selected ? " selected" : ""}">
        <input type="radio" name="${radioName}" data-election-path="${path}" value="${value}"${selected ? " checked" : ""} />
        <span class="election-option-text">${escapeHtml(label)}</span>
      </label>
    `;
  }

  // Live preview of the clause with current elections applied; unresolved spots
  // become inline markers and partially-filled options show what's still open.
  function previewNodes(nodes, elections) {
    return (nodes || [])
      .map((seg) => {
        if (seg.kind === "text") return escapeHtml(seg.text);
        if (seg.kind === "note") return `<span class="clause-note">[${escapeHtml(seg.text)}]</span>`;
        if (seg.kind !== "election") return "";
        return previewElection(seg, elections);
      })
      .join("");
  }

  function previewElection(seg, elections) {
    const el = elections[seg.path] || {};
    if (el.mode === "omit") return "";
    if (el.mode === "custom") {
      const v = String(el.value || "").trim();
      return v ? `<span class="election-filled">${escapeHtml(v)}</span>` : `<mark class="election-open">write-in…</mark>`;
    }
    if (seg.type === "blank") {
      return `<mark class="election-open">▢</mark>`;
    }
    if (seg.type === "optional") {
      if (el.mode === "include") return `<span class="election-filled">${previewNodes(seg.nodes, elections)}</span>`;
      return `<mark class="election-open">${escapeHtml(shortenLabel(seg.label || "optional", 24))}?</mark>`;
    }
    if (seg.type === "choice") {
      if (el.mode === "option") {
        const option = seg.options[el.optionIndex];
        if (option) return `<span class="election-filled">${previewNodes(option.nodes, elections)}</span>`;
      }
      return `<mark class="election-open">choose: ${escapeHtml(seg.options.map((o) => shortenLabel(o.label, 18)).join(" / "))}</mark>`;
    }
    return "";
  }

  function clausePreviewHtml(section, clauseState) {
    return previewNodes(parseClauseTokens(section.body), clauseState.elections);
  }

  // Plain resolved text for a settled clause: elections applied, drafting notes
  // dropped, whitespace tidied. Used to fill the document pane once complete.
  function clauseFinalText(section, clauseState) {
    const { text } = resolveNodes(parseClauseTokens(section.body), clauseState.elections);
    return text
      .replace(/\s+([,.;:)])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // ---------------------------------------------------------------------------
  // Clause AI: reuses the /api/ask-section endpoint by mapping the clause into
  // the issue+sections shape the endpoint already understands.
  // ---------------------------------------------------------------------------

  function electionSummaryForAi(section, clauseState) {
    const elections = clauseState.elections || {};
    const lines = [];
    let n = 0;
    const visit = (nodes, depth) => {
      for (const seg of nodes || []) {
        if (seg.kind !== "election") continue;
        n += 1;
        const pad = "  ".repeat(depth);
        const el = elections[seg.path] || {};
        const options =
          seg.type === "blank"
            ? "fill-in blank"
            : seg.type === "choice"
              ? seg.options.map((o) => o.label.trim()).join(" | ")
              : `keep/omit: ${seg.label}`;
        let choice = "UNRESOLVED";
        if (el.mode === "omit") choice = "(omitted)";
        else if (el.mode === "custom") choice = String(el.value || "").trim() || "UNRESOLVED";
        else if (el.mode === "include") choice = "(kept)";
        else if (el.mode === "option" && seg.type === "choice" && seg.options[el.optionIndex]) {
          choice = seg.options[el.optionIndex].label;
        }
        lines.push(`${pad}Choice ${n} [${options}] => ${choice}`);
        if (seg.type === "optional" && el.mode === "include") visit(seg.nodes, depth + 1);
        else if (seg.type === "choice" && el.mode === "option" && seg.options[el.optionIndex]) {
          visit(seg.options[el.optionIndex].nodes, depth + 1);
        }
      }
    };
    visit(parseClauseTokens(section.body), 0);
    return lines.join("\n");
  }

  function clauseAiContext(section, clauseState) {
    const guidance = (section.guidance || []).join(" ");
    const applied = clauseFinalText(section, clauseState);
    return {
      project: app.currentProject?.name || seed.meta.project || "Orrick Docs",
      question: els.clauseAiQuestionInput.value.trim(),
      issue: {
        title: `Clause: ${section.title}`,
        issueType: "clause-election",
        status: clauseState.status,
        priority: "",
        prompt:
          "Help resolve the bracketed drafting elections in this term-sheet clause (choose options, fill blanks, or draft replacement language).",
        details: [guidance, `Current elections:\n${electionSummaryForAi(section, clauseState)}`]
          .filter(Boolean)
          .join("\n\n"),
        provisionalAnswer: applied ? `Clause with current elections applied:\n${applied}` : "",
        answer: clauseState.rewriteText || "",
        proposedChange: "",
        followUpNotes: clauseState.notes || ""
      },
      sections: [
        {
          id: section.id,
          title: section.title,
          row: section.row,
          group: section.group,
          body: section.body
        }
      ]
    };
  }

  function setClauseAiResponse(message, tone, raw) {
    state.aiClauseId = selectedClauseSection()?.id || state.selectedClauseId || "";
    els.clauseAiResponse.dataset.raw = raw || "";
    els.clauseAiResponse.className = `ai-response${tone ? ` ${tone}` : ""}`;
    els.clauseAiResponse.innerHTML = message ? nl2br(message) : "";
    els.clauseSaveAiBtn.disabled = !raw;
  }

  function clearClauseAiResponse() {
    if (!els.clauseAiResponse) return;
    state.aiClauseId = "";
    els.clauseAiResponse.dataset.raw = "";
    els.clauseAiResponse.innerHTML = "";
    els.clauseSaveAiBtn.disabled = true;
  }

  async function askAiAboutClause(provider) {
    const section = selectedClauseSection();
    const question = els.clauseAiQuestionInput.value.trim();
    const providerLabel = provider === "anthropic" ? "Claude" : "OpenAI";
    if (!section) {
      setClauseAiResponse("Select a clause first.", "error", "");
      return;
    }
    if (!question) {
      setClauseAiResponse("Add a question before asking AI.", "error", "");
      return;
    }
    els.clauseAskAiBtn.disabled = true;
    els.clauseAskClaudeBtn.disabled = true;
    setClauseAiResponse(`Asking ${providerLabel}...`, "loading", "");
    try {
      const response = await fetch("/api/ask-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...clauseAiContext(section, clauseStateFor(section)), provider })
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_error) {
        data = {};
      }
      if (!response.ok) {
        const endpointHint =
          response.status === 404
            ? "The AI endpoint is available through Vercel dev or the deployed Vercel site, not the plain Vite dev server."
            : "";
        throw new Error(data.error || endpointHint || `${providerLabel} request failed with ${response.status}.`);
      }
      const answer = data.answer || "No answer was returned.";
      setClauseAiResponse(answer, "", answer);
    } catch (error) {
      console.error(error);
      setClauseAiResponse(error.message || "Could not ask AI.", "error", "");
    } finally {
      els.clauseAskAiBtn.disabled = false;
      els.clauseAskClaudeBtn.disabled = false;
    }
  }

  function saveClauseAiToNotes() {
    const section = selectedClauseSection();
    const answer = els.clauseAiResponse.dataset.raw || "";
    if (!section || !answer) return;
    const stamp = new Date().toLocaleString();
    const existing = els.clauseNotesInput.value.trim();
    const addition = `AI note (${stamp})\n${answer}`;
    els.clauseNotesInput.value = [existing, addition].filter(Boolean).join("\n\n");
    updateClauseState(section, { notes: els.clauseNotesInput.value });
    clearClauseAiResponse();
  }

  function renderClausePanel() {
    const section = selectedClauseSection();
    if (!section) {
      els.clauseHeader.innerHTML = "<div class=\"empty-state\">Select a clause in the document pane.</div>";
      els.clauseGuidance.innerHTML = "";
      els.clauseElections.innerHTML = "";
      els.clausePreview.innerHTML = "";
      return;
    }

    const clauseState = clauseStateFor(section);
    const progress = clauseProgress(section);
    els.selectedTitle.textContent = section.title;

    els.clauseHeader.innerHTML = `
      <div class="issue-meta">
        <span class="pill clause-status-${slugClass(clauseState.status)}">${escapeHtml(clauseStatusLabels[clauseState.status] || clauseState.status)}</span>
        <span class="pill election-progress">${progress.total ? `${progress.resolved}/${progress.total} choices made` : "No bracketed options"}</span>
        <span class="pill">Row ${escapeHtml(section.row)}</span>
      </div>
      <p class="clause-hint">Make a choice for each numbered item below, then accept the clause - or reject it / send it to rewrite.</p>
    `;

    const guidance = section.guidance || [];
    els.clauseGuidance.innerHTML = guidance.length
      ? `<div class="issue-explainer"><strong>How to decide:</strong><ul>${guidance
          .map((note) => `<li>${escapeHtml(note)}</li>`)
          .join("")}</ul></div>`
      : "";

    const nodes = parseClauseTokens(section.body);
    els.clauseElections.innerHTML = progress.total
      ? renderElectionControls(section, nodes, clauseState.elections, { n: 0 })
      : "<p class=\"source-note\">This clause has no bracketed options. Accept it as written, reject it, or request a rewrite.</p>";

    els.clauseRewriteInput.value = clauseState.rewriteText || "";
    els.clauseNotesInput.value = clauseState.notes || "";

    const settled = clauseState.status !== "pending";
    els.clauseAcceptBtn.hidden = settled;
    els.clauseRejectBtn.hidden = settled;
    els.clauseRewriteBtn.hidden = settled;
    els.clauseReopenBtn.hidden = !settled;
    els.clauseAcceptBtn.disabled = progress.total > 0 && progress.resolved < progress.total;
    els.clauseAcceptBtn.title =
      progress.total > 0 && progress.resolved < progress.total
        ? "Resolve every bracketed option before accepting."
        : "";

    els.clausePreview.innerHTML = `
      <div class="detail-label">Clause preview with elections applied</div>
      <p>${clausePreviewHtml(section, clauseState)}</p>
    `;

    if (state.aiClauseId && state.aiClauseId !== section.id) clearClauseAiResponse();
  }

  function renderAnswerPanel() {
    const clauseMode = state.rightPane === "clause";
    setVisible(els.clausePanel, clauseMode);
    setVisible(els.issueDetail, !clauseMode);
    setVisible(els.answerForm, !clauseMode);
    setVisible(els.aiPanel, !clauseMode);
    setVisible(els.activityTrail, !clauseMode);
    if (clauseMode) {
      renderClausePanel();
    } else {
      renderSelectedIssue();
    }
  }

  function openClauseEditor(sectionId) {
    state.rightPane = "clause";
    state.selectedClauseId = sectionId;
    renderAnswerPanel();
    renderMetrics();
    renderDocument();
  }

  function refreshClausePreview() {
    const section = selectedClauseSection();
    if (!section) return;
    const clauseState = clauseStateFor(section);
    els.clausePreview.innerHTML = `
      <div class="detail-label">Clause preview with elections applied</div>
      <p>${clausePreviewHtml(section, clauseState)}</p>
    `;
  }

  // Update resolved highlighting/flags live while typing, without re-rendering
  // (which would blur the active input) and refresh the accept button + header.
  function refreshElectionRowState() {
    const section = selectedClauseSection();
    if (!section) return;
    const clauseState = clauseStateFor(section);
    els.clauseElections.querySelectorAll(".election-row").forEach((row) => {
      const path = row.getAttribute("data-election-row");
      const seg = electionByPath(section, path);
      if (!seg) return;
      const resolved = selfResolved(seg, clauseState.elections[path]);
      row.classList.toggle("resolved", resolved);
      const flag = row.querySelector(".election-flag");
      if (flag) flag.textContent = resolved ? "Resolved" : "Needs a choice";
    });
    const progress = clauseProgress(section);
    const headerPill = els.clauseHeader.querySelector(".election-progress");
    if (headerPill) {
      headerPill.textContent = `${progress.resolved}/${progress.total} choices made`;
    }
    els.clauseAcceptBtn.disabled = progress.total > 0 && progress.resolved < progress.total;
  }

  function clearAiResponse() {
    if (!els.aiResponse) return;
    state.aiIssueId = "";
    els.aiResponse.dataset.raw = "";
    els.aiResponse.innerHTML = "";
    els.saveAiFollowUpBtn.disabled = true;
  }

  function setAiResponse(message, tone, raw) {
    state.aiIssueId = currentIssue()?.id || state.selectedId || "";
    els.aiResponse.dataset.raw = raw || "";
    els.aiResponse.className = `ai-response${tone ? ` ${tone}` : ""}`;
    els.aiResponse.innerHTML = message ? nl2br(message) : "";
    els.saveAiFollowUpBtn.disabled = !raw;
  }

  function aiContextForIssue(issue) {
    return {
      project: app.currentProject?.name || seed.meta.project || "Orrick Docs",
      question: els.aiQuestionInput.value.trim(),
      issue: {
        id: issue.id,
        title: issue.title,
        issueType: issue.issueType,
        status: issue.status,
        priority: issue.priority,
        prompt: issue.prompt,
        details: issue.details,
        provisionalAnswer: issue.provisionalAnswer,
        answer: els.answerInput.value,
        proposedChange: els.changeInput.value,
        followUpNotes: els.followNotesInput.value
      },
      sections: linkedSections(issue).map((section) => ({
        id: section.id,
        title: section.title,
        row: section.row,
        group: section.group,
        body: section.body
      }))
    };
  }

  async function askAiAboutIssue(provider) {
    const issue = currentIssue();
    const question = els.aiQuestionInput.value.trim();
    const providerLabel = provider === "anthropic" ? "Claude" : "OpenAI";
    if (!issue) {
      setAiResponse("Select an issue first.", "error", "");
      return;
    }
    if (!question) {
      setAiResponse("Add a question before asking AI.", "error", "");
      return;
    }

    els.askAiBtn.disabled = true;
    els.askClaudeBtn.disabled = true;
    setAiResponse(`Asking ${providerLabel}...`, "loading", "");
    try {
      const response = await fetch("/api/ask-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiContextForIssue(issue), provider })
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_error) {
        data = {};
      }
      if (!response.ok) {
        const endpointHint =
          response.status === 404
            ? "The AI endpoint is available through Vercel dev or the deployed Vercel site, not the plain Vite dev server."
            : "";
        throw new Error(data.error || endpointHint || `${providerLabel} request failed with ${response.status}.`);
      }
      const answer = data.answer || "No answer was returned.";
      setAiResponse(answer, "", answer);
    } catch (error) {
      console.error(error);
      setAiResponse(error.message || "Could not ask AI.", "error", "");
    } finally {
      els.askAiBtn.disabled = false;
      els.askClaudeBtn.disabled = false;
    }
  }

  function saveAiToFollowUp() {
    const answer = els.aiResponse.dataset.raw || "";
    if (!answer) return;
    const stamp = new Date().toLocaleString();
    const existing = els.followNotesInput.value.trim();
    const addition = `AI follow-up (${stamp})\n${answer}`;
    els.followNotesInput.value = [existing, addition].filter(Boolean).join("\n\n");
    els.followInput.checked = true;
    updateAnswer({ followUp: true, followUpNotes: els.followNotesInput.value }, true);
    clearAiResponse();
  }

  function renderActivityTrail() {
    if (app.mode !== "remote") {
      els.activityTrail.innerHTML = "";
      return;
    }
    const items = app.issueEvents.map((event) => {
      const changed = summarizeChanges(event.changes || {});
      return `
        <div class="activity-item">
          <h3>${escapeHtml(profileLabel(event.actor_id))} · ${escapeHtml(event.event_type)}</h3>
          <p>${escapeHtml(new Date(event.created_at).toLocaleString())}</p>
          ${changed ? `<p>${escapeHtml(changed)}</p>` : ""}
        </div>
      `;
    });
    els.activityTrail.innerHTML = `
      <h3>Activity</h3>
      ${items.length ? items.join("") : "<p class=\"source-note\">No saved activity yet.</p>"}
    `;
  }

  function summarizeChanges(changes) {
    const labels = {
      status: "status",
      owner_note: "owner note",
      answer: "answer",
      proposed_change: "proposed change",
      follow_up: "follow-up flag",
      follow_up_notes: "follow-up notes",
      resolved_at: "resolved timestamp"
    };
    return Object.keys(changes)
      .filter((key) => labels[key])
      .map((key) => labels[key])
      .join(", ");
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
    const sections = issue ? linkedSections(issue) : [];
    els.documentTitle.textContent = "Relevant Sections";

    if (!app.currentProject && app.mode === "remote") {
      els.documentContent.innerHTML = "<div class=\"empty-state\">Create a project or click Seed Current Docs to begin.</div>";
      return;
    }

    if (!sections.length) {
      els.documentContent.innerHTML = "<div class=\"empty-state\">No term-sheet section is linked yet.</div>";
      return;
    }

    els.documentContent.innerHTML = `<div class="section-stack">${sections.map(sectionHtml).join("")}</div>`;
  }

  function renderFullTermSheet() {
    const termDoc = primaryTermDocument();
    els.documentTitle.textContent = termDoc?.title || "Full Document";
    const sections = termSections();
    els.documentContent.innerHTML = sections.length
      ? `${documentSummaryHtml(termDoc)}<div class="section-stack">${sections.map(sectionHtml).join("")}</div>`
      : "<div class=\"empty-state\">No sections have been loaded. Create a project with documents or click Seed Current Docs.</div>";
  }

  function renderMemo() {
    const memoDoc = memoDocument();
    els.documentTitle.textContent = memoDoc?.title || "Open Items Memo";
    const memo = memoDoc?.extractedMetadata?.memo || seed.openItemsMemo;
    const sourceNote =
      app.mode === "remote" && app.currentProject
        ? ""
        : seed.meta.sourceFiles
            .filter((source) => source.note)
            .map((source) => `<p class="source-note">${escapeHtml(source.label)}: ${escapeHtml(source.note)}</p>`)
            .join("");
    const paragraphs = (memo.paragraphs || [])
      .map((paragraph) => {
        const isHeading = /^(\d+\.|[A-H]\.)\s/.test(paragraph) || paragraph === "Executive Summary";
        return isHeading ? `<h3>${escapeHtml(paragraph)}</h3>` : `<p>${escapeHtml(paragraph)}</p>`;
      })
      .join("");
    const tables = (memo.tables || [])
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

    els.documentContent.innerHTML = memo
      ? `${documentSummaryHtml(memoDoc)}${sourceNote}<div class="memo-block">${paragraphs}</div>${tables}`
      : "<div class=\"empty-state\">No memo data has been loaded for this project.</div>";
  }

  function documentSummaryHtml(document) {
    const summary = document?.summary || document?.extractedMetadata?.summary || summaryForDocumentType(document?.documentType);
    return summary
      ? `<section class="document-summary"><div class="detail-label">Document summary</div><p>${escapeHtml(summary)}</p></section>`
      : "";
  }

  function sectionQueueCount(sectionId) {
    return allIssues().filter((issue) => issueMentionsSection(issueView(issue), sectionId)).length;
  }

  function sectionHtml(section) {
    const selected = section.id === state.selectedSectionId || section.id === state.selectedClauseId ? " selected" : "";
    const group = section.isGroup ? " group-row" : "";
    const summary = section.summary || summaryForSectionKey(section.stableKey || section.id);
    const queueCount = section.isGroup ? 0 : sectionQueueCount(section.id);
    let electionBadge = "";
    if (!section.isGroup) {
      const progress = clauseProgress(section);
      const statusPill =
        progress.status !== "pending"
          ? `<span class="pill clause-status-${slugClass(progress.status)}">${escapeHtml(clauseStatusLabels[progress.status])}</span>`
          : "";
      const progressPill = progress.total
        ? `<span class="pill${progress.resolved === progress.total ? " election-done" : ""}">${progress.resolved}/${progress.total} elections</span>`
        : "";
      electionBadge = statusPill || progressPill ? `<div class="issue-meta section-badges">${statusPill}${progressPill}</div>` : "";
    }

    // Once a clause is settled, the document shows the edited (finalized) text
    // instead of the raw bracketed form language.
    let bodyHtml = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    if (!section.isGroup && clauseIsSettled(section)) {
      const cs = clauseStateFor(section);
      let label = "Finalized";
      let finalBlock = "";
      if (cs.status === "rejected") {
        label = "Rejected";
        finalBlock = "<p class=\"clause-final-rejected\">This clause has been rejected — to be removed from or replaced in the draft.</p>";
      } else if (cs.status === "rewrite") {
        label = "Rewrite requested";
        const text = (cs.rewriteText || "").trim() || clauseFinalText(section, cs);
        finalBlock = `<p class="clause-final-text">${escapeHtml(text)}</p>`;
      } else {
        const text = clauseFinalText(section, cs);
        finalBlock = `<p class="clause-final-text">${escapeHtml(text)}</p>`;
      }
      bodyHtml = `
        <div class="clause-final clause-final-${slugClass(cs.status)}">
          <div class="detail-label">Edited clause · ${escapeHtml(label)}</div>
          ${finalBlock}
        </div>
        ${section.body ? `<details class="clause-original"><summary>Show original form language</summary><p>${escapeHtml(section.body)}</p></details>` : ""}
      `;
    }

    return `
      <article class="term-section${selected}${group}" data-section-id="${escapeHtml(section.id)}"${section.isGroup ? "" : " tabindex=\"0\" role=\"button\""} aria-label="${escapeHtml(`Review ${section.title}`)}">
        <div class="section-header">
          <div>
            <h3>${escapeHtml(section.title)}</h3>
            <div class="section-row-label">Row ${escapeHtml(section.row)} · ${escapeHtml(section.group || "Document")}</div>
          </div>
          ${
            section.isGroup
              ? ""
              : `<span class="section-action">Review Clause${queueCount ? ` (${queueCount})` : ""}</span>`
          }
        </div>
        ${electionBadge}
        ${summary ? `<div class="section-summary"><div class="detail-label">Summary</div><p>${escapeHtml(summary)}</p></div>` : ""}
        ${bodyHtml}
      </article>
    `;
  }

  function renderAll() {
    renderProjectControls();
    renderMetrics();
    renderIssueList();
    renderAnswerPanel();
    renderDocument();
  }

  function updateAnswer(patch, rerenderList) {
    const issue = currentIssue();
    if (!issue) return;

    if (app.mode === "remote") {
      const current = app.issueStates.get(issue.id) || { issueId: issue.id, projectId: app.currentProject.id };
      const next = {
        ...current,
        ...patch,
        updatedBy: app.user.id,
        updatedAt: new Date().toISOString()
      };
      if (next.status === "resolved" && !next.resolvedAt) {
        next.resolvedAt = new Date().toISOString();
      } else if (next.status !== "resolved") {
        next.resolvedAt = "";
      }
      app.issueStates.set(issue.id, next);
      enqueueMutation("issue_state", issue.id, app.currentProject.id, {
        issue_id: issue.id,
        project_id: next.projectId || app.currentProject.id,
        status: next.status || "open",
        owner_user_id: next.ownerUserId || null,
        owner_note: next.owner || null,
        answer: next.answer || null,
        proposed_change: next.proposedChange || null,
        follow_up: Boolean(next.followUp),
        follow_up_notes: next.followUpNotes || null,
        resolved_at: next.resolvedAt || null,
        updated_by: app.user.id
      });
      scheduleFlush();
      renderSyncStatus();
    } else {
      app.localWorkspace.answers[issue.id] = {
        ...(app.localWorkspace.answers[issue.id] || {}),
        ...patch,
        updatedAt: new Date().toISOString()
      };
      persistLocalWorkspace();
      showSaveState("Saved", "saved");
    }

    if (rerenderList) {
      renderMetrics();
      renderIssueList();
      renderSelectedIssue();
      renderDocument();
    }
  }

  async function setSelectedIssue(issueId) {
    state.selectedId = issueId;
    state.rightPane = "issue";
    persistLocalWorkspace();
    const issue = currentIssue();
    state.selectedSectionId = issue?.termSectionIds?.[0] || "";
    if (app.mode === "remote") {
      await loadIssueEvents(issueId);
    }
    renderAll();
  }

  function setFocusedSection(sectionId) {
    state.selectedSectionId = sectionId;
    state.sectionFilter = sectionId;
    els.sectionFilter.value = sectionId;
    openClauseEditor(sectionId);
    renderIssueList();
  }

  async function createCustomIssue() {
    const title = els.newIssueTitle.value.trim();
    if (!title) return;
    const issueType = els.newIssueType.value;
    const shouldLinkSection = isClauseScopedIssueType(issueType);
    const sectionId = shouldLinkSection ? els.newIssueSection.value : "";
    const prompt = els.newIssuePrompt.value.trim() || title;

    if (app.mode === "remote") {
      assertRemote();
      requireOnline("You're offline - reconnect to add a new item.");
      if (!app.currentProject) return;
      const stableKey = `custom-${Date.now()}-${slugify(title)}`;
      const { data, error } = await db
        .from("issues")
        .insert({
          project_id: app.currentProject.id,
          stable_key: stableKey,
          issue_type: issueType,
          initial_status: "open",
          priority: "medium",
          category: "Custom",
          title,
          prompt,
          source_label: "User-added item",
          tags: ["custom"],
          sort_order: app.issues.length,
          created_by: app.user.id
        })
        .select()
        .single();
      if (error) throw error;
      if (sectionId) {
        const { error: linkError } = await db.from("issue_sections").insert({
          project_id: app.currentProject.id,
          issue_id: data.id,
          section_id: sectionId,
          position: 0
        });
        if (linkError) throw linkError;
      }
      await loadProject(app.currentProject.id);
      state.selectedId = data.id;
      state.selectedSectionId = sectionId;
    } else {
      const id = `custom-${Date.now()}-${slugify(title)}`;
      const issue = {
        id,
        stableKey: id,
        issueType,
        status: "open",
        priority: "medium",
        category: "Custom",
        title,
        prompt,
        details: "",
        provisionalAnswer: "",
        source: "User-added item",
        termSectionIds: sectionId ? [sectionId] : [],
        tags: ["custom"],
        sortOrder: app.issues.length
      };
      app.localWorkspace.customIssues.push(issue);
      app.issues.push(issue);
      persistLocalWorkspace();
      state.selectedId = id;
      state.selectedSectionId = sectionId;
    }

    els.newIssueForm.reset();
    renderFilters();
    renderAll();
  }

  async function createBlankProject(name, description) {
    assertRemote();
    requireOnline("You're offline - reconnect to create a project.");
    const { data, error } = await db
      .from("projects")
      .insert({
        name,
        slug: `${slugify(name)}-${Date.now()}`,
        description,
        source_metadata: {},
        created_by: app.user.id
      })
      .select()
      .single();
    if (error) throw error;
    await loadProjects();
    await loadProject(data.id);
    return data;
  }

  async function seedCurrentProject(nameOverride, descriptionOverride) {
    assertRemote();
    requireOnline("You're offline - reconnect to seed a project.");
    showSaveState("Seeding", "dirty");
    const projectName = nameOverride || seed.meta.project;
    const projectDescription =
      descriptionOverride || "Seeded from the current Orrick term sheet and blind-pool open-items memo.";
    const { data: project, error: projectError } = await db
      .from("projects")
      .insert({
        name: projectName,
        slug: `${slugify(projectName)}-${Date.now()}`,
        description: projectDescription,
        source_metadata: seed.meta,
        created_by: app.user.id
      })
      .select()
      .single();
    if (projectError) throw projectError;

    const { data: docs, error: docsError } = await db
      .from("documents")
      .insert([
        {
          project_id: project.id,
          title: seed.termSheet.title,
          document_type: "term_sheet",
          source_label: seed.meta.sourceFiles?.[0]?.label || "Term sheet",
          original_filename: "FORM - Venture Capital_Private Equity Fund Form Term Sheet.docx",
          extracted_metadata: { sourceFiles: seed.meta.sourceFiles, summary: seed.termSheet.summary },
          created_by: app.user.id
        },
        {
          project_id: project.id,
          title: "Blind Pool Fund Open Items",
          document_type: "memo",
          source_label: seed.meta.sourceFiles?.[1]?.label || "Open items memo",
          original_filename: "blind_pool_fund_open_items_and_drafting_changes.docx",
          extracted_metadata: { memo: seed.openItemsMemo, sourceFiles: seed.meta.sourceFiles, summary: seed.openItemsMemo.summary },
          created_by: app.user.id
        }
      ])
      .select();
    if (docsError) throw docsError;

    const termDoc = docs.find((doc) => doc.document_type === "term_sheet");
    const sectionPayload = seed.termSheet.sections.map((section) => ({
      project_id: project.id,
      document_id: termDoc.id,
      stable_key: section.id,
      section_order: section.row,
      title: section.title,
      body: section.body || null,
      group_title: section.group || null,
      is_group: Boolean(section.isGroup),
      section_kind: section.isGroup ? "group" : "section",
      source_ref: { row: section.row, summary: section.summary || "" }
    }));
    const { data: insertedSections, error: sectionsError } = await db
      .from("document_sections")
      .insert(sectionPayload)
      .select();
    if (sectionsError) throw sectionsError;

    const sectionIdByStableKey = new Map(insertedSections.map((section) => [section.stable_key, section.id]));
    const issuePayload = seed.issues.map((issue, index) => ({
      project_id: project.id,
      stable_key: issue.id,
      issue_type: issue.issueType,
      initial_status: issue.status || "open",
      priority: issue.priority || "medium",
      category: issue.category || null,
      title: issue.title,
      prompt: issue.prompt || issue.title,
      details: issue.details || null,
      provisional_answer: issue.provisionalAnswer || null,
      source_label: issue.source || null,
      tags: issue.tags || [],
      sort_order: index,
      created_by: app.user.id
    }));
    const { data: insertedIssues, error: issuesError } = await db.from("issues").insert(issuePayload).select();
    if (issuesError) throw issuesError;

    const issueIdByStableKey = new Map(insertedIssues.map((issue) => [issue.stable_key, issue.id]));
    const linkPayload = [];
    seed.issues.forEach((issue) => {
      (issue.termSectionIds || []).forEach((sectionStableKey, position) => {
        const issueId = issueIdByStableKey.get(issue.id);
        const sectionId = sectionIdByStableKey.get(sectionStableKey);
        if (issueId && sectionId) {
          linkPayload.push({
            project_id: project.id,
            issue_id: issueId,
            section_id: sectionId,
            position
          });
        }
      });
    });
    for (let index = 0; index < linkPayload.length; index += 500) {
      const { error: linkError } = await db.from("issue_sections").insert(linkPayload.slice(index, index + 500));
      if (linkError) throw linkError;
    }

    await loadProjects();
    await loadProject(project.id);
    showSaveState("Synced", "saved");
    return project;
  }

  function exportWorkspace() {
    const payload = {
      exportedAt: new Date().toISOString(),
      mode: app.mode,
      project: app.currentProject,
      seedGeneratedAt: seed.meta.generatedAt,
      documents: app.documents,
      sections: app.sections,
      issues: allIssues().map(issueView),
      answers:
        app.mode === "remote"
          ? Object.fromEntries(Array.from(app.issueStates.entries()))
          : app.localWorkspace.answers,
      customIssues: app.mode === "local" ? app.localWorkspace.customIssues : []
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orrick-doc-review-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importWorkspace(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        if (app.mode === "remote") {
          await importAnswersRemote(imported);
        } else {
          app.localWorkspace.answers = { ...app.localWorkspace.answers, ...(imported.answers || {}) };
          const existingCustom = new Map(app.localWorkspace.customIssues.map((issue) => [issue.id, issue]));
          (imported.customIssues || []).forEach((issue) => existingCustom.set(issue.id, issue));
          app.localWorkspace.customIssues = Array.from(existingCustom.values());
          loadLocalSeed();
          persistLocalWorkspace();
        }
        renderFilters();
        renderAll();
        showSaveState(app.mode === "remote" ? "Synced" : "Imported", "saved");
      } catch (error) {
        console.error(error);
        window.alert("That JSON file could not be imported.");
      }
    };
    reader.readAsText(file);
  }

  async function importAnswersRemote(imported) {
    assertRemote();
    if (!app.currentProject) return;
    const answers = imported.answers || {};
    const issueByStable = new Map(app.issues.map((issue) => [issue.stableKey, issue]));
    const issueById = new Map(app.issues.map((issue) => [issue.id, issue]));
    const payload = [];
    Object.entries(answers).forEach(([key, answer]) => {
      const issue = issueById.get(key) || issueByStable.get(key);
      if (!issue) return;
      payload.push({
        issue_id: issue.id,
        project_id: app.currentProject.id,
        status: answer.status || "open",
        owner_note: answer.owner || answer.ownerNote || null,
        answer: answer.answer || null,
        proposed_change: answer.proposedChange || null,
        follow_up: Boolean(answer.followUp),
        follow_up_notes: answer.followUpNotes || null,
        updated_by: app.user.id
      });
    });
    if (!payload.length) return;
    const { error } = await db.from("issue_states").upsert(payload, { onConflict: "issue_id" });
    if (error) throw error;
    await loadProject(app.currentProject.id);
  }

  function resetWorkspace() {
    if (!window.confirm("Clear saved local answers and custom issues from this browser?")) return;
    localStorage.removeItem(storageKey);
    app.localWorkspace = { answers: {}, clauseStates: {}, customIssues: [], lastSelectedId: "", lastProjectId: "" };
    loadLocalSeed();
    renderFilters();
    renderAll();
    showSaveState("Reset", "saved");
  }

  function bindEvents() {
    window.addEventListener("online", () => setConnectivity(true));
    window.addEventListener("offline", () => setConnectivity(false));
    window.addEventListener("focus", () => {
      if (app.mode === "remote" && isOnline() && outboxCount()) scheduleFlush(0);
    });

    if (els.syncNowBtn) {
      els.syncNowBtn.addEventListener("click", () => {
        app.online = isOnline();
        renderSyncStatus();
        flushOutbox();
      });
    }

    els.localModeBtn.addEventListener("click", () => {
      setMode("local");
      loadLocalSeed();
      renderFilters();
      renderAll();
      showSaveState("Local", "saved");
    });

    els.authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await signIn(els.authEmail.value.trim(), els.authPassword.value);
    });

    els.signUpBtn.addEventListener("click", async () => {
      await signUp(els.authEmail.value.trim(), els.authPassword.value);
    });

    els.signOutBtn.addEventListener("click", signOut);

    els.projectSelect.addEventListener("change", async () => {
      if (!els.projectSelect.value) return;
      if (!isOnline()) {
        setConnectivity(false);
        window.alert("You're offline - reconnect to switch projects.");
        els.projectSelect.value = app.currentProject?.id || "";
        return;
      }
      try {
        await loadProject(els.projectSelect.value);
      } catch (error) {
        console.error(error);
        if (isNetworkError(error)) {
          setConnectivity(false);
          window.alert("Lost the connection while loading that project.");
          els.projectSelect.value = app.currentProject?.id || "";
        }
      }
    });

    els.shareProjectBtn.addEventListener("click", openShareDialog);

    els.shareProjectForm.addEventListener("submit", async (event) => {
      if (event.submitter && event.submitter.id === "inviteMemberBtn") {
        event.preventDefault();
        try {
          await inviteProjectMember();
        } catch (error) {
          console.error(error);
          showShareMessage(error.message || "Could not invite that user.", "error");
        }
      }
    });

    els.projectMembersList.addEventListener("change", async (event) => {
      const roleSelect = event.target.closest("[data-member-role]");
      if (!roleSelect) return;
      try {
        await updateProjectMemberRole(roleSelect.dataset.memberRole, roleSelect.value);
      } catch (error) {
        console.error(error);
        showShareMessage(error.message || "Could not update that member.", "error");
        renderProjectMembers();
      }
    });

    els.projectMembersList.addEventListener("click", async (event) => {
      const removeButton = event.target.closest("[data-remove-member]");
      if (!removeButton) return;
      try {
        await removeProjectMember(removeButton.dataset.removeMember);
      } catch (error) {
        console.error(error);
        showShareMessage(error.message || "Could not remove that member.", "error");
      }
    });

    els.seedProjectBtn.addEventListener("click", async () => {
      try {
        await seedCurrentProject();
      } catch (error) {
        console.error(error);
        window.alert(error.message || "Could not seed the project.");
      }
    });

    els.newProjectBtn.addEventListener("click", () => {
      els.newProjectName.value = "";
      els.newProjectDescription.value = "";
      els.newProjectUseSeed.checked = true;
      if (els.newProjectDialog.showModal) {
        els.newProjectDialog.showModal();
      }
    });

    els.newProjectForm.addEventListener("submit", async (event) => {
      if (event.submitter && event.submitter.id === "createProjectBtn") {
        event.preventDefault();
        try {
          const name = els.newProjectName.value.trim();
          const description = els.newProjectDescription.value.trim();
          if (els.newProjectUseSeed.checked) {
            await seedCurrentProject(name, description);
          } else {
            await createBlankProject(name, description);
          }
          els.newProjectDialog.close();
        } catch (error) {
          console.error(error);
          window.alert(error.message || "Could not create the project.");
        }
      }
    });

    els.searchInput.addEventListener("input", () => {
      state.query = els.searchInput.value;
      renderAll();
    });

    els.topicFilter.addEventListener("change", () => {
      state.topicFilter = els.topicFilter.value;
      renderAll();
    });

    els.typeFilter.addEventListener("change", () => {
      state.typeFilter = els.typeFilter.value;
      renderAll();
    });

    els.tierFilter.addEventListener("change", () => {
      state.tierFilter = els.tierFilter.value;
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

    els.clearFiltersBtn.addEventListener("click", clearQueueFilters);

    els.issueList.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-issue-id]");
      if (!card) return;
      await setSelectedIssue(card.dataset.issueId);
    });

    document.querySelectorAll("[data-doc-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.docTab = button.dataset.docTab;
        renderDocument();
      });
    });

    els.documentContent.addEventListener("click", (event) => {
      // Let the "Show original form language" disclosure toggle natively.
      if (event.target.closest(".clause-original")) return;
      const section = event.target.closest("[data-section-id]");
      if (section && !section.classList.contains("group-row")) {
        setFocusedSection(section.dataset.sectionId);
      }
    });

    els.documentContent.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const section = event.target.closest("[data-section-id]");
      if (section && !section.classList.contains("group-row")) {
        event.preventDefault();
        setFocusedSection(section.dataset.sectionId);
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

    els.askAiBtn.addEventListener("click", () => askAiAboutIssue("openai"));
    els.askClaudeBtn.addEventListener("click", () => askAiAboutIssue("anthropic"));
    els.saveAiFollowUpBtn.addEventListener("click", saveAiToFollowUp);

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
      const defaultSection =
        state.selectedSectionId ||
        (isClauseScopedIssue(issue) ? issue?.termSectionIds?.[0] : "") ||
        termSections().find((section) => !section.isGroup)?.id ||
        "";
      els.newIssueType.value = "question";
      els.newIssueSection.value = defaultSection;
      syncNewIssueSectionControl();
      if (els.newIssueDialog.showModal) {
        els.newIssueDialog.showModal();
      }
    });

    els.newIssueType.addEventListener("change", syncNewIssueSectionControl);

    els.clauseElections.addEventListener("change", (event) => {
      const section = selectedClauseSection();
      if (!section) return;
      const radio = event.target.closest("input[data-election-path]");
      if (!radio) return;
      const path = radio.dataset.electionPath;
      const value = radio.value;
      const existing = clauseStateFor(section).elections[path] || {};
      let election = null;
      if (value.startsWith("option:")) {
        election = { mode: "option", optionIndex: Number(value.slice(7)) };
      } else if (value === "include") {
        election = { mode: "include" };
      } else if (value === "omit") {
        election = { mode: "omit" };
      } else if (value === "custom") {
        election = { mode: "custom", value: existing.mode === "custom" ? existing.value || "" : "" };
      }
      setClauseElection(section, path, election);
      renderClausePanel();
      renderMetrics();
      renderDocument();
    });

    els.clauseElections.addEventListener("input", (event) => {
      const section = selectedClauseSection();
      if (!section) return;
      const blank = event.target.closest("[data-election-input]");
      const custom = event.target.closest("[data-election-custom]");
      if (blank) {
        setClauseElection(section, blank.dataset.electionInput, { mode: "custom", value: blank.value });
      } else if (custom) {
        setClauseElection(section, custom.dataset.electionCustom, { mode: "custom", value: custom.value });
      } else {
        return;
      }
      refreshClausePreview();
      refreshElectionRowState();
    });

    els.clauseElections.addEventListener(
      "blur",
      (event) => {
        if (event.target.closest("[data-election-input],[data-election-custom]")) {
          renderMetrics();
          renderDocument();
        }
      },
      true
    );

    els.clauseRewriteInput.addEventListener("input", () => {
      const section = selectedClauseSection();
      if (section) updateClauseState(section, { rewriteText: els.clauseRewriteInput.value });
    });

    els.clauseNotesInput.addEventListener("input", () => {
      const section = selectedClauseSection();
      if (section) updateClauseState(section, { notes: els.clauseNotesInput.value });
    });

    const setClauseStatus = (status) => {
      const section = selectedClauseSection();
      if (!section) return;
      updateClauseState(section, { status });
      renderClausePanel();
      renderMetrics();
      renderDocument();
    };
    els.clauseAcceptBtn.addEventListener("click", () => setClauseStatus("accepted"));
    els.clauseRejectBtn.addEventListener("click", () => setClauseStatus("rejected"));
    els.clauseRewriteBtn.addEventListener("click", () => {
      setClauseStatus("rewrite");
      els.clauseRewriteInput.focus();
    });
    els.clauseReopenBtn.addEventListener("click", () => setClauseStatus("pending"));

    els.clauseAskAiBtn.addEventListener("click", () => askAiAboutClause("openai"));
    els.clauseAskClaudeBtn.addEventListener("click", () => askAiAboutClause("anthropic"));
    els.clauseSaveAiBtn.addEventListener("click", saveClauseAiToNotes);

    els.newIssueForm.addEventListener("submit", async (event) => {
      if (event.submitter && event.submitter.id === "createIssueBtn") {
        event.preventDefault();
        try {
          await createCustomIssue();
          els.newIssueDialog.close();
        } catch (error) {
          console.error(error);
          window.alert(error.message || "Could not create the issue.");
        }
      }
    });
  }

  async function init() {
    bindEvents();
    if (!db) {
      els.setupMessage.textContent =
        "Add the Supabase anon key in config.js to enable login and permanent collaboration.";
      setMode("setup");
      return;
    }

    db.auth.onAuthStateChange(async (_event, session) => {
      app.session = session;
      app.user = session?.user || null;
      if (!app.user) {
        setMode("auth");
      }
    });

    try {
      await loadRemoteSession();
      renderSyncStatus();
      if (outboxCount()) scheduleFlush(0);
    } catch (error) {
      console.error(error);
      els.setupMessage.textContent = error.message || "Could not connect to Supabase.";
      setMode("setup");
    }
  }

  init();
})();
