/**
 * KMAPS Dashboard Controller
 * Dashboard overview, assignments, platform connections, and sync
 */

import {
  getAssignments,
  getDashboardSummary,
  getOnboardingStatus,
  getCurrentUser,
  queueSync,
  getSyncJob,
  updateAssignmentStatus,
  createAssignment,
  deleteAssignment,
  FEATURES,
} from './api.js';

import { requireAuth, getSignedInUser, logout } from './auth.js';

import {
  setUserProfile,
} from './storage.js';

import {
  showToast,
  setButtonLoading,
  escapeHtml,
} from './ui.js';

import {
  initSidebar,
  setActiveNavItem,
  updateSidebarAdminStatus,
} from './sidebar.js';

// Dashboard state
let allAssignments = [];
let connectionsState = {};
let currentSortOrder = 'default';
let currentSearchTerm = '';
let isSyncing = false;

const COMPLETED_STATUSES = ['completed', 'submitted', 'done'];



async function init() {
  if (!requireAuth()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab =
    urlParams.get('view') ||
    window.location.hash.replace('#', '') ||
    'overview';

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
  const views = {
    overview: document.getElementById('view-overview'),
    assignments: document.getElementById('view-assignments'),
    calendar: document.getElementById('view-calendar'),
  };

  if (!views[tabId]) return;

  Object.entries(views).forEach(([id, view]) => {
    if (view) {
      view.classList.toggle('hidden', id !== tabId);
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

  window.addEventListener('kmaps:tabchange', (event) => {
    if (event.detail?.tabId) {
      switchViewTab(event.detail.tabId);
    }
  });
}

function setupHeaderEvents() {
  document.getElementById('logout-button')?.addEventListener('click', logout);

  const searchInput = document.getElementById('search-course-input');

  searchInput?.addEventListener('input', (event) => {
    currentSearchTerm = event.target.value.trim().toLowerCase();
    renderCourseProgress();
    renderAssignmentsFeed();
  });

  // Support search events emitted by the shared topbar.
  window.addEventListener('kmaps-search', (event) => {
    currentSearchTerm = (event.detail?.query || '').trim().toLowerCase();

    if (searchInput && searchInput.value !== event.detail?.query) {
      searchInput.value = event.detail?.query || '';
    }

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

function setupFilterAndSortEvents() {
  document
    .getElementById('filter-platform')
    ?.addEventListener('change', renderAssignmentsFeed);

  document
    .getElementById('filter-status')
    ?.addEventListener('change', renderAssignmentsFeed);

  document
    .getElementById('sort-by')
    ?.addEventListener('change', renderAssignmentsFeed);
}

function setupSyncButton() {
  document
    .getElementById('sync-now-button')
    ?.addEventListener('click', async () => {
      if (isSyncing) return;
      await triggerManualSync();
    });
}

async function triggerManualSync() {
  const syncButton = document.getElementById('sync-now-button');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');

  isSyncing = true;

  if (syncButton) syncButton.disabled = true;
  if (syncIcon) syncIcon.classList.add('spin-animate');
  if (syncText) syncText.textContent = 'กำลังซิงก์...';

  try {
    const platforms = [
      ...(connectionsState.google ? ['google_classroom'] : []),
      ...(connectionsState.microsoft ? ['microsoft_teams'] : []),
    ];
    if (!platforms.length) {
      await finishSync(false, 'ยังไม่มีแพลตฟอร์มที่เชื่อมต่อ กรุณาเชื่อมต่อก่อนซิงก์');
      return;
    }
    showToast('กำลังซิงก์ข้อมูลงานจากแพลตฟอร์ม...', 'info');
    const jobs = await Promise.all(platforms.map((platform) => queueSync(platform)));
    const jobIds = jobs.map((job) => job?.job_id).filter(Boolean);
    if (jobIds.length !== platforms.length) throw new Error('ระบบไม่สามารถเริ่มงานซิงก์ได้ครบทุกแพลตฟอร์ม');

    const deadline = Date.now() + 60000;
    let statuses = [];
    do {
      statuses = await Promise.all(jobIds.map((jobId) => getSyncJob(jobId)));
      if (statuses.every((item) => ['success', 'succeeded', 'completed', 'failed', 'error'].includes((item.status || '').toLowerCase()))) break;
      if (Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 2500));
    } while (Date.now() < deadline);

    const failed = statuses.find((item) => ['failed', 'error'].includes((item.status || '').toLowerCase()));
    if (failed) {
      const detail = failed.error_detail?.error || failed.error_detail?.reason;
      await finishSync(false, detail || 'การซิงก์ล้มเหลว กรุณาตรวจสอบสิทธิ์การเชื่อมต่อแล้วลองใหม่');
    } else if (Date.now() >= deadline && !statuses.every((item) => ['success', 'succeeded', 'completed'].includes((item.status || '').toLowerCase()))) {
      await finishSync(true, 'การซิงก์ยังทำงานอยู่เบื้องหลัง');
    } else {
      const totalItems = statuses.reduce((total, item) => total + (item.items_synced || 0), 0);
      await finishSync(true, `ซิงก์สำเร็จ! อัปเดตงาน ${totalItems} รายการ`);
    }
  } catch (error) {
    await finishSync(
      false,
      error.message || 'ไม่สามารถเริ่มการซิงก์ได้',
    );
  }
}

async function finishSync(isSuccess, message) {
  isSyncing = false;

  const syncButton = document.getElementById('sync-now-button');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');

  if (syncButton) syncButton.disabled = false;
  syncIcon?.classList.remove('spin-animate');

  if (syncText) syncText.textContent = 'ซิงก์ตอนนี้';

  showToast(message, isSuccess ? 'success' : 'error');

  if (isSuccess) {
    await loadDashboardData();
  }
}

async function loadUserData() {
  try {
    let user;

    try {
      user = await getCurrentUser();

      if (user) {
        setUserProfile(user);
      }
    } catch {
      user = await getSignedInUser();
    }

    if (!user) return;

    const nameElement = document.getElementById('user-display-name');
    const roleElement = document.getElementById('user-role-badge');
    const titleElement = document.getElementById('dashboard-title');

    const displayName =
      user.full_name || user.display_name || user.email || 'ผู้ใช้งาน';

    if (nameElement) {
      nameElement.textContent = displayName;
    }

    if (roleElement) {
      roleElement.textContent =
        user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักเรียน';
    }

    if (titleElement) {
      titleElement.textContent = `Welcome back, ${displayName}`;
    }

    if (user.role === 'admin') {
      updateSidebarAdminStatus(true);
      addAdminConsoleLink();
    }
  } catch (error) {
    console.warn('Could not load user profile:', error);
  }
}

function addAdminConsoleLink() {
  if (document.getElementById('admin-console-link')) return;

  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;

  const adminButton = document.createElement('a');
  adminButton.id = 'admin-console-link';
  adminButton.className = 'btn btn-secondary app-link-button';
  adminButton.href = 'admin.html';
  adminButton.style.color = '#2563eb';
  adminButton.style.fontWeight = '700';
  adminButton.textContent = '⚙️ Admin Console';

  headerActions.insertBefore(adminButton, headerActions.firstChild);
}

function setupCustomTaskForm() {
  const form = document.getElementById('create-assignment-form');
  if (!form) return;

  // Custom tasks are disabled until the API supports them.
  if (!FEATURES.customTasks) {
    const formCard = form.closest('div');
    if (formCard) formCard.style.display = 'none';

    const customOption = document.querySelector(
      '#filter-platform option[value="custom"]',
    );

    if (customOption) customOption.style.display = 'none';
    return;
  }

  form.addEventListener('submit', handleCreateAssignment);
}

async function loadDashboardData() {
  try {
    const status = await getOnboardingStatus();
    connectionsState = normalizeConnections(status?.connections || {});
    renderConnectionsSidebar(connectionsState);
  } catch (error) {
    console.warn('Failed to load platform connections:', error);
    connectionsState = {};
    renderConnectionsSidebar(connectionsState);
    showToast(error.message || 'ไม่สามารถโหลดสถานะการเชื่อมต่อได้', 'error');
  }

  const [assignmentsResult, summaryResult] = await Promise.allSettled([
    getAssignments(),
    getDashboardSummary(),
  ]);

  if (assignmentsResult.status === 'fulfilled') {
    const result = assignmentsResult.value;

    allAssignments = Array.isArray(result?.assignments)
      ? result.assignments
      : Array.isArray(result)
        ? result
        : [];
  } else {
    console.warn('Failed to load assignments:', assignmentsResult.reason);
    allAssignments = [];
    showToast(assignmentsResult.reason?.message || 'ไม่สามารถโหลดรายการงานได้', 'error');
  }

  const summary =
    summaryResult.status === 'fulfilled'
      ? summaryResult.value
      : null;

  if (summaryResult.status === 'rejected') {
    console.warn('Failed to load dashboard summary:', summaryResult.reason);
  }

  updateMetrics(summary);
  renderCourseProgress();
  renderAssignmentsFeed();
  renderCalendarTimeline();
}

function normalizeConnections(connections) {
  return {
    google: Boolean(
      connections.google ?? connections.google_classroom,
    ),
    microsoft: Boolean(
      connections.microsoft ?? connections.microsoft_teams,
    ),
  };
}

function updateMetrics(summary = null) {
  const totalElement = document.getElementById('metric-total-tasks');
  const dueTodayElement = document.getElementById('metric-due-today');
  const submittedElement = document.getElementById('metric-submitted-tasks');

  const completedCount = allAssignments.filter((assignment) =>
    COMPLETED_STATUSES.includes(
      (assignment.computed_status || assignment.status || '').toLowerCase(),
    ),
  ).length;

  if (totalElement) {
    totalElement.textContent =
      summary?.total_assignments ?? allAssignments.length;
  }

  if (dueTodayElement) {
    if (summary?.due_today != null) {
      dueTodayElement.textContent = summary.due_today;
    } else if (summary?.due_soon != null) {
      dueTodayElement.textContent = summary.due_soon;
    } else {
      const now = new Date();

      dueTodayElement.textContent = allAssignments.filter((assignment) => {
        if (!assignment.dueDate) return false;

        const dueDate = new Date(assignment.dueDate);
        const isValidDate = !Number.isNaN(dueDate.getTime());
        const isToday =
          isValidDate &&
          dueDate.getFullYear() === now.getFullYear() &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getDate() === now.getDate();

        const isIncomplete = !COMPLETED_STATUSES.includes(
          (assignment.computed_status || assignment.status || '').toLowerCase(),
        );

        return isToday && isIncomplete;
      }).length;
    }
  }

  if (submittedElement) {
    submittedElement.textContent =
      summary?.submitted_assignments ?? completedCount;
  }
}

function renderCourseProgress() {
  const container = document.getElementById('courses-progress-container');
  if (!container) return;

  const courseMap = new Map();

  allAssignments.forEach((assignment) => {
    const rawName = (assignment.course || '').trim();
    if (!rawName) return;

    const name = rawName.startsWith('วิชา')
      ? rawName
      : `วิชา ${rawName}`;

    if (!courseMap.has(name)) {
      courseMap.set(name, {
        name,
        totalTasks: 0,
        completedTasks: 0,
      });
    }

    const course = courseMap.get(name);
    course.totalTasks += 1;

    if (
      COMPLETED_STATUSES.includes(
        (assignment.computed_status || assignment.status || '').toLowerCase(),
      )
    ) {
      course.completedTasks += 1;
    }
  });

  let courses = Array.from(courseMap.values()).map((course) => ({ ...course, percentage: course.totalTasks ? Math.round((course.completedTasks / course.totalTasks) * 100) : 0 }));

  if (currentSearchTerm) {
    courses = courses.filter((course) =>
      course.name.toLowerCase().includes(currentSearchTerm),
    );
  }

  if (currentSortOrder === 'asc') {
    courses.sort((a, b) => a.percentage - b.percentage);
  } else if (currentSortOrder === 'desc') {
    courses.sort((a, b) => b.percentage - a.percentage);
  }

  if (!courses.length) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-400">
        <p class="text-sm font-medium">
          ไม่พบรายวิชาที่ตรงกับคำค้นหา "${escapeHtml(currentSearchTerm)}"
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = courses.map((course) => {
    const percentage = Math.max(
      0,
      Math.min(100, course.percentage),
    );

    return `
      <article class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800">
          <span class="tracking-tight">${escapeHtml(course.name)}</span>
          <span class="text-slate-600 font-medium">
            ${course.completedTasks} / ${course.totalTasks} งานเสร็จสิ้น
          </span>
        </div>

        <div class="progress-track w-full">
          <div
            class="progress-fill"
            style="width: ${percentage}%;"
            role="progressbar"
            aria-valuenow="${percentage}"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span class="progress-label">${percentage}%</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderConnectionsSidebar(connections) {
  const container = document.getElementById('connection-list');
  if (!container) return;

  const platforms = [
    { key: 'google', name: 'Google Classroom', icon: '🎨' },
    { key: 'microsoft', name: 'Microsoft Teams', icon: '💼' },
  ];

  container.innerHTML = platforms.map((platform) => {
    const connected = Boolean(connections[platform.key]);

    return `
      <div class="connection-item flex items-center justify-between gap-2 py-2">
        <span class="flex items-center gap-1.5 font-medium text-slate-700">
          <span>${platform.icon}</span>
          ${escapeHtml(platform.name)}
        </span>

        <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${
          connected
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-slate-100 text-slate-500'
        }">
          ${connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
        </span>
      </div>
    `;
  }).join('');
}

function renderAssignmentsFeed() {
  const container = document.getElementById('assignment-list');
  if (!container) return;

  const platformFilter =
    document.getElementById('filter-platform')?.value || 'all';

  const statusFilter =
    document.getElementById('filter-status')?.value || 'all';

  const sortBy =
    document.getElementById('sort-by')?.value || 'due';

  let filtered = [...allAssignments];

  if (currentSearchTerm) {
    filtered = filtered.filter((assignment) =>
      (assignment.title || '').toLowerCase().includes(currentSearchTerm) ||
      (assignment.course || '').toLowerCase().includes(currentSearchTerm),
    );
  }

  if (platformFilter !== 'all') {
    filtered = filtered.filter(
      (assignment) =>
        normalizePlatform(assignment.platform) === platformFilter,
    );
  }

  if (statusFilter === 'pending') {
    filtered = filtered.filter(
      (assignment) =>
        !COMPLETED_STATUSES.includes(
          (assignment.computed_status || assignment.status || '').toLowerCase(),
        ),
    );
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter((assignment) =>
      COMPLETED_STATUSES.includes(
        (assignment.computed_status || assignment.status || '').toLowerCase(),
      ),
    );
  }

  if (sortBy === 'title') {
    filtered.sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'th'),
    );
  } else {
    filtered.sort((a, b) => {
      const dateA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Infinity;

      const dateB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Infinity;

      return dateA - dateB;
    });
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <p class="text-sm font-medium">
          ไม่พบรายการงานที่ตรงกับเงื่อนไข
        </p>
        <p class="mt-1 text-xs">
          ลองเปลี่ยนคำค้นหาหรือตัวกรอง
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(renderAssignmentCard).join('');

  container
    .querySelectorAll('[data-action="toggle-status"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        handleToggleStatus(
          button.dataset.id,
          button.dataset.currentStatus,
        );
      });
    });

  container
    .querySelectorAll('[data-action="delete-task"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        handleDeleteTask(button.dataset.id);
      });
    });
}

function renderAssignmentCard(item) {
  const completed = COMPLETED_STATUSES.includes(
    (item.status || '').toLowerCase(),
  );

  const platform = normalizePlatform(item.platform);

  const platformBadge =
    platform === 'google'
      ? '<span class="text-blue-600 font-semibold">Google Classroom</span>'
      : platform === 'microsoft'
        ? '<span class="text-sky-600 font-semibold">Microsoft Teams</span>'
        : `<span class="text-purple-600 font-semibold">${escapeHtml(item.raw_platform || 'งานที่เพิ่มเอง')}</span>`;

  const sourceLink = isSafeHttpUrl(item.source_url)
    ? `
      <a
        href="${escapeHtml(item.source_url)}"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs text-brand-purple hover:underline font-semibold mt-1"
      >
        เปิดในแพลตฟอร์มต้นทาง ↗
      </a>
    `
    : '';

  const actions = FEATURES.customTasks
    ? `
      <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            completed
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-brand-lime text-slate-900 hover:bg-brand-lime-hover shadow-sm'
          }"
          data-action="toggle-status"
          data-id="${escapeHtml(item.id)}"
          data-current-status="${escapeHtml(item.status)}"
        >
          ${completed ? '↩️ เปลี่ยนเป็นยังไม่เสร็จ' : '✓ ส่งงานแล้ว'}
        </button>

        ${
          platform === 'custom'
            ? `
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                data-action="delete-task"
                data-id="${escapeHtml(item.id)}"
              >
                ลบ
              </button>
            `
            : ''
        }
      </div>
    `
    : `
      <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
        completed
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-800'
      }">
        ${completed ? 'เสร็จสิ้นแล้ว' : 'รอดำเนินการ'}
      </span>
    `;

  return `
    <article class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
      completed
        ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
    }">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 text-xs text-slate-500">
          ${platformBadge}
          <span>•</span>
          <span class="font-medium truncate">${escapeHtml(item.course || 'ไม่ระบุรายวิชา')}</span>
        </div>

        <h4 class="text-sm font-semibold text-slate-900 ${
          completed ? 'line-through text-slate-500' : ''
        }">
          ${escapeHtml(item.title || 'ไม่มีชื่อรายการงาน')}
        </h4>

        <div class="flex flex-wrap items-center gap-3 mt-1">
          <p class="text-xs text-slate-500">
            กำหนดส่ง:
            <strong class="text-slate-700">
              ${escapeHtml(item.due || formatDueDate(item.dueDate))}
            </strong>
          </p>
          ${sourceLink}
        </div>
      </div>

      ${actions}
    </article>
  `;
}

async function handleToggleStatus(id, currentStatus) {
  if (!id) {
    showToast('ไม่พบรหัสรายการงาน', 'error');
    return;
  }

  const isCompleted = COMPLETED_STATUSES.includes(
    (currentStatus || '').toLowerCase(),
  );

  const nextStatus = isCompleted ? 'Not started' : 'Completed';

  try {
    await updateAssignmentStatus(id, nextStatus);

    showToast('อัปเดตสถานะงานเรียบร้อยแล้ว', 'success');
    await loadDashboardData();
  } catch (error) {
    showToast(
      error.message || 'ไม่สามารถอัปเดตสถานะงานได้',
      'error',
    );
  }
}

async function handleCreateAssignment(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  const title = form.elements.title?.value.trim();
  const course = form.elements.course?.value.trim();
  const due = form.elements.due?.value.trim();

  if (!title || !course || !due) {
    showToast('กรุณากรอกข้อมูลงานให้ครบทุกช่อง', 'warning');
    return;
  }

  setButtonLoading(submitButton, true, 'กำลังเพิ่ม...');

  try {
    await createAssignment({ title, course, due });

    form.reset();
    showToast('เพิ่มงานเรียบร้อยแล้ว', 'success');

    await loadDashboardData();
  } catch (error) {
    showToast(
      error.message || 'ไม่สามารถเพิ่มงานได้',
      'error',
    );
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function handleDeleteTask(id) {
  if (!id) return;

  if (!window.confirm('ต้องการลบงานนี้ใช่หรือไม่?')) return;

  try {
    await deleteAssignment(id);

    showToast('ลบงานเรียบร้อยแล้ว', 'success');
    await loadDashboardData();
  } catch (error) {
    showToast(
      error.message || 'ไม่สามารถลบงานได้',
      'error',
    );
  }
}

function renderCalendarTimeline() {
  const container = document.getElementById('calendar-timeline-container');
  if (!container) return;

  if (!allAssignments.length) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <p class="text-sm font-medium">ไม่มีรายการงานในกำหนดการ</p>
      </div>
    `;
    return;
  }

  const sortedAssignments = [...allAssignments].sort((a, b) => {
    const dateA = a.dueDate
      ? new Date(a.dueDate).getTime()
      : Infinity;

    const dateB = b.dueDate
      ? new Date(b.dueDate).getTime()
      : Infinity;

    return dateA - dateB;
  });

  container.innerHTML = sortedAssignments.map((item, index) => {
    const completed = COMPLETED_STATUSES.includes(
      (item.status || '').toLowerCase(),
    );

    const sourceLink = isSafeHttpUrl(item.source_url)
      ? `
        <a
          href="${escapeHtml(item.source_url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-brand-purple hover:underline font-semibold block mt-1"
        >
          เปิดในแพลตฟอร์มต้นทาง ↗
        </a>
      `
      : '';

    return `
      <div class="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 ${
        completed
          ? 'bg-slate-50'
          : 'bg-amber-50/50 border-amber-200/50'
      }">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
          completed
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-red-100 text-red-700'
        }">
          ${index + 1}
        </div>

        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold text-slate-800">
            ${escapeHtml(item.title || 'ไม่มีชื่อรายการงาน')}
          </h4>

          <p class="text-xs text-slate-500 mt-0.5">
            ${escapeHtml(item.course || 'ไม่ระบุรายวิชา')}
          </p>

          <span class="inline-block mt-2 text-xs font-semibold ${
            completed ? 'text-emerald-600' : 'text-red-600'
          }">
            📅 กำหนดส่ง:
            ${escapeHtml(item.due || formatDueDate(item.dueDate))}
          </span>

          ${sourceLink}
        </div>

        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
          completed
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-800'
        }">
          ${completed ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
        </span>
      </div>
    `;
  }).join('');
}

function normalizePlatform(platform) {
  const value = String(platform || 'custom').toLowerCase();

  if (value === 'google_classroom') return 'google';
  if (value === 'microsoft_teams') return 'microsoft';

  return value;
}

function formatDueDate(value) {
  if (!value) return 'ไม่ระบุ';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function isSafeHttpUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', init);
