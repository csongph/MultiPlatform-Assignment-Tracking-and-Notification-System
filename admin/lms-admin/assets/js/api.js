/* =========================================================
 * api.js — ชั้นบริการข้อมูล (Service Layer)
 *
 * ตอนนี้ USE_MOCK = true → ใช้ข้อมูลจาก mock-data.js และเก็บการแก้ไขไว้ใน localStorage
 * เมื่อ Backend พร้อม: ตั้ง USE_MOCK = false และแก้ API_BASE_URL
 * หน้า UI เรียกข้อมูลผ่าน API.xxx() เท่านั้น จึงไม่ต้องแก้ไฟล์หน้าอื่นเลย
 * ========================================================= */

const USE_MOCK = true;
const API_BASE_URL = "http://localhost:3000/api"; // ← เปลี่ยนเป็น URL ของ Backend

/* ---------- เรียก Backend จริง ---------- */
async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `เกิดข้อผิดพลาด (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- ตัวช่วยสำหรับ Mock ---------- */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));
const DB_VERSION = "v2";
const db = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`kmaps_${DB_VERSION}_${key}`);
      return v ? JSON.parse(v) : clone(fallback);
    } catch { return clone(fallback); }
  },
  set(key, value) {
    try { localStorage.setItem(`kmaps_${DB_VERSION}_${key}`, JSON.stringify(value)); } catch {}
  },
  reset() {
    Object.keys(localStorage).filter((k) => k.startsWith(`kmaps_${DB_VERSION}_`)).forEach((k) => localStorage.removeItem(k));
  },
};
const users = () => db.get("users", MOCK_USERS);
const saveUsers = (list) => db.set("users", list);
const findUser = (list, id) => {
  const u = list.find((x) => x.id === Number(id));
  if (!u) throw new Error("ไม่พบผู้ใช้");
  return u;
};

/* =========================================================
 * API ที่หน้า UI เรียกใช้
 * ========================================================= */
const API = {
  /* ---------------- ภาพรวมระบบ ---------------- */
  async getOverview() {
    if (!USE_MOCK) return http("/admin/overview");
    await delay();
    const list = users();
    return {
      users: {
        total: list.length,
        students: list.filter((u) => u.role === "student").length,
        admins: list.filter((u) => u.role === "admin").length,
      },
      activeStudents7d: MOCK_OVERVIEW_EXTRA.activeStudents7d,
      activeGrowth: MOCK_OVERVIEW_EXTRA.activeGrowth,
      courses: MOCK_COURSES,
      platforms: db.get("platforms", MOCK_PLATFORMS),
      recentUsers: [...list].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 3),
    };
  },

  /* ---------------- ผู้ใช้งาน ---------------- */
  async getUsers() {
    if (!USE_MOCK) return http("/admin/users");
    await delay();
    return users();
  },

  async getUser(id) {
    if (!USE_MOCK) return http(`/admin/users/${id}`);
    await delay();
    const u = findUser(users(), id);
    return { ...u, activities: mockUserActivities(u) };
  },

  /** เพิ่มแอดมินด้วยการเชิญทางอีเมล */
  async inviteAdmin({ firstName, lastName, email, sendInvite }) {
    if (!USE_MOCK) return http("/admin/admins/invite", { method: "POST", body: { firstName, lastName, email, sendInvite } });
    await delay(600);
    const list = users();
    if (list.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error("อีเมลนี้มีอยู่ในระบบแล้ว");
    const user = {
      id: Math.max(...list.map((u) => u.id)) + 1, firstName, lastName, email, studentId: null,
      role: "admin", status: "inactive", accounts: [], lastLogin: null,
      registeredAt: new Date().toISOString(), signupVia: "คำเชิญ", tasksReceived: 0, tasksSubmitted: 0, activeDevices: 0,
    };
    list.unshift(user);
    saveUsers(list);
    return user;
  },

  /** เลื่อนผู้ใช้ที่มีอยู่ให้เป็นแอดมิน */
  async promoteToAdmin(id) {
    if (!USE_MOCK) return http(`/admin/users/${id}/promote`, { method: "POST" });
    await delay(500);
    const list = users();
    const u = findUser(list, id);
    u.role = "admin";
    saveUsers(list);
    return u;
  },

  /** ระงับ / เปิดใช้งาน (หลายคนพร้อมกันได้) status: "suspended" | "active" */
  async setUsersStatus(ids, status, reason = "") {
    if (!USE_MOCK) return http("/admin/users/status", { method: "PATCH", body: { ids, status, reason } });
    await delay(500);
    const list = users();
    ids.forEach((id) => {
      const u = findUser(list, id);
      u.status = status;
      if (status === "suspended") Object.assign(u, { suspendedAt: new Date().toISOString(), suspendedBy: CURRENT_ADMIN.name, suspendReason: reason });
    });
    saveUsers(list);
    return list.filter((u) => ids.includes(u.id));
  },

  async deleteUsers(ids) {
    if (!USE_MOCK) return http("/admin/users", { method: "DELETE", body: { ids } });
    await delay(500);
    saveUsers(users().filter((u) => !ids.includes(u.id)));
    return null;
  },

  async resetLogin(id) {
    if (!USE_MOCK) return http(`/admin/users/${id}/reset-login`, { method: "POST" });
    await delay(500);
    const list = users();
    findUser(list, id).activeDevices = 0;
    saveUsers(list);
    return { ok: true };
  },

  /** ยกเลิกการเชื่อมบัญชี LMS ของผู้ใช้ platforms: ["google","teams"] */
  async unlinkAccounts(id, platforms) {
    if (!USE_MOCK) return http(`/admin/users/${id}/accounts`, { method: "DELETE", body: { platforms } });
    await delay(500);
    const list = users();
    const u = findUser(list, id);
    u.accounts = u.accounts.filter((a) => !platforms.includes(a.platform));
    saveUsers(list);
    return u;
  },

  async getLoginHistory(id) {
    if (!USE_MOCK) return http(`/admin/users/${id}/login-history?days=30`);
    await delay();
    return mockLoginHistory(findUser(users(), id));
  },

  /* ---------------- การเชื่อมต่อ LMS ---------------- */
  async getConnections() {
    if (!USE_MOCK) return http("/admin/lms");
    await delay();
    return {
      platforms: db.get("platforms", MOCK_PLATFORMS),
      settings: db.get("syncSettings", MOCK_SYNC_SETTINGS),
      stats: MOCK_SYNC_STATS,
      history: MOCK_SYNC_HISTORY,
    };
  },

  async disconnectPlatform(id) {
    if (!USE_MOCK) return http(`/admin/lms/${id}`, { method: "DELETE" });
    await delay(600);
    const list = db.get("platforms", MOCK_PLATFORMS);
    Object.assign(list.find((p) => p.id === id), { status: "disconnected", account: null, courses: 0, tokenExpiry: null });
    db.set("platforms", list);
    return list;
  },

  /** เชื่อมต่อใหม่ — ของจริงควร redirect ไปหน้า OAuth ของ Google / Microsoft */
  async reconnectPlatform(id) {
    if (!USE_MOCK) return http(`/admin/lms/${id}/connect`, { method: "POST" }); // → { redirectUrl }
    await delay(1200);
    const list = db.get("platforms", MOCK_PLATFORMS);
    const p = list.find((x) => x.id === id);
    const expiry = new Date(); expiry.setDate(expiry.getDate() + 90);
    Object.assign(p, {
      status: "connected",
      account: p.account || (id === "google" ? "admin@kmaps.ac.th" : "admin@kmaps.onmicrosoft.com"),
      courses: p.courses || (id === "google" ? 20 : 16),
      tokenExpiry: expiry.toISOString(), lastSync: new Date().toISOString(), lastSyncOk: true,
    });
    db.set("platforms", list);
    return list;
  },

  async updateSyncSettings(settings) {
    if (!USE_MOCK) return http("/admin/lms/settings", { method: "PUT", body: settings });
    await delay(250);
    db.set("syncSettings", settings);
    return settings;
  },

  async getSyncLog(entryId) {
    if (!USE_MOCK) return http(`/admin/lms/history/${entryId}/log`);
    await delay();
    const e = MOCK_SYNC_HISTORY.find((x) => x.id === entryId);
    return { ...e, log: mockSyncLog(e) };
  },

  /* ใช้ตอนทดสอบ: ล้างข้อมูลจำลองกลับเป็นค่าเริ่มต้น */
  resetMock: () => db.reset(),
};
