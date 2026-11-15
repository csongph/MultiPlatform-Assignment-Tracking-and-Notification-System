/**
 * Backwards-compatible facade for older page modules.
 * The shared sidebar and topbar markup live in navigation.js.
 */
import { getSignedInUser } from './auth.js';
import { SidebarComponent, NavigationManager, initNavigation } from './navigation.js';

export { SidebarComponent, NavigationManager, initNavigation };
export const DEFAULT_SIDEBAR_HTML = new SidebarComponent().render(null, '');

export async function initSidebar(options = {}) {
  const container = typeof options.container === 'string'
    ? document.getElementById(options.container)
    : options.container || document.getElementById('sidebar-container') || document.getElementById('kmaps-sidebar-container');
  if (!container) return null;

  const user = await getSignedInUser().catch(() => null);
  const basePath = options.basePath ?? (window.location.pathname.includes('/pages/') ? '' : 'pages/');
  container.innerHTML = new SidebarComponent().render(user, basePath);
  container.querySelectorAll('[data-nav-key]').forEach((link) => {
    link.addEventListener('click', () => container.classList.remove('open'));
  });
  return container;
}

export function setActiveNavItem(key, container = document) {
  container.querySelectorAll('[data-nav-key]').forEach((link) => {
    link.classList.toggle('active', link.dataset.navKey === key);
  });
}

// Kept for older callers; admin navigation is now reached through the existing dashboard link.
export function updateSidebarAdminStatus() {}
