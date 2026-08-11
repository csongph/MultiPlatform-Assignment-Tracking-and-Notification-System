# แผนพัฒนาโปรเจค: MultiPlatform Assignment Tracking and Notification System

**ระยะเวลา:** 13 กรกฎาคม 2569 – มีนาคม 2570 (~35 สัปดาห์)
**ทีม:** 4 คนขึ้นไป
**Tech Stack:** Frontend — HTML5/CSS3/Tailwind/JS (ES6+) Component-based | Backend — Python/FastAPI/SQLAlchemy/Alembic | DB — PostgreSQL (dev) / Supabase PostgreSQL (prod)

---

## 1. หลักการวางแผน

- อิงลำดับความสำคัญจาก MoSCoW ที่วิเคราะห์ไว้แล้ว (§32 ของเอกสารวิเคราะห์): **Must → Should → Could**, ตัด Won't ออกจากเวอร์ชันแรก
- แบ่งงานเป็น Sprint ละ ~3-4 สัปดาห์ ทำงานแบบ Agile/Scrum เบา ๆ (Sprint planning + Weekly check-in + Sprint review)
- แบ่งทีมตาม Backend/Frontend คู่ขนานกัน โดยตกลง **API Contract (OpenAPI spec)** ก่อนเริ่ม Sprint แต่ละรอบ เพื่อให้ Backend/Frontend ทำงานพร้อมกันได้โดยไม่ติดคอขวด
- เผื่อ Buffer ~3-4 สัปดาห์ท้ายโปรเจคสำหรับแก้บั๊ก เขียนรายงาน และเตรียมสอบ

---

## 2. โครงสร้างทีม (4 คน)

| บทบาท | ผู้รับผิดชอบหลัก | ขอบเขตงาน |
|---|---|---|
| **Main Dev — Backend (ทั้งหมด) + CI/CD + Deployment** | ชยางกูร สองพิมพ์ | Auth/Authorization, DB Schema/Migration (Alembic), OAuth Connector (Google/Microsoft), Sync Engine, Background Jobs/Scheduler, Notification Dispatcher, Admin API (Role Mgmt, Connection Monitoring, Audit Log), RBAC middleware, **CI/CD pipeline (build/test/lint อัตโนมัติ) และ Deployment ขึ้น production (Supabase + hosting)** — **backend + infra ทั้งระบบ คนเดียว** |
| **Frontend Dev 1 — Student Experience** | รัฐภูมิ| Component library พื้นฐาน (Tailwind design system), Onboarding/OAuth UI, Task List, Dashboard |
| **Frontend Dev 2 — Calendar & Search + Security** | คุณากร | Calendar View, Search/Filter/Sort UI, Deep Link, **Security ฝั่ง Frontend** (input sanitization/XSS prevention, secure token storage ฝั่ง client, CSP header ร่วมกับ Main Dev, dependency vulnerability check ของ frontend libraries) |
| **Frontend Dev 3 — Admin & Notification UI** | ศรันยาภัทร| Notification Settings/History UI, Admin UI (User Mgmt, Connection Monitoring, Audit Log, System Overview) |

> ถ้ามีคนที่ 5 ขึ้นไป: ให้เพิ่มเป็น **Frontend Dev 4** หรือ **QA/DevOps** แทน — ไม่แนะนำเพิ่มคนเข้าไปแตะ backend หลัก ถ้าไม่มีพื้นฐาน FastAPI/SQLAlchemy มาก่อน เพราะจะทำให้ Main Dev เสียเวลา onboard มากกว่าช่วยได้จริง


---

## 3. Phase & Timeline

แบ่งเป็น 2 ช่วงใหญ่ตามที่ขอ: **ช่วงที่ 1 กรกฎาคม–ตุลาคม 2569** (วางฐานระบบ) และ **ช่วงที่ 2 พฤศจิกายน 2569–มีนาคม 2570** (สร้างฟีเจอร์ครบ + ทดสอบ + ส่งมอบ)

---

## ช่วงที่ 1: กรกฎาคม – ตุลาคม 2569 (Foundation)

**เป้าหมายรวมของช่วงนี้:** ระบบ Auth + เชื่อมต่อ LMS + Sync ข้อมูลอัตโนมัติใช้งานได้จริง และ Frontend มี Design + Component library พร้อมสำหรับต่อยอดฟีเจอร์ในช่วงที่ 2

