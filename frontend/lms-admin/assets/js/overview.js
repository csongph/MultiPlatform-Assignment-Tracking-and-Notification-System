/* =========================================================
 * overview.js — หน้า "ภาพรวมระบบ" (index.html)
 * ========================================================= */

let chartView = localStorage.getItem("kmaps_chart_view") || "donut";
let courseData = null;

async function loadOverview() {
  const now = new Date().toISOString();
  $("#updatedAt").textContent = `${fmtDate(now)} ${fmtTime(now)} น.`;

  let d;
  try { d = await API.getOverview(); }
  catch (err) { return showLoadError($("#app"), err.message, () => location.reload()); }

  /* การ์ดสถิติ */
  const c = d.courses;
  const totalCourses = c.breakdown.reduce((s, b) => s + b.courses, 0);
  $("#statUsers").textContent = fmtNumber(d.users.total);
  $("#statStudents").textContent = fmtNumber(d.users.students);
  $("#statAdmins").textContent = fmtNumber(d.users.admins);
  $("#statActive").textContent = fmtNumber(d.activeStudents7d);
  const growth = $("#statActiveGrowth");
  growth.textContent = `${d.activeGrowth >= 0 ? "▲" : "▼"} ${Math.abs(d.activeGrowth)}% จากเดือนก่อน`;
  growth.classList.add(d.activeGrowth >= 0 ? "text-[#1E8A3C]" : "text-[#D92D20]");
  $("#statCourses").textContent = totalCourses;
  $("#statGoogle").textContent = c.googleTotal;
  $("#statTeams").textContent = c.teamsTotal;
  $("#courseTotal").textContent = totalCourses;
  $("#courseSemester").textContent = c.semester;

  /* สถานะการซิงค์ */
  $("#syncStatusList").innerHTML = d.platforms.map((p) => {
    const h = platformHealth(p);
    return `
      <li class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-full border border-black/15 grid place-items-center shrink-0">${platformIcon(p.id, 18)}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-tight">${p.name}</p>
          <p class="text-[11px] text-black/60">${h.sub}</p>
        </div>
        <span class="chip ${h.chip}">${h.label}</span>
      </li>`;
  }).join("");

  /* ผู้ใช้ที่ลงทะเบียนล่าสุด */
  $("#recentUsersBody").innerHTML = d.recentUsers.map((u) => `
    <tr class="cursor-pointer" data-href="user-detail.html?id=${u.id}">
      <td>${esc(fullName(u))}</td>
      <td>${esc(u.email)}</td>
      <td>${roleText(u)}</td>
      <td>${u.accounts.map((a) => PLATFORM[a.platform].short).join(", ") || "—"}</td>
      <td>${fmtDate(u.registeredAt)}</td>
      <td>${statusChip(u.status)}</td>
    </tr>`).join("");
  $("#recentUsersBody").onclick = (e) => { const tr = e.target.closest("[data-href]"); if (tr) location.href = tr.dataset.href; };

  /* กราฟ */
  courseData = { c, total: totalCourses };
  drawCourseChart();
}

/* ปุ่มเลือกรูปแบบกราฟ */
$("#chartSeg").onclick = (e) => {
  const b = e.target.closest("[data-view]");
  if (!b || !courseData) return;
  chartView = b.dataset.view;
  try { localStorage.setItem("kmaps_chart_view", chartView); } catch {}
  drawCourseChart();
};

/* ---------------------------------------------------------
 * กราฟรายวิชา: วงกลม / โดนัท / แท่ง / ตาราง (SVG ล้วน ไม่ใช้ไลบรารี)
 * --------------------------------------------------------- */
