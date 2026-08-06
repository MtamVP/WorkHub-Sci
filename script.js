const STAGES_META = {
  s1: {
    code: 'S1',
    title: 'S1 - Ingest Data',
    layer: 'Bronze-storage',
    layerClass: 'pill-warning',
    storageTier: 'WorkHub Storage: science_bucket/bronze/',
    desc: 'Lấy data từ bên ngoài đưa vào để tiến hành pipeline'
  },
  s2: {
    code: 'S2',
    title: 'S2 - Source Validation',
    layer: 'Bronze-storage',
    layerClass: 'pill-warning',
    storageTier: 'WorkHub Storage: science_bucket/bronze/',
    desc: 'Đảm bảo dữ liệu đầu vào hợp lệ.'
  },
  s3: {
    code: 'S3',
    title: 'S3 - Metadata & Enrichment',
    layer: 'Silver-storage',
    layerClass: 'pill-info',
    storageTier: 'WorkHub-Tools Storage: silver_bucket/silver/',
    desc: 'Tiến hành làm sạch, chuẩn hóa dữ liệu, tách thông tin và đưa vào lớp Silver.'
  },
  s4: {
    code: 'S4',
    title: 'S4 - Quality Review',
    layer: 'Silver-storage',
    layerClass: 'pill-info',
    storageTier: 'WorkHub-Tools Storage: silver_bucket/reviews/',
    desc: 'Tính toán các chỉ số nghiên cứu và phân tích dữ liệu.'
  },
  s5: {
    code: 'S5',
    title: 'S5 - Gold Publish',
    layer: 'Gold-storage',
    layerClass: 'pill-success',
    storageTier: 'WorkHub-Tools Storage: gold_bucket/gold/',
    desc: 'Cần người check lại trước khi XUẤT'
  },
  s6: {
    code: 'S6',
    title: 'S6 - Repo Export',
    layer: 'Gold-storage',
    layerClass: 'pill-success',
    storageTier: 'WorkHub-Tools Storage: gold_bucket/ai_datasets/',
    desc: 'Xuất báo cáo...'
  }
};

const STAGE_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];
let currentStageIndex = 0;

const ALLOWED_GROUPS = ['workhub-sci', 'admin', 'all'];

let CURRENT_USER = {
  email: '',
  nickname: '',
  groupKey: ''
};

const auth = sbClient ? sbClient.auth : null;

// ==========================================
// AUTHENTICATION & ACCESS GUARD (real Supabase Auth)
// ==========================================

function lockApp() {
  document.body.classList.add('app-locked');
  openAuthModal(true);
}

function unlockApp() {
  document.body.classList.remove('app-locked');
  closeAuthModal(true);
}

function getInitials(text) {
  if (!text) return 'SC';
  const clean = text.trim();
  if (clean.includes('@')) {
    return clean.split('@')[0].slice(0, 2).toUpperCase();
  }
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function updateUserProfileUI() {
  const avatarText = document.getElementById('user-avatar-text');
  const nameEl = document.getElementById('user-display-name');
  const dropAvatar = document.getElementById('dropdown-avatar-text');
  const dropName = document.getElementById('dropdown-name');
  const dropEmail = document.getElementById('dropdown-email');

  const initials = getInitials(CURRENT_USER.nickname || CURRENT_USER.email);

  if (avatarText) avatarText.textContent = initials;
  if (nameEl) nameEl.textContent = CURRENT_USER.nickname || CURRENT_USER.email;
  if (dropAvatar) dropAvatar.textContent = initials;
  if (dropName) dropName.textContent = CURRENT_USER.nickname || 'Science Member';
  if (dropEmail) dropEmail.textContent = CURRENT_USER.email;
}

function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const wrapper = document.getElementById('user-profile-wrapper');
  const menu = document.getElementById('user-dropdown-menu');
  if (wrapper && menu) {
    wrapper.classList.toggle('open');
    menu.classList.toggle('open');
  }
}

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('user-profile-wrapper');
  const menu = document.getElementById('user-dropdown-menu');
  if (wrapper && menu && !wrapper.contains(e.target)) {
    wrapper.classList.remove('open');
    menu.classList.remove('open');
  }
});

async function resolveUserProfile(user) {
  CURRENT_USER.email = user.email;

  try {
    const info = await API.auth.getUserInfo(user.email);
    CURRENT_USER.nickname = (info && info.name) || user.user_metadata?.display_name || user.email.split('@')[0];
    CURRENT_USER.groupKey = (info && info.group) || 'guest';
  } catch (err) {
    console.warn("Lỗi lấy thông tin user:", err);
    CURRENT_USER.nickname = user.email.split('@')[0];
    CURRENT_USER.groupKey = 'guest';
  }

  if (!ALLOWED_GROUPS.includes(CURRENT_USER.groupKey)) {
    document.body.classList.add('app-locked');
    closeAuthModal(true);
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Truy cập bị từ chối',
        text: `Tài khoản ${CURRENT_USER.email} thuộc nhóm [${CURRENT_USER.groupKey}], không có quyền truy cập Science Pipeline.`,
        showCancelButton: true,
        confirmButtonText: 'Đổi tài khoản',
        cancelButtonText: 'Về trang chủ',
        confirmButtonColor: '#2F6AE0',
        allowOutsideClick: false
      }).then((res) => {
        if (res.isConfirmed) {
          auth.signOut().then(() => openAuthModal(true));
        } else {
          window.location.href = 'https://workhub-ai.pages.dev/';
        }
      });
    }
    return false;
  }

  unlockApp();
  updateUserProfileUI();

  if (!window.__sciSessionBootstrapped) {
    window.__sciSessionBootstrapped = true;
    fetchLiveObservationLogs();
    // Nạp dữ liệu ban đầu cho các tab Nhiệm Vụ / Tiến Độ / Lịch ngay sau khi đăng nhập
    // thành công, để chuyển tab không phải chờ tải lần đầu.
    loadProjectOverview();
    loadCalendarData();
    loadAssigneeDropdown();
  }

  return true;
}

async function initAuth() {
  if (!auth) {
    console.error('Supabase auth chưa sẵn sàng — kiểm tra api.js.');
    return;
  }

  auth.onAuthStateChange(async (event, session) => {
    const user = session?.user;
    if (user) {
      await resolveUserProfile(user);
      if (event === 'SIGNED_IN') {
        logPipelineEvent(`Đã đăng nhập tài khoản: ${user.email}`, 'success', 'USER_LOGIN');
      }
    } else {
      CURRENT_USER = { email: '', nickname: '', groupKey: '' };
      lockApp();
    }
  });
}

function openAuthModal(forced) {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('open');
    const cancelBtn = document.getElementById('auth-cancel-btn');
    const closeBtn = document.getElementById('auth-modal-close-btn');
    if (cancelBtn) cancelBtn.style.display = forced ? 'none' : '';
    if (closeBtn) closeBtn.style.display = forced ? 'none' : '';
    const emailInput = document.getElementById('auth-email-input');
    if (emailInput) emailInput.value = CURRENT_USER.email || '';
    const errBox = document.getElementById('auth-error-msg');
    if (errBox) errBox.style.display = 'none';
  }
}

function closeAuthModal(force) {
  if (document.body.classList.contains('app-locked') && !force) return;
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = (document.getElementById('auth-email-input')?.value || '').trim().toLowerCase();
  const password = document.getElementById('auth-password-input')?.value || '';
  const errBox = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (!email || !password) {
    if (errBox) { errBox.textContent = 'Vui lòng nhập đầy đủ email và mật khẩu.'; errBox.style.display = 'block'; }
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...'; }
  if (errBox) errBox.style.display = 'none';

  try {
    const realEmail = (await API.auth.getRealEmail(email)) || email;
    const { error } = await auth.signInWithPassword({ email: realEmail, password });
    if (error) throw error;
    // auth.onAuthStateChange picks up the SIGNED_IN event and finishes the flow
  } catch (err) {
    let msg = err.message || 'Đăng nhập thất bại.';
    if (msg.includes('Invalid login credentials')) msg = 'Sai email hoặc mật khẩu.';
    if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập'; }
  }
}

async function switchAccount() {
  if (auth) await auth.signOut();
  openAuthModal(true);
}

async function handleLogout() {
  if (auth) await auth.signOut();
  // auth.onAuthStateChange fires SIGNED_OUT -> clears CURRENT_USER and locks the app
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'info',
      title: 'Đã đăng xuất',
      text: 'Vui lòng đăng nhập lại với tài khoản nhóm Science.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#2F6AE0'
    });
  }
}

