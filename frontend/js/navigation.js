/**
 * ==========================================================================
 * KMAPS Navigation System — JavaScript (ES6+ OOP Module)
 * ระบบจัดการ Navigation Bar ทั้งโปรเจกต์ เขียนด้วย Object-Oriented Programming (OOP)
 * พร้อมคอมเมนต์ภาษาไทยเพื่อความเข้าใจง่าย
 * ==========================================================================
 */

import { getSignedInUser, logout } from './auth.js';

/**
 * 1. SidebarComponent (คลาสสำหรับจัดการ แถบเมนูด้านซ้าย)
 */
export class SidebarComponent {
  /**
   * @param {string} activeKey - เมนูที่เลือกอยู่ในปัจจุบัน (เช่น 'overview', 'courses', 'admin')
   */
  constructor(activeKey = 'courses') {
    this.activeKey = activeKey;
  }

  /**
   * สร้าง SVG Icon สำหรับเมนูภาพรวม
   */
  getOverviewIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>`;
  }

  /**
   * สร้าง SVG Icon สำหรับเมนูกลุ่มรายวิชา
   */
  getCoursesIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>`;
  }

  /**
   * สร้าง SVG Icon สำหรับเมนูการส่งงาน
   */
  getSubmissionsIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;
  }

  /**
   * สร้าง SVG Icon สำหรับเมนูการแจ้งเตือน
   */
  getNotificationsIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>`;
  }

  /**
   * สร้าง SVG Icon สำหรับเมนูปฏิทิน
   */
  getCalendarIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>`;
  }

  /**
   * สร้าง SVG Icon สำหรับเมนู Admin Console
   */
  getAdminIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>`;
  }

  /**
   * สร้างโครงสร้าง HTML สำหรับ Sidebar
   * @param {Object|null} user ข้อมูลโปรไฟล์ผู้ใช้
   * @returns {string} HTML Template String
   */
  render(user) {
    const isAdmin = user && user.role === 'admin';

    const menuItems = [
      { key: 'overview', label: 'ภาพรวม', href: 'dashboard.html', icon: this.getOverviewIcon() },
      { key: 'courses', label: 'รายวิชา', href: 'dashboard.html#courses', icon: this.getCoursesIcon() },
      { key: 'submissions', label: 'การส่งงาน', href: 'dashboard.html#submissions', icon: this.getSubmissionsIcon() },
      { key: 'notifications', label: 'การแจ้งเตือน', href: 'dashboard.html#notifications', icon: this.getNotificationsIcon() },
      { key: 'calendar', label: 'ปฏิทิน', href: 'dashboard.html#calendar', icon: this.getCalendarIcon() },
    ];

    if (isAdmin) {
      menuItems.push({
        key: 'admin',
        label: 'ผู้ดูแลระบบ',
        href: 'admin.html',
        icon: this.getAdminIcon(),
      });
    }

    const itemsHtml = menuItems
      .map((item) => {
        const isActive = item.key === this.activeKey;
        const activeClass = isActive ? 'active' : '';
        return `
          <li class="sidebar-menu-item">
            <a href="${item.href}" class="sidebar-link ${activeClass}" data-nav-key="${item.key}">
              <span class="sidebar-icon">${item.icon}</span>
              <span class="sidebar-label">${item.label}</span>
            </a>
          </li>
        `;
      })
      .join('');

    return `
      <aside class="kmaps-sidebar" aria-label="Main Navigation">
        <!-- โลโก้ LMS / KMAPS -->
        <div class="sidebar-brand">
          <div class="brand-badge">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span style="font-size: 1.1rem; font-weight: 800; letter-spacing: 0.05em; color: #ffffff;">LMS KMAPS</span>
        </div>

        <!-- เมนูหลัก -->
        <ul class="sidebar-menu">
          ${itemsHtml}
        </ul>
      </aside>
    `;
  }
}

/**
 * 2. TopbarComponent (คลาสสำหรับจัดการ แถบแนวนอนด้านบน)
 */
export class TopbarComponent {
  /**
   * สร้างโครงสร้าง HTML สำหรับ Topbar
   * @param {Object|null} user ข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
   * @returns {string} HTML Template String
   */
  render(user) {
    const userName = user?.display_name || user?.full_name || 'K.Kunagron';
    const userRole = user?.role === 'admin' ? 'แอดมิน' : 'นักเรียน';

    return `
      <header class="kmaps-topbar">
        <!-- ปุ่ม Toggle Menu บนอุปกรณ์เคลื่อนที่ -->
        <button type="button" class="mobile-sidebar-toggle" id="mobile-sidebar-toggle" aria-label="Toggle Sidebar Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <!-- ช่องค้นหารายวิชาทรง Pill มนโค้ง -->
        <div class="topbar-search-container">
          <input 
            type="search" 
            id="topbar-search-input"
            class="topbar-search-input" 
            placeholder="ค้นหารายวิชา..." 
            aria-label="Search courses" 
          />
          <button type="button" class="topbar-search-button" id="topbar-search-btn" aria-label="Submit search">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <!-- ป้ายผู้ใช้ และ ปุ่ม Logout สีเขียวมะนาว -->
        <div class="topbar-actions">
          <a href="dashboard.html" class="user-profile-badge" title="โปรไฟล์ผู้ใช้">
            <div class="profile-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1f2937">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div class="profile-info">
              <span class="profile-name">${userName}</span>
              <span class="profile-role">${userRole}</span>
            </div>
          </a>

          <!-- ปุ่ม Logout -->
          <button type="button" class="topbar-logout-btn" id="topbar-logout-button" title="ออกจากระบบ">
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
 * 3. NavigationManager (คลาสผู้จัดการหลักสำหรับควบคุม Navigation ทั้งระบบแบบ OOP)
 */
