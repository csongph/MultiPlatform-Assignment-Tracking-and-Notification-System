/**
 * KMAPS API Module
 * Centralized Fetch API wrapper for backend communication
 */

import { getAccessToken, clearAuthSession } from './storage.js';

export const FEATURES = {
  customTasks: false,
};

const API_BASE_URL = (
  typeof window !== 'undefined' &&
  window.KMAPS_API_BASE &&
  window.KMAPS_API_BASE.startsWith('http')
)
  ? window.KMAPS_API_BASE
  : 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let mockModulePromise = null;

function getMockModule() {
  if (!mockModulePromise) {
    mockModulePromise = import('./mock-api.js');
  }
  return mockModulePromise;
}

export async function request(endpoint, options = {}) {
  if (
    typeof window !== 'undefined' &&
    window.KMAPS_USE_MOCK_API === true
  ) {
    const mockModule = await getMockModule();
    return mockModule.mockRequest(endpoint, options);
  }

  const { method = 'GET', body, auth = false, headers = {} } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
  };

  if (auth) {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch {
    throw new ApiError(
      'Unable to connect to the server. Please try again later.',
      0,
    );
  }

  if (auth && response.status === 401) {
    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname : '';

    const isAuthPage =
      currentPath.includes('login.html') ||
      currentPath.includes('register.html');

    if (!isAuthPage && typeof window !== 'undefined') {
      clearAuthSession();
      sessionStorage.setItem(
        'kmaps_flash_error',
        'Your session has expired. Please sign in again.',
      );
      window.location.href = 'login.html';
      return null;
    }
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message = '';

    if (typeof data?.detail === 'string') {
      message = data.detail;
    } else if (Array.isArray(data?.detail)) {
      message = data.detail
        .map((item) => item.msg || item.message)
        .join(', ');
    } else {
      message =
        data?.message ||
        data?.error ||
        getDefaultErrorMessage(response.status);
    }

    throw new ApiError(message, response.status, data);
  }

  return data;
}

function getDefaultErrorMessage(status) {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Invalid email or password.',
    403: 'Your account has been disabled. Please contact support.',
    404: 'Resource not found.',
    409: 'Email already exists.',
    422: 'Validation error. Please check your input.',
    500: 'Server error. Please try again later.',
  };

  return messages[status] || 'An unexpected error occurred.';
}

// ---------------------------------------------------------------------------
// Authentication and onboarding
// ---------------------------------------------------------------------------

export async function registerUser({ full_name, email, password }) {
  return request('/auth/register', {
    method: 'POST',
    body: { full_name, email, password },
  });
}