async function refreshScienceSession() {
  if (!auth) return;
  const { data: { user } } = await auth.getUser();
  if (user) await resolveUserProfile(user);
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Đã làm mới phiên',
      text: `Tài khoản ${CURRENT_USER.email} (Quyền: ${CURRENT_USER.groupKey})`,
      timer: 1500,
      showConfirmButton: false
    });
  }
}

function switchStage(stageKey) {
  const idx = STAGE_KEYS.indexOf(stageKey);
  if (idx === -1) return;
  currentStageIndex = idx;
  updateStageUI(stageKey);
}

function navStage(delta) {
  let newIdx = currentStageIndex + delta;
  if (newIdx < 0) newIdx = 0;
  if (newIdx >= STAGE_KEYS.length) newIdx = STAGE_KEYS.length - 1;
  currentStageIndex = newIdx;
  const stageKey = STAGE_KEYS[currentStageIndex];
  updateStageUI(stageKey);
}

function updateStageUI(stageKey) {
  const meta = STAGES_META[stageKey];
  if (!meta) return;

  const stepItems = document.querySelectorAll('.step-item');
  stepItems.forEach((item, i) => {
    item.classList.remove('active');
    if (i <= currentStageIndex) {
      item.classList.add('active');
    }
  });

  const fillPercentage = (currentStageIndex / (STAGE_KEYS.length - 1)) * 100;
  const fillEl = document.getElementById('stepper-progress-fill');
  if (fillEl) fillEl.style.width = `${fillPercentage}%`;

  const titleEl = document.getElementById('stage-title');
  const descEl = document.getElementById('stage-desc');
  const badgeEl = document.getElementById('stage-badge-layer');
  const storageTierEl = document.getElementById('stage-storage-tier');

  if (titleEl) titleEl.textContent = meta.title;
  if (descEl) descEl.textContent = meta.desc;
  if (badgeEl) {
    badgeEl.textContent = meta.layer;
    badgeEl.className = `status-pill ${meta.layerClass}`;
  }
  if (storageTierEl) storageTierEl.textContent = meta.storageTier;
}

let LOCAL_LOGS = [];

async function fetchLiveObservationLogs() {
  const email = localStorage.getItem('userEmail') || localStorage.getItem('currentUser') || '';
  if (API && API.notification) {
    try {
      const logs = await API.notification.get('workhub-sci', 25, email);
      if (logs && logs.length > 0) {
        LOCAL_LOGS = logs.map(l => ({
          time: new Date(l.timestamp).toTimeString().slice(0, 8),
          type: l.status === 'success' ? 'success' : (l.status === 'error' ? 'danger' : 'info'),
          text: `[${l.action || 'AUDIT'}] ${l.details || l.message}`
        }));
        renderObservationLogs();
      }
    } catch (err) {
      console.warn("Lỗi tải live logs từ WorkHub system_logs:", err);
    }
  }
}

function renderObservationLogs() {
  const container = document.getElementById('observation-logs-container');
  if (!container) return;
  if (LOCAL_LOGS.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 16px; font-size: 13px;">
        <i class="fa-regular fa-folder-open" style="font-size: 28px; margin-bottom: 10px; display: block; opacity: 0.4;"></i>
        Chưa có nhật ký hoạt động
      </div>
    `;
    return;
  }
  container.innerHTML = LOCAL_LOGS.map(log => `
    <div class="event-log-card" style="border-left-color: var(--${log.type === 'success' ? 'success-color' : (log.type === 'warning' ? 'warning-color' : (log.type === 'danger' ? 'danger-color' : 'cyan-accent'))});">
      <div class="event-log-time">
        <span>${log.time}</span>
        <span class="status-pill pill-${log.type}" style="font-size: 10px; padding: 1px 6px;">${log.type.toUpperCase()}</span>
      </div>
      <p style="margin: 0; color: var(--text-primary); font-size: 13px;">${log.text}</p>
    </div>
  `).join('');
}

async function logPipelineEvent(text, type = 'info', action = 'PIPELINE_SCI_ACTION') {
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  LOCAL_LOGS.unshift({ time: timeStr, type, text });
  renderObservationLogs();

  const unreadIndicator = document.getElementById('noti-unread-indicator');
  if (unreadIndicator) unreadIndicator.style.display = 'block';

  const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('currentUser') || '';
  const traceId = "TRC_SCI_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
  if (API && API.system && API.system.logAction) {
    try {
      await API.system.logAction(traceId, action, text, type === 'danger' ? 'error' : 'success', userEmail, 'workhub-sci', null);
    } catch (err) {
      console.warn("Không thể ghi log lên Supabase system_logs:", err);
    }
  }
}

function toggleObservationDrawer() {
  const drawer = document.getElementById('observation-drawer');
  if (drawer) {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      const unreadIndicator = document.getElementById('noti-unread-indicator');
      if (unreadIndicator) unreadIndicator.style.display = 'none';
    }
  }
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (toggleBtn) {
    toggleBtn.innerHTML = currentTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    toggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      toggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();
  renderObservationLogs();
  updateStageUI('s1');

  await initAuth();

  const notiBtn = document.getElementById('observation-toggle-btn');
  if (notiBtn) notiBtn.addEventListener('click', toggleObservationDrawer);
});

// ==========================================================================
// PORTED MODULES: Project (Tiến Độ) / Task (table view) / Calendar
// Ported from the WorkHub dashboard reference (script.js) for group_key
// 'workhub-sci'. Scope: core CRUD + list/filter only — no milestones,
// burndown chart, CSV export, kanban/card view, drag-reorder, bulk-select
// toolbar, dependency picker, comment/checklist/history modal, subtasks,
// per-task file attachments, "My Tasks"/workload widgets, or dashboard
// mini-calendar. This app has no presence/members-drawer system, so none
// of that was ported either.
// ==========================================================================

// -------------------- Generic helpers --------------------

function escapeHtml(text) {
  if (text === null || text === undefined || text === '') return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Escape cho chuỗi nằm bên trong tham số của thuộc tính onclick="...('...')" — khác
// với escapeHtml (escape cho nội dung/thuộc tính HTML). Hai lớp escape luôn đi cùng
// nhau: escapeHtml(escapeJs(text)) khi chuỗi vừa nằm trong onclick vừa nằm trong HTML.
function escapeJs(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function showToast(message, type) {
  type = type || 'success';
  if (typeof Swal === 'undefined') { window.alert(message); return; }
  const icon = type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'success');
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  }).fire({ icon, title: String(message == null ? '' : message) });
}

function openAppModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeAppModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function skeletonTableRows(colCount, rowCount) {
  rowCount = rowCount || 5;
  let rows = '';
  for (let i = 0; i < rowCount; i++) {
    let cells = '';
    for (let c = 0; c < colCount; c++) {
      const widthClass = c === 0 ? '' : (c % 3 === 1 ? 'short' : (c % 3 === 2 ? 'tiny' : ''));
      cells += `<td><div class="skeleton-block skeleton-bar ${widthClass}"></div></td>`;
    }
    rows += `<tr class="skeleton-table-row">${cells}</tr>`;
  }
  return rows;
}

function skeletonListItems(count) {
  count = count || 4;
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-list-item">
      <div class="skeleton-block skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton-block skeleton-bar"></div>
        <div class="skeleton-block skeleton-bar short"></div>
      </div>
    </div>`;
  }
  return html;
}

// -------------------- Section navigation (Pipeline / Task / Progress / Calendar) --------------------

function switchSection(name) {
  document.querySelectorAll('.app-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.section-nav-btn').forEach(el => el.classList.remove('active'));

  const section = document.getElementById(name + '-section');
  const btn = document.querySelector('.section-nav-btn[data-section="' + name + '"]');
  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');
}

// -------------------- Task render helpers --------------------

function renderBadge(type, value) {
  let cls = 'pill-neutral';
  if (type === 'status') {
    if (value === 'Done') cls = 'pill-success';
    else if (value === 'Working on it') cls = 'pill-warning';
    else if (value === 'Stuck') cls = 'pill-danger';
  } else if (type === 'priority') {
    if (value === 'Critical') cls = 'pill-danger';
    else if (value === 'High') cls = 'pill-warning';
    else if (value === 'Medium') cls = 'pill-info';
  }
  return `<span class="status-pill ${cls}">${escapeHtml(value)}</span>`;
}

