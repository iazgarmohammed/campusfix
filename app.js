/* ========== STATE / STORAGE KEYS ========== */
const KEYS = {
  issues: "campusfix_issues",
  notifications: "campusfix_notifications",
  seeded: "campusfix_seeded",
  counter: "campusfix_counter"
};

let selectedPhotoDataUrl = null;
let currentDetailsIssueId = null;
let currentMaintenanceIssueId = null;

/* ========== DATA LAYER ========== */
function loadIssues() {
  return JSON.parse(localStorage.getItem(KEYS.issues) || "[]");
}
function saveIssues(issues) {
  localStorage.setItem(KEYS.issues, JSON.stringify(issues));
}
function loadNotifications() {
  return JSON.parse(localStorage.getItem(KEYS.notifications) || "[]");
}
function saveNotifications(notifs) {
  localStorage.setItem(KEYS.notifications, JSON.stringify(notifs));
}
function nextIssueId() {
  let counter = parseInt(localStorage.getItem(KEYS.counter) || "1023", 10);
  counter += 1;
  localStorage.setItem(KEYS.counter, String(counter));
  return `CF-${counter}`;
}

function seedDemoData() {
  if (localStorage.getItem(KEYS.seeded)) return;
  const now = Date.now();
  const demo = [
    mkDemoIssue("Electrical", "Flickering light in Block A corridor", "Block A → 2nd Floor → Corridor", "Open", now - 86400000 * 3, "assets/issue1.png"),
    mkDemoIssue("Plumbing", "Leaking tap in washroom", "Block B → Ground Floor → Washroom", "In Progress", now - 86400000 * 2, "assets/issue2.png"),
    mkDemoIssue("Wi-Fi / Internet", "No Wi-Fi signal in library", "Library → 1st Floor → Reading Hall", "Fixed", now - 86400000 * 5),
    mkDemoIssue("Cleanliness", "Overflowing trash bin", "Block C → Ground Floor → Entrance", "Open", now - 86400000),
    mkDemoIssue("Furniture", "Broken chair in classroom 204", "Block A → 2nd Floor → Room 204", "In Progress", now - 3600000 * 6),
    mkDemoIssue("Safety", "Loose railing on staircase", "Block D → 3rd Floor → Staircase", "Fixed", now - 86400000 * 7)
  ];
  saveIssues(demo);

  const notifs = demo.map((iss, i) => ({
    id: "N" + i,
    message: `${iss.id} reported: ${iss.title}`,
    issueId: iss.id,
    read: true,
    createdAt: iss.createdAt
  }));
  saveNotifications(notifs);
  localStorage.setItem(KEYS.seeded, "true");
}

function mkDemoIssue(category, title, location, status, timestamp, photo = null) {
  const iso = new Date(timestamp).toISOString();
  return {
    id: nextIssueId(),
    title,
    category,
    description: `Demo issue: ${title}.`,
    location,
    photo,
    reporterName: "Demo Student",
    reporterContact: null,
    status,
    createdAt: iso,
    updatedAt: iso
  };
}

function resetDemoData() {
  localStorage.removeItem(KEYS.issues);
  localStorage.removeItem(KEYS.notifications);
  localStorage.removeItem(KEYS.seeded);
  localStorage.removeItem(KEYS.counter);
  seedDemoData();
  refreshAll();
  showToast("Demo data reset");
}

/* ========== NAVIGATION ========== */
function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(n => {
    n.classList.toggle("active", n.dataset.view === viewId);
  });
  document.getElementById("mainNav").classList.remove("open");
  window.scrollTo(0, 0);
}

function setupNav() {
  document.querySelectorAll("[data-view]").forEach(el => {
    el.addEventListener("click", () => showView(el.dataset.view));
  });
  document.getElementById("hamburgerBtn").addEventListener("click", () => {
    document.getElementById("mainNav").classList.toggle("open");
  });
}

/* ========== TOAST ========== */
function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ========== REPORT FORM ========== */
function setupReportForm() {
  const form = document.getElementById("reportForm");
  document.getElementById("f-photo").addEventListener("change", handlePhotoFile);
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validateForm()) return;
    createIssue();
  });
}

