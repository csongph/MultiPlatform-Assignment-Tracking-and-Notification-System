# รายงานตรวจความพร้อม Backend, Database และ API สำหรับ Frontend

**โครงการ:** MultiPlatform Assignment Tracking and Notification System (KMAPS)  
**วันที่ตรวจ:** 17 กันยายน 2569  
**ขอบเขต:** ตรวจเทียบเอกสารแผนพัฒนา, โครงสร้างฐานข้อมูล, Alembic migration, FastAPI routes, Services, Workers และการเรียก API ของ Frontend ที่มีใน repository

---

## 1. บทสรุปสำหรับทีม

ระบบมีโครงสร้าง FastAPI แบบ Router → Service → Repository และมีฐานของ Authentication, OAuth, Google Classroom Sync, Dashboard, Admin Console และ Sync Log แล้ว แต่ยัง **ไม่พร้อมเป็น API ที่ Frontend ใช้งานได้ครบทุกฟีเจอร์**

สาเหตุหลักคือ schema ใน Neon, SQLAlchemy model, Alembic migration, เอกสาร API และ endpoint ที่ Frontend เรียก ยังไม่ตรงกันทั้งหมด โดยจุดที่ต้องแก้ก่อนที่สุดคือ:

1. ทำ Database migration ให้สร้างฐานข้อมูลใหม่ได้ครบ และให้ตรงกับ Neon จริง
2. ทำ API สถานะงานรายบุคคล (`user_assignment_status`)
3. ทำ Notification Rules และ Notification Worker
4. ทำ Password Recovery endpoints
5. แก้ Frontend ที่เรียก endpoint สร้าง/แก้/ลบงานซึ่ง Backend ยังไม่มี
6. ตัดสินใจเรื่อง Microsoft Teams Sync: ทำให้ครบ หรือปิดจาก MVP ชั่วคราว

---

## 2. ภาพรวมความพร้อมตามแผนพัฒนา

| Module | สถานะ | หลักฐานในระบบ | งานที่ยังขาด |
|---|---|---|---|
| M1 Authentication | ใช้ได้บางส่วน | Register, Login, JWT, `/users/me` | Refresh, Logout, Forgot/Reset Password |
| M3 OAuth Onboarding | ใช้ได้บางส่วน | Google/Microsoft OAuth authorize/callback/disconnect | ลบ test placeholder route, ทดสอบบัญชีจริง |
| M4 Sync Engine | Google ใช้ได้บางส่วน | Celery sync, token refresh, sync logs | Microsoft fetching, retry/rate limit, tests |
| M5 Course/Assignment Aggregation | ใช้ได้บางส่วน | อ่าน courses/assignments จาก DB | Course response ไม่ครบ, custom task policy ไม่ชัด |
| M6 Task Tracking | ยังไม่ครบ | มีตาราง `user_assignment_status` | ไม่มี API submitted/note/read state |
| M7 Dashboard | ใช้ได้บางส่วน | `/dashboard/summary`, `/assignments` | อิงสถานะส่วนกลาง ไม่ใช่สถานะผู้ใช้ |
| M8 Calendar | ยังไม่มี | ไม่มี router/endpoint | ต้องสร้าง Calendar API |
| M9 Search/Filter/Sort | ใช้ได้บางส่วน | filter status/course/due_before | ขาด keyword search, sort, pagination |
| M10 Notification Settings | ใช้ได้พื้นฐาน | GET/PUT notification settings | ขาด rule CRUD, reminder intervals ใน response |
| M10 Notification Delivery | ยังไม่ทำ | มีตาราง notifications | notification worker สองไฟล์ว่าง |
| M11 Deep Link | ใช้ได้ระดับข้อมูล | `source_url` ใน AssignmentOut | ต้องกำหนด UX/validation URL ฝั่ง Frontend |
| M12–M16 Admin | ค่อนข้างครบ | Users, role, connection, audit, monitoring, server logs | router ซ้ำ, log ไม่ถาวร, security ของ export token |

