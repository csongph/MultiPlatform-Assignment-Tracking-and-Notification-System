import {
  requestPasswordRecovery,
  resetPassword,
  verifyPasswordRecoveryCode,
} from './api.js';

const REQUEST_COOLDOWN_SECONDS = 60;
const formIds = ['request-code-form', 'verify-code-form', 'reset-password-form'];
const message = document.getElementById('recovery-message');
const stepCount = document.getElementById('recovery-step-count');
const resendButton = document.getElementById('resend-code-button');
let recoveryEmail = '';
let verifiedCode = '';
let countdownTimer = null;

function showMessage(text, type = 'info') {
  message.textContent = text;
  message.className = `recovery-message recovery-message-${type}`;
}

function showStep(step) {
  formIds.forEach((id, index) => {
    document.getElementById(id).classList.toggle('hidden', index !== step - 1);
  });
  stepCount.textContent = `ขั้นตอนที่ ${step} จาก 3`;
  message.classList.add('hidden');
}

function setFormBusy(form, busy, busyLabel) {
  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('.btn-text');
  if (!button.dataset.defaultText) button.dataset.defaultText = label.textContent;
  button.disabled = busy;
  label.textContent = busy ? busyLabel : button.dataset.defaultText;
}

function startResendCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  let secondsLeft = REQUEST_COOLDOWN_SECONDS;
  resendButton.disabled = true;
  const renderCountdown = () => {
    resendButton.textContent = secondsLeft > 0
      ? `ส่งรหัสอีกครั้งใน ${secondsLeft} วินาที`
      : 'ส่งรหัสอีกครั้ง';
    resendButton.disabled = secondsLeft > 0;
    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    secondsLeft -= 1;
  };
  renderCountdown();
  countdownTimer = setInterval(renderCountdown, 1000);
}

async function sendRecoveryCode() {
  showMessage('กำลังเชื่อมต่อเซิร์ฟเวอร์เพื่อส่งรหัสยืนยัน…', 'info');
  await requestPasswordRecovery(recoveryEmail);
  showStep(2);
  showMessage('หากอีเมลนี้มีบัญชี KMAPS ระบบจะส่งรหัสยืนยันให้ รหัสมีอายุ 10 นาที', 'success');
  startResendCountdown();
}

document.getElementById('request-code-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  recoveryEmail = document.getElementById('recovery-email').value.trim();
  setFormBusy(form, true, 'กำลังส่ง…');
  showMessage('กำลังเชื่อมต่อเซิร์ฟเวอร์…', 'info');
  try {
    await sendRecoveryCode();
  } catch (error) {
    showMessage(error.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่', 'error');
  } finally {
    setFormBusy(form, false, 'กำลังส่ง…');
  }
});

document.getElementById('verify-code-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  setFormBusy(form, true, 'กำลังตรวจสอบ…');
  showMessage('กำลังตรวจสอบรหัสยืนยัน…', 'info');
  try {
    verifiedCode = document.getElementById('recovery-otp').value.trim();
    await verifyPasswordRecoveryCode(
      recoveryEmail,
      verifiedCode,
    );
    showStep(3);
  } catch (error) {
    showMessage(error.message || 'รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่', 'error');
  } finally {
    setFormBusy(form, false, 'กำลังตรวจสอบ…');
  }
});

document.getElementById('reset-password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const newPassword = document.getElementById('new-password').value;
  const confirmation = document.getElementById('confirm-password').value;
  if (newPassword !== confirmation) {
    showMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'error');
    return;
  }
  setFormBusy(form, true, 'กำลังบันทึก…');
  showMessage('กำลังบันทึกรหัสผ่านใหม่…', 'info');
  try {
    await resetPassword(recoveryEmail, verifiedCode, newPassword);
    verifiedCode = '';
    showMessage('เปลี่ยนรหัสผ่านสำเร็จ กำลังกลับไปหน้าเข้าสู่ระบบ…', 'success');
    form.classList.add('hidden');
    stepCount.textContent = 'เสร็จสิ้น';
    setTimeout(() => window.location.replace('login.html'), 1200);
  } catch (error) {
    showMessage(error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาเริ่มกู้คืนใหม่', 'error');
  } finally {
    setFormBusy(form, false, 'กำลังบันทึก…');
  }
});

resendButton.addEventListener('click', async () => {
  resendButton.disabled = true;
  try {
    await sendRecoveryCode();
  } catch (error) {
    showMessage(error.message || 'ส่งรหัสไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่', 'error');
    resendButton.disabled = false;
    resendButton.textContent = 'ส่งรหัสอีกครั้ง';
  }
});

document.getElementById('recovery-otp').addEventListener('input', (event) => {
  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 6);
});
