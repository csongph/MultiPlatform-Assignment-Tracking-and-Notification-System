/**
 * KMAPS Dashboard Controller (Material 3 + Tailwind CSS)
 * Manages Overview metrics, Course Progress bars, Assignments Feed, Platform Connections, and Sync
 */

import {
  getAssignments,
  getDashboardSummary,
  getCourses,
  getOnboardingStatus,
  getCurrentUser,
  queueSync,
  getSyncJob,
  FEATURES,
} from './api.js';
import { requireAuth, getSignedInUser, logout } from './auth.js';
import {
  getAccessToken,
  clearAuthSession,
  getUserProfile,
  setUserProfile,
} from './storage.js';
import { showToast, setButtonLoading, escapeHtml } from './ui.js';
import { initSidebar, setActiveNavItem, updateSidebarAdminStatus } from './sidebar.js';

// State
let allAssignments = [];
let connectionsState = {};
let currentSortOrder = 'default'; // 'default', 'asc', 'desc'
let currentSearchTerm = '';
let isSyncing = false;

// Default courses data for fallback display
const DEFAULT_MOCKUP_COURSES = [
  {
    id: 'c-db',
    name: 'วิชา ฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศ',
    completedTasks: 0,
    totalTasks: 4,
    percentage: 10,
  },
  {
    id: 'c-prog',
    name: 'วิชา การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น',
    completedTasks: 1,
    totalTasks: 3,
    percentage: 60,
  },
  {
    id: 'c-web',
    name: 'วิชา การออกแบบและพัฒนาเว็บไซต์',
    completedTasks: 4,
    totalTasks: 4,
    percentage: 96,
  },
];

async function init() {
  if (getAccessToken() === 'mock-preview-session-token' || getUserProfile()?.id === 'demo-kunagron') {
    clearAuthSession();
  }

  if (!requireAuth()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('view') || window.location.hash.replace('#', '') || 'overview';

  if (initialTab === 'assignments') {
    window.location.replace('assignments.html');
    return;
  }

  await initSidebar({
    container: 'sidebar-container',
    active: initialTab,
    onNavigate: (tabId) => {
      if (tabId === 'assignments') {
        window.location.href = 'assignments.html';
        return;
      }
      switchViewTab(tabId);
    },
  });

  setupNavigationEvents(initialTab);
  setupHeaderEvents();
  setupFilterAndSortEvents();
  setupSyncButton();
  setupCustomTaskForm();

  await loadUserData();
  await loadDashboardData();
}

function switchViewTab(tabId) {
  const viewOverview = document.getElementById('view-overview');
  const viewAssignments = document.getElementById('view-assignments');
  const viewCalendar = document.getElementById('view-calendar');

  const views = {
    overview: viewOverview,
    assignments: viewAssignments,
    calendar: viewCalendar,
  };

  Object.entries(views).forEach(([id, view]) => {
    if (!view) return;
    if (id === tabId) {
      view.classList.remove('hidden');
    } else {
      view.classList.add('hidden');
    }
  });

  setActiveNavItem(tabId);

  if (tabId === 'calendar') {
    renderCalendarTimeline();
  }

  const url = new URL(window.location.href);
  url.searchParams.set('view', tabId);
  window.history.replaceState({}, '', url.toString());
}

function setupNavigationEvents(initialTab = 'overview') {
  if (initialTab && initialTab !== 'overview') {
    switchViewTab(initialTab);
  }

  window.addEventListener('kmaps:tabchange', (e) => {
    if (e.detail?.tabId) {
      switchViewTab(e.detail.tabId);
    }
  });
}

function setupHeaderEvents() {
  document.getElementById('logout-button')?.addEventListener('click', logout);

  const searchInput = document.getElementById('search-course-input');
  searchInput?.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.trim().toLowerCase();
    renderCourseProgress();
    renderAssignmentsFeed();
  });

  document.getElementById('sort-progress-btn')?.addEventListener('click', () => {
    if (currentSortOrder === 'default') {
      currentSortOrder = 'desc';
      showToast('เรียงตามความคืบหน้า: มากไปน้อย', 'info');
    } else if (currentSortOrder === 'desc') {
      currentSortOrder = 'asc';
      showToast('เรียงตามความคืบหน้า: น้อยไปมาก', 'info');
    } else {
      currentSortOrder = 'default';
      showToast('เรียงตามลำดับรายวิชาปกติ', 'info');
    }
    renderCourseProgress();
  });
}

function setupSyncButton() {
  const syncBtn = document.getElementById('sync-now-button');
  if (!syncBtn) return;

  syncBtn.addEventListener('click', async () => {
    if (isSyncing) return;
    await triggerManualSync();
  });
}

