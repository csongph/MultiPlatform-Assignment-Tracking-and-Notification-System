import { getAssignments, getNotificationRules, updatePersonalAssignmentStatus } from './api.js';
import { requireAuth } from './auth.js';
import { initNavigation } from './navigation.js';
import { showToast } from './ui.js';

let assignments = [];
let notificationRules = [];
let selectedAssignmentId = null;
let searchTerm = '';
let reminderLoadError = '';

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
    const colors = submitted ? 'bg-[#00e659] text-[#1a1a1a]' : overdue ? 'bg-[#ff1e1e] text-white' : dayItems.length ? 'bg-[#ffcc00] text-black' : 'text-gray-800';
    const dueBadge = dayItems.length ? `<span class="calendar-day-count" aria-hidden="true">${dayItems.length}</span>` : '';
    const reminderBadge = dayReminders.length ? `<span class="calendar-reminder-count" aria-hidden="true">🔔${dayReminders.length > 1 ? ` ${dayReminders.length}` : ''}</span>` : '';
    const description = `${dayItems.length} งานครบกำหนด${dayReminders.length ? `, ${dayReminders.length} รายการเตือนล่วงหน้า` : ''}`;
    cells.push(`<button type="button" data-day="${day}" class="calendar-day-cell h-[60px] flex items-center justify-center text-[15px] font-medium rounded-lg relative hover:bg-gray-100 transition-all ${colors}" aria-label="${day}, ${description}">${day}${dueBadge}${reminderBadge}</button>`);
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
    await loadCalendarData();
    renderYearOptions(now.getFullYear());
    renderStats();
    renderCalendar();
    updateCalendarStatus();
  } catch (error) {
    setCalendarStatus(error.message || 'โหลดรายการงานไม่สำเร็จ', true);
  }

  $('monthSelect').addEventListener('change', () => { renderCalendar(); updateCalendarStatus(); });
  $('yearSelect').addEventListener('change', () => { renderCalendar(); updateCalendarStatus(); });
  window.addEventListener('kmaps:sync-complete', async () => {
    try {
      await loadCalendarData();
      renderYearOptions();
      renderStats();
      renderCalendar();
      updateCalendarStatus();
    } catch (error) {
      setCalendarStatus(error.message || 'โหลดรายการงานไม่สำเร็จ', true);
    }
  });
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
