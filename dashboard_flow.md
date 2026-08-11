# Dashboard Screen Workflow & Logic Design

This document details the state machine, API interactions, and user flows when navigating and interacting with the Unified Dashboard.

---
## 1. End-to-End User Lifecycle Flow (ตั้งแต่หน้า Login/Register)

นี่คือแผนภาพแสดงขั้นตอนการทำงานทั้งหมด ตั้งแต่ผู้ใช้เปิดเข้ามาที่หน้าแรกของระบบ สมัครสมาชิก เข้าสู่ระบบ ผ่านขั้นตอนการตั้งค่า และเข้าใช้งานหน้า Dashboard

```mermaid
graph TD
    Start([ผู้ใช้เข้าสู่เว็บไซต์]) --> Page{มีบัญชีอยู่แล้วหรือไม่?}
    Page -->|ไม่มี| Register["1. หน้าสมัครสมาชิก (Register)"]
    Page -->|มี| Login["1. หน้าเข้าสู่ระบบ (Login)"]
    
    Register --> FillReg["กรอกข้อมูล: Email, Password, Name"]
    FillReg --> SubmitReg["ส่งข้อมูลสมัครสมาชิก"]
    SubmitReg --> CreateUserDB["ระบบสร้าง User ลงในฐานข้อมูล"]
    CreateUserDB --> LoginSuccess
    
    Login --> FillLogin["กรอก Email & Password"]
    FillLogin --> SubmitLogin["คลิกปุ่มเข้าสู่ระบบ"]
    SubmitLogin --> CheckCred{ตรวจสอบรหัสผ่าน?}
    CheckCred -->|ไม่ถูกต้อง| ShowCredErr["แสดงรหัสผ่านไม่ถูกต้อง"]
    CheckCred -->|ถูกต้อง| LoginSuccess["ได้รับ JWT Token & บันทึก Session"]
    
    LoginSuccess --> AuthGuard{"2. ตรวจสอบการผูกบัญชี (Auth Guard)"}
    AuthGuard -->|ไม่มีประวัติการเชื่อมต่อเลย| GoOnboard["3. หน้าตั้งค่าแรกเข้า (Onboarding Screen)"]
    AuthGuard -->|เคยผูกบัญชีไว้แล้ว| GoDashboard["4. หน้าแดชบอร์ดหลัก (Dashboard)"]
    
    GoOnboard --> ConnectGoogle["ปุ่มผูกบัญชี Google Classroom"]
    GoOnboard --> ConnectTeams["ปุ่มผูกบัญชี Microsoft Teams"]
    ConnectGoogle & ConnectTeams --> VerifyConnect{ผูกสำเร็จอย่างน้อย 1 ที่?}
    VerifyConnect -->|ใช่| UnlockStart["ปลดล็อกปุ่ม 'เริ่มใช้งานระบบ' (Start)"]
    UnlockStart --> ClickStart["กดปุ่มเริ่มใช้งานเพื่อสิ้นสุด Onboarding"]
    ClickStart --> QueueSync["ระบบสั่งรัน Background Sync ดึงข้อมูลทันที"]
    QueueSync --> GoDashboard
```

---

## 2. Dashboard State Machine (ภาพรวมสถานะหน้าจอ)

The Dashboard operates on four primary states:

```mermaid
stateDiagram-v2
    [*] --> Init: User visits /dashboard
    Init --> Onboarding: 0 active connections
    Init --> Loading: >= 1 active connections
    Loading --> ErrorState: API error / Token broken
    Loading --> ActiveDashboard: Fetch success
    ActiveDashboard --> Syncing: Manual/Auto Sync trigger
    Syncing --> ActiveDashboard: Sync complete (Refresh data)
    ActiveDashboard --> DetailView: Click assignment card
    DetailView --> Submitting: Click "Submit Assignment"
    Submitting --> ActiveDashboard: Submission success
```

---

## 2. Step-by-Step Flow Diagrams

### Flow A: Initial Page Load (การโหลดหน้าจอครั้งแรก)
This flow ensures the page handles authentication, checks connection status, and loads data with smooth skeletons.

```mermaid
graph TD
    Start([1. เข้าหน้าเว็บ /dashboard]) --> CheckAuth{2. มี JWT Token หรือไม่?}
    CheckAuth -->|ไม่มี| RedirectLogin[3. Redirect ไปหน้า /login]
    CheckAuth -->|มี| CallStatusAPI[4. เรียก API /onboarding-status]
    
    CallStatusAPI --> CheckConn{5. มีประวัติเชื่อมต่อหรือไม่?}
    CheckConn -->|ไม่มี| RedirectOnboard[6. Redirect ไปหน้า /onboarding]
    CheckConn -->|มีอย่างน้อย 1 แพลตฟอร์ม| ShowSkeleton[7. แสดง Skeleton Loader หน้า Dashboard]
    
    ShowSkeleton --> FetchData[8. ดึงข้อมูล 3 ส่วนพร้อมกันแบบ Parallel]
    FetchData --> F1[GET /api/v1/feed/assignments]
    FetchData --> F2[GET /api/v1/users/me/stats]
    FetchData --> F3[GET /api/v1/connections]
    
    F1 & F2 & F3 --> RenderUI[9. แสดงผลหน้า Dashboard เต็มรูปแบบ]
```