---

## 3. จุดเสี่ยงระดับวิกฤต (ต้องทำก่อนเชื่อม Frontend จริง)

### 3.1 Migration, Model และ Neon ไม่เป็น source of truth เดียวกัน

**สถานะที่พบ**

- `UserAssignmentStatus` และ `NotificationRule` มีอยู่ใน `backend/app/models/core.py`
- แต่ initial migration ไม่ได้สร้างสองตารางนี้
- migration `a1b2c3d4e5f6` ใช้ `ALTER TABLE` กับตารางที่อาจยังไม่มี
- `courses.course_code` และ `notifications.notification_rule_id` มีใน model แต่ไม่มี migration ที่ชัดเจน
- 4 ฟิลด์ที่เพิ่มใน Neon ล่าสุดยังไม่มีใน model/migration:

```text
user_assignment_status.submitted
user_assignment_status.submitted_at
user_assignment_status.is_overdue
user_assignment_status.personal_note
```

**ผลกระทบ**

- สมาชิกใหม่ไม่สามารถสร้างฐานข้อมูลจาก Git ได้อย่างมั่นใจ
- การรัน `alembic upgrade head` อาจล้มเหลวบนฐานข้อมูลว่าง
- Backend อาจอ่านหรือเขียนคอลัมน์ไม่ตรงกับ Neon

**สิ่งที่ต้องทำ**

1. สร้าง migration ใหม่ที่สร้าง/ปรับ schema ล่าสุดแบบครบถ้วน
2. เพิ่ม 4 ฟิลด์ล่าสุดใน SQLAlchemy model
3. เพิ่ม relationship กลับใน `User` ได้แก่ `assignment_statuses` และ `notification_rules`
4. export `UserAssignmentStatus` และ `NotificationRule` ใน `app/models/__init__.py`
5. ทดสอบ migration กับ database ว่างทุกครั้งก่อน merge
6. หลังจากนี้เปลี่ยน schema ผ่าน Alembic เท่านั้น ไม่แก้ Neon ด้วย SQL Console โดยไม่มี migration คู่กัน

---

### 3.2 Task Tracking ของ Frontend ยังไม่มี API รองรับ

Frontend Dashboard เรียก endpoint เหล่านี้:

```text
POST /assignments/create
POST /assignments/update-status
POST /assignments/delete
```

แต่ Backend ไม่มี endpoint เหล่านี้ จึงจะตอบ `404` เมื่อเปิดใช้ API จริง (`KMAPS_USE_MOCK_API = false`)

**ข้อเสนอการออกแบบ**

Assignment ที่ดึงจาก LMS ต้องเป็นข้อมูลส่วนกลางแบบอ่านอย่างเดียว ส่วนข้อมูลเฉพาะผู้ใช้ให้เก็บใน `user_assignment_status`

| ความสามารถ | ตาราง/ฟิลด์ที่ใช้ | Endpoint ที่ควรมี |
|---|---|---|
| ระบุว่าส่งงานแล้ว | `submitted`, `submitted_at` | `PATCH /assignments/{id}/status` |
| เก็บโน้ตส่วนตัว | `personal_note` | `PATCH /assignments/{id}/note` |
| เปิดอ่านงาน | `is_read`, `read_at`, `last_viewed_at` | `POST /assignments/{id}/viewed` |
| ดูสถานะงานส่วนตัว | `user_assignment_status` | รวมใน `GET /assignments` และ `GET /assignments/{id}` |

หากต้องการให้ผู้ใช้สร้างงานเอง ให้สร้างตาราง `custom_tasks` แยกจาก `assignments` ของ LMS แทนการปะปนข้อมูลสองชนิด

---

### 3.3 Notification Pipeline ยังไม่มีการทำงานจริง

ไฟล์ต่อไปนี้ว่าง:

