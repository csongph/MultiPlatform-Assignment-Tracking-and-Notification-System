# API Permission Request Document

## โครงการ

**KMITL Multi-Platform Assignment Tracking and Notification System
(KMAPS)**

## 1. วัตถุประสงค์

ระบบ KMAPS ทำหน้าที่รวบรวมข้อมูลจาก Microsoft Teams และ Google Classroom
เพื่อแสดงงานที่ได้รับมอบหมาย ประกาศ และแจ้งเตือนกำหนดส่งงาน โดยระบบทำงานแบบ
**Read-only** และไม่มีการแก้ไขข้อมูลบนแพลตฟอร์มต้นทาง

## 2. Microsoft Graph API (Delegated Permissions)

| Permission Identifier | Display Name | Admin Consent | FR | วัตถุประสงค์ |
|-----------------------|--------------|---------------:|----|---------------|
| `openid` | Sign users in | ❌ | FR-001, FR-005 | ยืนยันตัวตนผู้ใช้ |
| `profile` | View users' basic profile | ❌ | FR-005 | อ่านข้อมูลโปรไฟล์ |
| `email` | View users' email address | ❌ | FR-005 | อ่านอีเมล |
| `offline_access` | Maintain access to data you have given it access to | ❌ | FR-023, FR-024 | ใช้ Refresh Token |
| `User.Read` | Sign in and read user profile | ❌ | FR-005 | อ่านข้อมูลผู้ใช้ |
| `EduAssignments.ReadBasic` | Read users' class assignments without grades | ✅ | FR-010, FR-011 | อ่านข้อมูลงานพื้นฐาน |
| `EduAssignments.Read` | Read users' class assignments and their grades | ✅ | FR-010, FR-011, FR-012 | อ่านรายละเอียดงานและสถานะ |
| `EduRoster.Read` | Read the organization's roster | ✅ | FR-008 | อ่านข้อมูลรายวิชา |
| `Group.Read.All` | Read all groups | ✅ | FR-008 | อ่านข้อมูล Teams |
| `ChannelMessage.Read.All` | Read all channel messages | ✅* | FR-015 | อ่านประกาศจาก Teams |
| `Files.Read.All` | Read files in all site collections | ✅* | FR-011 | อ่านไฟล์แนบ |
| `Sites.Read.All` | Read items in all site collections | ✅* | FR-011 | อ่านข้อมูล SharePoint |

> *ใช้เมื่อระบบรองรับการอ่านประกาศหรือไฟล์แนบ

## 3. Google Classroom API (OAuth Scopes)

| OAuth Scope | FR | วัตถุประสงค์ |
|-------------|----:|---------------|
| `openid` | FR-001, FR-004 | ยืนยันตัวตน |
| `profile` | FR-004 | อ่านข้อมูลโปรไฟล์ |
| `email` | FR-004 | อ่านอีเมล |
| `https://www.googleapis.com/auth/classroom.courses.readonly` | FR-008 | อ่านรายวิชา |
| `https://www.googleapis.com/auth/classroom.coursework.me.readonly` | FR-010, FR-011 | อ่านงาน |
| `https://www.googleapis.com/auth/classroom.student-submissions.me.readonly` | FR-012 | อ่านสถานะการส่งงาน |
| `https://www.googleapis.com/auth/classroom.announcements.readonly` | FR-015 | อ่านประกาศ |

## 4. Mapping Functional Requirements

| FR | Microsoft Graph | Google Classroom |
|----:|-----------------|------------------|
| FR-001 | openid, profile, email | openid, profile, email |
| FR-004 | - | OAuth Scopes ทั้งหมด |
| FR-005 | openid, profile, email, User.Read | - |
| FR-008 | EduRoster.Read, Group.Read.All | classroom.courses.readonly |
| FR-010 | EduAssignments.ReadBasic, EduAssignments.Read | classroom.coursework.me.readonly |
| FR-011 | EduAssignments.Read | classroom.coursework.me.readonly |
| FR-012 | EduAssignments.Read | classroom.student-submissions.me.readonly |
| FR-015 | ChannelMessage.Read.All | classroom.announcements.readonly |
| FR-019 ถึง FR-021 | EduAssignments.Read | classroom.coursework.me.readonly, classroom.student-submissions.me.readonly |
| FR-023 | offline_access | Refresh Token |
| FR-024 | Permission เดิม | Permission เดิม |

