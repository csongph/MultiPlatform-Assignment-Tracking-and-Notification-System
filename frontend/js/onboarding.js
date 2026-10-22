/**
 * KMAPS Onboarding Page
 * จัดการการเชื่อมต่อ Google Classroom และ Microsoft Teams
 */

import {
  getOnboardingStatus,
  disconnectPlatform,
  connectGoogleClassroom,
  connectMicrosoft,
} from './api.js';

import { requireAuth, getSignedInUser, logout } from './auth.js';
import { getUserProfile } from './storage.js';
import { showToast, setButtonLoading } from './ui.js';
import { initSidebar, updateSidebarAdminStatus } from './sidebar.js';

const providerLabels = {
  google: 'Google Classroom',
  microsoft: 'Microsoft Teams',
};

async function init() {
  if (!requireAuth()) return;

  // Initialize shared sidebar component.
  await initSidebar({
    container: 'sidebar-container',
    active: 'onboarding',
    onNavigate: (tabId) => {
      if (tabId === 'assignments') {
        window.location.href = 'assignments.html';
        return true;
      }
      return false;
    },
  });

  await renderUserProfile();

  document
    .getElementById('logout-button')
    ?.addEventListener('click', logout);

  setupSearchFilter();

  // Bind provider buttons.
  document.querySelectorAll('[data-provider]').forEach((button) => {
    button.addEventListener('click', () => toggleProvider(button));
  });

  await refreshStatus();

  // Handle OAuth callback.
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');
  const oauthError = urlParams.get('oauth_error');
  const synced = urlParams.get('synced');
  const syncError = urlParams.get('sync_error');
  const syncReason = urlParams.get('sync_reason');

  if (oauthSuccess === 'google') {
    const message = synced
      ? `Google Classroom เชื่อมต่อสำเร็จ! ดึงงานได้ ${synced} รายการ`
      : 'Google Classroom เชื่อมต่อสำเร็จ!';

    showToast(syncError ? 'เชื่อมต่อ Google Classroom แล้ว แต่ดึงข้อมูลไม่สำเร็จ กรุณากดซิงก์อีกครั้ง' : message, syncError ? 'warning' : 'success');
    cleanOAuthUrl();
  } else if (oauthSuccess === 'microsoft') {
    const message = synced
      ? `Microsoft Teams เชื่อมต่อสำเร็จ! ดึงงานได้ ${synced} รายการ`
      : 'Microsoft Teams เชื่อมต่อสำเร็จ!';

    const microsoftSyncMessages = {
      no_classes: 'เชื่อม Microsoft แล้ว แต่บัญชีนี้ไม่พบชั้นเรียน Teams Education ที่เข้าถึงได้ ตรวจว่าใช้บัญชีโรงเรียนและเข้าร่วมชั้นเรียนแล้ว',
      no_assignments: 'เชื่อม Microsoft แล้ว แต่ไม่พบงานที่เผยแพร่ในชั้นเรียนที่เข้าถึงได้',
      permission_denied: 'Microsoft Graph ปฏิเสธสิทธิ์ Education (403) ให้ผู้ดูแล Microsoft 365 ตรวจ admin consent และสิทธิ์ Education ของ tenant',
      token_expired: 'โทเคน Microsoft หมดอายุและต่ออายุไม่สำเร็จ ให้ยกเลิกการเชื่อมต่อแล้วเชื่อม Microsoft ใหม่',
      provider_error: 'เชื่อม Microsoft แล้ว แต่ซิงก์ข้อมูลไม่สำเร็จ ตรวจบรรทัด Provider sync ในหน้าต่าง backend',
    };
    const syncMessage = syncError
      ? microsoftSyncMessages[syncReason] || microsoftSyncMessages.provider_error
      : message;
    showToast(syncMessage, syncError ? 'warning' : 'success');
    cleanOAuthUrl();
  } else if (oauthError) {
    const syncError = urlParams.get('sync_error') === '1';
    const errorMessages = {
      google_denied: 'ยกเลิกการเข้าสู่ระบบ Google แล้ว',
      google_failed: 'เชื่อมต่อ Google Classroom ไม่สำเร็จ กรุณาลองใหม่',
      google_admin_consent_required: 'Google Classroom ต้องการสิทธิ์เพิ่มเติม กรุณาตรวจสอบการตั้งค่า OAuth และสิทธิ์ Classroom API',
      google_service_unavailable: 'ระบบตรวจสอบเซสชันเชื่อมต่อใช้งานไม่ได้ กรุณาตรวจ Redis แล้วเริ่มเชื่อมต่อใหม่',
      microsoft_service_unavailable: 'ระบบตรวจสอบเซสชันเชื่อมต่อใช้งานไม่ได้ กรุณาตรวจ Redis แล้วเริ่มเชื่อมต่อใหม่',
      microsoft_denied: 'ยกเลิกการเข้าสู่ระบบ Microsoft แล้ว',
      microsoft_failed: 'เชื่อมต่อ Microsoft Teams ไม่สำเร็จ กรุณาลองใหม่',
      microsoft_admin_consent_required:
        'ต้องรอผู้ดูแลระบบ KMITL อนุมัติสิทธิ์ก่อนจึงเชื่อมต่อได้',
      admin_consent_required:
        'ต้องรอผู้ดูแลระบบ KMITL อนุมัติสิทธิ์ก่อนจึงเชื่อมต่อได้',
      invalid_state: 'เซสชันการเชื่อมต่อหมดอายุ กรุณาลองใหม่อีกครั้ง',
      session_expired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    };

    showToast(
      syncError
        ? 'เชื่อมต่อบัญชีแล้ว แต่ดึงข้อมูลจากแพลตฟอร์มไม่สำเร็จ ตรวจสอบสิทธิ์ Classroom API และ log ของ backend'
        : errorMessages[oauthError] || 'การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง',
      syncError ? 'warning' : 'error',
    );

    cleanOAuthUrl();
  }
}

