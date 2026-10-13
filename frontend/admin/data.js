/* =========================================================
   Data layer – ทุกหน้าดึงข้อมูลผ่านไฟล์นี้ที่เดียว
   ตอนนี้ยังไม่ได้เชื่อม Backend / Google Classroom / Teams
   -> ค่าเริ่มต้นจึงเป็นข้อมูลว่าง (แดชบอร์ดแสดง 0)

   วิธีเชื่อม API ภายหลัง: แก้เฉพาะฟังก์ชันใน DataStore
   ให้เรียก fetch() ไปที่ Backend แทน localStorage
   ========================================================= */

// เปลี่ยนเป็น true ถ้าอยากเห็นข้อมูลตัวอย่างตามแบบ Figma
const USE_MOCK = false;

const STORAGE_KEY = "lms_admin_users";

const TYPE_LABEL = { admin: "ผู้ดูแลระบบ", student: "นักเรียน" };
const STATUS_LABEL = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
  inactive: "Inactive",
};

const MOCK_USERS = [
  { id: 1, firstName: "Somchai",   lastName: "Jaidee",  email: "67000111@gmail.com", type: "admin",   status: "active" },
  { id: 2, firstName: "Anuwaw",    lastName: "Deejing", email: "67000451@gmail.com", type: "student", status: "pending" },
  { id: 3, firstName: "Chanittha", lastName: "Sombat",  email: "67000611@gmail.com", type: "student", status: "suspended" },
  { id: 4, firstName: "Deejai",    lastName: "Meesuk",  email: "67000114@gmail.com", type: "student", status: "inactive" },
  { id: 5, firstName: "Jaihom",    lastName: "Makmee",  email: "67000146@gmail.com", type: "student", status: "active" },
];

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage ใช้ไม่ได้ -> ใช้ค่าเริ่มต้น */ }
  return USE_MOCK ? JSON.parse(JSON.stringify(MOCK_USERS)) : [];
}

function writeStore(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
}

const DataStore = {
  /** GET /api/users */
  async getUsers() {
    return readStore();
  },

  /** GET /api/users/:id */
  async getUser(id) {
    return readStore().find(u => u.id === Number(id)) || null;
  },

  /** PUT /api/users/:id */
  async updateUser(id, patch) {
    const list = readStore();
    const i = list.findIndex(u => u.id === Number(id));
    if (i === -1) throw new Error("ไม่พบผู้ใช้");
    list[i] = { ...list[i], ...patch };
    writeStore(list);
    return list[i];
  },

  /** DELETE /api/users/:id */
  async deleteUser(id) {
    writeStore(readStore().filter(u => u.id !== Number(id)));
  },

  /** POST /api/users/:id/sync – ดึงข้อมูลใหม่จาก Google Classroom / Teams */
  async syncUser(id) {
    // TODO: เรียก API ซิงค์จริง
    await new Promise(r => setTimeout(r, 600));
    return { ok: true };
  },

  /** GET /api/stats/users – % การเติบโตเทียบเดือนที่แล้ว */
  async getUserGrowth() {
    // TODO: ดึงจาก Backend
    return { student: 0, admin: 0 };
  },

  /** GET /api/stats/courses – จำนวนรายวิชาที่เชื่อมต่อแต่ละแพลตฟอร์ม */
  async getCourseStats() {
    // TODO: ดึงจาก Google Classroom API + Microsoft Graph API
    return { classroom: 0, teams: 0, both: 0 };
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
