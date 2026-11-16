/* =========================================================
 * connections.js — หน้า "การเชื่อมต่อ LMS" (connections.html)
 * ========================================================= */

let conn = null;           // { platforms, settings, stats, history }
let showAllHistory = false;

async function loadConnections() {
  try { conn = await API.getConnections(); }
  catch (err) { return showLoadError($("#app"), err.message, () => location.reload()); }
  renderBanner();
  renderPlatforms();
  renderSettings();
  renderHistory();
}

/* ---------- แถบสถานะซิงค์ ---------- */
function renderBanner() {
  const { platforms, settings, stats } = conn;
  const live = platforms.filter((p) => p.status !== "disconnected");
  const last = live.map((p) => p.lastSync).sort().pop();
  const next = new Date(last || Date.now());
  while (next <= new Date()) next.setMinutes(next.getMinutes() + settings.intervalMinutes);
  const mins = Math.max(1, Math.round((next - new Date()) / 60000));
  const on = settings.enabled && live.length > 0;

  const ic = $("#bannerIcon");
  ic.className = `w-9 h-9 rounded-full grid place-items-center border border-black ${on ? "bg-lime text-black" : "bg-white/20 text-white"}`;
  ic.innerHTML = icon(on ? "refresh-cw" : "pause", "w-4 h-4");
  $("#bannerTitle").textContent = on ? "ซิงค์อัตโนมัติกำลังทำงาน" : "ซิงค์อัตโนมัติปิดอยู่";
  $("#bannerSub").textContent = on
    ? `ดึงงานใหม่ทุก ${settings.intervalMinutes} นาที · ซิงค์ล่าสุด ${fmtTime(last)} น. · รอบถัดไป ${fmtTime(next.toISOString())} น. (อีก ${mins} นาที)`
    : live.length ? "เปิดใช้งานได้ที่ “การตั้งค่าซิงค์อัตโนมัติ” ด้านล่าง" : "ยังไม่มีแพลตฟอร์มที่เชื่อมต่อ";
  $("#statCourses").textContent = stats.coursesSynced;
  $("#statTasks").textContent = stats.tasksToday;
  $("#statFailed").textContent = stats.failed24h;
  refreshIcons();
}

/* ---------- การ์ด Google Classroom / Microsoft Teams ---------- */
const BADGE = {
  connected: ["chip-green", "เชื่อมต่อแล้ว"],
  expiring: ["chip-yellow", "Token ใกล้หมดอายุ"],
  error: ["chip-red", "ซิงค์ล้มเหลว"],
  disconnected: ["chip-gray", "ยังไม่เชื่อมต่อ"],
};

function renderPlatforms() {
  conn.platforms.forEach((p) => {
    const card = $(`[data-platform="${p.id}"]`);
    if (!card) return;
    const off = p.status === "disconnected";

    const badge = $("[data-role='badge']", card);
    badge.className = `chip ${BADGE[p.status][0]}`;
    badge.textContent = BADGE[p.status][1];

    bind(card, {
      account: off ? "—" : p.account,
      courses: off ? "—" : `${p.courses} รายวิชา`,
      expiry: off ? "—" : `${fmtDate(p.tokenExpiry)}${p.status === "expiring" ? ` (อีก ${daysUntil(p.tokenExpiry)} วัน)` : ""}`,
      lastSync: off ? "—" : p.lastSyncOk
        ? `<span class="inline-flex items-center gap-1">${icon("check", "w-3.5 h-3.5 text-[#1E8A3C]")}${fmtTime(p.lastSync)} น. สำเร็จ</span>`
        : `<span class="text-[#D92D20]">${fmtTime(p.lastSync)} น. ล้มเหลว</span>`,
      reconnectLabel: off ? `เชื่อมต่อ ${p.name}` : "เชื่อมต่อใหม่",
    });

    $("[data-role='expiring-note']", card).classList.toggle("hidden", p.status !== "expiring");
    $("[data-role='off-note']", card).classList.toggle("hidden", !off);
    $("[data-action='reconnect']", card).classList.toggle("hidden", p.status === "connected");
    $("[data-action='disconnect']", card).classList.toggle("hidden", off);
  });
  refreshIcons();
}

function confirmDisconnect(p) {
  const m = Modal.open("m-disconnect", { name: p.name, courses: p.courses });
  onConfirm(m, async () => {
    conn.platforms = await API.disconnectPlatform(p.id);
    toast(`ยกเลิกการเชื่อมต่อ ${p.name} แล้ว`);
    renderPlatforms(); renderBanner();
  });
}

async function reconnect(p, btn) {
  // ของจริง: const { redirectUrl } = await API.reconnectPlatform(p.id); location.href = redirectUrl;
  setLoading(btn, true, "กำลังเชื่อมต่อ...");
  try {
    conn.platforms = await API.reconnectPlatform(p.id);
    const np = conn.platforms.find((x) => x.id === p.id);
    toast(`เชื่อมต่อ ${p.name} สำเร็จ · สิทธิ์ใช้ได้ถึง ${fmtDate(np.tokenExpiry)}`);
  } catch (err) { toast(err.message, "error"); }
  setLoading(btn, false);
  renderPlatforms(); renderBanner();
}

