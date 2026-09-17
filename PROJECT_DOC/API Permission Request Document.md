# เอกสารคำขอสิทธิ์การใช้งาน API (API Permission Request Document)

## ข้อมูลโครงการ

* **ชื่อโครงการ:** KMITL Multi-Platform Assignment Tracking and Notification System (KMAPS)
* **ประเภทระบบ:** Web Application (FastAPI Backend + HTML5/CSS3/JS Frontend)
* **หน่วยงาน/สถาบัน:** สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง (KMITL)
* **ผู้รับผิดชอบหลัก (Main Backend & Infra):** ชยางกูร สองพิมพ์ (ทีม KMAPS)
* **ผู้ติดต่อฝ่ายความปลอดภัย/IT:** ช่องทางติดต่อโครงการ KMAPS (ต้องระบุอีเมลที่ติดต่อได้จริงก่อนส่งคำขอ)

---

## 1. วัตถุประสงค์โครงการและขอบเขตการใช้งาน

ระบบ **KMAPS** ทำหน้าที่รวบรวมข้อมูลรายการงานที่ได้รับมอบหมาย (Assignments), กำหนดส่งงาน (Due dates), และสถานะการส่งงานจากแพลตฟอร์มการเรียนรู้ออนไลน์ เพื่อนำมาแสดงผลรวมศูนย์ที่จุดเดียว (Centralized Dashboard) และแจ้งเตือนนักศึกษาล่วงหน้าก่อนถึงกำหนดส่ง

**สถานะการรองรับ ณ ปัจจุบัน:** Google Classroom รองรับการเชื่อมต่อและดึงรายวิชา/งาน/สถานะการส่งของผู้ใช้แล้ว ส่วน Microsoft Teams รองรับ OAuth และ Refresh Token แล้ว แต่การดึงรายวิชาและงานผ่าน Microsoft Graph Education API ยังอยู่ระหว่างพัฒนา จึงยังไม่เปิดใช้เป็นฟังก์ชัน Sync ใน MVP

### หลักการเข้าถึงข้อมูล (Data Access Principles):
1. **Read-only 100%:** ระบบอ่านเฉพาะข้อมูลรายวิชา งานที่มอบหมาย และสถานะการส่งงานเท่านั้น ไม่มีฟังก์ชันการแก้ไข สร้าง ลบ หรือส่งงานแทนผู้ใช้บนแพลตฟอร์มต้นทาง
2. **Least Privilege Principle:** ร้องขอเฉพาะ OAuth Scopes และ Delegated Permissions เท่าที่จำเป็นต่อการใช้งานตาม Functional Requirements (FR) เท่านั้น
3. **User-Centric Data Scope:** ข้อมูลถูกดึงตามสิทธิ์บัญชีของนักศึกษาผู้ล็อกอิน (Delegated User Access) ไม่มีการดึงข้อมูลของผู้อื่นที่ไม่ได้รับอนุญาต

---

## 2. รายการสิทธิ์ Microsoft Graph API (Delegated Permissions)

แอปพลิเคชันลงทะเบียนบน **Microsoft Entra ID (Azure AD)** ในรูปแบบ Multi-Tenant (รองรับสถาบันและบัญชีองค์กร) โดยขอสิทธิ์ระดับ Delegated Permissions ดังนี้:

| Permission Identifier | Display Name | Admin Consent | อ้างอิง FR | วัตถุประสงค์และเหตุผลการใช้งาน |
|---|---|:---:|:---:|---|
| `openid` | Sign users in | ❌ | FR-001, FR-005 | ยืนยันตัวตนผู้ใช้ตามมาตรฐาน OpenID Connect |
| `profile` | View users' basic profile | ❌ | FR-005 | อ่านชื่อและโปรไฟล์พื้นฐานสำหรับแสดงผลในระบบ |
| `email` | View users' email address | ❌ | FR-005 | อ่านอีเมลสถาบัน (@kmitl.ac.th) เพื่อระบุตัวตนผู้ใช้ |
| `offline_access` | Maintain access to data | ❌ | FR-023, FR-024 | ขอ Refresh Token เพื่อซิงก์ข้อมูลการบ้านอัตโนมัติเบื้องหลัง |
| `User.Read` | Sign in and read user profile | ❌ | FR-005 | อ่านข้อมูลบัญชีผู้ใช้ที่กำลังเข้าสู่ระบบ |
| `EduAssignments.ReadBasic` | Read users' class assignments without grades | ✅ | FR-010, FR-011 | อ่านหัวข้อ คำอธิบาย และวันกำหนดส่งของงานโดยไม่อ่านเกรด |
| `EduAssignments.Read` | Read users' class assignments and their grades | ✅ | FR-010, FR-011, FR-012 | อ่านรายละเอียดงานและสถานะการส่งงานของผู้ใช้ เพื่อแสดงสถานะงานใน KMAPS |
| `Team.ReadBasic.All` | Read basic information of teams | ❌ | FR-008 | อ่านชื่อทีม/วิชาที่นักศึกษาเป็นสมาชิกอยู่ |
| `EduRoster.Read` | Read users' view of the roster | ✅ | FR-008 | อ่านโครงสร้างชั้นเรียนและข้อมูลบทบาทที่จำเป็นสำหรับเชื่อม Team กับรายวิชา |