### Phase 0: Setup & System Design (สัปดาห์ 1-3 | 13 ก.ค. – 2 ส.ค. 69)

**เป้าหมาย:** ทุกคนเริ่มงานพร้อมกันได้โดยไม่ติดขัดในสัปดาห์แรกของการเขียนโค้ดจริง

**Backend (ชยางกูร) — คู่ขนานกับงาน Figma ของฝั่ง Frontend:**
- ตั้ง Repo, branch strategy, **ตั้งค่า CI/CD pipeline เบื้องต้น (lint/test อัตโนมัติ, เตรียมโครง deploy pipeline ไว้ล่วงหน้าแม้ยังไม่ deploy จริงจนถึง Phase 6)**, โครงสร้างโปรเจค Backend แบบ layered (API/Service/Repository)
- ออกแบบ ERD และ Schema เบื้องต้น (users, oauth_connections, courses, assignments, notification_settings, notifications, sync_logs, audit_logs, user_roles)
- เขียน OpenAPI spec เบื้องต้นสำหรับ Sprint 1-2 (Auth, OAuth, Sync)
- ตั้งค่า Supabase project (prod DB), PostgreSQL local (dev)
- ขอ Google Cloud OAuth credentials + Microsoft Azure AD App Registration (**ควรเริ่มขอตั้งแต่ Phase 0 เพราะบางระบบอนุมัติช้า**)

**Deliverable:** ERD, API spec v1, Dev environment พร้อมใช้งาน, OAuth credentials

---

### Phase 0B: ออกแบบ Frontend ใน Figma (สัปดาห์ 1-3 | 13 ก.ค. – 2 ส.ค. 69)

**ผู้รับผิดชอบ:** Frontend Dev 1 + 2 + 3 (ทำคู่ขนานไปกับ Backend Phase 0 — ไม่ต้องรอ Backend เสร็จก่อน)

- Design System ใน Figma: color palette, typography, spacing scale ให้สอดคล้องกับ Tailwind config ที่จะใช้จริง (ตั้ง token ให้ map กันตั้งแต่แรกเพื่อลดงานแปลงทีหลัง)
- ออกแบบ Component หลักที่ reuse ได้: Card, Badge/Status tag, Table, Modal, Nav, Empty state, Skeleton loading
- ออกแบบหน้าจอหลักทุกหน้าตาม Feature ใน §3 ของเอกสารวิเคราะห์ (ครอบคลุมทั้ง Student และ Admin):
  - Onboarding / Connect Platform, Login
  - Course List/Detail, Assignment List/Detail
  - Task List, Dashboard, Calendar (Month/Day view)
  - Notification Settings, Notification History
  - Admin: User Mgmt, Connection Monitoring, Audit Log, System Overview
- ทำ Responsive layout (Desktop + Mobile) อย่างน้อยหน้าหลัก ๆ ตาม NFR Accessibility/Responsive
- Review ร่วมกับ Backend (ชยางกูร) ช่วงสัปดาห์ที่ 3 (ก่อนปิดจ๊อบ) เพื่อเช็คว่า field/ข้อมูลที่ออกแบบ UI ไว้ตรงกับ API spec/ERD ที่ Backend ทำคู่ขนานไป (ป้องกันดีไซน์ UI ที่ backend รองรับไม่ได้) — **เวลาสั้นลงจากเดิม ควรรีบตกลง API contract ตั้งแต่ต้นสัปดาห์ 2 ไม่ใช่รอถึงท้ายสัปดาห์**
- Handoff: ส่งมอบ Figma spec (spacing, ขนาด, สี, ไฟล์ icon) ให้ Frontend ทั้งทีมใช้อ้างอิงตอน implement จริงด้วย Tailwind

**Deliverable:** Figma file ครบทุกหน้าจอหลัก (Desktop+Mobile), Design token พร้อม map เป็น Tailwind config, ผ่านการ review กับ Backend แล้ว

