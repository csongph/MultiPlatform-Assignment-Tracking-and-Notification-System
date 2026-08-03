/**
 * KMAPS API Module
 * Centralized Fetch API wrapper for backend communication
 */

import { getAccessToken } from './storage.js';

const API_BASE_URL = (window.KMAPS_API_BASE && window.KMAPS_API_BASE.startsWith('http'))
  ? window.KMAPS_API_BASE
  : "http://localhost:8000/api/v1";

const USE_MOCK_API = window.KMAPS_USE_MOCK_API === true;
const MOCK_DELAY_MS = 350;
const MOCK_USERS_KEY = 'kmaps_mock_users';
const MOCK_CONNECTIONS_KEY = 'kmaps_mock_connections';

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  if (USE_MOCK_API) {
    return mockRequest(endpoint, options);
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
    throw new ApiError('Network error. Please check if the backend server is running at http://localhost:8000', 0);
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
      message = data.detail.map((item) => item.msg || item.message).join(', ');
    } else {
      message = data?.message || data?.error || getDefaultErrorMessage(response.status);
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
    422: 'Validation error. Please check your input format.',
    500: 'Server error. Please try again later.',
  };
  return messages[status] || 'An unexpected error occurred.';
}

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

// The real backend (app/api/v1/routers/learning.py) exposes assignments as
// a plain array at GET /assignments, with different field names than the
// dashboard UI expects (course_name/due_at/computed_status instead of
// course/due/status). We normalize the shape here so dashboard.js keeps
// working against the live API without needing to know about that.
function normalizeAssignment(a) {
  return {
    ...a,
    course: a.course_name ?? a.course ?? 'Untitled Course',
    due: formatDue(a.due_at) ?? a.due ?? 'No due date',
    status: a.computed_status ?? a.status ?? 'Not started',
  };
}

function formatDue(dueAt) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function getAssignments() {
  const data = await request('/assignments', { auth: true });
  // Backend returns a raw array, not { assignments: [...] } like the mock API.
  const list = Array.isArray(data) ? data : data?.assignments || [];
  return { assignments: list.map(normalizeAssignment) };
}

// NOTE: The backend does not currently support manually editing, creating,
// or deleting assignments (they are read-only records synced from Google
// Classroom / Microsoft Teams — see app/services/learning_service.py and
// the Assignment model, which has no user-editable status and no "custom"
// platform). These three calls will 404 against the real API until that
// backend feature is built. Left in place (matching the mock API) so the
// UI still works in mock mode; wire them up once the backend adds:
//   PATCH /assignments/{id}/status , POST /assignments , DELETE /assignments/{id}
export async function updateAssignmentStatus(assignmentId, status) {
  return request('/assignments/update-status', {
    method: 'POST',
    auth: true,
    body: { assignment_id: assignmentId, status },
  });
}

export async function createAssignment({ title, course, due }) {
  return request('/assignments/create', {
    method: 'POST',
    auth: true,
    body: { title, course, due },
  });
}

export async function deleteAssignment(assignmentId) {
  return request('/assignments/delete', {
    method: 'POST',
    auth: true,
    body: { assignment_id: assignmentId },
  });
}

/**
 * Redirect the user to the platform OAuth consent screen.
 * The backend will handle the token exchange and assignment sync.
 */
export async function connectPlatform(provider) {
  const token = getAccessToken();
  if (!token) {
    window.location.href = '/pages/login.html';
    return;
  }

  // The backend's Platform rows / adapters use "google_classroom" and
  // "microsoft_teams" (see app/integrations/__init__.py), not the short
  // "google"/"microsoft" names used elsewhere in the frontend.
  const platformSlug = provider === 'microsoft'
    ? 'microsoft_teams'
    : 'google_classroom';

  // GET /oauth/{platform}/authorize does NOT itself redirect to Google/
  // Microsoft — it's a JSON endpoint that *returns* the consent-screen URL
  // (see AuthorizeUrlResponse in oauth.py). We have to fetch it first
  // (auth required) and then send the browser to the URL it gives back.
  try {
    const { authorization_url } = await request(`/oauth/${platformSlug}/authorize`, { auth: true });
    window.location.href = authorization_url;
  } catch (err) {
    console.error('Failed to start OAuth flow:', err);
    throw err;
  }
}

