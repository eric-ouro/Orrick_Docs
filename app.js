(function () {
  "use strict";

  const seed = window.ORRICK_SEED_DATA;
  const storageKey = "orrick.blindPoolFund.workspace.v2";
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
    typeFilter: document.getElementById("typeFilter"),
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
    issueDetail: document.getElementById("issueDetail"),
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
    issueEvents: [],
    projectMembers: [],
    profiles: new Map(),
    localWorkspace: loadLocalWorkspace()
  };

  let saveTimer = null;
  const remoteSaveTimers = new Map();
  const pendingIssueState = new Map();

  const state = {
    selectedId: app.localWorkspace.lastSelectedId || "",
    selectedSectionId: "",
    docTab: "relevant",
    query: "",
    typeFilter: "all",
    statusFilter: "all",
    followFilter: "all",
    sectionFilter: "all",
    aiIssueId: ""
  };

  function loadLocalWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        answers: parsed.answers || {},
        customIssues: Array.isArray(parsed.customIssues) ? parsed.customIssues : [],
        lastSelectedId: parsed.lastSelectedId || "",
        lastProjectId: parsed.lastProjectId || ""
      };
    } catch (error) {
      console.warn("Could not load local workspace", error);
      return { answers: {}, customIssues: [], lastSelectedId: "", lastProjectId: "" };
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
      els.saveState.textContent = app.mode === "remote" ? "Synced" : "Saved";
      els.saveState.className = "save-state saved";
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
      summary: row.source_ref?.summary || summaryForSectionKey(row.stable_key)
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
    app.issueEvents = [];
    app.projectMembers = [];
    state.selectedId = "";
    state.selectedSectionId = "";
  }

  async function loadProject(projectId) {
    assertRemote();
    showSaveState("Loading", "dirty");
    app.currentProject = app.projects.find((project) => project.id === projectId) || null;
    app.localWorkspace.lastProjectId = projectId;

    const [documentsResult, sectionsResult, issuesResult, linksResult, statesResult] = await Promise.all([
      db.from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
      db.from("document_sections").select("*").eq("project_id", projectId).order("section_order", { ascending: true }),
      db.from("issues").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      db.from("issue_sections").select("*").eq("project_id", projectId).order("position", { ascending: true }),
      db.from("issue_states").select("*").eq("project_id", projectId)
    ]);

    for (const result of [documentsResult, sectionsResult, issuesResult, linksResult, statesResult]) {
      if (result.error) throw result.error;
    }

    app.documents = (documentsResult.data || []).map(normalizeDocument);
    app.sections = (sectionsResult.data || []).map(normalizeSection);
    app.issueLinks = linksResult.data || [];
    app.issueStates = new Map((statesResult.data || []).map((row) => [row.issue_id, normalizeState(row)]));

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
    state.selectedSectionId = currentIssue()?.termSectionIds?.[0] || "";
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
    const types = typeOrder.filter((type) => allIssues().some((issue) => issue.issueType === type));
    els.typeFilter.innerHTML = [
      "<option value=\"all\">All types</option>",
      ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(typeLabels[type] || type)}</option>`)
    ].join("");

    els.statusFilter.innerHTML = [
      "<option value=\"all\">All statuses</option>",
      ...Object.entries(statusLabels).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    ].join("");

    const sectionOptions = termSections()
      .filter((section) => !section.isGroup)
      .map((section) => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title)}</option>`);
    els.sectionFilter.innerHTML = ["<option value=\"all\">All</option>", ...sectionOptions].join("");
    els.newIssueSection.innerHTML = sectionOptions.join("");

    els.typeFilter.value = state.typeFilter;
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
    renderQueueSummary(issues);
    if (!issues.some((issue) => issue.id === state.selectedId) && issues.length) {
      state.selectedId = issues[0].id;
    }

    if (!issues.length) {
      const emptyText = app.mode === "remote" && !app.currentProject ? "Create or seed a project to begin." : "No matching items.";
      els.issueList.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
      return;
    }

    els.issueList.innerHTML = issues
      .map((issue) => {
        const active = issue.id === state.selectedId ? " active" : "";
        const follow = isFollowUp(issue) ? "<span class=\"pill status-follow-up\">Flagged</span>" : "";
        const sectionCount = (issue.termSectionIds || []).length;
        const updated = issue.updatedBy ? `<span class="pill">By ${escapeHtml(profileLabel(issue.updatedBy))}</span>` : "";
        return `
          <button class="issue-card${active}" data-issue-id="${escapeHtml(issue.id)}" type="button">
            <h3>${escapeHtml(issue.title)}</h3>
            <div class="issue-meta">
              <span class="pill type-${slugClass(issue.issueType)}">${escapeHtml(typeLabels[issue.issueType] || issue.issueType)}</span>
              <span class="pill status-${slugClass(issue.status)}">${escapeHtml(statusLabels[issue.status] || issue.status)}</span>
              <span class="pill">${sectionCount} section${sectionCount === 1 ? "" : "s"}</span>
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
    if (state.typeFilter !== "all") chips.push(`Type: ${typeLabels[state.typeFilter] || state.typeFilter}`);
    if (state.statusFilter !== "all") chips.push(`Status: ${statusLabels[state.statusFilter] || state.statusFilter}`);
    if (state.followFilter === "flagged") chips.push("Follow-up: flagged");
    if (state.followFilter === "not-flagged") chips.push("Follow-up: not flagged");
    if (state.sectionFilter !== "all") chips.push(`Section: ${sectionTitle(state.sectionFilter)}`);

    els.activeFilters.innerHTML = chips.length
      ? chips.map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`).join("")
      : "<span class=\"filter-muted\">No active filters</span>";
    if (els.clearFiltersBtn) {
      els.clearFiltersBtn.disabled = !chips.length;
    }
  }

  function clearQueueFilters() {
    state.query = "";
    state.typeFilter = "all";
    state.statusFilter = "all";
    state.followFilter = "all";
    state.sectionFilter = "all";
    state.selectedSectionId = "";
    els.searchInput.value = "";
    els.typeFilter.value = "all";
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
        ${issue.priority ? `<span class="pill">${escapeHtml(issue.priority)} priority</span>` : ""}
      </div>
      <div class="issue-brief">
        <div>
          <h3>Question</h3>
          <p>${nl2br(issue.prompt || issue.title)}</p>
        </div>
        ${
          issue.provisionalAnswer
            ? `<div>
                <h3>Provisional options</h3>
                ${provisionalOptionsHtml(issue.provisionalAnswer)}
              </div>`
            : ""
        }
        ${issue.details ? `<div><h3>Notes</h3><p>${nl2br(issue.details)}</p></div>` : ""}
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

  function provisionalOptionsHtml(value) {
    const lines = String(value || "")
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
            return `<li><strong>Option ${escapeHtml(match[1].toUpperCase())}:</strong> ${escapeHtml(match[2])}</li>`;
          }
          return `<li>${escapeHtml(line.replace(/^Comment:\s*/i, "Note: "))}</li>`;
        })
        .join("");
      return `<ul>${options}</ul>`;
    }
    return `<p>${nl2br(value)}</p>`;
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

  function sectionHtml(section) {
    const selected = section.id === state.selectedSectionId ? " selected" : "";
    const group = section.isGroup ? " group-row" : "";
    const summary = section.summary || summaryForSectionKey(section.stableKey || section.id);
    return `
      <article class="term-section${selected}${group}" data-section-id="${escapeHtml(section.id)}">
        <div class="section-header">
          <div>
            <h3>${escapeHtml(section.title)}</h3>
            <div class="section-row-label">Row ${escapeHtml(section.row)} · ${escapeHtml(section.group || "Document")}</div>
          </div>
          ${section.isGroup ? "" : `<button type="button" data-use-section="${escapeHtml(section.id)}">Focus</button>`}
        </div>
        ${summary ? `<div class="section-summary"><div class="detail-label">Summary</div><p>${escapeHtml(summary)}</p></div>` : ""}
        ${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}
      </article>
    `;
  }

  function renderAll() {
    renderProjectControls();
    renderMetrics();
    renderIssueList();
    renderSelectedIssue();
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
      pendingIssueState.set(issue.id, next);
      scheduleRemoteIssueStateSave(issue.id);
      showSaveState("Saving", "dirty");
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

  function scheduleRemoteIssueStateSave(issueId) {
    window.clearTimeout(remoteSaveTimers.get(issueId));
    remoteSaveTimers.set(
      issueId,
      window.setTimeout(async () => {
        try {
          await saveRemoteIssueState(issueId);
          await loadIssueEvents(issueId);
          renderSelectedIssue();
          renderIssueList();
          showSaveState("Synced", "saved");
        } catch (error) {
          console.error(error);
          showSaveState("Save failed", "dirty");
        }
      }, 650)
    );
  }

  async function saveRemoteIssueState(issueId) {
    assertRemote();
    const next = pendingIssueState.get(issueId);
    if (!next) return;
    const payload = {
      issue_id: issueId,
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
    };
    const { data, error } = await db
      .from("issue_states")
      .upsert(payload, { onConflict: "issue_id" })
      .select()
      .single();
    if (error) throw error;
    app.issueStates.set(issueId, normalizeState(data));
    pendingIssueState.delete(issueId);
  }

  async function setSelectedIssue(issueId) {
    state.selectedId = issueId;
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
    renderIssueList();
    renderSelectedIssue();
    renderDocument();
  }

  async function createCustomIssue() {
    const title = els.newIssueTitle.value.trim();
    if (!title) return;
    const sectionId = els.newIssueSection.value;
    const issueType = els.newIssueType.value;
    const prompt = els.newIssuePrompt.value.trim() || title;

    if (app.mode === "remote") {
      assertRemote();
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
    app.localWorkspace = { answers: {}, customIssues: [], lastSelectedId: "", lastProjectId: "" };
    loadLocalSeed();
    renderFilters();
    renderAll();
    showSaveState("Reset", "saved");
  }

  function bindEvents() {
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
      if (els.projectSelect.value) {
        await loadProject(els.projectSelect.value);
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
        issue?.termSectionIds?.[0] ||
        termSections().find((section) => !section.isGroup)?.id ||
        "";
      els.newIssueSection.value = defaultSection;
      if (els.newIssueDialog.showModal) {
        els.newIssueDialog.showModal();
      }
    });

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
    } catch (error) {
      console.error(error);
      els.setupMessage.textContent = error.message || "Could not connect to Supabase.";
      setMode("setup");
    }
  }

  init();
})();
