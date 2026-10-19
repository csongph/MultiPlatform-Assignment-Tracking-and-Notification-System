/**
 * KMAPS Storage Module
 * Manages authentication tokens and user profile in localStorage / sessionStorage
 * based on the Remember Me preference.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kmaps_access_token',
  REFRESH_TOKEN: 'kmaps_refresh_token',
  USER_PROFILE: 'kmaps_user_profile',
  USER_PROFILE_FETCHED_AT: 'kmaps_user_profile_fetched_at',
  REMEMBER_ME: 'kmaps_remember_me',
  TOKEN_EXPIRES_AT: 'kmaps_token_expires_at',
  MOCK_SESSION_USER_ID: 'kmaps_mock_session_user_id',
};

export function setRememberMe(value) {
  const isRemember = Boolean(value);
  localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, isRemember ? 'true' : 'false');
}

export function getRememberMe() {
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
}

function getActiveStorage() {
  return getRememberMe() ? localStorage : sessionStorage;
}

function getItemAnywhere(key) {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function setAccessToken(token) {
  if (token) {
    // If not remember me, remove from localStorage just in case, save to sessionStorage
    if (getRememberMe()) {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }
  }
}

export function getAccessToken() {
  return getItemAnywhere(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setRefreshToken(token) {
  if (token) {
    if (getRememberMe()) {
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    }
  }
}

export function getRefreshToken() {
  return getItemAnywhere(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setUserProfile(profile) {
  if (profile) {
    const serialized = JSON.stringify(profile);
    const now = String(Date.now());
    const storage = getActiveStorage();
    storage.setItem(STORAGE_KEYS.USER_PROFILE, serialized);
    storage.setItem(STORAGE_KEYS.USER_PROFILE_FETCHED_AT, now);
  }
}

export function getUserProfile() {
  const raw = getItemAnywhere(STORAGE_KEYS.USER_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getUserProfileFetchedAt() {
  const raw = getItemAnywhere(STORAGE_KEYS.USER_PROFILE_FETCHED_AT);
  return raw ? Number(raw) : 0;
}

export function setAuthSession({ accessToken, refreshToken, expiresIn, userProfile }) {
  if (accessToken) setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
  if (expiresIn) {
    const expiresAt = Date.now() + expiresIn * 1000;
    const storage = getActiveStorage();
    storage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, String(expiresAt));
  }
  if (userProfile) setUserProfile(userProfile);
}

export function clearAuthSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function isTokenExpired() {
  const expiresAt = Number(getItemAnywhere(STORAGE_KEYS.TOKEN_EXPIRES_AT));
  return Boolean(expiresAt && Date.now() > expiresAt);
}

export function isAuthenticated() {
  const token = getAccessToken();
  if (!token || token === 'mock-preview-session-token') return false;

  if (isTokenExpired()) {
    clearAuthSession();
    return false;
  }

  return true;
}
