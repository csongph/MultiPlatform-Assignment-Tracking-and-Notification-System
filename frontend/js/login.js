/**
 * KMAPS Login Page Entry Point
 */

import {
  validateLoginForm,
  applyFieldErrors,
  clearFormErrors,
  setFieldError,
} from './validation.js';
import {
  loadComponents,
  showToast,
  setFormLoading,
  initPasswordToggle,
  initInputFocusEffects,
  initPageAnimations,
  initAuthFooter,
} from './ui.js';
import { handleLogin, resolveAuthError, guardAuthPage } from './auth.js';

async function init() {
  guardAuthPage();

  await loadComponents([
    { containerId: 'auth-header', path: '../components/auth-header.html' },
    { containerId: 'login-form-container', path: '../components/login-form.html' },
    { containerId: 'auth-footer', path: '../components/auth-footer.html' },
  ]);

  const form = document.getElementById('login-form');
  if (!form) return;

  initPasswordToggle(form);
  initInputFocusEffects(form);
  initPageAnimations();
  initAuthFooter('login');

  document.querySelector('.forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Password reset will be available once the reset endpoint is configured.', 'info');
  });

  form.addEventListener('input', (e) => {
    const field = e.target.name;
    if (field) setFieldError(form, field, '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('remember_me') === 'on';

    const validation = validateLoginForm({ email, password });
    if (!validation.valid) {
      applyFieldErrors(form, validation.fieldErrors);
      return;
    }

    setFormLoading(form, true, 'Signing In...');

    try {
      await handleLogin({
        email: validation.values.email,
        password: validation.values.password,
        rememberMe,
      });
    } catch (error) {
      const { message, type } = resolveAuthError(error);
      showToast(message, type);
    } finally {
      setFormLoading(form, false, 'Signing In...');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