---

### Flow B: Background Synchronization (การซิงก์ข้อมูลการเรียนล่วงหน้า)
To ensure the dashboard always has up-to-date data from Google and Microsoft, we use a smart sync flow:

```mermaid
graph TD
    Start([นักเรียนอยู่บนหน้า Dashboard]) --> CheckTimer{ผ่านไปแล้ว 10 นาที หรือ กดปุ่ม Sync?}
    CheckTimer -->|ใช่| TriggerSync[1. ส่ง POST /api/v1/sync/trigger]
    CheckTimer -->|ยังไม่ใช่| Active[ทำงานปกติในหน้า Dashboard]
    
    TriggerSync --> ShowLoader[2. แสดงสถานะสีส้ม 'กำลังซิงก์ข้อมูล...']
    TriggerSync --> BackendJob[3. Backend รัน Background Job]
    
    BackendJob --> CheckToken{4. Access Token หมดอายุ?}
    CheckToken -->|ใช่| Refresh[5. ใช้ Refresh Token ขอโทเค็นใหม่]
    CheckToken -->|ไม่ใช่| CallLMS[6. เรียก API Google / MS Teams]
    Refresh --> CallLMS
    
    CallLMS --> UpdateDB[7. อัปเดตตาราง Courses, Assignments, Submissions]
    UpdateDB --> FinishJob[8. อัปเดตเวลาซิงก์ล่าสุดในตาราง sync_logs]
    
    FinishJob --> PollStatus{9. Frontend ตรวจพบว่า Job สำเร็จ}
    PollStatus -->|สำเร็จ| RefreshUI[10. รีเฟรชข้อมูลบนหน้าจอ + แสดงปุ่มติ๊กถูกสีเขียว]
```

---

### Flow C: View & Submit Assignment (การดูและการส่งการบ้าน)
When a student interacts with a specific task card to submit homework:

```mermaid
graph TD
    Start([1. คลิกการ์ดการบ้านบน Dashboard]) --> OpenDrawer[2. เปิดสไลด์บาร์ด้านขวาแสดงรายละเอียด]
    OpenDrawer --> ShowDetails[3. แสดงข้อมูลการบ้าน + ลิงก์ไฟล์แนบของครู]
    
    ShowDetails --> CheckSubmit{4. ต้องการอัปโหลดไฟล์ส่งงาน?}
    CheckSubmit -->|ใช่| UploadFile[5. เลือกไฟล์จากเครื่อง -> ส่งไปที่ API Upload]
    UploadFile --> SaveAttachment[6. บันทึกไฟล์ในตาราง submission_attachments]
    SaveAttachment --> ShowFileUploaded[7. แสดงไอคอนไฟล์ที่รอส่ง]
    
    ShowFileUploaded & CheckSubmit --> ClickTurnIn[8. คลิกปุ่ม 'ส่งงาน (Turn In)']
    ClickTurnIn --> BackendSubmit[9. Backend เปลี่ยนสถานะใน DB เป็น 'submitted']
    
    BackendSubmit --> CallLMSAPI{10. ยิงส่งงานกลับไปที่ Google/Teams API}
    CallLMSAPI -->|สำเร็จ| Success[11. แสดงอนิเมชันส่งงานสำเร็จ]
    CallLMSAPI -->|ล้มเหลว| Rollback[12. แจ้งเตือนล้มเหลว และแจ้งให้กดย้ำอีกครั้ง]
```

---

### Flow D: Token Error & Reconnection (กรณีโทเค็นหลุดเชื่อมต่อ)
If a user changes their Google/Microsoft password or revokes app access, the integration breaks. The dashboard must handle this gracefully:

```mermaid
graph TD
    Start([1. เรียก GET /api/v1/connections]) --> CheckStatus{2. มี Connection สถานะ expired หรือ broken?}
    CheckStatus -->|มี| ShowBanner[3. แสดงแถบสีแดงแจ้งเตือน Reconnect บน Dashboard]
    CheckStatus -->|ปกติ| Active[ซิงก์ข้อมูลตามปกติ]
    
    ShowBanner --> ClickReconnect[4. ผู้ใช้กดปุ่ม 'เชื่อมต่อใหม่ (Reconnect)']
    ClickReconnect --> OpenPopup[5. เปิดหน้าต่างป๊อปอัป OAuth Consent ของค่ายนั้นๆ]
    OpenPopup --> UserApprove[6. ผู้ใช้ล็อกอินและกดยอมรับสิทธิ์]
    UserApprove --> Callback[7. Callback อัปเดต Token ชุดใหม่ลงฐานข้อมูล]
    Callback --> HideBanner[8. ซ่อนแถบเตือนสีแดง + เริ่มการซิงก์ใหม่อีกครั้ง]
```