function getStatusColor(status) {
  if (status === 'Done') return '#00c875';
  if (status === 'Working on it') return '#fdab3d';
  if (status === 'Stuck') return '#e2445c';
  return '#c4c4c4';
}

// Badge cảnh báo hạn task: đỏ nếu đã quá hạn, vàng nếu còn <=2 ngày. Ẩn khi task đã Done.
function getDueDateBadge(dueDate, status) {
  if (!dueDate || status === 'Done') return '';
  const due = new Date(dueDate + 'T00:00:00');
  if (isNaN(due.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return `<span class="due-badge overdue"><i class="fa-solid fa-triangle-exclamation"></i> Quá hạn</span>`;
  if (diffDays <= 2) return `<span class="due-badge due-soon"><i class="fa-regular fa-clock"></i> Sắp đến hạn</span>`;
  return '';
}

// Chuẩn hóa chuỗi nhãn người dùng gõ: bỏ khoảng trắng thừa, bỏ rỗng, bỏ trùng (không phân biệt hoa thường)
function normalizeLabels(raw) {
  const seen = new Set();
  const out = [];
  String(raw || '').split(',').forEach(part => {
    const label = part.trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return out.join(', ');
}

function parseLabels(value) {
  return String(value || '').split(',').map(x => x.trim()).filter(Boolean);
}

// Màu chip suy ra từ chính tên nhãn để cùng một nhãn luôn có cùng màu ở mọi nơi
function labelHue(label) {
  let hash = 0;
  const s = String(label).toLowerCase();
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 360;
  return hash;
}

function populateLabelFilter() {
  const select = document.getElementById('filter-label');
  if (!select) return;

  const prevVal = select.value;
  const seen = new Set();
  const labels = [];
  (globalAllTasks || []).forEach(t => {
    parseLabels(t.labels).forEach(l => {
      const key = l.toLowerCase();
      if (!seen.has(key)) { seen.add(key); labels.push(l); }
    });
  });
  labels.sort((a, b) => a.localeCompare(b, 'vi'));

  select.innerHTML = '<option value="all">Tất cả nhãn</option>' +
    labels.map(l => `<option value="${escapeHtml(l.toLowerCase())}">${escapeHtml(l)}</option>`).join('');

  if (labels.some(l => l.toLowerCase() === prevVal)) select.value = prevVal;
}

function renderLabelChips(labelsValue) {
  const labels = parseLabels(labelsValue);
  if (labels.length === 0) return '';
  return labels.map(l => {
    const hue = labelHue(l);
    return `<span class="task-label-chip" style="--label-hue:${hue};">${escapeHtml(l)}</span>`;
  }).join('');
}

// -------------------- Project (Tiến Độ) module --------------------

let currentTaskProjectID = null;
let showArchivedProjects = false;
let globalAllProjects = [];

function getProgressBarColor(percent) {
  if (percent == 100) return 'bg-success';
  if (percent >= 50) return 'bg-primary';
  if (percent > 0) return 'bg-warning';
  return 'bg-secondary';
}

async function loadProjectOverview(options) {
  const quiet = !!(options && options.quiet);
  const tableBody = document.getElementById('progress-table-body');
  const taskDropdown = document.getElementById('task-project-select');
  const createDropdown = document.getElementById('project-select');
  const filterProjectDropdown = document.getElementById('progress-project-filter');
  const filterOwnerDropdown = document.getElementById('progress-search-input');

  const colSpanCount = 7;

  const prevProjectFilter = filterProjectDropdown ? filterProjectDropdown.value : '';
  const prevOwnerFilter = filterOwnerDropdown ? filterOwnerDropdown.value : '';
  const prevTaskDropdownVal = taskDropdown ? taskDropdown.value : '';

  if (!quiet) {
    if (tableBody) tableBody.innerHTML = skeletonTableRows(colSpanCount, 5);
    const loadingOpt = '<option value="">-- Đang tải... --</option>';
    if (taskDropdown) taskDropdown.innerHTML = loadingOpt;
    if (createDropdown) createDropdown.innerHTML = loadingOpt;
    if (filterProjectDropdown) filterProjectDropdown.innerHTML = loadingOpt;
    if (filterOwnerDropdown) filterOwnerDropdown.innerHTML = loadingOpt;
  }

  try {
    const response = await callGAS('getProjectList', {
      filters: {},
      groupKey: activeGroup,
      archiveScope: showArchivedProjects ? 'archived' : 'active'
    });

    if (response.status === 'success') {
      globalAllProjects = response.data || [];

      if (taskDropdown) taskDropdown.innerHTML = '<option value="">-- Chọn Dự Án để xem Task --</option>';
      if (createDropdown) createDropdown.innerHTML = '<option value="">-- Chọn Dự án đã có hoặc Nhập mới --</option>';
      if (filterProjectDropdown) filterProjectDropdown.innerHTML = '<option value="">-- Tất cả dự án --</option>';
      if (filterOwnerDropdown) filterOwnerDropdown.innerHTML = '<option value="">-- Tất cả người tạo --</option>';

      if (!globalAllProjects.length) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colSpanCount}" class="empty-state">Chưa có dự án nào.</td></tr>`;
        loadMemberCheckboxes();
        return;
      }

      const uniqueOwners = [...new Set(globalAllProjects.map(p => p.owner))].sort();
      if (filterOwnerDropdown) {
        uniqueOwners.forEach(owner => {
          const opt = document.createElement('option');
          opt.value = owner; opt.textContent = owner;
          filterOwnerDropdown.appendChild(opt);
        });
        if (prevOwnerFilter && uniqueOwners.includes(prevOwnerFilter)) filterOwnerDropdown.value = prevOwnerFilter;
      }
      const uniqueNames = [...new Set(globalAllProjects.map(p => p.name))].sort();
      if (filterProjectDropdown) {
        uniqueNames.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          filterProjectDropdown.appendChild(opt);
        });
        if (prevProjectFilter && uniqueNames.includes(prevProjectFilter)) filterProjectDropdown.value = prevProjectFilter;
      }

      globalAllProjects.forEach(p => {
        if (taskDropdown) { const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name; taskDropdown.appendChild(opt); }
        if (createDropdown) { const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name; createDropdown.appendChild(opt); }
      });

      if (currentTaskProjectID && taskDropdown && Array.from(taskDropdown.options).some(o => o.value === currentTaskProjectID)) {
        taskDropdown.value = currentTaskProjectID;
      } else if (quiet && prevTaskDropdownVal && taskDropdown && Array.from(taskDropdown.options).some(o => o.value === prevTaskDropdownVal)) {
        taskDropdown.value = prevTaskDropdownVal;
      }

      loadMemberCheckboxes();
      renderProgressTable();

    } else if (!quiet) {
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colSpanCount}" class="empty-state">Lỗi Server: ${escapeHtml(response.message)}</td></tr>`;
    } else {
      showToast('Lỗi tải dự án: ' + response.message, 'error');
    }
  } catch (err) {
    console.error('Lỗi tải dự án:', err);
    if (!quiet) {
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colSpanCount}" class="empty-state">Lỗi kết nối: ${escapeHtml(err.message)}</td></tr>`;
    } else {
      showToast('Lỗi kết nối: ' + err.message, 'error');
    }
  }
}

// Alias giữ tên cũ để không phải sửa mọi nơi đang gọi loadProgressList()
async function loadProgressList(options) {
  return loadProjectOverview(options);
}

