import { getAnnouncements, getAssignments, getNotificationRules, updatePersonalAssignmentStatus } from './api.js';
import { requireAuth } from './auth.js';
import { initNavigation } from './navigation.js';
import { showToast } from './ui.js';

let assignments = [];
let notificationRules = [];
let selectedAssignmentId = null;
let searchTerm = '';
let reminderLoadError = '';
let platformAlertsLoading = false;

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function dueDate(item) {
  if (!item.due_at) return null;
  const value = new Date(item.due_at);
  return Number.isNaN(value.getTime()) ? null : value;
}

function isSubmitted(item) {
  return Boolean(item.personal_submitted) || item.computed_status === 'submitted';
}

function isOverdue(item) {
  const due = dueDate(item);
  return Boolean(due && due < new Date() && !isSubmitted(item));
}

function applicableReminderRules(assignment) {
  const specific = notificationRules.filter((rule) => String(rule.assignment_id) === String(assignment.id));
  return specific.length
    ? specific
    : notificationRules.filter((rule) => rule.assignment_id == null);
}

function getReminderEvents() {
  const events = [];
  for (const assignment of assignments) {
    const due = dueDate(assignment);
    if (!due || isSubmitted(assignment)) continue;
    for (const rule of applicableReminderRules(assignment)) {
      if (!rule.is_enabled) continue;
      const value = Number(rule.lead_time_value);
      const unitMinutes = { minute: 1, hour: 60, day: 1440 }[rule.lead_time_unit];
      if (!Number.isFinite(value) || !unitMinutes) continue;
      const remindAt = new Date(due.getTime() - value * unitMinutes * 60_000);
      if (!Number.isNaN(remindAt.getTime())) events.push({ assignment, rule, remindAt });
    }
  }
  return events;
}

function matchesSearch(item) {
  return !searchTerm || `${item.title || ''} ${item.course_name || ''}`.toLowerCase().includes(searchTerm);
}

