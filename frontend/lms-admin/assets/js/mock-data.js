/* =========================================================
 * mock-data.js — ข้อมูลจำลอง (ใช้ระหว่างที่ยังไม่มี Backend)
 * เมื่อเชื่อม Backend แล้ว ไฟล์นี้ลบทิ้งได้ (api.js จะ fetch จริงแทน)
 * รูปแบบ object ในไฟล์นี้ = รูปแบบที่ Backend ควรส่งกลับมา
 * ========================================================= */

/* สร้างวันเวลาแบบ "ย้อนหลัง n วัน เวลา HH:MM" */
function ago(days, hhmm = "09:00") {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
const on = (ymd, hhmm = "09:00") => new Date(`${ymd}T${hhmm}:00`).toISOString();

const CURRENT_ADMIN = { name: "K.Saranyapat", role: "ผู้ดูแลระบบ", email: "saranyapat@kmaps.ac.th" };

/* ---------------------------------------------------------
 * ผู้ใช้
 * role: "student" | "admin"
 * status: "active" | "suspended" | "inactive"
 * accounts: [{ platform: "google" | "teams", email, lastSync }]
 * --------------------------------------------------------- */
const FIXED_USERS = [
  { firstName: "Somchai", lastName: "Jaidee", email: "67000111@gmail.com", studentId: null, role: "admin", status: "active",
    accounts: ["google", "teams"], lastLogin: ago(0, "02:31"), registeredAt: on("2026-05-10"), signupVia: "Google" },
  { firstName: "Anuwaw", lastName: "Deejing", email: "67000451@gmail.com", studentId: "67000451", role: "student", status: "active",
    accounts: ["google"], lastLogin: ago(0, "02:58"), registeredAt: on("2026-10-22", "10:15"), signupVia: "Google" },
  { firstName: "Chanittha", lastName: "Sombat", email: "67000611@gmail.com", studentId: "67000611", role: "student", status: "suspended",
    accounts: ["google"], lastLogin: on("2026-10-20", "08:12"), registeredAt: on("2026-06-14"), signupVia: "Google",
    suspendedAt: on("2026-10-20", "08:30"), suspendedBy: "K.Saranyapat", suspendReason: "เข้าสู่ระบบผิดเกิน 5 ครั้ง" },
  { firstName: "Deejai", lastName: "Meesuk", email: "67000114@gmail.com", studentId: "67000114", role: "student", status: "inactive",
    accounts: ["teams"], lastLogin: on("2026-10-14", "14:20"), registeredAt: on("2026-06-02"), signupVia: "Microsoft" },
  { firstName: "Jaihom", lastName: "Makmee", email: "67000146@gmail.com", studentId: "67000146", role: "student", status: "active",
    accounts: ["google", "teams"], lastLogin: ago(0, "01:12"), registeredAt: on("2026-07-03"), signupVia: "Google",
    tasksReceived: 12, tasksSubmitted: 9, activeDevices: 3 },
  { firstName: "Kanokwan", lastName: "Srisuk", email: "67000203@gmail.com", studentId: "67000203", role: "student", status: "active",
    accounts: ["google"], lastLogin: ago(1, "21:40"), registeredAt: on("2026-10-21", "16:40"), signupVia: "Google" },
  { firstName: "Pimchanok", lastName: "Srisuwan", email: "pimchanok.s@kmaps.ac.th", studentId: null, role: "admin", status: "active",
    accounts: ["google"], lastLogin: ago(0, "00:15"), registeredAt: on("2026-05-10"), signupVia: "Google" },
  { firstName: "Thanakrit", lastName: "Wongsawat", email: "67000377@gmail.com", studentId: "67000377", role: "student", status: "active",
    accounts: ["teams"], lastLogin: ago(1, "16:05"), registeredAt: on("2026-10-19", "13:05"), signupVia: "Microsoft" },
];

const FIRST_NAMES = ["Napat", "Thanawat", "Siriporn", "Kittipong", "Waranya", "Pattarapol", "Nattaya", "Teerapat", "Supansa",
  "Chayanin", "Apichat", "Ratchanee", "Wipada", "Phakin", "Sasithorn", "Krit", "Jirayu", "Kamonwan", "Nuttapong", "Pornthip",
  "Tanakorn", "Arisa", "Peerapat", "Benjamas", "Worawut", "Kanyarat", "Sorawit", "Ploypailin", "Chakrit", "Monthira"];
const LAST_NAMES = ["Thongdee", "Saetang", "Boonmee", "Chaiyaporn", "Rattanakul", "Kaewmanee", "Phromma", "Suksawat", "Inthara",
  "Charoenrat", "Sirikul", "Wattana", "Pongsri", "Kongkaew", "Yodsuwan", "Somboon", "Chantarat", "Nakprasert", "Sukjai", "Rakthai"];

function buildUsers() {
  const users = FIXED_USERS.map((u) => ({ ...u }));
  const SUSPENDED = [40, 120, 200];
  const ADMINS = [60, 150, 250];
  for (let i = 0; i < 284; i++) {
    const firstName = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11 + 3) % LAST_NAMES.length];
    const isAdmin = ADMINS.includes(i);
    const studentId = isAdmin ? null : String(67001000 + i);
    const status = SUSPENDED.includes(i) ? "suspended" : i % 20 === 15 && i < 270 ? "inactive" : "active";
    const accounts = i % 17 === 0 ? [] : [["google"], ["google"], ["teams"], ["google", "teams"], ["google"]][i % 5];
    const daysAgo = status === "active" ? (i * 3) % 7 : 14 + (i % 30);
    users.push({
      firstName, lastName, studentId, role: isAdmin ? "admin" : "student", status, accounts,
      email: isAdmin ? `${firstName.toLowerCase()}.${lastName[0].toLowerCase()}@kmaps.ac.th` : `${studentId}@gmail.com`,
      lastLogin: ago(daysAgo, `${String((i * 5) % 24).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`),
      registeredAt: on(`2026-${String(5 + (i % 5)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`),
      signupVia: accounts[0] === "teams" ? "Microsoft" : "Google",
      ...(status === "suspended" && { suspendedAt: ago(10, "09:00"), suspendedBy: "K.Saranyapat", suspendReason: "" }),
    });
  }

  return users.map((u, idx) => {
    const id = idx + 1;
    const received = u.tasksReceived ?? (u.role === "admin" ? 0 : 8 + (id % 9));
    return {
      id,
      ...u,
      accounts: u.accounts.map((p) => ({
        platform: p,
        email: p === "teams" ? `${u.studentId || u.email.split("@")[0]}@kmaps.onmicrosoft.com` : u.email,
        lastSync: ago(0, "03:00"),
      })),
      tasksReceived: received,
      tasksSubmitted: u.tasksSubmitted ?? Math.round(received * 0.7),
      activeDevices: u.activeDevices ?? 1 + (id % 3),
    };
  });
}

