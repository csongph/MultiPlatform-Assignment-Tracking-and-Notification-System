```javascript
/**
 * KMAPS Storage Module
 * Manages authentication tokens and user profile storage.
 *
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

/**
 * ตั้งค่า Remember Me
 * เก็บค่าการตั้งค่าไว้ใน localStorage เพื่อให้จำข้าม session ได้
 */
export function setRememberMe(value) {
  localStorage.setItem(
    STORAGE_KEYS.REMEMBER_ME,
    value ? 'true' : 'false',
  );
}

export function getRememberMe() {
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
}

/**
 * เลือก storage ตามการตั้งค่า Remember Me
 */
function getActiveStorage() {
  return getRememberMe() ? localStorage : sessionStorage;
}

/**
 * อ่านข้อมูลจาก sessionStorage ก่อน แล้วจึง localStorage
 * รองรับข้อมูลที่อาจยังอยู่ใน storage เก่าจากเวอร์ชันก่อนหน้า
 */
function getItemAnywhere(key) {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

/**
 * บันทึก Access Token
 */
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

/**
 * บันทึก Refresh Token
 */
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

/**
 * บันทึกข้อมูลโปรไฟล์ผู้ใช้และเวลาที่บันทึก
 */
export function setUserProfile(profile) {
  if (!profile) return;

  const storage = getActiveStorage();
  const otherStorage = getRememberMe() ? sessionStorage : localStorage;

  otherStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  otherStorage.removeItem(STORAGE_KEYS.USER_PROFILE_FETCHED_AT);

  storage.setItem(
    STORAGE_KEYS.USER_PROFILE,
    JSON.stringify(profile),
  );

  storage.setItem(
    STORAGE_KEYS.USER_PROFILE_FETCHED_AT,
    String(Date.now()),
  );
}

/**
 * อ่านข้อมูลโปรไฟล์ผู้ใช้
 */
export function getUserProfile() {
  const raw = getItemAnywhere(STORAGE_KEYS.USER_PROFILE);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * อ่านเวลาที่โหลดโปรไฟล์ครั้งล่าสุด
 */
export function getUserProfileFetchedAt() {
  const raw = getItemAnywhere(STORAGE_KEYS.USER_PROFILE_FETCHED_AT);
  return raw ? Number(raw) : 0;
}

/**
 * บันทึก Session หลัง Login
 */
export function setAuthSession({
  accessToken,
  refreshToken,
  expiresIn,
  userProfile,
} = {}) {
  if (accessToken) {
    setAccessToken(accessToken);
  }

  if (refreshToken) {
    setRefreshToken(refreshToken);
  }

  if (expiresIn) {
    const expiresAt = Date.now() + Number(expiresIn) * 1000;
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

  if (userProfile) {
    setUserProfile(userProfile);
  }
}

/**
 * ล้างข้อมูล Session จากทั้ง localStorage และ sessionStorage
 */
export function clearAuthSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

/**
 * ตรวจสอบว่า Token หมดอายุหรือไม่
 */
export function isTokenExpired() {
  const expiresAt = Number(
    getItemAnywhere(STORAGE_KEYS.TOKEN_EXPIRES_AT),
  );

  return Boolean(expiresAt && Date.now() >= expiresAt);
}

/**
 * ตรวจสอบว่าผู้ใช้เข้าสู่ระบบอยู่หรือไม่
 */
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