function formatAnnouncementDate(value) {
  if (!value) return 'ไม่ระบุวันที่';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'ไม่ระบุวันที่'
    : date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function platformLogo(platform) {
  if (platform === 'microsoft_teams') {
    return `<svg class="platform-alert-logo" viewBox="0 0 48 48" role="img" aria-label="Microsoft Teams">
      <rect x="25" y="7" width="17" height="14" rx="4" fill="#7B83EB"/>
      <circle cx="35" cy="11" r="2" fill="#fff"/><path d="M31.5 17c.6-2 1.8-3 3.5-3s2.9 1 3.5 3" fill="#fff"/>
      <rect x="7" y="13" width="27" height="27" rx="6" fill="#5059C9"/>
      <path d="M16 20h13v3h-4.8v13h-3.5V23H16z" fill="#fff"/>
      <rect x="3" y="19" width="12" height="15" rx="4" fill="#7B83EB"/>
      <circle cx="9" cy="22.5" r="2" fill="#fff"/><path d="M5.5 30c.5-3 1.7-4.5 3.5-4.5s3 1.5 3.5 4.5" fill="#fff"/>
    </svg>`;
  }
  return `<svg class="platform-alert-logo" viewBox="0 0 48 48" role="img" aria-label="Google Classroom">
    <rect x="5" y="7" width="38" height="34" rx="5" fill="#0F9D58"/>
    <path d="M10 12h28v22H10z" fill="#fff"/>
    <path d="M12 14h24v18H12z" fill="#34A853"/>
    <circle cx="20" cy="20" r="3" fill="#fff"/><circle cx="28" cy="20" r="3" fill="#fff"/>
    <path d="M15.5 29c.4-3.1 2-4.7 4.5-4.7s4.1 1.6 4.5 4.7m-1 0c.4-3.1 2-4.7 4.5-4.7s4.1 1.6 4.5 4.7" fill="#fff"/>
    <path d="M5 36h38v4H5z" fill="#F9AB00"/>
  </svg>`;
}

async function loadPlatformNotifications() {
  const list = $('announcement-list');
  const count = $('platform-alert-count');
  const refresh = $('refresh-platform-alerts');
  if (platformAlertsLoading) return;
  platformAlertsLoading = true;
  refresh.disabled = true;
  refresh.classList.add('is-loading');
  count.textContent = 'กำลังโหลด';
  list.innerHTML = '<div class="platform-alert-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>';
  try {
    const announcements = await getAnnouncements();
    count.textContent = `${announcements.length} รายการ`;
    if (!announcements.length) {
      list.innerHTML = '<div class="platform-alerts-state"><i class="fa-regular fa-bell-slash" aria-hidden="true"></i><strong>ยังไม่พบประกาศจากแพลตฟอร์ม</strong><span>กด “ซิงก์ตอนนี้” เพื่อดึงประกาศล่าสุด หาก Google Classroom ยังไม่แสดง ให้เชื่อมต่อบัญชี Google ใหม่เพื่ออนุญาตสิทธิ์อ่านประกาศ</span></div>';
      return;
    }
    list.innerHTML = announcements.map((item, index) => {
      const platform = item.platform === 'microsoft_teams' ? 'Microsoft Teams' : 'Google Classroom';
      const sourceUrl = safeExternalUrl(item.source_url);
      const isTeams = item.platform === 'microsoft_teams';
      const logo = platformLogo(item.platform);
      const detailsId = `platform-alert-details-${index}`;
      const content = String(item.content || '').trim();
      const preview = content.length > 150 ? `${content.slice(0, 150).trimEnd()}…` : content;
      const detailsContent = content
        ? `<p class="platform-alert-content">${escapeHtml(content)}</p>`
        : '<p class="platform-alert-content platform-alert-no-content">ประกาศนี้ไม่มีรายละเอียดเพิ่มเติม</p>';
      const sourceLink = sourceUrl
        ? `<a class="platform-alert-open-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">เปิดประกาศใน ${escapeHtml(platform)} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`
        : '';
      return `<article class="platform-alert-item">
        <button type="button" class="platform-alert-trigger" data-platform-alert-toggle aria-expanded="false" aria-controls="${detailsId}">
          <span class="platform-alert-icon ${isTeams ? 'is-teams' : 'is-classroom'}">${logo}</span>
          <span class="platform-alert-main">
            <span class="platform-alert-title">${escapeHtml(item.title)}</span>
            ${preview ? `<span class="platform-alert-preview">${escapeHtml(preview)}</span>` : ''}
            <span class="platform-alert-meta"><span class="platform-alert-platform">${escapeHtml(platform)}</span><span class="platform-alert-course">${escapeHtml(item.course_name)}</span></span>
          </span>
          <time class="platform-alert-time">${escapeHtml(formatAnnouncementDate(item.published_at))}</time>
          <span class="platform-alert-chevron"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
        </button>
        <div class="platform-alert-details" id="${detailsId}" hidden>
          ${detailsContent}
          ${sourceLink ? `<div class="platform-alert-actions">${sourceLink}</div>` : ''}
        </div>
      </article>`;
    }).join('');
  } catch (error) {
    console.error('Failed to load platform announcements:', error);
    count.textContent = 'โหลดไม่สำเร็จ';
    list.innerHTML = `<div class="platform-alerts-state"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><strong>ยังโหลดประกาศไม่ได้</strong><span>${escapeHtml(error.message || 'ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง')}</span></div>`;
  } finally {
    platformAlertsLoading = false;
    refresh.disabled = false;
    refresh.classList.remove('is-loading');
  }
}

async function loadCalendarData() {
  const assignmentData = await getAssignments();
  assignments = assignmentData.assignments || [];
  reminderLoadError = '';
  try {
    const rules = await getNotificationRules();
    notificationRules = Array.isArray(rules) ? rules : [];
  } catch (error) {
    notificationRules = [];
    reminderLoadError = error.message || 'โหลดกฎแจ้งเตือนล่วงหน้าไม่สำเร็จ';
    showToast(error.message || 'โหลดกฎแจ้งเตือนล่วงหน้าไม่สำเร็จ', 'error');
  }
}

function setCalendarStatus(message, isError = false) {
  const status = $('calendar-status');
  status.textContent = message;
  status.classList.toggle('is-error', isError);
  status.classList.toggle('hidden', !message);
}

function updateCalendarStatus() {
  const month = Number($('monthSelect').value);
  const year = Number($('yearSelect').value);
  const hasDueDates = assignments.some((item) => {
    const due = dueDate(item);
    return due && due.getFullYear() === year && due.getMonth() === month && matchesSearch(item);
  });
  const hasReminders = getReminderEvents().some((event) =>
    event.remindAt.getFullYear() === year && event.remindAt.getMonth() === month && matchesSearch(event.assignment)
  );

  if (reminderLoadError) {
    setCalendarStatus(`โหลดงานแล้ว แต่โหลดกฎเตือนล่วงหน้าไม่สำเร็จ: ${reminderLoadError}`, true);
  } else if (hasDueDates || hasReminders) {
    setCalendarStatus('');
  } else if (assignments.length === 0) {
    setCalendarStatus('ยังไม่มีรายการงาน กด “ซิงก์ตอนนี้” หลังเชื่อมต่อแพลตฟอร์มแล้ว');
  } else {
    setCalendarStatus('ไม่มีงานครบกำหนดหรือการแจ้งเตือนล่วงหน้าในเดือนนี้');
  }
}

function renderStats() {
  $('total-tasks').textContent = assignments.length;
  $('due-tasks').textContent = assignments.filter((item) => {
    const due = dueDate(item);
    const now = new Date();
    return due && !isSubmitted(item) && due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
  }).length;
  $('submitted-tasks').textContent = assignments.filter(isSubmitted).length;
}

function renderYearOptions(selectedYear = Number($('yearSelect').value) || new Date().getFullYear()) {
  const currentYear = new Date().getFullYear();
  const years = new Set();

  // Keep a useful navigation range around today, and include years present
  // in real assignment data even when they fall outside that range.
  for (let year = currentYear - 5; year <= currentYear + 20; year += 1) years.add(year);
  for (const item of assignments) {
    const due = dueDate(item);
    if (due) years.add(due.getFullYear());
  }
  for (const event of getReminderEvents()) years.add(event.remindAt.getFullYear());

  $('yearSelect').innerHTML = [...years]
    .sort((a, b) => a - b)
    .map((year) => `<option value="${year}">${year + 543}</option>`)
    .join('');

  if (years.has(selectedYear)) $('yearSelect').value = String(selectedYear);
  else $('yearSelect').value = String(currentYear);
}

function renderCalendar() {
  const month = Number($('monthSelect').value);
  const year = Number($('yearSelect').value);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dueByDay = new Map();
  for (const item of assignments) {
    const due = dueDate(item);
    if (!due || due.getFullYear() !== year || due.getMonth() !== month || !matchesSearch(item)) continue;
    dueByDay.set(due.getDate(), [...(dueByDay.get(due.getDate()) || []), item]);
  }
  const remindersByDay = new Map();
  for (const event of getReminderEvents()) {
    if (event.remindAt.getFullYear() !== year || event.remindAt.getMonth() !== month || !matchesSearch(event.assignment)) continue;
    remindersByDay.set(event.remindAt.getDate(), [...(remindersByDay.get(event.remindAt.getDate()) || []), event]);
  }

  const cells = Array(firstWeekday).fill('<div aria-hidden="true"></div>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayItems = dueByDay.get(day) || [];
    const dayReminders = remindersByDay.get(day) || [];
    const submitted = dayItems.length > 0 && dayItems.every(isSubmitted);
    const overdue = dayItems.some(isOverdue);
    const colors = submitted ? 'highlight-green' : overdue ? 'highlight-red' : dayItems.length ? 'highlight-yellow' : '';
    const dueBadge = dayItems.length ? `<span class="calendar-day-count" aria-hidden="true">${dayItems.length}</span>` : '';
    const reminderBadge = dayReminders.length ? '<span class="bell-icon" aria-hidden="true">🔔</span>' : '';
    const description = `${dayItems.length} งานครบกำหนด${dayReminders.length ? `, ${dayReminders.length} รายการเตือนล่วงหน้า` : ''}`;
    cells.push(`<button type="button" data-day="${day}" class="day-cell calendar-day-cell ${colors}" aria-label="${day}, ${description}">${day}${dueBadge}${reminderBadge}</button>`);
  }
  $('daysGrid').innerHTML = cells.join('');
}

function openModal(day) {
  const month = Number($('monthSelect').value);
  const year = Number($('yearSelect').value);
  const items = assignments.filter((item) => {
    const due = dueDate(item);
    return due && due.getFullYear() === year && due.getMonth() === month && due.getDate() === day && matchesSearch(item);
  });
  const reminders = getReminderEvents().filter((event) =>
    event.remindAt.getFullYear() === year
    && event.remindAt.getMonth() === month
    && event.remindAt.getDate() === day
    && matchesSearch(event.assignment)
  );
  const monthName = new Date(year, month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  $('modalDateTitle').textContent = `รายการวันที่ ${day} ${monthName}`;
  const dueItemsHtml = items.map((item) => {
    const borderColor = isSubmitted(item) ? 'border-[#00f050]' : isOverdue(item) ? 'border-[#ff1e1e]' : 'border-[#ffcc00]';
    const statusLabel = item.personal_submitted
      ? 'บันทึกว่าส่งแล้ว'
      : item.computed_status === 'submitted'
        ? 'ส่งแล้วในแพลตฟอร์ม'
        : isOverdue(item) ? 'เกินกำหนด' : 'ยังไม่ส่ง';
    return [
      '<button type="button" data-assignment-id="', escapeHtml(item.id), '" class="w-full text-left p-3 rounded-lg bg-gray-50 border-l-4 ', borderColor, ' mb-2">',
      '<strong class="text-sm">', escapeHtml(item.title), '</strong><br>',
      '<small class="text-xs text-gray-600">', escapeHtml(item.course_name), ' · ', statusLabel, '</small>',
      '</button>',
    ].join('');
  }).join('');
  const dueSection = items.length ? '<h4 class="calendar-modal-section-title">งานครบกำหนด</h4>' + dueItemsHtml : '';
  const reminderItemsHtml = reminders.map(({ assignment, rule, remindAt }) => {
    const unitLabels = { minute: 'นาที', hour: 'ชั่วโมง', day: 'วัน' };
    const unitLabel = unitLabels[rule.lead_time_unit] || rule.lead_time_unit;
    const reminderDate = remindAt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    return [
      '<article class="calendar-reminder-item">',
      '<strong>', escapeHtml(assignment.title), '</strong>',
      '<span>', escapeHtml(assignment.course_name), ' · เตือน ', escapeHtml(rule.lead_time_value), ' ', escapeHtml(unitLabel), ' ก่อนครบกำหนด</span>',
      '<time datetime="', escapeHtml(remindAt.toISOString()), '">', escapeHtml(reminderDate), '</time>',
      '</article>',
    ].join('');
  }).join('');
  const reminderSection = reminders.length ? '<h4 class="calendar-modal-section-title">การแจ้งเตือนล่วงหน้า</h4>' + reminderItemsHtml : '';
  $('modalTaskContent').innerHTML = dueSection || reminderSection
    ? `${dueSection}${reminderSection}`
    : '<p class="text-gray-500 text-sm text-center my-3">ไม่มีงานครบกำหนดหรือการแจ้งเตือนในวันนี้</p>';
  $('submissionForm').classList.toggle('hidden', items.length === 0);
  selectedAssignmentId = null;
  $('taskNote').value = '';
  $('taskModal').classList.remove('hidden');
  $('taskModal').classList.add('flex');
}

function closeModal() {
  $('taskModal').classList.remove('flex');
  $('taskModal').classList.add('hidden');
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  if (!selectedAssignmentId) {
    $('modalTaskContent').insertAdjacentHTML('beforeend', '<p class="text-xs text-red-600">เลือกงานที่ต้องการบันทึกก่อน</p>');
    return;
  }
  const button = $('submissionForm').querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const result = await updatePersonalAssignmentStatus(selectedAssignmentId, {
      submitted: true,
      personal_note: $('taskNote').value.trim() || null,
    });
    const item = assignments.find((entry) => entry.id === selectedAssignmentId);
    if (item) {
      item.personal_submitted = result.submitted;
      item.personal_note = result.personal_note;
    }
    renderStats();
    renderCalendar();
    closeModal();
  } catch (error) {
    $('modalTaskContent').insertAdjacentHTML('beforeend', `<p class="text-xs text-red-600">${escapeHtml(error.message || 'บันทึกสถานะไม่สำเร็จ')}</p>`);
  } finally {
    button.disabled = false;
  }
}

async function init() {
  if (!requireAuth()) return;
  initNavigation();
  const now = new Date();
  $('monthSelect').value = String(now.getMonth());
  renderYearOptions(now.getFullYear());
  renderStats();
  renderCalendar();
  setCalendarStatus('กำลังโหลดงานและการแจ้งเตือนล่วงหน้า...');
  try {
    await Promise.all([loadCalendarData(), loadPlatformNotifications()]);
    renderYearOptions(now.getFullYear());
    renderStats();
    renderCalendar();
    updateCalendarStatus();
  } catch (error) {
    setCalendarStatus(error.message || 'โหลดรายการงานไม่สำเร็จ', true);
  }

  $('monthSelect').addEventListener('change', () => { renderCalendar(); updateCalendarStatus(); });
  $('yearSelect').addEventListener('change', () => { renderCalendar(); updateCalendarStatus(); });
  $('refresh-platform-alerts').addEventListener('click', loadPlatformNotifications);
  $('announcement-list').addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-platform-alert-toggle]');
    if (!trigger) return;
    const details = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!details) return;
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
  });
  window.addEventListener('kmaps:sync-complete', async () => {
    try {
      await Promise.all([loadCalendarData(), loadPlatformNotifications()]);
      renderYearOptions();
      renderStats();
      renderCalendar();
      updateCalendarStatus();
    } catch (error) {
      setCalendarStatus(error.message || 'โหลดรายการงานไม่สำเร็จ', true);
    }
  });
  window.addEventListener('focus', loadPlatformNotifications);
  window.addEventListener('kmaps-search', (event) => {
    searchTerm = (event.detail?.query || '').trim().toLowerCase();
    renderCalendar();
    updateCalendarStatus();
  });
  $('daysGrid').addEventListener('click', (event) => {
    const day = event.target.closest('[data-day]');
    if (day) openModal(Number(day.dataset.day));
  });
  $('modalTaskContent').addEventListener('click', (event) => {
    const button = event.target.closest('[data-assignment-id]');
    if (!button) return;
    selectedAssignmentId = button.dataset.assignmentId;
    $('modalTaskContent').querySelectorAll('[data-assignment-id]').forEach((item) => item.classList.toggle('ring-2', item === button));
    $('taskNote').value = assignments.find((item) => item.id === selectedAssignmentId)?.personal_note || '';
  });
  $('submissionForm').addEventListener('submit', handleTaskSubmit);
  $('taskModal').addEventListener('click', (event) => { if (event.target === $('taskModal')) closeModal(); });
  document.querySelector('.modal-header .fa-xmark')?.addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', init);
