/**
 * KMAPS Centralized / Shared Sidebar Controller
 * Reusable across any page in the application (Dashboard, Admin, Onboarding, Calendar, etc.)
 */

import { getUserProfile } from './storage.js';

// Default HTML template fallback (in case fetch is unavailable or offline)
export const DEFAULT_SIDEBAR_HTML = `
<aside class="md3-sidebar w-full md:w-[220px] lg:w-[240px] shrink-0 flex flex-col items-stretch py-7 px-4 min-h-[580px] text-white">
  <!-- LMS Logo -->
  <div class="flex flex-col items-center mb-8">
    <a href="dashboard.html" class="group flex flex-col items-center focus:outline-none" aria-label="ไปที่หน้าแรก">
      <div class="w-20 h-20 rounded-full bg-gradient-to-tr from-[#9932cc] via-[#ff69b4] to-[#4da6ff] p-[3px] shadow-lg shadow-purple-900/50 flex items-center justify-center transition-transform group-hover:scale-105">
        <div class="w-full h-full rounded-full bg-[#1e0f38] flex flex-col items-center justify-center relative overflow-hidden">
          <svg class="w-7 h-7 text-pink-400 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z"/>
          </svg>
          <span class="text-[12px] font-bold font-outfit tracking-wider text-white">LMS</span>
        </div>
      </div>
    </a>
  </div>

  <!-- Navigation Menu -->
  <nav class="flex flex-col gap-3 font-medium text-sm flex-1" aria-label="Sidebar Navigation">
    <!-- 1. ภาพรวม -->
    <button 
      type="button" 
      id="nav-btn-overview" 
      data-nav-id="overview" 
      data-href="dashboard.html?view=overview"
      class="md3-nav-item flex items-center gap-3.5 px-4 py-3 text-left w-full cursor-pointer focus:outline-none text-white/80 hover:text-white transition-colors"
      title="ภาพรวม"
    >
      <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3H11V11H3V3ZM3 13H11V21H3V13ZM13 3H21V11H13V3ZM13 13H21V21H13V13Z" />
      </svg>
      <span class="text-sm font-semibold tracking-wide">ภาพรวม</span>
    </button>

    <!-- 2. งานที่ได้รับมอบหมาย -->
    <button 
      type="button" 
      id="nav-btn-assignments" 
      data-nav-id="assignments" 
      data-href="dashboard.html?view=assignments"
      class="md3-nav-item flex items-center gap-3.5 px-4 py-3 text-left w-full cursor-pointer focus:outline-none text-white/80 hover:text-white transition-colors"
      title="งานที่ได้รับมอบหมาย"
    >
      <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
      <span class="text-sm tracking-wide">งานที่ได้รับมอบหมาย</span>
    </button>

    <!-- 3. ปฏิทินและการแจ้งเตือน -->
    <button 
      type="button" 
      id="nav-btn-calendar" 
      data-nav-id="calendar" 
      data-href="dashboard.html?view=calendar"
      class="md3-nav-item flex items-center gap-3.5 px-4 py-3 text-left w-full cursor-pointer focus:outline-none text-white/80 hover:text-white transition-colors"
      title="ปฏิทินและการแจ้งเตือน"
    >
      <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span class="text-sm tracking-wide">ปฏิทินและการแจ้งเตือน</span>
    </button>

    <!-- Slot for extra custom menu items -->
    <div id="sidebar-custom-items-slot" class="flex flex-col gap-3"></div>
  </nav>

  <!-- Sidebar Footer (Quick Links & Admin Console) -->
  <div class="pt-4 border-t border-white/10 flex flex-col gap-2 text-xs text-white/60">
    <a 
      href="onboarding.html" 
      id="nav-link-onboarding"
      data-nav-id="onboarding" 
      class="md3-footer-link hover:text-brand-lime flex items-center gap-2 py-1 transition-colors"
      title="เชื่อมต่อแพลตฟอร์ม"
    >
      <span>🔗 เชื่อมต่อแพลตฟอร์ม</span>
    </a>
    <div id="admin-sidebar-slot"></div>
  </div>
</aside>
`;

