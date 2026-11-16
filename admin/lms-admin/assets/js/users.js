/* =========================================================
 * users.js — หน้า "จัดการผู้ใช้งาน" (users.html)
 * ========================================================= */

const state = {
  list: [],
  search: "",
  role: "all",      // all | student | admin
  account: "all",   // all | google | teams | both | none
  status: "all",    // all | active | suspended | inactive
  page: 1,
  perPage: 8,
  selected: new Set(),
};

/* โหลดข้อมูลผู้ใช้จาก API แล้ววาดตารางใหม่ */
async function loadUsers() {
  try { state.list = await API.getUsers(); }
  catch (err) { return showLoadError($("#app"), err.message, () => location.reload()); }
  state.selected = new Set([...state.selected].filter((id) => state.list.some((u) => u.id === id)));
  renderTable();
}

/* ---------- ตัวกรอง ---------- */
function baseFiltered() {
  const q = state.search.trim().toLowerCase();
  return state.list.filter((u) => {
    const p = u.accounts.map((a) => a.platform);
    const accOk = {
      all: true, none: p.length === 0, both: p.length === 2,
      google: p.includes("google"), teams: p.includes("teams"),
    }[state.account];
    return (state.role === "all" || u.role === state.role) && accOk &&
      (!q || [fullName(u), u.email, u.studentId].some((v) => (v || "").toLowerCase().includes(q)));
  });
}
const filteredUsers = () => baseFiltered().filter((u) => state.status === "all" || u.status === state.status);
const userById = (id) => state.list.find((u) => u.id === Number(id));

/* ---------- วาดตาราง ---------- */
function renderTable() {
  const base = baseFiltered();
  const rows = filteredUsers();
  const pages = Math.max(1, Math.ceil(rows.length / state.perPage));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.perPage;
  const visible = rows.slice(start, start + state.perPage);
  const sel = state.selected;

  // แท็บสถานะ + จำนวน
  ["all", "active", "suspended", "inactive"].forEach((s) => {
    $(`#count-${s}`).textContent = fmtNumber(base.filter((u) => s === "all" || u.status === s).length);
    $(`[data-status="${s}"]`).classList.toggle("active", state.status === s);
  });

  // แถวผู้ใช้
  $("#userTbody").innerHTML = visible.length
    ? visible.map((u) => `
      <tr class="${sel.has(u.id) ? "selected" : ""}">
        <td><input type="checkbox" class="check" data-check="${u.id}" ${sel.has(u.id) ? "checked" : ""} aria-label="เลือก ${esc(fullName(u))}" /></td>
        <td>
          <a href="user-detail.html?id=${u.id}" class="flex items-center gap-2.5 group">
            ${avatar(u)}
            <span class="min-w-0">
              <span class="block font-semibold leading-tight group-hover:underline">${esc(fullName(u))}</span>
              <span class="block text-[11px] text-black/55">${esc(u.email)}</span>
            </span>
          </a>
        </td>
        <td>${u.studentId || "—"}</td>
        <td>${roleLabel(u)}</td>
        <td><div class="flex gap-1">${u.accounts.map((a) => platformBadge(a.platform)).join("") || `<span class="text-black/40">—</span>`}</div></td>
        <td>${statusChip(u.status)}</td>
        <td class="whitespace-nowrap">${fmtRelative(u.lastLogin)}</td>
        <td>
          <div class="flex gap-1.5">
            <a class="act act-view" href="user-detail.html?id=${u.id}" data-tip="ดูรายละเอียด">${icon("eye")}</a>
            ${u.status === "suspended"
              ? `<button class="act act-play" data-act="reactivate" data-id="${u.id}" data-tip="เปิดใช้งาน">${icon("play")}</button>`
              : `<button class="act act-pause" data-act="suspend" data-id="${u.id}" data-tip="ระงับบัญชี">${icon("pause")}</button>`}
            <button class="act act-del" data-act="delete" data-id="${u.id}" data-tip="ลบ">${icon("trash-2")}</button>
            <button class="act act-more" data-act="more" data-id="${u.id}" data-menu-anchor aria-label="อื่น ๆ">${icon("ellipsis")}</button>
          </div>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="8" class="py-14 text-center text-black/50">${icon("search-x", "w-9 h-9 mx-auto mb-2 text-black/30")}ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</td></tr>`;

  // checkbox หัวตาราง
  const onPage = visible.filter((u) => sel.has(u.id)).length;
  $("#checkAll").checked = visible.length > 0 && onPage === visible.length;
  $("#checkAll").indeterminate = onPage > 0 && onPage < visible.length;

  // แบ่งหน้า
  $("#pageInfo").textContent = `แสดง ${rows.length ? start + 1 : 0}–${start + visible.length} จาก ${fmtNumber(rows.length)} คน`;
  renderPagination(pages);
  renderBulkBar();
  refreshIcons();
}

function renderPagination(pages) {
  const p = state.page;
  const nums = new Set([1, pages, p - 1, p, p + 1]);
  if (p <= 2) [2, 3].forEach((n) => nums.add(n));
  if (p >= pages - 1) [pages - 2, pages - 1].forEach((n) => nums.add(n));
  const list = [...nums].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const btn = (n, label, extra = "", active = false) =>
    `<button data-page="${n}" class="min-w-[30px] h-[30px] px-2 rounded-md border border-black text-xs font-medium ${active ? "bg-lime" : "bg-white hover:bg-black/5"} disabled:opacity-30" ${extra}>${label}</button>`;

  let html = btn(p - 1, icon("chevron-left", "w-3.5 h-3.5"), p === 1 ? "disabled" : "");
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) html += `<span class="min-w-[30px] h-[30px] grid place-items-center rounded-md border border-black text-xs">…</span>`;
    html += btn(n, n, "", n === p);
  });
  html += btn(p + 1, icon("chevron-right", "w-3.5 h-3.5"), p === pages ? "disabled" : "");
  $("#pagination").innerHTML = html;
}

