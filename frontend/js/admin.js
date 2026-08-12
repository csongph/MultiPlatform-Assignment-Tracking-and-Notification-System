import {
  adminListUsers,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminGetConnections,
  adminFlagConnectionStale,
  adminConnectionsExportUrl,
  adminListAuditLogs,
  adminAuditLogsExportUrl,
  adminGetSyncStatus,
  adminGetErrorSummary,
  adminGetAlerts,
  adminGetServerLogs,
  getHealth,
} from './api.js';
import { getSignedInUser, logout, requireAuth } from './auth.js';
import { showToast } from './ui.js';
import { initNavigation } from './navigation.js';

const state = {
  users: { page: 1, total: 0, search: '' },
  audit: { page: 1, total: 0, user: '', action: '', date: '' },
};

async function init() {
  if (!requireAuth()) return;

  // โหลด Navigation Bar (Sidebar สีม่วง + Topbar สีเขียวมะนาว)
  initNavigation('admin');

  const user = await getSignedInUser().catch(() => null);
  if (!user || user.role !== 'admin') {
    showToast('Administrator access required.', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('admin-subtitle').textContent = `Signed in as administrator (${user.email})`;
  document.getElementById('logout-button')?.addEventListener('click', logout);

  setupTabs();
  setupUsersPanel();
  setupConnectionsPanel();
  setupAuditPanel();
  setupMonitoringPanel();
  setupLogsPanel();

  await Promise.all([
    loadUsers(),
    loadConnections(),
    loadAuditLogs(),
    loadMonitoring(),
    loadServerLogs(),
  ]);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      document.querySelectorAll('.admin-panel').forEach((panel) => panel.classList.remove('is-active'));
      document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('is-active');
    });
  });
}

// ---------------------------------------------------------------------------
// M12: Users & Role Management
// ---------------------------------------------------------------------------

function setupUsersPanel() {
  let debounceHandle;
  document.getElementById('users-search')?.addEventListener('input', (e) => {
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      state.users.search = e.target.value.trim();
      state.users.page = 1;
      loadUsers();
    }, 300);
  });

  document.getElementById('users-prev')?.addEventListener('click', () => {
    if (state.users.page > 1) {
      state.users.page -= 1;
      loadUsers();
    }
  });

  document.getElementById('users-next')?.addEventListener('click', () => {
    const maxPage = Math.max(1, Math.ceil(state.users.total / 20));
    if (state.users.page < maxPage) {
      state.users.page += 1;
      loadUsers();
    }
  });
}

