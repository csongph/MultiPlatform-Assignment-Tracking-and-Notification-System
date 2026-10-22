/**
 * KMAPS Notification Page
 * Loads assignment stats + the notification feed, and handles read state.
 */

import {
  getAssignments,
  getNotifications,
  getNotificationRules,
  markNotificationRead,
  markAllNotificationsRead,
} from './api.js';
import { requireAuth } from './auth.js';
import { showToast } from './ui.js';
import { initNavigation } from './navigation.js';

const TYPE_LABEL = {
  new: 'งานใหม่',
  due_soon: 'ใกล้ครบกำหนด',
  overdue: 'เลยกำหนดส่ง',
};

const TYPE_ICON = {
  new: 'fa-solid fa-plus',
  due_soon: 'fa-solid fa-clock',
  overdue: 'fa-solid fa-triangle-exclamation',
};

let allNotifications = [];
let notificationRules = [];
let assignmentsById = new Map();
let activeFilter = 'all';
let searchTerm = '';
let refreshTimer = null;

async function init() {
  if (!requireAuth()) return;
  initNavigation();

  document.querySelectorAll('.notification-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeFilter = tab.dataset.filter;
      document.querySelectorAll('.notification-tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      renderList();
    });
  });

  document.getElementById('mark-all-btn')?.addEventListener('click', handleMarkAllRead);
  window.addEventListener('kmaps-search', (event) => {
    searchTerm = (event.detail?.query || '').trim().toLowerCase();
    renderList();
  });
  window.addEventListener('kmaps:sync-complete', async () => {
    await loadStats();
    await Promise.all([loadNotifications(), loadNotificationRules()]);
  });
  window.addEventListener('focus', refreshNotificationData);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshNotificationData();
  });

  await loadStats();
  await Promise.all([loadNotifications(), loadNotificationRules()]);
  refreshTimer = window.setInterval(() => {
    if (!document.hidden) loadNotifications();
  }, 60_000);
  window.addEventListener('pagehide', () => window.clearInterval(refreshTimer), { once: true });
}

async function refreshNotificationData() {
  await loadStats();
  await Promise.all([loadNotifications(), loadNotificationRules()]);
}

async function loadNotificationRules() {
  const listEl = document.getElementById('notification-rules-list');
  try {
    const rules = await getNotificationRules();
    notificationRules = Array.isArray(rules) ? rules : [];
    renderNotificationRules();
  } catch (err) {
    console.error('Failed to load notification rules:', err);
    listEl.innerHTML = '<div class="notification-error">โหลดรายการแจ้งเตือนที่ตั้งไว้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
  }
}

function renderNotificationRules() {
  const listEl = document.getElementById('notification-rules-list');
  const enabledCount = notificationRules.filter((rule) => rule.is_enabled).length;
  const countEl = document.getElementById('notification-rules-count');
  if (countEl) countEl.textContent = `${enabledCount} รายการเปิดใช้งาน`;

  const visible = searchTerm
    ? notificationRules.filter((rule) => {
        const assignment = assignmentsById.get(rule.assignment_id);
        const target = assignment
          ? `${assignment.title} ${assignment.course_name || ''}`
          : 'ทุกงาน';
        return target.toLowerCase().includes(searchTerm);
      })
    : notificationRules;

  if (!visible.length) {
    listEl.innerHTML = `<div class="notification-empty">${notificationRules.length
      ? 'ไม่พบรายการที่ตรงกับคำค้นหา'
      : 'คุณยังไม่ได้ตั้งค่าการแจ้งเตือนล่วงหน้า'}<p>เปิดรายการงานแล้วเลือก “ตั้งแจ้งเตือนล่วงหน้า” เพื่อสร้างรายการเตือน</p><a href="assignments.html">ไปตั้งการแจ้งเตือน</a></div>`;
    return;
  }

  listEl.innerHTML = visible.map(renderNotificationRule).join('');
}

function renderNotificationRule(rule) {
  const assignment = rule.assignment_id ? assignmentsById.get(rule.assignment_id) : null;
  const title = assignment?.title || (rule.assignment_id ? 'ไม่พบข้อมูลงาน' : 'การแจ้งเตือนทั่วไป');
  const course = assignment?.course_name || (rule.assignment_id ? '' : 'ใช้กับงานที่ไม่ได้ตั้งค่าเฉพาะ');
  const unitLabels = { minute: 'นาที', hour: 'ชั่วโมง', day: 'วัน' };
  const leadTime = `${rule.lead_time_value} ${unitLabels[rule.lead_time_unit] || rule.lead_time_unit}`;
  const dueText = rule.assignment_id && !assignment
    ? 'ไม่พบข้อมูลงานที่ผูกกับการเตือนนี้'
    : assignment?.due_at
      ? `ครบกำหนด ${formatDate(assignment.due_at)}`
      : rule.assignment_id
        ? 'งานนี้ไม่มีวันกำหนดส่ง จึงยังคำนวณเวลาเตือนไม่ได้'
        : 'เตือนก่อนวันกำหนดส่งของแต่ละงาน';
  const enabled = Boolean(rule.is_enabled);

  return `
    <article class="notification-item configured-reminder-item ${enabled ? '' : 'is-disabled'}">
      <div class="notification-icon type-due_soon"><i class="fa-solid fa-clock"></i></div>
      <div class="notification-body">
        <div class="notification-title">${escapeHtml(title)}</div>
        <div class="notification-meta">
          <span>${escapeHtml(course)}</span>
          <span>เตือนล่วงหน้า ${escapeHtml(leadTime)}</span>
          <span>${escapeHtml(dueText)}</span>
        </div>
      </div>
      <div class="notification-side">
        <span class="notification-badge ${enabled ? 'rule-enabled' : 'rule-disabled'}">${enabled ? 'เปิดใช้งาน' : 'ปิดแล้ว'}</span>
        ${rule.assignment_id ? '<a class="configured-reminder-edit" href="assignments.html">แก้ไข</a>' : ''}
      </div>
    </article>`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุวันที่';
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadStats() {
  try {
    const { assignments } = await getAssignments();
    assignmentsById = new Map(assignments.map((a) => [a.id, a]));

    const total = assignments.length;
    const submitted = assignments.filter((a) => (a.computed_status ?? a.status) === 'submitted').length;
    const pending = assignments.filter((a) => ['not_submitted', 'overdue'].includes(
      String(a.computed_status ?? a.status ?? '').toLowerCase(),
    )).length;
    const rate = total > 0 ? ((submitted / total) * 100).toFixed(2) : '0.00';

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-submitted').textContent = submitted;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-rate').textContent = `${rate}%`;
  } catch (err) {
    console.error('Failed to load assignment stats:', err);
    showToast(err.message || 'ไม่สามารถโหลดสถิติงานได้', 'error');
  }
}