function renderProgressTable() {
  const tableBody = document.getElementById('progress-table-body');
  if (!tableBody) return;

  const colSpanCount = 7;
  const filterOwnerDropdown = document.getElementById('progress-search-input');
  const filterProjectDropdown = document.getElementById('progress-project-filter');
  const sortSelect = document.getElementById('progress-sort-select');

  const filterOwner = filterOwnerDropdown ? filterOwnerDropdown.value : '';
  const filterProject = filterProjectDropdown ? filterProjectDropdown.value : '';
  const sortVal = sortSelect ? sortSelect.value : 'date_desc';

  let projects = (globalAllProjects || []).filter(p => {
    const matchOwner = !filterOwner || p.owner === filterOwner;
    const matchProject = !filterProject || p.name === filterProject;
    return matchOwner && matchProject;
  });

  if (sortVal === 'percent_desc') {
    projects.sort((a, b) => (b.percent || 0) - (a.percent || 0));
  } else if (sortVal === 'percent_asc') {
    projects.sort((a, b) => (a.percent || 0) - (b.percent || 0));
  } else if (sortVal === 'date_asc') {
    projects.sort((a, b) => new Date(a.created_at || a.lastUpdated || 0) - new Date(b.created_at || b.lastUpdated || 0));
  } else {
    projects.sort((a, b) => new Date(b.created_at || b.lastUpdated || 0) - new Date(a.created_at || a.lastUpdated || 0));
  }

  if (!projects.length) {
    tableBody.innerHTML = `<tr><td colspan="${colSpanCount}" class="empty-state">Không tìm thấy kết quả phù hợp.</td></tr>`;
    return;
  }

  tableBody.innerHTML = '';
  projects.forEach(p => {
    const row = tableBody.insertRow();

    const safeName = escapeHtml(p.name);
    const safeNameArg = escapeHtml(escapeJs(p.name));
    const safeIdArg = escapeHtml(escapeJs(p.id));

    const shared = p.isShared === true || p.isShared === 'true';
    const centerColContent = `<button class="icon-btn${shared ? ' success' : ''}" onclick="shareProjectAction('${safeIdArg}', '${safeNameArg}')" title="${shared ? 'Đã chia sẻ. Bấm để share lại.' : 'Chia sẻ sang Dashboard Chung'}">
      <i class="fa-solid ${shared ? 'fa-circle-check' : 'fa-share-from-square'}"></i>
    </button>`;

    const statusBadge = p.status
      ? `<span class="status-pill pill-neutral" style="font-size:10px; padding:1px 8px; margin-left:6px;">${escapeHtml(p.status)}</span>`
      : '';

    let overdueBadge = '';
    if (p.overdueCount > 0) {
      overdueBadge = `<span class="due-badge overdue" title="${p.overdueCount} công việc quá hạn"><i class="fa-solid fa-triangle-exclamation"></i> ${p.overdueCount}</span>`;
    } else if (p.dueSoonCount > 0) {
      overdueBadge = `<span class="due-badge due-soon" title="${p.dueSoonCount} công việc sắp đến hạn"><i class="fa-regular fa-clock"></i> ${p.dueSoonCount}</span>`;
    }

    row.innerHTML = `
      <td style="font-weight: 700; color: var(--text-primary);">${safeName}${statusBadge}${overdueBadge}</td>
      <td>
        <div class="progress">
          <div class="progress-bar ${getProgressBarColor(p.percent)}" style="width: ${p.percent}%;">${p.percent}%</div>
        </div>
      </td>
      <td style="color: var(--text-muted); font-size: 13px;">${escapeHtml(p.description || '')}</td>
      <td style="text-align:center;">${centerColContent}</td>
      <td style="font-size: 13px; color: var(--text-secondary);">${escapeHtml(p.lastUpdated || '')}</td>
      <td style="font-size: 13px; font-weight: 600;">${escapeHtml(p.owner || '')}</td>
      <td style="text-align:center; white-space:nowrap;">
        <button class="icon-btn" onclick="toggleProjectArchive('${safeIdArg}', '${safeNameArg}', ${p.archivedAt ? 'false' : 'true'})" title="${p.archivedAt ? 'Đưa trở lại danh sách đang chạy' : 'Lưu trữ dự án'}">
          <i class="fa-solid ${p.archivedAt ? 'fa-box-open' : 'fa-box-archive'}"></i>
        </button>
        <button class="icon-btn danger" onclick="deleteProjectAction('${safeIdArg}', '${safeNameArg}')" title="Xóa Dự Án">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
  });
}

async function toggleProjectArchive(projectId, projectName, archive) {
  try {
    const response = await callGAS('setProjectArchived', { projectId, archived: archive, groupKey: activeGroup });
    if (response.status !== 'success') throw new Error(response.message);
    showToast(response.message || 'Đã cập nhật.', 'success');
    loadProjectOverview({ quiet: true });
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

function toggleArchivedProjectsView() {
  showArchivedProjects = !showArchivedProjects;
  const btn = document.getElementById('toggle-archived-btn');
  if (btn) {
    btn.classList.toggle('active', showArchivedProjects);
    btn.innerHTML = showArchivedProjects
      ? '<i class="fa-solid fa-box-open"></i> Đang xem: Kho lưu trữ'
      : '<i class="fa-solid fa-box-archive"></i> Xem kho lưu trữ';
  }
  loadProjectOverview();
}

function deleteProjectAction(projectId, projectName) {
  Swal.fire({
    title: 'CẢNH BÁO XÓA DỰ ÁN!',
    html: `Bạn đang chọn xóa dự án: <b>"${escapeHtml(projectName)}"</b><br><br>
            Hành động này sẽ xóa vĩnh viễn dự án này <br>
            VÀ <b>TẤT CẢ CÁC TASK CON</b> liên quan!<br><br>
            Không thể khôi phục được!`,
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: 'var(--danger-color)',
    cancelButtonColor: 'var(--text-muted)',
    confirmButtonText: 'XÓA LÀ MẤT HẾT ĐÓ NHA!',
    cancelButtonText: 'Nghĩ kỹ lại đi ae!'
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Đang xóa dữ liệu...',
      text: 'Vui lòng không tắt trình duyệt',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const response = await callGAS('deleteProject', { projectId, groupKey: activeGroup });

      if (response.status === 'success') {
        Swal.fire('Đã xóa!', response.message || '', 'success');

        if (currentTaskProjectID === projectId) {
          currentTaskProjectID = null;
          const taskBody = document.getElementById('task-table-body');
          if (taskBody) taskBody.innerHTML = '<tr><td colspan="7" class="empty-state">Vui lòng chọn dự án để xem công việc.</td></tr>';
        }

        loadProgressList({ quiet: true });
      } else {
        Swal.fire('Lỗi!', 'Không thể xóa dự án: ' + response.message, 'error');
      }
    } catch (err) {
      console.error('Lỗi xóa dự án:', err);
      Swal.fire('Lỗi!', 'Lỗi kết nối: ' + (err.message || err), 'error');
    }
  });
}

async function handleProjectCreationOrUpdate() {
  const btn = document.getElementById('update-progress-btn');
  const nameInput = document.getElementById('progress-project-name');
  const noteInput = document.getElementById('progress-note-input');
  const statusInput = document.getElementById('progress-status-select');
  const selectInput = document.getElementById('project-select');

  const newName = nameInput.value.trim();
  const note = noteInput.value.trim();
  const status = statusInput ? statusInput.value : '';
  const selectedProjectId = selectInput.value;

  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  btn.disabled = true;

  try {
    if (!selectedProjectId && newName) {
      const response = await callGAS('createProject', {
        name: newName,
        owner: CURRENT_USER.email || 'Unknown',
        status: status || 'Planning',
        description: note,
        groupKey: activeGroup
      });

      if (response.status === 'success') {
        showToast(response.message || 'Đã tạo dự án.', 'success');
        nameInput.value = '';
        noteInput.value = '';
        if (statusInput) statusInput.value = 'Planning';
        loadProjectOverview({ quiet: true });
      } else {
        showToast('Lỗi: ' + response.message, 'error');
      }
    } else if (selectedProjectId) {
      const response = await callGAS('updateProject', {
        projectId: selectedProjectId,
        status,
        description: note,
        groupKey: activeGroup
      });

      if (response.status === 'success') {
        showToast(response.message || 'Đã cập nhật.', 'success');
        loadProjectOverview({ quiet: true });
      } else {
        showToast('Lỗi cập nhật: ' + response.message, 'error');
      }
    } else {
      showToast('Vui lòng nhập tên dự án mới hoặc chọn dự án để cập nhật.', 'warning');
    }
  } catch (err) {
    console.error('Lỗi xử lý dự án:', err);
    showToast('Lỗi hệ thống: ' + (err.message || err), 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function shareProjectAction(projectId, projectName) {
  Swal.fire({
    title: 'Chia sẻ Dự án?',
    html: `Bạn có muốn sao chép dự án <b>"${escapeHtml(projectName)}"</b> và toàn bộ công việc sang Dashboard Chung không?<br><small style="color: var(--text-muted);">(Sẽ tạo một bản sao mới)</small>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: 'var(--cyan-accent)',
    cancelButtonColor: 'var(--text-muted)',
    confirmButtonText: 'Chia sẻ cho thầy đi!',
    cancelButtonText: 'Thôi'
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Đang share...',
      text: 'Vui lòng chờ trong giây lát',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const response = await callGAS('shareProject', { projectId, groupKey: activeGroup });

      if (response.status === 'success') {
        Swal.fire('Thành công!', response.message || '', 'success');
        loadProjectOverview({ quiet: true });
      } else {
        Swal.fire('Lỗi!', 'Không thể share: ' + response.message, 'error');
      }
    } catch (err) {
      console.error('Lỗi share dự án:', err);
      Swal.fire('Lỗi!', 'Lỗi kết nối: ' + (err.message || err), 'error');
    }
  });
}