async function loadUsers() {
  try {
    const data = await adminListUsers({ search: state.users.search, page: state.users.page });
    state.users.total = data.total || 0;
    renderUsers(data.users || []);
    const maxPage = Math.max(1, Math.ceil(state.users.total / (data.page_size || 20)));
    document.getElementById('users-page-info').textContent = `Page ${state.users.page} of ${maxPage} · ${state.users.total} users`;
  } catch (error) {
    showToast(error.message || 'Unable to load users.', 'error');
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u) => `
    <tr>
      <td>${escapeHtml(u.full_name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <select class="toolbar-select role-select" data-user-id="${u.id}" style="font-size: 0.8125rem; padding: 0.3rem 0.5rem;">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>student</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td>${u.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-red">Deactivated</span>'}</td>
      <td>${formatDate(u.created_at)}</td>
      <td>
        <div class="admin-inline-actions">
          <button class="btn-sm ${u.is_active ? 'danger' : ''}" data-toggle-status="${u.id}" data-next="${u.is_active ? 'false' : 'true'}">
            ${u.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.role-select').forEach((select) => {
    select.addEventListener('change', async (e) => {
      const userId = e.target.dataset.userId;
      const role = e.target.value;
      if (!window.confirm(`Change this user's role to "${role}"?`)) {
        loadUsers();
        return;
      }
      try {
        await adminUpdateUserRole(userId, role);
        showToast('Role updated.', 'success');
        loadUsers();
      } catch (error) {
        showToast(error.message || 'Unable to update role.', 'error');
      }
    });
  });

  tbody.querySelectorAll('[data-toggle-status]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const userId = e.target.dataset.toggleStatus;
      const nextActive = e.target.dataset.next === 'true';
      const verb = nextActive ? 'reactivate' : 'deactivate (this signs them out immediately)';
      if (!window.confirm(`Are you sure you want to ${verb} this user?`)) return;

      try {
        await adminUpdateUserStatus(userId, nextActive);
        showToast(nextActive ? 'User reactivated.' : 'User deactivated and signed out.', 'success');
        loadUsers();
        loadConnections();
      } catch (error) {
        showToast(error.message || 'Unable to update status.', 'error');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// M13: Connection Monitoring
// ---------------------------------------------------------------------------

function setupConnectionsPanel() {
  document.getElementById('connections-filter')?.addEventListener('change', (e) => {
    loadConnections(e.target.value);
  });

  const exportLink = document.getElementById('connections-export');
  if (exportLink) exportLink.href = adminConnectionsExportUrl();
}

async function loadConnections(status = '') {
  try {
    const data = await adminGetConnections({ status });
    renderConnections(data.connections || []);
  } catch (error) {
    showToast(error.message || 'Unable to load connections.', 'error');
  }
}

function renderConnections(rows) {
  const tbody = document.getElementById('connections-tbody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No connections match this filter.</td></tr>`;
    return;
  }

  const statusBadge = {
    connected: '<span class="badge badge-green">Connected</span>',
    expired: '<span class="badge badge-amber">Expired</span>',
    stale: '<span class="badge badge-amber">Stale</span>',
    broken: '<span class="badge badge-gray">Not connected</span>',
  };

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.full_name)}<br /><span style="color: var(--color-text-secondary); font-size: 0.75rem;">${escapeHtml(row.email)}</span></td>
      <td>${row.platform === 'google' ? 'Google Classroom' : 'Microsoft Teams'}</td>
      <td>${statusBadge[row.status] || row.status}</td>
      <td>${formatDate(row.connected_at)}</td>
      <td>${formatDate(row.token_expires_at)}</td>
      <td>
        ${row.connected && row.status !== 'stale'
          ? `<button class="btn-sm" data-flag-stale="${row.user_id}" data-platform="${row.platform}">Flag Stale</button>`
          : '—'}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-flag-stale]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const userId = e.target.dataset.flagStale;
      const platform = e.target.dataset.platform;
      try {
        await adminFlagConnectionStale(userId, platform);
        showToast('Connection flagged as stale.', 'success');
        loadConnections(document.getElementById('connections-filter').value);
      } catch (error) {
        showToast(error.message || 'Unable to flag connection.', 'error');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// M14: Audit Logging
// ---------------------------------------------------------------------------

function setupAuditPanel() {
  let debounceHandle;
  const applyFilters = () => {
    state.audit.user = document.getElementById('audit-user').value.trim();
    state.audit.action = document.getElementById('audit-action').value;
    state.audit.date = document.getElementById('audit-date').value;
    state.audit.page = 1;
    loadAuditLogs();
  };

  document.getElementById('audit-user')?.addEventListener('input', () => {
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(applyFilters, 300);
  });
  document.getElementById('audit-action')?.addEventListener('change', applyFilters);
  document.getElementById('audit-date')?.addEventListener('change', applyFilters);

  document.getElementById('audit-prev')?.addEventListener('click', () => {
    if (state.audit.page > 1) {
      state.audit.page -= 1;
      loadAuditLogs();
    }
  });
  document.getElementById('audit-next')?.addEventListener('click', () => {
    const maxPage = Math.max(1, Math.ceil(state.audit.total / 20));
    if (state.audit.page < maxPage) {
      state.audit.page += 1;
      loadAuditLogs();
    }
  });

  updateAuditExportLink();
}

function updateAuditExportLink() {
  const link = document.getElementById('audit-export');
  if (!link) return;
  link.href = adminAuditLogsExportUrl({
    user: state.audit.user,
    action: state.audit.action,
    date: state.audit.date,
  });
}

async function loadAuditLogs() {
  try {
    const data = await adminListAuditLogs(state.audit);
    state.audit.total = data.total || 0;
    renderAuditLogs(data.logs || []);
    const maxPage = Math.max(1, Math.ceil(state.audit.total / (data.page_size || 20)));
    document.getElementById('audit-page-info').textContent = `Page ${state.audit.page} of ${maxPage} · ${state.audit.total} entries`;
    updateAuditExportLink();
  } catch (error) {
    showToast(error.message || 'Unable to load audit logs.', 'error');
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">No audit log entries match these filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map((log) => `
    <tr>
      <td>${formatDate(log.created_at)}</td>
      <td>${escapeHtml(log.actor_email || '—')}</td>
      <td><span class="badge badge-gray">${escapeHtml(log.action)}</span></td>
      <td>${escapeHtml(log.target_email || '—')}</td>
      <td style="max-width: 260px; white-space: normal;">${escapeHtml(JSON.stringify(log.metadata || {}))}</td>
    </tr>
  `).join('');
}

// ---------------------------------------------------------------------------
// M15: System Monitoring
// ---------------------------------------------------------------------------

function setupMonitoringPanel() {
  document.getElementById('monitoring-refresh')?.addEventListener('click', loadMonitoring);
}

async function loadMonitoring() {
  try {
    const [health, syncStatus, errors, alertResponse] = await Promise.all([
      getHealth(),
      adminGetSyncStatus(),
      adminGetErrorSummary(),
      adminGetAlerts(),
    ]);

    renderHealth(health);
    renderSyncStatus(syncStatus);
    renderErrors(errors);
    renderAlert(alertResponse.alert);
  } catch (error) {
    showToast(error.message || 'Unable to load monitoring data.', 'error');
  }
}

function renderHealth(health) {
  const el = document.getElementById('health-status');
  if (!el) return;

  const colorClass = health.status === 'healthy' ? 'health-green' : health.status === 'degraded' ? 'health-yellow' : 'health-red';
  const checks = Object.entries(health.checks || {}).map(([key, value]) => `${key}: ${value}`).join(' · ');
  el.innerHTML = `<span class="health-dot ${colorClass}"></span>${health.status.toUpperCase()} — ${checks}`;
}

function renderSyncStatus(status) {
  document.getElementById('sync-success-rate').textContent = `${status.success_rate_percent}%`;
  document.getElementById('sync-queue-depth').textContent = status.queue_depth;
  document.getElementById('sync-events-count').textContent = status.total_events_in_window;
  document.getElementById('sync-last-run').textContent = status.last_sync_at ? formatDate(status.last_sync_at) : 'No sync yet';
}

function renderErrors(errors) {
  const byProviderEl = document.getElementById('error-by-provider');
  const entries = Object.entries(errors.by_provider || {});
  byProviderEl.innerHTML = entries.length
    ? entries.map(([provider, count]) => `
        <div class="stat-card">
          <span class="stat-label">${provider}</span>
          <strong>${count}</strong>
        </div>
      `).join('')
    : `<div class="admin-empty">No failures recorded yet.</div>`;

  const tbody = document.getElementById('errors-tbody');
  const recent = errors.recent_failures || [];
  tbody.innerHTML = recent.length
    ? recent.map((err) => `
        <tr>
          <td>${formatDate(err.created_at)}</td>
          <td>${escapeHtml(err.user_email || '—')}</td>
          <td>${escapeHtml(err.provider)}</td>
          <td style="white-space: normal; max-width: 320px;">${escapeHtml(err.error_message || '—')}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" class="admin-empty">No sync failures recorded.</td></tr>`;
}

function renderAlert(alert) {
  const el = document.getElementById('monitoring-alert');
  if (!el) return;

  if (!alert) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `<div class="alert-banner">⚠ ${escapeHtml(alert.message)}</div>`;
}

// ---------------------------------------------------------------------------
// M16: Server Log Viewer
// ---------------------------------------------------------------------------

let logsTimer = null;

function setupLogsPanel() {
  document.getElementById('logs-refresh')?.addEventListener('click', loadServerLogs);
  
  const checkbox = document.getElementById('logs-auto-refresh');
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        startLogsPolling();
      } else {
        stopLogsPolling();
      }
    });
    if (checkbox.checked) {
      startLogsPolling();
    }
  }
}

function startLogsPolling() {
  stopLogsPolling();
  logsTimer = setInterval(() => {
    const activeTab = document.querySelector('.admin-tab.is-active');
    if (activeTab && activeTab.dataset.tab === 'logs') {
      loadServerLogs();
    }
  }, 10000);
}

function stopLogsPolling() {
  if (logsTimer) {
    clearInterval(logsTimer);
    logsTimer = null;
  }
}

async function loadServerLogs() {
  const viewport = document.getElementById('console-viewport');
  if (!viewport) return;

  try {
    const data = await adminGetServerLogs();
    const logs = data.logs || [];
    
    if (logs.length === 0) {
      viewport.textContent = 'No logs available.';
      return;
    }

    viewport.textContent = logs.join('\n');
    viewport.scrollTop = viewport.scrollHeight;
  } catch (error) {
    viewport.textContent = `Error loading server logs: ${error.message || error}`;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

init();