/* ---------- แถบเลือกหลายคน ---------- */
const chosenUsers = () => state.list.filter((u) => state.selected.has(u.id));
function renderBulkBar() {
  const chosen = chosenUsers();
  $("#bulkBar").classList.toggle("hidden", chosen.length === 0);
  $("#bulkCount").textContent = chosen.length;
  $("#bulkSuspend").disabled = !chosen.some((u) => u.status !== "suspended");
  $("#bulkActivate").disabled = !chosen.some((u) => u.status !== "active");
}

/* ---------- เมนู "อื่น ๆ" ---------- */
function openMoreMenu(anchor, user) {
  openMenu(anchor, {
    title: "การดำเนินการอื่น",
    items: [
      { icon: "key-round", label: "รีเซ็ตการเข้าสู่ระบบ", onClick: () => openResetLoginModal(user, loadUsers) },
      { icon: "unlink", label: "ยกเลิกการเชื่อมต่อบัญชี LMS", onClick: () => openUnlinkModal(user, loadUsers) },
      { icon: "file-text", label: "ดูประวัติการเข้าใช้งาน", onClick: () => openLoginHistoryModal(user) },
      { icon: "copy", label: "คัดลอกอีเมล", onClick: async () => { await copyText(user.email); toast(`คัดลอกอีเมล ${user.email} แล้ว`); } },
    ],
  });
}

function exportUsers() {
  const rows = filteredUsers();
  downloadCSV("users.csv", [
    ["ชื่อ", "นามสกุล", "อีเมล", "รหัสนักศึกษา", "บทบาท", "บัญชีที่เชื่อม", "สถานะ", "เข้าใช้ล่าสุด", "ลงทะเบียนเมื่อ"],
    ...rows.map((u) => [u.firstName, u.lastName, u.email, u.studentId || "", roleText(u),
      u.accounts.map((a) => PLATFORM[a.platform].short).join(", "), STATUS[u.status].label,
      u.lastLogin ? `${fmtDate(u.lastLogin)} ${fmtTime(u.lastLogin)}` : "", fmtDate(u.registeredAt)]),
  ]);
  toast(`ส่งออก ${fmtNumber(rows.length)} รายการแล้ว`);
}

/* =========================================================
 * ผูก event กับ HTML
 * ========================================================= */
const resetPage = () => { state.page = 1; renderTable(); };
$("#userSearch").addEventListener("input", (e) => { state.search = e.target.value; resetPage(); });
$("#filterRole").onchange = (e) => { state.role = e.target.value; resetPage(); };
$("#filterAccount").onchange = (e) => { state.account = e.target.value; resetPage(); };
$("#perPage").onchange = (e) => { state.perPage = Number(e.target.value); resetPage(); };
$("#btnExport").onclick = exportUsers;
$("#btnAddAdmin").onclick = () => openAddAdminModal(state.list, loadUsers);

$("#statusTabs").onclick = (e) => {
  const b = e.target.closest("[data-status]");
  if (b) { state.status = b.dataset.status; resetPage(); }
};
$("#pagination").onclick = (e) => {
  const b = e.target.closest("[data-page]");
  if (b && !b.disabled) { state.page = Number(b.dataset.page); renderTable(); }
};

// เลือก / ยกเลิกเลือก
$("#checkAll").onchange = (e) => {
  const start = (state.page - 1) * state.perPage;
  filteredUsers().slice(start, start + state.perPage)
    .forEach((u) => (e.target.checked ? state.selected.add(u.id) : state.selected.delete(u.id)));
  renderTable();
};
$("#userTbody").addEventListener("change", (e) => {
  if (!e.target.matches("[data-check]")) return;
  const id = Number(e.target.dataset.check);
  e.target.checked ? state.selected.add(id) : state.selected.delete(id);
  renderTable();
});

// ปุ่มจัดการในแต่ละแถว
$("#userTbody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const user = userById(btn.dataset.id);
  if (btn.dataset.act === "suspend") openSuspendModal([user], loadUsers);
  if (btn.dataset.act === "reactivate") openReactivateModal([user], loadUsers);
  if (btn.dataset.act === "delete") openDeleteModal([user], loadUsers);
  if (btn.dataset.act === "more") openMoreMenu(btn, user);
});

// แถบเลือกหลายคน
const afterBulk = () => { state.selected.clear(); loadUsers(); };
$("#bulkSuspend").onclick = () => openSuspendModal(chosenUsers().filter((u) => u.status !== "suspended"), afterBulk);
$("#bulkActivate").onclick = () => openReactivateModal(chosenUsers().filter((u) => u.status !== "active"), afterBulk);
$("#bulkDelete").onclick = () => openDeleteModal(chosenUsers(), afterBulk);
$("#bulkClear").onclick = () => { state.selected.clear(); renderTable(); };

loadUsers();