**⚠️ หมายเหตุ:** ระยะเวลาสั้นลงจาก 5 สัปดาห์เหลือ 3 สัปดาห์ (งานเยอะเท่าเดิม) ทีม Frontend ต้องทำงานเร็วขึ้นและตัดรายละเอียดที่ไม่จำเป็นออก เช่น อาจไม่ต้องทำ high-fidelity mockup ทุกหน้า ให้เน้นหน้าหลักที่ซับซ้อน (Dashboard, Task List, Admin) แบบละเอียด ส่วนหน้าที่เรียบง่าย (Settings, Detail pages) ทำแบบ low-to-mid fidelity แล้วไปปรับละเอียดตอน implement จริงแทน

---

### Phase 1: Sprint 1-2 — Auth + Platform Integration + Sync Engine (สัปดาห์ 4-16 | 3 ส.ค. – 31 ต.ค. 69)

**FR ที่เกี่ยวข้อง:** FR-001~012, 023, 024, 030~032, 035, 039

| ทีม | งาน |
|---|---|
| Backend (ชยางกูร) | ทำต่อเนื่อง (sequential) ตามลำดับ: 1) Login/Logout/Session, Profile mgmt, RBAC พื้นฐาน 2) OAuth flow (Google + Microsoft), Token encryption/storage 3) Sync Engine (fetch/diff/upsert/dedup), Token refresh job, Rate-limit handling, Sync log |
| Frontend Dev 1 | เริ่ม implement Component library จริงด้วย Tailwind จาก Figma spec ทันทีตั้งแต่ 3 ส.ค. ตามด้วย Login/Register UI, Onboarding + Connect Platform UI, Connection Status UI, Empty State |
| Frontend Dev 2 | ช่วยวาง Component library ร่วมกับ Dev 1, เตรียมโครง Task List/Dashboard UI ล่วงหน้า (รอ API จริงจาก Backend) |
| Frontend Dev 3 | เตรียมโครงหน้า Admin/Notification ไว้ล่วงหน้า (รอ API จริงจาก Backend) |

**หมายเหตุ:** เนื่องจาก Backend ทำคนเดียว งาน Auth → OAuth → Sync Engine ที่เคยแบ่งขนานกันได้ ตอนนี้ต้องเรียงคิวทำทีละอย่าง จึงเผื่อเวลาไว้ถึงสิ้นเดือนตุลาคม (ยาวกว่าตารางเดิมที่คาดไว้ 27 ก.ย. ประมาณ 5 สัปดาห์) — แนะนำให้ Backend โฟกัส OAuth+Sync ก่อน (เป็นตัวบล็อกฟีเจอร์อื่นทั้งหมด) และทำ Auth แบบง่ายที่สุดเท่าที่พอใช้งานได้ก่อน ค่อยเสริมทีหลัง ถ้าทำเสร็จเร็วกว่าที่เผื่อไว้ ให้ดึงงานจาก Phase 2 มาเริ่มก่อนได้เลย

**Milestone (สิ้นสุดช่วงที่ 1):** ผู้ใช้ login ได้, เชื่อมต่อ Google Classroom/Microsoft Teams ได้จริง, ระบบ sync ข้อมูลรายวิชา/งานอัตโนมัติ, Figma design ครบและถูก implement เป็น Component library แล้ว — **พร้อมเข้าสู่ช่วงที่ 2**

---

## ช่วงที่ 2: พฤศจิกายน 2569 – มีนาคม 2570 (Feature Build + Testing + Launch)

**เป้าหมายรวมของช่วงนี้:** สร้างฟีเจอร์ที่เหลือทั้งหมดตาม MoSCoW (Must ส่วนที่เหลือ → Should → Could), ทดสอบระบบ, deploy ขึ้น production, และปิดท้ายด้วยการเขียนรายงาน/เตรียมสอบจบ

---

### Phase 2: Sprint 3-5 — Task Tracking + Dashboard + Notification + Admin (สัปดาห์ 17-22 | 1 พ.ย. – 12 ธ.ค. 69)

**FR ที่เกี่ยวข้อง:** FR-013, 014, 018~022, 025~029, 033, 036~038

