# รายงานวิเคราะห์ระบบ KMAPS และขอบเขตกรณีทดสอบ

**ชื่อโครงงาน:** MultiPlatform Assignment Tracking and Notification System (KMAPS)  
**วันที่จัดทำ:** 2 พฤศจิกายน 2569  
**เอกสารกรณีทดสอบ:** `KMAPS_Test_Cases.xlsx`

## สรุปผลการสำรวจ

- กรณีทดสอบทั้งหมด **198 กรณี**: Frontend **83 กรณี**, Backend **115 กรณี** ทุกกรณีเริ่มต้นเป็น `Not Tested` และเว้นผลทดสอบจริงไว้
- ตรวจหน้า HTML **13 หน้า**: หน้าหลัก 10 หน้า และหน้า Admin 3 หน้า
- FastAPI พบ route decorators **53 registrations**, **46 method/path ที่ไม่ซ้ำ**; เมื่อนับ `/health` และ `/api/v1/ping` มีทั้งหมด **48 method/path ที่ไม่ซ้ำ**
- ตรวจสอบความสามารถที่จัดกลุ่มเป็น **16 โมดูล**; ไม่ได้รันทดสอบกับระบบจริงและไม่กำหนด Pass/Fail ล่วงหน้า

## โครงสร้างโครงการ

- `frontend/pages/`: Login, Register, Forgot Password, Onboarding, Dashboard, Courses, Assignments, Calendar, Notification และ Admin
- `frontend/admin/`: หน้า index, users และ edit-user; `frontend/js/`: API client, authentication/storage, navigation และโมดูลหน้าจอ; `frontend/css/`, components และ assets
- `backend/app/api/v1/routers/`: auth, onboarding, OAuth, webhooks, learning และ admin; ตรวจต่อถึง schemas, services, repositories, models, integrations, config, security และ database
- `backend/worker/`: Celery app, sync engine, token refresh, notification scheduler และ dispatcher
- ตรวจ `backend/alembic/versions/`, `database/*.sql` และ `backend/tests/` ซึ่งมีกรณี password recovery, OAuth callback, Google Classroom และ Microsoft Teams

## สถานะความสามารถจากโค้ดปัจจุบัน

| โมดูล | สถานะ | หลักฐานและข้อจำกัด |
|---|---|---|
| Authentication/JWT | มี implementation; ต้องใช้ฐานข้อมูลและ secrets | Register, Login, Refresh และ current user; ไม่มี API `/auth/logout` |
| Password Recovery/OTP | มี implementation; ต้องตั้ง SMTP/Redis | ขอ OTP, ยืนยัน, เปลี่ยนรหัสผ่าน, TTL, จำกัดจำนวนครั้งและ rate limit |
| OAuth Onboarding | มี implementation; ต้องตั้งค่าผู้ให้บริการ | authorize/callback/connections/disconnect; ป้องกัน state replay ด้วย Redis และเข้ารหัส tokens; callback ทำ initial sync แบบ synchronous |
| Dashboard/Courses/Assignments | มีรายการและสถานะส่วนบุคคล | summary, filters, pagination, personal submitted/note; ไม่มี custom assignment CRUD และ `customTasks=false` |
| Calendar | ทำงานบางส่วนที่ Frontend | สร้างปฏิทินจาก assignments ใน browser; ไม่มี Calendar API แยก |
| Notification settings/rules/inbox | มี implementation | GET/PUT settings, CRUD rules, รายการแจ้งเตือนและ mark read |
| Notification delivery | ทำงานบางส่วน; ต้องใช้ Celery/Redis/SMTP | มีรายการในฐานข้อมูลและส่งอีเมลได้; ไม่พบ browser push service แม้มี channel `push` |
| Google Classroom | มี implementation; ต้องตั้ง OAuth/API/Pub/Sub | ดึงและ upsert ข้อมูล, retry, webhook registration/queue; production ต้องตรวจ Pub/Sub OIDC |
| Microsoft Teams | มี implementation; ต้องตั้ง Microsoft Graph | ดึงข้อมูลผ่าน Graph และ fallback polling; ต้องมี tenant/consent/scopes; ไม่มี change notification endpoint |
| Admin | มีหลายความสามารถ แต่พบ route ซ้ำ | จัดการ users/roles/status, connections, audit, export, monitoring และ logs; รายละเอียดอยู่ในข้อจำกัด |
| Database/migrations | มี models/repositories/migrations; ต้องตรวจฐานจริง | ต้องยืนยัน migration บนฐานว่างและฐานทดสอบ; source ยืนยัน schema ที่ deploy ไม่ได้ |
| Shared UI/API | มี implementation; ไม่ได้ตรวจ browser execution รอบนี้ | session refresh, error mapping, navigation/search/sync และ responsive styles |