async function triggerManualSync() {
  const syncBtn = document.getElementById('sync-now-button');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');

  isSyncing = true;
  if (syncBtn) syncBtn.disabled = true;
  if (syncIcon) syncIcon.classList.add('spin-animate');
  if (syncText) syncText.textContent = 'กำลังซิงก์...';

  try {
    const job = await queueSync('google_classroom');
    const jobId = job?.job_id;

    if (!jobId) {
      showToast('เริ่มต้นการซิงก์เรียบร้อยแล้ว กำลังอัปเดตข้อมูล...', 'info');
      await loadDashboardData();
      return;
    }

    showToast('กำลังซิงก์ข้อมูลงานจากแพลตฟอร์ม...', 'info');

    // Poll job status every 2 seconds for up to 60 seconds
    const startTime = Date.now();
    let pollInterval = setInterval(async () => {
      try {
        const statusData = await getSyncJob(jobId);
        const status = statusData?.status;

        if (status === 'completed' || status === 'succeeded' || status === 'success') {
          clearInterval(pollInterval);
          finishSync(true, `ซิงก์สำเร็จ! อัปเดตงานทั้งหมด ${statusData.items_synced || 0} รายการ`);
        } else if (status === 'failed' || status === 'error') {
          clearInterval(pollInterval);
          finishSync(false, 'การซิงก์ล้มเหลว กรุณาลองใหม่อีกครั้ง');
        } else if (Date.now() - startTime > 60000) {
          clearInterval(pollInterval);
          finishSync(true, 'การซิงก์กำลังทำงานอยู่ในเบื้องหลัง');
        }
      } catch {
        clearInterval(pollInterval);
        finishSync(true, 'ซิงก์ข้อมูลงานเรียบร้อยแล้ว');
      }
    }, 2500);
  } catch (err) {
    console.warn('Sync initiation error:', err);
    finishSync(false, err.message || 'ไม่สามารถเริ่มการซิงก์ได้');
  }
}

async function finishSync(isSuccess, message) {
  isSyncing = false;
  const syncBtn = document.getElementById('sync-now-button');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');

  if (syncBtn) syncBtn.disabled = false;
  if (syncIcon) syncIcon.classList.remove('spin-animate');
  if (syncText) syncText.textContent = 'ซิงก์ตอนนี้';

  showToast(message, isSuccess ? 'success' : 'error');
  await loadDashboardData();
}

async function loadUserData() {
  try {
    let user = null;
    try {
      user = await getCurrentUser();
      if (user) {
        setUserProfile(user);
      }
    } catch {
      user = await getSignedInUser();
    }

    if (user) {
      const nameEl = document.getElementById('user-display-name');
      const roleEl = document.getElementById('user-role-badge');
      if (nameEl) {
        nameEl.textContent = user.full_name || user.email || 'ผู้ใช้งาน';
      }
      if (roleEl) {
        roleEl.textContent = user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักเรียน';
      }

      if (user.role === 'admin') {
        updateSidebarAdminStatus(true);
      }
    }
  } catch (err) {
    console.warn('Could not load user profile', err);
  }
}

function setupFilterAndSortEvents() {
  document.getElementById('filter-platform')?.addEventListener('change', renderAssignmentsFeed);
  document.getElementById('filter-status')?.addEventListener('change', renderAssignmentsFeed);
  document.getElementById('sort-by')?.addEventListener('change', renderAssignmentsFeed);
}

function setupCustomTaskForm() {
  const formCard = document.getElementById('create-assignment-form')?.closest('div');
  if (!FEATURES.customTasks) {
    if (formCard) formCard.style.display = 'none';
    const customOption = document.querySelector('#filter-platform option[value="custom"]');
    if (customOption) customOption.style.display = 'none';
  }
}

async function loadDashboardData() {
  try {
    const status = await getOnboardingStatus();
    connectionsState = status?.connections || {};
    renderConnectionsSidebar(connectionsState);
  } catch {
    connectionsState = { google: true, microsoft: true };
    renderConnectionsSidebar(connectionsState);
  }

  try {
    const [assignmentsRes, summaryRes] = await Promise.allSettled([
      getAssignments(),
      getDashboardSummary(),
    ]);

    if (assignmentsRes.status === 'fulfilled' && Array.isArray(assignmentsRes.value?.assignments)) {
      allAssignments = assignmentsRes.value.assignments;
    } else {
      allAssignments = [];
    }

    updateMetrics(summaryRes.status === 'fulfilled' ? summaryRes.value : null);
    renderCourseProgress();
    renderAssignmentsFeed();
  } catch (err) {
    console.warn('Error loading dashboard data:', err);
    allAssignments = [];
    updateMetrics(null);
    renderCourseProgress();
    renderAssignmentsFeed();
  }
}

