# Feature 2: Onboarding & Platform Integration / OAuth Connect (M3)
*อ้างอิง: FR-004, FR-005, FR-006, FR-007, FR-030, FR-031, FR-034*

## 2.1 State Machine: Connection Status ต่อแพลตฟอร์ม

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: ผู้ใช้เริ่ม OAuth flow
    Connecting --> Connected: แลก token สำเร็จ
    Connecting --> Disconnected: ผู้ใช้ยกเลิก/consent ล้มเหลว
    Connected --> TokenExpiring: ใกล้หมดอายุ (< threshold)
    TokenExpiring --> Connected: refresh token สำเร็จ
    TokenExpiring --> Expired: refresh ล้มเหลว
    Expired --> Connecting: ผู้ใช้กด Reconnect
    Connected --> Broken: provider revoke/error ต่อเนื่อง (401/403)
    Broken --> Connecting: ผู้ใช้กด Reconnect
    Connected --> Disconnected: ผู้ใช้กด Disconnect
```

## 2.2 Flow: Connect Google Classroom / Microsoft Teams (ครั้งแรก)

```mermaid
graph TD
    Start([1. หน้า Onboarding: ยังไม่มีการเชื่อมต่อ]) --> Choose["2. เลือกปุ่ม Connect Google Classroom หรือ Microsoft Teams"]
    Choose --> Init["3. GET /oauth/{platform}/init"]
    Init --> GetURL["4. Backend สร้าง authorize_url + state (CSRF token)"]
    GetURL --> Redirect["5. Redirect ผู้ใช้ไปหน้า OAuth Consent ของ Google/Microsoft"]
    Redirect --> Consent{6. ผู้ใช้ยินยอมสิทธิ์หรือไม่?}
    Consent -->|ปฏิเสธ| Cancelled["7. กลับสู่ระบบ พร้อมข้อความ 'ยกเลิกการเชื่อมต่อ'"]
    Consent -->|ยินยอม| Callback["8. Provider Redirect callback พร้อม auth code + state"]
    Callback --> VerifyState{9. ตรวจสอบ state ตรงกัน (ป้องกัน CSRF)?}
    VerifyState -->|ไม่ตรง| RejectCallback["10. ปฏิเสธ callback, แสดง error"]
    VerifyState -->|ตรง| Exchange["11. POST /oauth/{platform}/callback {code}"]
    Exchange --> ExchangeToken["12. Backend แลก code เป็น access/refresh token กับ Provider"]
    ExchangeToken --> ExchangeOK{13. แลก token สำเร็จ?}
    ExchangeOK -->|ไม่สำเร็จ| ShowExchErr["14. แสดง error พร้อมปุ่มลองใหม่"]
    ExchangeOK -->|สำเร็จ| Encrypt["15. เข้ารหัส (AES-256) และบันทึกลง oauth_connections"]
    Encrypt --> MarkConnected["16. ตั้งสถานะ = connected"]
    MarkConnected --> TriggerFirstSync["17. Enqueue Sync Job ครั้งแรก"]
    TriggerFirstSync --> CheckUnlock{18. เชื่อมต่อสำเร็จอย่างน้อย 1 แพลตฟอร์ม?}
    CheckUnlock -->|ใช่| UnlockStart["19. ปลดล็อกปุ่ม 'เริ่มใช้งานระบบ'"]
    UnlockStart --> GoDashboard["20. ไปหน้า Dashboard"]
```

## 2.3 Flow: Disconnect Platform

```mermaid
graph TD
    Start([1. ผู้ใช้เปิดหน้า Settings > Connections]) --> ClickDisconnect["2. คลิกปุ่ม 'ยกเลิกการเชื่อมต่อ' ต่อแพลตฟอร์ม"]
    ClickDisconnect --> Confirm{3. Modal ยืนยัน 'แน่ใจหรือไม่?'}
    Confirm -->|ยกเลิก| Abort["4. ปิด Modal ไม่ทำอะไร"]
    Confirm -->|ยืนยัน| CallDisconnect["5. DELETE /api/v1/connections/{id}"]
    CallDisconnect --> RevokeRemote["6. (Optional) เรียก Provider API เพื่อ Revoke Token"]
    RevokeRemote --> DeleteLocal["7. ลบ/ล้าง token ใน oauth_connections, ตั้งสถานะ disconnected"]
    DeleteLocal --> SoftDeleteData["8. Soft-delete courses/assignments ที่มาจากแพลตฟอร์มนี้ (is_deleted=true)"]
    SoftDeleteData --> RefreshUI["9. รีเฟรช Course/Assignment List และ Dashboard"]
    RefreshUI --> CheckEmpty{10. ไม่มีแพลตฟอร์มเชื่อมต่อเหลือเลย?}
    CheckEmpty -->|ใช่| ShowEmptyState["11. แสดง Empty State พร้อมปุ่มเชื่อมต่อใหม่ (FR-030)"]
    CheckEmpty -->|ไม่ใช่| Stay["12. แสดง Dashboard ตามปกติด้วยข้อมูลที่เหลือ"]
```

## 2.4 Sequence: Reconnect เมื่อ Token หมดอายุ/Broken

```mermaid
sequenceDiagram
  actor S as Student
  participant FE as Frontend
  participant BE as Backend API
  participant P as Google/Microsoft OAuth

  Note over FE: แถบสีแดงแจ้งเตือนสถานะ Expired/Broken
  S->>FE: กดปุ่ม "เชื่อมต่อใหม่ (Reconnect)"
  FE->>BE: GET /oauth/{platform}/init?mode=reconnect
  BE-->>FE: authorize_url
  FE->>P: Redirect ไปหน้า Consent
  S->>P: ล็อกอิน + ยอมรับสิทธิ์
  P-->>FE: Redirect callback พร้อม code
  FE->>BE: POST /oauth/{platform}/callback {code}
  BE->>P: Exchange code เป็น token ใหม่
  P-->>BE: token payload
  BE->>BE: เข้ารหัสและ Overwrite token เดิมใน oauth_connections
  BE->>BE: ตั้งสถานะ = connected, เคลียร์ broken/expired flag
  BE-->>FE: {status: connected}
  FE-->>S: ซ่อนแถบเตือน + Trigger Sync ใหม่ทันที
```