function validateForm() {
  let valid = true;
  const fields = [
    { id: "f-category", err: "err-category", msg: "Category is required" },
    { id: "f-title", err: "err-title", msg: "Title is required" },
    { id: "f-description", err: "err-description", msg: "Description is required" },
    { id: "f-building", err: "err-building", msg: "Building is required" }
  ];
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const errEl = document.getElementById(f.err);
    if (!el.value.trim()) {
      el.classList.add("invalid");
      errEl.textContent = f.msg;
      valid = false;
    } else {
      el.classList.remove("invalid");
      errEl.textContent = "";
    }
  });
  return valid;
}

function handlePhotoFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = 480;
      const scale = targetWidth / img.width;
      const targetHeight = img.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      selectedPhotoDataUrl = canvas.toDataURL("image/jpeg", 0.6);
      document.getElementById("photoPreview").src = selectedPhotoDataUrl;
      document.getElementById("photoPreviewWrap").classList.remove("hidden");
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function createIssue() {
  const building = document.getElementById("f-building").value.trim();
  const floor = document.getElementById("f-floor").value.trim();
  const area = document.getElementById("f-area").value.trim();
  const locationParts = [building, floor, area].filter(Boolean);

  const issue = {
    id: nextIssueId(),
    title: document.getElementById("f-title").value.trim(),
    category: document.getElementById("f-category").value,
    description: document.getElementById("f-description").value.trim(),
    location: locationParts.join(" → "),
    photo: selectedPhotoDataUrl,
    reporterName: document.getElementById("f-reporterName").value.trim() || null,
    reporterContact: document.getElementById("f-reporterContact").value.trim() || null,
    status: "Open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const issues = loadIssues();
  issues.unshift(issue);
  saveIssues(issues);

  createNotification(`New issue reported: ${issue.title}`, issue.id);

  showToast(`Issue ${issue.id} submitted`);
  resetReportForm();
  refreshAll();
  currentDetailsIssueId = issue.id;
  renderIssueDetails(issue.id);
  showView("detailsView");
}

function resetReportForm() {
  document.getElementById("reportForm").reset();
  selectedPhotoDataUrl = null;
  document.getElementById("photoPreviewWrap").classList.add("hidden");
  document.querySelectorAll("#reportForm .invalid").forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll("#reportForm .error-msg").forEach(el => el.textContent = "");
}

/* ========== ISSUE LIST ========== */
function getFilteredIssues() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const activeChip = document.querySelector("#statusChips .chip.active");
  const status = activeChip ? activeChip.dataset.status : "All";
  const category = document.getElementById("categoryFilter").value;

  return loadIssues().filter(issue => {
    const matchesSearch = !search ||
      issue.title.toLowerCase().includes(search) ||
      issue.id.toLowerCase().includes(search) ||
      issue.location.toLowerCase().includes(search);
    const matchesStatus = status === "All" || issue.status === status;
    const matchesCategory = category === "All" || issue.category === category;
    return matchesSearch && matchesStatus && matchesCategory;
  });
}

function issueCardHTML(issue) {
  const thumb = issue.photo
    ? `<img src="${issue.photo}" alt="${issue.title}">`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
  return `
    <div class="issue-card" data-id="${issue.id}">
      <div class="issue-card-thumb">${thumb}</div>
      <div class="issue-card-body">
        <div class="issue-card-id">${issue.id}</div>
        <div class="issue-card-title">${escapeHtml(issue.title)}</div>
        <div class="issue-card-loc">${escapeHtml(issue.location)}</div>
        <div class="issue-card-footer">
          <span class="status-badge ${issue.status.replace(" ", "-")}">${issue.status}</span>
        </div>
      </div>
    </div>
  `;
}

