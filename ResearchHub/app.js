const SCORE_WEIGHTS = {
  novelty: 0.2,
  feasibility: 0.18,
  evidence: 0.24,
  funding: 0.14,
  urgency: 0.12,
  teamFit: 0.12
};
const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const SCORE_FIELD_LABELS = {
  novelty: "Tính mới",
  feasibility: "Tính khả thi",
  evidence: "Bằng chứng",
  funding: "Tiềm năng tài trợ",
  urgency: "Mức cấp thiết",
  teamFit: "Phù hợp với nhóm"
};

const PRIORITY_LABELS = { Critical: "Nghiêm trọng", High: "Cao", Medium: "Trung bình", Low: "Thấp" };
const IMPACT_LABELS = { Transformative: "Đột phá", High: "Cao", Medium: "Trung bình", Low: "Thấp" };
const STATUS_LABELS = {
  "Needs Triage": "Cần phân loại",
  "Scoping": "Xác định phạm vi",
  "Literature Review": "Tổng quan tài liệu",
  "Experiment Design": "Thiết kế thí nghiệm",
  "Active": "Đang triển khai",
  "Writing": "Đang viết bài",
  "Published": "Đã công bố",
  "Archived": "Lưu trữ"
};
const EVIDENCE_LEVEL_LABELS = { Strong: "Mạnh", Moderate: "Trung bình", Weak: "Yếu", Unrated: "Chưa đánh giá" };
const ACTION_STATUS_LABELS = { Open: "Đang mở", Done: "Hoàn thành" };
const DECISION_TYPE_LABELS = { Accept: "Chấp nhận", Revisit: "Xem lại", Pause: "Tạm dừng", Reject: "Từ chối" };
const ALL_LABELS = Object.assign({}, PRIORITY_LABELS, IMPACT_LABELS, STATUS_LABELS, EVIDENCE_LEVEL_LABELS, ACTION_STATUS_LABELS, DECISION_TYPE_LABELS);

function tr(value) {
  return ALL_LABELS[value] || value;
}

const state = {
  topics: [],
  activeView: "overview",
  editingId: null,
  editingUpdatedAt: null,
  lastDeleted: null,
  online: true,
  loadFailed: false,
  userEmail: ""
};

const els = {
  tableRows: document.querySelector("#tableRows"),
  tableHead: document.querySelector("#tableHead"),
  dataTable: document.querySelector(".data-table"),
  auxiliaryView: document.querySelector("#auxiliaryView"),
  searchInput: document.querySelector("#searchInput"),
  priorityFilter: document.querySelector("#priorityFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  evidenceFilter: document.querySelector("#evidenceFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  topicDialog: document.querySelector("#topicDialog"),
  detailDialog: document.querySelector("#detailDialog"),
  backupsDialog: document.querySelector("#backupsDialog"),
  backupsContent: document.querySelector("#backupsContent"),
  topicForm: document.querySelector("#topicForm"),
  detailContent: document.querySelector("#detailContent"),
  toast: document.querySelector("#toast"),
  papersList: document.querySelector("#papersList"),
  actionsList: document.querySelector("#actionsList"),
  decisionsList: document.querySelector("#decisionsList")
};

const viewText = {
  overview: ["Tổng quan", "Tổng quan danh mục", "So sánh các chủ đề nghiên cứu theo mức ưu tiên, tác động, bằng chứng, người phụ trách và mức độ sẵn sàng."],
  topics: ["Chủ đề", "Danh mục chủ đề nghiên cứu", "Quản lý chủ đề, chấm điểm, bằng chứng, người đóng góp, hành động và quyết định."],
  pipeline: ["Quy trình", "Quy trình nghiên cứu", "Theo dõi từng ý tưởng đang ở giai đoạn nào, từ phân loại đến công bố."],
  papers: ["Tài liệu", "Thư viện nghiên cứu liên quan", "Xem tất cả tài liệu, nguồn, DOI/URL, kết quả, mức liên quan và độ tin cậy đã liên kết."],
  decisions: ["Quyết định", "Nhật ký quyết định và hành động tiếp theo", "Rà soát các quyết định và công việc còn mở gắn với từng chủ đề nghiên cứu."],
  graph: ["Sơ đồ", "Sơ đồ tri thức chủ đề - tài liệu", "Xem mối quan hệ giữa chủ đề, tài liệu và thẻ gắn nhãn dưới dạng mạng lưới."],
  synthesis: ["Tổng hợp", "Tổng hợp danh mục", "Tạo bản tóm tắt quản lý nghiên cứu có cấu trúc từ danh mục hiện tại."]
};

async function fetchTopicsFromServer() {
  const response = await fetch("/api/topics");
  if (!response.ok) throw new Error("Failed to load topics from server.");
  const payload = await response.json();
  if (!Array.isArray(payload.topics)) throw new Error("Malformed topics response.");
  return payload.topics.map(normalizeTopic);
}

function updateStatusStrip() {
  const status = document.querySelector("#statusText");
  if (!state.online) {
    status.classList.add("offline");
    status.innerHTML = "<span></span>Mất kết nối - đang tự động thử lại...";
    return;
  }
  status.classList.remove("offline");
  const who = state.userEmail ? `Đã đăng nhập: ${escapeHtml(state.userEmail)}. ` : "";
  status.innerHTML = `<span></span>${who}Không gian làm việc chung của nhóm - dữ liệu tự động đồng bộ.`;
}

function setOnline(online) {
  if (state.online === online) return;
  state.online = online;
  updateStatusStrip();
}

async function createTopic(topic) {
  const response = await fetch("/api/topics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(topic)
  });
  if (!response.ok) throw new Error("Failed to save topic.");
  const payload = await response.json();
  return normalizeTopic(payload.topic);
}

