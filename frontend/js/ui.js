```javascript
/**
 * KMAPS UI Module
 * Toast notifications, loading states, component loader, animations
 */

const TOAST_CONTAINER_ID = 'toast-container';

/**
 * โหลด HTML Component ลงใน Container
 */
export async function loadComponent(containerId, componentPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(componentPath);

    if (!response.ok) {
      throw new Error(`Failed to load ${componentPath}`);
    }

    container.innerHTML = await response.text();
  } catch (error) {
    console.error('Component load error:', error);
  }
}

/**
 * โหลด Components หลายรายการพร้อมกัน
 */
export async function loadComponents(components) {
  await Promise.all(
    components.map(({ containerId, path }) =>
      loadComponent(containerId, path),
    ),
  );
}

/**
 * สร้าง Toast Container หากยังไม่มี
 */
export function initToastContainer() {
  if (document.getElementById(TOAST_CONTAINER_ID)) return;

  const container = document.createElement('div');

  container.id = TOAST_CONTAINER_ID;
  container.className = 'toast-container';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Notifications');
  container.setAttribute('aria-live', 'polite');

  document.body.appendChild(container);
}

/**
 * แสดง Toast Notification
 */
export function showToast(message, type = 'info', duration = 5000) {
  initToastContainer();

  const container = document.getElementById(TOAST_CONTAINER_ID);
  const toast = document.createElement('div');

  toast.className = `toast toast-${type} toast-enter`;
  toast.setAttribute('role', 'alert');

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i',
  };

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">
      ${iconMap[type] || iconMap.info}
    </span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button
      type="button"
      class="toast-close"
      aria-label="Dismiss notification"
    >&times;</button>
  `;

  const closeButton = toast.querySelector('.toast-close');

  closeButton.addEventListener('click', () => {
    dismissToast(toast);
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-visible');
  });

  toast._dismissTimer = setTimeout(() => {
    dismissToast(toast);
  }, duration);
}

/**
 * ซ่อนและนำ Toast ออกจาก DOM
 */
function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast-exit')) return;

  clearTimeout(toast._dismissTimer);

  toast.classList.remove('toast-visible');
  toast.classList.add('toast-exit');

  toast.addEventListener(
    'animationend',
    () => toast.remove(),
    { once: true },
  );

  // ป้องกัน Toast ค้าง หากไม่มี animationend event
  toast._removeFallbackTimer = setTimeout(() => {
    toast.remove();
  }, 1000);
}

/**
 * Escape HTML special characters to prevent HTML injection.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * จัดการสถานะ Loading ของ Form
 */
export function setFormLoading(
  form,
  isLoading,
  loadingText = 'Loading...',
) {
  if (!form) return;

  const submitButton = form.querySelector('[type="submit"]');
  const inputs = form.querySelectorAll(
    'input, button:not([type="submit"]), select, textarea',
  );

  const buttonText = submitButton?.querySelector('.btn-text');
  const buttonSpinner = submitButton?.querySelector('.btn-spinner');

  form.classList.toggle('form-loading', isLoading);
  form.setAttribute('aria-busy', isLoading ? 'true' : 'false');

  if (submitButton) {
    if (buttonText && !buttonText.dataset.defaultText) {
      buttonText.dataset.defaultText = buttonText.textContent;
    }

    submitButton.disabled = isLoading;

    submitButton.setAttribute(
      'aria-disabled',
      isLoading ? 'true' : 'false',
    );
  }

  inputs.forEach((input) => {
    input.disabled = isLoading;
  });

  if (buttonText) {
    buttonText.textContent = isLoading
      ? loadingText
      : buttonText.dataset.defaultText || buttonText.textContent;
  }

  if (buttonSpinner) {
    buttonSpinner.classList.toggle('visible', isLoading);
  }
}

/**
 * จัดการสถานะ Loading ของปุ่มทั่วไป
 */
export function setButtonLoading(
  button,
  isLoading,
  loadingText = 'Loading...',
) {
  if (!button) return;

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = isLoading;

  button.setAttribute(
    'aria-disabled',
    isLoading ? 'true' : 'false',
  );

  button.textContent = isLoading
    ? loadingText
    : button.dataset.defaultText;
}

/**
 * แสดงหรือซ่อนรหัสผ่าน
 */
export function initPasswordToggle(form) {
  if (!form) return;

  form.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle-password]');

    if (!toggle || !form.contains(toggle)) return;

    const targetId = toggle.dataset.togglePassword;
    const input = form.querySelector(`#${targetId}`);

    if (!input) return;

    const isPassword = input.type === 'password';

    input.type = isPassword ? 'text' : 'password';

    toggle.setAttribute(
      'aria-pressed',
      isPassword ? 'true' : 'false',
    );

    toggle.setAttribute(
      'aria-label',
      isPassword ? 'Hide password' : 'Show password',
    );

    const showIcon = toggle.querySelector('.icon-show');
    const hideIcon = toggle.querySelector('.icon-hide');

    if (showIcon && hideIcon) {
      showIcon.classList.toggle('hidden', isPassword);
      hideIcon.classList.toggle('hidden', !isPassword);
    }
  });
}

/**
 * เพิ่ม Effect เมื่อ Focus ช่องกรอกข้อมูล
 */
export function initInputFocusEffects(form) {
  if (!form) return;

  form.querySelectorAll('.input-group').forEach((group) => {
    const input = group.querySelector('input');

    if (!input) return;

    input.addEventListener('focus', () => {
      group.classList.add('focused');
    });

    input.addEventListener('blur', () => {
      group.classList.remove('focused');
    });
  });
}

/**
 * เริ่ม Animation ขององค์ประกอบในหน้า
 */
export function initPageAnimations() {
  document.querySelectorAll('.animate-fade-in').forEach((element, index) => {
    element.style.animationDelay = `${index * 0.08}s`;
  });
}

/**
 * แสดง Footer ตามประเภทหน้า Login หรือ Register
 */
export function initAuthFooter(type) {
  document
    .querySelector('[data-footer-type="login"]')
    ?.classList.toggle('hidden', type !== 'login');

  document
    .querySelector('[data-footer-type="register"]')
    ?.classList.toggle('hidden', type !== 'register');
}

/**
 * เปลี่ยนหน้าเว็บ
 */
export function redirect(path) {
  window.location.href = path;
}
```