/**
 * ==========================================================================
 * KMAPS Courses Module — ES6+ OOP Implementation
 * คลาสจัดการระบบรายวิชา (Courses Page) การกรองแพลตฟอร์ม (Multi-Platform Filter)
 * สถิติตัวเลข และการค้นหาแบบเรียลไทม์ ด้วย Object-Oriented Programming
 * ==========================================================================
 */

import { initNavigation } from './navigation.js';
import { getCourses, getAssignments, normalizePlatform } from './api.js';

/**
 * 1. CourseModel (คลาสจำลองโมเดลข้อมูลรายวิชา)
 */
export class CourseModel {
  /**
   * @param {Object} data ข้อมูลของรายวิชา
   * @param {string} data.id รหัสอ้างอิงของรายวิชา
   * @param {string} data.title ชื่อรายวิชา
   * @param {string} data.code รหัสวิชา
   * @param {string} data.instructor ชื่ออาจารย์ผู้สอน
   * @param {string} data.platform แพลตฟอร์มต้นทาง ('google' หรือ 'microsoft')
   * @param {number} data.pendingAssignments จำนวนงานที่รอดำเนินการ
   * @param {number} data.completedAssignments จำนวนงานที่ส่งแล้ว
   * @param {number} data.totalAssignments จำนวนงานทั้งหมด
   */
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.code = data.code;
    this.instructor = data.instructor;
    this.platform = data.platform;
    this.pendingAssignments = data.pendingAssignments || 0;
    this.completedAssignments = data.completedAssignments || 0;
    this.totalAssignments = data.totalAssignments || (this.pendingAssignments + this.completedAssignments);
  }

  /**
   * ตรวจสอบว่ารายวิชานี้มาจากแพลตฟอร์มที่ระบุหรือไม่
   * @param {string} platformKey รหัสแพลตฟอร์ม ('google' หรือ 'microsoft')
   * @returns {boolean}
   */
  isFromPlatform(platformKey) {
    return this.platform === platformKey;
  }

  /**
   * ตรวจสอบว่าข้อมูลรายวิชาตรงกับคำค้นหาหรือไม่ (ค้นหาจากชื่อวิชา, รหัสวิชา, หรือชื่ออาจารย์)
   * @param {string} query คำค้นหา
   * @returns {boolean}
   */
  matchesQuery(query) {
    if (!query) return true;
    const cleanQuery = query.trim().toLowerCase();
    return (
      this.title.toLowerCase().includes(cleanQuery) ||
      this.code.toLowerCase().includes(cleanQuery) ||
      this.instructor.toLowerCase().includes(cleanQuery)
    );
  }
}

/**
 * 2. StatSummaryComponent (คลาสสำหรับคำนวณและแสดงผลการ์ดสรุปสถิติด้านบน 4 ช่อง)
 */
export class StatSummaryComponent {
  /**
   * @param {string} containerId ID ของ Element ที่จะ Render การ์ดสถิติ
   */
  constructor(containerId = 'stat-summary-container') {
    this.container = document.getElementById(containerId);
  }

  /**
   * คำนวณสถิติจากรายการวิชาทั้งหมด และ Render HTML
   * @param {CourseModel[]} courses รายการวิชาทั้งหมด
   */
  render(courses = []) {
    if (!this.container) return;

    let totalAssignments = 0;
    let completedAssignments = 0;
    let pendingAssignments = 0;

    courses.forEach((c) => {
      totalAssignments += c.totalAssignments;
      completedAssignments += c.completedAssignments;
      pendingAssignments += c.pendingAssignments;
    });

    const completionRate = totalAssignments > 0
      ? ((completedAssignments / totalAssignments) * 100).toFixed(2)
      : '0.00';

    this.container.innerHTML = `
      <div class="courses-stats-grid">
        <!-- การ์ด 1: งานทั้งหมด -->
        <article class="course-stat-card">
          <span class="course-stat-label">งานทั้งหมด</span>
          <strong class="course-stat-value">${totalAssignments}</strong>
        </article>

        <!-- การ์ด 2: ส่งแล้ว -->
        <article class="course-stat-card">
          <span class="course-stat-label">ส่งแล้ว</span>
          <strong class="course-stat-value">${completedAssignments}</strong>
        </article>

        <!-- การ์ด 3: รอดำเนินการ -->
        <article class="course-stat-card">
          <span class="course-stat-label">รอดำเนินการ</span>
          <strong class="course-stat-value">${pendingAssignments}</strong>
        </article>

        <!-- การ์ด 4: อัตราการส่งงาน -->
        <article class="course-stat-card">
          <span class="course-stat-label">อัตราการส่งงาน</span>
          <strong class="course-stat-value">${completionRate}%</strong>
        </article>
      </div>
    `;
  }
}

