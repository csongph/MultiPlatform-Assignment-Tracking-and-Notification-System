# เอกสารคำขอสิทธิ์การใช้งาน API (API Permission Request Document)

## ข้อมูลโครงการ

* **ชื่อโครงการ:** KMITL Multi-Platform Assignment Tracking and Notification System (KMAPS)
* **ประเภทระบบ:** Web Application (FastAPI Backend + HTML5/CSS3/JS Frontend)
* **หน่วยงาน/สถาบัน:** สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง (KMITL)
* **ผู้รับผิดชอบหลัก (Main Backend & Infra):** ชยางกูร สองพิมพ์ (ทีม KMAPS)
* **ผู้ติดต่อฝ่ายความปลอดภัย/IT:** security@kmitl.ac.th

---

## 1. วัตถุประสงค์โครงการและขอบเขตการใช้งาน

ระบบ **KMAPS** ทำหน้าที่รวบรวมข้อมูลรายการงานที่ได้รับมอบหมาย (Assignments), กำหนดส่งงาน (Due dates), และสถานะการส่งงาน จากแพลตฟอร์มการเรียนรู้ออนไลน์ต่างระบบ ได้แก่ **Google Classroom** และ **Microsoft Teams** เพื่อนำมาแสดงผลรวมศูนย์ที่จุดเดียว (Centralized Dashboard) และแจ้งเตือนนักศึกษาล่วงหน้าก่อนถึงกำหนดส่ง

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
| `EduAssignments.ReadBasic` | Read users' class assignments without grades | ❌ | FR-010, FR-011 | อ่านหัวข้อการบ้าน คำอธิบาย วันกำหนดส่ง (ไม่รวมเกรด) |
| `EduAssignments.Read` | Read users' class assignments and their grades | ✅ | FR-010, FR-011, FR-012 | อ่านรายละเอียดงานและสถานะการส่งงานของนักศึกษา |
| `Team.ReadBasic.All` | Read basic information of teams | ❌ | FR-008 | อ่านชื่อทีม/วิชาที่นักศึกษาเป็นสมาชิกอยู่ |
| `EduRoster.Read` | Read the organization's roster | ✅ | FR-008 | อ่านข้อมูลรายวิชาและบทบาทสมาชิกในชั้นเรียน |

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
4. ❌ ไม่ขอสิทธิ์เข้าถึงรับ-ส่ง อีเมลส่วนตัว (Mail.Read / Gmail API)
5. ❌ ไม่ขอสิทธิ์เข้าถึงอ่าน/เขียน ไฟล์ใน Google Drive หรือ OneDrive / SharePoint ส่วนตัว
6. ❌ ไม่ขอสิทธิ์จัดการสมาชิก ผู้สอน หรือผู้เรียนในชั้นเรียน

---

## 6. มาตรการรักษาความปลอดภัยและการจัดการ Token (Security & Token Governance)

1. **การเข้ารหัสข้อมูลขณะจัดเก็บ (Encryption at Rest):**
   - Access Token และ Refresh Token ของ Google และ Microsoft จะถูกเข้ารหัสด้วย **AES-256 (Fernet Symmetric Encryption)** ก่อนบันทึกลงตาราง `oauth_connections` ใน PostgreSQL (Supabase)
   - Master Encryption Key ถูกจัดเก็บในสภาพแวดล้อมระบบ (`.env` / Environment Secrets) ไม่ถูกคอมมิตขึ้น Git
2. **การจัดการเมื่อ Token หมดอายุหรือถูกยกเลิก (Token Revocation & Expiration):**
   - เมื่อระบบพบ HTTP `401 Unauthorized` หรือ `TokenExpiredError` ระบบจะทำการใช้ Refresh Token เพื่อขอ Access Token ใหม่อัตโนมัติ (`_fetch_with_refresh`)
   - หากผู้ใช้สั่งถอนสิทธิ์จาก Google/Microsoft Security Dashboard ระบบจะเปลี่ยนสถานะการเชื่อมต่อเป็น `broken` หรือ `disconnected` ทันทีในการซิงก์รอบถัดไป
3. **นโยบายการเก็บรักษาข้อมูล (Data Retention & PDPA Compliance):**
   - ข้อมูลการบ้านที่ซิงก์มาจะเก็บไว้ตราบเท่าที่ผู้ใช้ยังคงเชื่อมต่อบัญชีอยู่
   - หากผู้ใช้กด **"Disconnect Platform"** หรือ **"Delete Account"** ระบบจะทำการ Soft-delete / Hard-delete ข้อมูลการบ้านและลบ OAuth Tokens ทั้งหมดออกจากฐานข้อมูลภายใน 30 วัน

---

## 7. ลิงก์นโยบายและข้อความขอความยินยอม (Consent Screen & Public Policies)

* **URL นโยบายความเป็นส่วนตัว (Privacy Policy):** `https://kmaps.kmitl.ac.th/privacy`
* **URL ข้อกำหนดการใช้งาน (Terms of Service):** `https://kmaps.kmitl.ac.th/terms`

### ตัวอย่างข้อความ Consent Screen ภาษาไทย:
> **ขออนุญาตเข้าถึงข้อมูลการเรียนเพื่อการแจ้งเตือนการมอบหมายงาน (KMAPS)**
> ระบบ KMAPS ขออนุญาตอ่านข้อมูลรายวิชา รายการงานที่ได้รับมอบหมาย กำหนดส่งงาน และสถานะการส่งงานจากบัญชีของคุณ เพื่อนำมาจัดแสดงบน Dashboard รวมและแจ้งเตือนกำหนดส่งงานผ่านระบบ ระบบทำงานในรูปแบบ **อ่านอย่างเดียว (Read-only)** โดยจะไม่แก้ไข ลบ หรือส่งงานแทนคุณในทุกกรณี

---

## เอกสารอ้างอิง

1. Microsoft Graph Permissions Reference: https://learn.microsoft.com/graph/permissions-reference
2. Google Classroom API Authentication & Scopes: https://developers.google.com/classroom/guides/auth
3. KMAPS System Capability Analysis Document (System_Capability_Analysis_MultiPlatform_Tracking.md)
