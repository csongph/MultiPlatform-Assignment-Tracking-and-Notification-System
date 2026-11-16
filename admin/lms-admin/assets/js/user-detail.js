/* =========================================================
 * user-detail.js — หน้า "รายละเอียดผู้ใช้" (user-detail.html?id=5)
 * ========================================================= */

const userId = Number(new URLSearchParams(location.search).get("id"));

async function loadUserDetail() {
  if (!userId) return (location.href = "users.html");

  let u;
  try { u = await API.getUser(userId); }
  catch (err) {
    $("#detail").classList.add("hidden");
    $("#notFound").classList.remove("hidden");
    return;
  }

  const pct = u.tasksReceived ? Math.round((u.tasksSubmitted / u.tasksReceived) * 100) : 0;
  document.title = `${fullName(u)} | KMAPS Admin`;

  /* เติมข้อความทุกช่องที่มี data-bind */
  bind(document, {
    fullName: fullName(u),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    studentId: u.studentId || "—",
    roleText: roleText(u),
    signupVia: u.signupVia,
    registeredAt: fmtDate(u.registeredAt),
    lastLogin: u.lastLogin ? `${fmtRelative(u.lastLogin, { withTimeForOld: true })} น.` : "ยังไม่เคยเข้าใช้",
    tasksReceived: `${u.tasksReceived} งาน`,
    tasksSubmitted: `${u.tasksSubmitted} งาน (${pct}%)`,
  });

  const av = $("#profileAvatar");
  av.textContent = initials(u);
  av.style.background = avatarColor(u);
  $("#profileStatus").innerHTML = statusChip(u.status);
  $("#taskRows").classList.toggle("hidden", u.role !== "student");

  /* ปุ่มระงับ / เปิดใช้งาน */
  const suspended = u.status === "suspended";
  $("#rowSuspend").classList.toggle("hidden", suspended);
  $("#rowActivate").classList.toggle("hidden", !suspended);

  /* บัญชีที่เชื่อมต่อ */
  $("#accountList").innerHTML = u.accounts.length
    ? u.accounts.map((a) => `
      <div class="flex flex-wrap items-center gap-3 border border-black/15 rounded-xl px-4 py-3">
        <span class="w-9 h-9 rounded-full border border-black/15 grid place-items-center shrink-0">${platformIcon(a.platform, 20)}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">${PLATFORM[a.platform].name}</p>
          <p class="text-[11px] text-black/55 truncate">${esc(a.email)} · ซิงค์ล่าสุด ${fmtTime(a.lastSync)} น.</p>
        </div>
        <span class="chip chip-green">เชื่อมต่อแล้ว</span>
        <button class="btn btn-sm btn-red-outline" data-unlink="${a.platform}">${icon("unlink", "w-3.5 h-3.5")}ยกเลิกการเชื่อม</button>
      </div>`).join("")
    : `<p class="text-sm text-black/50 py-4 text-center">ผู้ใช้ยังไม่ได้เชื่อมบัญชี LMS</p>`;

  /* กิจกรรมล่าสุด */
  $("#activityList").innerHTML = u.activities.map((a) => `
    <li class="grid grid-cols-[130px_1fr] gap-3 text-xs">
      <span class="text-black/60">${fmtRelative(a.time, { withTimeForOld: true })} น.</span>
      <span>${esc(a.text)}</span>
    </li>`).join("");

  /* ปุ่มต่าง ๆ */
  $("#btnSuspend").onclick = () => openSuspendModal([u], loadUserDetail);
  $("#btnActivate").onclick = () => openReactivateModal([u], loadUserDetail);
  $("#btnReset").onclick = () => openResetLoginModal(u, loadUserDetail);
  $("#btnDelete").onclick = () => openDeleteModal([u], () => setTimeout(() => (location.href = "users.html"), 700));
  $("#accountList").onclick = (e) => {
    const b = e.target.closest("[data-unlink]");
    if (b) openUnlinkModal(u, loadUserDetail, b.dataset.unlink);
  };

  $("#detail").classList.remove("invisible");
  $("#detail").classList.add("fade-in");
  refreshIcons();
}

loadUserDetail();
