/**
 * KMAPS Storage Module
 * Manages authentication tokens and user profile in localStorage
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kmaps_access_token',
  REFRESH_TOKEN: 'kmaps_refresh_token',
  USER_PROFILE: 'kmaps_user_profile',
  REMEMBER_ME: 'kmaps_remember_me',
  TOKEN_EXPIRES_AT: 'kmaps_token_expires_at',
  MOCK_SESSION_USER_ID: 'kmaps_mock_session_user_id',
};

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }
}

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setUserProfile(profile) {
  if (profile) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  }
}

export function getUserProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setRememberMe(value) {
  localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, value ? 'true' : 'false');
}

export function getRememberMe() {
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
}

export function setAuthSession({ accessToken, refreshToken, expiresIn, userProfile }) {
  setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
  if (expiresIn) {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, String(expiresAt));
  }
  if (userProfile) setUserProfile(userProfile);
}

export function clearAuthSession() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export function isTokenExpired() {
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT));
  return Boolean(expiresAt && Date.now() > expiresAt);
}

export function isAuthenticated() {
  if (!getAccessToken()) return false;

  if (isTokenExpired()) {
    clearAuthSession();
    return false;
  }

  return true;
}
