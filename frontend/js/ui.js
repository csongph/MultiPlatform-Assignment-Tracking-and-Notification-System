/**
 * KMAPS UI Module
 * Toast notifications, loading states, component loader, animations
 */

const TOAST_CONTAINER_ID = 'toast-container';

export async function loadComponent(containerId, componentPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(componentPath);
    if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
    container.innerHTML = await response.text();
  } catch (err) {
    console.error('Component load error:', err);
  }
}

export async function loadComponents(components) {
  await Promise.all(
    components.map(({ containerId, path }) => loadComponent(containerId, path))
  );
}

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
    <span class="toast-icon" aria-hidden="true">${iconMap[type] || iconMap.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button type="button" class="toast-close" aria-label="Dismiss notification">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-visible');
  });

  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._dismissTimer = timer;
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast-exit')) return;
  clearTimeout(toast._dismissTimer);
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function setFormLoading(form, isLoading, loadingText = 'Loading...') {
  const submitBtn = form.querySelector('[type="submit"]');
  const inputs = form.querySelectorAll('input, button:not([type="submit"])');
  const btnText = submitBtn?.querySelector('.btn-text');
  const btnSpinner = submitBtn?.querySelector('.btn-spinner');

  form.classList.toggle('form-loading', isLoading);
  form.setAttribute('aria-busy', isLoading ? 'true' : 'false');

  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
  }

  inputs.forEach((input) => {
    if (input !== submitBtn) input.disabled = isLoading;
  });

  if (btnText) btnText.textContent = isLoading ? loadingText : btnText.dataset.defaultText || btnText.textContent;
  if (btnSpinner) btnSpinner.classList.toggle('visible', isLoading);
}

export function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
  if (!button) return;

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

export function initPasswordToggle(form) {
  form.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle-password]');
    if (!toggle) return;

    const targetId = toggle.dataset.togglePassword;
    const input = form.querySelector(`#${targetId}`);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

    const showIcon = toggle.querySelector('.icon-show');
    const hideIcon = toggle.querySelector('.icon-hide');
    if (showIcon && hideIcon) {
      showIcon.classList.toggle('hidden', isPassword);
      hideIcon.classList.toggle('hidden', !isPassword);
    }
  });
}

export function initInputFocusEffects(form) {
  form.querySelectorAll('.input-group').forEach((group) => {
    const input = group.querySelector('input');
    if (!input) return;

    input.addEventListener('focus', () => group.classList.add('focused'));
    input.addEventListener('blur', () => group.classList.remove('focused'));
  });
}

export function initPageAnimations() {
  document.querySelectorAll('.animate-fade-in').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.08}s`;
  });
}

export function initAuthFooter(type) {
  document.querySelector('[data-footer-type="login"]')?.classList.toggle('hidden', type !== 'login');
  document.querySelector('[data-footer-type="register"]')?.classList.toggle('hidden', type !== 'register');
}

export function redirect(path) {
  window.location.href = path;
}