> 📌 **หมายเหตุ:** สิทธิ์กลุ่ม `ChannelMessage.Read.All` และ `Files.Read.All` ถูกตัดออกในเวอร์ชันเปิดตัวแรก (MVP) เพื่อลดความเสี่ยงด้านความเป็นส่วนตัวและไม่ต้องผ่านกระบวนการ Microsoft Protected API Request

---

## 3. รายการสิทธิ์ Google Classroom API (OAuth Scopes)

แอปพลิเคชันขออนุมัติผ่าน **Google Cloud Console OAuth Verification** สำหรับขอบเขตข้อมูลต่อไปนี้:

| OAuth Scope | ประเภท Scope | อ้างอิง FR | วัตถุประสงค์และเหตุผลการใช้งาน |
|---|:---:|:---:|---|
| `openid` | Sensitive | FR-001, FR-004 | ยืนยันตัวตนผ่าน Google Identity Platform |
| `email` | Sensitive | FR-004 | อ่านอีเมลเพื่อเชื่อมโยงกับบัญชี KMAPS |
| `profile` | Sensitive | FR-004 | อ่านชื่อและรูปโปรไฟล์ผู้ใช้ |
| `.../auth/classroom.courses.readonly` | Sensitive | FR-008 | อ่านรายชื่อวิชาที่นักศึกษาลงทะเบียน (ACTIVE) |
| `.../auth/classroom.coursework.me.readonly` | Sensitive | FR-010, FR-011 | อ่านรายการงาน (courseWork) ในรายวิชาของผู้ใช้ |
| `.../auth/classroom.student-submissions.me.readonly` | Sensitive | FR-012 | อ่านสถานะการส่งงาน (`TURNED_IN`, `NEW`, `RETURNED`) เฉพาะของตนเอง |

---

## 4. ตารางจับคู่สิทธิ์กับ Functional Requirements (FR Mapping)

| FR ID | รายละเอียดความต้องการระบบ (FR) | Microsoft Graph Permissions | Google Classroom Scopes |
|:---:|---|---|---|
| **FR-001** | ระบบต้องรองรับการสมัคร/ล็อกอินผู้ใช้ | `openid`, `profile`, `email` | `openid`, `profile`, `email` |
| **FR-004** | ระบบต้องรองรับการเชื่อมต่อ Google Classroom | - | Scopes ในข้อ 3 ทั้งหมด |
| **FR-005** | ระบบต้องรองรับการเชื่อมต่อ Microsoft Teams | `openid`, `profile`, `email`, `User.Read` | - |
| **FR-008** | ดึงข้อมูลรายวิชา (Courses / Teams) | `Team.ReadBasic.All`, `EduRoster.Read` | `classroom.courses.readonly` |
| **FR-010** | ดึงรายการงานที่ได้รับมอบหมาย (Assignments) | `EduAssignments.ReadBasic` | `classroom.coursework.me.readonly` |
| **FR-011** | ดึงรายละเอียดงาน คำอธิบาย และวันกำหนดส่ง | `EduAssignments.ReadBasic`, `EduAssignments.Read` | `classroom.coursework.me.readonly` |
| **FR-012** | ตรวจสอบสถานะการส่งงานของผู้ใช้ | `EduAssignments.Read` | `classroom.student-submissions.me.readonly` |
| **FR-023** | ซิงก์ข้อมูลและ Refresh Token เบื้องหลัง | `offline_access` | Access Type: `offline` (Refresh Token) |
| **FR-024** | รองรับการยกเลิกการเชื่อมต่อแพลตฟอร์ม (Disconnect) | ลบ Token จาก DB / Revoke Session | ลบ Token จาก DB / Revoke Session |

---

## 5. รายการสิทธิ์ที่ไม่ร้องขอ (Explicitly Not Requested)

เพื่อความโปร่งใสและปฏิบัติตามหลักความเป็นส่วนตัว ระบบ KMAPS **ขอยืนยันว่าจะไม่ขอสิทธิ์** ต่อไปนี้:

