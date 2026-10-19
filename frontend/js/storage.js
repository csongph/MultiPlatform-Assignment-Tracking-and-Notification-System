```javascript
/**
 * KMAPS Storage Module
 * Manages authentication tokens and user profile storage.
 * Remember Me enabled  -> localStorage
 * Remember Me disabled -> sessionStorage
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

  localStorage.setItem(
    STORAGE_KEYS.REMEMBER_ME,
    isRemember ? 'true' : 'false',
  );
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
  if (!token) return;

  const storage = getActiveStorage();
  const otherStorage = getRememberMe() ? sessionStorage : localStorage;

  otherStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export function getAccessToken() {
  return getItemAnywhere(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setRefreshToken(token) {
  if (!token) return;

  const storage = getActiveStorage();
  const otherStorage = getRememberMe() ? sessionStorage : localStorage;

  otherStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
}

export function getRefreshToken() {
  return getItemAnywhere(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setUserProfile(profile) {
  if (!profile) return;

  const storage = getActiveStorage();
  const otherStorage = getRememberMe() ? sessionStorage : localStorage;

  otherStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  otherStorage.removeItem(STORAGE_KEYS.USER_PROFILE_FETCHED_AT);

  storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  storage.setItem(
    STORAGE_KEYS.USER_PROFILE_FETCHED_AT,
    String(Date.now()),
  );
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

export function setAuthSession({
  accessToken,
  refreshToken,
  expiresIn,
  userProfile,
}) {
  if (accessToken) setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);

  if (expiresIn) {
    const expiresAt = Date.now() + expiresIn * 1000;
    const storage = getActiveStorage();
    const otherStorage = getRememberMe()
      ? sessionStorage
      : localStorage;

    otherStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    storage.setItem(
      STORAGE_KEYS.TOKEN_EXPIRES_AT,
      String(expiresAt),
    );
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
  const expiresAt = Number(
    getItemAnywhere(STORAGE_KEYS.TOKEN_EXPIRES_AT),
  );

  return Boolean(expiresAt && Date.now() > expiresAt);
}

export function isAuthenticated() {
  const token = getAccessToken();

  if (!token || token === 'mock-preview-session-token') {
    return false;
  }

  if (isTokenExpired()) {
    clearAuthSession();
    return false;
  }

  return true;
}
```