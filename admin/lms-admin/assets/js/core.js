/* =========================================================
 * core.js — ตัวช่วยที่ทุกหน้าใช้ร่วมกัน
 * (จัดรูปแบบวันที่, ไอคอนแพลตฟอร์ม, toast, modal, เมนู, sidebar)
 * ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s = "") =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const refreshIcons = () => window.lucide && lucide.createIcons();
const fmtNumber = (n) => Number(n).toLocaleString("th-TH");
const icon = (name, cls = "w-4 h-4") => `<i data-lucide="${name}" class="${cls}"></i>`;

/* ---------- วันที่ (ปี พ.ศ.) ---------- */
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
const fmtDateShort = (iso) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const fmtDateNum = (iso) => new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
const daysUntil = (iso) => Math.max(0, Math.floor((new Date(iso) - new Date()) / 86400000));
const sameDay = (a, b) => a.toDateString() === b.toDateString();

/** "วันนี้ 02:31" / "เมื่อวาน 21:40" / "20 ต.ค. 2569" */
function fmtRelative(iso, { withTimeForOld = false } = {}) {
  if (!iso) return "—";
  const d = new Date(iso), now = new Date(), y = new Date();
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `วันนี้ ${fmtTime(iso)}`;
  if (sameDay(d, y)) return `เมื่อวาน ${fmtTime(iso)}`;
  return withTimeForOld ? `${fmtDateShort(iso)} ${fmtTime(iso)}` : fmtDate(iso);
}

