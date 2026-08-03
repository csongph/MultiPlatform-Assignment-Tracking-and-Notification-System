/**
 * KMAPS Register Page Entry Point
 */

import {
  validateRegisterForm,
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
import { handleRegister, resolveAuthError, guardAuthPage } from './auth.js';

async function init() {
  guardAuthPage();

  await loadComponents([
    { containerId: 'auth-header', path: '../components/auth-header.html' },
    { containerId: 'register-form-container', path: '../components/register-form.html' },
    { containerId: 'auth-footer', path: '../components/auth-footer.html' },
  ]);

  const form = document.getElementById('register-form');
  if (!form) return;

  initPasswordToggle(form);
  initInputFocusEffects(form);
  initPageAnimations();
  initAuthFooter('register');

  form.addEventListener('input', (e) => {
    const field = e.target.name;
    if (field) setFieldError(form, field, '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const formData = new FormData(form);
    const full_name = formData.get('full_name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirm_password = formData.get('confirm_password');

    const validation = validateRegisterForm({
      full_name,
      email,
      password,
      confirm_password,
    });

    if (!validation.valid) {
      applyFieldErrors(form, validation.fieldErrors);
      return;
    }

    setFormLoading(form, true, 'Creating Account...');

    try {
      await handleRegister({
        full_name: validation.values.full_name,
        email: validation.values.email,
        password: validation.values.password,
      });
    } catch (error) {
      const { message, type } = resolveAuthError(error);
      showToast(message, type);
    } finally {
      setFormLoading(form, false, 'Creating Account...');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