function renderIssuesList() {
  const issues = getFilteredIssues();
  const grid = document.getElementById("issuesGrid");
  const emptyState = document.getElementById("issuesEmptyState");
  if (issues.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    grid.innerHTML = issues.map(issueCardHTML).join("");
  }
  grid.querySelectorAll(".issue-card").forEach(card => {
    card.addEventListener("click", () => {
      renderIssueDetails(card.dataset.id);
      showView("detailsView");
    });
  });
}

function setupIssuesToolbar() {
  document.getElementById("searchInput").addEventListener("input", renderIssuesList);
  document.getElementById("categoryFilter").addEventListener("change", renderIssuesList);
  document.querySelectorAll("#statusChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#statusChips .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderIssuesList();
    });
  });
}

/* ========== ISSUE DETAILS ========== */
function trackerHTML(status) {
  const steps = ["Open", "In Progress", "Fixed"];
  const currentIndex = steps.indexOf(status);
  return `
    <div class="tracker">
      ${steps.map((step, i) => `
        <div class="tracker-step ${i <= currentIndex ? "filled" : ""}">
          <div class="tracker-line"></div>
          <div class="tracker-dot">${i <= currentIndex ? "✓" : i + 1}</div>
          <div class="tracker-label">${step}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderIssueDetails(issueId) {
  currentDetailsIssueId = issueId;
  const issue = loadIssues().find(i => i.id === issueId);
  const container = document.getElementById("issueDetailsContent");
  if (!issue) {
    container.innerHTML = "<p>Issue not found.</p>";
    return;
  }
  container.innerHTML = `
    <div class="detail-card">
      ${issue.photo ? `<img class="detail-photo" src="${issue.photo}" alt="${issue.title}">` : ""}
      <div class="detail-meta">${issue.id} · ${issue.category}</div>
      <h2>${escapeHtml(issue.title)}</h2>
      <p>${escapeHtml(issue.description)}</p>
      <div class="detail-meta">Location: ${escapeHtml(issue.location)}</div>
      <div class="detail-meta">Reported by: ${escapeHtml(issue.reporterName || "Anonymous")}</div>
      <div class="detail-meta">Created: ${new Date(issue.createdAt).toLocaleString()}</div>
      <div class="detail-meta">Updated: ${new Date(issue.updatedAt).toLocaleString()}</div>
      ${trackerHTML(issue.status)}
      <button class="btn btn-primary" id="manageIssueBtn">Manage this issue</button>
    </div>
  `;
  document.getElementById("manageIssueBtn").addEventListener("click", () => {
    currentMaintenanceIssueId = issue.id;
    showView("maintenanceView");
    renderMaintenanceList();
    selectMaintenanceIssue(issue.id);
  });
}

/* ========== MAINTENANCE VIEW ========== */
function renderMaintenanceList() {
  const issues = loadIssues();
  const list = document.getElementById("maintenanceList");
  list.innerHTML = issues.map(issue => `
    <div class="maintenance-list-item ${issue.id === currentMaintenanceIssueId ? "selected" : ""}" data-id="${issue.id}">
      <strong>${issue.id}</strong> — ${escapeHtml(issue.title)}
      <div><span class="status-badge ${issue.status.replace(" ", "-")}">${issue.status}</span></div>
    </div>
  `).join("");
  list.querySelectorAll(".maintenance-list-item").forEach(item => {
    item.addEventListener("click", () => selectMaintenanceIssue(item.dataset.id));
  });
}

function selectMaintenanceIssue(issueId) {
  currentMaintenanceIssueId = issueId;
  renderMaintenanceList();
  const issue = loadIssues().find(i => i.id === issueId);
  const detail = document.getElementById("maintenanceDetail");
  if (!issue) {
    detail.innerHTML = `<p class="subtle">Select an issue to manage it.</p>`;
    return;
  }
  const steps = ["Open", "In Progress", "Fixed"];
  const currentIndex = steps.indexOf(issue.status);

  detail.innerHTML = `
    <h3>${issue.id} — ${escapeHtml(issue.title)}</h3>
    <div class="detail-meta">Location: ${escapeHtml(issue.location)}</div>
    <div class="status-badge ${issue.status.replace(" ", "-")}">${issue.status}</div>
    <div class="status-btn-row">
      ${steps.map((step, i) => `
        <button class="status-btn ${issue.status === step ? "current" : ""}"
          data-status="${step}"
          ${i <= currentIndex ? "disabled" : ""}>
          ${step}
        </button>
      `).join("")}
    </div>
  `;
  detail.querySelectorAll(".status-btn:not(:disabled)").forEach(btn => {
    btn.addEventListener("click", () => updateIssueStatus(issue.id, btn.dataset.status));
  });
}

function updateIssueStatus(issueId, newStatus) {
  const issues = loadIssues();
  const issue = issues.find(i => i.id === issueId);
  if (!issue) return;
  issue.status = newStatus;
  issue.updatedAt = new Date().toISOString();
  saveIssues(issues);
  createNotification(`${issue.id} moved to ${newStatus}`, issue.id);
  showToast(`${issue.id} → ${newStatus}`);
  refreshAll();
  selectMaintenanceIssue(issueId);
}

/* ========== NOTIFICATIONS ========== */
function createNotification(message, issueId) {
  const notifs = loadNotifications();
  notifs.unshift({
    id: "N" + Date.now() + Math.random().toString(16).slice(2),
    message,
    issueId,
    read: false,
    createdAt: new Date().toISOString()
  });
  saveNotifications(notifs);
  renderNotifications();
  renderUnreadBadge();
}

function renderNotifications() {
  const notifs = loadNotifications();
  const list = document.getElementById("notifList");
  if (notifs.length === 0) {
    list.innerHTML = `<p class="subtle" style="padding:8px;">No notifications yet.</p>`;
    return;
  }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? "" : "unread"}">
      <div>${escapeHtml(n.message)}</div>
      <div class="notif-time">${new Date(n.createdAt).toLocaleString()}</div>
    </div>
  `).join("");
}

function renderUnreadBadge() {
  const notifs = loadNotifications();
  const unread = notifs.filter(n => !n.read).length;
  const badge = document.getElementById("unreadBadge");
  badge.textContent = unread;
  if (unread === 0) {
    badge.classList.add("hidden");
  } else {
    badge.classList.remove("hidden");
  }
}

function markAllNotificationsRead() {
  const notifs = loadNotifications();
  notifs.forEach(n => n.read = true);
  saveNotifications(notifs);
  renderNotifications();
  renderUnreadBadge();
}

function setupNotifPanel() {
  const bellBtn = document.getElementById("bellBtn");
  const panel = document.getElementById("notifPanel");
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== bellBtn) {
      panel.classList.add("hidden");
    }
  });
  document.getElementById("markAllReadBtn").addEventListener("click", markAllNotificationsRead);
}

/* ========== DASHBOARD ========== */
function renderDashboard() {
  const issues = loadIssues();
  document.getElementById("statTotal").textContent = issues.length;
  document.getElementById("statOpen").textContent = issues.filter(i => i.status === "Open").length;
  document.getElementById("statProgress").textContent = issues.filter(i => i.status === "In Progress").length;
  document.getElementById("statFixed").textContent = issues.filter(i => i.status === "Fixed").length;

  const recent = issues.slice(0, 6);
  const grid = document.getElementById("recentIssuesGrid");
  grid.innerHTML = recent.map(issueCardHTML).join("");
  grid.querySelectorAll(".issue-card").forEach(card => {
    card.addEventListener("click", () => {
      renderIssueDetails(card.dataset.id);
      showView("detailsView");
    });
  });
}

/* ========== UTIL ========== */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ========== CENTRAL REFRESH ========== */
function refreshAll() {
  renderDashboard();
  renderIssuesList();
  renderNotifications();
  renderUnreadBadge();
}

/* ========== INIT ========== */
document.addEventListener("DOMContentLoaded", () => {
  seedDemoData();
  setupNav();
  setupReportForm();
  setupIssuesToolbar();
  setupNotifPanel();
  document.getElementById("resetDemoBtn").addEventListener("click", resetDemoData);
  refreshAll();
});