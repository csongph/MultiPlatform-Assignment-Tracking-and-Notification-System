/* =========================================================
   หน้าภาพรวมระบบ (Dashboard)
   ดึงข้อมูลจากผู้ใช้ในหน้า "จัดการผู้ใช้งาน" + สถิติรายวิชา
   ยังไม่มีข้อมูล -> แสดง 0
   ========================================================= */
async function loadDashboard() {
  const [users, growth, courses] = await Promise.all([
    DataStore.getUsers(),
    DataStore.getUserGrowth(),
    DataStore.getCourseStats(),
  ]);

  renderCounts(users, growth);
  renderSyncTable(users);
  renderPie(courses);
}

function formatGrowth(pct) {
  const arrow = pct < 0 ? "↓" : "↑";
  return `${arrow} ${Math.abs(pct)} %`;
}

function renderCounts(users, growth) {
  const students = users.filter(u => u.type === "student").length;
  const admins = users.filter(u => u.type === "admin").length;
  document.getElementById("studentCount").textContent = students.toLocaleString();
  document.getElementById("adminCount").textContent = admins.toLocaleString();
  document.getElementById("studentGrowth").textContent = formatGrowth(growth.student);
  document.getElementById("adminGrowth").textContent = formatGrowth(growth.admin);
}

function renderSyncTable(users) {
  const body = document.getElementById("syncBody");
  if (!users.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="3">ยังไม่มีข้อมูลการ Sync (0 รายการ)</td></tr>`;
    return;
  }
  body.innerHTML = users.slice(0, 5).map(u => `
    <tr>
      <td>${escapeHTML(u.email)}</td>
      <td>${TYPE_LABEL[u.type] || u.type}</td>
      <td>${statusBadge(u.status)}</td>
    </tr>`).join("");
}

/* =========================================================
   กราฟรายวิชา – แอดมินเลือกรูปแบบได้ 5 แบบ
   pie | donut | bar | hbar | stack
   (จำค่าที่เลือกไว้ในเบราว์เซอร์ เปิดครั้งหน้าจะเป็นแบบเดิม)
   ========================================================= */
const CHART_KEY = "lms_admin_chart_type";
const CHART_TYPES = ["pie", "donut", "bar", "hbar", "stack"];
let chartType = "pie";
let courseItems = [];

try {
  const saved = localStorage.getItem(CHART_KEY);
  if (CHART_TYPES.includes(saved)) chartType = saved;
} catch (e) {}

function renderPie({ classroom, teams, both }) {
  courseItems = [
    { name: "Google Classroom", count: classroom, color: "var(--gc)" },
    { name: "Microsoft Teams", count: teams, color: "var(--teams)" },
    { name: "เชื่อมต่อทั้ง 2 แพลตฟอร์ม", count: both, color: "var(--both)" },
  ];
  renderLegend();
  renderChart();
}

function courseTotal() {
  return courseItems.reduce((s, it) => s + it.count, 0);
}
function pct(n) {
  const total = courseTotal();
  return total ? ((n / total) * 100).toFixed(1) : "0.0";
}

function renderLegend() {
  document.getElementById("legend").innerHTML = courseItems.map(it => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${it.color}"></span>
      <span class="legend-name">${it.name}<br />${it.count} รายวิชา</span>
      <span class="legend-pct">${pct(it.count)}%</span>
    </div>`).join("");
}