```text
backend/worker/notification/scheduler.py
backend/worker/notification/dispatcher.py
```

ตาราง `notification_rules` และ `notifications` มีอยู่ แต่ไม่มี worker ที่ประเมินกฎ, สร้างรายการแจ้งเตือน หรือส่งแจ้งเตือน

**Flow ที่ต้องพัฒนา**

```text
Celery Beat
  → หา Assignment ที่ยังไม่ส่งและใกล้ถึงกำหนด
  → หา NotificationRule ของผู้ใช้ที่เปิดใช้งาน
  → ตรวจ lead_time_minutes และ sequence_order
  → สร้าง Notification พร้อม notification_rule_id และ tier
  → ตรวจ unique constraint เพื่อไม่ส่งซ้ำ
  → Dispatcher ส่ง in-app ก่อน แล้วค่อยเพิ่ม email
  → บันทึก status, retry_count และ delivered_at
```

---

### 3.4 Microsoft Teams ยังไม่รองรับการดึงงาน

Microsoft OAuth และ token refresh มีโค้ดแล้ว แต่ `MicrosoftTeamsFetcher.fetch_assignments()` ยัง raise `NotImplementedError`

**ทางเลือกก่อน release MVP**

- ทางเลือก A: ทำ Microsoft Graph Education API ให้ดึง classes และ assignments ได้จริง
- ทางเลือก B: กำหนด MVP ให้รองรับ Google Classroom เท่านั้น และซ่อน Microsoft Teams ใน Frontend ชั่วคราว

ห้ามประกาศว่า Teams Sync ใช้งานได้จนกว่าจะเลือกและทำทางเลือก A สำเร็จ

---

## 4. API Contract ที่ต้องปรับ

### 4.1 Endpoint ที่ควรเพิ่ม

#### Authentication และ Recovery

