/**
 * KMAPS Mock API Module
 * Loaded dynamically only when window.KMAPS_USE_MOCK_API === true
 */

import { ApiError } from './api.js';
import { getAccessToken } from './storage.js';

const MOCK_DELAY_MS = 350;
const MOCK_USERS_KEY = 'kmaps_mock_users';
const MOCK_CONNECTIONS_KEY = 'kmaps_mock_connections';

export async function mockRequest(endpoint, options = {}) {
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

  if (endpoint === '/dashboard/summary' && method === 'GET') {
    const mockAssignments = getMockAssignmentsFromStorage(session?.id || 'default');
    const courses = [...new Set(mockAssignments.map((a) => a.course))];
    const completed = mockAssignments.filter((a) => ['completed', 'submitted'].includes((a.status || '').toLowerCase())).length;
    return {
      total_courses: courses.length || 3,
      total_assignments: mockAssignments.length || 6,
      due_soon: 1,
      overdue: 0,
      completed: completed || 5,
      connected_platforms: ['google_classroom', 'microsoft_teams'],
    };
  }

  if (endpoint.startsWith('/courses') && method === 'GET') {
    return [
      { id: 'c1', name: 'ฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศ', platform: 'google_classroom', is_deleted: false },
      { id: 'c2', name: 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น', platform: 'google_classroom', is_deleted: false },
      { id: 'c3', name: 'การออกแบบและพัฒนาเว็บไซต์', platform: 'microsoft_teams', is_deleted: false },
    ];
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
        id: 'mock-1',
        title: "ออกแบบฐานข้อมูล Relational Database สำหรับระบบคลังสินค้า",
        course: "ฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศ",
        platform: "google",
        due: "วันนี้, 23:59",
        status: "Not started",
      },
      {
        id: 'mock-2',
        title: "สร้างแบบสอบถาม SQL และ Indexing สำหรับระบบจัดการสินค้า",
        course: "ฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศ",
        platform: "google",
        due: "ส่งแล้วเมื่อวานนี้",
        status: "Completed",
      },
      {
        id: 'mock-3',
        title: "เขียนโปรแกรมคำนวณและประมวลผลข้อมูลด้วย Python",
        course: "การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น",
        platform: "google",
        due: "ส่งแล้วเมื่อวานนี้",
        status: "Completed",
      },
      {
        id: 'mock-4',
        title: "พัฒนาฟังก์ชันการทำงานแบบ OOP และโครงสร้างข้อมูลเบื้องต้น",
        course: "การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น",
        platform: "microsoft",
        due: "ส่งแล้ว 2 วันก่อน",
        status: "Completed",
      },
      {
        id: 'mock-5',
        title: "ออกแบบ Wireframe และ User Journey ด้วย Figma",
        course: "การออกแบบและพัฒนาเว็บไซต์",
        platform: "microsoft",
        due: "ส่งแล้ว 3 วันก่อน",
        status: "Completed",
      },
      {
        id: 'mock-6',
        title: "พัฒนาหน้า Dashboard ด้วย HTML, Tailwind CSS และ Material 3",
        course: "การออกแบบและพัฒนาเว็บไซต์",
        platform: "microsoft",
        due: "ส่งแล้ว 4 วันก่อน",
        status: "Completed",
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
