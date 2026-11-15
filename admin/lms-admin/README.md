# KMAPS Admin — ส่วนผู้ดูแลระบบ

HTML + Tailwind CSS (CDN) + JavaScript ล้วน ไม่ต้อง build — เปิด `index.html` ได้เลย (แนะนำ Live Server ใน VS Code)

## สีหลัก (ตาม Figma)
| สี | ใช้กับ |
|---|---|
| `#FFFFFF` | พื้นหลัง, การ์ด |
| `#000000` | ตัวอักษร, เส้นขอบ |
| `#C8FF59` | ปุ่มหลัก, เมนูที่เลือก, checkbox |
| Linear `#0B0612 → #1B1029 → #6A4A9A` | Sidebar, แถบสีเข้ม |
| `#CFC3E6` | หัวตาราง, พื้นรอง (ม่วงลาเวนเดอร์) |

แก้สีได้ที่ `:root` ใน `assets/css/style.css` และ `tailwind.config` ใน `index.html`

## ไฟล์ HTML (1 ไฟล์ = 1 หน้า)
| ไฟล์ | หน้า |
|---|---|
| `index.html` | ภาพรวมระบบ (กราฟ 4 แบบ: วงกลม / โดนัท / แท่ง / ตาราง) |
| `users.html` | จัดการผู้ใช้งาน + หน้าต่างยืนยันทั้งหมด |
| `user-detail.html?id=5` | รายละเอียดผู้ใช้ (เปิดจากปุ่มรูปตาในตาราง) |
| `connections.html` | การเชื่อมต่อ LMS |

โครงหน้า การ์ด หัวตาราง และหน้าต่างยืนยัน (modal) เขียนไว้ใน HTML ทั้งหมด
JS ทำหน้าที่เติมข้อมูลลงช่องที่มี `id` หรือ `data-bind="..."` และจัดการปุ่มเท่านั้น

## โครงสร้างไฟล์
```
index.html, users.html, user-detail.html, connections.html
assets/css/style.css         สี + ปุ่ม/ชิป/ตาราง/checkbox ตามดีไซน์
assets/js/mock-data.js       ข้อมูลจำลอง 292 ผู้ใช้ ฯลฯ (ลบได้เมื่อมี backend)
assets/js/api.js             ชั้นเรียกข้อมูล — จุดเดียวที่ต้องแก้ตอนต่อ backend
assets/js/core.js            ตัวช่วยกลาง: วันที่ พ.ศ., toast, modal, เมนู, sidebar
assets/js/user-actions.js    การทำงานของ modal ผู้ใช้ (ใช้ร่วม users + user-detail)
assets/js/overview.js        สคริปต์ของ index.html
assets/js/users.js           สคริปต์ของ users.html
assets/js/user-detail.js     สคริปต์ของ user-detail.html
assets/js/connections.js     สคริปต์ของ connections.html
assets/img/logo.png
```

## ต่อ Backend
ใน `assets/js/api.js`
```js
const USE_MOCK = false;
const API_BASE_URL = "https://your-api.com/api";
```
ระบบส่ง `Authorization: Bearer <token>` จาก `localStorage.token` ให้อัตโนมัติ
ถ้า error ให้ตอบเป็น `{ "message": "..." }` หน้าเว็บจะแสดงใน toast

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| GET | `/admin/overview` | `{ users:{total,students,admins}, activeStudents7d, activeGrowth, courses, platforms, recentUsers }` |
| GET | `/admin/users` | รายชื่อผู้ใช้ทั้งหมด |
| GET | `/admin/users/:id` | ผู้ใช้ 1 คน + `activities` |
| POST | `/admin/admins/invite` | เชิญแอดมิน `{ firstName, lastName, email, sendInvite }` |
| POST | `/admin/users/:id/promote` | แต่งตั้งผู้ใช้เดิมเป็นแอดมิน |
| PATCH | `/admin/users/status` | ระงับ/เปิดใช้งาน `{ ids:[], status:"suspended"\|"active", reason }` |
| DELETE | `/admin/users` | ลบ `{ ids:[] }` |
| POST | `/admin/users/:id/reset-login` | ออกจากระบบทุกอุปกรณ์ |
| DELETE | `/admin/users/:id/accounts` | ยกเลิกการเชื่อมบัญชี LMS `{ platforms:["google","teams"] }` |
| GET | `/admin/users/:id/login-history?days=30` | `{ total, failed, devices, rows:[{time,via,device,ip,ok}] }` |
| GET | `/admin/lms` | `{ platforms, settings, stats, history }` |
| DELETE | `/admin/lms/:id` | ยกเลิกการเชื่อมต่อแพลตฟอร์ม |
| POST | `/admin/lms/:id/connect` | เชื่อมต่อใหม่ (ควรคืน `redirectUrl` ไปหน้า OAuth) |
| PUT | `/admin/lms/settings` | บันทึกการตั้งค่าซิงค์ |
| GET | `/admin/lms/history/:id/log` | log ของการซิงค์รอบนั้น |

รูปแบบ object ของผู้ใช้/แพลตฟอร์มดูตัวอย่างได้ใน `mock-data.js`
ค่า enum: `role` = `student | admin`, `status` = `active | suspended | inactive`,
แพลตฟอร์ม `status` = `connected | expiring | error | disconnected`