1. ❌ ไม่ขอสิทธิ์สร้าง แก้ไข ลบ หรือส่งงานแทนผู้ใช้ (`...coursework.students` แบบ Write)
2. ❌ ไม่ขอสิทธิ์เข้าถึงหรือแก้ไขเกรดของผู้เรียนท่านอื่น
3. ❌ ไม่ขอสิทธิ์โพสต์ข้อความหรือสร้างเนื้อหาใน Microsoft Teams หรือ Google Classroom
4. ❌ ไม่ขอสิทธิ์อ่านอีเมลส่วนตัวของผู้ใช้ (`Mail.Read`, `gmail.readonly`, `gmail.modify`) ระบบใช้บัญชี Gmail กลางของ KMAPS แยกต่างหาก พร้อมสิทธิ์ `gmail.send` สำหรับส่งข้อความแจ้งเตือนออกจากบัญชีระบบเท่านั้น
5. ❌ ไม่ขอสิทธิ์เข้าถึงอ่าน/เขียน ไฟล์ใน Google Drive หรือ OneDrive / SharePoint ส่วนตัว
6. ❌ ไม่ขอสิทธิ์จัดการสมาชิก ผู้สอน หรือผู้เรียนในชั้นเรียน

---

## 6. มาตรการรักษาความปลอดภัยและการจัดการ Token (Security & Token Governance)

1. **การเข้ารหัสข้อมูลขณะจัดเก็บ (Encryption at Rest):**
   - Access Token และ Refresh Token ของ Google และ Microsoft จะถูกเข้ารหัสด้วย **Fernet symmetric encryption** ก่อนบันทึกลงตาราง `oauth_connections` ใน PostgreSQL บน **Neon**
   - Master Encryption Key ถูกจัดเก็บในสภาพแวดล้อมระบบ (`.env` / Environment Secrets) ไม่ถูกคอมมิตขึ้น Git
2. **การจัดการเมื่อ Token หมดอายุหรือถูกยกเลิก (Token Revocation & Expiration):**
   - เมื่อระบบพบ HTTP `401 Unauthorized` หรือ `TokenExpiredError` ระบบจะทำการใช้ Refresh Token เพื่อขอ Access Token ใหม่อัตโนมัติ (`_fetch_with_refresh`)
   - หากการซิงก์ล้มเหลว เช่น Provider ปฏิเสธ Token ระบบจะบันทึกผลการซิงก์เป็น failed และเปลี่ยนสถานะการเชื่อมต่อเป็น `broken` เพื่อให้ Admin ตรวจสอบได้
3. **นโยบายการเก็บรักษาข้อมูล (Data Retention & PDPA Compliance):**
   - ข้อมูลการบ้านที่ซิงก์มาจะเก็บไว้ในฐานข้อมูลของ KMAPS เพื่อใช้แสดง Dashboard และประวัติการแจ้งเตือน
   - เมื่อผู้ใช้กด **"Disconnect Platform"** ระบบปัจจุบันลบ OAuth connection และ Token ที่เข้ารหัสของแพลตฟอร์มนั้นออกจากฐานข้อมูลทันที
   - ฟังก์ชัน **Delete Account**, การลบข้อมูลรายวิชา/งานที่เกี่ยวข้อง และนโยบายลบข้อมูลภายใน 30 วัน ยังอยู่ระหว่างพัฒนา จึงจะไม่อ้างว่าเปิดใช้งานแล้วจนกว่าจะมี endpoint และ job ลบข้อมูลจริง

---

## 7. ลิงก์นโยบายและข้อความขอความยินยอม (Consent Screen & Public Policies)

* **URL นโยบายความเป็นส่วนตัว (Privacy Policy):** `https://kmaps.kmitl.ac.th/privacy` — ต้องเผยแพร่และตรวจว่าเข้าถึงได้จริงก่อนส่ง OAuth verification
* **URL ข้อกำหนดการใช้งาน (Terms of Service):** `https://kmaps.kmitl.ac.th/terms` — ต้องเผยแพร่และตรวจว่าเข้าถึงได้จริงก่อนส่ง OAuth verification

### ตัวอย่างข้อความ Consent Screen ภาษาไทย:
> **ขออนุญาตเข้าถึงข้อมูลการเรียนเพื่อการแจ้งเตือนการมอบหมายงาน (KMAPS)**
> ระบบ KMAPS ขออนุญาตอ่านข้อมูลรายวิชา รายการงานที่ได้รับมอบหมาย กำหนดส่งงาน และสถานะการส่งงานจากบัญชีของคุณ เพื่อนำมาจัดแสดงบน Dashboard รวมและแจ้งเตือนกำหนดส่งงานผ่านระบบ ระบบทำงานในรูปแบบ **อ่านอย่างเดียว (Read-only)** โดยจะไม่แก้ไข ลบ หรือส่งงานแทนคุณบน Google Classroom หรือ Microsoft Teams ในทุกกรณี