export class NavigationManager {
  /**
   * @param {Object} config การตั้งค่าเริ่มต้น
   * @param {string} config.activeTab คีย์เมนูปัจจุบันที่ใช้งาน ('overview', 'courses', 'admin', ฯลฯ)
   */
  constructor(config = {}) {
    this.activeTab = config.activeTab || 'courses';
    this.user = null;
    this.sidebarComponent = new SidebarComponent(this.activeTab);
    this.topbarComponent = new TopbarComponent();
  }

  /**
   * เมธอดเริ่มต้นการทำงาน โหลดข้อมูลผู้ใช้และ Render แถบ Navigation ลงบน DOM
   */
  async init() {
    try {
      this.user = await getSignedInUser();
    } catch (err) {
      console.warn('[NavigationManager] ไม่สามารถดึงข้อมูลผู้ใช้ได้', err);
    }

    this.mountLayout();
    this.attachEventListeners();
  }

  /**
   * ประกอบ Sidebar และ Topbar เข้ากับโครงสร้างหน้าเว็บ
   */
  mountLayout() {
    let sidebarContainer = document.getElementById('kmaps-sidebar-container');
    let topbarContainer = document.getElementById('kmaps-topbar-container');

    // หากยังไม่มี Container ให้สร้าง wrapper จัดรูปแบบ Layout ครอบทั้งหน้าเว็บอัตโนมัติ
    if (!sidebarContainer || !topbarContainer) {
      this.wrapExistingPageContent();
      sidebarContainer = document.getElementById('kmaps-sidebar-container');
      topbarContainer = document.getElementById('kmaps-topbar-container');
    }

    if (sidebarContainer) {
      sidebarContainer.innerHTML = this.sidebarComponent.render(this.user);
    }

    if (topbarContainer) {
      topbarContainer.innerHTML = this.topbarComponent.render(this.user);
    }
  }

  /**
   * ปรับแก้โครงสร้าง DOM ของหน้าเว็บเดิม ย้ายเข้าสู้ Layout Shell (Sidebar ด้านซ้าย + Topbar ด้านบน)
   */
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
    const contentArea = document.getElementById('kmaps-content-area');

    bodyChildren.forEach((child) => {
      if (child !== layoutWrapper && child.tagName !== 'SCRIPT') {
        contentArea.appendChild(child);
      }
    });
  }

  /**
   * ผูก Event Listeners สำหรับการทำงานต่างๆ เช่น Logout, Search, Mobile Toggle
   */
  attachEventListeners() {
    // ปุ่ม Logout
    const logoutBtn = document.getElementById('topbar-logout-button');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => logout());
    }

    // ช่องค้นหารายวิชา
    const searchInput = document.getElementById('topbar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        this.dispatchSearchEvent(query);
      });
    }

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarContainer = document.getElementById('kmaps-sidebar-container');
    if (mobileToggle && sidebarContainer) {
      mobileToggle.addEventListener('click', () => {
        sidebarContainer.classList.toggle('open');
      });
    }
  }

  /**
   * ส่ง Custom Event ออกไปเพื่อให้แต่ละหน้ารับค่าคำค้นหาไปกรองข้อมูล
   * @param {string} query คำค้นหา
   */
  dispatchSearchEvent(query) {
    const searchEvent = new CustomEvent('kmaps-search', { detail: { query } });
    window.dispatchEvent(searchEvent);
  }
}

/**
 *ฟังก์ชันสั้นสะดวกสำหรับเริ่มต้นใช้งาน Navigation ในแต่ละหน้า
 * @param {string} activeTab 
 */
export function initNavigation(activeTab = 'courses') {
  const navManager = new NavigationManager({ activeTab });
  document.addEventListener('DOMContentLoaded', () => {
    navManager.init();
  });
  // หาก DOM loaded แล้วให้รันทันที
  if (document.readyState !== 'loading') {
    navManager.init();
  }
  return navManager;
}