## 5. สิทธิ์ที่ไม่ร้องขอ

| ลำดับ | สิทธิ์ที่ไม่ร้องขอ |
|-------|---------------------|
| 1 | สร้าง แก้ไข หรือลบ Assignment |
| 2 | ส่งงานแทนผู้ใช้ |
| 3 | ให้คะแนน |
| 4 | โพสต์ข้อความใน Microsoft Teams |
| 5 | แก้ไขประกาศ |
| 6 | เข้าถึงอีเมลหรือปฏิทิน |
| 7 | จัดการสมาชิกของรายวิชา |

## 6. สรุป

ระบบใช้เฉพาะ **Delegated Permissions** และ **OAuth Scopes**
ที่จำเป็นสำหรับการอ่านข้อมูล (Read-only) ตามหลัก Least Privilege Principle
เพื่อรองรับการรวบรวมข้อมูล การแจ้งเตือน และการซิงโครไนซ์ข้อมูล
โดยไม่มีการแก้ไขข้อมูลบนแพลตฟอร์มต้นทาง

## 7. ข้อเสนอแนะเพิ่มเติม

- ตรวจสอบและระบุการอนุญาตจากผู้ดูแล (Admin consent) ให้ชัดเจนสำหรับสิทธิ์ที่มีเครื่องหมาย ✅ หรือ ✅* และระบุเหตุผลที่ต้องใช้สิทธิ์เหล่านั้น
- ยืนยันขอบเขตข้อมูล (data scope) ที่ระบบจะอ่าน เช่น ระยะเวลาข้อมูลย้อนหลังที่ต้องการ และชนิดของไฟล์แนบที่จำเป็น
- เพิ่มนโยบายการเก็บรักษาข้อมูล (data retention) และการลบข้อมูลเมื่อไม่ใช้งาน
- ระบุวิธีการจัดการ Refresh Token และมาตรการด้านความปลอดภัย (เช่น การเข้ารหัสและการหมุนรอบของ token)
- กำหนดขั้นตอนการทดสอบ (test plan) ในสภาพแวดล้อมที่จำกัดก่อนขอสิทธิ์จริงในระบบ production
- ระบุการแจ้งผู้ใช้และการขอความยินยอม (consent screen) ให้ชัดเจนว่าระบบอ่านข้อมูลใดบ้างและเพื่อวัตถุประสงค์ใด
- หากมีการอ่านประกาศหรือไฟล์แนบ ให้ประเมินผลกระทบด้านความเป็นส่วนตัวและสิทธิ์เข้าถึง SharePoint/Teams
- ระบุผู้ติดต่อฝ่ายความปลอดภัยหรือผู้ดูแลระบบสำหรับการขอสิทธิ์หรือประเด็นด้านความเป็นส่วนตัว
- เพิ่มหมายเหตุด้าน localization/ภาษา เพื่อให้ข้อความ consent และ UI เหมาะสมกับผู้ใช้ไทย

## ภาคผนวก: รายละเอียดเชิงปฏิบัติการและนโยบาย

- ผู้ติดต่อฝ่ายความปลอดภัย/ผู้ดูแลระบบ:
  - ชื่อ: ทีมความปลอดภัยสารสนเทศ KMITL
  - อีเมล: security@kmitl.ac.th
  - เบอร์โทรศัพท์: +66-2-xxx-xxxx (ฝ่ายสนับสนุน IT)

