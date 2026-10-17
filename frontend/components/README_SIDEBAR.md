# KMAPS Reusable Sidebar Component (คู่มือการใช้งาน Sidebar กลาง)

คู่มือนี้จัดทำขึ้นเพื่อให้ทุกคนในทีมสามารถนำ **Sidebar กลาง** ไปใช้งานในหน้าเว็บของตนเอง (Dashboard, Calendar, Tasks, Notifications, Admin หรือหน้าอื่น ๆ) ได้ทันทีอย่างง่ายดาย

---

## 📁 ไฟล์ที่เกี่ยวข้อง

1. **HTML Template**: `frontend/components/sidebar.html`
2. **CSS Styles**: `frontend/css/sidebar.css`
3. **JS Controller**: `frontend/js/sidebar.js`

---

## 🚀 วิธีนำไปใช้ในหน้าของคุณ (Quick Start)

### 1. เชื่อมต่อ CSS ใน `<head>`
```html
<link rel="stylesheet" href="../css/sidebar.css" />
```
*(ถ้าหน้าเว็บของคุณใช้ Tailwind CSS อยู่แล้ว หรือใช้ CSS ปกติ ตัว `sidebar.css` ได้ถูกออกแบบให้เข้ากันได้ 100%)*

### 2. วาง Container Element ใน HTML
วางแท็ก `<div id="sidebar-container"></div>` ไว้ตรงตำแหน่งเมนูด้านซ้ายของเลย์เอาต์:

```html
<div class="flex flex-col md:flex-row gap-5 items-stretch">
  <!-- Container สำหรับ Sidebar กลาง -->
  <div id="sidebar-container" class="shrink-0 w-full md:w-[220px] lg:w-[240px]"></div>

  <!-- เนื้อหาหลักของหน้าคุณ -->
  <main class="flex-1">
    ...
  </main>
</div>
```

### 3. เรียกใช้ใน JavaScript (`<script type="module">`)
```javascript
import { initSidebar, setActiveNavItem } from '../js/sidebar.js';

// เรียกใช้งาน Sidebar พร้อมระบุแท็บที่ต้องการให้ Active
await initSidebar({
  containerId: 'sidebar-container', // หรือส่ง HTMLElement
  active: 'overview', // 'overview' | 'assignments' | 'calendar' | 'onboarding' | 'admin'
});
```

---

## ⚙️ ตัวเลือกการตั้งค่า (Options Reference)

| Option | Type | Default | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `container` | `string \| HTMLElement` | `'sidebar-container'` | id ของ element หรือ DOM element ที่จะให้เรนเดอร์ sidebar |
| `active` | `string` | `'overview'` | ระบุเมนูที่ต้องการให้ไฮไลต์เป็นสีเขียวมะนาว (Active Pill) เช่น `'overview'`, `'assignments'`, `'calendar'`, `'onboarding'`, `'admin'` |
| `onNavigate` | `Function` | `null` | ฟังก์ชัน callback เมื่อผู้ใช้คลิกเมนู `(navId, event) => void` |
| `showAdmin` | `boolean \| 'auto'` | `'auto'` | แสดงลิงก์เข้า Admin Console หรือไม่ (ค่า `'auto'` จะตรวจสอบบทบาทผู้ใช้งานใน Storage อัตโนมัติ ถ้าเป็น `admin` จะแสดง) |
| `customItems` | `Array<Object>` | `[]` | เพิ่มเมนูพิเศษของฟีเจอร์คุณลงใน Sidebar |
| `basePath` | `string` | Auto | ระบุ relative path ของโฟลเดอร์หน้าเว็บ (ปกติ auto ตรวจจับถ้าอยู่ใน `frontend/pages/`) |

---

## 💡 รูปแบบการใช้งานที่พบบ่อย (Common Use Cases)

### กรณีที่ 1: นำไปใช้ในหน้าอื่น (เช่น หน้าปฏิทินแยก, งานที่มอบหมายแยก)
เมื่อผู้ใช้อยู่หน้าอื่น แล้วกดคลิก "ภาพรวม" หรือ "งานที่ได้รับมอบหมาย" ตัว Sidebar จะ redirect กลับไปยัง `dashboard.html?view=...` ให้อัตโนมัติ:

```javascript
import { initSidebar } from '../js/sidebar.js';

await initSidebar({
  active: 'calendar', // ไฮไลต์เมนูปฏิทิน
});
```

### กรณีที่ 2: ควบคุมการเปลี่ยนแท็บในหน้าเดียว (Single Page Tab Switching)
```javascript
import { initSidebar, setActiveNavItem } from '../js/sidebar.js';

await initSidebar({
  active: 'overview',
  onNavigate: (tabId) => {
    console.log('User clicked tab:', tabId);
    // ซ่อน/แสดง section ของคุณเองได้ตามต้องการ
    myCustomTabSwitcher(tabId);
  }
});
```

### กรณีที่ 3: เพิ่มเมนูใหม่ของเพื่อนในทีม (Custom Menu Items)
ถ้ามีฟีเจอร์ใหม่ที่เพื่อนในทีมพัฒนาขึ้นมา สามารถเพิ่มเข้าไปใน Sidebar ได้ง่ายๆ:

```javascript
await initSidebar({
  active: 'analytics',
  customItems: [
    {
      id: 'analytics',
      label: 'สถิติการเรียน',
      badge: 'ใหม่',
      iconSvg: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
                </svg>`,
      onClick: (id) => {
        window.location.href = 'analytics.html';
      }
    }
  ]
});
```

### กรณีที่ 4: เปลี่ยนแท็บที่ Active ด้วยคำสั่ง JavaScript
```javascript
import { setActiveNavItem } from '../js/sidebar.js';

// เปลี่ยนเมนูที่ไฮไลต์เป็นงานที่ได้รับมอบหมาย
setActiveNavItem('assignments');
```

---

## 🛡️ การแสดงผลเมนูแอดมิน (Admin Role Support)
Sidebar จะตรวจเช็คข้อมูลผู้ใช้งานที่ล็อกอินอยู่ (`getUserProfile().role`) อัตโนมัติ หากผู้ใช้งานเป็น `admin` จะปรากฏปุ่ม `⚙️ แผงควบคุมผู้ดูแล` ด้านล่าง Sidebar ให้ทันที