/* ---------- แพลตฟอร์ม ---------- */
const PLATFORM = {
  google: { name: "Google Classroom", short: "Google" },
  teams: { name: "Microsoft Teams", short: "Teams" },
};
function platformIcon(p, size = 20) {
  if (p === "google") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-label="Google Classroom">
      <rect x="1" y="3" width="22" height="18" rx="2.5" fill="#F9BC15"/>
      <rect x="3" y="5" width="18" height="14" rx="1" fill="#21A464"/>
      <circle cx="12" cy="10" r="2" fill="#fff"/><path d="M8.5 15c.5-2 2-2.8 3.5-2.8s3 .8 3.5 2.8z" fill="#fff"/>
      <circle cx="7" cy="11" r="1.4" fill="#57BB8A"/><circle cx="17" cy="11" r="1.4" fill="#57BB8A"/>
      <rect x="13.5" y="16.3" width="5" height="1.2" rx=".6" fill="#fff"/></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-label="Microsoft Teams">
    <circle cx="18" cy="7" r="2.6" fill="#7B83EB"/><rect x="14" y="10.5" width="9" height="8" rx="3" fill="#7B83EB"/>
    <circle cx="11" cy="5.5" r="3" fill="#5059C9"/><rect x="6" y="9" width="11" height="11" rx="3" fill="#5059C9"/>
    <rect x="1" y="6.5" width="11" height="11" rx="1.8" fill="#4B53BC"/>
    <path d="M3.8 9.5h5.4v1.4H7.2v4.6H5.8v-4.6h-2z" fill="#fff"/></svg>`;
}
const platformBadge = (p) =>
  `<span class="inline-grid place-items-center w-6 h-6 rounded-md border ${p === "google" ? "border-[#e8d27a] bg-[#fffbea]" : "border-lavender bg-lavender-soft"}" data-tip="${PLATFORM[p].name}">${platformIcon(p, 15)}</span>`;

/** สรุปสถานะการเชื่อมต่อของแพลตฟอร์ม (ใช้หน้าภาพรวม) */
function platformHealth(p) {
  if (p.status === "disconnected") return { sub: "ยังไม่ได้เชื่อมต่อ", chip: "chip-gray", label: "ไม่ได้เชื่อม" };
  if (p.status === "error") return { sub: "ซิงค์ล้มเหลว", chip: "chip-red", label: "ผิดพลาด" };
  if (p.status === "expiring") return { sub: `Token หมดอายุใน ${daysUntil(p.tokenExpiry)} วัน`, chip: "chip-yellow", label: "ต้องตรวจสอบ" };
  return { sub: `ซิงค์ล่าสุด ${fmtTime(p.lastSync)} น.`, chip: "chip-green", label: "ปกติ" };
}

/* ---------- ผู้ใช้ ---------- */
const fullName = (u) => `${u.firstName} ${u.lastName}`;
const initials = (u) => `${u.firstName[0] || ""}${u.lastName[0] || ""}`.toUpperCase();
const AVATAR_COLORS = ["#E9E2F7", "#FFF2BF", "#FBDADA", "#E3E3E3", "#DDF5E3", "#DCE8F7", "#FDE7D3"];
const avatarColor = (u) => AVATAR_COLORS[(u.firstName.charCodeAt(0) + u.lastName.charCodeAt(0)) % AVATAR_COLORS.length];
const avatar = (u, size = 34, text = "text-xs") =>
  `<div class="avatar ${text}" style="width:${size}px;height:${size}px;background:${avatarColor(u)}">${esc(initials(u))}</div>`;

const STATUS = {
  active: { label: "Active", chip: "chip-green" },
  suspended: { label: "Suspended", chip: "chip-red" },
  inactive: { label: "Inactive", chip: "chip-gray" },
};
const statusChip = (s) => `<span class="chip ${STATUS[s].chip}">${STATUS[s].label}</span>`;
const roleText = (u) => (u.role === "admin" ? "ผู้ดูแลระบบ" : "นักเรียน");
const roleLabel = (u) =>
  u.role === "admin" ? `<span class="inline-flex items-center gap-1 text-plum font-medium">${icon("shield", "w-3.5 h-3.5")}ผู้ดูแลระบบ</span>` : "นักเรียน";

/* ---------- เติมข้อความลง HTML ----------
 * <span data-bind="name"></span>  → ใส่เป็นข้อความ (ปลอดภัย)
 * <ul data-html="bullets"></ul>   → ใส่เป็น HTML
 */
function bind(root, data = {}) {
  Object.entries(data).forEach(([k, v]) => {
    $$(`[data-bind="${k}"]`, root).forEach((el) => (el.textContent = v ?? "—"));
    $$(`[data-html="${k}"]`, root).forEach((el) => (el.innerHTML = v ?? ""));
  });
}

/* ---------- Toast ---------- */
function toast(message, type = "success") {
  const ic = { success: ["circle-check", "text-[#3DEB80]"], error: ["circle-x", "text-[#F25C5C]"], info: ["info", "text-lime"] }[type];
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `${icon(ic[0], `w-4 h-4 ${ic[1]}`)}<span>${esc(message)}</span>`;
  $("#toastContainer").appendChild(el);
  refreshIcons();
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; }, 2600);
  setTimeout(() => el.remove(), 2900);
}

/* ---------- Modal (markup อยู่ในไฟล์ HTML แต่ละหน้า) ---------- */
const Modal = {
  /** เปิด modal ตาม id และเติมข้อความ data-bind */
  open(id, data) {
    const m = document.getElementById(id);
    bind(m, data);
    m.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    refreshIcons();
    setTimeout(() => $("[autofocus]", m)?.focus(), 60);
    return m;
  },
  close(m) {
    (typeof m === "string" ? document.getElementById(m) : m).classList.add("hidden");
    if (!$(".modal:not(.hidden)")) document.body.style.overflow = "";
  },
};
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-close]");
  if (c) Modal.close(c.closest(".modal"));
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeMenu();
  $$(".modal:not(.hidden)").forEach((m) => Modal.close(m));
});

/**
 * ผูกปุ่มยืนยัน [data-confirm] ใน modal
 * handler() คืนค่า false = ไม่ต้องปิด modal
 */