function setActiveButton() {
  document.querySelectorAll("#chartSwitch button").forEach(b => {
    const on = b.dataset.chart === chartType;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
}

function renderChart() {
  setActiveButton();
  const canvas = document.getElementById("chartCanvas");
  canvas.className = `chart-canvas chart-${chartType}`;
  const renderers = { pie: drawPie, donut: drawDonut, bar: drawBar, hbar: drawHBar, stack: drawStack };
  canvas.innerHTML = renderers[chartType]();
}

/* ---------- พาย (3 มิติ ตามแบบ Figma) ---------- */
function conicBg() {
  const total = courseTotal();
  if (!total) return "#ececec";
  // เรียงเหมือนแบบ: ชมพู -> เทา -> เขียว
  const order = [courseItems[2], courseItems[1], courseItems[0]];
  let start = 0;
  const stops = order.map(it => {
    const end = start + (it.count / total) * 360;
    const s = `${it.color} ${start}deg ${end}deg`;
    start = end;
    return s;
  });
  return `conic-gradient(${stops.join(",")})`;
}

function emptyNote() {
  return courseTotal() ? "" : `<div class="chart-empty">ยังไม่มีข้อมูล (0 รายวิชา)</div>`;
}

function drawPie() {
  const bg = conicBg();
  return `
    <div class="pie-3d">
      <div class="pie-shadow" style="background:${bg}"></div>
      <div class="pie-top" style="background:${bg}"></div>
      ${emptyNote()}
    </div>`;
}

/* ---------- โดนัท (ตัวเลขรวมอยู่ตรงกลาง) ---------- */
function drawDonut() {
  return `
    <div class="donut" style="background:${conicBg()}">
      <div class="donut-hole">
        <b>${courseTotal()}</b>
        <span>รายวิชาทั้งหมด</span>
      </div>
    </div>`;
}

/* ---------- แท่งแนวตั้ง ---------- */
// หาค่าสูงสุดของแกนให้แบ่ง 4 ช่องได้ตัวเลขกลมๆ (เช่น 4, 8, 20, 40, 100)
function niceMax(n) {
  const raw = Math.max(n, 1) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  return Math.max(Math.ceil(step) * 4, 4);
}

function drawBar() {
  const max = niceMax(Math.max(...courseItems.map(i => i.count)));
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return `
    <div class="vbar">
      <div class="vbar-axis">${ticks.map(t => `<span>${Math.round(t)}</span>`).join("")}</div>
      <div class="vbar-plot">
        ${ticks.map(() => `<i class="gridline"></i>`).join("")}
        <div class="vbar-cols">
          ${courseItems.map(it => `
            <div class="vbar-col" style="--h:${(it.count / max) * 100}%" title="${it.name}: ${it.count} รายวิชา (${pct(it.count)}%)">
              <span class="vbar-val">${it.count}</span>
              <div class="vbar-fill" style="background:${it.color}"></div>
            </div>`).join("")}
        </div>
      </div>
      <div></div>
      <div class="vbar-labels">${courseItems.map(it => `<span>${it.name}</span>`).join("")}</div>
    </div>`;
}

/* ---------- แท่งแนวนอน ---------- */
function drawHBar() {
  const max = Math.max(...courseItems.map(i => i.count), 1);
  return `
    <div class="hbar">
      ${courseItems.map(it => `
        <div class="hbar-row" title="${it.name}: ${it.count} รายวิชา (${pct(it.count)}%)">
          <span class="hbar-label">${it.name}</span>
          <div class="hbar-track">
            <div class="hbar-fill" style="--w:${(it.count / max) * 100}%;background:${it.color}"></div>
          </div>
          <span class="hbar-val">${it.count}</span>
        </div>`).join("")}
    </div>`;
}

/* ---------- แท่งสัดส่วน 100% ---------- */
function drawStack() {
  const total = courseTotal();
  const segs = total
    ? courseItems.filter(it => it.count > 0).map(it => `
        <div class="stack-seg" style="flex:${it.count};background:${it.color}"
             title="${it.name}: ${it.count} รายวิชา (${pct(it.count)}%)">
          ${it.count / total >= 0.08 ? `${pct(it.count)}%` : ""}
        </div>`).join("")
    : `<div class="stack-seg stack-empty" style="flex:1">0%</div>`;
  return `
    <div class="stack">
      <div class="stack-total">รวม <b>${total}</b> รายวิชา</div>
      <div class="stack-bar">${segs}</div>
      <div class="stack-scale"><span>0%</span><span>50%</span><span>100%</span></div>
    </div>`;
}

document.getElementById("chartSwitch").addEventListener("click", e => {
  const btn = e.target.closest("[data-chart]");
  if (!btn || btn.dataset.chart === chartType) return;
  chartType = btn.dataset.chart;
  try { localStorage.setItem(CHART_KEY, chartType); } catch (err) {}
  renderChart();
});

loadDashboard();