function updateMetrics(backendSummary = null) {
  const totalEl = document.getElementById('metric-total-tasks');
  const dueTodayEl = document.getElementById('metric-due-today');
  const submittedEl = document.getElementById('metric-submitted-tasks');

  if (backendSummary) {
    if (totalEl) totalEl.textContent = backendSummary.total_assignments ?? allAssignments.length;
    if (dueTodayEl) dueTodayEl.textContent = backendSummary.due_soon ?? 0;
    if (submittedEl) {
      const done = allAssignments.filter((a) => ['completed', 'submitted', 'done'].includes((a.status || '').toLowerCase())).length;
      submittedEl.textContent = Math.max(0, (backendSummary.total_assignments ?? allAssignments.length) - (backendSummary.due_soon ?? 0) - (backendSummary.overdue ?? 0)) || done;
    }
    return;
  }

  let totalCount = allAssignments.length;
  let submittedCount = 0;
  let dueTodayCount = 0;
  const now = new Date();

  allAssignments.forEach((a) => {
    const st = (a.status || '').toLowerCase();
    const isDone = ['completed', 'submitted', 'done'].includes(st);
    if (isDone) {
      submittedCount++;
    } else {
      if (a.dueDate) {
        const isToday = a.dueDate.getFullYear() === now.getFullYear() &&
                        a.dueDate.getMonth() === now.getMonth() &&
                        a.dueDate.getDate() === now.getDate();
        if (isToday) dueTodayCount++;
      }
    }
  });

  if (totalEl) totalEl.textContent = totalCount;
  if (dueTodayEl) dueTodayEl.textContent = dueTodayCount;
  if (submittedEl) submittedEl.textContent = submittedCount;
}