/**
 * แสดงข้อมูลผู้ใช้งานบนแถบด้านบน
 */
async function renderUserProfile() {
  let user = getUserProfile();
  if (!user) {
    try {
      user = await getSignedInUser();
    } catch {
      user = null;
    }
  }

  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-role-badge');

  const displayName =
    user?.full_name || user?.display_name || user?.name || user?.email || 'ผู้ใช้งาน';

  if (nameEl) {
    nameEl.textContent = displayName;
  }

  if (roleEl) {
    roleEl.textContent = user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักเรียน';
  }

  if (user?.role === 'admin') {
    updateSidebarAdminStatus(true);
  }
}

/**
 * กรองการ์ดแพลตฟอร์มจากช่องค้นหาด้านบน
 */
function setupSearchFilter() {
  const searchInput = document.getElementById('search-platform-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (event) => {
    const query = (event.target.value || '').trim().toLowerCase();
    document.querySelectorAll('[data-provider-card]').forEach((card) => {
      const text = (card.textContent || '').toLowerCase();
      card.classList.toggle('hidden', Boolean(query && !text.includes(query)));
    });
  });
}

/**
 * ลบ OAuth parameters หลังแสดงผลแล้ว
 */
function cleanOAuthUrl() {
  window.history.replaceState({}, '', window.location.pathname);
}

/**
 * โหลดสถานะการเชื่อมต่อจาก API
 */
async function refreshStatus() {
  try {
    const status = await getOnboardingStatus();
    renderStatus(status?.connections || {});
  } catch (error) {
    console.error('[Onboarding] Failed to load status:', error);

    showToast(
      'ไม่สามารถโหลดสถานะการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง',
      'error',
    );
  }
}

/**
 * เชื่อมต่อหรือยกเลิกการเชื่อมต่อแพลตฟอร์ม
 */
