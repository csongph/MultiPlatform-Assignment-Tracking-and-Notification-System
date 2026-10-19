/**
 * KMAPS API Module
 * Centralized Fetch API wrapper for backend communication
 */

import { getAccessToken, clearAuthSession } from './storage.js';

export const FEATURES = {
  customTasks: false, // Backend does not support custom tasks creation/status update/delete
};

const API_BASE_URL = (typeof window !== 'undefined' && window.KMAPS_API_BASE && window.KMAPS_API_BASE.startsWith('http'))
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
  if (typeof window !== 'undefined' && window.KMAPS_USE_MOCK_API === true) {
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
    throw new ApiError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้งในภายหลัง', 0);
  }

  // Handle 401 Unauthorized for authenticated requests
  if (auth && response.status === 401) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthPage = currentPath.includes('login.html') || currentPath.includes('register.html');
    if (!isAuthPage && typeof window !== 'undefined') {
      clearAuthSession();
      sessionStorage.setItem('kmaps_flash_error', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      window.location.href = 'login.html';
      return null;
    }
  }

  // Handle 204 No Content
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
    400: 'คำขอไม่ถูกต้อง กรุณาตรวจสอบข้อมูล',
    401: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    403: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
    404: 'ไม่พบข้อมูลที่ต้องการ',
    409: 'อีเมลนี้ถูกใช้งานในระบบแล้ว',
    422: 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด',
    500: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
  };
  return messages[status] || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
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

export async function disconnectPlatform(provider) {
  // Provider can be short ('google', 'microsoft') or full backend platform name ('google_classroom', 'microsoft_teams')
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

export function normalizePlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'google_classroom' || p === 'google') return 'google';
  if (p === 'microsoft_teams' || p === 'microsoft') return 'microsoft';
  return platform || 'custom';
}

function isValidHttpUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeAssignment(a) {
  const platformSlug = normalizePlatform(a.platform);
  const dueRaw = a.due_at ?? a.due ?? null;
  const dueDate = dueRaw ? new Date(dueRaw) : null;
  const validDue = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;

  return {
    ...a,
    id: a.id,
    title: a.title ?? '(ไม่มีชื่องาน)',
    course: a.course_name ?? a.course ?? 'ไม่ระบุวิชา',
    course_name: a.course_name ?? a.course ?? 'ไม่ระบุวิชา',
    platform: platformSlug,
    raw_platform: a.platform,
    due_at: a.due_at ?? null,
    due: formatDue(validDue),
    dueDate: validDue,
    status: a.computed_status ?? a.status ?? 'Not started',
    computed_status: a.computed_status ?? a.status ?? 'Not started',
    source_status: a.source_status ?? '',
    source_url: isValidHttpUrl(a.source_url) ? a.source_url : '',
  };
}

function formatDue(date) {
  if (!date) return 'ไม่มีกำหนดส่ง';
  return date.toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function getDashboardSummary() {
  return request('/dashboard/summary', { auth: true });
}

export async function getCourses(platform = null) {
  const query = platform ? `?platform=${encodeURIComponent(platform)}` : '';
  return request(`/courses${query}`, { auth: true });
}

export async function getAssignments() {
  const data = await request('/assignments', { auth: true });
  const list = Array.isArray(data) ? data : data?.assignments || [];
  return { assignments: list.map(normalizeAssignment) };
}

export async function queueSync(platform = 'google_classroom') {
  return request('/sync', {
    method: 'POST',
    auth: true,
    body: { platform },
  });
}

export async function getSyncJob(jobId) {
  return request(`/sync/${encodeURIComponent(jobId)}`, { auth: true });
}

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
    const res = await request(`/oauth/${platformSlug}/authorize`, { auth: true });
    if (res?.authorization_url) {
      window.location.href = res.authorization_url;
      return res.authorization_url;
    }
  } catch (err) {
    console.error('Failed to start OAuth flow:', err);
    throw err;
  }
}

export async function connectGoogleClassroom() {
  return connectPlatform('google');
}

export async function connectMicrosoft() {
  return connectPlatform('microsoft');
}

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

export async function adminListAuditLogs({ user = '', action = '', date = '', page = 1 } = {}) {
  const query = new URLSearchParams({ user, action, date, page: String(page) });
  return request(`/admin/audit-logs?${query.toString()}`, { auth: true });
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
  const response = await fetch(`${API_BASE_URL.replace(/\/api\/v1$/, '')}/health`);
  if (!response.ok) {
    throw new ApiError('การตรวจสอบสถานะระบบล้มเหลว', response.status);
  }
  return response.json();
}

/**
 * Download Connections CSV using Bearer token without putting token in URL query
 */
export async function downloadConnectionsCsv() {
  const token = getAccessToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/admin/connections/export`, { headers });
  if (!response.ok) {
    throw new ApiError('ไม่สามารถดาวน์โหลดไฟล์ Connections CSV ได้', response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  let filename = 'connections.csv';
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  triggerBlobDownload(blob, filename);
}

/**
 * Download Audit Logs CSV using Bearer token without putting token in URL query
 */
export async function downloadAuditLogsCsv({ user = '', action = '', date = '' } = {}) {
  const token = getAccessToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const query = new URLSearchParams({ user, action, date });
  const response = await fetch(`${API_BASE_URL}/admin/audit-logs/export?${query.toString()}`, { headers });
  if (!response.ok) {
    throw new ApiError('ไม่สามารถดาวน์โหลดไฟล์ Audit Logs CSV ได้', response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  let filename = 'audit_logs.csv';
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 200);
}

export { ApiError };