function renderCourseProgress() {
  const container = document.getElementById('courses-progress-container');
  if (!container) return;

  let courseMap = new Map();

  allAssignments.forEach((a) => {
    const rawName = (a.course || '').trim();
    const courseName = rawName.startsWith('วิชา') ? rawName : `วิชา ${rawName}`;
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, {
        name: courseName,
        totalTasks: 0,
        completedTasks: 0,
      });
    }
    const item = courseMap.get(courseName);
    item.totalTasks++;
    if (['completed', 'submitted', 'done'].includes((a.status || '').toLowerCase())) {
      item.completedTasks++;
    }
  });

  let courseList = [];

  if (courseMap.size > 0) {
    courseList = Array.from(courseMap.values()).map((c) => ({
      ...c,
      percentage: c.totalTasks > 0 ? Math.round((c.completedTasks / c.totalTasks) * 100) : 0,
    }));
  } else {
    courseList = [...DEFAULT_MOCKUP_COURSES];
  }

  if (currentSearchTerm) {
    courseList = courseList.filter((c) => c.name.toLowerCase().includes(currentSearchTerm));
  }

  if (currentSortOrder === 'asc') {
    courseList.sort((a, b) => a.percentage - b.percentage);
  } else if (currentSortOrder === 'desc') {
    courseList.sort((a, b) => b.percentage - a.percentage);
  }

  if (courseList.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-400">
        <p class="text-sm font-medium">ไม่พบรายวิชาที่ตรงกับคำค้นหา "${escapeHtml(currentSearchTerm)}"</p>
      </div>
    `;
    return;
  }

  container.innerHTML = courseList
    .map((c) => {
      const fractionText = `${c.completedTasks} / ${c.totalTasks} งาน เสร็จสิ้น`;
      const fillWidth = Math.max(8, Math.min(100, c.percentage));

      return `
        <article class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800">
            <span class="tracking-tight">${escapeHtml(c.name)}</span>
            <span class="text-slate-600 font-medium">${fractionText}</span>
          </div>

          <div class="progress-track w-full">
            <div 
              class="progress-fill" 
              style="width: ${fillWidth}%;"
              role="progressbar" 
              aria-valuenow="${c.percentage}" 
              aria-valuemin="0" 
              aria-valuemax="100"
            >
              <span class="progress-label">${c.percentage} %</span>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderConnectionsSidebar(connections) {
  const container = document.getElementById('connection-list');
  if (!container) return;

  const platforms = [
    { key: 'google', name: 'Google Classroom', icon: '🎨' },
    { key: 'microsoft', name: 'Microsoft Teams', icon: '💼' },
  ];

  container.innerHTML = platforms
    .map((p) => {
      const isConnected = Boolean(connections[p.key]);
      return `
        <div class="connection-item">
          <span class="flex items-center gap-1.5 font-medium text-slate-700">
            <span>${p.icon}</span> ${escapeHtml(p.name)}
          </span>
          <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isConnected
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-500'
          }">
            ${isConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
          </span>
        </div>
      `;
    })
    .join('');
}

function renderAssignmentsFeed() {
  const container = document.getElementById('assignment-list');
  if (!container) return;

  const platformFilter = document.getElementById('filter-platform')?.value || 'all';
  const statusFilter = document.getElementById('filter-status')?.value || 'all';
  const sortBy = document.getElementById('sort-by')?.value || 'due';

  let filtered = [...allAssignments];

  if (currentSearchTerm) {
    filtered = filtered.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(currentSearchTerm) ||
        (a.course || '').toLowerCase().includes(currentSearchTerm)
    );
  }

  if (platformFilter !== 'all') {
    filtered = filtered.filter((a) => (a.platform || 'custom').toLowerCase() === platformFilter);
  }

  if (statusFilter === 'pending') {
    filtered = filtered.filter(
      (a) => !['completed', 'submitted', 'done'].includes((a.status || '').toLowerCase())
    );
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter((a) =>
      ['completed', 'submitted', 'done'].includes((a.status || '').toLowerCase())
    );
  }

  if (sortBy === 'title') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'th'));
  } else {
    // Sort by real date value, null due dates go last
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <p class="text-sm font-medium">ไม่พบรายการงานที่ตรงกับเงื่อนไข</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const isCompleted = ['completed', 'submitted', 'done'].includes((item.status || '').toLowerCase());
      const platform = item.platform || 'custom';
      const platformBadge =
        platform === 'google'
          ? '<span class="text-blue-600 font-semibold">Google Classroom</span>'
          : platform === 'microsoft'
          ? '<span class="text-sky-600 font-semibold">Microsoft Teams</span>'
          : `<span class="text-purple-600 font-semibold">${escapeHtml(item.raw_platform || 'แพลตฟอร์มอื่น')}</span>`;

      const sourceLink = item.source_url
        ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-brand-purple hover:underline font-semibold mt-1">
             เปิดในแพลตฟอร์มต้นทาง ↗
           </a>`
        : '';

      const actionsHtml = FEATURES.customTasks
        ? `<div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
             <button 
               type="button" 
               class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                 isCompleted
                   ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                   : 'bg-brand-lime text-slate-900 hover:bg-brand-lime-hover shadow-sm'
               }"
               data-action="toggle-status" 
               data-id="${escapeHtml(item.id)}" 
               data-current-status="${escapeHtml(item.status)}"
             >
               ${isCompleted ? '↩️ เปลี่ยนเป็นยังไม่เสร็จ' : '✓ ส่งงานแล้ว'}
             </button>
           </div>`
        : `<div class="shrink-0 self-end sm:self-center">
             <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
               isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
             }">
               ${isCompleted ? 'เสร็จสิ้นแล้ว' : 'รอดำเนินการ'}
             </span>
           </div>`;

      return `
        <article class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
          isCompleted
            ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 text-xs text-slate-500">
              ${platformBadge}
              <span>•</span>
              <span class="font-medium truncate">${escapeHtml(item.course)}</span>
            </div>
            <h4 class="text-sm font-semibold text-slate-900 ${
              isCompleted ? 'line-through text-slate-500' : ''
            }">
              ${escapeHtml(item.title)}
            </h4>
            <div class="flex flex-wrap items-center gap-3 mt-1">
              <p class="text-xs text-slate-500">กำหนดส่ง: <strong class="text-slate-700">${escapeHtml(item.due)}</strong></p>
              ${sourceLink}
            </div>
          </div>

          ${actionsHtml}
        </article>
      `;
    })
    .join('');
}

function renderCalendarTimeline() {
  const container = document.getElementById('calendar-timeline-container');
  if (!container) return;

  if (allAssignments.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <p class="text-sm font-medium">ไม่มีรายการงานในกำหนดการ</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allAssignments
    .map((item, idx) => {
      const isCompleted = ['completed', 'submitted', 'done'].includes((item.status || '').toLowerCase());
      const sourceLink = item.source_url
        ? `<a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-brand-purple hover:underline font-semibold block mt-1">
             เปิดในแพลตฟอร์มต้นทาง ↗
           </a>`
        : '';

      return `
        <div class="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 ${
          isCompleted ? 'bg-slate-50' : 'bg-amber-50/50 border-amber-200/50'
        }">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
            isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
          }">
            ${idx + 1}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-slate-800">${escapeHtml(item.title)}</h4>
            <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(item.course)}</p>
            <span class="inline-block mt-2 text-xs font-semibold ${
              isCompleted ? 'text-emerald-600' : 'text-red-600'
            }">
              📅 กำหนดส่ง: ${escapeHtml(item.due)}
            </span>
            ${sourceLink}
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
          }">
            ${isCompleted ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
          </span>
        </div>
      `;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', init);