const MOCK_USERS = buildUsers();

/* กิจกรรมล่าสุดของผู้ใช้ (หน้า "รายละเอียดผู้ใช้") */
function mockUserActivities(user) {
  if (user.firstName === "Jaihom") {
    return [
      { time: ago(0, "01:12"), text: "เข้าสู่ระบบผ่าน Google" },
      { time: on("2026-10-21", "20:40"), text: "เปิดดูงาน “ใบงานที่ 2 โปรแกรมคำนวณค่าเฉลี่ย”" },
      { time: on("2026-10-20", "08:00"), text: "ได้รับแจ้งเตือนล่วงหน้า 3 วัน (ใบงานที่ 2)" },
    ];
  }
  return [
    { time: user.lastLogin, text: `เข้าสู่ระบบผ่าน ${user.signupVia}` },
    { time: ago(3, "19:30"), text: "เปิดดูงาน “แบบฝึกหัดบทที่ 4”" },
    { time: ago(5, "08:00"), text: "ได้รับแจ้งเตือนล่วงหน้า 1 วัน (แบบฝึกหัดบทที่ 4)" },
  ];
}

/* ประวัติการเข้าใช้งาน 30 วัน */
function mockLoginHistory(user) {
  const rows = [
    { time: user.lastLogin, via: "Google", device: "Chrome · Windows", ip: "58.8.x.x", ok: true },
    { time: on("2026-10-22", "20:40"), via: "Google", device: "Safari · iPhone", ip: "49.228.x.x", ok: true },
    { time: on("2026-10-22", "20:38"), via: "Google", device: "Safari · iPhone", ip: "49.228.x.x", ok: false },
    { time: on("2026-10-21", "08:02"), via: "Microsoft", device: "Edge · Windows", ip: "58.8.x.x", ok: true },
    { time: on("2026-10-19", "19:15"), via: "Google", device: "Chrome · Android", ip: "171.97.x.x", ok: true },
    { time: on("2026-10-18", "07:55"), via: "Microsoft", device: "Edge · Windows", ip: "58.8.x.x", ok: false },
  ];
  return { total: 42, failed: 2, devices: user.activeDevices, rows };
}

/* ---------------------------------------------------------
 * รายวิชาที่เชื่อมต่อ (หน้าภาพรวม)
 * --------------------------------------------------------- */