/* ---------- ตั้งค่าซิงค์อัตโนมัติ ---------- */
function renderSettings() {
  const s = conn.settings;
  const t = $("#toggleSync");
  t.className = `chip ${s.enabled ? "chip-green" : "chip-gray"} !py-1 cursor-pointer`;
  t.innerHTML = `${icon(s.enabled ? "toggle-right" : "toggle-left", "w-4 h-4")}<span>${s.enabled ? "เปิดใช้งานอยู่" : "ปิดอยู่"}</span>`;
  t.setAttribute("aria-pressed", s.enabled);

  $("#syncInterval").value = s.intervalMinutes;
  $$("[data-set]").forEach((c) => {
    const [a, b] = c.dataset.set.split(".");
    c.checked = b ? s[a][b] : s[a];
  });
  // ปิดการแก้ไขเมื่อปิดซิงค์อัตโนมัติ
  $$("#settingsBody select, #settingsBody input").forEach((el) => (el.disabled = !s.enabled));
  $("#settingsBody").classList.toggle("opacity-50", !s.enabled);
  refreshIcons();
}

async function saveSettings(msg = "บันทึกการตั้งค่าแล้ว") {
  try {
    conn.settings = await API.updateSyncSettings(conn.settings);
    toast(msg);
  } catch (err) { toast(err.message, "error"); }
  renderSettings(); renderBanner();
}

/* ---------- ประวัติการซิงค์ ---------- */
function renderHistory() {
  const list = showAllHistory ? conn.history : conn.history.slice(0, 3);
  $("#btnAllHistory").textContent = showAllHistory ? "แสดงน้อยลง" : "ดูทั้งหมด";
  $("#historyBody").innerHTML = list.map((h) => `
    <tr>
      <td class="whitespace-nowrap">${fmtDateNum(h.time)} ${fmtTime(h.time)}</td>
      <td>${PLATFORM[h.platform].name}</td>
      <td>${esc(h.summary)}</td>
      <td>${h.ok ? `<span class="chip chip-green">สำเร็จ</span>` : `<span class="chip chip-red">ล้มเหลว</span>`}</td>
      <td class="text-black/70">${esc(h.note)}</td>
      <td class="text-right"><button class="link-plum" data-log="${h.id}">ดู Log</button></td>
    </tr>`).join("");
}

async function openSyncLog(id) {
  const m = Modal.open("m-log", { platform: "", summary: "กำลังโหลด...", log: "" });
  let e;
  try { e = await API.getSyncLog(id); }
  catch (err) { Modal.close(m); return toast(err.message, "error"); }
  bind(m, {
    platform: PLATFORM[e.platform].name,
    summary: `${fmtDate(e.time)} ${fmtTime(e.time)} น. · ${e.summary} · ${e.ok ? "สำเร็จ" : "ล้มเหลว"}`,
    log: e.log,
  });
  $("[data-action='copy']", m).onclick = async () => { await copyText(e.log); toast("คัดลอก Log แล้ว"); };
}

/* =========================================================
 * ผูก event กับ HTML
 * ========================================================= */
$$("[data-platform]").forEach((card) => {
  card.onclick = (e) => {
    const b = e.target.closest("[data-action]");
    if (!b || !conn) return;
    const p = conn.platforms.find((x) => x.id === card.dataset.platform);
    b.dataset.action === "disconnect" ? confirmDisconnect(p) : reconnect(p, b);
  };
});

$("#toggleSync").onclick = () => {
  if (!conn) return;
  if (conn.settings.enabled) {
    const m = Modal.open("m-sync-off");
    onConfirm(m, async () => { conn.settings.enabled = false; await saveSettings("ปิดการซิงค์อัตโนมัติแล้ว"); });
  } else {
    conn.settings.enabled = true;
    saveSettings("เปิดการซิงค์อัตโนมัติแล้ว");
  }
};

$("#syncInterval").onchange = (e) => {
  conn.settings.intervalMinutes = Number(e.target.value);
  saveSettings(`ตั้งค่าซิงค์ทุก ${conn.settings.intervalMinutes} นาทีแล้ว`);
};

$$("[data-set]").forEach((c) => (c.onchange = () => {
  const s = conn.settings;
  const [a, b] = c.dataset.set.split(".");
  if (b) {
    s[a][b] = c.checked;
    if (!Object.values(s.pull).some(Boolean)) {
      s[a][b] = true; c.checked = true;
      return toast("ต้องเลือกข้อมูลที่ดึงอย่างน้อย 1 อย่าง", "error");
    }
  } else s[a] = c.checked;
  saveSettings();
}));

$("#btnAllHistory").onclick = () => { showAllHistory = !showAllHistory; renderHistory(); };
$("#historyBody").onclick = (e) => { const b = e.target.closest("[data-log]"); if (b) openSyncLog(Number(b.dataset.log)); };

loadConnections();