// -------------------- Task (table view) module --------------------

let globalAllTasks = [];
let editingTaskBaseUpdatedAt = null;
let taskAssigneeExpanded = false;

async function loadTasksForProject(projectId, options) {
  const quiet = !!(options && options.quiet);
  const tableBody = document.getElementById('task-table-body');
  const modalProjectId = document.getElementById('new-task-project-id');

  currentTaskProjectID = projectId;
  if (modalProjectId) modalProjectId.value = projectId;

  if (!projectId) {
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Vui lòng chọn dự án để xem công việc.</td></tr>';
    return;
  }

  if (!quiet && tableBody) tableBody.innerHTML = skeletonTableRows(7, 6);

  try {
    const response = await callGAS('getTaskList', { projectId, groupKey: activeGroup });

    if (response.status === 'success') {
      globalAllTasks = response.data || [];

      const taskNameSelect = document.getElementById('filter-task-name');
      if (taskNameSelect) {
        const prevName = taskNameSelect.value;
        taskNameSelect.innerHTML = '<option value="">-- Tất cả công việc --</option>';
        const uniqueNames = [...new Set(globalAllTasks.map(t => t.name))];
        uniqueNames.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          taskNameSelect.appendChild(opt);
        });
        if (prevName && uniqueNames.includes(prevName)) taskNameSelect.value = prevName;
      }

      populateLabelFilter();
      applyTaskFilters();

    } else {
      if (!quiet && tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Lỗi: ${escapeHtml(response.message)}</td></tr>`;
      showToast('Lỗi tải task: ' + response.message, 'error');
    }
  } catch (err) {
    console.error('Lỗi tải task:', err);
    if (!quiet && tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Lỗi kết nối server!</td></tr>';
    showToast('Lỗi kết nối: ' + err.message, 'error');
  }
}

function renderTasks(tasks) {
  const tableBody = document.getElementById('task-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Chưa có công việc nào.</td></tr>';
    return;
  }

  tasks.forEach(t => {
    // Escape 2 lớp: escapeJs cho chuỗi nằm trong tham số onclick, escapeHtml cho thuộc tính HTML
    const safeName = escapeHtml(escapeJs(t.name));
    const safeDesc = escapeHtml(escapeJs(t.description || '').replace(/\r?\n/g, '\\n'));
    const safeAssignees = escapeHtml(escapeJs(t.assignees || ''));

    let avatarsHTML = '<div class="avatar-stack">';
    if (t.assigneeNames && t.assigneeNames.length > 0) {
      t.assigneeNames.forEach(name => {
        const short = name.trim().substring(0, 2).toUpperCase();
        avatarsHTML += `<div class="task-avatar" title="${escapeHtml(name)}">${escapeHtml(short)}</div>`;
      });
    } else {
      avatarsHTML += '<span style="color: var(--text-muted); font-size: 12px; padding-left: 4px;">--</span>';
    }
    avatarsHTML += '</div>';

    const statusColor = getStatusColor(t.status);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="border-left: 3px solid ${statusColor}; font-weight: 600;">
        ${escapeHtml(t.name)}
        ${renderLabelChips(t.labels)}
      </td>
      <td>${avatarsHTML}</td>
      <td>
        <div style="color: var(--text-muted); font-size: 12.5px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(t.description || '')}">
          ${escapeHtml(t.description || '')}
        </div>
      </td>
      <td>${renderBadge('status', t.status)}</td>
      <td style="font-size: 12.5px; color: var(--text-muted); white-space: nowrap;">${escapeHtml(t.dueDate || '--')}${getDueDateBadge(t.dueDate, t.status)}</td>
      <td>${renderBadge('priority', t.priority)}</td>
      <td style="white-space: nowrap;">
        <button class="icon-btn" title="Sửa" onclick="openEditTask('${t.id}', '${safeName}', '${escapeHtml(escapeJs(t.status))}', '${escapeHtml(escapeJs(t.priority))}', '${escapeHtml(escapeJs(t.dueDate || ''))}', '${safeAssignees}', '${safeDesc}')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn danger" title="Xóa" onclick="deleteTaskAction('${t.id}', '${safeName}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function resetTaskModalUI() {
  const form = document.getElementById('task-form');
  if (form) form.reset();
  editingTaskBaseUpdatedAt = null;
  const idInput = document.getElementById('task-id');
  if (idInput) idInput.value = '';
  const parentInput = document.getElementById('new-task-parent-id');
  if (parentInput) parentInput.value = '';
  document.querySelectorAll('input[name="task-assignees"]').forEach(cb => cb.checked = false);

  const submitBtn = document.querySelector('#task-form button[type="submit"]');
  if (submitBtn) submitBtn.innerHTML = 'Lưu Công Việc';
}

function openAddTask() {
  resetTaskModalUI();
  if (currentTaskProjectID) {
    const projInput = document.getElementById('new-task-project-id');
    if (projInput) projInput.value = currentTaskProjectID;
  }
  openAppModal('add-task-modal');
}

function openEditTask(id, name, status, priority, dueDate, assigneesStr, description) {
  const sourceTask = (globalAllTasks || []).find(t => t.id === id);
  editingTaskBaseUpdatedAt = sourceTask ? (sourceTask.updated_at || null) : null;

  const labelsInput = document.getElementById('new-task-labels');
  if (labelsInput) labelsInput.value = sourceTask ? (sourceTask.labels || '') : '';

  document.getElementById('task-id').value = id;
  document.getElementById('new-task-name').value = name;
  document.getElementById('new-task-status').value = status;
  document.getElementById('new-task-priority').value = priority;
  document.getElementById('new-task-duedate').value = dueDate;
  document.getElementById('new-task-desc').value = description || '';

  if (currentTaskProjectID) {
    const projInput = document.getElementById('new-task-project-id');
    if (projInput) projInput.value = currentTaskProjectID;
  }

  const checkboxes = document.querySelectorAll('input[name="task-assignees"]');
  const assignedEmails = (assigneesStr || '').toLowerCase().split(',').map(e => e.trim());
  checkboxes.forEach(cb => { cb.checked = assignedEmails.includes(cb.value.toLowerCase()); });

  const submitBtn = document.querySelector('#task-form button[type="submit"]');
  if (submitBtn) submitBtn.innerHTML = 'Cập nhật';

  openAppModal('add-task-modal');
}

async function handleTaskFormSubmit(e) {
  if (e) e.preventDefault();

  const form = document.getElementById('task-form');
  const submitBtn = form.querySelector('button[type="submit"]');

  const checkboxes = document.querySelectorAll('input[name="task-assignees"]:checked');
  const selectedEmails = Array.from(checkboxes).map(cb => cb.value).join(',');

  const taskData = {
    id: document.getElementById('task-id').value,
    projectId: document.getElementById('new-task-project-id').value,
    name: document.getElementById('new-task-name').value,
    status: document.getElementById('new-task-status').value,
    priority: document.getElementById('new-task-priority').value,
    dueDate: document.getElementById('new-task-duedate').value,
    assignees: selectedEmails,
    description: document.getElementById('new-task-desc').value,
    labels: normalizeLabels(document.getElementById('new-task-labels') ? document.getElementById('new-task-labels').value : ''),
    baseUpdatedAt: editingTaskBaseUpdatedAt
  };

  if (!taskData.projectId) {
    showToast('Lỗi: Không xác định được Dự án! Vui lòng chọn lại dự án.', 'error');
    closeAppModal('add-task-modal');
    return;
  }

  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

  try {
    const response = await callGAS('saveTask', { ...taskData, groupKey: activeGroup });

    if (response.status === 'success') {
      showToast(response.message || 'Đã lưu công việc.', 'success');
      closeAppModal('add-task-modal');
      resetTaskModalUI();

      loadTasksForProject(taskData.projectId, { quiet: true });
      loadProjectOverview({ quiet: true });
    } else {
      showToast('Lỗi: ' + response.message, 'error');
    }
  } catch (err) {
    console.error('Lỗi submit task:', err);
    showToast('Lỗi hệ thống: ' + (err.message || err), 'error');
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

function deleteTaskAction(taskId, taskName) {
  Swal.fire({
    title: 'Xóa Công Việc?',
    text: `Bạn có chắc chắn muốn xóa công việc: "${taskName}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--danger-color)',
    cancelButtonColor: 'var(--text-muted)',
    confirmButtonText: 'Xóa liền đi người ae!',
    cancelButtonText: 'Nghĩ lại òi!'
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Đang xóa công việc...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const response = await callGAS('deleteTask', { taskId, projectId: currentTaskProjectID, groupKey: activeGroup });

      if (response.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: response.message || '',
          timer: 1500,
          showConfirmButton: false
        });

        if (currentTaskProjectID) {
          loadTasksForProject(currentTaskProjectID, { quiet: true });
          loadProjectOverview({ quiet: true });
        }
      } else {
        Swal.fire('Lỗi!', 'Không thể xóa: ' + response.message, 'error');
      }
    } catch (err) {
      console.error('Lỗi xóa task:', err);
      Swal.fire('Lỗi!', 'Lỗi kết nối: ' + (err.message || err), 'error');
    }
  });
}