### Gmail API สำหรับบัญชีผู้ส่งของระบบ

ระบบใช้ Gmail API จากบัญชี Gmail กลางของ KMAPS เพื่อส่งอีเมลแจ้งเตือนถึงอีเมลที่ผู้ใช้ลงทะเบียนไว้ โดยใช้ OAuth scope ต่อไปนี้กับ **บัญชีผู้ส่งของระบบเพียงบัญชีเดียว**:

| OAuth Scope | วัตถุประสงค์ |
|---|---|
| `https://www.googleapis.com/auth/gmail.send` | ส่งอีเมลแจ้งเตือนจากบัญชี Gmail กลางของ KMAPS โดยไม่อ่าน แก้ไข หรือลบอีเมลใน mailbox |

บัญชีผู้ใช้ KMAPS จะไม่ถูกขอ Gmail scope ใด ๆ และ OAuth token ของ Google Classroom จะไม่ถูกนำไปส่งอีเมล

---

## เอกสารอ้างอิง

1. Microsoft Graph Permissions Reference: https://learn.microsoft.com/graph/permissions-reference
2. Google Classroom API Authentication & Scopes: https://developers.google.com/classroom/guides/auth
3. KMAPS System Capability Analysis Document (System_Capability_Analysis_MultiPlatform_Tracking.md)

---

## Checklist ก่อนส่งคำขอ OAuth Verification / Admin Consent

- [ ] ระบุอีเมลติดต่อโครงการที่ติดต่อได้จริง
- [ ] เผยแพร่ Privacy Policy และ Terms of Service ตาม URL ที่ระบุ
- [ ] ตรวจ Redirect URI ใน Google Cloud Console และ Microsoft Entra ID ให้ตรงกับ environment ที่ deploy จริง
- [ ] ตรวจว่า Consent Screen แสดงเฉพาะ scopes ที่ระบุในเอกสารนี้
- [ ] เปิด Gmail API ใน Google Cloud project สำหรับบัญชีผู้ส่งของ KMAPS
- [ ] สร้าง OAuth client สำหรับบัญชีผู้ส่ง และขอ `gmail.send` เฉพาะครั้งแรกเพื่อรับ refresh token
- [ ] เก็บ Gmail sender client secret และ refresh token เป็น environment secret เท่านั้น

### ขั้นตอนตั้งค่า Gmail API ผู้ส่ง (ทำครั้งเดียว)

1. เปิด **Gmail API** ใน Google Cloud project ของ KMAPS
2. สร้าง OAuth Client สำหรับบัญชี Gmail กลางของระบบ และเพิ่ม Redirect URI `http://localhost:8085` (หรือค่าที่ตั้งใน `GMAIL_SENDER_REDIRECT_URI`)
3. ใส่ `GMAIL_SENDER_CLIENT_ID` และ `GMAIL_SENDER_CLIENT_SECRET` ใน `backend/.env`
4. รัน `python -m scripts.gmail_sender_oauth authorize` จากโฟลเดอร์ `backend` แล้วเปิด URL ที่แสดงผลด้วยบัญชี Gmail กลางของ KMAPS
5. เมื่อ redirect กลับ `http://localhost:8085/?code=...` ให้คัดลอกเฉพาะค่า `code`
6. รัน `python -m scripts.gmail_sender_oauth exchange "<code>"` แล้วเก็บ refresh token ที่ได้ใน `GMAIL_SENDER_REFRESH_TOKEN`
7. ตั้ง `GMAIL_SENDER_FROM_EMAIL` ให้เป็นอีเมลเดียวกับบัญชีที่อนุญาต OAuth และ restart API/Celery worker/beat

> Scope `gmail.send` ใช้ส่งเมลออกเท่านั้น แต่เป็น Google restricted scope; ก่อนเปิดใช้ production ต้องประกาศ scope ใน OAuth consent screen และดำเนินการ verification ตามนโยบายของ Google
- [ ] Microsoft Teams Sync ต้องพัฒนาให้ครบก่อนเปิดปุ่มเชื่อมต่อใน production เนื่องจาก Consent Screen ขอสิทธิ์ Education API ทั้งหมดตามเอกสารนี้
- [ ] ห้ามเพิ่ม scope ใหม่โดยไม่อัปเดตเอกสาร, API1_DESIGN.md และ code review
