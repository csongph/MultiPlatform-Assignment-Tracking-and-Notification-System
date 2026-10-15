/* =========================================================
   สร้าง Sidebar + Topbar ให้ทุกหน้า (ไม่ต้องเขียนซ้ำ)
   ใส่ <body data-page="dashboard|users"> เพื่อไฮไลต์เมนู
   ========================================================= */
const ICONS = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4.5"/><path d="M3.5 21c1.2-4 4.6-6 8.5-6s7.3 2 8.5 6"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="M14 12h7M18 8l4 4-4 4"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linejoin="round"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>`,
  sync: `<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.5-4.5M4 4v3h3"/><path d="M4 13a8 8 0 0 0 14.5 4.5M20 20v-3h-3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M9 6V4h6v2"/><rect x="6" y="6" width="12" height="15" rx="1.5"/></svg>`,
};

// TODO: ดึงจาก session ของผู้ล็อกอินจริง
const CURRENT_ADMIN = { name: "K.Saranyapat", role: "ผู้ดูแลระบบ" };


function renderLayout() {
  const page = document.body.dataset.page;
  const main = document.querySelector(".main");

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.innerHTML = `
    <div class="logo">
      <span class="logo-cap">🎓</span>
      <span class="logo-badge">LMS</span>
    </div>
    <nav class="nav">
      <a href="index.html" class="nav-item ${page === "dashboard" ? "active" : ""}">
        ${ICONS.grid}<span>ภาพรวมระบบ</span>
      </a>
      <a href="users.html" class="nav-item ${page === "users" ? "active" : ""}">
        ${ICONS.user}<span>จัดการผู้ใช้งาน</span>
      </a>
    </nav>`;
  main.before(sidebar);

  const topbar = document.createElement("header");
  topbar.className = "topbar";
  topbar.innerHTML = `
    <div class="profile">
      <div class="avatar">🧑‍💼</div>
      <div>
        <div class="profile-name">${escapeHTML(CURRENT_ADMIN.name)}</div>
        <div class="profile-role">${escapeHTML(CURRENT_ADMIN.role)}</div>
      </div>
    </div>
    <button class="logout-btn" id="logoutBtn" title="ออกจากระบบ">${ICONS.logout}</button>`;
  main.prepend(topbar);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
      // TODO: เรียก API logout แล้วไปหน้า login
      window.location.href = "login.html";
    }
  });
}

renderLayout();