/**
 * Initialize the sidebar component inside a container element
 *
 * @param {Object} options
 * @param {string|HTMLElement} [options.container='sidebar-container'] - Element ID or HTMLElement to inject into
 * @param {string} [options.active='overview'] - Currently active navigation ID ('overview', 'assignments', 'calendar', 'onboarding', 'admin')
 * @param {string} [options.basePath] - Relative path to page directory (default auto-detected, usually '.')
 * @param {string} [options.componentPath] - Path to sidebar.html (default auto-detected '../components/sidebar.html')
 * @param {Function} [options.onNavigate] - Custom callback `(navId, event) => void` when an item is selected
 * @param {boolean|string} [options.showAdmin='auto'] - Whether to show the Admin Console link ('auto' checks current user role)
 * @param {Array<Object>} [options.customItems=[]] - Extra menu items: [{ id, label, iconSvg, href, onClick, badge }]
 * @returns {Promise<HTMLElement>} The container element
 */
export async function initSidebar(options = {}) {
  const {
    container = 'sidebar-container',
    active = 'overview',
    basePath = detectBasePath(),
    componentPath,
    onNavigate,
    showAdmin = 'auto',
    customItems = [],
  } = options;

  const containerEl = typeof container === 'string'
    ? document.getElementById(container)
    : container;

  if (!containerEl) {
    console.warn(`[KMAPS Sidebar] Container element '${container}' not found.`);
    return null;
  }

  // 1. Load HTML markup (try fetch, fallback to template string)
  const resolvedComponentPath = componentPath || `${basePath === '.' ? '../' : ''}components/sidebar.html`;
  try {
    const response = await fetch(resolvedComponentPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    containerEl.innerHTML = await response.text();
  } catch (err) {
    // Graceful fallback to inline template
    containerEl.innerHTML = DEFAULT_SIDEBAR_HTML;
  }

  // 2. Adjust relative links based on basePath if needed
  adjustRelativeLinks(containerEl, basePath);

  // 3. Render any custom items passed by the caller
  if (Array.isArray(customItems) && customItems.length > 0) {
    renderCustomItems(containerEl, customItems);
  }

  // 4. Admin Console link visibility
  const shouldShowAdmin = showAdmin === true || (showAdmin === 'auto' && isCurrentUserAdmin());
  updateSidebarAdminStatus(shouldShowAdmin, containerEl, basePath);

  // 5. Set active nav item
  setActiveNavItem(active, containerEl);

  // 6. Setup navigation click handlers
  setupSidebarNavigation(containerEl, {
    active,
    basePath,
    onNavigate,
  });

  return containerEl;
}

/**
 * Set active styling on a nav item by its ID
 *
 * @param {string} navId - 'overview' | 'assignments' | 'calendar' | 'onboarding' | 'admin' | customId
 * @param {HTMLElement} [container=document] - Sidebar root or document
 */
export function setActiveNavItem(navId, container = document) {
  // Clear all active pills
  const allNavItems = container.querySelectorAll('.md3-nav-item');
  allNavItems.forEach((item) => {
    item.classList.remove('md3-nav-pill-active', 'text-[#152402]');
    item.classList.add('text-white/80');
  });

  // Clear footer links active state
  const footerLinks = container.querySelectorAll('.md3-footer-link');
  footerLinks.forEach((link) => {
    link.classList.remove('is-active', 'text-brand-lime', 'font-bold');
  });

  if (!navId) return;

  // Find target item
  const targetItem = container.querySelector(`[data-nav-id="${navId}"]`) ||
                     container.querySelector(`#nav-btn-${navId}`) ||
                     container.querySelector(`#nav-link-${navId}`);

  if (targetItem) {
    if (targetItem.classList.contains('md3-nav-item')) {
      targetItem.classList.add('md3-nav-pill-active');
      targetItem.classList.remove('text-white/80');
    } else if (targetItem.classList.contains('md3-footer-link')) {
      targetItem.classList.add('is-active', 'text-brand-lime', 'font-bold');
    }
  }
}

/**
 * Update Admin Console link inside the sidebar
 *
 * @param {boolean} isAdmin
 * @param {HTMLElement} [container=document]
 * @param {string} [basePath='.']
 */
export function updateSidebarAdminStatus(isAdmin, container = document, basePath = '.') {
  const slot = container.querySelector('#admin-sidebar-slot');
  if (!slot) return;

  if (isAdmin) {
    const adminHref = basePath === '.' ? 'admin.html' : `${basePath}/pages/admin.html`;
    slot.innerHTML = `
      <a 
        href="${adminHref}" 
        id="nav-link-admin" 
        data-nav-id="admin" 
        class="md3-footer-link flex items-center gap-2 text-brand-lime font-bold hover:underline py-1 transition-colors"
        title="แผงควบคุมผู้ดูแลระบบ"
      >
        <span>⚙️ แผงควบคุมผู้ดูแล</span>
      </a>
    `;
  } else {
    slot.innerHTML = '';
  }
}

/**
 * Setup navigation routing and click listeners
 */
function setupSidebarNavigation(container, { basePath, onNavigate }) {
  const isDashboardPage = isCurrentPageDashboard();

  container.addEventListener('click', (event) => {
    const navBtn = event.target.closest('[data-nav-id]');
    if (!navBtn) return;

    const navId = navBtn.dataset.navId;
    if (!navId) return;

    // If caller provided onNavigate callback
    if (typeof onNavigate === 'function') {
      const handled = onNavigate(navId, event);
      if (handled !== false) {
        event.preventDefault();
        setActiveNavItem(navId, container);
        return;
      }
    }

    // Default universal behavior:
    const dashboardTabs = ['overview', 'assignments', 'calendar'];

    if (isDashboardPage && dashboardTabs.includes(navId)) {
      // We are on dashboard.html: switch views directly if view elements exist
      event.preventDefault();
      const viewMap = {
        overview: document.getElementById('view-overview'),
        assignments: document.getElementById('view-assignments'),
        calendar: document.getElementById('view-calendar'),
      };

      if (viewMap[navId]) {
        Object.entries(viewMap).forEach(([id, viewEl]) => {
          if (!viewEl) return;
          if (id === navId) {
            viewEl.classList.remove('hidden');
          } else {
            viewEl.classList.add('hidden');
          }
        });

        setActiveNavItem(navId, container);

        // Update URL query param ?view=... without page reload for deep-linking
        const url = new URL(window.location.href);
        url.searchParams.set('view', navId);
        window.history.replaceState({}, '', url.toString());

        // Dispatch a custom event for any page script listening to tab changes
        window.dispatchEvent(new CustomEvent('kmaps:tabchange', { detail: { tabId: navId } }));
      }
    } else if (!isDashboardPage && dashboardTabs.includes(navId)) {
      // On another page (e.g. admin, onboarding): navigate to dashboard with target tab
      event.preventDefault();
      const targetUrl = basePath === '.'
        ? `dashboard.html?view=${navId}`
        : `${basePath}/pages/dashboard.html?view=${navId}`;
      window.location.href = targetUrl;
    }
    // External links (onboarding, admin) follow their natural href unless prevented
  });
}

/**
 * Render optional custom menu items
 */
function renderCustomItems(container, items) {
  const slot = container.querySelector('#sidebar-custom-items-slot');
  if (!slot) return;

  slot.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.navId = item.id;
    if (item.href) btn.dataset.href = item.href;
    btn.className = 'md3-nav-item flex items-center gap-3.5 px-4 py-3 text-left w-full cursor-pointer focus:outline-none text-white/80 hover:text-white transition-colors';
    btn.title = item.label;

    const iconHtml = item.iconSvg || `
      <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9"></circle>
      </svg>
    `;

    const badgeHtml = item.badge
      ? `<span class="sidebar-item-badge">${item.badge}</span>`
      : '';

    btn.innerHTML = `
      ${iconHtml}
      <span class="text-sm tracking-wide">${item.label}</span>
      ${badgeHtml}
    `;

    if (item.onClick) {
      btn.addEventListener('click', (e) => item.onClick(item.id, e));
    }

    slot.appendChild(btn);
  });
}

/**
 * Adjust relative URLs if pages are located in different directory levels
 */
function adjustRelativeLinks(container, basePath) {
  if (basePath === '.') return; // Same directory (default pages/)

  const links = container.querySelectorAll('a[href], [data-href]');
  links.forEach((el) => {
    const href = el.getAttribute('href') || el.dataset.href;
    if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
      const adjusted = `${basePath}/${href}`;
      if (el.hasAttribute('href')) el.setAttribute('href', adjusted);
      if (el.dataset.href) el.dataset.href = adjusted;
    }
  });
}

/**
 * Check if the signed in user is an administrator
 */
function isCurrentUserAdmin() {
  const user = getUserProfile();
  return user && user.role === 'admin';
}

/**
 * Detect current base path relative to pages directory
 */
function detectBasePath() {
  const pathname = window.location.pathname;
  if (pathname.includes('/pages/')) {
    return '.';
  }
  return 'pages';
}

/**
 * Detect if currently on the dashboard page
 */
function isCurrentPageDashboard() {
  const pathname = window.location.pathname;
  return pathname.endsWith('dashboard.html') ||
         pathname.endsWith('/') ||
         pathname.endsWith('/index.html') ||
         !!document.getElementById('view-overview');
}