| ทีม | งาน |
|---|---|
| Backend (ชยางกูร) | ทำต่อเนื่อง: 1) Notification pipeline (trigger evaluation/cron, queue, dispatch, retry, dead-letter), multi-channel (in-app+email) 2) Admin API (Role mgmt, User list/deactivate, Connection Monitoring, Audit Log) — **ถ้าเวลาตึง ให้ตัด Admin API ที่ไม่ใช่ Must-have core ไปทำใน Phase 4 แทน** |
| Frontend Dev 1 | Task List UI + Status badge, Dashboard (chart, workload overview, upcoming deadlines) |
| Frontend Dev 2 | เริ่มงาน Calendar View ล่วงหน้า (ถ้า Backend ยังไม่มี API ให้ mock data ไปก่อน) |
| Frontend Dev 3 | Notification Settings UI, Deep Link, Admin UI (Role Mgmt, Connection Monitoring, Audit Log) |

**Milestone:** ครบทุกฟีเจอร์ระดับ **Must-have** ตาม MoSCoW — ระบบใช้งานได้ end-to-end ในเวอร์ชัน MVP

---

### Phase 3: Sprint 6 — Should-have (สัปดาห์ 23-25 | 13 ธ.ค. 69 – 2 ม.ค. 70)

**FR ที่เกี่ยวข้อง:** FR-015, 016, 017

- Calendar View (Month view, Day detail, navigate to assignment)
- Search & Sort (A-Z/ก-ฮ)
- Notification History
- System Overview (Admin)

**Milestone:** ครบ Must + Should — พร้อมสำหรับรอบทดสอบภายในทีม (Internal testing)

---

### Phase 4: Sprint 7 — Could-have + NFR Hardening (สัปดาห์ 26-27 | 3 – 16 ม.ค. 70)

**FR/NFR ที่เกี่ยวข้อง:** Filter by status/platform, Export, Security hardening, PDPA compliance (FR-034), Performance tuning, Cache

- Filter by status/platform, Multi-channel notification พร้อมกัน, Export ข้อมูล (ถ้าเวลาเหลือ — ตัดได้ถ้าจำเป็น เพราะเป็น Could)
- **Security (Backend — ชยางกูร):** AES-256 encryption at rest, TLS, Key rotation, Least privilege OAuth scope, Rate limiting
- **Security (Frontend Dev 2):** XSS/input sanitization ทุกฟอร์ม, secure token storage ฝั่ง client (ไม่เก็บ token ใน localStorage แบบ plaintext), coordinate CSP header กับ Backend, ตรวจ dependency vulnerability ของ library ฝั่ง frontend
- Performance: Cache (§NFR), Load testing เบื้องต้นที่ 500 concurrent users
- PDPA: consent/withdraw flow, data deletion request

**Milestone:** Feature-complete ตามขอบเขต — เข้าสู่ช่วง Testing เต็มรูปแบบ

---

### Phase 5: Testing & QA (สัปดาห์ 28-31 | 17 ม.ค. – 13 ก.พ. 70)

อ้างอิง §30 Test Cases ของเอกสารวิเคราะห์

- Unit Test: คำนวณ status, validate lead_time, business logic
- Integration Test: Mock provider API, sync/dedupe, token refresh
- System Test: End-to-end connect→sync→notify, retry/DLQ
- UAT: ทดสอบกับบัญชี Google Classroom/Teams จริง
- Bug fixing รอบ 1-2 + Regression test

**หมายเหตุ:** ควรเริ่มเขียน Test case คู่ขนานตั้งแต่ Phase 1-4 (ไม่ใช่รอมาเขียนทีเดียวตอนนี้) มิฉะนั้น 4 สัปดาห์นี้จะไม่พอ

---

### Phase 6: Deployment + Documentation (สัปดาห์ 32-33 | 14 – 27 ก.พ. 70)

**ผู้รับผิดชอบหลัก:** Main Dev (ชยางกูร) — CI/CD pipeline ที่เตรียมไว้ตั้งแต่ Phase 0 มาใช้จริงตอนนี้

- Deploy ขึ้น Production (Supabase + hosting backend/frontend) ผ่าน CI/CD pipeline
- ตั้งค่า Monitoring (§27: health check, metrics, alert)
- เขียน User Manual / API Documentation
- เตรียมข้อมูลประกอบรายงานโครงงาน (screenshot, diagram, ผลทดสอบ)

---

### Phase 7: เขียนรายงาน + Buffer + เตรียมสอบจบ (สัปดาห์ 34-37 | 28 ก.พ. – 31 มี.ค. 70)

- เขียนรายงานโครงงานฉบับสมบูรณ์
- เตรียม slide/demo สำหรับสอบ
- Buffer สำหรับแก้ไขตามข้อเสนอแนะอาจารย์ที่ปรึกษา หรือแก้บั๊กที่หลุดจาก QA