function onConfirm(m, handler) {
  const btn = $("[data-confirm]", m);
  btn.onclick = async () => {
    setLoading(btn, true);
    try {
      const keep = await handler();
      setLoading(btn, false);
      if (keep !== false) Modal.close(m);
    } catch (err) {
      setLoading(btn, false);
      toast(err.message, "error");
    }
  };
  return btn;
}

function setLoading(btn, loading, text = "กำลังดำเนินการ...") {
  if (loading) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${icon("loader-circle", "w-4 h-4 spin")}${text}`;
  } else if (btn.dataset.html) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.html;
    delete btn.dataset.html;
  }
  refreshIcons();
}

/* ---------- Dropdown menu ---------- */
let openMenuEl = null;
function closeMenu() { openMenuEl?.remove(); openMenuEl = null; }
/** items: [{ icon, label, onClick }] */
function openMenu(anchor, { title, items }) {
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.innerHTML = `${title ? `<p class="menu-title">${title}</p>` : ""}${items
    .map((it, i) => `<button data-i="${i}">${icon(it.icon)}${it.label}</button>`).join("")}`;
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8));
  const below = r.bottom + 6 + menu.offsetHeight < window.innerHeight;
  menu.style.left = `${left + window.scrollX}px`;
  menu.style.top = `${(below ? r.bottom + 6 : r.top - menu.offsetHeight - 6) + window.scrollY}px`;
  menu.onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (b) { closeMenu(); items[b.dataset.i].onClick(); }
  };
  openMenuEl = menu;
  refreshIcons();
}
document.addEventListener("click", (e) => {
  if (openMenuEl && !openMenuEl.contains(e.target) && !e.target.closest("[data-menu-anchor]")) closeMenu();
});
window.addEventListener("resize", closeMenu);

/* ---------- อื่น ๆ ---------- */
function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })), // BOM ให้ Excel อ่านไทยได้
    download: filename,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const t = Object.assign(document.createElement("textarea"), { value: text });
    document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
  }
}

function showLoadError(container, message, retry) {
  container.innerHTML = `
    <div class="card p-10 text-center">
      ${icon("wifi-off", "w-10 h-10 mx-auto text-[#D92D20]")}
      <p class="mt-3 font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
      <p class="text-sm text-black/50">${esc(message)}</p>
      <button class="btn btn-lime mt-4" data-retry>${icon("refresh-cw")}ลองใหม่</button>
    </div>`;
  refreshIcons();
  $("[data-retry]", container).onclick = retry;
}

/* =========================================================
 * ส่วนกลางของทุกหน้า: sidebar มือถือ, ออกจากระบบ, รีเซ็ตข้อมูล
 * ========================================================= */
(function initLayout() {
  const sidebar = $("#sidebar"), backdrop = $("#sidebarBackdrop");
  const close = () => { sidebar.classList.add("-translate-x-full"); backdrop.classList.add("hidden"); };
  $("#btnMenu").onclick = () => { sidebar.classList.remove("-translate-x-full"); backdrop.classList.remove("hidden"); };
  backdrop.onclick = close;

  $("#btnLogout").onclick = () => {
    const m = Modal.open("m-logout");
    onConfirm(m, async () => {
      localStorage.removeItem("token");
      toast("ออกจากระบบแล้ว (ยังไม่มีหน้าเข้าสู่ระบบ)", "info");
      // location.href = "login.html";  ← เปิดใช้เมื่อมีหน้า login
    });
  };

  $("#btnResetMock").onclick = () => {
    const m = Modal.open("m-reset-mock");
    onConfirm(m, async () => {
      API.resetMock();
      toast("รีเซ็ตข้อมูลแล้ว");
      setTimeout(() => location.reload(), 600);
    });
  };

  // ไอคอนแพลตฟอร์มที่เขียนไว้ใน HTML: <span data-platform-icon="google" data-size="24">
  $$("[data-platform-icon]").forEach((el) => (el.innerHTML = platformIcon(el.dataset.platformIcon, Number(el.dataset.size) || 20)));
  refreshIcons();
})();
