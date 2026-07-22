# Feature 3: Sync Engine / Background Sync (M4)
*อ้างอิง: FR-023, FR-024, FR-031, FR-032, FR-035, FR-039*

## 3.1 State Machine: Sync Job Status

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running: Scheduler trigger / Manual Sync
    Running --> Success: ดึง+บันทึกข้อมูลสำเร็จทุกแพลตฟอร์ม
    Running --> PartialSuccess: บางแพลตฟอร์มล้มเหลว
    Running --> Failed: ทุกแพลตฟอร์มล้มเหลว
    Failed --> Retrying: อยู่ใน retry budget (สูงสุด 3 ครั้ง)
    Retrying --> Running
    Failed --> Idle: เกิน retry budget (รอรอบถัดไป)
    Success --> Idle
    PartialSuccess --> Idle
```

## 3.2 Flow: Background Sync Job (ต่อผู้ใช้ 1 คน)

```mermaid
graph TD
    Start([1. Sync Scheduler Trigger งานต่อ user]) --> Lock{2. ขอ Distributed Lock ต่อ user สำเร็จ?}
    Lock -->|ไม่สำเร็จ ชนกับ job เดิม| Skip["3. ข้ามรอบนี้ (ป้องกัน Race Condition)"]
    Lock -->|สำเร็จ| CheckToken{4. Access Token ใกล้/หมดอายุ?}
    CheckToken -->|ใช่| Refresh["5. Refresh Access Token"]
    Refresh --> RefreshOK{6. Refresh สำเร็จ?}
    RefreshOK -->|ไม่สำเร็จ| FlagExpired["7. ตั้งสถานะ Connection = Expired + แจ้งผู้ใช้ (FR-033)"]
    FlagExpired --> End1([จบ - ปลด Lock])
    RefreshOK -->|สำเร็จ| Fetch
    CheckToken -->|ไม่ใช่| Fetch["8. เรียก API ดึง Course/Assignment แบบ Parallel ทุกแพลตฟอร์ม"]
    Fetch --> RateLimited{9. โดน Rate Limit จาก Provider?}
    RateLimited -->|ใช่| Backoff["10. รอ Backoff (1m/5m/15m) แล้วลองใหม่ สูงสุด 3 ครั้ง"]
    Backoff --> Fetch
    RateLimited -->|ไม่ใช่| Diff["11. Diff ข้อมูลใหม่กับข้อมูลเดิมใน DB"]
    Diff --> Upsert["12. Insert/Update/Soft-delete ตามผลต่าง (courses, assignments)"]
    Upsert --> Dedup["13. Dedup งานซ้ำข้ามแพลตฟอร์ม (external_id + course matching, FR-032)"]
    Dedup --> ComputeStatus["14. คำนวณ computed_status ใหม่ (not_submitted/submitted/overdue)"]
    ComputeStatus --> LogResult["15. บันทึก sync_logs (status, items_synced, error_detail)"]
    LogResult --> EvalNotify{16. มีเงื่อนไขแจ้งเตือนใหม่เกิดขึ้นหรือไม่?}
    EvalNotify -->|มี| QueueNotif["17. Insert เข้า Notification Queue"]
    EvalNotify -->|ไม่มี| Unlock
    QueueNotif --> Unlock["18. ปลด Distributed Lock"]
    Unlock --> End2([จบรอบ])
```

## 3.3 Flow: Manual Sync (ผู้ใช้กด Refresh เอง)

```mermaid
graph TD
    Start([1. ผู้ใช้กดปุ่ม 'รีเฟรชข้อมูล']) --> CheckRate{2. เคย Manual Sync ภายใน 1 นาทีที่แล้วหรือไม่?}
    CheckRate -->|ใช่| ShowCooldown["3. แสดงข้อความ 'กรุณารอสักครู่' (Rate Limit)"]
    CheckRate -->|ไม่ใช่| SendIdempotent["4. POST /api/v1/sync/trigger พร้อม Idempotency-Key"]
    SendIdempotent --> ShowLoader["5. แสดงสถานะสีส้ม 'กำลังซิงก์ข้อมูล...'"]
    SendIdempotent --> EnterJob["6. เข้าสู่ Flow 3.2 (Background Sync Job) แบบ synchronous priority"]
    EnterJob --> PollStatus{7. Frontend Poll สถานะ job}
    PollStatus -->|สำเร็จ| RefreshUI["8. รีเฟรชข้อมูลหน้าจอ + แสดงติ๊กถูกสีเขียว"]
    PollStatus -->|ล้มเหลว| ShowStale["9. แสดง Banner 'ข้อมูลอาจไม่เป็นปัจจุบัน'"]
```

## 3.4 Sequence: Sync Engine ดึงข้อมูลจากสองแพลตฟอร์มพร้อมกัน

```mermaid
sequenceDiagram
  participant SCH as Sync Scheduler
  participant BE as Sync Worker
  participant GC as Google Classroom API
  participant MT as Microsoft Graph API
  participant DB as Database

  SCH->>BE: Trigger sync (per user, ตามรอบ)
  BE->>DB: อ่าน token ที่เข้ารหัสไว้
  par ดึงจากสองแพลตฟอร์มพร้อมกัน
    BE->>GC: GET courses/assignments
    GC-->>BE: response
  and
    BE->>MT: GET teams/assignments
    MT-->>BE: response
  end
  BE->>BE: Merge + Dedupe + Diff
  BE->>DB: Upsert courses/assignments
  BE->>DB: บันทึก sync_log
  BE->>BE: ประเมินเงื่อนไข Notification
  BE->>DB: Insert notification queue (ถ้ามี)
```