// -------------------- Task assignee / filter dropdowns --------------------

async function loadMemberCheckboxes() {
  const container = document.getElementById('checkboxes');
  if (!container) return;

  container.innerHTML = '<div style="padding:8px; color: var(--text-muted); font-size:12.5px;">Đang tải...</div>';

  try {
    const response = await callGAS('getAllUsers', { groupKey: activeGroup });

    if (response.status === 'success') {
      const users = response.data || [];
      container.innerHTML = '';

      if (users.length === 0) {
        container.innerHTML = '<div style="padding:8px; color: var(--text-muted); font-size:12.5px;">Chưa có thành viên.</div>';
        return;
      }

      users.forEach(u => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="task-assignees" value="${escapeHtml(u.email)}"> ${escapeHtml(u.name)}`;
        container.appendChild(label);
      });
    } else {
      container.innerHTML = `<div style="padding:8px; color: var(--danger-color); font-size:12.5px;">Lỗi: ${escapeHtml(response.message)}</div>`;
    }
  } catch (err) {
    console.error('Lỗi tải thành viên:', err);
    container.innerHTML = '<div style="padding:8px; color: var(--danger-color); font-size:12.5px;">Lỗi kết nối server!</div>';
  }
}

function showCheckboxes() {
  const checkboxes = document.getElementById('checkboxes');
  if (!checkboxes) return;
  taskAssigneeExpanded = !taskAssigneeExpanded;
  checkboxes.style.display = taskAssigneeExpanded ? 'block' : 'none';
}

async function loadAssigneeDropdown() {
  const assigneeSelect = document.getElementById('filter-assignee');
  if (!assigneeSelect) return;

  try {
    const response = await callGAS('getAllUsers', { groupKey: activeGroup });

    if (response.status === 'success') {
      const members = response.data || [];
      const prevAssignee = assigneeSelect.value;

      assigneeSelect.innerHTML = '<option value="all">Tất cả thành viên</option>';

      members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.email.toLowerCase().trim();
        opt.textContent = m.name;
        assigneeSelect.appendChild(opt);
      });

      if (prevAssignee && [...assigneeSelect.options].some(o => o.value === prevAssignee)) {
        assigneeSelect.value = prevAssignee;
      }
    } else {
      console.error('Lỗi tải assignee filter:', response.message);
    }
  } catch (err) {
    console.error('Lỗi kết nối assignee filter:', err);
  }
}

function applyTaskFilters() {
  const nameInput = document.getElementById('filter-task-name');
  const statusInput = document.getElementById('filter-status');
  const priorityInput = document.getElementById('filter-priority');
  const assigneeInput = document.getElementById('filter-assignee');
  const labelInput = document.getElementById('filter-label');

  const nameVal = nameInput ? nameInput.value.toLowerCase() : '';
  const statusVal = statusInput ? statusInput.value : 'all';
  const priorityVal = priorityInput ? priorityInput.value : 'all';
  const assigneeVal = assigneeInput ? assigneeInput.value.toLowerCase() : 'all';
  const labelVal = labelInput ? labelInput.value.toLowerCase() : 'all';

  if (!globalAllTasks) globalAllTasks = [];

  const filteredTasks = globalAllTasks.filter(t => {
    const matchName = (t.name || '').toLowerCase().includes(nameVal);
    const matchStatus = (statusVal === 'all') || (t.status === statusVal);
    const matchPriority = (priorityVal === 'all') || (t.priority === priorityVal);
    const assigneeList = t.assignees ? t.assignees.toLowerCase().split(',').map(e => e.trim()) : [];
    const matchAssignee = (assigneeVal === 'all') || assigneeList.includes(assigneeVal);
    const taskLabels = parseLabels(t.labels).map(l => l.toLowerCase());
    const matchLabel = (labelVal === 'all') || taskLabels.includes(labelVal);

    return matchName && matchStatus && matchPriority && matchAssignee && matchLabel;
  });

  renderTasks(filteredTasks);
}

function onProjectChange() {
  const select = document.getElementById('task-project-select');
  if (!select) return;
  loadTasksForProject(select.value);
}

// -------------------- Calendar module --------------------

let currentCalendarType = 'group';
let selectedDate = new Date();
let currentCalendarDate = new Date();
let currentMonthEvents = [];
let selectedEventId = null;
let eventAttendeesExpanded = false;

let manageEventBtn = null;
let todayEventList = null;
let eventForm = null;
let eventModalDefaultTitleHTML = null;
let eventModalDefaultSubmitHTML = null;

// quiet = true: tải lại sau khi lưu/xóa sự kiện — không xóa trắng danh sách sự kiện
// trong ngày ra placeholder.
async function loadCalendarData(options) {
  const quiet = !!(options && options.quiet);
  const calendarToggle = document.getElementById('calendar-toggle');
  if (calendarToggle) currentCalendarType = calendarToggle.value;

  renderCalendarGrid(currentCalendarDate);
  updateSelectedDateHeader();

  const listContainer = document.getElementById('today-event-list');
  if (!quiet && listContainer) listContainer.innerHTML = skeletonListItems(3);

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  try {
    const response = await callGAS('getEvents', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      calendarType: currentCalendarType,
      groupKey: activeGroup,
      email: CURRENT_USER.email || null
    });

    if (response.status === 'success') {
      currentMonthEvents = response.data || [];
      renderEventDots();
      renderEventsForSelectedDate();
    } else {
      handleCalendarError({ message: response.message });
    }
  } catch (error) {
    handleCalendarError(error);
  }
}

function renderCalendarGrid(date) {
  const container = document.getElementById('full-calendar-display');
  if (!container) return;

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  let html = `
    <div class="calendar-header">
      <button class="btn-nav-month" onclick="changeMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <h2>${monthNames[month]} ${year}</h2>
      <button class="btn-nav-month" onclick="changeMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-day-name">CN</div>
      <div class="calendar-day-name">T2</div>
      <div class="calendar-day-name">T3</div>
      <div class="calendar-day-name">T4</div>
      <div class="calendar-day-name">T5</div>
      <div class="calendar-day-name">T6</div>
      <div class="calendar-day-name">T7</div>
  `;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    let isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ? 'today' : '';
    let isSelected = (day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) ? 'selected' : '';
    let dateId = `day-${year}-${month}-${day}`;

    html += `
      <div class="calendar-day ${isToday} ${isSelected}" id="${dateId}" onclick="selectDate(${year}, ${month}, ${day})">
        <span>${day}</span>
        <div class="event-dot"></div>
      </div>
    `;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function renderEventDots() {
  if (!currentMonthEvents || currentMonthEvents.length === 0) return;

  currentMonthEvents.forEach(event => {
    const d = new Date(event.startTime);
    if (d.getMonth() === currentCalendarDate.getMonth() && d.getFullYear() === currentCalendarDate.getFullYear()) {
      const dayId = `day-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const dayEl = document.getElementById(dayId);
      if (dayEl) dayEl.classList.add('has-event');
    }
  });
}

