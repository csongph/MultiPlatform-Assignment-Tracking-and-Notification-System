import {
  getOnboardingStatus,
  disconnectPlatform,
  connectGoogleClassroom,
  connectMicrosoft,
} from './api.js';
import { requireAuth, logout } from './auth.js';
import { showToast, setButtonLoading } from './ui.js';

const providerLabels = {
  google: 'Google Classroom',
  microsoft: 'Microsoft Teams',
};

async function init() {
  if (!requireAuth()) return;

  document.getElementById('logout-button')?.addEventListener('click', logout);

  document.querySelectorAll('[data-provider]').forEach((button) => {
    button.addEventListener('click', () => toggleProvider(button));
  });

  await refreshStatus();

  // อ่าน Query params หลัง redirect กลับมาจาก OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');
  const oauthError = urlParams.get('oauth_error');
  const synced = urlParams.get('synced');

  if (oauthSuccess === 'google') {
    const msg = synced
      ? `เชื่อมต่อ Google Classroom สำเร็จ! ซิงก์งานได้ ${synced} รายการ`
      : 'เชื่อมต่อ Google Classroom สำเร็จ!';
    showToast(msg, 'success');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (oauthSuccess === 'microsoft') {
    const msg = synced
      ? `เชื่อมต่อ Microsoft Teams สำเร็จ! ซิงก์งานได้ ${synced} รายการ`
      : 'เชื่อมต่อ Microsoft Teams สำเร็จ!';
    showToast(msg, 'success');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (oauthError) {
    const errorMessages = {
      google_denied: 'ยกเลิกการให้สิทธิ์ Google Classroom แล้ว',
      google_failed: 'เชื่อมต่อ Google Classroom ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      microsoft_denied: 'ยกเลิกการให้สิทธิ์ Microsoft Teams แล้ว',
      microsoft_failed: 'เชื่อมต่อ Microsoft Teams ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      invalid_state: 'เซสชันการเชื่อมต่อหมดอายุ กรุณาลองใหม่อีกครั้ง',
      session_expired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    };
    showToast(errorMessages[oauthError] || 'การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง', 'error');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function refreshStatus() {
  try {
    const status = await getOnboardingStatus();
    renderStatus(status?.connections || {});
  } catch {
    showToast('ไม่สามารถดึงข้อมูลสถานะการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง', 'error');
  }
}

async function toggleProvider(button) {
  const provider = button.dataset.provider;
  const card = document.querySelector(`[data-provider-card="${provider}"]`);
  const isConnected = card?.classList.contains('connected');

  // กรณีเชื่อมต่อ: เรียก OAuth authorize URL
  if (!isConnected) {
    setButtonLoading(button, true, 'กำลังเชื่อมต่อ...');
    try {
      if (provider === 'microsoft') {
        await connectMicrosoft();
      } else {
        await connectGoogleClassroom();
      }
    } catch {
      showToast(`ไม่สามารถเริ่มต้นการเชื่อมต่อ ${providerLabels[provider] || provider} ได้`, 'error');
      setButtonLoading(button, false);
    }
    return;
  }

  // กรณียกเลิกการเชื่อมต่อ: เรียก DELETE /oauth/{platform} (204 No Content)
  setButtonLoading(button, true, 'กำลังตัดการเชื่อมต่อ...');
  try {
    await disconnectPlatform(provider);
    showToast(`ตัดการเชื่อมต่อ ${providerLabels[provider]} สำเร็จ`, 'success');
    await refreshStatus();
  } catch (err) {
    showToast(err.message || 'ไม่สามารถตัดการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง', 'error');
  } finally {
    setButtonLoading(button, false);
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
      const shortName = label.split(' ')[0];
      button.textContent = connected ? `Disconnect ${shortName}` : `Connect ${shortName}`;
      button.classList.toggle('btn-danger', connected);
      button.classList.toggle('btn-primary', !connected);
    }
  });

  if (summary) {
    summary.textContent = connectedCount
      ? `เชื่อมต่อแล้ว ${connectedCount} แพลตฟอร์ม คุณสามารถเข้าสู่หน้าแดชบอร์ดได้ทันที`
      : 'เชื่อมต่ออย่างน้อย 1 แพลตฟอร์มเพื่อเริ่มใช้งานแดชบอร์ด';
  }

  if (continueLink) {
    continueLink.classList.toggle('disabled', connectedCount === 0);
    continueLink.setAttribute('aria-disabled', connectedCount === 0 ? 'true' : 'false');
  }
}

document.addEventListener('DOMContentLoaded', init);
