import { getOnboardingStatus, updateOnboardingConnection, connectGoogleClassroom, connectMicrosoft } from './api.js';
import { requireAuth, logout } from './auth.js';
import { showToast, setButtonLoading } from './ui.js';
import { initNavigation } from './navigation.js';

const providerLabels = {
  google: 'Google Classroom',
  microsoft: 'Microsoft Teams',
};

async function init() {
  if (!requireAuth()) return;

  // โหลด Navigation Bar (Sidebar สีม่วง + Topbar สีเขียวมะนาว)
  initNavigation('overview');

  document.getElementById('logout-button')?.addEventListener('click', logout);

  document.querySelectorAll('[data-provider]').forEach((button) => {
    button.addEventListener('click', () => toggleProvider(button));
  });

  await refreshStatus();

  // แสดงผลหลังจาก Google OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');
  const oauthError = urlParams.get('oauth_error');
  const synced = urlParams.get('synced');

  if (oauthSuccess === 'google') {
    const msg = synced ? `Google Classroom เชื่อมต่อสำเร็จ! ดึงงานได้ ${synced} รายการ` : 'Google Classroom เชื่อมต่อสำเร็จ!';
    showToast(msg, 'success');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (oauthSuccess === 'microsoft') {
    const msg = synced ? `Microsoft Teams / To Do เชื่อมต่อสำเร็จ! ดึงงานได้ ${synced} รายการ` : 'Microsoft Teams / To Do เชื่อมต่อสำเร็จ!';
    showToast(msg, 'success');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (oauthError) {
    const errorMessages = {
      google_denied: 'ยกเลิกการเข้าสู่ระบบ Google แล้ว',
      google_failed: 'เชื่อมต่อ Google Classroom ไม่สำเร็จ กรุณาลองใหม่',
      microsoft_denied: 'ยกเลิกการเข้าสู่ระบบ Microsoft แล้ว',
      microsoft_failed: 'เชื่อมต่อ Microsoft ไม่สำเร็จ กรุณาลองใหม่',
      invalid_state: 'Session หมดอายุ กรุณาลองใหม่',
      session_expired: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
    };
    showToast(errorMessages[oauthError] || 'การเชื่อมต่อล้มเหลว กรุณาลองใหม่', 'error');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function refreshStatus() {
  try {
    const status = await getOnboardingStatus();
    renderStatus(status.connections || {});
  } catch {
    showToast('Unable to load platform status. Please sign in again.', 'error');
  }
}

async function toggleProvider(button) {
  const provider = button.dataset.provider;
  const card = document.querySelector(`[data-provider-card="${provider}"]`);
  const isConnected = card?.classList.contains('connected');

  // Google/Microsoft connect → ใช้ OAuth flow จริง
  if ((provider === 'google' || provider === 'microsoft') && !isConnected) {
    setButtonLoading(button, true, 'Connecting...');
    if (provider === 'microsoft') {
      connectMicrosoft();
    } else {
      connectGoogleClassroom();
    }
    return;
  }

  let nextStatus = null;
  setButtonLoading(button, true, isConnected ? 'Disconnecting...' : 'Connecting...');

  try {
    nextStatus = await updateOnboardingConnection(provider, !isConnected);
    showToast(
      `${providerLabels[provider]} ${isConnected ? 'disconnected' : 'connected'} successfully.`,
      'success'
    );
  } catch {
    showToast('Unable to update connection. Please try again.', 'error');
  } finally {
    setButtonLoading(button, false);
    if (nextStatus) renderStatus(nextStatus.connections || {});
  }
}

function renderStatus(connections) {
  const connectedCount = Object.values(connections).filter(Boolean).length;
  const continueLink = document.getElementById('continue-link');
  const summary = document.getElementById('connection-summary');

  Object.entries(providerLabels).forEach(([provider, label]) => {
    const card = document.querySelector(`[data-provider-card="${provider}"]`);
    const button = document.querySelector(`[data-provider="${provider}"]`);
    const connected = Boolean(connections[provider]);

    card?.classList.toggle('connected', connected);

    if (button) {
      button.textContent = connected ? `Disconnect ${label.split(' ')[0]}` : `Connect ${label.split(' ')[0]}`;
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
    continueLink.setAttribute('aria-disabled', connectedCount === 0 ? 'true' : 'false');
  }
}

document.addEventListener('DOMContentLoaded', init);