window.selectDate = function (year, month, day) {
  selectedDate = new Date(year, month, day);

  const oldSelected = document.querySelector('.calendar-day.selected');
  if (oldSelected) oldSelected.classList.remove('selected');

  const newSelected = document.getElementById(`day-${year}-${month}-${day}`);
  if (newSelected) newSelected.classList.add('selected');

  updateSelectedDateHeader();
  renderEventsForSelectedDate();
};

window.changeMonth = function (step) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + step);
  loadCalendarData();
};

function updateSelectedDateHeader() {
  const widgetTitle = document.querySelector('.today-events-widget h3');
  if (widgetTitle) {
    const dateStr = selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
    widgetTitle.innerHTML = `${dateStr}`;
  }
}

function renderEventsForSelectedDate() {
  const listContainer = document.getElementById('today-event-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  selectedEventId = null;

  const dailyEvents = (currentMonthEvents || []).filter(e => {
    const d = new Date(e.startTime);
    return d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear();
  });

  dailyEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  if (dailyEvents.length === 0) {
    listContainer.innerHTML = '<p style="color: var(--text-muted); text-align:center; margin-top: 12px;">Không có sự kiện nào.</p>';
    if (manageEventBtn) manageEventBtn.disabled = true;
    return;
  }

  dailyEvents.forEach(event => {
    // Task có due_date được gộp vào lịch nhóm — render khác hẳn sự kiện thật, click để
    // nhảy sang tab Nhiệm Vụ đúng dự án của task đó.
    if (event.type === 'task') {
      const taskDiv = document.createElement('div');
      taskDiv.className = 'event-item task-event-item';
      taskDiv.innerHTML =
        '<div class="event-title"><i class="fa-solid fa-list-check"></i> ' + escapeHtml(event.title) + '</div>' +
        '<div style="font-size:12px; color: var(--text-muted); margin-bottom:6px;"><i class="fa-solid fa-diagram-project"></i> ' + escapeHtml(event.projectName || '') + '</div>' +
        '<div class="event-meta">' + renderBadge('status', event.status) + '</div>';
      taskDiv.addEventListener('click', () => {
        if (event.projectId) {
          switchSection('task');
          const sel = document.getElementById('task-project-select');
          if (sel) { sel.value = event.projectId; onProjectChange(); }
        }
      });
      listContainer.appendChild(taskDiv);
      return;
    }

    const timeStr = new Date(event.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = new Date(event.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const isImportant = event.isImportant ? 'important' : '';

    const div = document.createElement('div');
    div.className = `event-item ${isImportant}`;
    div.setAttribute('data-id', event.id);
    div.setAttribute('data-important', event.isImportant);

    const recurrenceLabel = { daily: 'Lặp hằng ngày', weekly: 'Lặp hằng tuần', monthly: 'Lặp hằng tháng' }[event.recurrence];
    const attendeeCount = (event.attendees || '').split(',').map(x => x.trim()).filter(Boolean).length;

    div.innerHTML =
      '<div class="event-time">' + timeStr + ' - ' + endTimeStr + '</div>' +
      '<div class="event-title">' + escapeHtml(event.title) + (recurrenceLabel ? ' <i class="fa-solid fa-rotate" style="font-size:0.75em; color: var(--text-muted);" title="' + recurrenceLabel + '"></i>' : '') + '</div>' +
      (event.description ? '<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px; font-style: italic;">' + escapeHtml(event.description) + '</div>' : '') +
      '<div class="event-meta">' +
      (event.location ? '<span><i class="fa-solid fa-location-dot"></i> ' + escapeHtml(event.location) + '</span>' : '') +
      (attendeeCount > 0 ? '<span><i class="fa-solid fa-user-group"></i> ' + attendeeCount + '</span>' : '') +
      '</div>' +
      '<button class="btn-edit-event-mini" title="Sửa" onclick="openEditEvent(\'' + event.id + '\', event)"><i class="fa-solid fa-pen"></i></button>' +
      '<button class="btn-delete-event-mini" title="Xóa" onclick="quickDeleteEvent(\'' + event.id + '\', \'' + escapeJs(event.title) + '\', event)"><i class="fa-solid fa-trash"></i></button>';

    div.addEventListener('click', () => {
      document.querySelectorAll('.event-item').forEach(el => el.style.borderRight = 'none');
      div.style.borderRight = '3px solid var(--cyan-accent)';
      selectedEventId = event.id;

      if (manageEventBtn) {
        manageEventBtn.disabled = false;
        manageEventBtn.innerHTML = event.isImportant
          ? '<i class="fa-solid fa-star-half"></i> Bỏ quan trọng'
          : '<i class="fa-solid fa-star"></i> Đánh dấu quan trọng';
      }
    });

    listContainer.appendChild(div);
  });
}

function toggleRecurrenceEndVisibility() {
  const sel = document.getElementById('event-recurrence');
  const group = document.getElementById('recurrence-end-group');
  if (!sel || !group) return;
  group.style.display = sel.value === 'none' ? 'none' : 'block';
}

function showEventAttendeeCheckboxes() {
  const box = document.getElementById('event-attendee-checkboxes');
  if (!box) return;
  eventAttendeesExpanded = !eventAttendeesExpanded;
  box.style.display = eventAttendeesExpanded ? 'block' : 'none';
}

async function loadEventAttendeeCheckboxes() {
  const container = document.getElementById('event-attendee-checkboxes');
  if (!container) return;
  container.innerHTML = '<div style="padding:8px; color: var(--text-muted); font-size:12.5px;">Đang tải...</div>';

  try {
    const response = await callGAS('getAllUsers', { groupKey: activeGroup });
    if (response.status === 'success') {
      const users = response.data || [];
      container.innerHTML = '';

      if (users.length === 0) {
        container.innerHTML = '<div style="padding:8px; color: var(--text-muted); font-size:12.5px;">Chưa có thành viên.</div>';
        return;
      }

      users.forEach(u => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="event-attendees" value="${escapeHtml(u.email)}"> ${escapeHtml(u.name)}`;
        container.appendChild(label);
      });
    } else {
      container.innerHTML = `<div style="padding:8px; color: var(--danger-color); font-size:12.5px;">Lỗi: ${escapeHtml(response.message)}</div>`;
    }
  } catch (err) {
    console.error('Lỗi tải danh sách mời:', err);
    container.innerHTML = '<div style="padding:8px; color: var(--danger-color); font-size:12.5px;">Lỗi kết nối server!</div>';
  }
}

function resetEventModalUI() {
  const idInput = document.getElementById('event-id');
  if (idInput) idInput.value = '';

  const modalTitle = document.getElementById('event-modal-title');
  if (modalTitle && eventModalDefaultTitleHTML !== null) modalTitle.innerHTML = eventModalDefaultTitleHTML;

  const submitBtn = eventForm ? eventForm.querySelector('button[type="submit"]') : null;
  if (submitBtn && eventModalDefaultSubmitHTML !== null) submitBtn.innerHTML = eventModalDefaultSubmitHTML;

  document.querySelectorAll('input[name="event-attendees"]').forEach(cb => cb.checked = false);
  toggleRecurrenceEndVisibility();
}

window.openEditEvent = function (id, e) {
  if (e && e.stopPropagation) e.stopPropagation();

  const event = (currentMonthEvents || []).find(ev => ev.id === id);
  if (!event) return;

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const pad = n => String(n).padStart(2, '0');
  const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeStr = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  document.getElementById('event-id').value = event.id;
  document.getElementById('event-title').value = event.title || '';
  document.getElementById('start-date').value = toDateStr(start);
  document.getElementById('start-time').value = toTimeStr(start);
  document.getElementById('end-date').value = toDateStr(end);
  document.getElementById('end-time').value = toTimeStr(end);
  document.getElementById('location').value = event.location || '';
  document.getElementById('description').value = event.description || '';

  const recurrenceSel = document.getElementById('event-recurrence');
  if (recurrenceSel) recurrenceSel.value = event.recurrence || 'none';
  const recurrenceEndInput = document.getElementById('event-recurrence-end');
  if (recurrenceEndInput) recurrenceEndInput.value = event.recurrenceEnd || '';
  toggleRecurrenceEndVisibility();

  const attendeeEmails = (event.attendees || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  document.querySelectorAll('input[name="event-attendees"]').forEach(cb => {
    cb.checked = attendeeEmails.includes(cb.value.toLowerCase());
  });

  const modalTitle = document.getElementById('event-modal-title');
  if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen"></i> Sửa Sự Kiện';

  const submitBtn = eventForm ? eventForm.querySelector('button[type="submit"]') : null;
  if (submitBtn) submitBtn.innerHTML = 'Cập Nhật';

  openAppModal('add-event-modal');
};

window.quickDeleteEvent = function (id, title, e) {
  if (e && e.stopPropagation) e.stopPropagation();

  Swal.fire({
    title: 'Xóa nhanh?',
    text: `Bạn muốn xóa sự kiện "${title}" ngay lập tức?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--danger-color)',
    cancelButtonColor: 'var(--text-muted)',
    confirmButtonText: 'Xóa đi người ae',
    cancelButtonText: 'Nghĩ lại òi'
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    Swal.fire({ title: 'Đang xóa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const response = await callGAS('deleteEvent', {
        eventId: id,
        calendarType: currentCalendarType,
        groupKey: activeGroup,
        email: CURRENT_USER.email || null
      });

      if (response.status !== 'success') throw new Error(response.message || 'Xóa thất bại từ phía Server');

      Swal.fire({ icon: 'success', title: 'Đã xóa!', text: response.message || '', showConfirmButton: false, timer: 1000 });

      loadCalendarData({ quiet: true });

      if (selectedEventId === id) selectedEventId = null;

    } catch (err) {
      Swal.fire('Lỗi!', err.message || err, 'error');
    }
  });
};

function handleCalendarError(error) {
  console.error(error);
  showToast('Lỗi lịch: ' + (error && error.message ? error.message : error), 'error');
}

async function handleEventFormSubmit(e) {
  if (e) e.preventDefault();
  if (!eventForm) eventForm = document.getElementById('event-form');
  if (!eventForm) return;

  const formBtn = eventForm.querySelector('button[type="submit"]');
  const formData = new FormData(eventForm);
  const eventData = {};
  for (const [key, value] of formData.entries()) eventData[key] = value;

  const attendeeCbs = document.querySelectorAll('input[name="event-attendees"]:checked');
  eventData.attendees = Array.from(attendeeCbs).map(cb => cb.value).join(',');

  if (!eventData.title || !eventData.startDate || !eventData.startTime || !eventData.endDate || !eventData.endTime) {
    showToast('Vui lòng điền đầy đủ thông tin!', 'error');
    return;
  }

  const startObj = new Date(`${eventData.startDate}T${eventData.startTime}`);
  const endObj = new Date(`${eventData.endDate}T${eventData.endTime}`);

  if (endObj <= startObj) {
    showToast('Thời gian kết thúc phải sau thời gian bắt đầu!', 'warning');
    return;
  }

  const editingId = document.getElementById('event-id').value;
  const isEditing = !!editingId;

  const originalBtnText = formBtn ? formBtn.innerHTML : '';
  if (formBtn) {
    formBtn.disabled = true;
    formBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (isEditing ? 'Đang cập nhật...' : 'Đang tạo...');
  }

  try {
    const response = await callGAS(isEditing ? 'updateEvent' : 'createEvent', {
      ...eventData,
      eventId: editingId,
      calendarType: currentCalendarType,
      groupKey: activeGroup,
      email: CURRENT_USER.email || null
    });

    if (response.status === 'success') {
      showToast(response.message || 'Đã lưu sự kiện.', 'success');
      closeAppModal('add-event-modal');
      eventForm.reset();
      resetEventModalUI();
      loadCalendarData({ quiet: true });
    } else {
      showToast('Lỗi: ' + response.message, 'error');
    }
  } catch (error) {
    showToast('Lỗi: ' + (error.message || error), 'error');
  } finally {
    if (formBtn) {
      formBtn.disabled = false;
      formBtn.innerHTML = originalBtnText || (isEditing ? 'Cập Nhật' : 'Tạo Sự Kiện');
    }
  }
}

async function handleManageEventClick() {
  if (!selectedEventId) { showToast('Vui lòng chọn sự kiện trước!', 'error'); return; }
  if (!todayEventList) todayEventList = document.getElementById('today-event-list');
  const selectedItem = todayEventList ? todayEventList.querySelector(`[data-id="${selectedEventId}"]`) : null;
  if (!selectedItem || !manageEventBtn) return;

  const isCurrentlyImportant = selectedItem.getAttribute('data-important') === 'true';
  const newImportant = !isCurrentlyImportant;

  const originalBtnText = manageEventBtn.innerHTML;
  manageEventBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  manageEventBtn.disabled = true;

  try {
    const response = await callGAS('toggleImportant', {
      eventId: selectedEventId,
      isImportant: newImportant,
      calendarType: currentCalendarType,
      groupKey: activeGroup,
      email: CURRENT_USER.email || null
    });

    if (response.status === 'success') {
      showToast(response.message || 'Đã cập nhật.', 'success');
      loadCalendarData({ quiet: true });
    } else {
      showToast('Lỗi: ' + response.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + (err.message || err), 'error');
  } finally {
    manageEventBtn.innerHTML = originalBtnText || '<i class="fa-solid fa-pen-to-square"></i> Quản Lý Sự Kiện';
    manageEventBtn.disabled = false;
  }
}

// -------------------- Wiring for the ported modules --------------------

document.addEventListener('DOMContentLoaded', () => {
  // Calendar DOM refs + default modal titles/labels (mỗi shell có icon/chữ riêng)
  eventForm = document.getElementById('event-form');
  const eventModalTitleEl = document.getElementById('event-modal-title');
  if (eventModalTitleEl) eventModalDefaultTitleHTML = eventModalTitleEl.innerHTML;
  const eventSubmitBtnEl = eventForm ? eventForm.querySelector('button[type="submit"]') : null;
  if (eventSubmitBtnEl) eventModalDefaultSubmitHTML = eventSubmitBtnEl.innerHTML;

  manageEventBtn = document.getElementById('manage-event-btn');
  todayEventList = document.getElementById('today-event-list');

  const addEventBtn = document.getElementById('add-event-btn');
  if (addEventBtn) addEventBtn.addEventListener('click', () => {
    if (eventForm) eventForm.reset();
    resetEventModalUI();
    loadEventAttendeeCheckboxes();
    openAppModal('add-event-modal');
  });

  const calendarToggle = document.getElementById('calendar-toggle');
  if (calendarToggle) calendarToggle.addEventListener('change', () => {
    currentCalendarType = calendarToggle.value;
    loadCalendarData();
  });

  if (manageEventBtn) manageEventBtn.addEventListener('click', handleManageEventClick);

  // Progress: filter/sort dropdowns lọc lại từ cache (globalAllProjects), không gọi lại API
  const progressSearchInput = document.getElementById('progress-search-input');
  const progressProjectFilter = document.getElementById('progress-project-filter');
  const progressSortSelect = document.getElementById('progress-sort-select');
  if (progressSearchInput) progressSearchInput.addEventListener('change', () => renderProgressTable());
  if (progressProjectFilter) progressProjectFilter.addEventListener('change', () => renderProgressTable());
  if (progressSortSelect) progressSortSelect.addEventListener('change', () => renderProgressTable());

  // Đóng dropdown checkbox đa lựa chọn (người thực hiện / người mời) khi bấm ra ngoài
  document.addEventListener('click', (e) => {
    const cbBox = document.getElementById('checkboxes');
    if (cbBox && taskAssigneeExpanded && !cbBox.contains(e.target) && !e.target.closest('.selectBox')) {
      cbBox.style.display = 'none';
      taskAssigneeExpanded = false;
    }
    const evBox = document.getElementById('event-attendee-checkboxes');
    if (evBox && eventAttendeesExpanded && !evBox.contains(e.target) && !e.target.closest('.selectBox')) {
      evBox.style.display = 'none';
      eventAttendeesExpanded = false;
    }
  });
});
