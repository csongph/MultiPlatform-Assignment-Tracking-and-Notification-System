# Feature 4: Course & Assignment Aggregation (M5)
*อ้างอิง: FR-008, FR-009, FR-010, FR-011*

```mermaid
graph TD
    Start([1. เปิดหน้า Course List / Assignment List]) --> Cache{2. มีข้อมูลใน Server Cache (≤5 นาที) หรือไม่?}
    Cache -->|มี| ServeCache["3. ส่งข้อมูลจาก Cache ทันที"]
    Cache -->|ไม่มี/หมดอายุ| QueryDB["4. Query DB: courses + assignments ของ user (join platforms)"]
    QueryDB --> GroupByCourse["5. จัดกลุ่มตามรายวิชา พร้อม Platform Source Badge"]
    ServeCache --> GroupByCourse
    GroupByCourse --> RenderList["6. Render Course List (ไอคอนแพลตฟอร์มกำกับแต่ละวิชา)"]
    RenderList --> ClickCourse{7. ผู้ใช้คลิกเข้าดูรายวิชา?}
    ClickCourse -->|ใช่| CourseDetail["8. แสดง Course Detail: assignment ทั้งหมดในวิชานั้น"]
    ClickCourse -->|ไม่ใช่| ViewAssignmentList["9. แสดง Assignment List รวมทุกวิชา (มีชื่อวิชากำกับ)"]
    CourseDetail --> ClickAssignment
    ViewAssignmentList --> ClickAssignment{10. ผู้ใช้คลิกงานหนึ่งชิ้น?}
    ClickAssignment -->|ใช่| AssignmentDetail["11. แสดง Assignment Detail: metadata (ชื่อ, วิชา, กำหนดส่ง, คำอธิบาย, source_url)"]
    AssignmentDetail --> DeepLink["12. ปุ่ม Deep Link กลับไปแพลตฟอร์มต้นทาง (ดู Feature 11)"]
```
