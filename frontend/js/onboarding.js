```javascript
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

  document.querySelectorAll('[data-provider]').forEach((button) => {
    button.addEventListener('click', () => toggleProvider(button));
  });

  await refreshStatus();

  // Handle OAuth callback.
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');
  const oauthError = urlParams.get('oauth_error');
  const synced = urlParams.get('synced');

  if (oauthSuccess === 'google') {
    const message = synced
      ? `Google Classroom เชื่อมต่อสำเร็จ! ดึงงานได้ ${synced} รายการ`
      : 'Google Classroom เชื่อมต่อสำเร็จ!';

    showToast(message, 'success');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (oauthSuccess === 'microsoft') {
    const message = synced
      ? `Microsoft Teams เชื่อมต่อสำเร็จ! ดึงงานได้ ${synced} รายการ`
      : 'Microsoft Teams เชื่อมต่อสำเร็จ!';

    showToast(message, 'success');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (oauthError) {
    const errorMessages = {
      google_denied: 'ยกเลิกการเชื่อมต่อ Google Classroom แล้ว',
      google_failed: 'เชื่อมต่อ Google Classroom ไม่สำเร็จ กรุณาลองใหม่',
      microsoft_denied: 'ยกเลิกการเชื่อมต่อ Microsoft Teams แล้ว',
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

    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function refreshStatus() {
  try {
    const status = await getOnboardingStatus();
    renderStatus(status?.connections || {});
  } catch {
    showToast(
      'ไม่สามารถโหลดสถานะการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง',
      'error',
    );
  }
}

async function toggleProvider(button) {
  const provider = button.dataset.provider;
  const card = document.querySelector(
    `[data-provider-card="${provider}"]`,
  );
  const isConnected = card?.classList.contains('connected');

  // Connect through OAuth.
  if (!isConnected) {
    setButtonLoading(button, true, 'Connecting...');

    try {
      if (provider === 'google') {
        await connectGoogleClassroom();
      } else if (provider === 'microsoft') {
        await connectMicrosoft();
      } else {
        throw new Error('Unsupported platform');
      }
    } catch (error) {
      showToast(
        error?.message ||
          `Unable to connect ${providerLabels[provider] || provider}. Please try again.`,
        'error',
      );

      setButtonLoading(button, false);
    }

    return;
  }

  // Disconnect an existing connection.
  setButtonLoading(button, true, 'Disconnecting...');

  try {
    await disconnectPlatform(provider);

    showToast(
      `${providerLabels[provider] || provider} disconnected successfully.`,
      'success',
    );

    await refreshStatus();
  } catch (error) {
    showToast(
      error?.message || 'Unable to disconnect. Please try again.',
      'error',
    );
  } finally {
    setButtonLoading(button, false);
  }
}

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
      const shortName = label.split(' ')[0];

      button.textContent = connected
        ? `Disconnect ${shortName}`
        : `Connect ${shortName}`;

      button.classList.toggle('btn-danger', connected);
      button.classList.toggle('btn-primary', !connected);
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
  }
}

document.addEventListener('DOMContentLoaded', init);
```