- การขอ Admin Consent:
  - ระบุสิทธิ์ที่ต้องการพร้อมเหตุผลเชิงธุรกิจ และระบุขอบเขต (scope) เช่น เฉพาะ tenant ของสถาบัน
  - ให้แนบรายการ FR ที่สัมพันธ์กับแต่ละสิทธิ์เพื่อการตรวจสอบความจำเป็น

- ขอบเขตข้อมูล (Data scope):
  - ช่วงข้อมูลย้อนหลังที่ระบบอ่าน: ค่าเริ่มต้น 1 ปี (สามารถปรับตามความต้องการ)
  - ประเภทไฟล์แนบที่อ่านได้: เอกสาร (.pdf, .docx, .pptx), รูปภาพ (.jpg, .png)
  - ข้อยกเว้น: ไฟล์ที่เข้ารหัสหรือมีสิทธิ์พิเศษจะไม่ถูกอ่าน

- นโยบายการเก็บรักษาข้อมูล (Data retention):
  - ข้อมูลชั่วคราว (cache): เก็บไม่เกิน 7 วัน
  - ข้อมูลเชิงดัชนี/เมตาดาต้า: เก็บไม่เกิน 1 ปี
  - หากผู้ใช้ยกเลิกการอนุญาต ให้ลบข้อมูลผู้ใช้ทั้งหมดภายใน 30 วัน

- การจัดการ Refresh Token และความปลอดภัย:
  - ใช้การเข้ารหัสที่มาตรฐาน (AES-256) สำหรับการเก็บ token
  - หมุนรอบ (rotate) Refresh Token เป็นระยะ เช่น ทุก 90 วัน
  - เก็บ/เข้าถึง token ใน secure vault (เช่น Azure Key Vault)

- แผนการทดสอบ (Test plan) ก่อน production:
  - จัดสภาพแวดล้อม sandbox/test tenant ของ Microsoft/AWS/Google
  - ทดสอบกรณีการใช้งานหลัก (login, ดึง assignment, ดึงประกาศ, ตรวจสถานะส่งงาน)
  - ทดสอบสถานการณ์ error handling และการหมดอายุของ token

- ความเป็นส่วนตัว (Privacy Impact Assessment):
  - ประเมินข้อมูลที่อ่านว่าเป็น PII หรือไม่ และกำหนดมาตรการปกป้อง
  - ระบุผู้มีสิทธิ์เข้าถึงข้อมูลภายในระบบ และบันทึกการเข้าถึง (access log)

- ข้อความ Consent Screen (ตัวอย่างภาษาไทย):
  - หัวข้อ: ขออนุญาตเข้าถึงข้อมูลเพื่อการแจ้งเตือนการมอบหมายงาน
  - รายละเอียด: ระบบ KMAPS จะอ่านข้อมูลโปรไฟล์ รายวิชา งานที่มอบหมาย ประกาศ และสถานะการส่งงานจาก Microsoft Teams และ Google Classroom โดยใช้สิทธิ์ที่จำเป็นเท่านั้นเพื่อแสดงข้อมูลและแจ้งเตือนให้ทราบ ระบบจะไม่แก้ไขหรือส่งงานแทนผู้ใช้

- Localization / UI:
  - แปลข้อความ consent, ข้อความแจ้งข้อผิดพลาด และ UI เป็นภาษาไทยอย่างเป็นทางการ
  - ให้มีลิงก์ไปยังนโยบายความเป็นส่วนตัว (ภาษาไทยและอังกฤษ)

- หมายเหตุด้านสิทธิ์พิเศษ (Admin-only scopes):
  - scopes ที่มีเครื่องหมาย ✅ ควรระบุว่าต้องขอ Admin consent และจำกัดเฉพาะ tenant ของสถาบัน
  - หากเป็นไปได้ ให้ขอสิทธิ์แบบ least-privileged เช่น ขอบเขตการอ่านเฉพาะ site/group ที่จำเป็น

## เอกสารอ้างอิง

- Microsoft Graph permissions reference: https://learn.microsoft.com/graph/permissions-reference
- Google Classroom API scopes: https://developers.google.com/classroom/guides/auth
