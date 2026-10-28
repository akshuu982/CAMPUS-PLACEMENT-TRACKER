const API = "/api";
const state = { token: null, user: null, jobs: [], applications: [], allApplications: [] };
const $ = (selector) => document.querySelector(selector);

function setNotice(element, message, type = "") {
  element.textContent = message;
  element.className = `notice ${type}`.trim();
  element.classList.remove("hidden");
}
function hideNotice(element) { element.classList.add("hidden"); }
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function money(value) { return value === null || value === undefined || value === "" ? "Package not listed" : `${Number(value).toFixed(1)} LPA`; }
function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function statusClass(status) { return `status status-${String(status || "Applied").toLowerCase()}`; }
function notify(message) {
  const box = $("#global-message");
  box.textContent = message; box.classList.remove("hidden");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => box.classList.add("hidden"), 3200);
}
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong. Please try again.");
  return payload;
}
function showAuth(tab = "login") {
  $("#auth-view").classList.remove("hidden"); $("#app-view").classList.add("hidden");
  $("#logout-btn").classList.add("hidden"); $("#user-label").textContent = "";
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $("#login-form").classList.toggle("hidden", tab !== "login");
  $("#register-form").classList.toggle("hidden", tab !== "register");
}
function showApp() {
  $("#auth-view").classList.add("hidden"); $("#app-view").classList.remove("hidden");
  $("#logout-btn").classList.remove("hidden");
  $("#user-label").textContent = `${state.user.name} · ${state.user.role}`;
  $("#welcome-title").textContent = `Hello, ${state.user.name.split(" ")[0]}`;
  $("#welcome-subtitle").textContent = state.user.role === "admin" ? "Manage opportunities and track student progress." : "Your placement journey, all in one place.";
  const admin = state.user.role === "admin";
  $("#admin-panel").classList.toggle("hidden", !admin);
  $("#admin-applications-panel").classList.toggle("hidden", !admin);
  $("#applications-heading").textContent = admin ? "Recent applications" : "My applications";
}
async function loadDashboard() {
  const data = await request("/dashboard");
  state.jobs = data.jobs; state.applications = data.applications;
  state.allApplications = data.allApplications || [];
  $("#stat-total").textContent = data.stats.totalApplications;
  $("#stat-progress").textContent = data.stats.inProgress;
  $("#stat-offers").textContent = data.stats.offers;
  $("#stat-open").textContent = data.stats.openJobs;
  renderJobs(); renderApplications();
  if (state.user.role === "admin") renderAllApplications();
}
function renderJobs() {
  const search = $("#job-search").value.trim().toLowerCase();
  const branch = $("#branch-filter").value;
  const filtered = state.jobs.filter((job) => {
    const matchesText = `${job.company_name} ${job.role} ${job.description || ""}`.toLowerCase().includes(search);
    const branches = (job.eligible_branches || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const matchesBranch = !branch || !branches.length || branches.includes(branch.toLowerCase()) || branches.includes("all");
    return matchesText && matchesBranch;
  });
  $("#jobs-count").textContent = `${filtered.length} role${filtered.length === 1 ? "" : "s"}`;
  if (!filtered.length) {
    $("#jobs-list").innerHTML = `<div class="empty-state"><div class="empty-icon">⌕</div><b>No opportunities found</b><br>Try changing your search or filters.</div>`; return;
  }
  $("#jobs-list").innerHTML = filtered.map((job) => {
    const application = state.applications.find((item) => item.job_id === job.id);
    const canApply = state.user.role === "student" && !application && job.is_open;
    const branchTags = (job.eligible_branches || "All branches").split(",").map((b) => `<span class="tag">${escapeHtml(b.trim())}</span>`).join("");
    return `<article class="job-card">
      <div class="job-top"><div class="job-company"><div class="company-mark">${escapeHtml(job.company_name.slice(0,2).toUpperCase())}</div><div><h3>${escapeHtml(job.company_name)}</h3><p>${escapeHtml(job.role)}</p></div></div><span class="salary">${escapeHtml(money(job.package_lpa))}</span></div>
      ${job.description ? `<p class="job-description">${escapeHtml(job.description)}</p>` : ""}
      <div class="tag-row">${branchTags}${job.min_cgpa !== null && job.min_cgpa !== undefined ? `<span class="tag">Min CGPA ${escapeHtml(job.min_cgpa)}</span>` : ""}</div>
      <div class="job-bottom"><span class="deadline">Deadline: ${escapeHtml(formatDate(job.deadline))}</span>
      ${canApply ? `<button class="btn btn-primary apply-btn" data-job="${escapeHtml(job.id)}">Apply now →</button>` : application ? `<span class="${statusClass(application.status)}">${escapeHtml(application.status)}</span>` : `<span class="tag">${job.is_open ? "Admin listing" : "Closed"}</span>`}</div>
    </article>`;
  }).join("");
  document.querySelectorAll(".apply-btn").forEach((button) => button.addEventListener("click", () => applyToJob(button.dataset.job, button)));
}
function renderApplications() {
  const status = $("#status-filter").value;
  const applications = state.applications.filter((app) => !status || app.status === status);
  if (!applications.length) {
    $("#applications-list").innerHTML = `<div class="empty-state"><div class="empty-icon">▤</div><b>No applications yet</b><br>When you apply to a role, its progress will appear here.</div>`; return;
  }
  $("#applications-list").innerHTML = applications.map((app) => `<article class="application-card">
    <div class="application-title"><div><h3>${escapeHtml(app.company_name)}</h3><p>${escapeHtml(app.role)}</p></div><span class="${statusClass(app.status)}">${escapeHtml(app.status)}</span></div>
    <div class="application-meta">Applied ${escapeHtml(formatDate(app.applied_at))}${app.student_name ? ` · ${escapeHtml(app.student_name)}` : ""}</div>
  </article>`).join("");
}
function renderAllApplications() {
  const body = $("#all-applications-body");
  if (!state.allApplications.length) { body.innerHTML = `<tr><td colspan="5" class="empty-state">No student applications yet.</td></tr>`; return; }
  body.innerHTML = state.allApplications.map((app) => `<tr>
    <td><b>${escapeHtml(app.student_name)}</b><br><span class="application-meta">${escapeHtml(app.roll_number)}</span></td>
    <td>${escapeHtml(app.company_name)}<br><span class="application-meta">${escapeHtml(app.role)}</span></td>
    <td>${escapeHtml(formatDate(app.applied_at))}</td>
    <td><span class="${statusClass(app.status)}">${escapeHtml(app.status)}</span></td>
    <td><div style="display:flex;gap:6px;align-items:center"><select aria-label="New status for ${escapeHtml(app.student_name)}" data-status-select="${escapeHtml(app.id)}">${["Applied","Shortlisted","Interview","Selected","Rejected","Withdrawn"].map((s) => `<option ${s === app.status ? "selected" : ""}>${s}</option>`).join("")}</select><button class="btn btn-outline save-status" data-app="${escapeHtml(app.id)}">Save</button></div></td>
  </tr>`).join("");
  document.querySelectorAll(".save-status").forEach((button) => button.addEventListener("click", async () => {
    const select = document.querySelector(`[data-status-select="${CSS.escape(button.dataset.app)}"]`);
    try { button.disabled = true; await request(`/applications/${encodeURIComponent(button.dataset.app)}/status`, { method: "PATCH", body: JSON.stringify({ status: select.value }) }); await loadDashboard(); notify("Application status updated."); }
    catch (error) { notify(error.message); } finally { button.disabled = false; }
  }));
}
async function applyToJob(jobId, button) {
  try {
    button.disabled = true; button.textContent = "Applying…";
    await request("/applications", { method: "POST", body: JSON.stringify({ job_id: jobId }) });
    await loadDashboard(); notify("Application submitted successfully.");
  } catch (error) { notify(error.message); button.disabled = false; button.textContent = "Apply now →"; }
}
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  hideNotice($("#auth-message"));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  const register = button.dataset.tab === "register";
  $("#login-form").classList.toggle("hidden", register); $("#register-form").classList.toggle("hidden", !register);
}));
$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try { button.disabled = true; const result = await request("/auth/login", { method: "POST", body: JSON.stringify(data) }); state.token = result.token; state.user = result.user; showApp(); await loadDashboard(); }
  catch (error) { setNotice($("#auth-message"), error.message, "error"); } finally { button.disabled = false; }
});
$("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(event.currentTarget)); data.graduation_year = Number(data.graduation_year);
  try { button.disabled = true; const result = await request("/auth/register", { method: "POST", body: JSON.stringify(data) }); state.token = result.token; state.user = result.user; showApp(); await loadDashboard(); }
  catch (error) { setNotice($("#auth-message"), error.message, "error"); } finally { button.disabled = false; }
});
$("#logout-btn").addEventListener("click", () => { state.token = null; state.user = null; state.jobs = []; state.applications = []; showAuth(); });
$("#refresh-btn").addEventListener("click", async () => { try { await loadDashboard(); notify("Dashboard refreshed."); } catch (error) { notify(error.message); } });
$("#job-search").addEventListener("input", renderJobs);
$("#branch-filter").addEventListener("change", renderJobs);
$("#status-filter").addEventListener("change", renderApplications);
$("#job-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(event.currentTarget));
  data.package_lpa = data.package_lpa === "" ? null : Number(data.package_lpa);
  data.min_cgpa = data.min_cgpa === "" ? null : Number(data.min_cgpa);
  data.deadline = data.deadline || null;
  try { button.disabled = true; await request("/jobs", { method: "POST", body: JSON.stringify(data) }); event.currentTarget.reset(); setNotice($("#admin-message"), "Opportunity added successfully.", "success"); await loadDashboard(); }
  catch (error) { setNotice($("#admin-message"), error.message, "error"); } finally { button.disabled = false; }
});
async function init() {
  try {
    const health = await fetch(`${API}/health`);
    if (!health.ok) throw new Error();
  } catch (_) { setNotice($("#auth-message"), "Cannot reach the server. Start the backend with npm start, then refresh this page.", "error"); }
  showAuth();
}
init();