**Milestone (สิ้นสุดช่วงที่ 2 / จบโปรเจค):** ระบบ deploy ขึ้น production ครบทุกฟีเจอร์ตามขอบเขต, ผ่านการทดสอบ, มีรายงานฉบับสมบูรณ์ และพร้อมสอบจบภายในมีนาคม 2570

---

## 4. Milestone สรุป

**ช่วงที่ 1: กรกฎาคม – ตุลาคม 2569**

| Milestone | กำหนดเสร็จโดยประมาณ |
|---|---|
| M1: Dev environment + ERD/API spec พร้อม | 2 ส.ค. 69 |
| M1.5: Figma design ครบทุกหน้าจอ | 2 ส.ค. 69 |
| M2: Auth + OAuth + Sync ใช้งานได้ (จบช่วงที่ 1) | 31 ต.ค. 69 |

**ช่วงที่ 2: พฤศจิกายน 2569 – มีนาคม 2570**

| Milestone | กำหนดเสร็จโดยประมาณ |
|---|---|
| M3: MVP (Must-have ครบ) | 12 ธ.ค. 69 |
| M4: Must + Should ครบ | 2 ม.ค. 70 |
| M5: Feature-complete | 16 ม.ค. 70 |
| M6: Testing เสร็จ | 13 ก.พ. 70 |
| M7: Deploy + เอกสารเสร็จ | 27 ก.พ. 70 |
| M8: รายงาน + พร้อมสอบ (จบโปรเจค) | 31 มี.ค. 70 |

---

## 5. ความเสี่ยงที่ควรระวัง (จากเอกสารวิเคราะห์ §Risk & Recommendations)

1. **OAuth Credential Approval ล่าช้า** — ขอ Google/Microsoft API credentials ตั้งแต่ Phase 0 เพราะบางครั้งต้องรอ verification
2. **Rate Limit จาก Provider** — ทดสอบ sync กับบัญชีจริงแต่เนิ่น ๆ อย่ารอถึง Sprint สุดท้าย
3. **Testing ถูกอัดไว้ท้ายโปรเจค** — แนะนำเขียน test คู่ขนานไปกับ Dev ทุก Sprint ไม่ใช่รวบมาทำที่ Phase 5 เดียว
4. **Scope creep ใน Could-have** — ถ้าเวลาตึง ให้ตัด Could-have (Export, Multi-channel พร้อมกัน) ออกก่อน ไม่กระทบ MVP
5. **Token/Security** — เข้ารหัส token ตั้งแต่ Sprint แรก ไม่ผัดไปทำทีหลัง เพราะกระทบ schema และ flow หลายจุด
6. **Backend คนเดียว = Single Point of Bottleneck** — งาน OAuth, Sync Engine, Notification Pipeline ล้วนเป็นระบบ async/background job ที่ซับซ้อนและใช้เวลาพัฒนา-ดีบักมาก ถ้า Backend ป่วยหรือติดปัญหาตรงไหน จะกระทบทั้งไทม์ไลน์ทันทีเพราะไม่มีคนสำรอง แนะนำ:
   - ให้ Frontend Dev อย่างน้อย 1 คนเรียนรู้ FastAPI พื้นฐานไว้ เผื่อช่วยทำ Admin API ส่วนที่เป็น CRUD ง่าย ๆ ได้ในช่วงท้าย
   - ตัด Could-have และ Admin ที่ไม่ critical ออกก่อนเป็นอันดับแรกถ้าเวลาตึง (ดูข้อ 4)
   - Sync กับ Backend ทุกสัปดาห์ว่า progress ตรงตามแผนหรือช้ากว่าที่คาด เพื่อตัดสินใจตัด scope ได้ทันเวลา ไม่ใช่มารู้ตัวตอนใกล้เดดไลน์

---

## 6. ขอบเขตที่ไม่ทำในเวอร์ชันนี้ (Won't — ตาม MoSCoW)

การส่งงานผ่านระบบ, การให้เกรด, รองรับ LMS อื่นนอกเหนือ Google/Microsoft, Mobile Native App, AI Prioritization — เก็บไว้เป็น Future Feature (§31 ของเอกสารวิเคราะห์)