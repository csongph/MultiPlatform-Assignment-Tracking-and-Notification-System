# กรณีทดสอบ Frontend — KMAPS

**ขอบเขต:** ทดสอบหน้าจอ การป้อนข้อมูล การตรวจสอบข้อมูล การนำทาง การแสดงสถานะ และการโต้ตอบของผู้ใช้ใน `frontend/` เท่านั้น การตอบกลับจาก API/OAuth ใช้ข้อมูลจำลองเพื่อทดสอบการแสดงผลและการจัดการสถานะ โดยไม่ทดสอบ backend/provider/database/worker

**วันที่จัดทำ:** 6 พฤศจิกายน 2569  
**สถานะเริ่มต้น:** Not Tested ทุกกรณี  
**วิธีบันทึกผล:** ระบุ Pass/Fail/Blocked, วันที่, ผู้ทดสอบ และหลักฐานในช่องผลจริง/หมายเหตุ

## การเตรียมทดสอบ

1. เปิด frontend ผ่าน local web server เพื่อให้ ES modules ทำงาน (เช่น `python -m http.server 5500` ที่โฟลเดอร์ `frontend/`); หลีกเลี่ยงการเปิด HTML ด้วย `file://`.
2. เตรียม browser desktop และ mobile viewport, บัญชีผู้ใช้ตัวอย่าง, ข้อมูลจำลองสำหรับรายการรายวิชา/งาน/แจ้งเตือน และ mock API สำหรับกรณี success, empty, unauthorized, validation error และ server/network error.
3. สำหรับ OAuth ให้จำลองการกลับจาก provider ด้วย query parameters/สถานะเชื่อมต่อ; ไม่จำเป็นต้องใช้บัญชี provider จริง.
4. ผลที่คาดหวังเป็นผลสังเกตจาก UI/URL/browser storage. ไม่ถือว่าผลสำเร็จจาก mock เป็นการยืนยันการทำงานของ backend.

## กรณีทดสอบ

