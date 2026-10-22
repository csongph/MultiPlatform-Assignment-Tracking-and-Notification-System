import { initNavigation } from './navigation.js';

let authModulesPromise = null;
function loadAuthModules() {
  if (!authModulesPromise) {
    authModulesPromise = Promise.all([import('./api.js'), import('./auth.js')])
      .then(([api, auth]) => ({ api, auth }))
      .catch((err) => {
        console.error('Could not load application API modules:', err);
        return null;
      });
  }
  return authModulesPromise;
}

const SOON_HOURS = 48;

const state = {
  items: [],
  reminders: new Map(),
  tab: 'all', // all | pending | overdue | submitted
  course: 'all',
  courseId: null,
  platform: 'all',
  sort: 'due', // due | title
  search: '',
  openId: null,
  reminderTargetId: null,
};

/* ---------------------------------------------------------------- helpers */

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isSubmittedStatus(status) {
  return ['completed', 'submitted', 'done'].includes(String(status || '').toLowerCase());
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDue(date) {
  if (!date) return 'ไม่ระบุกำหนดส่ง';
  const d = date.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const t = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `ภายในวัน${d} เวลา ${t} น.`;
}

function unitLabel(unit) {
  return {
    minute: 'นาที', minutes: 'นาที',
    hour: 'ชั่วโมง', hours: 'ชั่วโมง',
    day: 'วัน', days: 'วัน',
  }[unit] || unit;
}

/** Normalize provider assignment fields into the page model. */
function normalize(raw) {
  const dueDate = raw.dueDate ?? (raw.due_at ? new Date(raw.due_at) : null);
  const validDue = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
  const submitted = isSubmittedStatus(raw.computed_status ?? raw.status);
  const now = new Date();

  let state_ = 'pending';
  if (submitted) state_ = 'submitted';
  else if (validDue && validDue < now) state_ = 'overdue';
  else if (validDue && validDue - now < SOON_HOURS * 3600 * 1000) state_ = 'soon';

  return {
    id: String(raw.id),
    courseId: String(raw.course_id ?? ''),
    platform: (raw.platform === 'google_classroom' ? 'google' : raw.platform === 'microsoft_teams' ? 'microsoft' : raw.platform || 'custom').toLowerCase(),
    course: raw.course_name || raw.course || 'ไม่ระบุวิชา',
    courseCode: raw.courseCode || '',
    title: raw.title || '(ไม่มีชื่องาน)',
    description: raw.description || '',
    todo: [],
    requirements: Array.isArray(raw.requirements) ? raw.requirements : [],
    url: raw.source_url || raw.url || raw.externalUrl || '',
    dueDate: validDue,
    dueToday: !submitted && validDue ? isSameDay(validDue, now) : false,
    submitted,
    status: state_
  };
}

/* ------------------------------------------------------------- data load */

async function loadData() {
  const modules = await loadAuthModules();
  if (!modules) {
    $('task-list').textContent = 'ไม่สามารถโหลด API ของระบบได้';
    return false;
  }
  if (!modules.auth.requireAuth()) return false;
  const [response, rules] = await Promise.all([
    modules.api.getAssignments(),
    modules.api.getNotificationRules(),
  ]);
  state.items = (response?.assignments || []).map(normalize);
  state.reminders = new Map(
    (Array.isArray(rules) ? rules : [])
      .filter((rule) => rule.assignment_id)
      .map((rule) => [String(rule.assignment_id), rule]),
  );
  return true;
}
/* ---------------------------------------------------------------- filter */

function matchesNonTabFilters(item) {
  if (state.courseId && item.courseId !== state.courseId) return false;
  if (state.course !== 'all' && item.course !== state.course) return false;
  if (state.platform !== 'all' && item.platform !== state.platform) return false;
  if (state.search) {
    const q = state.search;
    const hay = `${item.title} ${item.course} ${item.courseCode}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function matchesTab(item) {
  switch (state.tab) {
    case 'pending':
      return !item.submitted && item.status !== 'overdue';
    case 'overdue':
      return item.status === 'overdue';
    case 'submitted':
      return item.submitted;
    default:
      return true;
  }
}

function getVisibleItems() {
  const list = state.items.filter((i) => matchesNonTabFilters(i) && matchesTab(i));

  if (state.sort === 'title') {
    // 'th' collation sorts Thai (ก-ฮ) and Latin (A-Z) correctly
    list.sort((a, b) => a.title.localeCompare(b.title, 'th'));
  } else {
    // soonest first; submitted & no-date items go last
    list.sort((a, b) => {
      if (a.submitted !== b.submitted) return a.submitted ? 1 : -1;
      const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
      const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
      return ad - bd;
    });
  }
  return list;
}

/* ---------------------------------------------------------------- render */

const PLATFORM_META = {
  google: {
    label: 'Google Classroom',
    cls: 'asg-platform-google',
    icon: `<img src="../assets/image/classroom.png" alt="Google Classroom" class="w-6 h-6 object-contain" />`,
  },
  microsoft: {
    label: 'Microsoft Teams',
    cls: 'asg-platform-microsoft',
    icon: `<img src="../assets/image/ms.png" alt="Microsoft Teams" class="w-6 h-6 object-contain" />`,
  },
  custom: {
    label: 'งานที่บันทึกเอง',
    cls: 'asg-platform-custom',
    icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  },
};

const STATUS_META = {
  pending: { text: 'ยังไม่ส่ง', cls: 'asg-badge-pending' },
  soon: { text: 'ใกล้ครบกำหนด', cls: 'asg-badge-soon' },
  overdue: { text: 'เกินกำหนด', cls: 'asg-badge-overdue' },
  submitted: { text: 'ส่งแล้ว', cls: 'asg-badge-submitted' },
};

function renderStats() {
  const base = state.items;
  $('stat-total').textContent = base.length;
  $('stat-today').textContent = base.filter((i) => i.dueToday).length;
  $('stat-overdue').textContent = base.filter((i) => i.status === 'overdue').length;
  $('stat-submitted').textContent = base.filter((i) => i.submitted).length;
}

function renderTabs() {
  const base = state.items.filter(matchesNonTabFilters);
  const counts = {
    all: base.length,
    pending: base.filter((i) => !i.submitted && i.status !== 'overdue').length,
    overdue: base.filter((i) => i.status === 'overdue').length,
    submitted: base.filter((i) => i.submitted).length,
  };
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    const id = btn.dataset.tab;
    btn.classList.toggle('is-active', id === state.tab);
    btn.querySelector('.asg-count').textContent = counts[id];
  });
}

function renderCourseChips() {
  const map = new Map();
  state.items.forEach((i) => {
    if (!map.has(i.course)) map.set(i.course, { name: i.course, code: i.courseCode, pending: 0, total: 0 });
    const c = map.get(i.course);
    c.total++;
    if (!i.submitted) c.pending++;
  });

  const chips = [
    `<button type="button" class="asg-course-chip ${state.course === 'all' ? 'is-active' : ''}" data-course="all">
       <div class="font-semibold text-slate-800">ทุกวิชา</div>
       <div class="text-slate-500">${state.items.length} งาน</div>
     </button>`,
    ...[...map.values()].map(
      (c) => `
      <button type="button" class="asg-course-chip ${state.course === c.name ? 'is-active' : ''}" data-course="${escapeHtml(c.name)}">
        <div class="font-semibold text-slate-800 max-w-[220px] truncate">${escapeHtml(c.name)}</div>
        <div class="text-slate-500">${c.code ? escapeHtml(c.code) + ' · ' : ''}${
        c.pending > 0 ? `ค้าง ${c.pending} งาน` : 'ส่งครบแล้ว'
      }</div>
      </button>`
    ),
  ];
  $('course-chips').innerHTML = chips.join('');
}

function renderCard(item) {
  const meta = PLATFORM_META[item.platform] || PLATFORM_META.custom;
  const st = STATUS_META[item.status];
  const rule = state.reminders.get(item.id);
  const rem = rule?.is_enabled ? rule : null;
  const isOpen = state.openId === item.id;

  const todoHtml = item.todo.length
    ? `<div class="mt-4">
         <p class="text-xs font-semibold text-slate-700 mb-1">สิ่งที่โปรแกรมต้องทำ</p>
         <ol class="list-decimal ml-5 text-xs text-slate-600 space-y-0.5">${item.todo
           .map((t) => `<li>${escapeHtml(t)}</li>`)
           .join('')}</ol>
       </div>`
    : '';

  const reqHtml = item.requirements.length
    ? `<div class="mt-4">
         <p class="text-xs font-semibold text-slate-700 mb-1">สิ่งที่ต้องส่ง</p>
         <ol class="list-decimal ml-5 text-xs text-slate-600 space-y-0.5">${item.requirements
           .map((t) => `<li>${escapeHtml(t)}</li>`)
           .join('')}</ol>
       </div>`
    : '';

  const submitLabel = item.url ? `เปิดส่งงานใน ${meta.label} ↗` : 'ไม่มีลิงก์ต้นทาง';

  return `
  <article class="asg-card ${isOpen ? 'is-open' : ''}" data-id="${escapeHtml(item.id)}">
    <button type="button" class="asg-card-header" data-toggle="${escapeHtml(item.id)}" aria-expanded="${isOpen}">
      <div class="asg-platform ${meta.cls}" title="${meta.label}">${meta.icon}</div>
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-slate-900"><strong>วิชา</strong> ${escapeHtml(item.course)}</span>
          <span class="asg-badge ${st.cls}">${st.text}</span>
          ${rem ? `<span class="text-[11px] text-slate-500">🔔 ก่อน ${rem.lead_time_value} ${unitLabel(rem.lead_time_unit)}</span>` : ''}
        </div>
        <p class="text-sm font-medium text-slate-800 mt-1">${escapeHtml(item.title)}</p>
        <p class="text-xs text-slate-500 mt-1">📅 ${escapeHtml(formatDue(item.dueDate))}</p>
      </div>
      <svg class="asg-chevron w-5 h-5 text-slate-400 shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <div class="asg-card-body">
      <p class="text-xs text-slate-600 mt-4 leading-relaxed">${escapeHtml(item.description) || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
      ${todoHtml}
      ${reqHtml}
      <div class="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button type="button" class="asg-btn" data-remind="${escapeHtml(item.id)}">🔔 ${rule ? 'แก้ไขแจ้งเตือน' : 'แจ้งเตือน'}</button>
        <button type="button" class="asg-btn asg-btn-primary" data-open-url="${escapeHtml(item.id)}" ${item.url ? '' : 'disabled'}>${submitLabel}</button>
      </div>
      ${rem ? '' : '<p class="text-[11px] text-slate-400 text-center mt-2">ผู้เรียนยังไม่ได้ตั้งค่าการแจ้งเตือน</p>'}
    </div>
  </article>`;
}

function renderList() {
  const items = getVisibleItems();
  const container = $('task-list');

  if (items.length === 0) {
    const noData = state.items.length === 0;
    container.innerHTML = `
      <div class="py-14 text-center text-slate-400">
        <div class="text-4xl mb-2">${noData ? '📭' : '🔍'}</div>
        <p class="text-sm font-medium">${noData ? 'ยังไม่มีงานที่ได้รับมอบหมาย' : 'ไม่พบงานที่ตรงกับเงื่อนไข'}</p>
        ${noData ? '' : '<button type="button" id="reset-filters" class="mt-3 text-xs text-brand-purple font-semibold hover:underline">ล้างตัวกรองทั้งหมด</button>'}
      </div>`;
    return;
  }
  container.innerHTML = items.map(renderCard).join('');
}

function renderAll() {
  renderStats();
  renderTabs();
  renderCourseChips();
  renderList();
}

/* ---------------------------------------------------------------- events */

function resetFilters() {
  state.tab = 'all';
  state.course = 'all';
  state.courseId = null;
  state.platform = 'all';
  state.search = '';
  if ($('search-input')) $('search-input').value = '';
  $('filter-platform').value = 'all';
  window.history.replaceState({}, '', window.location.pathname);
  renderAll();
}

function bindEvents() {
  $('search-input')?.addEventListener('input', (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderTabs();
    renderList();
  });

  window.addEventListener('kmaps-search', (event) => {
    const query = (event.detail?.query || '').trim().toLowerCase();
    state.search = query;
    if ($('search-input')) $('search-input').value = query;
    renderTabs();
    renderList();
  });

  $('filter-platform').addEventListener('change', (e) => {
    state.platform = e.target.value;
    renderAll();
  });

  $('sort-by').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
  });

  $('tab-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    state.tab = btn.dataset.tab;
    renderTabs();
    renderList();
  });

  $('course-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-course]');
    if (!chip) return;
    state.course = chip.dataset.course;
    state.courseId = null;
    renderAll();
  });

  $('task-list').addEventListener('click', (e) => {
    if (e.target.closest('#reset-filters')) return resetFilters();

    const remindBtn = e.target.closest('[data-remind]');
    if (remindBtn) return openReminderModal(remindBtn.dataset.remind);

    const urlBtn = e.target.closest('[data-open-url]');
    if (urlBtn) {
      const item = state.items.find((i) => i.id === urlBtn.dataset.openUrl);
      if (item?.url) window.open(item.url, '_blank', 'noopener');
      return;
    }

    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const id = toggle.dataset.toggle;
      state.openId = state.openId === id ? null : id;
      renderList();
    }
  });

  bindReminderModal();
}

/* -------------------------------------------------------- reminder modal */

function openReminderModal(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  state.reminderTargetId = id;

  const rem = state.reminders.get(id);
  $('reminder-task-title').textContent = item.title;
  $('reminder-value').value = rem?.lead_time_value ?? 1;
  $('reminder-unit').value = ({ minute: 'minutes', hour: 'hours', day: 'days' })[rem?.lead_time_unit] ?? 'days';
  $('reminder-remove').classList.toggle('hidden', !rem?.is_enabled);
  $('reminder-error').classList.add('hidden');
  $('reminder-error').textContent = '';
  $('reminder-modal').classList.add('is-open');
  $('reminder-value').focus();
}

function closeReminderModal() {
  $('reminder-modal').classList.remove('is-open');
  state.reminderTargetId = null;
}

function bindReminderModal() {
  $('reminder-cancel').addEventListener('click', closeReminderModal);
  $('reminder-modal').addEventListener('click', (e) => {
    if (e.target === $('reminder-modal')) closeReminderModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeReminderModal();
  });

  $('reminder-save').addEventListener('click', async () => {
    const saveButton = $('reminder-save');
    const value = Number($('reminder-value').value);
    const unit = ({ minutes: 'minute', hours: 'hour', days: 'day' })[$('reminder-unit').value];
    if (!Number.isInteger(value) || value < 1 || value > 30 || !unit) {
      $('reminder-error').textContent = 'กรุณากรอกจำนวนเต็มตั้งแต่ 1 ถึง 30';
      $('reminder-error').classList.remove('hidden');
      return;
    }
    const modules = await loadAuthModules();
    if (!modules) return;
    saveButton.disabled = true;
    try {
      const existing = state.reminders.get(state.reminderTargetId);
      const payload = { lead_time_value: value, lead_time_unit: unit, is_enabled: true };
      const saved = existing
        ? await modules.api.updateNotificationRule(existing.id, payload)
        : await modules.api.createNotificationRule({
            ...payload, type: 'due_soon', assignment_id: state.reminderTargetId, sequence_order: 1,
          });
      state.reminders.set(String(saved.assignment_id), saved);
      closeReminderModal();
      renderList();
    } catch (error) {
      $('reminder-error').textContent = error?.message || 'บันทึกการแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง';
      $('reminder-error').classList.remove('hidden');
    } finally {
      saveButton.disabled = false;
    }
  });

  $('reminder-remove').addEventListener('click', async () => {
    const rule = state.reminders.get(state.reminderTargetId);
    if (!rule) return closeReminderModal();
    const removeButton = $('reminder-remove');
    removeButton.disabled = true;
    try {
      const modules = await loadAuthModules();
      if (!modules) return;
      const saved = await modules.api.updateNotificationRule(rule.id, { is_enabled: false });
      state.reminders.set(String(saved.assignment_id), saved);
      closeReminderModal();
      renderList();
    } catch (error) {
      $('reminder-error').textContent = error?.message || 'ปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง';
      $('reminder-error').classList.remove('hidden');
    } finally {
      removeButton.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ init */

async function init() {
  const params = new URLSearchParams(window.location.search);
  state.courseId = params.get('course_id') || null;
  state.course = params.get('course') || 'all';
  const modules = await loadAuthModules();
  if (!modules) {
    $('task-list').textContent = 'ไม่สามารถโหลด API ของระบบได้';
    return;
  }
  if (!modules.auth.requireAuth()) return;

  // Mount the shared shell before loading page data so navigation remains
  // available when the assignments API is temporarily unavailable.
  initNavigation('assignments');

  let ok = false;
  try {
    ok = await loadData();
  } catch (error) {
    const list = $('task-list');
    if (list) list.textContent = error.message || 'ไม่สามารถโหลดรายการงานจากระบบได้';
    return;
  }
  if (!ok) return;

  const developerBanner = $('dev-banner');
  if (developerBanner) developerBanner.classList.add('hidden');
  bindEvents();
  renderAll();
  window.addEventListener('kmaps:sync-complete', async () => {
    try {
      await loadData();
      renderAll();
    } catch (error) {
      $('task-list').textContent = error.message || 'โหลดรายการงานไม่สำเร็จ';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
