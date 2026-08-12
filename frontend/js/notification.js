/**
 * KMAPS Notification Page
 * Loads assignment stats + the notification feed, and handles read state.
 */

import {
  getAssignments,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './api.js';
import { requireAuth, getSignedInUser, logout } from './auth.js';
import { showToast } from './ui.js';

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
let assignmentsById = new Map();
let activeFilter = 'all';

async function init() {
  if (!requireAuth()) return;

  document.getElementById('logout-button')?.addEventListener('click', logout);

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

  try {
    const user = await getSignedInUser();
    if (user?.display_name || user?.full_name) {
      document.getElementById('user-name').textContent = user.display_name || user.full_name;
    }
  } catch (err) {
    console.warn('Could not load user profile', err);
  }

  await Promise.all([loadStats(), loadNotifications()]);
}

async function loadStats() {
  try {
    const { assignments } = await getAssignments();
    assignmentsById = new Map(assignments.map((a) => [a.id, a]));

    const total = assignments.length;
    const submitted = assignments.filter((a) => (a.computed_status ?? a.status) === 'submitted').length;
    const pending = assignments.filter((a) => (a.computed_status ?? a.status) === 'not_submitted').length;
    const rate = total > 0 ? ((submitted / total) * 100).toFixed(2) : '0.00';

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-submitted').textContent = submitted;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-rate').textContent = `${rate}%`;
  } catch (err) {
    console.error('Failed to load assignment stats:', err);
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
  const unreadCount = allNotifications.filter((n) => n.status !== 'read').length;

  document.getElementById('tab-count-all').textContent = allNotifications.length;
  document.getElementById('tab-count-unread').textContent = unreadCount;

  const badge = document.getElementById('sidebar-unread-badge');
  badge.textContent = unreadCount;
  badge.classList.toggle('visible', unreadCount > 0);

  const markAllBtn = document.getElementById('mark-all-btn');
  if (markAllBtn) markAllBtn.disabled = unreadCount === 0;

  const visible = activeFilter === 'unread'
    ? allNotifications.filter((n) => n.status !== 'read')
    : allNotifications;

  if (visible.length === 0) {
    listEl.innerHTML = `
      <div class="notification-empty">
        ${activeFilter === 'unread'
          ? 'ไม่มีการแจ้งเตือนที่ยังไม่อ่าน'
          : 'ไม่มีแจ้งเตือนใหม่ในขณะนี้ คุณติดตามงานทุกงานแล้ว'}
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
    await markAllNotificationsRead(unreadIds);
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