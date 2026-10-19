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

import { requireAuth, logout } from './auth.js';
import { showToast, setButtonLoading } from './ui.js';
import { initNavigation } from './navigation.js';

const providerLabels = {
  google: 'Google Classroom',
  microsoft: 'Microsoft Teams',
};

async function init() {
  if (!requireAuth()) return;

  // Initialize navigation.
  initNavigation('overview');

  document
    .getElementById('logout-button')
    ?.addEventListener('click', logout);

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

    showToast(syncError ? 'เชื่อมต่อ Microsoft Teams แล้ว แต่ดึงข้อมูลไม่สำเร็จ กรุณากดซิงก์อีกครั้ง' : message, syncError ? 'warning' : 'success');
    cleanOAuthUrl();
  } else if (oauthError) {
    const errorMessages = {
      google_denied: 'ยกเลิกการเข้าสู่ระบบ Google แล้ว',
      google_failed: 'เชื่อมต่อ Google Classroom ไม่สำเร็จ กรุณาลองใหม่',
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
      errorMessages[oauthError] ||
        'การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง',
      'error',
    );

    cleanOAuthUrl();
  }
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
    isConnected ? 'Disconnecting...' : 'Connecting...',
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
  const connectedCount = Object.values(connections).filter(Boolean).length;
  const continueLink = document.getElementById('continue-link');
  const summary = document.getElementById('connection-summary');

  Object.entries(providerLabels).forEach(([provider, label]) => {
    const card = document.querySelector(
      `[data-provider-card="${provider}"]`,
    );

    const button = document.querySelector(
      `[data-provider="${provider}"]`,
    );

    const connected = Boolean(connections[provider]);

    card?.classList.toggle('connected', connected);

    if (button) {
      const shortName = provider === 'google' ? 'Google' : 'Microsoft';

      button.textContent = connected
        ? `Disconnect ${shortName}`
        : `Connect ${shortName}`;

      button.classList.toggle('btn-danger', connected);
      button.classList.toggle('btn-primary', !connected);
      button.disabled = false;
    }
  });

  if (summary) {
    summary.textContent = connectedCount
      ? `${connectedCount} platform${connectedCount > 1 ? 's' : ''} connected. You can continue to the dashboard.`
      : 'Connect one platform to unlock your dashboard.';
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