/**
 * 3. PlatformFilterComponent (คลาสจัดการแถบกรองแพลตฟอร์มแบบ Multi-Selection)
 */
export class PlatformFilterComponent {
  /**
   * @param {Object} config การตั้งค่า
   * @param {string} config.containerId ID ของ Element ที่จะวางปุ่มกรอง
   * @param {Function} config.onFilterChange Callback เมื่อมีการเปลี่ยนการเลือกแพลตฟอร์ม
   */
  constructor({ containerId = 'platform-filter-bar', onFilterChange }) {
    this.container = document.getElementById(containerId);
    this.onFilterChange = onFilterChange;
    // ใช้ Set เก็บแพลตฟอร์มที่ถูกเลือก สามารถเลือกได้ทั้ง 'google' และ 'microsoft' พร้อมกัน
    this.selectedPlatforms = new Set();
  }

  /**
   * สร้าง HTML แถบปุ่มกรองแพลตฟอร์ม
   */
  render() {
    if (!this.container) return;

    const isAllActive = this.selectedPlatforms.size === 0;
    const isGoogleActive = this.selectedPlatforms.has('google');
    const isMicrosoftActive = this.selectedPlatforms.has('microsoft');

    this.container.innerHTML = `
      <div class="platform-filter-wrapper">
        <div class="filter-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>กรองตามแพลตฟอร์ม:</span>
        </div>

        <div class="platform-chips-container">
          <!-- ปุ่มเลือกทั้งหมด -->
          <button 
            type="button" 
            class="platform-chip-btn ${isAllActive ? 'active-all' : ''}"
            data-platform="all"
          >
            <span>ทั้งหมด</span>
          </button>

          <!-- ปุ่มเลือก Google Classroom -->
          <button 
            type="button" 
            class="platform-chip-btn ${isGoogleActive ? 'active-google' : ''}"
            data-platform="google"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#FABB05"/>
              <path d="M5 7H19V17H5V7Z" fill="#34A853"/>
              <path d="M12 10.5C12.8284 10.5 13.5 9.82843 13.5 9C13.5 8.17157 12.8284 7.5 12 7.5C11.1716 7.5 10.5 8.17157 10.5 9C10.5 9.82843 11.1716 10.5 12 10.5Z" fill="#FABB05"/>
            </svg>
            <span>Google Classroom</span>
          </button>

          <!-- ปุ่มเลือก Microsoft Teams -->
          <button 
            type="button" 
            class="platform-chip-btn ${isMicrosoftActive ? 'active-microsoft' : ''}"
            data-platform="microsoft"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M16.5 6C17.8807 6 19 7.11929 19 8.5C19 9.88071 17.8807 11 16.5 11C15.1193 11 14 9.88071 14 8.5C14 7.11929 15.1193 6 16.5 6Z" fill="#5B5FC7"/>
              <path d="M21 12H15C14.1716 12 13.5 12.6716 13.5 13.5V18H22.5V13.5C22.5 12.6716 21.8284 12 21 12Z" fill="#5B5FC7"/>
              <path d="M9 3C10.6569 3 12 4.34315 12 6C12 7.65685 10.6569 9 9 9C7.34315 9 6 7.65685 6 6C6 4.34315 7.34315 3 9 3Z" fill="#4649A6"/>
              <path d="M14 10H4C2.89543 10 2 10.8954 2 12V19C2 20.1046 2.89543 21 4 21H14C15.1046 21 16 20.1046 16 19V12C16 10.8954 15.1046 10 14 10Z" fill="#7B83EB"/>
            </svg>
            <span>Microsoft Teams</span>
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  /**
   * ผูก Event Click สำหรับสลับโหมดเลือกแพลตฟอร์ม
   */
  attachEvents() {
    const buttons = this.container.querySelectorAll('.platform-chip-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const platform = e.currentTarget.getAttribute('data-platform');
        
        if (platform === 'all') {
          // หากกด "ทั้งหมด" ให้เคลียร์ตัวเลือกแพลตฟอร์ม
          this.selectedPlatforms.clear();
        } else {
          // หากกดแพลตฟอร์มเดิมซ้ำ ให้ยกเลิกการเลือก หากกดแพลตฟอร์มใหม่ให้เพิ่มเข้าไป (Multi-Select)
          if (this.selectedPlatforms.has(platform)) {
            this.selectedPlatforms.delete(platform);
          } else {
            this.selectedPlatforms.add(platform);
          }
        }

        this.render();
        if (typeof this.onFilterChange === 'function') {
          this.onFilterChange(Array.from(this.selectedPlatforms));
        }
      });
    });
  }
}

/**
 * 4. CourseCardComponent (คลาสสำหรับ Render โครงสร้าง HTML การ์ดรายวิชา)
 */
export class CourseCardComponent {
  /**
   * สร้าง HTML การ์ดรายวิชาตาม UI Reference
   * @param {CourseModel} course ข้อมูลรายวิชา
   * @returns {string} HTML Template String
   */
  static render(course) {
    const isGoogle = course.platform === 'google';
    
    // ไอคอนและสีของแพลตฟอร์มซ้ายบนของการ์ด
    const platformIconHtml = isGoogle
      ? `
        <div class="platform-badge-icon google" title="Google Classroom">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="12" fill="#FEF3C7"/>
            <path d="M7 8H17V16H7V8Z" fill="#34A853"/>
            <path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" fill="#FABB05"/>
          </svg>
        </div>
      `
      : `
        <div class="platform-badge-icon microsoft" title="Microsoft Teams">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="12" fill="#F3E8FF"/>
            <path d="M12 7C13.1046 7 14 7.89543 14 9C14 10.1046 13.1046 11 12 11C10.8954 11 10 10.1046 10 9C10 7.89543 10.8954 7 12 7Z" fill="#6B21A8"/>
            <path d="M16 12H8C7.17157 12 6.5 12.6716 6.5 13.5V17H17.5V13.5C17.5 12.6716 16.8284 12 16 12Z" fill="#7B83EB"/>
          </svg>
        </div>
      `;

    // Badge ตัวเลขงานค้างสีแดงสดมุมขวาบน
    const pendingBadgeHtml = course.pendingAssignments > 0
      ? `<div class="pending-badge" title="งานที่ต้องทำ ${course.pendingAssignments} งาน">${course.pendingAssignments}</div>`
      : '';

    return `
      <article class="course-card" data-course-id="${course.id}" data-platform="${course.platform}">
        <!-- แถบส่วนบน: โลโก้แพลตฟอร์ม + Badge สีแดง -->
        <div class="course-card-header">
          ${platformIconHtml}
          ${pendingBadgeHtml}
        </div>

        <!-- รายละเอียดวิชา -->
        <div class="course-card-body">
          <h3 class="course-card-title">${course.title}</h3>
          <p class="course-card-code">${course.code}</p>
          <p class="course-card-instructor">${course.instructor}</p>
        </div>
      </article>
    `;
  }
}

/**
 * 5. CoursePageManager (คลาสผู้จัดการหลักสำหรับควบคุมหน้า Courses ทั้งหมดแบบ OOP)
 */
export class CoursePageManager {
  constructor() {
    this.courses = [];
    this.selectedPlatforms = [];
    this.searchQuery = '';

    this.statSummaryComponent = new StatSummaryComponent('stat-summary-container');
    this.platformFilterComponent = null;
  }

  /** Initialize navigation and load provider-backed courses. */
  async init() {
    // 1. เรียกใช้ Navigation System เดิมของระบบ
    initNavigation('courses');

    try {
      const [remoteCourses, assignmentsResponse] = await Promise.all([getCourses(), getAssignments()]);
      const assignments = assignmentsResponse.assignments || [];
      this.courses = remoteCourses.map((course) => {
        const related = assignments.filter((item) => item.course_id === course.id);
        const completedAssignments = related.filter((item) => ['submitted', 'completed'].includes(String(item.computed_status || item.status).toLowerCase())).length;
        return new CourseModel({
          id: course.id,
          title: course.name,
          code: course.course_code || '',
          instructor: course.instructor_name || '',
          platform: normalizePlatform(course.platform),
          totalAssignments: related.length,
          completedAssignments,
          pendingAssignments: related.length - completedAssignments,
        });
      });
    } catch (error) {
      const grid = document.getElementById('courses-grid');
      if (grid) grid.textContent = error.message || 'ไม่สามารถโหลดรายวิชาจากระบบได้';
      throw error;
    }
    // 3. เริ่มต้น Component ตัวกรองแพลตฟอร์ม
    this.platformFilterComponent = new PlatformFilterComponent({
      containerId: 'platform-filter-bar',
      onFilterChange: (platforms) => this.handleFilterChange(platforms),
    });

    this.platformFilterComponent.render();

    // 4. ผูก Custom Event สำหรับรับคำค้นหาจาก Topbar
    window.addEventListener('kmaps-search', (e) => {
      this.searchQuery = e.detail?.query || '';
      this.applyFiltersAndRender();
    });

    // 5. Render หน้าจอครั้งแรก
    this.statSummaryComponent.render(this.courses);
    this.applyFiltersAndRender();
  }

  /**
   * Event Handler เมื่อเปลี่ยนตัวเลือกแพลตฟอร์ม
   * @param {string[]} selectedPlatforms แพลตฟอร์มที่เลือก
   */
  handleFilterChange(selectedPlatforms) {
    this.selectedPlatforms = selectedPlatforms;
    this.applyFiltersAndRender();
  }

  /**
   * กรองข้อมูลวิชาตาม แพลตฟอร์ม + คำค้นหา แล้ว Render ลงบน DOM
   */
  applyFiltersAndRender() {
    const gridContainer = document.getElementById('courses-grid');
    if (!gridContainer) return;

    // กรองข้อมูลด้วย Filter & Search Query
    const filteredCourses = this.courses.filter((course) => {
      // 1. ตรวจสอบเงื่อนไขแพลตฟอร์ม (ถ้าเลือก empty หรือกดทั้งหมด จะแสดงทุกวิชา)
      const matchesPlatform =
        this.selectedPlatforms.length === 0 ||
        this.selectedPlatforms.includes(course.platform);

      // 2. ตรวจสอบเงื่อนไขคำค้นหา
      const matchesSearch = course.matchesQuery(this.searchQuery);

      return matchesPlatform && matchesSearch;
    });

    // Render รายการการ์ดวิชา
    if (filteredCourses.length > 0) {
      gridContainer.innerHTML = filteredCourses
        .map((course) => CourseCardComponent.render(course))
        .join('');
    } else {
      // แสดง Empty State หากไม่พบวิชาตรงตามเงื่อนไข
      gridContainer.innerHTML = `
        <div class="courses-empty-state">
          <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h4 class="empty-title">ไม่พบรายวิชาที่ตรงกับการค้นหา</h4>
          <p class="empty-description">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองแพลตฟอร์มเพื่อดูรายวิชาอื่น</p>
        </div>
      `;
    }
  }
}

// เริ่มต้นสคริปต์เมื่อโหลด DOM เสร็จสิ้น
document.addEventListener('DOMContentLoaded', () => {
  const pageManager = new CoursePageManager();
  pageManager.init();
});