| ID | หน้า/โมดูล | กรณีทดสอบ | ขั้นตอน | ผลที่คาดหวัง | ผลจริง / หมายเหตุ | สถานะ |
|---|---|---|---|---|---|---|
| FE-AUTH-001 | สมัครสมาชิก | เปิดหน้าสมัครสมาชิก | เปิด `pages/register.html` | หน้าและส่วนประกอบ auth แสดงครบ ไม่มี error ในการโหลดหน้า |  | Not Tested |
| FE-AUTH-002 | สมัครสมาชิก | สมัครด้วยข้อมูลที่ถูกต้อง | กรอกชื่อ อีเมล รหัสผ่าน และยืนยันรหัสผ่านที่ถูกต้อง แล้วส่งฟอร์ม | ส่งคำขอหนึ่งครั้ง แสดงสถานะกำลังทำงาน และเมื่อ mock สำเร็จไปยังขั้นตอน/หน้าถัดไปตามที่ UI กำหนด |  | Not Tested |
| FE-AUTH-003 | สมัครสมาชิก | ตรวจช่องบังคับและรูปแบบอีเมล | เว้นช่องบังคับหรือใส่อีเมลผิดรูปแบบ แล้วส่ง | แสดงข้อผิดพลาดที่ช่องเกี่ยวข้อง ไม่ส่งฟอร์ม |  | Not Tested |
| FE-AUTH-004 | สมัครสมาชิก | ตรวจนโยบายรหัสผ่าน | ใส่รหัสผ่านที่ไม่ผ่านข้อกำหนด แล้วส่ง | แสดงข้อความตามข้อกำหนดและไม่ส่งฟอร์ม |  | Not Tested |
| FE-AUTH-005 | สมัครสมาชิก | รหัสผ่านยืนยันไม่ตรงกัน | ใส่รหัสผ่านและยืนยันคนละค่า | แสดงข้อผิดพลาดที่ช่องยืนยันและไม่ส่งฟอร์ม |  | Not Tested |
| FE-AUTH-006 | สมัครสมาชิก | API ปฏิเสธ/ขัดข้อง | จำลองอีเมลซ้ำหรือ server/network error | แสดงข้อความผิดพลาดที่เข้าใจได้ คงข้อมูลที่กรอก และคืนสถานะปุ่มให้ใช้งานได้ |  | Not Tested |
| FE-AUTH-007 | เข้าสู่ระบบ | เข้าสู่ระบบสำเร็จและจดจำฉัน | กรอก credential ที่ถูกต้อง เลือก remember me แล้วส่ง | เมื่อ mock สำเร็จ เปิด dashboard; session ถูกเก็บใน storage ตามตัวเลือกจดจำ |  | Not Tested |
| FE-AUTH-008 | เข้าสู่ระบบ | เข้าสู่ระบบโดยไม่เลือกจดจำฉัน | เข้าสู่ระบบสำเร็จโดยไม่เลือกตัวเลือก | เปิด dashboard และ session ใช้ storage แบบชั่วคราวตามการออกแบบ |  | Not Tested |
| FE-AUTH-009 | เข้าสู่ระบบ | ตรวจข้อมูลว่าง/อีเมลไม่ถูกต้อง | ส่งฟอร์มที่ขาดข้อมูลหรือมีอีเมลผิดรูปแบบ | แสดง validation และไม่ส่งคำขอ |  | Not Tested |
| FE-AUTH-010 | เข้าสู่ระบบ | credential ไม่ถูกต้องหรือ API ขัดข้อง | จำลอง 401 และ network error | แสดงข้อความผิดพลาด ไม่เปิด dashboard และไม่ค้างสถานะ loading |  | Not Tested |
| FE-AUTH-011 | เข้าสู่ระบบ | แสดง/ซ่อนรหัสผ่าน | กดปุ่มสลับการมองเห็นรหัสผ่านสองครั้ง | ชนิดช่องเปลี่ยนระหว่าง password/text โดยค่าที่กรอกไม่หาย |  | Not Tested |
| FE-AUTH-012 | เข้าสู่ระบบ | ลิงก์ไปสมัคร/ลืมรหัสผ่าน | กดลิงก์จากหน้า login | เปิดหน้า register หรือ forgot-password ที่ตรงกับลิงก์ |  | Not Tested |
| FE-AUTH-013 | กู้คืนรหัสผ่าน | ขอรหัส OTP ด้วยอีเมลถูกต้อง | เปิด `pages/forgot-password.html`, กรอกอีเมล แล้วส่งโดย mock success | แสดงข้อความส่งรหัสและย้ายไปขั้นตอนยืนยันตาม flow |  | Not Tested |
| FE-AUTH-014 | กู้คืนรหัสผ่าน | อีเมลว่างหรือผิดรูปแบบ | ส่งอีเมลว่าง/ผิดรูปแบบ | แสดง validation และไม่ส่งคำขอ |  | Not Tested |
| FE-AUTH-015 | กู้คืนรหัสผ่าน | ขอ OTP ไม่สำเร็จ | จำลอง API error/rate limit | แสดงข้อผิดพลาดและไม่แสดงว่าขอสำเร็จ |  | Not Tested |
| FE-AUTH-016 | กู้คืนรหัสผ่าน | กรอกและยืนยัน OTP | กรอก OTP ครบ/ไม่ครบ/ผิด แล้วส่งโดยจำลองผลสำเร็จและไม่สำเร็จ | ปฏิเสธข้อมูลไม่ครบ; เมื่อสำเร็จย้ายไปขั้นตอนตั้งรหัสใหม่; เมื่อผิดแสดงข้อผิดพลาด |  | Not Tested |
| FE-AUTH-017 | กู้คืนรหัสผ่าน | รูปแบบ OTP | พิมพ์อักขระที่ไม่ใช่ตัวเลขและข้อความยาวเกินจำนวนช่อง | ช่อง OTP คงเฉพาะรูปแบบ/ความยาวที่ UI รองรับ |  | Not Tested |
| FE-AUTH-018 | กู้คืนรหัสผ่าน | ส่ง OTP ซ้ำและ countdown | หลังขอ OTP กด resend ระหว่างนับถอยหลัง แล้วกดหลังหมดเวลา | ระหว่างนับถอยหลังปุ่มไม่ส่งซ้ำ; หลังหมดเวลาส่งคำขอใหม่และเริ่มนับใหม่ |  | Not Tested |
| FE-AUTH-019 | กู้คืนรหัสผ่าน | ตั้งรหัสผ่านใหม่ | ตั้งรหัสผ่านถูกต้องและยืนยันตรงกัน โดย mock success | แสดงผลสำเร็จและให้กลับไปหน้า login ตาม flow |  | Not Tested |
| FE-AUTH-020 | กู้คืนรหัสผ่าน | รหัสใหม่ไม่ผ่าน/ยืนยันไม่ตรง | ส่งรหัสผ่านที่ไม่ผ่าน validation หรือยืนยันไม่ตรง | แสดงข้อผิดพลาดและไม่ส่งคำขอเปลี่ยนรหัส |  | Not Tested |
| FE-AUTH-021 | กู้คืนรหัสผ่าน | เปลี่ยนรหัสผ่าน API error | จำลอง token หมดอายุหรือ server error | แสดงข้อความผิดพลาดและยังแก้ข้อมูล/ลองใหม่ได้ |  | Not Tested |
| FE-ONB-001 | Onboarding | แสดงสถานะ provider เริ่มต้น | เปิด `pages/onboarding.html` โดย mock ไม่มี connection | แสดง Google Classroom และ Microsoft Teams เป็นยังไม่เชื่อมต่อ; ปุ่มไป dashboard อยู่ในสถานะ disabled |  | Not Tested |
| FE-ONB-002 | Onboarding | เริ่มเชื่อม Google | กด Connect Google โดย mock authorize URL | browser เปลี่ยนไป URL authorize ที่ได้รับจาก API |  | Not Tested |
| FE-ONB-003 | Onboarding | เริ่มเชื่อม Microsoft | กด Connect Microsoft โดย mock authorize URL | browser เปลี่ยนไป URL authorize ที่ได้รับจาก API |  | Not Tested |
| FE-ONB-004 | Onboarding | callback OAuth สำเร็จ | เปิดหน้าพร้อม query success/synced ที่กำหนด | แสดง toast/สถานะเชื่อมต่อสำเร็จ และทำความสะอาด query จาก URL ตาม flow |  | Not Tested |
| FE-ONB-005 | Onboarding | callback OAuth ผิดพลาด | เปิดหน้าพร้อม oauth_error | แสดงข้อความผิดพลาด ไม่แสดง provider ว่าเชื่อมต่อสำเร็จ |  | Not Tested |
| FE-ONB-006 | Onboarding | refresh สถานะ connection | mock API ส่ง provider เชื่อมแล้ว/ไม่เชื่อม/ผิดพลาด | badge และปุ่มของแต่ละ provider สะท้อนสถานะ; error แสดง feedback |  | Not Tested |
| FE-ONB-007 | Onboarding | ไป dashboard เมื่อเชื่อมอย่างน้อยหนึ่ง platform | จำลอง connection สำเร็จ แล้วกด Go to Dashboard | ลิงก์เปิด dashboard และไม่คงสถานะ disabled |  | Not Tested |
| FE-ONB-008 | Onboarding | ยังไม่เชื่อม platform | ไม่มี connection แล้วลองกด Go to Dashboard | ไม่เปลี่ยนหน้า; ลิงก์ยัง disabled/aria-disabled |  | Not Tested |
| FE-NAV-001 | Navigation | โหลด sidebar และ topbar | เปิดหน้า app ที่มี navigation | แสดงรายการนำทาง แถบค้นหา ปุ่ม sync และโปรไฟล์ โดยไม่ซ้อน/หาย |  | Not Tested |
| FE-NAV-002 | Navigation | เปลี่ยนหน้าจาก sidebar | กด Dashboard, Courses, Assignments, Calendar, Notifications และ onboarding | เปิด URL/หน้าเป้าหมายถูกต้องและรายการปัจจุบันแสดง active state |  | Not Tested |
| FE-NAV-003 | Navigation | ค้นหาจาก topbar | พิมพ์คำค้นและ submit/รอผลบน dashboard, courses, calendar และ notifications | หน้ารองรับแสดงผล/กรองรายการตรงคำค้น; คำค้นว่างไม่ทำให้ UI พัง |  | Not Tested |
| FE-NAV-004 | Navigation | เปิด/ปิดเมนูบน mobile | ที่ viewport แคบ กดปุ่ม toggle และเลือกลิงก์ | sidebar เปิด/ปิดได้; เลือกลิงก์แล้วเมนูปิด |  | Not Tested |
| FE-NAV-005 | Navigation | ปิดเมนูด้วย Escape | เปิด sidebar แบบ mobile แล้วกด Escape | sidebar ปิดและ focus/การนำทางยังใช้งานได้ |  | Not Tested |
| FE-NAV-006 | Navigation | สั่งซิงก์จาก topbar | กดปุ่มซิงก์โดย mock success/error | แสดง loading ระหว่างทำงาน ป้องกันการกดซ้ำ และคืนปุ่มพร้อม feedback เมื่อเสร็จ |  | Not Tested |
| FE-NAV-007 | Navigation | ออกจากระบบ | กดปุ่ม logout | ล้าง session ฝั่ง browser และนำกลับไปหน้า login |  | Not Tested |
| FE-NAV-008 | Shared UI | Toast และปิด toast | ทำให้เกิด toast success/error แล้วกด dismiss หรือรอหมดเวลา | toast แสดงข้อความ/ชนิดถูกต้องและหายเมื่อปิดหรือหมดเวลา |  | Not Tested |
| FE-DASH-001 | Dashboard | โหลดภาพรวมสำเร็จ | เปิด `pages/dashboard.html` พร้อม mock profile, summary, assignments, courses และ connections | ชื่อผู้ใช้ สถิติ ความคืบหน้ารายวิชา รายการงาน และ connections แสดงตรงข้อมูล |  | Not Tested |
| FE-DASH-002 | Dashboard | API ว่าง/ผิดพลาด | จำลองรายการว่างและ API failure แยกกัน | แสดง empty state หรือ error feedback ตามลำดับ โดยหน้าไม่พังและมีวิธีลองใหม่/ซิงก์ตาม UI |  | Not Tested |
| FE-DASH-003 | Dashboard | สลับ view/tab | เลือกแท็บ/มุมมอง dashboard ที่มีในหน้า | เนื้อหาและ active state เปลี่ยนไปยัง view ที่เลือก |  | Not Tested |
| FE-DASH-004 | Dashboard | กรองรายการงาน | เปลี่ยนตัวกรองสถานะ/รายวิชา/แพลตฟอร์ม | feed แสดงเฉพาะรายการที่ตรงตัวกรอง และตัวเลือกปัจจุบันชัดเจน |  | Not Tested |
| FE-DASH-005 | Dashboard | จัดเรียงและเรียงความคืบหน้า | เปลี่ยน sort และกดปุ่มเรียง progress | ลำดับรายการเปลี่ยนตามตัวเลือก โดยไม่สูญเสียข้อมูล |  | Not Tested |
| FE-DASH-006 | Dashboard | เปลี่ยนสถานะ assignment | กดควบคุมสถานะงานหนึ่งรายการ โดย mock success | สถานะบนการ์ด/ตัวเลขสรุปอัปเดตตรงกันและแสดง feedback |  | Not Tested |
| FE-DASH-007 | Dashboard | อัปเดตสถานะไม่สำเร็จ | จำลอง API error ขณะเปลี่ยนสถานะ | แสดง error และคง/คืนค่าสถานะเดิมอย่างสอดคล้อง |  | Not Tested |
| FE-DASH-008 | Dashboard | ส่วนเชื่อมต่อและ timeline | ใช้ข้อมูล connections และ due dates หลายวัน รวมรายการว่าง | แสดง provider, สถานะและลำดับ timeline ถูกต้อง; empty state อ่านเข้าใจได้ |  | Not Tested |
| FE-DASH-009 | Dashboard | เปลี่ยนโปรไฟล์/โหลดข้อมูล | จำลอง user profile loaded, unauthorized และ refresh failure | ชื่อ/สิทธิ์ตรงข้อมูล; กรณี session ใช้ไม่ได้จัดการตาม flow login; error แสดง feedback |  | Not Tested |
| FE-DASH-010 | Dashboard | sync complete refresh | dispatch เหตุการณ์ sync complete หลังโหลดหน้า | dashboard โหลดข้อมูลใหม่และแสดงรายการ/ตัวเลขล่าสุด |  | Not Tested |
| FE-COURSE-001 | Courses | โหลดรายวิชาและสถิติ | เปิด `pages/courses.html` โดย mock courses และ assignments | การ์ดสรุปและการ์ดรายวิชาแสดงค่าและชื่อถูกต้อง |  | Not Tested |
| FE-COURSE-002 | Courses | กรองแพลตฟอร์ม | เลือก Google, Microsoft, ทั้งหมด และตัวกรองหลายค่า (ถ้ามี) | แสดงรายวิชาตรง platform ที่เลือก; ตัวกรองทั้งหมดคืนรายการครบ |  | Not Tested |
| FE-COURSE-003 | Courses | เปิดรายวิชาไปยังงาน | กดการ์ดรายวิชา | เปิดหน้ารายการ assignments พร้อม course id/platform ที่ตรงกับการ์ด |  | Not Tested |
| FE-COURSE-004 | Courses | ค้นหารายวิชา | ใช้ topbar search ด้วยชื่อบางส่วนและคำที่ไม่พบ | รายการถูกกรองและแสดง empty state เมื่อไม่พบ |  | Not Tested |
| FE-COURSE-005 | Courses | ไม่มีรายวิชา/API error | จำลอง courses ว่างและ server/network error | แสดงข้อความว่าง/ผิดพลาดที่เหมาะสม ไม่แสดงการ์ดข้อมูลเก่าค้าง |  | Not Tested |
| FE-COURSE-006 | Courses | sync complete | dispatch sync complete | สถิติและรายการรายวิชาถูกโหลด/อัปเดตใหม่ |  | Not Tested |
| FE-ASG-001 | Assignments | โหลดงานและตัวเลขสรุป | เปิด `pages/assignments.html` พร้อมงานหลายสถานะ | ยอดรวม วันนี้ เลยกำหนด และส่งแล้วตรงกับข้อมูลที่แสดง |  | Not Tested |
| FE-ASG-002 | Assignments | กรองตามสถานะ | เลือกแท็บสถานะทั้งหมด/ค้าง/ส่งแล้ว/เลยกำหนดที่มีใน UI | แสดงเฉพาะรายการที่ตรงสถานะและ active tab ถูกต้อง |  | Not Tested |
| FE-ASG-003 | Assignments | กรองตามรายวิชาและ platform | เลือก course chip และ platform | ผลลัพธ์ตรงค่าตัวกรอง; การเปลี่ยนตัวกรองล้าง/คงค่าอื่นตามการออกแบบ |  | Not Tested |
| FE-ASG-004 | Assignments | เรียงรายการงาน | เลือก due date/ตัวเลือก sort ที่มี | รายการเรียงตรงตัวเลือก; ค่าที่ไม่มีวันกำหนดแสดงตามกติกา UI |  | Not Tested |
| FE-ASG-005 | Assignments | ค้นหางาน | ค้นด้วยชื่อ assignment/course และคำที่ไม่พบ | กรองรายการตามคำค้นและแสดง empty state เมื่อไม่พบ |  | Not Tested |
| FE-ASG-006 | Assignments | เปิดลิงก์ assignment | กดลิงก์งานที่มี URL ภายนอก | เปิด URL งานที่ตรงรายการในรูปแบบ target ที่กำหนด |  | Not Tested |
| FE-ASG-007 | Assignments | จัดการสถานะ/บันทึกส่วนตัว | เปลี่ยนสถานะงานหรือบันทึก note ตาม controls ที่มี | UI แสดงการเปลี่ยนแปลง/ข้อความยืนยันตรงข้อมูล; โหลดซ้ำสะท้อนค่าที่ mock ส่งคืน |  | Not Tested |
| FE-ASG-008 | Assignments | validation ของ note/form | ส่ง note ว่างหรือข้อมูลเกินขอบเขตที่กำหนด | แสดง validation และไม่ส่งข้อมูลที่ไม่ถูกต้อง |  | Not Tested |
| FE-ASG-009 | Assignments | ตั้ง/แก้/ลบ reminder | เปิด dialog reminder, บันทึกข้อมูลถูกต้อง, แก้และลบโดย mock | dialog เปิดปิดได้; รายการและจำนวนกฎอัปเดต; ยืนยันลบตาม UI |  | Not Tested |
| FE-ASG-010 | Assignments | reminder validation/API error | บันทึกเวลาหรือข้อมูลไม่ถูกต้อง และจำลอง API error | แสดง validation/error; dialog และข้อมูลเดิมยังอยู่ให้แก้ไขได้ |  | Not Tested |
| FE-ASG-011 | Assignments | งานว่าง/API error | จำลองไม่มีงาน, load failure และ update failure | แสดง empty/error state แยกกัน; ไม่แสดงข้อมูลผิดหรือค้าง loading |  | Not Tested |
| FE-ASG-012 | Assignments | ตอบสนองต่อการซิงก์ | dispatch sync complete | รายการและตัวเลขสรุป refresh โดยไม่ reload หน้าเอง |  | Not Tested |
| FE-CAL-001 | Calendar | สร้างปฏิทินเดือนเริ่มต้น | เปิด `pages/calendar.html` ที่เดือนปัจจุบัน | แสดงชื่อเดือน ปี และ grid วันถูกตำแหน่งพร้อมวันงาน |  | Not Tested |
| FE-CAL-002 | Calendar | เปลี่ยนเดือนและปี | เปลี่ยน monthSelect และ yearSelect | ปฏิทินวาดใหม่ตามเดือน/ปีที่เลือก รวมปีอธิกสุรทิน |  | Not Tested |
| FE-CAL-003 | Calendar | สถิติงาน | ใช้ assignments หลายสถานะ | ตัวเลขงานทั้งหมด ครบกำหนด และส่งแล้วตรงข้อมูล |  | Not Tested |
| FE-CAL-004 | Calendar | เปิดรายละเอียดวัน | คลิกวันที่มีงานและวันที่ไม่มีงาน | เปิด modal พร้อมวันที่และรายการงานถูกต้อง; วันว่างแสดงข้อความเหมาะสม |  | Not Tested |
| FE-CAL-005 | Calendar | ปิดรายละเอียดวัน | กดปุ่มปิด คลิก overlay และกด Escape (ถ้ารองรับ) | modal ปิดตามวิธีที่กำหนดและไม่ปิดเมื่อคลิกภายในเนื้อหา |  | Not Tested |
| FE-CAL-006 | Calendar | บันทึกการส่งงาน/หมายเหตุ | เลือกงาน กรอก note ถูกต้อง แล้วส่งโดย mock success | แสดง feedback และสถานะ/หมายเหตุของงานอัปเดต |  | Not Tested |
| FE-CAL-007 | Calendar | ตรวจ note ว่าง/API error | ส่ง note ว่างและจำลอง API error | ช่อง required ป้องกันค่าว่าง; error แจ้งผู้ใช้และ modal ยังใช้งานได้ |  | Not Tested |
| FE-CAL-008 | Calendar | สถานะปฏิทินและค้นหา | โหลดข้อมูลสำเร็จ/ผิดพลาด และใช้ search | ข้อความ status/live region และรายการที่เห็นสะท้อนสถานะ/คำค้น |  | Not Tested |
| FE-CAL-009 | Calendar | sync complete | dispatch sync complete | ปฏิทินและสถิติอัปเดตจากข้อมูลใหม่ |  | Not Tested |
| FE-NOT-001 | Notifications | โหลดสถิติ กฎ และ inbox | เปิด `pages/notification.html` พร้อม mock data | สถิติ กฎแจ้งเตือน รายการ inbox และจำนวน unread แสดงตรงข้อมูล |  | Not Tested |
| FE-NOT-002 | Notifications | แสดงรายการที่ตั้งไว้ | มี reminder rules และไม่มี rules | แสดงรายละเอียดกฎ/จำนวน; กรณีว่างแสดง empty state |  | Not Tested |
| FE-NOT-003 | Notifications | เปิดจัดการ reminders | กดลิงก์จัดการการเตือน | เปิดหน้า assignments ที่จัดการ reminder ได้ |  | Not Tested |
| FE-NOT-004 | Notifications | กรองทั้งหมด/ยังไม่อ่าน | สลับแท็บ All และ Unread | แสดงรายการตามตัวกรอง จำนวน และ aria-selected ถูกต้อง |  | Not Tested |
| FE-NOT-005 | Notifications | ทำเครื่องหมายอ่านหนึ่งรายการ | กด mark read บน notification | รายการเปลี่ยนเป็นอ่านแล้ว จำนวน unread ลดลง และมี feedback |  | Not Tested |
| FE-NOT-006 | Notifications | ทำเครื่องหมายอ่านทั้งหมด | กดปุ่ม mark all เมื่อมี unread | รายการทั้งหมดเปลี่ยนเป็นอ่านแล้ว ปุ่ม/ตัวนับอัปเดต |  | Not Tested |
| FE-NOT-007 | Notifications | inbox ว่างและ API error | จำลอง empty, rules error และ notification error | แสดงสถานะว่าง/ผิดพลาดเฉพาะส่วนที่เกี่ยวข้องและยังใช้ส่วนอื่นได้ |  | Not Tested |
| FE-NOT-008 | Notifications | refresh อัตโนมัติ/กลับเข้าแท็บ | focus หน้า, เปลี่ยน visibility และกลับมา | ข้อมูล refresh ตามกลไกหน้า; เมื่อออกจากหน้าหยุด timer |  | Not Tested |
| FE-NOT-009 | Notifications | sync complete และค้นหา | dispatch sync complete และใช้ search | สถิติ/list refresh และผลค้นหาตรงคำค้น |  | Not Tested |
| FE-ADMIN-001 | Admin Console | เปิด console และเปลี่ยน section | เปิด `pages/admin.html`, เลือก Users, Connections, Audit, Monitoring, Logs | panel ที่เลือกแสดง, panel อื่นซ่อน และ active state ถูกต้อง |  | Not Tested |
| FE-ADMIN-002 | Admin Console | ตารางผู้ใช้และค้นหา | โหลด users mock แล้วค้นหาชื่อ/อีเมล/คำที่ไม่มี | ตารางและจำนวนหน้าแสดงถูกต้อง; ค้นหาแสดงผลตรงคำ |  | Not Tested |
| FE-ADMIN-003 | Admin Console | เปลี่ยนหน้า users/audit | ใช้ prev/next เมื่อมีหลายหน้าและอยู่ขอบเขต | แสดงหน้าที่ถูกต้อง; ปุ่มขอบเขต disabled ตามสถานะ |  | Not Tested |
| FE-ADMIN-004 | Admin Console | กรอง connections | เลือก filter provider/status ต่าง ๆ | ตาราง connections เปลี่ยนตรง filter และ empty state ถูกต้อง |  | Not Tested |
| FE-ADMIN-005 | Admin Console | export connections | กด export เมื่อมีข้อมูลและไม่มีข้อมูล | ดาวน์โหลดไฟล์ข้อมูลที่แสดงในตาราง หรือแจ้ง empty/error ตามพฤติกรรม UI |  | Not Tested |
| FE-ADMIN-006 | Admin Console | กรอง audit logs | เลือกผู้ใช้ action และวันที่ | ตารางแสดงเฉพาะเหตุการณ์ตรงเงื่อนไข; ล้าง filter คืนผลทั้งหมด |  | Not Tested |
| FE-ADMIN-007 | Admin Console | export audit logs | กด export พร้อมผลลัพธ์และเมื่อไม่มีผล | ดาวน์โหลดข้อมูลตาม filter ปัจจุบัน หรือแสดง empty/error |  | Not Tested |
| FE-ADMIN-008 | Admin Console | refresh system health | กด refresh monitoring โดย mock health success/error | สถานะสุขภาพและตัวเลข sync/error อัปเดต; error มีข้อความชัดเจน |  | Not Tested |
| FE-ADMIN-009 | Admin Console | แสดง sync status และ error summary | mock สถิติและ errors หลาย provider/ไม่มีข้อมูล | ตัวเลขและตารางแสดงตรงข้อมูล; empty state เมื่อไม่มี errors |  | Not Tested |
| FE-ADMIN-010 | Admin Console | server logs และ auto refresh | เลือกระดับ/ช่วง log, กด refresh, สลับ auto-refresh | log viewport แสดงข้อมูลใหม่และการตั้ง auto-refresh สะท้อนสถานะ |  | Not Tested |
| FE-ADMIN-011 | Admin Console | API unauthorized/error | จำลอง 401/403 และ server error ในแต่ละ panel | แสดงข้อความที่เหมาะสม ไม่ render ข้อมูลผิด และยังใช้งาน panel อื่นได้ |  | Not Tested |
| FE-ADMIN-012 | Admin Console | Responsive layout | ดูทุก section ที่ desktop และ mobile viewport | navigation, filter, table/console อ่านและใช้งานได้โดยไม่ทับกัน; เลื่อนแนวนอนเมื่อจำเป็น |  | Not Tested |
| FE-ADMUSR-001 | Admin Users | โหลดรายการและค้นหา | เปิด `admin/users.html`, โหลด mock users แล้วพิมพ์คำค้น | ตารางแสดงข้อมูลและผลค้นหาทันที/หลัง submit ตาม UI |  | Not Tested |
| FE-ADMUSR-002 | Admin Users | แสดงสถานะว่าง/ผิดพลาด | จำลองไม่มี user และ API error | แสดง empty/error feedback โดยไม่ค้าง loading |  | Not Tested |
| FE-ADMUSR-003 | Admin Users | เปิดแก้ไข user | กด edit ของแถวหนึ่ง | เปิด `admin/edit-user.html` พร้อม id/ข้อมูลผู้ใช้ที่เลือก |  | Not Tested |
| FE-ADMUSR-004 | Admin Users | เมนู sync รายผู้ใช้ | กดปุ่ม sync และเลือกตัวเลือกที่มี | เมนูเปิด/ปิดถูกต้องและเรียกการทำงานของตัวเลือกนั้นหนึ่งครั้ง; แสดงผลสำเร็จ/ผิดพลาด |  | Not Tested |
| FE-ADMUSR-005 | Admin Users | ลบ user | กด delete และตอบรับ/ยกเลิก confirmation | ยกเลิกลบแล้วข้อมูลคงเดิม; ยืนยันแล้วแถวหายและแสดง feedback |  | Not Tested |
| FE-ADMEDIT-001 | Admin Edit User | เปิดข้อมูล user ที่มี id | เปิด `admin/edit-user.html` ด้วย id ที่ถูกต้อง | แสดงข้อมูลผู้ใช้ปัจจุบันใน current info และฟอร์ม |  | Not Tested |
| FE-ADMEDIT-002 | Admin Edit User | บันทึกการแก้ไข | ปรับข้อมูล/role/status ที่ฟอร์มรองรับแล้วบันทึกด้วย mock success | แสดง feedback และข้อมูลที่แก้ไขสะท้อนในหน้า/รายการ |  | Not Tested |
| FE-ADMEDIT-003 | Admin Edit User | ตรวจข้อมูลบังคับ/รูปแบบ | ล้างช่องบังคับหรือกรอกค่าผิดรูปแบบแล้วบันทึก | แสดง validation และไม่ส่งข้อมูล |  | Not Tested |
| FE-ADMEDIT-004 | Admin Edit User | user ไม่มี/บันทึก API error | ใช้ id ที่ไม่พบและจำลอง save error | แสดงสถานะไม่พบ/ข้อผิดพลาด; ไม่รายงานว่าบันทึกสำเร็จ |  | Not Tested |
| FE-RESP-001 | ทุกหน้าผู้ใช้ | responsive ที่จอมือถือ | ตรวจ login, register, recovery, onboarding, dashboard, courses, assignments, calendar, notifications ที่ความกว้างมือถือ | เนื้อหาไม่ล้น/ทับกัน controls แตะได้ และ sidebar ใช้ได้ |  | Not Tested |
| FE-RESP-002 | หน้าผู้ดูแล | responsive ที่จอมือถือ | ตรวจ Admin Console, users และ edit-user ที่ความกว้างมือถือ | ฟอร์มและ controls ใช้ได้ ตารางเลื่อนได้ และข้อความไม่ทับกัน |  | Not Tested |
| FE-A11Y-001 | ทุกหน้า | keyboard navigation | ใช้ Tab/Shift+Tab/Enter/Space กับลิงก์ ปุ่ม ฟอร์ม tabs และ modal | focus มองเห็นได้ ลำดับสมเหตุผล และ controls ทำงานโดยไม่ใช้เมาส์ |  | Not Tested |
| FE-A11Y-002 | ทุกหน้า | labels และ validation feedback | ตรวจ input labels, aria-label, aria-invalid, role=status/live regions | controls มีชื่อที่ระบุหน้าที่ได้และ feedback เชื่อมกับการควบคุม |  | Not Tested |
| FE-SEC-001 | รายการที่ render ข้อมูล | แสดงข้อความที่มี HTML อันตราย | ใช้ชื่อ course/assignment/notification/user เป็น `<script>alert(1)</script>` ใน mock | แสดงเป็นข้อความ escaped; ไม่มี script ทำงานหรือ markup แทรก |  | Not Tested |
| FE-SEC-002 | Assignment links | URL ภายนอกไม่ปลอดภัย | ป้อน URL ที่ไม่ใช่ HTTP/HTTPS ในข้อมูล assignment mock แล้วลองเปิด | UI ไม่เปิด URL protocol ที่ไม่ปลอดภัย และไม่สร้างลิงก์ใช้งานได้ |  | Not Tested |

## สรุปการครอบคลุม

ชุดนี้มี **83 กรณีทดสอบ frontend** ครอบคลุม authentication/recovery, onboarding, shared navigation/UI, dashboard, courses, assignments/reminders, calendar, notifications, admin console/users/edit user, responsive, accessibility และการแสดงข้อมูลไม่ปลอดภัย โดยรวม 13 HTML entry pages (หน้าผู้ใช้ 10 และ admin 3) ตามโครงสร้างปัจจุบัน

### ข้อจำกัด

- กรณีเชื่อม API, OAuth, sync, export และการบันทึกใช้ mock เพื่อยืนยันพฤติกรรม UI; ไม่ยืนยันการทำงานของบริการจริง
- ไม่รวม backend route/ฐานข้อมูล/worker/provider integration, การส่งอีเมลจริง, browser push, performance/load และ security penetration testing
- ผลทดสอบยังเป็น Not Tested จนกว่าจะ execute และบันทึกผลจริง
