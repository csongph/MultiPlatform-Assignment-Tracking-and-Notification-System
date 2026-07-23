/**
 * KMAPS Dashboard Entry Point
 */

import {
  getAssignments,
  getOnboardingStatus,
  createAssignment,
  updateAssignmentStatus,
  deleteAssignment,
} from './api.js';
import { requireAuth, getSignedInUser, logout } from './auth.js';
import { showToast, setButtonLoading } from './ui.js';

let allAssignments = [];
let connectionsState = {};

async function init() {
  if (!requireAuth()) return;

  // Setup header events
  document.getElementById('logout-button')?.addEventListener('click', logout);

  // Load user profile
  try {
    const user = await getSignedInUser();
    if (user?.display_name || user?.full_name) {
      const titleEl = document.getElementById('dashboard-title');
      if (titleEl) {
        titleEl.textContent = `Welcome back, ${user.display_name || user.full_name}`;
      }
    }

    if (user?.role === 'admin') {
      const headerActions = document.querySelector('.header-actions');
      if (headerActions && !document.getElementById('admin-console-link')) {
        const adminBtn = document.createElement('a');
        adminBtn.id = 'admin-console-link';
        adminBtn.className = 'btn btn-secondary app-link-button';
        adminBtn.href = 'admin.html';
        adminBtn.style.color = '#2563eb';
        adminBtn.style.fontWeight = '700';
        adminBtn.textContent = '⚙️ Admin Console';
        headerActions.insertBefore(adminBtn, headerActions.firstChild);
      }
    }
  } catch (err) {
    console.warn('Could not load user profile', err);
  }

  // Setup filters & sorting listeners
  document.getElementById('filter-platform')?.addEventListener('change', renderFeed);
  document.getElementById('filter-status')?.addEventListener('change', renderFeed);
  document.getElementById('sort-by')?.addEventListener('change', renderFeed);

  // Setup custom assignment form
  const customForm = document.getElementById('create-assignment-form');
  if (customForm) {
    customForm.addEventListener('submit', handleCreateAssignment);
  }

  // Initial data load
  await Promise.all([loadPlatforms(), loadAssignmentsFeed()]);
}