async function updateTopic(id, topic, expectedUpdatedAt) {
  const response = await fetch(`/api/topics/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic, expectedUpdatedAt })
  });
  if (response.status === 409) {
    const payload = await response.json();
    return { conflict: true, serverTopic: normalizeTopic(payload.serverTopic) };
  }
  if (!response.ok) throw new Error("Failed to save topic.");
  const payload = await response.json();
  return { topic: normalizeTopic(payload.topic) };
}

async function deleteTopicRemote(id) {
  const response = await fetch(`/api/topics/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete topic.");
}

async function pollTopics() {
  if (els.topicDialog.open || els.detailDialog.open || els.backupsDialog.open) return;
  try {
    state.topics = await fetchTopicsFromServer();
    setOnline(true);
    if (state.loadFailed) {
      state.loadFailed = false;
      showToast("Đã kết nối lại - đã tải dữ liệu mới nhất của nhóm.");
    }
    render();
  } catch (error) {
    console.warn(error);
    setOnline(false);
  }
}

async function loadWhoami() {
  try {
    const response = await fetch("/api/whoami");
    if (!response.ok) return;
    const payload = await response.json();
    if (payload.email) {
      state.userEmail = payload.email;
      updateStatusStrip();
    }
  } catch (error) {
    console.warn(error);
  }
}

function formatUpdated(topic) {
  if (!topic.updatedAt) return "";
  const date = new Date(topic.updatedAt);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  let when;
  if (minutes < 1) when = "vừa xong";
  else if (minutes < 60) when = `${minutes} phút trước`;
  else if (minutes < 1440) when = `${Math.round(minutes / 60)} giờ trước`;
  else when = date.toLocaleDateString("vi-VN");
  const by = topic.updatedBy && topic.updatedBy !== "local-dev@example.com" ? ` bởi ${topic.updatedBy}` : "";
  return `Cập nhật ${when}${by}`;
}

function normalizeTopic(topic) {
  return {
    id: topic.id || `t${Date.now()}`,
    title: topic.title || "Chủ đề chưa đặt tên",
    owner: topic.owner || "Chưa phân công",
    contributors: Array.isArray(topic.contributors) ? topic.contributors : [],
    status: topic.status || "Needs Triage",
    priority: topic.priority || "Medium",
    impact: topic.impact || "Medium",
    novelty: clampScore(topic.novelty ?? 50),
    feasibility: clampScore(topic.feasibility ?? 50),
    evidence: clampScore(topic.evidence ?? 50),
    funding: clampScore(topic.funding ?? 50),
    urgency: clampScore(topic.urgency ?? 50),
    teamFit: clampScore(topic.teamFit ?? 50),
    rationale: topic.rationale || "",
    question: topic.question || "",
    gap: topic.gap || "",
    method: topic.method || "",
    description: topic.description || "",
    tags: Array.isArray(topic.tags) ? topic.tags : [],
    papers: Array.isArray(topic.papers) ? topic.papers.map(normalizePaper) : [],
    actions: Array.isArray(topic.actions) ? topic.actions.map(normalizeAction) : [],
    decisions: Array.isArray(topic.decisions) ? topic.decisions.map(normalizeDecision) : [],
    updatedAt: topic.updatedAt || new Date().toISOString(),
    updatedBy: topic.updatedBy || ""
  };
}

function normalizePaper(paper) {
  if (Array.isArray(paper)) {
    return {
      title: paper[0] || "",
      authors: paper[1] || "",
      source: paper[2] || "",
      journal: paper[2] || "",
      year: paper[3] || "",
      doi: paper[4] || "",
      url: paper[5] || "",
      studyType: paper[6] || "",
      sampleSize: paper[7] || "",
      finding: paper[8] || "",
      relevance: paper[9] || "",
      evidenceLevel: paper[10] || "Moderate",
      confidence: paper[10] || "Medium",
      limitations: paper[11] || ""
    };
  }
  return {
    title: paper.title || "",
    authors: paper.authors || "",
    source: paper.source || paper.journal || "",
    journal: paper.journal || paper.source || "",
    year: paper.year || "",
    doi: paper.doi || "",
    url: paper.url || "",
    studyType: paper.studyType || "",
    sampleSize: paper.sampleSize || "",
    finding: paper.finding || "",
    relevance: paper.relevance || "",
    evidenceLevel: paper.evidenceLevel || paper.confidence || "Moderate",
    confidence: paper.confidence || paper.evidenceLevel || "Medium",
    limitations: paper.limitations || ""
  };
}

function normalizeAction(action) {
  if (Array.isArray(action)) return { title: action[0] || "", owner: action[1] || "", due: action[2] || "", status: action[3] || "Open" };
  return { title: action.title || "", owner: action.owner || "", due: action.due || "", status: action.status || "Open" };
}

function normalizeDecision(decision) {
  if (Array.isArray(decision)) return {
    type: decision[0] || "Accept",
    decision: decision[1] || "",
    reason: decision[2] || "",
    evidenceUsed: decision[3] || "",
    alternatives: decision[4] || "",
    risk: decision[5] || "",
    reviewer: decision[6] || "",
    by: decision[6] || "",
    date: decision[7] || "",
    revisit: decision[8] || ""
  };
  return {
    type: decision.type || "Accept",
    decision: decision.decision || "",
    reason: decision.reason || "",
    evidenceUsed: decision.evidenceUsed || "",
    alternatives: decision.alternatives || "",
    risk: decision.risk || "",
    reviewer: decision.reviewer || decision.by || "",
    by: decision.by || decision.reviewer || "",
    date: decision.date || "",
    revisit: decision.revisit || ""
  };
}

function selectOptions(options, current, labels = {}) {
  return options.map((option) => `<option value="${escapeHtml(option)}" ${option === current ? "selected" : ""}>${escapeHtml(labels[option] || option)}</option>`).join("");
}

function renderPaperRow(paper = {}) {
  return `<article class="repeatable-item paper-item">
    <div class="repeatable-item-grid">
      <label>Tiêu đề<input type="text" data-field="title" value="${escapeHtml(paper.title)}"></label>
      <label>Tác giả<input type="text" data-field="authors" value="${escapeHtml(paper.authors)}"></label>
      <label>Nguồn / Tạp chí<input type="text" data-field="source" value="${escapeHtml(paper.source || paper.journal || "")}"></label>
      <label>Năm<input type="number" data-field="year" value="${escapeHtml(paper.year)}" min="1900" max="2100"></label>
      <label>DOI<input type="text" data-field="doi" value="${escapeHtml(paper.doi)}"></label>
      <label>URL<input type="url" data-field="url" value="${escapeHtml(paper.url)}"></label>
      <label>Loại nghiên cứu<input type="text" data-field="studyType" value="${escapeHtml(paper.studyType)}"></label>
      <label>Mẫu / Bộ dữ liệu<input type="text" data-field="sampleSize" value="${escapeHtml(paper.sampleSize)}"></label>
      <label class="span-2">Kết quả chính<input type="text" data-field="finding" value="${escapeHtml(paper.finding)}"></label>
      <label class="span-2">Mức độ liên quan<input type="text" data-field="relevance" value="${escapeHtml(paper.relevance)}"></label>
      <label>Mức độ bằng chứng<select data-field="evidenceLevel">${selectOptions(["Strong", "Moderate", "Weak"], paper.evidenceLevel || "Moderate", EVIDENCE_LEVEL_LABELS)}</select></label>
      <label class="span-2">Hạn chế<input type="text" data-field="limitations" value="${escapeHtml(paper.limitations)}"></label>
    </div>
    <button type="button" class="inline-button danger-inline" data-remove-row>Xoá</button>
  </article>`;
}

function renderActionRow(action = {}) {
  return `<article class="repeatable-item action-item">
    <input type="text" data-field="title" placeholder="Hành động" value="${escapeHtml(action.title)}">
    <input type="text" data-field="owner" placeholder="Người phụ trách" value="${escapeHtml(action.owner)}">
    <input type="date" data-field="due" value="${escapeHtml(action.due)}">
    <select data-field="status">${selectOptions(["Open", "Done"], action.status || "Open", ACTION_STATUS_LABELS)}</select>
    <button type="button" class="inline-button danger-inline" data-remove-row>Xoá</button>
  </article>`;
}

function renderDecisionRow(decision = {}) {
  return `<article class="repeatable-item decision-item">
    <div class="repeatable-item-grid">
      <label>Loại<select data-field="type">${selectOptions(["Accept", "Revisit", "Pause", "Reject"], decision.type || "Accept", DECISION_TYPE_LABELS)}</select></label>
      <label>Người xét duyệt<input type="text" data-field="reviewer" value="${escapeHtml(decision.reviewer || decision.by || "")}"></label>
      <label>Ngày<input type="date" data-field="date" value="${escapeHtml(decision.date)}"></label>
      <label>Ngày xem lại<input type="date" data-field="revisit" value="${escapeHtml(decision.revisit)}"></label>
      <label class="span-2">Quyết định<input type="text" data-field="decision" value="${escapeHtml(decision.decision)}"></label>
      <label class="span-2">Lý do<input type="text" data-field="reason" value="${escapeHtml(decision.reason)}"></label>
      <label class="span-2">Bằng chứng sử dụng<input type="text" data-field="evidenceUsed" value="${escapeHtml(decision.evidenceUsed)}"></label>
      <label class="span-2">Phương án khác đã xét<input type="text" data-field="alternatives" value="${escapeHtml(decision.alternatives)}"></label>
      <label class="span-2">Rủi ro<input type="text" data-field="risk" value="${escapeHtml(decision.risk)}"></label>
    </div>
    <button type="button" class="inline-button danger-inline" data-remove-row>Xoá</button>
  </article>`;
}

function addRow(container, renderFn, data = {}) {
  container.insertAdjacentHTML("beforeend", renderFn(data));
}

function clearRows(container) {
  container.innerHTML = "";
}

function collectRows(container, fields) {
  return Array.from(container.querySelectorAll(".repeatable-item")).map((item) => {
    const record = {};
    fields.forEach((field) => {
      const input = item.querySelector(`[data-field="${field}"]`);
      record[field] = input ? input.value : "";
    });
    return record;
  });
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function topicScore(topic) {
  return Math.round(
    topic.novelty * SCORE_WEIGHTS.novelty +
      topic.feasibility * SCORE_WEIGHTS.feasibility +
      topic.evidence * SCORE_WEIGHTS.evidence +
      topic.funding * SCORE_WEIGHTS.funding +
      topic.urgency * SCORE_WEIGHTS.urgency +
      topic.teamFit * SCORE_WEIGHTS.teamFit
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badgeClass(value) {
  return String(value).toLowerCase().replace(/\s+/g, "-");
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(action) {
  return action.status !== "Done" && action.due && action.due < todayString();
}

function titleKey(title) {
  return String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function duplicateTopicIds() {
  const seen = new Map();
  const duplicateIds = new Set();
  state.topics.forEach((topic) => {
    const key = titleKey(topic.title);
    if (!key) return;
    if (seen.has(key)) {
      duplicateIds.add(topic.id);
      duplicateIds.add(seen.get(key));
    }
    seen.set(key, topic.id);
  });
  return duplicateIds;
}

function dedupeByKey(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function mergeTopic(anchorId) {
  const anchor = state.topics.find((topic) => topic.id === anchorId);
  if (!anchor) return;
  const key = titleKey(anchor.title);
  const group = state.topics.filter((topic) => titleKey(topic.title) === key);
  if (group.length < 2) return;
  const primary = [...group].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  const others = group.filter((topic) => topic.id !== primary.id);
  const mergedPapers = dedupeByKey([...primary.papers, ...others.flatMap((topic) => topic.papers)], (paper) => (paper.doi || paper.url || paper.title || "").toLowerCase().trim());
  const mergedActions = dedupeByKey([...primary.actions, ...others.flatMap((topic) => topic.actions)], (action) => action.title.toLowerCase().trim());
  const mergedDecisions = dedupeByKey([...primary.decisions, ...others.flatMap((topic) => topic.decisions)], (decision) => decision.decision.toLowerCase().trim());
  const mergedTags = Array.from(new Set([...primary.tags, ...others.flatMap((topic) => topic.tags)]));
  const mergedContributors = Array.from(new Set([...primary.contributors, ...others.flatMap((topic) => topic.contributors)]));

  const confirmed = window.confirm(
    `Gộp ${group.length} chủ đề trùng tên "${primary.title}"?\n\nGiữ lại: "${primary.title}" (cập nhật gần nhất)\nXoá: ${others.map((topic) => `"${topic.title}"`).join(", ")}\n\nKết quả gộp: ${mergedPapers.length} tài liệu, ${mergedActions.length} hành động, ${mergedDecisions.length} quyết định.`
  );
  if (!confirmed) return;

  const draft = normalizeTopic({
    ...primary,
    papers: mergedPapers,
    actions: mergedActions,
    decisions: mergedDecisions,
    tags: mergedTags,
    contributors: mergedContributors,
    updatedAt: new Date().toISOString()
  });
  try {
    const result = await updateTopic(primary.id, draft, primary.updatedAt);
    if (result.conflict) {
      showToast("Người khác vừa cập nhật chủ đề này - tải lại và thử gộp lại.");
      state.topics = await fetchTopicsFromServer();
      render();
      return;
    }
    await Promise.all(others.map((topic) => deleteTopicRemote(topic.id)));
    state.topics = await fetchTopicsFromServer();
    render();
    showToast(`Đã gộp ${group.length} chủ đề trùng lặp vào "${primary.title}".`);
  } catch (error) {
    console.warn(error);
    showToast("Không thể gộp chủ đề. Vui lòng thử lại.");
  }
}

async function removeDuplicatePaper(topicId, index) {
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic || !topic.papers[index]) return;
  const removed = topic.papers[index];
  if (!window.confirm(`Xoá "${removed.title || "tài liệu này"}" khỏi "${topic.title}"? Chỉ xoá bản trùng, không xoá chủ đề.`)) return;
  const nextPapers = topic.papers.filter((_, i) => i !== index);
  const draft = normalizeTopic({ ...topic, papers: nextPapers, updatedAt: new Date().toISOString() });
  try {
    const result = await updateTopic(topic.id, draft, topic.updatedAt);
    if (result.conflict) {
      showToast("Người khác vừa cập nhật chủ đề này - tải lại và thử lại.");
      state.topics = await fetchTopicsFromServer();
      render();
      return;
    }
    state.topics = state.topics.map((item) => item.id === result.topic.id ? result.topic : item);
    render();
    showToast("Đã xoá tài liệu trùng lặp.");
  } catch (error) {
    console.warn(error);
    showToast("Không thể xoá tài liệu trùng lặp.");
  }
}

function duplicatePaperKeys() {
  const seen = new Map();
  const dupes = new Set();
  state.topics.forEach((topic) => {
    topic.papers.forEach((paper) => {
      const key = (paper.doi || paper.url || paper.title).toLowerCase().trim();
      if (!key) return;
      if (seen.has(key)) dupes.add(key);
      seen.set(key, true);
    });
  });
  return dupes;
}

function parseList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function filteredTopics() {
  const query = els.searchInput.value.trim().toLowerCase();
  const priority = els.priorityFilter.value;
  const status = els.statusFilter.value;
  const evidenceMode = els.evidenceFilter.value;
  const duplicateIds = duplicateTopicIds();
  const topics = state.topics.filter((topic) => {
    const haystack = [
      topic.title, topic.owner, topic.contributors.join(" "), topic.status, topic.priority, topic.impact,
      topic.question, topic.gap, topic.method, topic.description, topic.rationale, topic.tags.join(" "),
      topic.papers.map((paper) => Object.values(paper).join(" ")).join(" "),
      topic.actions.map((action) => Object.values(action).join(" ")).join(" "),
      topic.decisions.map((decision) => Object.values(decision).join(" ")).join(" ")
    ].join(" ").toLowerCase();
    const evidencePass =
      evidenceMode === "all" ||
      (evidenceMode === "gap" && (topic.evidence < 60 || topic.papers.length === 0)) ||
      (evidenceMode === "strong" && topic.evidence >= 75 && topic.papers.some((paper) => ["Strong", "High"].includes(paper.evidenceLevel))) ||
      (evidenceMode === "noDecision" && topic.decisions.length === 0) ||
      (evidenceMode === "overdue" && topic.actions.some(isOverdue)) ||
      (evidenceMode === "duplicateRisk" && duplicateIds.has(topic.id));
    return (!query || haystack.includes(query)) &&
      (priority === "all" || topic.priority === priority) &&
      (status === "all" || topic.status === status) &&
      evidencePass;
  });
  return sortTopics(topics);
}

function sortTopics(topics) {
  const sorted = [...topics];
  const mode = els.sortSelect.value;
  if (mode === "titleAsc") sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (mode === "updatedDesc") sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (mode === "evidenceAsc") sorted.sort((a, b) => a.evidence - b.evidence);
  if (mode === "priorityDesc") sorted.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));
  if (mode === "scoreDesc") sorted.sort((a, b) => topicScore(b) - topicScore(a));
  return sorted;
}

function flatPapers() {
  return filteredTopics().flatMap((topic) => topic.papers.map((paper, index) => ({ topic, paper, index })));
}

function flatActions() {
  return filteredTopics().flatMap((topic) => topic.actions.map((action) => ({ topic, action })));
}

function flatDecisions() {
  return filteredTopics().flatMap((topic) => topic.decisions.map((decision) => ({ topic, decision })));
}

function flatAllPapers() {
  return state.topics.flatMap((topic) => topic.papers.map((paper) => ({ topic, paper })));
}

function setColumns(columns, headers) {
  els.dataTable.style.setProperty("--table-columns", columns);
  els.tableHead.innerHTML = headers.map((header) => `<span>${header}</span>`).join("");
}

function render() {
  renderHeader();
  renderMetrics();
  renderAuxiliary();
  renderTable();
}

function renderHeader() {
  const [eyebrow, title, subtitle] = viewText[state.activeView];
  document.querySelector("#viewEyebrow").textContent = eyebrow;
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewSubtitle").textContent = subtitle;
}

function renderMetrics() {
  const high = state.topics.filter((topic) => ["Critical", "High"].includes(topic.priority)).length;
  const paperCount = state.topics.reduce((sum, topic) => sum + topic.papers.length, 0);
  const openActions = state.topics.reduce((sum, topic) => sum + topic.actions.filter((action) => action.status !== "Done").length, 0);
  const avgScore = state.topics.length ? Math.round(state.topics.reduce((sum, topic) => sum + topicScore(topic), 0) / state.topics.length) : 0;
  document.querySelector("#metricTopics").textContent = state.topics.length;
  document.querySelector("#metricPriority").textContent = high;
  document.querySelector("#metricPapers").textContent = paperCount;
  document.querySelector("#metricActions").textContent = openActions;
  document.querySelector("#metricScore").textContent = avgScore;
  document.querySelector("#healthMeter").style.width = `${avgScore}%`;
  document.querySelector("#healthText").textContent = `${avgScore}/100 điểm trung bình danh mục`;
}

function renderAuxiliary() {
  if (state.activeView === "pipeline") {
    const stages = ["Needs Triage", "Scoping", "Literature Review", "Experiment Design", "Active", "Writing", "Published", "Archived"];
    const countCards = `<div class="pipeline-grid">${stages.map((stage) => {
      const count = state.topics.filter((topic) => topic.status === stage).length;
      return `<button class="pipeline-card" type="button" data-status="${escapeHtml(stage)}"><span>${escapeHtml(tr(stage))}</span><strong>${count}</strong></button>`;
    }).join("")}</div>`;
    const boardStages = ["Needs Triage", "Scoping", "Literature Review", "Experiment Design"];
    const board = `<div class="kanban-board">${boardStages.map((stage) => {
      const topics = state.topics.filter((topic) => topic.status === stage).sort((a, b) => topicScore(b) - topicScore(a));
      return `<section class="kanban-column"><h3>${escapeHtml(tr(stage))}</h3>${topics.map((topic) => `<article class="kanban-card"><strong>${escapeHtml(topic.title)}</strong><small>${escapeHtml(topic.owner)} - ${topicScore(topic)}/100</small></article>`).join("") || '<p class="muted">Không có chủ đề</p>'}</section>`;
    }).join("")}</div>`;
    els.auxiliaryView.innerHTML = countCards + board;
    return;
  }

  if (state.activeView === "overview") {
    const needsEvidence = state.topics.filter((topic) => topic.papers.length === 0 || topic.evidence < 50).length;
    const noDecision = state.topics.filter((topic) => topic.decisions.length === 0).length;
    const fundingReady = state.topics.filter((topic) => topic.funding >= 75).length;
    const overdue = state.topics.reduce((sum, topic) => sum + topic.actions.filter(isOverdue).length, 0);
    const duplicateTopics = duplicateTopicIds().size;
    const duplicatePapers = duplicatePaperKeys().size;
    const matrix = matrixCounts();
    els.auxiliaryView.innerHTML = `
      <div class="insight-grid">
        <article class="insight-card"><span>Cần rà soát bằng chứng</span><strong>${needsEvidence}</strong></article>
        <article class="insight-card"><span>Chưa có quyết định</span><strong>${noDecision}</strong></article>
        <article class="insight-card"><span>Sẵn sàng tài trợ</span><strong>${fundingReady}</strong></article>
        <article class="insight-card"><span>Hành động quá hạn</span><strong>${overdue}</strong></article>
        <article class="insight-card"><span>Rủi ro trùng lặp</span><strong>${duplicateTopics + duplicatePapers}</strong></article>
        <article class="insight-card"><span>Chủ đề đang triển khai</span><strong>${state.topics.filter((topic) => !["Published", "Archived"].includes(topic.status)).length}</strong></article>
      </div>
      <div class="overview-board">
        <section class="matrix-panel">
          <p class="eyebrow">Ma trận ưu tiên - tác động</p>
          <div class="matrix-grid">
            <span></span><span class="matrix-label">Tác động trung bình</span><span class="matrix-label">Tác động cao</span><span class="matrix-label">Đột phá</span>
            <span class="matrix-label">Nghiêm trọng</span>${matrixCell(matrix.criticalMedium)}${matrixCell(matrix.criticalHigh, true)}${matrixCell(matrix.criticalTransformative, true)}
            <span class="matrix-label">Cao</span>${matrixCell(matrix.highMedium)}${matrixCell(matrix.highHigh)}${matrixCell(matrix.highTransformative, true)}
            <span class="matrix-label">Khác</span>${matrixCell(matrix.otherMedium)}${matrixCell(matrix.otherHigh)}${matrixCell(matrix.otherTransformative)}
          </div>
        </section>
        <section class="quality-panel">
          <p class="eyebrow">Danh sách kiểm tra chất lượng dữ liệu</p>
          <div class="quality-list">
            ${qualityItem("Đầy đủ thông tin bằng chứng", state.topics.filter((topic) => topic.papers.every(paperHasCoreMetadata)).length, state.topics.length)}
            ${qualityItem("Đã ghi lý do quyết định", state.topics.filter((topic) => topic.decisions.length && topic.decisions.every((d) => d.reason && d.evidenceUsed)).length, state.topics.length)}
            ${qualityItem("Đã ghi lý do chấm điểm", state.topics.filter((topic) => topic.rationale).length, state.topics.length)}
            ${qualityItem("Không có hành động quá hạn", state.topics.filter((topic) => !topic.actions.some(isOverdue)).length, state.topics.length)}
          </div>
        </section>
      </div>`;
    return;
  }

  if (state.activeView === "graph") {
    els.auxiliaryView.innerHTML = `
      <div class="chart-grid">
        <section class="chart-panel">
          <p class="eyebrow">Phân bố điểm số</p>
          ${scoreBands().map((band) => barRow(band.label, band.count, state.topics.length)).join("")}
        </section>
        <section class="chart-panel">
          <p class="eyebrow">Chất lượng bằng chứng</p>
          ${evidenceBands().map((band) => barRow(tr(band.label), band.count, Math.max(1, flatAllPapers().length))).join("")}
        </section>
      </div>`;
    return;
  }

  if (state.activeView === "topics") {
    const top = [...state.topics].sort((a, b) => topicScore(b) - topicScore(a)).slice(0, 3);
    els.auxiliaryView.innerHTML = `<div class="insight-grid">${top.map((topic) => `<article class="insight-card"><span>Ưu tiên ${escapeHtml(tr(topic.priority))}</span><strong>${topicScore(topic)}</strong><small class="muted">${escapeHtml(topic.title)}</small></article>`).join("")}</div>`;
    return;
  }

  els.auxiliaryView.innerHTML = "";
}

function renderTable() {
  if (state.activeView === "papers") return renderPapers();
  if (state.activeView === "decisions") return renderDecisions();
  if (state.activeView === "graph") return renderGraph();
  if (state.activeView === "synthesis") return renderSynthesis();
  return renderTopics();
}

function scoreBands() {
  return [
    { label: "80-100", count: state.topics.filter((topic) => topicScore(topic) >= 80).length },
    { label: "65-79", count: state.topics.filter((topic) => topicScore(topic) >= 65 && topicScore(topic) < 80).length },
    { label: "50-64", count: state.topics.filter((topic) => topicScore(topic) >= 50 && topicScore(topic) < 65).length },
    { label: "<50", count: state.topics.filter((topic) => topicScore(topic) < 50).length }
  ];
}

function evidenceBands() {
  const papers = flatAllPapers();
  return ["Strong", "Moderate", "Weak", "Unrated"].map((label) => ({
    label,
    count: papers.filter(({ paper }) => (paper.evidenceLevel || "Unrated") === label).length
  }));
}

function barRow(label, count, total) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return `<div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><i style="width:${pct}%"></i></div><strong>${count}</strong></div>`;
}

function matrixCounts() {
  const groups = {
    criticalMedium: 0,
    criticalHigh: 0,
    criticalTransformative: 0,
    highMedium: 0,
    highHigh: 0,
    highTransformative: 0,
    otherMedium: 0,
    otherHigh: 0,
    otherTransformative: 0
  };
  state.topics.forEach((topic) => {
    const priority = topic.priority === "Critical" ? "critical" : topic.priority === "High" ? "high" : "other";
    const impact = topic.impact === "Transformative" ? "Transformative" : topic.impact === "High" ? "High" : "Medium";
    groups[`${priority}${impact}`] += 1;
  });
  return groups;
}

function matrixCell(count, focus = false) {
  return `<div class="matrix-cell ${focus ? "focus" : ""}"><strong>${count}</strong><small>chủ đề</small></div>`;
}

function paperHasCoreMetadata(paper) {
  return paper.title && (paper.doi || paper.url) && paper.year && paper.evidenceLevel && paper.finding && paper.limitations;
}

function qualityItem(label, done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="quality-item"><span>${escapeHtml(label)}<small class="muted"> ${done}/${total}</small></span><strong>${pct}%</strong></div>`;
}

function renderTopics() {
  const duplicateIds = duplicateTopicIds();
  setColumns("minmax(300px,1.45fr) 96px 110px 118px 118px 118px minmax(230px,1fr) 166px", ["Chủ đề nghiên cứu", "Ưu tiên", "Tác động", "Điểm", "Bằng chứng", "Người phụ trách", "Tài liệu liên quan", "Thao tác"]);
  const topics = filteredTopics();
  if (!topics.length) return emptyTable("Không tìm thấy chủ đề nào", "Thay đổi tìm kiếm/bộ lọc, hoặc thêm chủ đề nghiên cứu mới.");
  els.tableRows.innerHTML = topics.map((topic) => `
    <div class="table-row">
      <span class="cell-title">
        <strong>${escapeHtml(topic.title)}</strong>
        <small>${escapeHtml(tr(topic.status))} - ${escapeHtml(topic.question)}</small>
        <small class="muted">${escapeHtml(formatUpdated(topic))}</small>
        <span class="tag-list">${duplicateIds.has(topic.id) ? '<span class="badge high-risk">Nghi trùng lặp</span>' : ""}${topic.actions.some(isOverdue) ? '<span class="badge open">Quá hạn</span>' : ""}${topic.tags.slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</span>
      </span>
      <span class="badge ${escapeHtml(badgeClass(topic.priority))}">${escapeHtml(tr(topic.priority))}</span>
      <span class="badge ${escapeHtml(badgeClass(topic.impact))}">${escapeHtml(tr(topic.impact))}</span>
      ${scoreCell(topicScore(topic))}
      ${scoreCell(topic.evidence)}
      <span class="muted">${escapeHtml(topic.owner)}</span>
      <span class="link-list">${topic.papers.slice(0, 2).map((paper) => paperLink(paper)).join("") || '<span class="muted">Chưa có tài liệu</span>'}</span>
      ${actionButtons(topic.id, false, duplicateIds.has(topic.id) ? mergeButton(topic.id) : "")}
    </div>
  `).join("");
}

function renderPapers() {
  const duplicatePapers = duplicatePaperKeys();
  setColumns("minmax(280px,1.2fr) minmax(210px,.9fr) 96px 130px minmax(220px,1fr) 116px 150px", ["Tài liệu / nguồn", "Chủ đề", "Năm", "Loại nghiên cứu", "Kết quả chính", "Bằng chứng", "Thao tác"]);
  const rows = flatPapers();
  if (!rows.length) return emptyTable("Không tìm thấy tài liệu nào", "Thêm tài liệu liên quan trong một chủ đề để hiển thị ở đây.");
  els.tableRows.innerHTML = rows.map(({ topic, paper, index }) => {
    const key = (paper.doi || paper.url || paper.title || "").toLowerCase().trim();
    const isDup = Boolean(key) && duplicatePapers.has(key);
    return `
    <div class="table-row">
      <span class="cell-title"><strong>${paperLink(paper)}</strong><small>${escapeHtml([paper.authors, paper.source || paper.journal, paper.doi].filter(Boolean).join(" - ") || "Chưa có nguồn") }</small>${isDup ? '<span class="badge high-risk">Trùng lặp</span>' : ""}</span>
      <span class="muted">${escapeHtml(topic.title)}</span>
      <span class="muted">${escapeHtml(paper.year || "—")}</span>
      <span class="muted">${escapeHtml(paper.studyType || "—")}</span>
      <span class="muted">${escapeHtml(paper.finding || "Chưa ghi kết quả")}</span>
      <span class="badge ${escapeHtml(badgeClass(paper.evidenceLevel))}">${escapeHtml(tr(paper.evidenceLevel || "Moderate"))}</span>
      ${actionButtons(topic.id, true, isDup ? `<button class="inline-button danger-inline" type="button" data-action="remove-duplicate-paper" data-id="${escapeHtml(topic.id)}" data-index="${index}">Xoá bản trùng</button>` : "")}
    </div>
  `;
  }).join("");
}

function renderDecisions() {
  setColumns("minmax(260px,1.1fr) minmax(230px,.9fr) minmax(180px,.8fr) minmax(180px,.8fr) 120px 120px 150px", ["Quyết định / hành động", "Chủ đề", "Lý do / người phụ trách", "Bằng chứng / rủi ro", "Ngày / hạn", "Trạng thái", "Thao tác"]);
  const decisionRows = flatDecisions().map(({ topic, decision }) => ({ type: "decision", topic, item: decision }));
  const actionRows = flatActions().map(({ topic, action }) => ({ type: "action", topic, item: action }));
  const rows = [...decisionRows, ...actionRows];
  if (!rows.length) return emptyTable("Không tìm thấy quyết định hoặc hành động nào", "Thêm mục nhật ký quyết định hoặc hành động tiếp theo vào một chủ đề.");
  els.tableRows.innerHTML = rows.map((row) => {
    const isDecision = row.type === "decision";
    return `
      <div class="table-row">
        <span class="cell-title"><strong>${escapeHtml(isDecision ? row.item.decision : row.item.title)}</strong><small>${isDecision ? "Quyết định" : "Hành động tiếp theo"}</small></span>
        <span class="muted">${escapeHtml(row.topic.title)}</span>
        <span class="muted">${escapeHtml(isDecision ? row.item.reason : row.item.owner)}</span>
        <span class="muted">${escapeHtml(isDecision ? (row.item.evidenceUsed || row.item.risk) : (isOverdue(row.item) ? "Quá hạn" : ""))}</span>
        <span class="muted">${escapeHtml(isDecision ? row.item.date : row.item.due)}</span>
        <span class="badge ${escapeHtml(badgeClass(isDecision ? row.item.type : row.item.status))}">${escapeHtml(tr(isDecision ? row.item.type : row.item.status))}</span>
        ${actionButtons(row.topic.id, true)}
      </div>`;
  }).join("");
}

function renderGraph() {
  setColumns("1fr", ["Sơ đồ tri thức"]);
  const topics = filteredTopics();
  els.tableRows.innerHTML = `
    <div class="table-row">
      <section class="graph-panel">
        <div class="knowledge-map">
          <div class="map-header">
            <span>Thẻ / lĩnh vực</span>
            <span>Chủ đề nghiên cứu</span>
            <span>Tài liệu liên quan</span>
          </div>
          ${topics.map((topic) => knowledgeMapRow(topic)).join("") || `<div class="map-row"><span class="map-empty">Không có chủ đề nào khớp bộ lọc hiện tại.</span></div>`}
        </div>
      </section>
    </div>`;
}

function knowledgeMapRow(topic) {
  return `
    <div class="map-row">
      <div class="map-tags">
        ${topic.tags.length ? topic.tags.slice(0, 6).map((tag) => `<span class="map-chip">${escapeHtml(tag)}</span>`).join("") : '<span class="map-empty">Chưa có thẻ</span>'}
      </div>
      <div class="map-topic-wrap">
        <article class="map-topic">
          <span class="map-topic-dot">${topicScore(topic)}</span>
          <span>
            <strong>${escapeHtml(topic.title)}</strong>
            <small>${escapeHtml(tr(topic.status))} - Ưu tiên ${escapeHtml(tr(topic.priority))} - Tác động ${escapeHtml(tr(topic.impact))}</small>
          </span>
        </article>
      </div>
      <div class="map-papers">
        ${topic.papers.length ? topic.papers.slice(0, 4).map((paper) => `
          <article class="map-paper">
            <span></span>
            <span>
              <strong>${escapeHtml(shorten(paper.title, 58))}</strong>
              <small>${escapeHtml([paper.source || paper.journal, paper.year, paper.evidenceLevel].filter(Boolean).join(" - "))}</small>
            </span>
          </article>
        `).join("") : '<span class="map-empty">Chưa có tài liệu liên quan</span>'}
      </div>
    </div>
  `;
}

function renderSynthesis() {
  setColumns("1fr", ["Tổng hợp nghiên cứu"]);
  const topics = filteredTopics();
  const topTopics = [...topics].sort((a, b) => topicScore(b) - topicScore(a)).slice(0, 5);
  const gaps = topics.filter((topic) => topic.evidence < 60 || topic.papers.length === 0).slice(0, 6);
  const risks = topics.filter((topic) => topic.actions.some(isOverdue) || topic.decisions.some((decision) => decision.risk)).slice(0, 6);
  const opportunities = topics.filter((topic) => topic.funding >= 75 || topic.impact === "Transformative").slice(0, 6);
  els.tableRows.innerHTML = `
    <div class="table-row">
      <div class="synthesis-grid">
        ${synthesisCard("Cơ hội hàng đầu", topTopics.map((topic) => `${topic.title} (${topicScore(topic)}/100)`))}
        ${synthesisCard("Khoảng trống bằng chứng", gaps.map((topic) => `${topic.title} - bằng chứng ${topic.evidence}/100`))}
        ${synthesisCard("Rủi ro cần quản lý", risks.map((topic) => `${topic.title} - ${topic.actions.some(isOverdue) ? "hành động quá hạn" : "rủi ro quyết định"}`))}
        ${synthesisCard("Sẵn sàng tài trợ / tác động", opportunities.map((topic) => `${topic.title} - ${tr(topic.impact)}, tài trợ ${topic.funding}/100`))}
      </div>
    </div>
  `;
}

function synthesisCard(title, items) {
  return `<section class="synthesis-card"><h3>${escapeHtml(title)}</h3><ul>${(items.length ? items : ["Không có mục nào trong nhóm này"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function emptyTable(title, subtitle) {
  els.tableRows.innerHTML = `<div class="table-row"><span class="cell-title"><strong>${title}</strong><small>${subtitle}</small></span></div>`;
}

function scoreCell(score) {
  return `<span class="score"><span><i style="width:${score}%"></i></span>${score}/100</span>`;
}

function paperLink(paper) {
  const label = escapeHtml(paper.title || "Nguồn chưa đặt tên");
  const meta = paper.source || paper.year || paper.doi ? `<small>${escapeHtml([paper.source || paper.journal, paper.year, paper.doi].filter(Boolean).join(", "))}</small>` : "";
  if (isUrl(paper.url)) return `<a class="research-link" href="${escapeHtml(paper.url)}" target="_blank" rel="noopener noreferrer">${label}${meta}</a>`;
  return `<span class="research-link">${label}${meta}</span>`;
}

function shorten(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

function actionButtons(id, compact = false, extra = "") {
  const safeId = escapeHtml(id);
  return `<span class="row-actions">
    <button class="inline-button" type="button" data-action="view" data-id="${safeId}">Xem</button>
    <button class="inline-button" type="button" data-action="edit" data-id="${safeId}">Sửa</button>
    ${compact ? "" : `<button class="inline-button" type="button" data-action="duplicate" data-id="${safeId}">Nhân bản</button>`}
    ${extra}
  </span>`;
}

function mergeButton(id) {
  return `<button class="inline-button danger-inline" type="button" data-action="merge" data-id="${escapeHtml(id)}">Gộp</button>`;
}

function openEditor(id) {
  const topic = id ? state.topics.find((item) => item.id === id) : null;
  state.editingId = topic?.id || null;
  state.editingUpdatedAt = topic?.updatedAt || null;
  els.topicForm.reset();
  clearRows(els.papersList);
  clearRows(els.actionsList);
  clearRows(els.decisionsList);
  document.querySelector("#dialogTitle").textContent = topic ? "Sửa chủ đề" : "Thêm chủ đề";
  document.querySelector("#deleteTopicButton").style.display = topic ? "inline-block" : "none";
  if (topic) fillForm(topic);
  els.topicDialog.showModal();
}

function fillForm(topic) {
  const form = els.topicForm.elements;
  form.title.value = topic.title;
  form.owner.value = topic.owner;
  form.contributors.value = topic.contributors.join(", ");
  form.status.value = topic.status;
  form.priority.value = topic.priority;
  form.impact.value = topic.impact;
  form.novelty.value = topic.novelty;
  form.feasibility.value = topic.feasibility;
  form.evidence.value = topic.evidence;
  form.funding.value = topic.funding;
  form.urgency.value = topic.urgency;
  form.teamFit.value = topic.teamFit;
  form.question.value = topic.question;
  form.rationale.value = topic.rationale;
  form.gap.value = topic.gap;
  form.method.value = topic.method;
  form.description.value = topic.description;
  form.tags.value = topic.tags.join(", ");
  clearRows(els.papersList);
  topic.papers.forEach((paper) => addRow(els.papersList, renderPaperRow, paper));
  clearRows(els.actionsList);
  topic.actions.forEach((action) => addRow(els.actionsList, renderActionRow, action));
  clearRows(els.decisionsList);
  topic.decisions.forEach((decision) => addRow(els.decisionsList, renderDecisionRow, decision));
}

async function saveFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.topicForm);
  const isNew = !state.editingId;
  const draft = normalizeTopic({
    id: state.editingId || `t${Date.now()}`,
    title: form.get("title"),
    owner: form.get("owner"),
    contributors: parseList(form.get("contributors")),
    status: form.get("status"),
    priority: form.get("priority"),
    impact: form.get("impact"),
    novelty: form.get("novelty"),
    feasibility: form.get("feasibility"),
    evidence: form.get("evidence"),
    funding: form.get("funding"),
    urgency: form.get("urgency"),
    teamFit: form.get("teamFit"),
    question: form.get("question"),
    rationale: form.get("rationale"),
    gap: form.get("gap"),
    method: form.get("method"),
    description: form.get("description"),
    tags: parseList(form.get("tags")),
    papers: collectRows(els.papersList, ["title", "authors", "source", "year", "doi", "url", "studyType", "sampleSize", "finding", "relevance", "evidenceLevel", "limitations"]),
    actions: collectRows(els.actionsList, ["title", "owner", "due", "status"]),
    decisions: collectRows(els.decisionsList, ["type", "decision", "reason", "evidenceUsed", "alternatives", "risk", "reviewer", "date", "revisit"]),
    updatedAt: new Date().toISOString()
  });

  const submitButton = els.topicForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    if (isNew) {
      const saved = await createTopic(draft);
      state.topics.unshift(saved);
      els.topicDialog.close();
      render();
      return;
    }

    const result = await updateTopic(draft.id, draft, state.editingUpdatedAt);
    if (result.conflict) {
      const overwrite = window.confirm(`"${result.serverTopic.title}" vừa được người khác cập nhật trong lúc bạn đang sửa. Ghi đè bằng thay đổi của bạn?`);
      const finalResult = overwrite ? await updateTopic(draft.id, draft, result.serverTopic.updatedAt) : { topic: result.serverTopic };
      if (finalResult.conflict) {
        showToast("Vẫn còn xung đột - mở lại chủ đề và thử lại.");
        return;
      }
      state.topics = state.topics.map((item) => item.id === finalResult.topic.id ? finalResult.topic : item);
      els.topicDialog.close();
      render();
      return;
    }

    state.topics = state.topics.map((item) => item.id === result.topic.id ? result.topic : item);
    els.topicDialog.close();
    render();
  } catch (error) {
    console.warn(error);
    showToast("Không thể lưu chủ đề. Kiểm tra kết nối và thử lại.");
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteTopic() {
  if (!state.editingId) return;
  const topic = state.topics.find((item) => item.id === state.editingId);
  if (!window.confirm(`Xoá "${topic.title}"?`)) return;
  state.lastDeleted = topic;
  state.topics = state.topics.filter((item) => item.id !== state.editingId);
  els.topicDialog.close();
  render();
  try {
    await deleteTopicRemote(topic.id);
  } catch (error) {
    console.warn(error);
    showToast("Không thể xoá trên máy chủ. Đang tải lại danh sách chủ đề.");
    state.topics = await loadTopics();
    render();
    return;
  }
  showToast(`Đã xoá "${topic.title}".`, "Hoàn tác", async () => {
    try {
      const restored = await createTopic(state.lastDeleted);
      state.topics.unshift(restored);
      state.lastDeleted = null;
      render();
    } catch (error) {
      console.warn(error);
      showToast("Không thể khôi phục chủ đề.");
    }
  });
}

async function duplicateTopic(id) {
  const topic = state.topics.find((item) => item.id === id);
  if (!topic) return;
  const draft = normalizeTopic({ ...structuredClone(topic), id: `t${Date.now()}`, title: `${topic.title} (bản sao)`, updatedAt: new Date().toISOString() });
  try {
    const saved = await createTopic(draft);
    state.topics.unshift(saved);
    render();
  } catch (error) {
    console.warn(error);
    showToast("Không thể nhân bản chủ đề.");
  }
}

function openDetail(id) {
  const topic = state.topics.find((item) => item.id === id);
  if (!topic) return;
  els.detailContent.innerHTML = `
    <div class="dialog-header">
      <div><p class="eyebrow">${escapeHtml(tr(topic.status))}</p><h2>${escapeHtml(topic.title)}</h2><p class="view-subtitle">${escapeHtml(topic.question)}</p></div>
      <button class="icon-button" type="button" id="closeDetailButton">x</button>
    </div>
    <div class="detail-actions">
      <span class="badge ${escapeHtml(badgeClass(topic.priority))}">${escapeHtml(tr(topic.priority))}</span>
      <span class="badge ${escapeHtml(badgeClass(topic.impact))}">${escapeHtml(tr(topic.impact))}</span>
      ${scoreCell(topicScore(topic))}
    </div>
    <div class="detail-grid">
      <div>
        ${detailSection("Mô tả", topic.description)}
        ${detailSection("Lý do chấm điểm", topic.rationale)}
        ${detailSection("Khoảng trống tri thức", topic.gap)}
        ${detailSection("Phương pháp đề xuất", topic.method)}
        <section class="detail-section"><h3>Tài liệu liên quan</h3>${topic.papers.map((paper) => `<div class="detail-card"><strong>${paperLink(paper)}</strong><p class="muted">${escapeHtml([paper.authors, paper.studyType, paper.sampleSize].filter(Boolean).join(" - "))}</p><p class="muted">${escapeHtml(paper.finding || "Chưa ghi kết quả")}</p><p class="muted">${escapeHtml(paper.relevance || "Chưa ghi mức liên quan")}</p><p class="muted">${escapeHtml(paper.limitations ? `Hạn chế: ${paper.limitations}` : "Chưa ghi hạn chế")}</p><span class="badge ${escapeHtml(badgeClass(paper.evidenceLevel))}">${escapeHtml(tr(paper.evidenceLevel))}</span></div>`).join("") || "<p>Chưa có tài liệu liên quan.</p>"}</section>
        <section class="detail-section"><h3>Nhật ký quyết định</h3>${topic.decisions.map((decision) => `<div class="detail-card"><strong>${escapeHtml(decision.decision)}</strong><p class="muted">${escapeHtml(decision.reason)}</p><p class="muted">${escapeHtml(decision.evidenceUsed ? `Bằng chứng: ${decision.evidenceUsed}` : "Chưa ghi bằng chứng sử dụng")}</p><p class="muted">${escapeHtml(decision.alternatives ? `Phương án khác: ${decision.alternatives}` : "Chưa ghi phương án khác")}</p><p class="muted">${escapeHtml(decision.risk ? `Rủi ro: ${decision.risk}` : "Chưa ghi rủi ro")}</p><small class="muted">${escapeHtml([tr(decision.type), decision.reviewer || decision.by, decision.date, decision.revisit && `Xem lại ${decision.revisit}`].filter(Boolean).join(" - "))}</small></div>`).join("") || "<p>Chưa có quyết định nào.</p>"}</section>
      </div>
      <aside>
        <section class="detail-section"><h3>Người phụ trách</h3><p>${escapeHtml(topic.owner)}</p><div class="tag-list">${topic.contributors.map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("")}</div><p class="muted">${escapeHtml(formatUpdated(topic))}</p></section>
        <section class="detail-section"><h3>Điểm số có trọng số</h3>${Object.keys(SCORE_WEIGHTS).map((key) => `<p class="score">${escapeHtml(SCORE_FIELD_LABELS[key] || key)} (${Math.round(SCORE_WEIGHTS[key] * 100)}%)<span><i style="width:${topic[key]}%"></i></span>${topic[key]}/100</p>`).join("")}</section>
        <section class="detail-section"><h3>Thẻ gắn nhãn</h3><div class="tag-list">${topic.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></section>
        <section class="detail-section"><h3>Hành động tiếp theo</h3>${topic.actions.map((action) => `<div class="detail-card"><strong>${escapeHtml(action.title)}</strong><small class="muted">${escapeHtml([action.owner, action.due, tr(action.status)].filter(Boolean).join(" - "))}</small></div>`).join("") || "<p>Chưa có hành động nào.</p>"}</section>
      </aside>
    </div>`;
  els.detailDialog.showModal();
  document.querySelector("#closeDetailButton").addEventListener("click", () => els.detailDialog.close());
}

function detailSection(title, body) {
  return `<section class="detail-section"><h3>${title}</h3><p>${escapeHtml(body || "Chưa ghi thông tin.")}</p></section>`;
}

async function openBackups() {
  els.backupsContent.innerHTML = `
    <div class="dialog-header">
      <div><p class="eyebrow">Sao lưu tự động</p><h2>Bản sao lưu hằng ngày</h2></div>
      <button class="icon-button" type="button" id="closeBackupsButton">x</button>
    </div>
    <p class="muted">Hệ thống tự động chụp toàn bộ dữ liệu mỗi ngày và giữ lại 30 bản gần nhất. Tải xuống một bản để khôi phục thủ công nếu cần (dùng nút "Nhập dữ liệu" với tệp JSON đã tải).</p>
    <div id="backupsListBody"><p class="muted">Đang tải danh sách sao lưu...</p></div>`;
  els.backupsDialog.showModal();
  document.querySelector("#closeBackupsButton").addEventListener("click", () => els.backupsDialog.close());
  try {
    const response = await fetch("/api/backups");
    if (!response.ok) throw new Error("Failed to load backups.");
    const payload = await response.json();
    const body = document.querySelector("#backupsListBody");
    if (!payload.backups.length) {
      body.innerHTML = "<p>Chưa có bản sao lưu nào. Bản đầu tiên sẽ được tạo tự động trong lần chạy hằng ngày tiếp theo.</p>";
      return;
    }
    body.innerHTML = payload.backups.map((backup) => `
      <div class="detail-card">
        <strong>${escapeHtml(new Date(backup.created_at).toLocaleString("vi-VN"))}</strong>
        <small class="muted">${backup.topic_count} chủ đề</small>
        <button class="inline-button" type="button" data-backup-id="${backup.id}">Tải xuống</button>
      </div>`).join("");
    body.querySelectorAll("[data-backup-id]").forEach((button) => {
      button.addEventListener("click", () => downloadBackup(Number(button.dataset.backupId)));
    });
  } catch (error) {
    console.warn(error);
    document.querySelector("#backupsListBody").innerHTML = "<p>Không thể tải danh sách sao lưu. Thử lại sau.</p>";
  }
}

async function downloadBackup(id) {
  try {
    const response = await fetch(`/api/backups/${id}`);
    if (!response.ok) throw new Error("Failed to load backup.");
    const payload = await response.json();
    download(`research-hub-backup-${payload.id}.json`, JSON.stringify({ schemaVersion: 2, exportedAt: payload.createdAt, topics: payload.topics }, null, 2), "application/json");
  } catch (error) {
    console.warn(error);
    showToast("Không thể tải bản sao lưu này.");
  }
}

function exportJson() {
  download("research-hub.json", JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), topics: state.topics }, null, 2), "application/json");
}

function exportCsv() {
  const rows = [["Tiêu đề","Trạng thái","Ưu tiên","Tác động","Người phụ trách","Điểm có trọng số","Tính mới","Tính khả thi","Bằng chứng","Tài trợ","Cấp thiết","Phù hợp nhóm","Câu hỏi nghiên cứu","Thẻ","Số tài liệu","Hành động đang mở","Số quyết định"]];
  state.topics.forEach((topic) => rows.push([topic.title, tr(topic.status), tr(topic.priority), tr(topic.impact), topic.owner, topicScore(topic), topic.novelty, topic.feasibility, topic.evidence, topic.funding, topic.urgency, topic.teamFit, topic.question, topic.tags.join("; "), topic.papers.length, topic.actions.filter((action) => action.status !== "Done").length, topic.decisions.length]));
  download("research-hub-topics.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function exportBrief() {
  const lines = [
    "# Bản tóm tắt danh mục nghiên cứu",
    "",
    `Tạo lúc: ${new Date().toLocaleString("vi-VN")}`,
    "",
    "## Tổng quan điều hành",
    "",
    `- Tổng số chủ đề: ${state.topics.length}`,
    `- Chủ đề ưu tiên cao: ${state.topics.filter((topic) => ["Critical", "High"].includes(topic.priority)).length}`,
    `- Khoảng trống bằng chứng: ${state.topics.filter((topic) => topic.evidence < 60 || topic.papers.length === 0).length}`,
    `- Hành động quá hạn: ${state.topics.reduce((sum, topic) => sum + topic.actions.filter(isOverdue).length, 0)}`,
    "",
    "## Chủ đề",
    ""
  ];
  sortTopics(state.topics).forEach((topic) => {
    lines.push(`### ${topic.title}`);
    lines.push(`- Trạng thái: ${tr(topic.status)}`);
    lines.push(`- Ưu tiên / tác động: ${tr(topic.priority)} / ${tr(topic.impact)}`);
    lines.push(`- Điểm có trọng số: ${topicScore(topic)}/100`);
    lines.push(`- Người phụ trách: ${topic.owner}`);
    lines.push(`- Câu hỏi nghiên cứu: ${topic.question}`);
    lines.push(`- Khoảng trống tri thức: ${topic.gap || "Chưa ghi"}`);
    lines.push(`- Lý do chấm điểm: ${topic.rationale || "Chưa ghi"}`);
    lines.push(`- Tài liệu liên quan: ${topic.papers.map((paper) => paper.title).join("; ") || "Không có"}`);
    lines.push(`- Hành động tiếp theo: ${topic.actions.map((action) => `${action.title} (${tr(action.status)})`).join("; ") || "Không có"}`);
    lines.push("");
  });
  download("research-portfolio-brief.md", lines.join("\n"), "text/markdown");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showToast(message, actionLabel, action) {
  els.toast.innerHTML = `${escapeHtml(message)}${actionLabel ? `<button type="button">${escapeHtml(actionLabel)}</button>` : ""}`;
  els.toast.classList.add("show");
  const button = els.toast.querySelector("button");
  if (button) button.addEventListener("click", () => {
    action();
    els.toast.classList.remove("show");
  });
  window.setTimeout(() => els.toast.classList.remove("show"), 7000);
}

async function importJson(file) {
  const text = await file.text();
  const name = file.name.toLowerCase();
  if (name.endsWith(".bib")) {
    await importReferences(parseBibTeX(text), "Nhập từ BibTeX");
    return;
  }
  if (name.endsWith(".ris")) {
    await importReferences(parseRIS(text), "Nhập từ RIS");
    return;
  }
  const payload = JSON.parse(text);
  if (!Array.isArray(payload.topics)) throw new Error("JSON must contain a topics array.");
  const topics = payload.topics.map(normalizeTopic);
  for (const topic of topics) {
    await createTopic(topic);
  }
  state.topics = await fetchTopicsFromServer();
  render();
  showToast(`Đã nhập ${topics.length} chủ đề.`);
}

async function lookupDoi() {
  const doi = document.querySelector("#doiLookupInput").value.trim();
  if (!doi) {
    showToast("Vui lòng nhập DOI trước.");
    return;
  }
  const button = document.querySelector("#doiLookupButton");
  button.disabled = true;
  button.textContent = "Đang tra cứu...";
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!response.ok) throw new Error("DOI lookup failed.");
    const payload = await response.json();
    const item = payload.message;
    const paper = normalizePaper({
      title: item.title?.[0] || doi,
      authors: (item.author || []).map((author) => [author.given, author.family].filter(Boolean).join(" ")).join("; "),
      source: item["container-title"]?.[0] || item.publisher || "",
      journal: item["container-title"]?.[0] || "",
      year: item.published?.["date-parts"]?.[0]?.[0] || "",
      doi: item.DOI || doi,
      url: item.URL || `https://doi.org/${doi}`,
      studyType: item.type || "journal-article",
      sampleSize: "",
      finding: "",
      relevance: "",
      evidenceLevel: "Moderate",
      limitations: ""
    });
    addRow(els.papersList, renderPaperRow, paper);
    document.querySelector("#doiLookupInput").value = "";
    showToast("Đã thêm thông tin tài liệu từ DOI.");
  } catch (error) {
    showToast(error.message === "DOI lookup failed." ? "Tra cứu DOI thất bại." : (error.message || "Tra cứu DOI thất bại."));
  } finally {
    button.disabled = false;
    button.textContent = "Thêm tài liệu từ DOI";
  }
}

async function importReferences(papers, title) {
  if (!papers.length) throw new Error("No references found in the imported file.");
  const draft = normalizeTopic({
    id: `t${Date.now()}`,
    title,
    owner: "Đã nhập",
    status: "Needs Triage",
    priority: "Medium",
    impact: "Medium",
    novelty: 50,
    feasibility: 50,
    evidence: 70,
    funding: 40,
    urgency: 40,
    teamFit: 50,
    question: "Tập tài liệu đã nhập, cần phân loại thành chủ đề cụ thể.",
    gap: "Cần rà soát.",
    method: "Rà soát tài liệu đã nhập và tách thành các chủ đề nghiên cứu cụ thể.",
    description: `Đã nhập ${papers.length} tài liệu để phân loại.`,
    tags: ["Đã nhập", "Tài liệu"],
    papers,
    actions: [{ title: "Phân loại tài liệu đã nhập", owner: "Nhóm nghiên cứu", due: "", status: "Open" }],
    decisions: [],
    rationale: "Tài liệu đã nhập được giữ như một chủ đề tạm thời cho đến khi được rà soát."
  });
  const saved = await createTopic(draft);
  state.topics.unshift(saved);
  render();
  showToast(`Đã nhập ${papers.length} tài liệu từ ${title}.`);
}

function parseBibTeX(text) {
  const entries = text.match(/@\w+\s*{[\s\S]*?(?=\n@\w+\s*{|$)/g) || [];
  return entries.map((entry) => {
    const field = (name) => {
      const match = entry.match(new RegExp(`${name}\\s*=\\s*[{\"]([^}\"]+)`, "i"));
      return match ? match[1].replace(/\s+/g, " ").trim() : "";
    };
    return normalizePaper({
      title: field("title"),
      authors: field("author"),
      source: field("journal") || field("booktitle"),
      journal: field("journal") || field("booktitle"),
      year: field("year"),
      doi: field("doi"),
      url: field("url"),
      studyType: "Trích dẫn đã nhập",
      evidenceLevel: "Moderate",
      finding: "",
      relevance: "",
      limitations: ""
    });
  }).filter((paper) => paper.title);
}

function parseRIS(text) {
  const records = text.split(/\nER\s*-\s*/i).map((record) => record.trim()).filter(Boolean);
  return records.map((record) => {
    const lines = record.split(/\r?\n/);
    const values = {};
    lines.forEach((line) => {
      const match = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
      if (!match) return;
      values[match[1]] = values[match[1]] ? `${values[match[1]]}; ${match[2]}` : match[2];
    });
    return normalizePaper({
      title: values.TI || values.T1 || "",
      authors: values.AU || values.A1 || "",
      source: values.JO || values.JF || values.T2 || "",
      journal: values.JO || values.JF || values.T2 || "",
      year: values.PY || values.Y1 || "",
      doi: values.DO || "",
      url: values.UR || "",
      studyType: values.TY || "Trích dẫn đã nhập",
      evidenceLevel: "Moderate",
      finding: "",
      relevance: "",
      limitations: ""
    });
  }).filter((paper) => paper.title);
}

document.querySelector("#addTopicButton").addEventListener("click", () => openEditor(null));
document.querySelector("#closeDialogButton").addEventListener("click", () => els.topicDialog.close());
document.querySelector("#cancelDialogButton").addEventListener("click", () => els.topicDialog.close());
document.querySelector("#deleteTopicButton").addEventListener("click", deleteTopic);
document.querySelector("#doiLookupButton").addEventListener("click", lookupDoi);
document.querySelector("#exportJsonButton").addEventListener("click", exportJson);
document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
document.querySelector("#exportBriefButton").addEventListener("click", exportBrief);
document.querySelector("#importButton").addEventListener("click", () => document.querySelector("#importFile").click());
document.querySelector("#backupsButton").addEventListener("click", openBackups);
document.querySelector("#clearDataButton").addEventListener("click", async () => {
  if (!state.topics.length) {
    showToast("Không có gì để xoá.");
    return;
  }
  const answer = window.prompt(`Thao tác này xoá vĩnh viễn toàn bộ ${state.topics.length} chủ đề nghiên cứu của CẢ NHÓM. Hãy xuất bản sao lưu JSON trước nếu chưa làm. Gõ DELETE ALL để xác nhận.`);
  if (answer === null) return;
  if (answer.trim().toUpperCase() !== "DELETE ALL") {
    showToast("Đã huỷ xoá - văn bản xác nhận không khớp.");
    return;
  }
  try {
    await Promise.all(state.topics.map((topic) => deleteTopicRemote(topic.id)));
    state.topics = [];
    render();
    showToast("Đã xoá toàn bộ dữ liệu nghiên cứu chung.");
  } catch (error) {
    console.warn(error);
    showToast("Không thể xoá hết chủ đề. Đang tải lại trạng thái hiện tại.");
    state.topics = await loadTopics();
    render();
  }
});
document.querySelector("#importFile").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importJson(file).catch((error) => window.alert(error.message));
  event.target.value = "";
});

document.querySelector("#addPaperButton").addEventListener("click", () => addRow(els.papersList, renderPaperRow));
document.querySelector("#addActionButton").addEventListener("click", () => addRow(els.actionsList, renderActionRow));
document.querySelector("#addDecisionButton").addEventListener("click", () => addRow(els.decisionsList, renderDecisionRow));
els.topicForm.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-row]");
  if (!removeButton) return;
  removeButton.closest(".repeatable-item").remove();
});
els.topicForm.addEventListener("submit", saveFromForm);
els.tableRows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "view") openDetail(id);
  if (button.dataset.action === "edit") openEditor(id);
  if (button.dataset.action === "duplicate") duplicateTopic(id);
  if (button.dataset.action === "merge") mergeTopic(id);
  if (button.dataset.action === "remove-duplicate-paper") removeDuplicatePaper(id, Number(button.dataset.index));
});
els.auxiliaryView.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  els.statusFilter.value = button.dataset.status;
  render();
});
[els.searchInput, els.priorityFilter, els.statusFilter, els.evidenceFilter, els.sortSelect].forEach((el) => el.addEventListener("input", render));
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeView = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});

async function init() {
  updateStatusStrip();
  try {
    state.topics = await fetchTopicsFromServer();
  } catch (error) {
    console.warn(error);
    state.topics = [];
    state.loadFailed = true;
    setOnline(false);
    showToast("Không thể kết nối máy chủ. Sẽ tự động thử lại.");
  }
  render();
  loadWhoami();
  window.setInterval(pollTopics, 7000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pollTopics();
  });
}

init();