export async function loginUser({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getOnboardingStatus() {
  return request('/onboarding-status', { auth: true });
}

export async function getCurrentUser() {
  return request('/users/me', { auth: true });
}

export async function updateOnboardingConnection(provider, connected) {
  return request('/onboarding-status', {
    method: 'POST',
    auth: true,
    body: { provider, connected },
  });
}

export async function disconnectPlatform(provider) {
  const platformName = provider === 'microsoft'
    ? 'microsoft_teams'
    : provider === 'google'
      ? 'google_classroom'
      : provider;

  return request(`/oauth/${encodeURIComponent(platformName)}`, {
    method: 'DELETE',
    auth: true,
  });
}

// ---------------------------------------------------------------------------
// Platform and assignment normalization
// ---------------------------------------------------------------------------

export function normalizePlatform(platform) {
  const value = String(platform || '').toLowerCase();

  if (value === 'google_classroom' || value === 'google') {
    return 'google';
  }

  if (value === 'microsoft_teams' || value === 'microsoft') {
    return 'microsoft';
  }

  return platform || 'custom';
}

function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeAssignment(assignment) {
  const platformSlug = normalizePlatform(assignment.platform);
  const dueRaw = assignment.due_at ?? assignment.due ?? null;
  const dueDate = dueRaw ? new Date(dueRaw) : null;

  const validDue =
    dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;

  return {
    ...assignment,
    id: assignment.id,
    title: assignment.title ?? '(Untitled assignment)',
    course: assignment.course_name ?? assignment.course ?? 'Untitled Course',
    course_name: assignment.course_name ?? assignment.course ?? 'Untitled Course',
    platform: platformSlug,
    raw_platform: assignment.platform,
    due_at: assignment.due_at ?? null,
    due: formatDue(validDue),
    dueDate: validDue,
    status: assignment.computed_status ?? assignment.status ?? 'Not started',
    computed_status:
      assignment.computed_status ?? assignment.status ?? 'Not started',
    source_status: assignment.source_status ?? '',
    source_url: isValidHttpUrl(assignment.source_url)
      ? assignment.source_url
      : '',
  };
}

function formatDue(date) {
  if (!date) {
    return 'No due date';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Dashboard, courses, assignments, and synchronization
// ---------------------------------------------------------------------------

export async function getDashboardSummary() {
  return request('/dashboard/summary', { auth: true });
}

export async function getCourses(platform = null) {
  const query = platform
    ? `?platform=${encodeURIComponent(platform)}`
    : '';

  return request(`/courses${query}`, { auth: true });
}

export async function getAssignments() {
  const data = await request('/assignments', { auth: true });
  const list = Array.isArray(data) ? data : data?.assignments || [];

  return {
    assignments: list.map(normalizeAssignment),
  };
}

export async function queueSync(platform = 'google_classroom') {
  return request('/sync', {
    method: 'POST',
    auth: true,
    body: { platform },
  });
}

export async function getSyncJob(jobId) {
  return request(`/sync/${encodeURIComponent(jobId)}`, {
    auth: true,
  });
}

// Backend currently does not support editing, creating, or deleting
// assignments. These functions remain for compatibility with older UI code.
// They will only work if the selected API implementation supports them.

export async function updateAssignmentStatus(assignmentId, status) {
  return request('/assignments/update-status', {
    method: 'POST',
    auth: true,
    body: {
      assignment_id: assignmentId,
      status,
    },
  });
}

export async function createAssignment({ title, course, due }) {
  if (!FEATURES.customTasks) {
    throw new ApiError(
      'Custom assignment creation is not supported by the backend.',
      501,
    );
  }

  return request('/assignments/create', {
    method: 'POST',
    auth: true,
    body: { title, course, due },
  });
}

export async function deleteAssignment(assignmentId) {
  if (!FEATURES.customTasks) {
    throw new ApiError(
      'Custom assignment deletion is not supported by the backend.',
      501,
    );
  }

  return request('/assignments/delete', {
    method: 'POST',
    auth: true,
    body: { assignment_id: assignmentId },
  });
}

// ---------------------------------------------------------------------------
// OAuth connection
// ---------------------------------------------------------------------------

export async function connectPlatform(provider) {
  const token = getAccessToken();

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const platformSlug = provider === 'microsoft'
    ? 'microsoft_teams'
    : 'google_classroom';

  try {
    const response = await request(
      `/oauth/${platformSlug}/authorize`,
      { auth: true },
    );

    if (response?.authorization_url) {
      window.location.href = response.authorization_url;
      return response.authorization_url;
    }

    throw new ApiError('Authorization URL was not returned by the server.', 500);
  } catch (error) {
    console.error('Failed to start OAuth flow:', error);
    throw error;
  }
}

export async function connectGoogleClassroom() {
  return connectPlatform('google');
}

export async function connectMicrosoft() {
  return connectPlatform('microsoft');
}

// ---------------------------------------------------------------------------
// Admin Console
// ---------------------------------------------------------------------------

export async function adminListUsers({ search = '', page = 1 } = {}) {
  const query = new URLSearchParams({
    search,
    page: String(page),
  });

  return request(`/admin/users?${query.toString()}`, {
    auth: true,
  });
}

export async function adminUpdateUserRole(userId, role) {
  return request(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PUT',
      auth: true,
      body: { role },
    },
  );
}

export async function adminUpdateUserStatus(userId, isActive) {
  return request(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: 'PATCH',
      auth: true,
      body: { is_active: isActive },
    },
  );
}

export async function adminGetConnections({ status = '' } = {}) {
  const query = new URLSearchParams(status ? { status } : {});
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request(`/admin/connections${suffix}`, {
    auth: true,
  });
}

export async function adminFlagConnectionStale(userId, platform) {
  return request(
    `/admin/connections/${encodeURIComponent(userId)}/${encodeURIComponent(platform)}/stale`,
    {
      method: 'PATCH',
      auth: true,
    },
  );
}

export async function adminListAuditLogs({
  user = '',
  action = '',
  date = '',
  page = 1,
} = {}) {
  const query = new URLSearchParams({
    user,
    action,
    date,
    page: String(page),
  });

  return request(`/admin/audit-logs?${query.toString()}`, {
    auth: true,
  });
}

// Export URL helpers retained for compatibility with admin.js.
// Note: direct links may not send the Bearer token. Use the download
// functions below if the backend requires Bearer authentication.

export function adminConnectionsExportUrl() {
  return `${API_BASE_URL}/admin/connections/export`;
}

export function adminAuditLogsExportUrl({
  user = '',
  action = '',
  date = '',
} = {}) {
  const query = new URLSearchParams({ user, action, date });

  return `${API_BASE_URL}/admin/audit-logs/export?${query.toString()}`;
}

export async function adminGetSyncStatus() {
  return request('/admin/monitoring/sync-status', {
    auth: true,
  });
}

export async function adminGetErrorSummary() {
  return request('/admin/monitoring/errors', {
    auth: true,
  });
}

export async function adminGetAlerts() {
  return request('/admin/monitoring/alerts', {
    auth: true,
  });
}

export async function adminGetServerLogs() {
  return request('/admin/server-logs', {
    auth: true,
  });
}

// ---------------------------------------------------------------------------
// CSV downloads
// ---------------------------------------------------------------------------

async function downloadCsv(endpoint, fallbackFilename) {
  const token = getAccessToken();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
  } catch {
    throw new ApiError('Unable to connect to the server.', 0);
  }

  if (!response.ok) {
    let message = `Unable to download ${fallbackFilename}.`;

    try {
      const data = await response.json();
      message =
        data?.detail ||
        data?.message ||
        data?.error ||
        message;
    } catch {
      // Keep the fallback message if the response is not JSON.
    }

    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');

  let filename = fallbackFilename;

  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);

    if (match?.[1]) {
      filename = match[1];
    }
  }

  triggerBlobDownload(blob, filename);
}

export async function downloadConnectionsCsv() {
  return downloadCsv(
    '/admin/connections/export',
    'connections.csv',
  );
}

export async function downloadAuditLogsCsv({
  user = '',
  action = '',
  date = '',
} = {}) {
  const query = new URLSearchParams({ user, action, date });

  return downloadCsv(
    `/admin/audit-logs/export?${query.toString()}`,
    'audit_logs.csv',
  );
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.style.display = 'none';
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 200);
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function getHealth() {
  const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const response = await fetch(`${baseUrl}/health`);

  if (!response.ok) {
    throw new ApiError('Health check failed.', response.status);
  }

  return response.json();
}

export { ApiError };
