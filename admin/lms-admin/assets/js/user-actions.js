/* =========================================================
 * user-actions.js — การทำงานของ modal ผู้ใช้
 * ใช้ทั้งหน้า users.html และ user-detail.html
 * (markup ของ modal อยู่ในไฟล์ HTML: m-delete, m-suspend, m-reactivate,
 *  m-reset, m-unlink, m-history, m-add-admin)
 *
 * ทุกฟังก์ชันรับ onDone() — เรียกหลังทำรายการสำเร็จ เพื่อให้หน้าโหลดข้อมูลใหม่
 * ========================================================= */

const targetText = (list) => (list.length === 1 ? `“${fullName(list[0])}”` : `${list.length} คน`);
function nextSyncTime() {
  const d = new Date();
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15, 0, 0);
  return fmtTime(d.toISOString());
}

/* ---------- ระงับบัญชี ---------- */
function openSuspendModal(list, onDone) {
  if (!list.length) return;
  const m = Modal.open("m-suspend", { target: targetText(list) });
  $("#suspendReason", m).value = "";
  onConfirm(m, async () => {
    await API.setUsersStatus(list.map((u) => u.id), "suspended", $("#suspendReason", m).value.trim());
    toast(`ระงับบัญชี ${list.length === 1 ? fullName(list[0]) : list.length + " คน"} แล้ว`);
    onDone?.();
  });
}

/* ---------- เปิดใช้งาน ---------- */
function openReactivateModal(list, onDone) {
  if (!list.length) return;
  const u = list[0];
  const bullets = list.length === 1 && u.status === "suspended"
    ? [`ถูกระงับเมื่อ ${fmtDate(u.suspendedAt)} โดย ${esc(u.suspendedBy || "-")}`, `เหตุผล: ${esc(u.suspendReason || "ไม่ระบุ")}`]
    : [`เปิดใช้งาน ${list.length} บัญชี`];
  bullets.push(`ระบบจะซิงค์งานจาก LMS ให้ในรอบถัดไป (${nextSyncTime()} น.)`);

  const m = Modal.open("m-reactivate", { target: targetText(list), bullets: bullets.map((b) => `<li>${b}</li>`).join("") });
  onConfirm(m, async () => {
    await API.setUsersStatus(list.map((x) => x.id), "active");
    toast(`เปิดใช้งาน ${list.length === 1 ? fullName(u) : list.length + " คน"} แล้ว`);
    onDone?.();
  });
}

/* ---------- ลบผู้ใช้ ---------- */
function openDeleteModal(list, onDone) {
  if (!list.length) return;
  const platforms = [...new Set(list.flatMap((u) => u.accounts.map((a) => PLATFORM[a.platform].name)))];
  const canSuspendInstead = list.filter((u) => u.status !== "suspended");

  const m = Modal.open("m-delete", {
    target: targetText(list),
    tasks: fmtNumber(list.reduce((s, u) => s + (u.tasksReceived || 0), 0)),
    platforms: platforms.length ? `การเชื่อมต่อกับ ${platforms.join(" และ ")}` : "ข้อมูลโปรไฟล์และการตั้งค่า",
    confirmLabel: list.length === 1 ? "ลบผู้ใช้ถาวร" : `ลบ ${list.length} คนถาวร`,
  });
  $$("[data-show='suspend-instead']", m).forEach((el) => el.classList.toggle("hidden", !canSuspendInstead.length));

  const input = $("#deleteConfirm", m);
  const btn = onConfirm(m, async () => {
    await API.deleteUsers(list.map((u) => u.id));
    toast(list.length === 1 ? `ลบ ${fullName(list[0])} แล้ว` : `ลบผู้ใช้ ${list.length} คนแล้ว`);
    onDone?.(list.map((u) => u.id));
  });
  input.value = "";
  btn.disabled = true;
  input.oninput = () => (btn.disabled = input.value.trim() !== "ลบ");

  $("[data-action='suspend-instead']", m).onclick = () => {
    Modal.close(m);
    openSuspendModal(canSuspendInstead, onDone);
  };
}