async function loadNotifications() {
  const listEl = document.getElementById('notification-list');
  try {
    allNotifications = await getNotifications();
    allNotifications.sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );
    renderList();
  } catch (err) {
    console.error('Failed to load notifications:', err);
    listEl.innerHTML = `<div class="notification-error">โหลดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>`;
  }
}

function renderList() {
  const listEl = document.getElementById('notification-list');
  renderNotificationRules();
  const unreadCount = allNotifications.filter((n) => n.status !== 'read').length;

  document.getElementById('tab-count-all').textContent = allNotifications.length;
  document.getElementById('tab-count-unread').textContent = unreadCount;

  const badge = document.getElementById('sidebar-unread-badge');
  if (badge) {
    badge.textContent = unreadCount;
    badge.classList.toggle('visible', unreadCount > 0);
  }

  const markAllBtn = document.getElementById('mark-all-btn');
  if (markAllBtn) markAllBtn.disabled = unreadCount === 0;

  const filtered = activeFilter === 'unread'
    ? allNotifications.filter((n) => n.status !== 'read')
    : allNotifications;
  const visible = searchTerm
    ? filtered.filter((notification) => {
        const assignment = assignmentsById.get(notification.assignment_id);
        return `${notification.title || ''} ${notification.course || ''} ${assignment?.title || ''} ${assignment?.course || ''}`.toLowerCase().includes(searchTerm);
      })
    : filtered;

  if (visible.length === 0) {
    listEl.innerHTML = `
      <div class="notification-empty">
        ${activeFilter === 'unread'
          ? 'ไม่มีการแจ้งเตือนที่ยังไม่อ่าน'
          : `ยังไม่มีการแจ้งเตือนในกล่องข้อความ
             <p>ระบบจะแสดงงานใหม่หลังซิงก์ และแจ้งเตือนใกล้กำหนดตามเวลาที่ตั้งไว้</p>
             <a href="assignments.html">ไปดูรายการงานและตั้งเตือน</a>`}
      </div>`;
    return;
  }

  listEl.innerHTML = visible.map(renderItem).join('');

  listEl.querySelectorAll('[data-mark-read]').forEach((btn) => {
    btn.addEventListener('click', () => handleMarkRead(btn.dataset.markRead));
  });
}

function renderItem(notification) {
  const type = notification.type || 'new';
  const isUnread = notification.status !== 'read';
  const assignment = assignmentsById.get(notification.assignment_id);

  const title = notification.title
    || assignment?.title
    || `${TYPE_LABEL[type] || 'การแจ้งเตือน'}`;

  const course = notification.course || assignment?.course || null;

  return `
    <article class="notification-item ${isUnread ? 'is-unread' : ''}">
      <div class="notification-icon type-${type}">
        <i class="${TYPE_ICON[type] || 'fa-solid fa-bell'}"></i>
      </div>
      <div class="notification-body">
        <div class="notification-title">${escapeHtml(title)}</div>
        <div class="notification-meta">
          <span class="notification-badge type-${type}">${TYPE_LABEL[type] || type}</span>
          ${course ? `<span>${escapeHtml(course)}</span>` : ''}
        </div>
      </div>
      <div class="notification-side">
        <span class="notification-time">${formatRelativeTime(notification.scheduled_at)}</span>
        ${isUnread
          ? `<button type="button" class="mark-read-btn" data-mark-read="${notification.id}">ทำเครื่องหมายว่าอ่านแล้ว</button>`
          : '<span class="unread-dot" style="background:#ccc;"></span>'}
      </div>
    </article>
  `;
}

async function handleMarkRead(notificationId) {
  const target = allNotifications.find((n) => n.id === notificationId);
  if (!target) return;

  try {
    await markNotificationRead(notificationId);
    target.status = 'read';
    renderList();
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    showToast('ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้ กรุณาลองใหม่', 'error');
  }
}

async function handleMarkAllRead() {
  const unreadIds = allNotifications.filter((n) => n.status !== 'read').map((n) => n.id);
  if (unreadIds.length === 0) return;

  const btn = document.getElementById('mark-all-btn');
  btn.disabled = true;

  try {
    await markAllNotificationsRead();
    allNotifications.forEach((n) => {
      if (unreadIds.includes(n.id)) n.status = 'read';
    });
    renderList();
    showToast('ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว', 'success');
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
    showToast('ไม่สามารถทำเครื่องหมายว่าอ่านทั้งหมดได้', 'error');
    btn.disabled = false;
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;

  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
