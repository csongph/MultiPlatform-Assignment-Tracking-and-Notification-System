# Feature 14: Admin — Audit Logging (M14)
*อ้างอิง: FR-028*

```mermaid
graph TD
    Start([1. Admin เปิดหน้า Audit Log]) --> Call["2. GET /admin/audit-logs?user=&date=&action="]
    Call --> Query["3. Query audit_logs table (indexed by action, created_at)"]
    Query --> Render["4. แสดงตาราง: actor, action, target, timestamp, metadata"]
    Render --> FilterUser{5. Admin กรองตาม User?}
    FilterUser -->|ใช่| ReQuery["6. ส่ง query param ใหม่ → กลับไป Step 2"]
    Render --> FilterDate{7. Admin กรองตามช่วงวันที่?}
    FilterDate -->|ใช่| ReQuery
    Render --> FilterAction{8. Admin กรองตามประเภท Action?}
    FilterAction -->|ใช่| ReQuery
    Render --> ExportLog["9. (เสนอเพิ่ม) Export Log เป็น CSV/PDF"]
```

**Actions ที่ถูกบันทึกลง audit_logs**: login/logout, connect/disconnect platform, admin role change, deactivate/reactivate user (ตาม §26 Log Type ของเอกสาร System Capability Analysis)