const MOCK_COURSES = {
  semester: "2/2569",
  breakdown: [
    { key: "google", label: "Google Classroom", legend: "Google Classroom อย่างเดียว", short: "Google Classroom", courses: 20, students: 245, tasks: 186, color: "#2EE59D" },
    { key: "teams",  label: "Microsoft Teams",  legend: "Microsoft Teams อย่างเดียว",  short: "Microsoft Teams",  courses: 16, students: 198, tasks: 141, color: "#8B6CCB" },
    { key: "both",   label: "ทั้ง 2 แพลตฟอร์ม",  legend: "เชื่อมต่อทั้ง 2 แพลตฟอร์ม",    short: "ทั้ง 2 แพลตฟอร์ม",  courses: 4,  students: 120, tasks: 32,  color: "#F06BF0" },
  ],
  totalStudents: 287,
  totalTasks: 359,
  googleTotal: 24,  // รวมรายวิชาที่เชื่อมทั้ง 2 แพลตฟอร์ม
  teamsTotal: 20,
};

const MOCK_OVERVIEW_EXTRA = {
  activeStudents7d: 241,
  activeGrowth: 12,
};

/* ---------------------------------------------------------
 * การเชื่อมต่อ LMS
 * status: "connected" | "expiring" | "error" | "disconnected"
 * --------------------------------------------------------- */
const MOCK_PLATFORMS = [
  {
    id: "google", name: "Google Classroom", edition: "Google Workspace for Education",
    status: "connected", account: "admin@kmaps.ac.th", courses: 20,
    lastSync: ago(0, "03:00"), lastSyncOk: true, tokenExpiry: on("2027-01-12"),
  },
  {
    id: "teams", name: "Microsoft Teams", edition: "Microsoft 365 Education",
    status: "expiring", account: "admin@kmaps.onmicrosoft.com", courses: 16,
    lastSync: ago(0, "03:00"), lastSyncOk: true, tokenExpiry: ago(-3, "23:59"),
  },
];

const MOCK_SYNC_SETTINGS = {
  enabled: true,
  intervalMinutes: 15,
  pull: { courses: true, tasks: true, submissions: true },
  retry: true,
  notifyAdmin: true,
};

const MOCK_SYNC_STATS = { coursesSynced: 40, tasksToday: 128, failed24h: 2 };

const MOCK_SYNC_HISTORY = [
  { id: 1, time: on("2026-10-23", "03:00"), platform: "google", summary: "20 วิชา · 3 งานใหม่", ok: true, note: "-" },
  { id: 2, time: on("2026-10-23", "03:00"), platform: "teams", summary: "16 วิชา · 1 งานใหม่", ok: true, note: "-" },
  { id: 3, time: on("2026-10-23", "02:45"), platform: "teams", summary: "0 รายการ", ok: false, note: "หมดเวลาเชื่อมต่อ — ลองใหม่อัตโนมัติสำเร็จเมื่อ 02:50" },
  { id: 4, time: on("2026-10-23", "02:45"), platform: "google", summary: "20 วิชา · 0 งานใหม่", ok: true, note: "-" },
  { id: 5, time: on("2026-10-23", "02:30"), platform: "google", summary: "20 วิชา · 2 งานใหม่", ok: true, note: "-" },
  { id: 6, time: on("2026-10-23", "02:30"), platform: "teams", summary: "16 วิชา · 0 งานใหม่", ok: true, note: "-" },
  { id: 7, time: on("2026-10-23", "02:15"), platform: "teams", summary: "0 รายการ", ok: false, note: "Microsoft Graph ตอบกลับ 429 (Too Many Requests)" },
  { id: 8, time: on("2026-10-23", "02:15"), platform: "google", summary: "20 วิชา · 1 งานใหม่", ok: true, note: "-" },
];

function mockSyncLog(entry) {
  const p = entry.platform === "google" ? "classroom.googleapis.com" : "graph.microsoft.com";
  const t = new Date(entry.time);
  const ts = (s) => new Date(t.getTime() + s * 1000).toLocaleTimeString("en-GB");
  return entry.ok
    ? [`[${ts(0)}] เริ่มซิงค์ (${p})`, `[${ts(1)}] ดึงรายวิชา: ${entry.summary.split(" · ")[0]}`,
       `[${ts(4)}] ดึงงานและวันครบกำหนด: ${entry.summary.split(" · ")[1] || "0 งานใหม่"}`,
       `[${ts(6)}] อัปเดตสถานะการส่งงานเรียบร้อย`, `[${ts(6)}] เสร็จสิ้น ✓`].join("\n")
    : [`[${ts(0)}] เริ่มซิงค์ (${p})`, `[${ts(30)}] ERROR: ${entry.note}`,
       `[${ts(30)}] กำหนดลองใหม่อัตโนมัติในอีก 5 นาที (ครั้งที่ 1/3)`].join("\n");
}
