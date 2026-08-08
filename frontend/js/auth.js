/**
 * KMAPS Auth Module
 * Shared authentication logic, error handling, post-login routing
 */

import { loginUser, registerUser, getOnboardingStatus, getCurrentUser, ApiError } from './api.js';
import {
  setAuthSession,
  setRememberMe,
  isAuthenticated,
  clearAuthSession,
  getUserProfile,
} from './storage.js';
import { showToast, redirect } from './ui.js';

export function resolveAuthError(error) {
  if (!(error instanceof ApiError)) {
    return { message: 'An unexpected error occurred.', type: 'error' };
  }

  if (error.status === 0) {
    return { message: error.message, type: 'error' };
  }

  const statusMap = {
    400: { message: error.message || 'Email already exists.', type: 'error' },
    401: { message: 'Invalid email or password.', type: 'error' },
    403: { message: 'Your account has been disabled. Please contact support.', type: 'warning' },
    409: { message: 'Email already exists.', type: 'error' },
    422: { message: error.message || 'Please enter a valid email address and password.', type: 'error' },
    500: { message: 'Server error. Please try again later.', type: 'error' },
  };

  return statusMap[error.status] || { message: error.message || 'An error occurred.', type: 'error' };
}

export async function handleLogin({ email, password, rememberMe = false }) {
  const response = await loginUser({ email, password });

  setAuthSession({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
  });

  setRememberMe(rememberMe);

  try {
    const user = await getCurrentUser();
    if (user) {
      setAuthSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        expiresIn: response.expires_in,
        userProfile: user,
      });
    }
  } catch {
    /* Profile fetch is optional; tokens are sufficient */
  }

  await routeAfterAuth();
}

export async function handleRegister({ full_name, email, password }) {
  await registerUser({ full_name, email, password });
  showToast('Account created successfully! Please sign in.', 'success');
  redirect('login.html');
}

export async function routeAfterAuth() {
  try {
    const user = await getSignedInUser();
    if (user && user.role === 'admin') {
      showToast('Signed in as administrator.', 'success');
      redirect('admin.html');
      return;
    }

    const status = await getOnboardingStatus();

    if (status.has_connection) {
      redirect('dashboard.html');
    } else {
      redirect('onboarding.html');
    }
  } catch (error) {
    const { message, type } = resolveAuthError(error);
    showToast(message, type);
    redirect('onboarding.html');
  }
}

export function guardAuthPage() {
  if (isAuthenticated()) {
    routeAfterAuth();
  }
}

export function requireAuth() {
  if (!isAuthenticated()) {
    redirect('login.html');
    return false;
  }

  return true;
}

export async function getSignedInUser() {
  const cached = getUserProfile();
  if (cached) return cached;

  const user = await getCurrentUser();
  if (user) {
    setAuthSession({ userProfile: user });
  }

  return user;
}

export function logout() {
  clearAuthSession();
  showToast('Signed out successfully.', 'success');
  setTimeout(() => redirect('login.html'), 250);
}

export function initSocialLogin(container) {
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-social-provider]');
    if (!btn) return;

    const provider = btn.dataset.socialProvider;
    showToast(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in will be available once OAuth is configured.`,
      'info'
    );
  });
}