async function loadPlatforms() {
  try {
    const status = await getOnboardingStatus();
    connectionsState = status?.connections || {};
    renderConnectionsSidebar(connectionsState);
  } catch (err) {
    console.error('Failed to load platform connections:', err);
  }
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
        <div class="connection-item" style="display:flex; justify-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:0.9rem;">${p.icon} ${p.name}</span>
          <span class="badge ${isConnected ? 'badge-success' : 'badge-neutral'}" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:1rem; background:${isConnected ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.1)'}; color:${isConnected ? '#34d399' : '#a1a1aa'};">
            ${isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      `;
    })
    .join('');
}

async function loadAssignmentsFeed() {
  const container = document.getElementById('assignment-list');
  if (container) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #a1a1aa;">Loading assignments...</div>';
  }

  try {
    const response = await getAssignments();
    allAssignments = response?.assignments || [];
    updateMetrics(allAssignments);
    renderFeed();
  } catch (err) {
    console.error('Failed to load assignments:', err);
    showToast('Failed to load assignments. Please refresh.', 'error');
    if (container) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Failed to load assignments.</div>';
    }
  }
}

function updateMetrics(assignments) {
  const dueSoonEl = document.getElementById('metric-due-soon');
  const inProgressEl = document.getElementById('metric-in-progress');
  const completedEl = document.getElementById('metric-completed');

  let dueSoonCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;

  assignments.forEach((a) => {
    const status = (a.status || '').toLowerCase();
    if (status === 'completed' || status === 'submitted') {
      completedCount++;
    } else if (status === 'in progress' || status === 'in_progress') {
      inProgressCount++;
    } else {
      dueSoonCount++;
    }
  });

  if (dueSoonEl) dueSoonEl.textContent = dueSoonCount;
  if (inProgressEl) inProgressEl.textContent = inProgressCount;
  if (completedEl) completedEl.textContent = completedCount;
}

function renderFeed() {
  const container = document.getElementById('assignment-list');
  if (!container) return;

  const platformFilter = document.getElementById('filter-platform')?.value || 'all';
  const statusFilter = document.getElementById('filter-status')?.value || 'all';
  const sortBy = document.getElementById('sort-by')?.value || 'due';

  let filtered = [...allAssignments];

  // Filter by platform
  if (platformFilter !== 'all') {
    filtered = filtered.filter((a) => (a.platform || 'custom').toLowerCase() === platformFilter);
  }

  // Filter by status
  if (statusFilter === 'pending') {
    filtered = filtered.filter((a) => (a.status || '').toLowerCase() !== 'completed' && (a.status || '').toLowerCase() !== 'submitted');
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter((a) => (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'submitted');
  }

  // Sort
  if (sortBy === 'title') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else {
    // default sort by due date
    filtered.sort((a, b) => new Date(a.due || 0) - new Date(b.due || 0));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 3rem 1.5rem; text-align: center; color: #71717a;">
        <p style="font-size: 1.1rem; font-weight: 500;">No assignments found</p>
        <p style="font-size: 0.875rem; margin-top: 0.25rem;">Try adjusting your filters or connect a platform in setup.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item) => renderAssignmentCard(item)).join('');

  // Attach status toggle & delete listeners
  container.querySelectorAll('[data-action="toggle-status"]').forEach((btn) => {
    btn.addEventListener('click', () => handleToggleStatus(btn.dataset.id, btn.dataset.currentStatus));
  });

  container.querySelectorAll('[data-action="delete-task"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteTask(btn.dataset.id));
  });
}

function renderAssignmentCard(item) {
  const isCompleted = ['completed', 'submitted'].includes((item.status || '').toLowerCase());
  const platform = item.platform || 'custom';
  const platformBadge =
    platform === 'google'
      ? '<span style="color:#4285f4;">Google</span>'
      : platform === 'microsoft'
      ? '<span style="color:#00a4ef;">Microsoft</span>'
      : '<span style="color:#a855f7;">Custom</span>';

  return `
    <article class="assignment-card ${isCompleted ? 'completed' : ''}" style="display:flex; justify-content:space-between; align-items:center; padding:1.25rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:0.75rem; margin-bottom:0.75rem; transition:all 0.2s ease;">
      <div style="flex:1; padding-right:1rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
          <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; opacity:0.8;">${platformBadge}</span>
          <span style="color:rgba(255,255,255,0.3);">•</span>
          <span style="font-size:0.8rem; color:#a1a1aa;">${escapeHtml(item.course)}</span>
        </div>
        <h3 style="font-size:1.05rem; font-weight:600; text-decoration:${isCompleted ? 'line-through' : 'none'}; color:${isCompleted ? '#a1a1aa' : '#f4f4f5'}; margin:0 0 0.35rem 0;">
          ${escapeHtml(item.title)}
        </h3>
        <p style="font-size:0.8rem; color:#71717a; margin:0;">Due: <strong>${escapeHtml(item.due)}</strong></p>
      </div>

      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button 
          type="button" 
          class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}" 
          data-action="toggle-status" 
          data-id="${item.id}" 
          data-current-status="${item.status}"
          style="padding:0.4rem 0.85rem; font-size:0.8rem;"
        >
          ${isCompleted ? 'Mark Pending' : 'Mark Done'}
        </button>
        ${
          platform === 'custom'
            ? `<button type="button" class="btn btn-secondary" data-action="delete-task" data-id="${item.id}" style="padding:0.4rem 0.6rem; font-size:0.8rem; color:#ef4444;" title="Delete">🗑️</button>`
            : ''
        }
      </div>
    </article>
  `;
}

async function handleToggleStatus(assignmentId, currentStatus) {
  const nextStatus = ['completed', 'submitted'].includes((currentStatus || '').toLowerCase())
    ? 'Not started'
    : 'Completed';

  try {
    const res = await updateAssignmentStatus(assignmentId, nextStatus);
    if (res?.assignments) {
      allAssignments = res.assignments;
    } else {
      const idx = allAssignments.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) allAssignments[idx].status = nextStatus;
    }
    updateMetrics(allAssignments);
    renderFeed();
    showToast('Assignment status updated.', 'success');
  } catch (err) {
    showToast(err.message || 'Could not update status.', 'error');
  }
}

async function handleCreateAssignment(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const title = form.title.value.trim();
  const course = form.course.value.trim();
  const due = form.due.value.trim();

  if (!title || !course || !due) {
    showToast('Please fill in all task fields.', 'warning');
    return;
  }

  setButtonLoading(submitBtn, true, 'Adding...');

  try {
    const res = await createAssignment({ title, course, due });
    if (res?.assignment) {
      allAssignments.push(res.assignment);
    } else if (res?.assignments) {
      allAssignments = res.assignments;
    }
    form.reset();
    updateMetrics(allAssignments);
    renderFeed();
    showToast('Custom task added successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Could not create custom task.', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleDeleteTask(assignmentId) {
  try {
    const res = await deleteAssignment(assignmentId);
    if (res?.assignments) {
      allAssignments = res.assignments;
    } else {
      allAssignments = allAssignments.filter((a) => a.id !== assignmentId);
    }
    updateMetrics(allAssignments);
    renderFeed();
    showToast('Task deleted.', 'info');
  } catch (err) {
    showToast(err.message || 'Could not delete task.', 'error');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', init);