```text
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

#### Assignment และสถานะรายบุคคล

```text
GET   /assignments?q=&status=&platform=&sort=&page=&page_size=
GET   /assignments/{assignment_id}
PATCH /assignments/{assignment_id}/status
PATCH /assignments/{assignment_id}/note
POST  /assignments/{assignment_id}/viewed
```

#### Calendar

```text
GET /calendar?month=YYYY-MM
```

#### Notification Rules

```text
GET    /notification-rules
POST   /notification-rules
PATCH  /notification-rules/{rule_id}
DELETE /notification-rules/{rule_id}
```

#### Notifications

```text
GET   /notifications?status=&page=
PATCH /notifications/{notification_id}/read
```

### 4.2 Response ที่ต้องเพิ่มข้อมูล

`CourseOut` ควรเพิ่ม:

```text
course_code
description
instructor_name
```

`AssignmentOut` ควรเพิ่ม:

```text
submitted
submitted_at
is_overdue
personal_note
is_read
last_viewed_at
```

`NotificationSettingsOut` และ update payload ควรรองรับ:

```text
reminder_intervals
```

### 4.3 เอกสาร API ที่ต้องแก้ให้ตรงโค้ด

เอกสารบางชุดใช้ endpoint คนละชื่อกับ Backend เช่น:

| เอกสารเดิม | API ในโค้ดจริง | การตัดสินใจที่ต้องทำ |
|---|---|---|
| `/oauth/{platform}/init` | `/oauth/{platform}/authorize` | เลือกชื่อเดียว แล้วอัปเดตทั้งสองฝั่ง |
| `POST /oauth/{platform}/callback` | `GET /oauth/{platform}/callback` | ใช้ GET ตาม OAuth redirect |
| `/notifications/settings` | `/notification-settings` | เลือกชื่อเดียว |
| `/auth/logout` | ไม่มี | เพิ่ม endpoint หรือเอาออกจากเอกสาร |
| `/auth/refresh` | ไม่มี | เพิ่ม endpoint |

`API1_DESIGN.md`, `PROJECT_DOC/01...10...` และ Frontend ต้องอ้างอิง contract ฉบับเดียวกัน

---

## 5. งานเฉพาะไฟล์

| ไฟล์/โฟลเดอร์ | สิ่งที่ต้องปรับ |
|---|---|
| `backend/app/models/auth.py` | เพิ่ม relationships ของ User สำหรับ assignment statuses และ notification rules |
| `backend/app/models/core.py` | เพิ่ม 4 ฟิลด์ล่าสุดใน UserAssignmentStatus; ตรวจ constraints/indexes |
| `backend/app/models/__init__.py` | export UserAssignmentStatus และ NotificationRule |
| `backend/alembic/versions/` | เพิ่ม migration ใหม่ให้ตรง Neon และสร้าง schema ใหม่ได้จากศูนย์ |
| `backend/neon_migration_patch.sql` | ปรับให้ตรง migration ใหม่ หรือเลิกใช้เป็นช่องทางหลัก |
| `backend/app/schemas/learning.py` | เพิ่ม Course/Assignment personal status/rules/reminder intervals/pagination schemas |
| `backend/app/repositories/learning_repository.py` | join UserAssignmentStatus, keyword search, pagination, sort, calendar query |
| `backend/app/services/learning_service.py` | business rule ของ submitted/note/viewed และ mapping response |
| `backend/app/api/v1/routers/learning.py` | เพิ่ม route status, note, viewed, calendar, notification rules |
| `backend/worker/notification/` | implement scheduler และ dispatcher |
| `backend/worker/celery_app.py` | include notification tasks และตั้ง beat schedule |
| `backend/app/api/v1/routers/auth.py` | เพิ่ม refresh/logout/recovery endpoints |
| `backend/app/services/auth_service.py` | implement create/verify/consume recovery token |
| `backend/app/integrations/microsoft_teams_adapter.py` | ทำ Graph Education fetcher หรือซ่อน feature |
| `frontend/js/api.js` | เปลี่ยนการเรียก custom task/status/delete ให้ตรง API ที่สร้างจริง |
| `frontend/js/dashboard.js` | รองรับข้อมูล personal status และ pagination |
| `backend/app/api/v1/routers/admin_router.py` | ลบหรือรวมกับ `admin.py` เพื่อไม่ให้ API drift |
| `API1_DESIGN.md` และ `PROJECT_DOC/*.md` | ปรับ endpoint และ status ให้ตรงกับ implementation |

---

## 6. แผนพัฒนาเรียงลำดับ

### Sprint A — Schema และ API Contract (ต้องทำก่อน)

1. ตรวจ Neon schema จริงและบันทึกเป็น migration
2. ปรับ model ให้ตรงฐานข้อมูล
3. ทดสอบ `alembic upgrade head` บน database ว่าง
4. สรุป OpenAPI contract v1 ชุดเดียว
5. ลบ router ซ้ำ/placeholder ที่สร้างความสับสน

**เกณฑ์ผ่าน:** ทุกคน clone project แล้ว migrate ฐานข้อมูลใหม่ได้ และ `/docs` แสดง API ตามเอกสาร

### Sprint B — Student API สำหรับ Frontend

1. ทำ UserAssignmentStatus CRUD เฉพาะฟิลด์ที่อนุญาต
2. เพิ่มข้อมูล Course/Assignment ให้ครบใน response
3. ทำ search, sort, pagination และ Calendar API
4. ปรับ Dashboard ไม่ให้เรียก endpoint ที่ไม่มี

**เกณฑ์ผ่าน:** ผู้ใช้ดูงาน, ทำเครื่องหมายส่งแล้ว, เพิ่มโน้ต, filter/search และเห็น Calendar ได้จาก API จริง

### Sprint C — Notification และ Recovery

1. ทำ Notification Rule CRUD
2. ทำ Celery notification scheduler/dispatcher
3. เพิ่ม in-app notification history และ read state
4. ทำ forgot/reset password พร้อม token หมดอายุและใช้ครั้งเดียว

**เกณฑ์ผ่าน:** ระบบสร้าง notification ครั้งที่ 1/2/3 ตาม rule ของผู้ใช้และไม่ส่งซ้ำ; recovery reset password ได้จริง

### Sprint D — Integration และ Admin Hardening

1. ทำ Microsoft Teams Sync หรือพัก feature อย่างชัดเจน
2. ย้าย sync ใน OAuth callback ไป Celery queue
3. เพิ่ม monitoring ของ notification worker
4. ย้าย Server Log จาก memory buffer ไป structured/persistent logging หากเตรียม deploy

**เกณฑ์ผ่าน:** ทุก platform ที่แสดงใน UI ดึงงานได้จริง และ Admin ตรวจ failure ได้

### Sprint E — Quality, Security และ Release

1. Unit test: status, notification rule, recovery token
2. Integration test: register → OAuth mock → sync → status → notify
3. Migration test: empty DB → upgrade head
4. Rate limit login/recovery/OAuth
5. เลิกส่ง JWT ผ่าน query string สำหรับ CSV export; ใช้ authenticated fetch + Blob download
6. เพิ่ม CI ให้รัน lint, test และ migration check ทุก pull request

**เกณฑ์ผ่าน:** ผ่าน test suite, ไม่มี secret ใน Git, และ deploy environment ใช้ migration เดียวกับ local

---

## 7. Definition of Done ก่อนให้ Frontend ใช้ API จริง

- [ ] Neon schema, Alembic migration และ SQLAlchemy models ตรงกัน
- [ ] Frontend ไม่มีการเรียก endpoint ที่ 404
- [ ] ทุก API มี request/response documented ใน OpenAPI
- [ ] Google sync ผ่านการทดสอบบัญชีจริง
- [ ] Microsoft ถูกทำครบ หรือถูกปิดจาก UI อย่างชัดเจน
- [ ] Assignment แสดงสถานะเฉพาะผู้ใช้ได้
- [ ] Notification rule และ notification worker ทำงานจริง
- [ ] Password recovery ทำงาน end-to-end
- [ ] Calendar/Search/Pagination ทำงานตาม UI
- [ ] มี automated tests สำหรับ flow สำคัญ
- [ ] ไม่มี token/password/connection string ใน Git

---

## 8. หมายเหตุการใช้งานเอกสาร

เอกสารนี้เป็น backlog เชิงเทคนิคสำหรับทีม Backend และใช้เป็น checklist ก่อนเชื่อม Frontend กับ API จริง หากมีการแก้ schema ใน Neon ต้องสร้าง Alembic migration และอัปเดตเอกสารนี้พร้อมกันทุกครั้ง

---

## 9. สถานะเริ่มต้นการแก้ Migration (17 กันยายน 2569)

เริ่มดำเนินการแล้วดังนี้:

- เพิ่ม migration `b2c3d4e5f6a_add_personal_task_state_and_notification_links.py`
- เพิ่ม `courses.course_code`
- เพิ่ม `notifications.notification_rule_id` และ foreign key ไปยัง `notification_rules`
- เพิ่ม `submitted`, `submitted_at`, `is_overdue`, `personal_note` ใน `user_assignment_status`
- เพิ่ม index สำหรับค้นหางานที่ยังไม่ส่งและงานที่เลยกำหนด
- ปรับ revision `a1b2c3d4e5f6` ให้สร้าง `user_assignment_status` และ `notification_rules` ได้เมื่อสร้าง database ใหม่
- ปรับ SQLAlchemy model และตรวจ mapper แล้วผ่าน

ขั้นตอนถัดไปคือรัน `alembic upgrade head` กับ Neon ผ่าน connection string ของทีม แล้วตรวจ schema จริงด้วย SQL query ก่อนเริ่มทำ Task Tracking API