## ความเสี่ยงและข้อจำกัด

1. **Admin routes ซ้ำ 7 รายการ:** `admin.py` และ `admin_router.py` ลงทะเบียน GET paths ซ้ำ ได้แก่ `/admin/users`, `/admin/connections`, `/admin/audit-logs`, `/admin/monitoring/sync-status`, `/admin/monitoring/errors`, `/admin/monitoring/alerts` และ `/admin/server-logs` โดยมี schema/parameters ต่างกันบางส่วน ต้องตรวจ runtime dispatch และ `/openapi.json`
2. **ไม่มี Custom Task CRUD ฝั่ง Backend:** Frontend ตั้ง `FEATURES.customTasks=false`; ไม่มี API สร้าง/แก้/ลบ assignment
3. **ไม่มี Calendar API:** หน้าปฏิทินคำนวณจาก assignments ใน browser
4. **ไม่มี `/auth/logout`:** logout เป็นการจัดการ session ฝั่ง Frontend
5. OAuth callback เรียก initial sync ก่อน redirect จึงขึ้นกับ provider, database และบริการภายนอก
6. Google webhook บน production ต้องตั้ง Pub/Sub OIDC audience/service account/topic; local test จำกัดตาม environment และ loopback/secret
7. Microsoft Graph ต้องตั้ง application, tenant consent และ scopes; ใช้ test tenant หรือ mock
8. Email OTP/notification ต้องใช้ SMTP sandbox; `push` ยังไม่ใช่ browser push notification
9. ต้องตรวจ migration กับฐานทดสอบทั้งแบบว่างและมีข้อมูลเพื่อยืนยัน schema parity
10. `PROJECT_DOC/18_backend_database_api_readiness_audit.md` เป็นเอกสารเก่าที่ระบุว่า notification workers ว่าง แต่ source ปัจจุบันมี scheduler/dispatcher แล้ว จึงยึดโค้ดปัจจุบันเป็นหลัก

## การเตรียมสภาพแวดล้อมทดสอบ

1. ใช้ database และ Redis แยก; migrate schema และเตรียม student/admin, platforms, connections, courses, assignments, personal states, rules และ notifications
2. เปิด FastAPI และ Celery worker/beat ใน test environment เท่านั้น; ใช้ JWT/encryption secrets สำหรับทดสอบ
3. ใช้ Google/Microsoft sandbox หรือ mock; กำหนด OAuth redirect/scopes/consent และ Pub/Sub test OIDC เมื่อตรวจ webhook
4. ใช้ SMTP sandbox/mailbox สำหรับ OTP และ reminder; หลีกเลี่ยงการส่งไปยังผู้รับจริงหรือส่งจำนวนมาก
5. ใช้ placeholders สำหรับ passwords/tokens; ห้ามใส่ secrets จริงใน workbook
6. เปิด Frontend ผ่าน local server ตรวจ desktop/mobile และบันทึกภาพหลักฐาน
7. ตรวจ runtime OpenAPI และจัดการ route Admin ซ้ำก่อนทดสอบเทียบ response schema

## ความครอบคลุม

- Frontend **83 กรณี** แยกตรวจ controls, forms, validation, filters, empty/error states, navigation, responsive และ state transitions ตาม handler ที่พบ
- Backend **115 กรณี** ครอบคลุม route registrations (รวมกรณีซ้ำเพื่อทดสอบ conflict), health/ping, negative validation/security และ worker/provider/database integration
- พบ test files: `backend/tests/test_password_recovery_flow.py`, `test_oauth_callback.py`, `test_google_classroom_integration.py`, `test_microsoft_teams_integration.py`; การมีไฟล์ไม่ยืนยันว่าทดสอบผ่าน
- ไม่อ้าง 100% line/branch coverage; ต้อง execute browser/API tests และบันทึกผลจริงก่อนสรุป coverage
