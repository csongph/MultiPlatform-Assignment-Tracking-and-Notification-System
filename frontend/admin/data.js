/* =========================================================
   Data layer – ทุกหน้าดึงข้อมูลผ่านไฟล์นี้ที่เดียว
   ตอนนี้ยังไม่ได้เชื่อม Backend / Google Classroom / Teams
   -> ค่าเริ่มต้นจึงเป็นข้อมูลว่าง (แดชบอร์ดแสดง 0)

   วิธีเชื่อม API ภายหลัง: แก้เฉพาะฟังก์ชันใน DataStore
   ให้เรียก fetch() ไปที่ Backend แทน localStorage
   ========================================================= */

const TYPE_LABEL = { admin: "ผู้ดูแลระบบ", student: "นักเรียน" };
const STATUS_LABEL = { active: "Active", pending: "Pending", suspended: "Suspended", inactive: "Inactive" };
const API_BASE = (window.KMAPS_API_BASE || "http://localhost:8000/api/v1").replace(/\/$/, "");
let refreshRequest = null;

async function refreshAccessToken() {
  const storage = localStorage.getItem("kmaps_refresh_token") ? localStorage : sessionStorage;
  const refresh_token = storage.getItem("kmaps_refresh_token");
  if (!refresh_token) return false;
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    }).then(async (response) => {
      if (!response.ok) return false;
      const tokens = await response.json();
      storage.setItem("kmaps_access_token", tokens.access_token);
      storage.setItem("kmaps_refresh_token", tokens.refresh_token);
      storage.setItem("kmaps_token_expires_at", String(Date.now() + tokens.expires_in * 1000));
      return true;
    }).catch(() => false).finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

async function adminRequest(path, options = {}) {
  const token = localStorage.getItem("kmaps_access_token") || sessionStorage.getItem("kmaps_access_token");
  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 401 && await refreshAccessToken()) {
    const freshToken = localStorage.getItem("kmaps_access_token") || sessionStorage.getItem("kmaps_access_token");
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}), ...options.headers },
    });
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || `Admin API returned HTTP ${response.status}`);
  return data;
}

function mapUser(user) {
  const parts = String(user.full_name || "").trim().split(/\s+/);
  return { ...user, firstName: parts.shift() || "", lastName: parts.join(" "), type: user.role, status: user.is_active ? "active" : "inactive" };
}

const DataStore = {
  async getUsers() {
    const users = [];
    for (let page = 1; ; page += 1) {
      const result = await adminRequest(`/admin/users?page=${page}`);
      users.push(...(result.users || []));
      if (users.length >= (result.total || 0) || !(result.users || []).length) break;
    }
    return users.map(mapUser);
  },
  async getUser(id) { return mapUser(await adminRequest(`/admin/users/${encodeURIComponent(id)}`)); },
  async updateUser(id, patch) {
    if (patch.type) return mapUser(await adminRequest(`/admin/users/${encodeURIComponent(id)}/role`, { method: "PUT", body: JSON.stringify({ role: patch.type }) }));
    if (patch.status) return mapUser(await adminRequest(`/admin/users/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ is_active: patch.status === "active" }) }));
    const full_name = patch.full_name ?? [patch.firstName, patch.lastName].filter(Boolean).join(" ");
    return mapUser(await adminRequest(`/admin/users/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ full_name, email: patch.email }) }));
  },
  async deleteUser(id) { return adminRequest(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async syncUser(id) {
    const result = await adminRequest(`/admin/connections?status=connected`);
    const connection = (result.connections || []).find((item) => item.user_id === id);
    if (!connection) throw new Error("User has no connected learning platform.");
    return adminRequest("/sync", { method: "POST", body: JSON.stringify({ user_id: id, platform: connection.platform === "google" ? "google_classroom" : "microsoft_teams" }) });
  },
  async getUserGrowth(users) {
    const now = new Date();
    const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevious = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const counts = { student: [0, 0], admin: [0, 0] };
    users.forEach((user) => {
      const created = new Date(user.created_at);
      if (created >= startCurrent) counts[user.role === "admin" ? "admin" : "student"][0] += 1;
      else if (created >= startPrevious) counts[user.role === "admin" ? "admin" : "student"][1] += 1;
    });
    return Object.fromEntries(Object.entries(counts).map(([role, [current, previous]]) => [
      role, previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100,
    ]));
  },
  async getCourseStats() {
    const connections = await adminRequest("/admin/connections?status=connected");
    const users = new Map();
    for (const item of connections.connections || []) {
      if (!users.has(item.user_id)) users.set(item.user_id, new Set());
      users.get(item.user_id).add(item.platform);
    }
    return { classroom: [...users.values()].filter((items) => items.has("google")).length, teams: [...users.values()].filter((items) => items.has("microsoft")).length, both: [...users.values()].filter((items) => items.has("google") && items.has("microsoft")).length };
  },
};
/* ---------- helpers ใช้ร่วมกันทุกหน้า ---------- */
function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function statusBadge(status) {
  return `<span class="badge ${status}">${STATUS_LABEL[status] || status}</span>`;
}

function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}
