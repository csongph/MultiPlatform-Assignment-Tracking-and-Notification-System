/**
 * KMAPS API Module
 * Centralized Fetch API wrapper for backend communication
 */

import { getAccessToken, clearAuthSession } from './storage.js';

export const FEATURES = {
  // The live backend does not currently support custom assignments.
  customTasks: false,
};

const API_BASE_URL = (
  typeof window !== 'undefined' &&
  window.KMAPS_API_BASE &&
  window.KMAPS_API_BASE.startsWith('http')
)
  ? window.KMAPS_API_BASE
  : 'http://localhost:8000/api/v1';

const MOCK_DELAY_MS = 350;
const MOCK_USERS_KEY = 'kmaps_mock_users';
const MOCK_CONNECTIONS_KEY = 'kmaps_mock_connections';
const MOCK_ASSIGNMENTS_KEY = 'kmaps_mock_assignments';

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// HTTP request wrapper
// ---------------------------------------------------------------------------

export async function request(endpoint, options = {}) {
  if (
    typeof window !== 'undefined' &&
    window.KMAPS_USE_MOCK_API === true
  ) {
    return mockRequest(endpoint, options);
  }

  const {
    method = 'GET',
    body,
    auth = false,
    headers = {},
  } = options;

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
      'Unable to connect to the server. Please check that the backend is running.',
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

      try {
        sessionStorage.setItem(
          'kmaps_flash_error',
          'Your session has expired. Please sign in again.',
        );
      } catch {
        // Continue redirecting if sessionStorage is unavailable.
      }

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

// ---------------------------------------------------------------------------
// Platform normalization
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

// ---------------------------------------------------------------------------
// Assignment normalization
// ---------------------------------------------------------------------------

function formatDue(date) {
  if (!date) {
    return 'No due date';
  }

  const validDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(validDate.getTime())) {
    return 'No due date';
  }

  return validDate.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeAssignment(assignment) {
  const source = assignment || {};
  const platformSlug = normalizePlatform(source.platform);
  const dueRaw = source.due_at ?? source.due ?? null;
  const dueDate = dueRaw ? new Date(dueRaw) : null;

  const validDue =
    dueDate && !Number.isNaN(dueDate.getTime())
      ? dueDate
      : null;

  return {
    ...source,
    id: source.id,
    title: source.title ?? '(Untitled assignment)',
    course: source.course_name ?? source.course ?? 'Untitled Course',
    course_name: source.course_name ?? source.course ?? 'Untitled Course',
    platform: platformSlug,
    raw_platform: source.platform,
    due_at: source.due_at ?? null,
    due: formatDue(validDue),
    dueDate: validDue,
    status: source.computed_status ?? source.status ?? 'Not started',
    computed_status:
      source.computed_status ?? source.status ?? 'Not started',
    source_status: source.source_status ?? '',
    source_url: isValidHttpUrl(source.source_url)
      ? source.source_url
      : '',
  };
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
  const list = Array.isArray(data)
    ? data
    : data?.assignments || [];

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
    : provider === 'google'
      ? 'google_classroom'
      : null;

  if (!platformSlug) {
    throw new ApiError('Unsupported platform.', 400);
  }

  try {
    const response = await request(
      `/oauth/${platformSlug}/authorize`,
      { auth: true },
    );

    if (response?.authorization_url) {
      window.location.href = response.authorization_url;
      return response.authorization_url;
    }

    throw new ApiError(
      'Authorization URL was not returned by the server.',
      500,
    );
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
// Admin Console: Users and roles
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

// ---------------------------------------------------------------------------
// Admin Console: Connections
// ---------------------------------------------------------------------------

export async function adminGetConnections({ status = '' } = {}) {
  const query = new URLSearchParams(status ? { status } : '');
  const suffix = query.toString()
    ? `?${query.toString()}`
    : '';

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

export function adminConnectionsExportUrl() {
  return `${API_BASE_URL}/admin/connections/export`;
}

// ---------------------------------------------------------------------------
// Admin Console: Audit logs
// ---------------------------------------------------------------------------

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

export function adminAuditLogsExportUrl({
  user = '',
  action = '',
  date = '',
} = {}) {
  const query = new URLSearchParams({ user, action, date });

  return `${API_BASE_URL}/admin/audit-logs/export?${query.toString()}`;
}

// ---------------------------------------------------------------------------
// Admin Console: Monitoring and server logs
// ---------------------------------------------------------------------------

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
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
    });
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
  let response;

  try {
    response = await fetch(`${baseUrl}/health`);
  } catch {
    throw new ApiError('Unable to connect to the server.', 0);
  }

  if (!response.ok) {
    throw new ApiError('Health check failed.', response.status);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Mock API
// ---------------------------------------------------------------------------

async function mockRequest(endpoint, options = {}) {
  await delay(MOCK_DELAY_MS);

  const {
    method = 'GET',
    body = {},
    auth = false,
  } = options;

  const session = getMockSession();

  if (auth && !session) {
    throw new ApiError('Please sign in again.', 401);
  }

  if (endpoint === '/auth/register' && method === 'POST') {
    const users = getMockUsers();
    const email = normalizeEmail(body.email);

    if (users.some((user) => normalizeEmail(user.email) === email)) {
      throw new ApiError('Email already exists.', 409);
    }

    const user = {
      id: globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : String(Date.now()),
      full_name: body.full_name,
      email,
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    users.push({ ...user, password: body.password });
    setMockUsers(users);

    return { user };
  }

  if (endpoint === '/auth/login' && method === 'POST') {
    const users = getMockUsers();
    const email = normalizeEmail(body.email);
    const user = users.find(
      (item) => normalizeEmail(item.email) === email,
    );

    if (!user || user.password !== body.password) {
      throw new ApiError('Invalid email or password.', 401);
    }

    const accessToken = `mock-access-${user.id}-${Date.now()}`;
    const refreshToken = `mock-refresh-${user.id}-${Date.now()}`;

    localStorage.setItem('kmaps_mock_session_user_id', user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 60 * 60 * 8,
      user: sanitizeUser(user),
    };
  }

  if (endpoint === '/users/me' && method === 'GET') {
    return sanitizeUser(session);
  }

  if (endpoint === '/onboarding-status' && method === 'GET') {
    const connections = getMockConnections(session.id);

    return {
      has_connection: connections.google || connections.microsoft,
      connections,
    };
  }

  if (endpoint === '/onboarding-status' && method === 'POST') {
    const connections = getMockConnections(session.id);
    const provider = body.provider;

    if (!['google', 'microsoft'].includes(provider)) {
      throw new ApiError('Unsupported platform.', 400);
    }

    const next = {
      ...connections,
      [provider]: Boolean(body.connected),
    };

    setMockConnections(session.id, next);

    return {
      has_connection: next.google || next.microsoft,
      connections: next,
    };
  }

  if (endpoint === '/assignments' && method === 'GET') {
    const connections = getMockConnections(session.id);
    const assignments = getMockAssignmentsFromStorage(session.id);
    const filtered = assignments.filter(
      (assignment) =>
        assignment.platform === 'custom' ||
        connections[normalizePlatform(assignment.platform)],
    );

    return {
      assignments: filtered,
    };
  }

  if (endpoint === '/assignments/update-status' && method === 'POST') {
    const assignments = getMockAssignmentsFromStorage(session.id);
    const assignment = assignments.find(
      (item) => String(item.id) === String(body.assignment_id),
    );

    if (!assignment) {
      throw new ApiError('Assignment not found.', 404);
    }

    assignment.status = body.status;
    assignment.computed_status = body.status;

    saveMockAssignmentsToStorage(session.id, assignments);

    return {
      success: true,
      assignments,
    };
  }

  if (endpoint === '/assignments/create' && method === 'POST') {
    const assignments = getMockAssignmentsFromStorage(session.id);

    const assignment = {
      id: globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : String(Date.now()),
      title: body.title,
      course: body.course,
      platform: 'custom',
      due: body.due,
      status: 'Not started',
    };

    assignments.push(assignment);
    saveMockAssignmentsToStorage(session.id, assignments);

    return {
      success: true,
      assignment,
      assignments,
    };
  }

  if (endpoint === '/assignments/delete' && method === 'POST') {
    const assignments = getMockAssignmentsFromStorage(session.id)
      .filter(
        (item) => String(item.id) !== String(body.assignment_id),
      );

    saveMockAssignmentsToStorage(session.id, assignments);

    return {
      success: true,
      assignments,
    };
  }

  throw new ApiError(
    `Mock endpoint not found: ${method} ${endpoint}`,
    404,
  );
}

function getMockUsers() {
  const raw = localStorage.getItem(MOCK_USERS_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setMockUsers(users) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function getMockSession() {
  const userId = localStorage.getItem('kmaps_mock_session_user_id');

  if (!userId || !getAccessToken()) {
    return null;
  }

  return getMockUsers().find(
    (user) => String(user.id) === String(userId),
  ) || null;
}

function getMockConnections(userId) {
  const raw = localStorage.getItem(MOCK_CONNECTIONS_KEY);
  let allConnections = {};

  try {
    allConnections = raw ? JSON.parse(raw) : {};
  } catch {
    allConnections = {};
  }

  return allConnections[userId] || {
    google: false,
    microsoft: false,
  };
}

function setMockConnections(userId, connections) {
  const raw = localStorage.getItem(MOCK_CONNECTIONS_KEY);
  let allConnections = {};

  try {
    allConnections = raw ? JSON.parse(raw) : {};
  } catch {
    allConnections = {};
  }

  allConnections[userId] = connections;

  localStorage.setItem(
    MOCK_CONNECTIONS_KEY,
    JSON.stringify(allConnections),
  );
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...profile } = user;
  return profile;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMockAssignmentsFromStorage(userId) {
  const raw = localStorage.getItem(MOCK_ASSIGNMENTS_KEY);
  let allAssignments = {};

  try {
    allAssignments = raw ? JSON.parse(raw) : {};
  } catch {
    allAssignments = {};
  }

  let assignments = allAssignments[userId];

  if (!assignments) {
    assignments = [
      {
        id: 'mock-g1',
        title: 'Data Modeling Case Study',
        course: 'Business Analytics',
        platform: 'google',
        due: 'Tomorrow, 23:59',
        status: 'Not started',
      },
      {
        id: 'mock-g2',
        title: 'UX Research Summary',
        course: 'Human Computer Interaction',
        platform: 'google',
        due: 'In 5 days, 12:00',
        status: 'Not started',
      },
      {
        id: 'mock-g3',
        title: 'Machine Learning Lab 1',
        course: 'Advanced AI',
        platform: 'google',
        due: 'In 10 days, 23:59',
        status: 'Completed',
      },
      {
        id: 'mock-m1',
        title: 'Sprint Retrospective Report',
        course: 'Software Project Management',
        platform: 'microsoft',
        due: 'In 3 days, 18:00',
        status: 'In progress',
      },
      {
        id: 'mock-m2',
        title: 'API Integration Lab',
        course: 'Web Application Development',
        platform: 'microsoft',
        due: 'In 7 days, 23:59',
        status: 'In progress',
      },
      {
        id: 'mock-m3',
        title: 'Database Optimization Project',
        course: 'Database Systems',
        platform: 'microsoft',
        due: 'In 12 days, 17:00',
        status: 'Not started',
      },
    ];

    allAssignments[userId] = assignments;

    localStorage.setItem(
      MOCK_ASSIGNMENTS_KEY,
      JSON.stringify(allAssignments),
    );
  }

  return assignments;
}

function saveMockAssignmentsToStorage(userId, assignments) {
  const raw = localStorage.getItem(MOCK_ASSIGNMENTS_KEY);
  let allAssignments = {};

  try {
    allAssignments = raw ? JSON.parse(raw) : {};
  } catch {
    allAssignments = {};
  }

  allAssignments[userId] = assignments;

  localStorage.setItem(
    MOCK_ASSIGNMENTS_KEY,
    JSON.stringify(allAssignments),
  );
}

export { ApiError };
