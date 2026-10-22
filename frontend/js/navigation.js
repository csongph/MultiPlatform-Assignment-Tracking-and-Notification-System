/**
 * ==========================================================================
 * KMAPS Navigation System — JavaScript (ES6+ OOP Module)
 * ระบบจัดการ Sidebar, Topbar, Search และ Logout
 * ==========================================================================
 */

import { getSignedInUser, logout } from './auth.js';
import { getUserProfile } from './storage.js';
import { getOnboardingStatus, queueSync, getSyncJob } from './api.js';
import { showToast } from './ui.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * SidebarComponent: จัดการเมนูด้านซ้าย
 */
export class SidebarComponent {
  constructor(activeTab = 'overview') {
    this.activeTab = activeTab;
    this.menuItems = [
      { key: 'overview', label: 'ภาพรวม', icon: this.getOverviewIcon(), href: 'dashboard.html?view=overview' },
      { key: 'courses', label: 'รายวิชา', icon: this.getCoursesIcon(), href: 'courses.html' },
      { key: 'assignments', label: 'รายการงาน', icon: this.getSubmissionsIcon(), href: 'assignments.html' },
      { key: 'submissions', label: 'การส่งงาน', icon: this.getSubmissionsIcon(), href: 'dashboard.html?view=assignments' },
      { key: 'notifications', label: 'การแจ้งเตือน', icon: this.getNotificationsIcon(), href: 'notification.html' },
      { key: 'calendar', label: 'ปฏิทิน', icon: this.getCalendarIcon(), href: 'calendar.html' },
    ];
  }

  getOverviewIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2v-2z" />
    </svg>`;
  }

  getCoursesIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>`;
  }

  getSubmissionsIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;
  }

  getNotificationsIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>`;
  }

  getCalendarIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>`;
  }

  getConnectIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.71"/></svg>`;
  }

  getAdminIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>`;
  }

  render(user, basePath = 'pages/') {
    const activeKey = getActiveNavKey() || this.activeTab;
    const menuItems = this.menuItems.map((item) => ({ ...item, href: `${basePath}${item.href}` }));

    const itemsHtml = menuItems
      .map((item) => {
        const activeClass = item.key === activeKey ? 'active' : '';

        return `
          <li class="sidebar-menu-item">
            <a
              href="${item.href}"
              class="sidebar-link ${activeClass}"
              data-nav-key="${item.key}"
            >
              <span class="sidebar-icon">${item.icon}</span>
              <span class="sidebar-label">${escapeHtml(item.label)}</span>
            </a>
          </li>
        `;
      })
      .join('');

    return `
      <aside class="kmaps-sidebar" aria-label="Main Navigation">
        <div class="sidebar-brand">
          <div class="brand-badge">
            ${this.getCoursesIcon()}
          </div>
          <span style="font-size:1.1rem;font-weight:800;letter-spacing:.05em;color:#fff;">
            LMS KMAPS
          </span>
        </div>

        <ul class="sidebar-menu">
          ${itemsHtml}
        </ul>
        <div class="sidebar-footer">
          <a href="${basePath}onboarding.html" class="sidebar-link sidebar-connect-link ${activeKey === 'connect' ? 'active' : ''}" data-nav-key="connect">
            <span class="sidebar-icon">${this.getConnectIcon()}</span>
            <span class="sidebar-label">เชื่อมต่อแพลตฟอร์ม</span>
          </a>
        </div>
      </aside>
    `;
  }
}

/**
 * TopbarComponent: จัดการแถบด้านบน
 */
export class TopbarComponent {
  render(user) {
    const userName =
      user?.display_name ||
      user?.full_name ||
      user?.email ||
      'ผู้ใช้งาน';

    const userRole = user?.role === 'admin' ? 'แอดมิน' : 'นักเรียน';

    return `
      <header class="kmaps-topbar">
        <button
          type="button"
          class="mobile-sidebar-toggle"
          id="mobile-sidebar-toggle"
          aria-expanded="false"
          aria-label="Toggle Sidebar Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <div class="topbar-search-container">
          <input
            type="search"
            id="topbar-search-input"
            class="topbar-search-input"
            placeholder="ค้นหารายวิชาและงาน..."
            aria-label="Search courses and assignments"
          />
          <button
            type="button"
            class="topbar-search-button"
            id="topbar-search-btn"
            aria-label="Submit search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <button type="button" class="topbar-sync-btn" id="sync-now-button" title="ซิงก์งานจากทุกแพลตฟอร์มทันที">
          <span id="sync-icon" aria-hidden="true">🔄</span><span id="sync-text">ซิงก์ตอนนี้</span>
        </button>

        <div class="topbar-actions">
          <a href="dashboard.html" class="user-profile-badge" title="โปรไฟล์ผู้ใช้">
            <div class="profile-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1f2937">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>

            <div class="profile-info">
              <span class="profile-name" id="user-display-name">${escapeHtml(userName)}</span>
              <span class="profile-role" id="user-role-badge">${escapeHtml(userRole)}</span>
            </div>
          </a>

          <button
            type="button"
            class="topbar-logout-btn"
            id="logout-button"
            data-logout
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>
    `;
  }
}

/**
 * NavigationManager: ควบคุมการแสดง Sidebar และ Topbar
 */
export class NavigationManager {
  constructor(config = {}) {
    this.activeTab = getActiveNavKey() || config.activeTab || 'overview';
    this.user = null;
    this.sidebarComponent = new SidebarComponent(this.activeTab);
    this.topbarComponent = new TopbarComponent();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    // Mount the shared shell immediately so a slow profile/API request does
    // not leave every page without its navigation or topbar.
    this.user = getUserProfile();
    this.mountLayout();
    this.attachEventListeners();

    try {
      const user = await getSignedInUser();
      if (user) {
        this.user = user;
        const name = user.display_name || user.full_name || user.email || 'ผู้ใช้งาน';
        const role = user.role === 'admin' ? 'แอดมิน' : 'นักเรียน';
        const nameElement = document.getElementById('user-display-name');
        const roleElement = document.getElementById('user-role-badge');
        if (nameElement) nameElement.textContent = name;
        if (roleElement) roleElement.textContent = role;
      }
    } catch (error) {
      console.warn(
        '[NavigationManager] ไม่สามารถดึงข้อมูลผู้ใช้ได้',
        error
      );
    }
  }

  mountLayout() {
    let sidebarContainer =
      document.getElementById('sidebar-container') ||
      document.getElementById('kmaps-sidebar-container');

    let topbarContainer =
      document.getElementById('topbar-container') ||
      document.getElementById('kmaps-topbar-container');

    if (!sidebarContainer || !topbarContainer) {
      this.wrapExistingPageContent();

      sidebarContainer =
        document.getElementById('sidebar-container') ||
        document.getElementById('kmaps-sidebar-container');

      topbarContainer =
        document.getElementById('topbar-container') ||
        document.getElementById('kmaps-topbar-container');
    }

    if (sidebarContainer) {
      const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      sidebarContainer.innerHTML = this.sidebarComponent.render(this.user, basePath);
    }

    if (topbarContainer) {
      topbarContainer.innerHTML = this.topbarComponent.render(this.user);
    }
  }

  wrapExistingPageContent() {
    if (document.querySelector('.app-viewport-layout')) return;

    const layoutWrapper = document.createElement('div');
    layoutWrapper.className = 'app-viewport-layout';

    layoutWrapper.innerHTML = `
      <div class="app-sidebar-container" id="kmaps-sidebar-container"></div>
      <div class="app-main-container">
        <div id="kmaps-topbar-container"></div>
        <div id="kmaps-content-area"></div>
      </div>
    `;

    const bodyChildren = Array.from(document.body.children);
    document.body.insertBefore(layoutWrapper, document.body.firstChild);

    const contentArea = layoutWrapper.querySelector('#kmaps-content-area');

    bodyChildren.forEach((child) => {
      if (
        child !== layoutWrapper &&
        child.tagName !== 'SCRIPT'
      ) {
        contentArea.appendChild(child);
      }
    });
  }

  attachEventListeners() {
    document.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', () => logout()));

    const searchInput = document.getElementById('topbar-search-input');

    searchInput?.addEventListener('input', (event) => {
      this.dispatchSearchEvent(event.target.value.trim());
    });

    document
      .getElementById('topbar-search-btn')
      ?.addEventListener('click', () => {
        this.dispatchSearchEvent(
          document.getElementById('topbar-search-input')?.value.trim() || ''
        );
      });

    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarContainer =
      document.getElementById('sidebar-container') ||
      document.getElementById('kmaps-sidebar-container');

    if (mobileToggle && sidebarContainer) {
      mobileToggle.addEventListener('click', () => {
        const isOpen = sidebarContainer.classList.toggle('open');
        mobileToggle.setAttribute('aria-expanded', String(isOpen));
      });

      sidebarContainer.addEventListener('click', (event) => {
        if (event.target === sidebarContainer) {
          sidebarContainer.classList.remove('open');
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sidebarContainer.classList.contains('open')) {
          sidebarContainer.classList.remove('open');
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileToggle.focus();
        }
      });
    }

    document.getElementById('sync-now-button')?.addEventListener('click', () => this.syncNow());

    sidebarContainer?.querySelectorAll('[data-nav-key]').forEach((link) => {
      link.addEventListener('click', () => {
        sidebarContainer.classList.remove('open');
          mobileToggle?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  dispatchSearchEvent(query) {
    window.dispatchEvent(
      new CustomEvent('kmaps-search', {
        detail: { query },
      })
    );
  }

  async syncNow() {
    const button = document.getElementById('sync-now-button');
    const icon = document.getElementById('sync-icon');
    const label = document.getElementById('sync-text');
    if (!button || button.disabled) return;
    button.disabled = true;
    if (icon) icon.classList.add('spin-animate');
    if (label) label.textContent = 'กำลังซิงก์...';
    try {
      const connections = (await getOnboardingStatus())?.connections || {};
      const platforms = [
        ...((connections.google ?? connections.google_classroom) ? ['google_classroom'] : []),
        ...((connections.microsoft ?? connections.microsoft_teams) ? ['microsoft_teams'] : []),
      ];
      if (!platforms.length) throw new Error('ยังไม่มีแพลตฟอร์มที่เชื่อมต่อ กรุณาเชื่อมต่อก่อนซิงก์');
      const jobs = await Promise.all(platforms.map((platform) => queueSync(platform)));
      const ids = jobs.map((job) => job?.job_id).filter(Boolean);
      if (ids.length !== platforms.length) throw new Error('ระบบไม่สามารถเริ่มงานซิงก์ได้ครบทุกแพลตฟอร์ม');
      const deadline = Date.now() + 60000;
      let statuses;
      do {
        statuses = await Promise.all(ids.map((id) => getSyncJob(id)));
        if (statuses.every((job) => ['success', 'succeeded', 'completed', 'failed', 'error'].includes(String(job.status).toLowerCase()))) break;
        if (Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 2500));
      } while (Date.now() < deadline);
      const failed = statuses.find((job) => ['failed', 'error'].includes(String(job.status).toLowerCase()));
      if (failed) throw new Error(failed.error_detail?.error || failed.error_detail?.reason || 'การซิงก์ล้มเหลว กรุณาตรวจสอบสิทธิ์แล้วลองใหม่');
      const emptyProvider = statuses.find((job) => job.status === 'success' && job.error_detail?.info);
      if (emptyProvider) {
        const providerName = emptyProvider.platform === 'microsoft_teams' ? 'Microsoft Teams' : 'Google Classroom';
        throw new Error(`${providerName}: ${emptyProvider.error_detail.info}`);
      }
      const total = statuses.reduce((sum, job) => sum + (job.items_synced || 0), 0);
      showToast(Date.now() >= deadline ? 'การซิงก์ยังทำงานอยู่เบื้องหลัง' : `ซิงก์สำเร็จ! อัปเดตงาน ${total} รายการ`, 'success');
      window.dispatchEvent(new CustomEvent('kmaps:sync-complete'));
    } catch (error) {
      showToast(error.message || 'ไม่สามารถเริ่มการซิงก์ได้', 'error');
    } finally {
      button.disabled = false;
      icon?.classList.remove('spin-animate');
      if (label) label.textContent = 'ซิงก์ตอนนี้';
    }
  }
}

function getActiveNavKey() {
  const path = window.location.pathname.toLowerCase();
  const view = new URLSearchParams(window.location.search).get('view');
  if (path.endsWith('/courses.html')) return 'courses';
  if (path.endsWith('/assignments.html')) return 'assignments';
  if (path.endsWith('/notification.html')) return 'notifications';
  if (path.endsWith('/calendar.html')) return 'calendar';
  if (path.endsWith('/onboarding.html')) return 'connect';
  if (path.endsWith('/admin.html')) return 'admin';
  if (path.endsWith('/dashboard.html')) return view === 'assignments' ? 'submissions' : view === 'calendar' ? 'calendar' : view === 'notifications' ? 'notifications' : 'overview';
  return null;
}

/**
 * เริ่มต้น Navigation ในแต่ละหน้า
 */
export function initNavigation(activeTab = 'overview') {
  const navManager = new NavigationManager({ activeTab });

  const start = () => {
    navManager.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  return navManager;
}
