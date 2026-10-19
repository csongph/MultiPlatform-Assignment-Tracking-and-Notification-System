import { getAssignments, updatePersonalAssignmentStatus } from './api.js';
import { requireAuth, getSignedInUser, logout } from './auth.js';

let assignments = [];
let selectedAssignmentId = null;
let searchTerm = '';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function dueDate(item) {
  if (!item.due_at) return null;
  const value = new Date(item.due_at);
  return Number.isNaN(value.getTime()) ? null : value;
}

function matchesSearch(item) {
  return !searchTerm || `${item.title} ${item.course_name}`.toLowerCase().includes(searchTerm);
}

function renderStats() {
  $('total-tasks').textContent = assignments.length;
  $('due-tasks').textContent = assignments.filter((item) => {
    const due = dueDate(item);
    const now = new Date();
    return due && due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
  }).length;
  $('submitted-tasks').textContent = assignments.filter((item) => item.personal_submitted || item.computed_status === 'submitted').length;
}

function renderCalendar() {
  const month = Number($('monthSelect').value);
  const year = Number($('yearSelect').value);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDay = new Map();
  for (const item of assignments) {
    const due = dueDate(item);
    if (!due || due.getFullYear() !== year || due.getMonth() !== month || !matchesSearch(item)) continue;
    byDay.set(due.getDate(), [...(byDay.get(due.getDate()) || []), item]);
  }

  const cells = Array(firstWeekday).fill('<div aria-hidden="true"></div>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayItems = byDay.get(day) || [];
    const submitted = dayItems.length > 0 && dayItems.every((item) => item.personal_submitted || item.computed_status === 'submitted');
    const overdue = dayItems.some((item) => item.computed_status === 'overdue' && !item.personal_submitted);
    const colors = submitted ? 'bg-[#00e659] text-[#1a1a1a]' : overdue ? 'bg-[#ff1e1e] text-white' : dayItems.length ? 'bg-[#ffcc00] text-black' : 'text-gray-800';
    cells.push(`<button type="button" data-day="${day}" class="h-[48px] flex items-center justify-center text-[15px] font-medium rounded-lg relative hover:bg-gray-100 transition-all ${colors}" aria-label="${day}, ${dayItems.length} งาน">${day}${dayItems.length ? `<span class="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-white text-gray-700 text-[10px] leading-4">${dayItems.length}</span>` : ''}</button>`);
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
  const monthName = new Date(year, month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  $('modalDateTitle').textContent = `งานวันที่ ${day} ${monthName}`;
  $('modalTaskContent').innerHTML = items.length ? items.map((item) => `
    <button type="button" data-assignment-id="${escapeHtml(item.id)}" class="w-full text-left p-3 rounded-lg bg-gray-50 border-l-4 ${item.personal_submitted || item.computed_status === 'submitted' ? 'border-[#00f050]' : item.computed_status === 'overdue' ? 'border-[#ff1e1e]' : 'border-[#ffcc00]'} mb-2">
      <strong class="text-sm">${escapeHtml(item.title)}</strong><br>
      <small class="text-xs text-gray-600">${escapeHtml(item.course_name)} · ${item.personal_submitted ? 'บันทึกว่าส่งแล้ว' : item.computed_status === 'submitted' ? 'ส่งแล้วในแพลตฟอร์ม' : item.computed_status === 'overdue' ? 'เกินกำหนด' : 'ยังไม่ส่ง'}</small>
    </button>`).join('') : '<p class="text-gray-500 text-sm text-center my-3">ไม่มีงานที่มีกำหนดส่งในวันนี้</p>';
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
  try {
    const user = await getSignedInUser();
    const name = document.querySelector('.user-profile span');
    if (name) name.textContent = user?.full_name || user?.email || 'ผู้ใช้งาน';
    document.querySelector('a[title="ออกจากระบบ"]')?.addEventListener('click', (event) => { event.preventDefault(); logout(); });
    const now = new Date();
    $('monthSelect').value = String(now.getMonth());
    $('yearSelect').value = String(now.getFullYear());
    assignments = (await getAssignments()).assignments || [];
    renderStats();
    renderCalendar();
  } catch (error) {
    $('daysGrid').innerHTML = `<div class="col-span-7 p-8 text-center text-red-600">${escapeHtml(error.message || 'โหลดรายการงานไม่สำเร็จ')}</div>`;
  }

  $('monthSelect').addEventListener('change', renderCalendar);
  $('yearSelect').addEventListener('change', renderCalendar);
  $('calendar-search').addEventListener('input', (event) => { searchTerm = event.target.value.trim().toLowerCase(); renderCalendar(); });
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