export function connectGoogleClassroom() {
  connectPlatform('google');
}

export function connectMicrosoft() {
  connectPlatform('microsoft');
}

export { ApiError };

// ---------------------------------------------------------------------------
// Admin Console (M12-M15)
// ---------------------------------------------------------------------------

export async function adminListUsers({ search = '', page = 1 } = {}) {
  const query = new URLSearchParams({ search, page: String(page) });
  return request(`/admin/users?${query.toString()}`, { auth: true });
}

export async function adminUpdateUserRole(userId, role) {
  return request(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PUT',
    auth: true,
    body: { role },
  });
}

export async function adminUpdateUserStatus(userId, isActive) {
  return request(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    auth: true,
    body: { is_active: isActive },
  });
}

export async function adminGetConnections({ status = '' } = {}) {
  const query = new URLSearchParams(status ? { status } : {});
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/admin/connections${suffix}`, { auth: true });
}

export async function adminFlagConnectionStale(userId, platform) {
  return request(`/admin/connections/${encodeURIComponent(userId)}/${encodeURIComponent(platform)}/stale`, {
    method: 'PATCH',
    auth: true,
  });
}

export function adminConnectionsExportUrl() {
  return `${API_BASE_URL}/admin/connections/export`;
}

export async function adminListAuditLogs({ user = '', action = '', date = '', page = 1 } = {}) {
  const query = new URLSearchParams({ user, action, date, page: String(page) });
  return request(`/admin/audit-logs?${query.toString()}`, { auth: true });
}

export function adminAuditLogsExportUrl({ user = '', action = '', date = '' } = {}) {
  const query = new URLSearchParams({ user, action, date });
  return `${API_BASE_URL}/admin/audit-logs/export?${query.toString()}`;
}

export async function adminGetSyncStatus() {
  return request('/admin/monitoring/sync-status', { auth: true });
}

export async function adminGetErrorSummary() {
  return request('/admin/monitoring/errors', { auth: true });
}

export async function adminGetAlerts() {
  return request('/admin/monitoring/alerts', { auth: true });
}

export async function adminGetServerLogs() {
  return request('/admin/server-logs', { auth: true });
}

export async function getHealth() {
  // /health is mounted at the app root in backend/app/main.py, NOT under
  // /api/v1 like every other route, so it can't go through request().
  const response = await fetch(`${API_BASE_URL.replace(/\/api\/v1$/, '')}/health`);
  if (!response.ok) {
    throw new ApiError('Health check failed.', response.status);
  }
  return response.json();
}

async function mockRequest(endpoint, options = {}) {
  await delay(MOCK_DELAY_MS);

  const { method = 'GET', body = {}, auth = false } = options;
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
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      full_name: body.full_name,
      email,
      created_at: new Date().toISOString(),
    };

    users.push({ ...user, password: body.password });
    setMockUsers(users);
    return { user };
  }

  if (endpoint === '/auth/login' && method === 'POST') {
    const users = getMockUsers();
    const email = normalizeEmail(body.email);
    const user = users.find((item) => normalizeEmail(item.email) === email);

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
    const mockAssignments = getMockAssignmentsFromStorage(session.id);
    const filtered = mockAssignments.filter(a => a.platform === 'custom' || connections[a.platform]);
    return { assignments: filtered };
  }

  if (endpoint === '/assignments/update-status' && method === 'POST') {
    const mockAssignments = getMockAssignmentsFromStorage(session.id);
    const item = mockAssignments.find(a => a.id === body.assignment_id);
    if (!item) throw new ApiError('Assignment not found.', 404);
    item.status = body.status;
    saveMockAssignmentsToStorage(session.id, mockAssignments);
    return { success: true, assignments: mockAssignments };
  }

  if (endpoint === '/assignments/create' && method === 'POST') {
    const mockAssignments = getMockAssignmentsFromStorage(session.id);
    const newAssignment = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: body.title,
      course: body.course,
      platform: 'custom',
      due: body.due,
      status: 'Not started'
    };
    mockAssignments.push(newAssignment);
    saveMockAssignmentsToStorage(session.id, mockAssignments);
    return { success: true, assignment: newAssignment, assignments: mockAssignments };
  }

  if (endpoint === '/assignments/delete' && method === 'POST') {
    let mockAssignments = getMockAssignmentsFromStorage(session.id);
    mockAssignments = mockAssignments.filter(a => a.id !== body.assignment_id);
    saveMockAssignmentsToStorage(session.id, mockAssignments);
    return { success: true, assignments: mockAssignments };
  }

  throw new ApiError('Mock endpoint not found.', 404);
}

function getMockUsers() {
  const raw = localStorage.getItem(MOCK_USERS_KEY);
  if (!raw) return [];

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
  if (!userId || !getAccessToken()) return null;

  const user = getMockUsers().find((item) => item.id === userId);
  return user || null;
}

function getMockConnections(userId) {
  const raw = localStorage.getItem(MOCK_CONNECTIONS_KEY);
  let allConnections = {};

  try {
    allConnections = raw ? JSON.parse(raw) : {};
  } catch {
    allConnections = {};
  }

  return allConnections[userId] || { google: false, microsoft: false };
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
  localStorage.setItem(MOCK_CONNECTIONS_KEY, JSON.stringify(allConnections));
}

function sanitizeUser(user) {
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
  const raw = localStorage.getItem('kmaps_mock_assignments');
  let allAssignments = {};
  try {
    allAssignments = raw ? JSON.parse(raw) : {};
  } catch {
    allAssignments = {};
  }
  let userAssignments = allAssignments[userId];
  if (!userAssignments) {
    userAssignments = [
      {
        id: 'mock-g1',
        title: "Data Modeling Case Study",
        course: "Business Analytics",
        platform: "google",
        due: "Tomorrow, 23:59",
        status: "Not started",
      },
      {
        id: 'mock-g2',
        title: "UX Research Summary",
        course: "Human Computer Interaction",
        platform: "google",
        due: "In 5 days, 12:00",
        status: "Not started",
      },
      {
        id: 'mock-g3',
        title: "Machine Learning Lab 1",
        course: "Advanced AI",
        platform: "google",
        due: "In 10 days, 23:59",
        status: "Completed",
      },
      {
        id: 'mock-m1',
        title: "Sprint Retrospective Report",
        course: "Software Project Management",
        platform: "microsoft",
        due: "In 3 days, 18:00",
        status: "In progress",
      },
      {
        id: 'mock-m2',
        title: "API Integration Lab",
        course: "Web Application Development",
        platform: "microsoft",
        due: "In 7 days, 23:59",
        status: "In progress",
      },
      {
        id: 'mock-m3',
        title: "Database Optimization Project",
        course: "Database Systems",
        platform: "microsoft",
        due: "In 12 days, 17:00",
        status: "Not started",
      }
    ];
    allAssignments[userId] = userAssignments;
    localStorage.setItem('kmaps_mock_assignments', JSON.stringify(allAssignments));
  }
  return userAssignments;
}

function saveMockAssignmentsToStorage(userId, assignments) {
  const raw = localStorage.getItem('kmaps_mock_assignments');
  let allAssignments = {};
  try {
    allAssignments = raw ? JSON.parse(raw) : {};
  } catch {
    allAssignments = {};
  }
  allAssignments[userId] = assignments;
  localStorage.setItem('kmaps_mock_assignments', JSON.stringify(allAssignments));
}