/* ---------- รีเซ็ตการเข้าสู่ระบบ ---------- */
function openResetLoginModal(user, onDone) {
  const m = Modal.open("m-reset", { name: fullName(user), devices: user.activeDevices });
  onConfirm(m, async () => {
    await API.resetLogin(user.id);
    toast(`รีเซ็ตการเข้าสู่ระบบของ ${fullName(user)} แล้ว`);
    onDone?.();
  });
}

/* ---------- ยกเลิกการเชื่อมบัญชี LMS ---------- */
function openUnlinkModal(user, onDone, only = null) {
  if (!user.accounts.length) return toast(`${fullName(user)} ยังไม่ได้เชื่อมบัญชี LMS`, "info");
  const m = Modal.open("m-unlink", { name: fullName(user) });
  const list = $("#unlinkList", m);
  list.innerHTML = user.accounts.map((a, i) => `
    <label class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[.03] cursor-pointer">
      <input type="checkbox" class="check" data-platform="${a.platform}" ${(only ? a.platform === only : i === 0) ? "checked" : ""} />
      <span class="w-8 h-8 rounded-full border border-black/15 grid place-items-center shrink-0">${platformIcon(a.platform, 18)}</span>
      <span class="min-w-0">
        <span class="block text-sm font-semibold">${PLATFORM[a.platform].name}</span>
        <span class="block text-[11px] text-black/55 truncate">${esc(a.email)} · ซิงค์ล่าสุด ${fmtTime(a.lastSync)} น.</span>
      </span>
    </label>`).join("");

  const btn = onConfirm(m, async () => {
    const platforms = $$("[data-platform]:checked", list).map((c) => c.dataset.platform);
    await API.unlinkAccounts(user.id, platforms);
    toast(`ยกเลิกการเชื่อม ${platforms.map((p) => PLATFORM[p].short).join(", ")} ของ ${fullName(user)} แล้ว`);
    onDone?.();
  });
  const update = () => {
    const n = $$("[data-platform]:checked", list).length;
    bind(m, { count: n });
    btn.disabled = n === 0;
  };
  list.onchange = update;
  update();
}

/* ---------- ประวัติการเข้าใช้งาน ---------- */
async function openLoginHistoryModal(user) {
  const m = Modal.open("m-history", { name: fullName(user), total: "…", failed: "…", devices: "…" });
  const body = $("#historyRows", m);
  body.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-black/50">กำลังโหลด...</td></tr>`;
  let h;
  try { h = await API.getLoginHistory(user.id); }
  catch (err) { Modal.close(m); return toast(err.message, "error"); }

  bind(m, { total: h.total, failed: h.failed, devices: h.devices });
  body.innerHTML = h.rows.map((r) => `
    <tr>
      <td class="whitespace-nowrap">${fmtRelative(r.time, { withTimeForOld: true })}</td>
      <td>${r.via}</td>
      <td class="whitespace-nowrap">${r.device}</td>
      <td>${r.ip}</td>
      <td>${r.ok ? `<span class="chip chip-soft-green">สำเร็จ</span>` : `<span class="chip chip-soft-red">ล้มเหลว</span>`}</td>
    </tr>`).join("");

  $("[data-action='export']", m).onclick = () => {
    downloadCSV(`login-history-${user.id}.csv`, [["วันเวลา", "ช่องทาง", "อุปกรณ์", "IP", "ผล"],
      ...h.rows.map((r) => [`${fmtDate(r.time)} ${fmtTime(r.time)}`, r.via, r.device, r.ip, r.ok ? "สำเร็จ" : "ล้มเหลว"])]);
    toast("ส่งออกประวัติการเข้าใช้งานแล้ว");
  };
}

