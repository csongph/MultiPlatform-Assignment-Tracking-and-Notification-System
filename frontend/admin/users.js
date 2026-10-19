/* =========================================================
   หน้าจัดการผู้ใช้งาน
   - แก้ไข  -> ไปหน้า edit-user.html?id=...
   - ซิงค์  -> เมนู "ซิงค์ข้อมูลใหม่ / ยกเลิก"
   - ลบ     -> ยืนยันแล้วลบ
   - ผู้ใช้ที่ Suspended แสดงเฉพาะปุ่มแก้ไข (ตามแบบ)
   ========================================================= */
let allUsers = [];

document.getElementById("searchBtn").innerHTML = ICONS.search;

async function loadUsers() {
  allUsers = await DataStore.getUsers();
  renderUsers(allUsers);
}

function renderUsers(list) {
  const body = document.getElementById("usersBody");
  if (!list.length) {
    const msg = allUsers.length ? "ไม่พบผู้ใช้ที่ค้นหา" : "ยังไม่มีผู้ใช้งานในระบบ (0 คน)";
    body.innerHTML = `<tr class="empty-row"><td colspan="7">${msg}</td></tr>`;
    return;
  }
  body.innerHTML = list.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${escapeHTML(u.firstName)}</td>
      <td>${escapeHTML(u.lastName)}</td>
      <td>${escapeHTML(u.email)}</td>
      <td>${TYPE_LABEL[u.type] || u.type}</td>
      <td>${statusBadge(u.status)}</td>
      <td>
        <div class="actions">
          <button class="icon-btn edit" data-action="edit" data-id="${u.id}" title="แก้ไข">${ICONS.edit}</button>
          ${u.status === "inactive" ? "" : `
          <button class="icon-btn sync" data-action="sync" data-id="${u.id}" title="ซิงค์ข้อมูล">${ICONS.sync}</button>
          <button class="icon-btn del" data-action="delete" data-id="${u.id}" title="ลบ">${ICONS.trash}</button>`}
        </div>
      </td>
    </tr>`).join("");
}

/* ---------- เมนูซิงค์ ---------- */
function closeSyncMenu() {
  document.querySelectorAll(".sync-menu").forEach(m => m.remove());
}

function openSyncMenu(btn, id) {
  closeSyncMenu();
  const menu = document.createElement("div");
  menu.className = "sync-menu";
  menu.innerHTML = `
    <button data-menu="sync">ซิงค์ข้อมูลใหม่</button>
    <button data-menu="cancel">ยกเลิก</button>`;
  btn.parentElement.appendChild(menu);

  menu.addEventListener("click", async e => {
    e.stopPropagation();
    const choice = e.target.dataset.menu;
    closeSyncMenu();
    if (choice === "sync") {
      try { const job = await DataStore.syncUser(id); showToast(`Queued sync: ${job.job_id}`); } catch (err) { showToast(err.message); }
    }
  });
}

/* ---------- ปุ่ม Actions ---------- */
document.getElementById("usersBody").addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  e.stopPropagation();
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "edit") {
    window.location.href = `edit-user.html?id=${encodeURIComponent(id)}`;
  } else if (action === "sync") {
    const isOpen = btn.parentElement.querySelector(".sync-menu");
    isOpen ? closeSyncMenu() : openSyncMenu(btn, id);
  } else if (action === "delete") {
    closeSyncMenu();
    const u = allUsers.find(x => x.id === id);
    if (confirm(`ต้องการลบผู้ใช้ ${u.firstName} ${u.lastName} ใช่หรือไม่?`)) {
      try { await DataStore.deleteUser(id); await loadUsers(); } catch (err) { showToast(err.message); }
    }
  }
});

document.addEventListener("click", closeSyncMenu);

/* ---------- ค้นหา ---------- */
function applySearch() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!q) return renderUsers(allUsers);
  renderUsers(allUsers.filter(u =>
    [u.id, u.firstName, u.lastName, u.email, TYPE_LABEL[u.type], u.status]
      .join(" ").toLowerCase().includes(q)
  ));
}
document.getElementById("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  applySearch();
});
document.getElementById("searchInput").addEventListener("input", applySearch);

loadUsers();