function drawCourseChart() {
  const { c, total } = courseData;
  $$("#chartSeg [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === chartView));
  const rows = c.breakdown.map((b) => ({ ...b, pct: Math.round((b.courses / total) * 100) }));
  const body = $("#chartBody");

  if (chartView === "pie" || chartView === "donut") {
    const donut = chartView === "donut";
    body.innerHTML = `
      <div class="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
        <div class="relative w-[210px] h-[210px] shrink-0">
          ${pieSVG(rows, donut ? 58 : 0)}
          ${donut ? `
          <div class="absolute inset-0 grid place-items-center text-center pointer-events-none">
            <div><p class="text-4xl font-extrabold leading-none">${total}</p><p class="text-[10px] text-black/60 mt-1">รายวิชาทั้งหมด</p></div>
          </div>` : ""}
        </div>
        <ul class="space-y-5 w-full max-w-[290px]">
          ${rows.map((r) => `
            <li class="flex items-center gap-3">
              <span class="w-3.5 h-3.5 rounded-full border border-black shrink-0" style="background:${r.color}"></span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold leading-tight">${r.legend}</p>
                <p class="text-[11px] text-black/60">${r.courses} รายวิชา</p>
              </div>
              <span class="font-bold">${r.pct}%</span>
            </li>`).join("")}
        </ul>
      </div>`;
  } else if (chartView === "bar") {
    const max = Math.max(...rows.map((r) => r.courses));
    body.innerHTML = `
      <div class="px-2 sm:px-10 pt-4">
        <div class="flex items-end justify-around h-[200px] border-b border-black">
          ${rows.map((r) => `
            <div class="flex flex-col items-center w-24">
              <span class="text-xs font-bold mb-1">${r.courses} วิชา</span>
              <div class="bar-grow w-[70px] rounded-t-md border border-black border-b-0" style="height:${(r.courses / max) * 160}px;background:${r.color}" title="${r.label}: ${r.courses} วิชา"></div>
            </div>`).join("")}
        </div>
        <div class="flex justify-around mt-2">
          ${rows.map((r) => `<div class="w-24 text-center"><p class="text-xs font-medium">${r.short}</p><p class="text-[10px] text-black/50">${r.pct}%</p></div>`).join("")}
        </div>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>แพลตฟอร์ม</th><th>รายวิชา</th><th>สัดส่วน</th><th>นักเรียน</th><th>งานทั้งหมด</th></tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td><span class="inline-flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full border border-black" style="background:${r.color}"></span>${r.label}</span></td>
                <td>${r.courses}</td>
                <td><div class="flex items-center gap-2"><div class="w-20 h-2 rounded-full bg-black/10 overflow-hidden"><div class="h-full rounded-full" style="width:${r.pct}%;background:${r.color}"></div></div><span>${r.pct}%</span></div></td>
                <td>${fmtNumber(r.students)}</td>
                <td>${fmtNumber(r.tasks)}</td>
              </tr>`).join("")}
            <tr class="font-bold"><td>รวม</td><td>${total}</td><td>100%</td><td>${fmtNumber(c.totalStudents)}</td><td>${fmtNumber(c.totalTasks)}</td></tr>
          </tbody>
        </table>
      </div>`;
  }
}

function pieSVG(rows, innerR = 0) {
  const total = rows.reduce((s, r) => s + r.courses, 0);
  const R = 100, cx = 105, cy = 105;
  let a0 = -Math.PI / 2;
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const paths = rows.map((r) => {
    const a1 = a0 + (r.courses / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = innerR
      ? `M ${pt(R, a0)} A ${R} ${R} 0 ${large} 1 ${pt(R, a1)} L ${pt(innerR, a1)} A ${innerR} ${innerR} 0 ${large} 0 ${pt(innerR, a0)} Z`
      : `M ${cx} ${cy} L ${pt(R, a0)} A ${R} ${R} 0 ${large} 1 ${pt(R, a1)} Z`;
    a0 = a1;
    return `<path d="${d}" fill="${r.color}" stroke="#fff" stroke-width="2.5"><title>${r.label}: ${r.courses} รายวิชา</title></path>`;
  });
  return `<svg viewBox="0 0 210 210" class="w-full h-full">${paths.join("")}
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#000" stroke-opacity=".12"/></svg>`;
}

loadOverview();