async function toggleProvider(button) {
  const provider = button.dataset.provider;
  const card = document.querySelector(
    `[data-provider-card="${provider}"]`,
  );

  if (!providerLabels[provider]) {
    showToast('ไม่พบแพลตฟอร์มที่ต้องการเชื่อมต่อ', 'error');
    return;
  }

  const isConnected = card?.classList.contains('connected');

  setButtonLoading(
    button,
    true,
    isConnected ? 'กำลังยกเลิกการเชื่อมต่อ...' : 'กำลังเชื่อมต่อ...',
  );

  try {
    if (isConnected) {
      await disconnectPlatform(provider);

      showToast(
        `${providerLabels[provider]} ยกเลิกการเชื่อมต่อแล้ว`,
        'success',
      );

      await refreshStatus();
      return;
    }

    // เริ่ม OAuth flow ของแพลตฟอร์มที่เลือก
    if (provider === 'google') {
      await connectGoogleClassroom();
    } else if (provider === 'microsoft') {
      await connectMicrosoft();
    }
  } catch (error) {
    console.error(`[Onboarding] ${provider} action failed:`, error);

    showToast(
      error?.message ||
        `ไม่สามารถดำเนินการกับ ${providerLabels[provider]} ได้ กรุณาลองใหม่`,
      'error',
    );
  } finally {
    setButtonLoading(button, false);
  }
}

/**
 * แสดงสถานะการเชื่อมต่อบนหน้าเว็บ
 */
function renderStatus(connections) {
  const normalized = {
    google: Boolean(connections.google ?? connections.google_classroom),
    microsoft: Boolean(connections.microsoft ?? connections.microsoft_teams),
  };

  const totalPlatforms = Object.keys(providerLabels).length;
  const connectedCount = Object.values(normalized).filter(Boolean).length;
  const pendingCount = Math.max(0, totalPlatforms - connectedCount);

  const continueLink = document.getElementById('continue-link');
  const summary = document.getElementById('connection-summary');
  const statTotalEl = document.getElementById('stat-total-platforms');
  const statConnectedEl = document.getElementById('stat-connected-count');
  const statPendingEl = document.getElementById('stat-pending-count');

  if (statTotalEl) statTotalEl.textContent = String(totalPlatforms);
  if (statConnectedEl) statConnectedEl.textContent = String(connectedCount);
  if (statPendingEl) statPendingEl.textContent = String(pendingCount);

  Object.entries(providerLabels).forEach(([provider, label]) => {
    const card = document.querySelector(
      `[data-provider-card="${provider}"]`,
    );

    const button = document.querySelector(
      `[data-provider="${provider}"]`,
    );

    const statusBadge = document.getElementById(`${provider}-status-badge`);
    const connected = Boolean(normalized[provider]);

    card?.classList.toggle('connected', connected);

    if (statusBadge) {
      statusBadge.innerHTML = connected
        ? `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            เชื่อมต่อแล้ว
          </span>
        `
        : `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            ยังไม่ได้เชื่อมต่อ
          </span>
        `;
    }

    if (button) {
      button.textContent = connected
        ? `ยกเลิกการเชื่อมต่อ ${label}`
        : `เชื่อมต่อ ${label}`;

      button.classList.toggle('btn-danger', connected);
      button.classList.toggle('btn-primary', !connected);
      button.disabled = false;
    }
  });

  if (summary) {
    summary.textContent = connectedCount
      ? `เชื่อมต่อแล้ว ${connectedCount} แพลตฟอร์ม คุณสามารถเข้าสู่หน้าแดชบอร์ดได้ทันที`
      : 'เชื่อมต่ออย่างน้อย 1 แพลตฟอร์มเพื่อปลดล็อกแดชบอร์ดของคุณ';
  }

  if (continueLink) {
    continueLink.classList.toggle('disabled', connectedCount === 0);
    continueLink.setAttribute(
      'aria-disabled',
      connectedCount === 0 ? 'true' : 'false',
    );

    if (connectedCount === 0) {
      continueLink.setAttribute('tabindex', '-1');
    } else {
      continueLink.removeAttribute('tabindex');
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