/* ---------- เพิ่มผู้ดูแลระบบ (เฉพาะหน้า users.html) ---------- */
function openAddAdminModal(allUsers, onDone) {
  const m = Modal.open("m-add-admin");
  const form = $("#inviteForm", m), submit = $("#btnAdminSubmit", m), err = $("#adminError", m);
  let tab = "invite", picked = null;

  form.reset();
  $$(".input", form).forEach((i) => i.classList.remove("invalid"));
  $("#pickSearch", m).value = "";
  $("#sendInvite", m).checked = true;
  err.classList.add("hidden");

  const renderPick = () => {
    const q = $("#pickSearch", m).value.trim().toLowerCase();
    const found = allUsers.filter((u) => u.role !== "admin" && u.status === "active" &&
      (!q || [fullName(u), u.email, u.studentId].some((v) => (v || "").toLowerCase().includes(q)))).slice(0, 20);
    $("#pickList", m).innerHTML = found.length
      ? found.map((u) => `
        <label class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-black/[.03] ${picked === u.id ? "bg-lime-soft" : ""}">
          <input type="radio" name="pick" value="${u.id}" class="accent-black" ${picked === u.id ? "checked" : ""} />
          ${avatar(u, 30, "text-[10px]")}
          <span class="min-w-0"><span class="block text-sm font-semibold">${esc(fullName(u))}</span><span class="block text-[11px] text-black/55">${esc(u.email)}</span></span>
        </label>`).join("")
      : `<p class="text-center text-xs text-black/50 py-6">ไม่พบผู้ใช้</p>`;
    submit.disabled = !picked;
  };

  const setTab = (t) => {
    tab = t;
    $$("#adminTabs button", m).forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
    form.classList.toggle("hidden", t !== "invite");
    $("#sendInviteRow", m).classList.toggle("hidden", t !== "invite");
    $("#pickPane", m).classList.toggle("hidden", t !== "pick");
    err.classList.add("hidden");
    submit.innerHTML = t === "invite" ? `${icon("send")}ส่งคำเชิญ` : `${icon("shield-check")}แต่งตั้งเป็นแอดมิน`;
    submit.disabled = t === "pick" && !picked;
    if (t === "pick") { renderPick(); $("#pickSearch", m).focus(); }
    refreshIcons();
  };
  setTab("invite");

  $("#adminTabs", m).onclick = (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); };
  $("#pickSearch", m).oninput = renderPick;
  $("#pickList", m).onchange = (e) => { picked = Number(e.target.value); renderPick(); };
  form.onsubmit = (e) => { e.preventDefault(); submit.click(); };
  form.oninput = (e) => { e.target.classList.remove("invalid"); err.classList.add("hidden"); };

  const showError = (msg) => { err.textContent = msg; err.classList.remove("hidden"); };

  submit.onclick = async () => {
    try {
      if (tab === "invite") {
        const data = { firstName: form.firstName.value.trim(), lastName: form.lastName.value.trim(), email: form.email.value.trim() };
        const bad = [];
        if (!data.firstName) bad.push("firstName");
        if (!data.lastName) bad.push("lastName");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) bad.push("email");
        bad.forEach((n) => form[n].classList.add("invalid"));
        if (bad.length) return showError(bad.includes("email") && data.email ? "รูปแบบอีเมลไม่ถูกต้อง" : "กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ");

        setLoading(submit, true, "กำลังส่ง...");
        const sendInvite = $("#sendInvite", m).checked;
        await API.inviteAdmin({ ...data, sendInvite });
        toast(sendInvite ? `ส่งคำเชิญไปที่ ${data.email} แล้ว` : `เพิ่ม ${data.firstName} เป็นผู้ดูแลระบบแล้ว`);
      } else {
        setLoading(submit, true);
        const u = await API.promoteToAdmin(picked);
        toast(`แต่งตั้ง ${fullName(u)} เป็นผู้ดูแลระบบแล้ว`);
      }
      setLoading(submit, false);
      Modal.close(m);
      onDone?.();
    } catch (e) {
      setLoading(submit, false);
      showError(e.message);
    }
  };
}
