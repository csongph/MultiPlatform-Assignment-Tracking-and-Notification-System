# แกลเลอรีแผนภาพสถาปัตยกรรมและแบบจำลองระบบ (System Architecture & Diagram Gallery)
### โครงการ: ระบบติดตามงานและแจ้งเตือนการเรียนจากหลายแพลตฟอร์ม (MultiPlatform Assignment Tracking)

โฟลเดอร์นี้รวบรวมแผนภาพทางวิศวกรรมทั้งหมดของระบบแยกเป็นไฟล์ `.mmd` (Mermaid Source) และแสดงผลเป็นพรีวิวในเอกสารนี้ เพื่อความสะดวกในการนำไปใช้ทำสไลด์ เอกสาร หรือรายงานโครงงาน

---

## สารบัญแผนภาพ (Diagram Catalog)

| # | ชื่อไฟล์แผนภาพ | หมวดหมู่ | คำอธิบาย |
|---|---|---|---|
| 01 | [`01_core_pain_points.mmd`](./01_core_pain_points.mmd) | Problem Analysis | แผนภาพวิเคราะห์ 5 ปัญหาหลักของผู้เรียนและ Admin |
| 02 | [`02_unified_conceptual_data_model_cdm.mmd`](./02_unified_conceptual_data_model_cdm.mmd) | Data Model | แบบจำลองแนวคิดภาพรวมทั้งระบบ (Unified CDM) |
| 03 | [`03_domain_iam_security.mmd`](./03_domain_iam_security.mmd) | Conceptual Domain | โดเมนที่ 1: ระบบจัดการผู้ใช้และความปลอดภัย |
| 04 | [`04_domain_lms_courses_assignments.mmd`](./04_domain_lms_courses_assignments.mmd) | Conceptual Domain | โดเมนที่ 2: ระบบเชื่อมต่อ LMS และการรวมงาน |
| 05 | [`05_domain_personal_task_tracking.mmd`](./05_domain_personal_task_tracking.mmd) | Conceptual Domain | โดเมนที่ 3: ระบบติดตามงานรายบุคคล |
| 06 | [`06_domain_tiered_notifications.mmd`](./06_domain_tiered_notifications.mmd) | Conceptual Domain | โดเมนที่ 4: ระบบการตั้งค่าและแจ้งเตือนหลายระยะ |
| 07 | [`07_domain_observability_audit.mmd`](./07_domain_observability_audit.mmd) | Conceptual Domain | โดเมนที่ 5: ระบบบันทึกประวัติการทำงาน (Audit/Sync) |
| 08 | [`08_assignment_vs_task_class_diagram.mmd`](./08_assignment_vs_task_class_diagram.mmd) | Object Design | การแยกความรับผิดชอบ Assignment vs UserTaskState |
| 09 | [`09_notification_tiered_intervals.mmd`](./09_notification_tiered_intervals.mmd) | Feature Design | แผนภาพโครงสร้างช่วงเวลาแจ้งเตือน Multi-tier |
| 10 | [`10_notification_dispatch_algorithm.mmd`](./10_notification_dispatch_algorithm.mmd) | Algorithm | อัลกอริทึมตรวจสอบการเตือนรอบที่ 2/3 ป้องกันส่งซ้ำ |
| 11 | [`11_password_recovery_sequence.mmd`](./11_password_recovery_sequence.mmd) | Sequence Diagram | กระบวนการกู้คืนรหัสผ่านด้วย Secure Email Token |
| 12 | [`12_admin_logging_rationale.mmd`](./12_admin_logging_rationale.mmd) | Architecture | เหตุผลความจำเป็น 4 ด้านของการเก็บ Server/Audit Log |
| 13 | [`13_end_to_end_system_lifecycle.mmd`](./13_end_to_end_system_lifecycle.mmd) | Workflow | ลำดับการทำงานตั้งแต่ต้นจนจบ (Lifecycle 5 ขั้นตอน) |
| 14 | [`14_system_wide_physical_erd_12_tables.mmd`](./14_system_wide_physical_erd_12_tables.mmd) | Database | แผนภาพ ERD กายภาพทั้ง 12 ตารางบน Neon PostgreSQL |
| 15 | [`15_c4_container_architecture.mmd`](./15_c4_container_architecture.mmd) | Architecture | C4 Model: สถาปัตยกรรมระดับ Container ทั้งระบบ |
| 16 | [`16_clean_architecture_backend_layers.mmd`](./16_clean_architecture_backend_layers.mmd) | Architecture | โครงสร้างเลเยอร์ภายใน Backend (Clean Architecture) |
| 17 | [`17_lms_delta_sync_pipeline.mmd`](./17_lms_delta_sync_pipeline.mmd) | Data Pipeline | ไปป์ไลน์ดึงข้อมูลและ Refresh Token ของ Sync Engine |
| 18 | [`18_multi_tier_notification_pipeline.mmd`](./18_multi_tier_notification_pipeline.mmd) | Data Pipeline | ไปป์ไลน์การส่งแจ้งเตือนหลายระยะแบบ Idempotent |

---

## พรีวิวแผนภาพทั้งหมด (Visual Gallery)

### 01. ปัญหาหลักของระบบ (5 Core Pain Points)
```mermaid
flowchart LR
    classDef center fill:#fce4ec,stroke:#c2185b,stroke-width:3px,color:#880e4f;
    classDef p1 fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#0d47a1;
    classDef p2 fill:#ffebee,stroke:#d32f2f,stroke-width:2px,color:#b71c1c;
    classDef p3 fill:#fff8e1,stroke:#fbc02d,stroke-width:2px,color:#f57f17;
    classDef p4 fill:#ede7f6,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;
    classDef p5 fill:#efebe9,stroke:#5d4037,stroke-width:2px,color:#3e2723;

    Root(("<b>5 Core Pain Points</b><br/>ปัญหาหลักของระบบ")):::center

    Root --> P1["<b>1. Digital Fragmentation</b><br/>• Google Classroom vs MS Teams<br/>• ข้อมูลกระจัดกระจาย ไร้ศูนย์กลาง<br/>• Cognitive Overload จากการสลับแอป"]:::p1
    Root --> P2["<b>2. Silent Missed Deadlines</b><br/>• ไม่เห็นภาพรวม Timeline ทุกวิชา<br/>• งานด่วนถูกกลืนในฟีดประกาศ<br/>• พลาดกำหนดส่งโดยไม่รู้ตัว"]:::p2
    Root --> P3["<b>3. Rigid & Ineffective Alerting</b><br/>• LMS เตือนครั้งเดียวตอนโพสต์แล้วลืม<br/>• แจ้งเตือนกระชั้นชิดเกินไป<br/>• ขาดการเตือนซ้ำแบบ Escalation"]:::p3
    Root --> P4["<b>4. Data Coupling & Ambiguity</b><br/>• สับสนระหว่างงานวิชา vs งานตนเอง<br/>• ไม่มี Checklist หรือโน้ตส่วนตัว"]:::p4
    Root --> P5["<b>5. Admin Blindness</b><br/>• Admin ไม่รู้ว่า Token ใครหลุด<br/>• ไม่รู้ว่า Sync ค้างหรือติด Rate Limit"]:::p5
```

---

### 02. แบบจำลองแนวคิดภาพรวมทั้งระบบ (Unified Conceptual Data Model - CDM)
```mermaid
flowchart LR
    classDef iam fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef lms fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;
    classDef task fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:#f57f17;
    classDef notif fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100;
    classDef ops fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;

    subgraph G_IAM["1. Identity & Security"]
        Role["<b>ROLE</b><br/>(บทบาท)"]:::iam
        User["<b>USER</b><br/>(ผู้ใช้งาน)"]:::iam
        Recovery["<b>PASSWORD_RECOVERY_TOKEN</b><br/>(กู้คืนรหัสผ่าน)"]:::iam
    end

    subgraph G_LMS["2. LMS & Course Integration"]
        Platform["<b>PLATFORM</b><br/>(Google/Teams)"]:::lms
        OAuth["<b>OAUTH_CONNECTION</b><br/>(Token เชื่อมต่อ)"]:::lms
        Course["<b>COURSE</b><br/>(รายวิชา)"]:::lms
        Assignment["<b>ASSIGNMENT</b><br/>(ชิ้นงานกลาง)"]:::lms
    end

    subgraph G_TASK["3. Personal Task Tracking"]
        TaskState["<b>USER_TASK_STATE</b><br/>(สถานะงานรายคน)"]:::task
    end

    subgraph G_NOTIF["4. Tiered Notification Engine"]
        NotifSetting["<b>NOTIFICATION_SETTING</b><br/>(การตั้งค่าหลัก)"]:::notif
        IntervalRule["<b>NOTIFICATION_INTERVAL_RULE</b><br/>(กฎช่วงเวลา Tier 1/2/3)"]:::notif
        NotifDispatch["<b>NOTIFICATION_DISPATCH</b><br/>(ประวัติการแจ้งเตือน)"]:::notif
    end

    subgraph G_OPS["5. System Observability"]
        SyncLog["<b>SYNC_LOG</b><br/>(ประวัติการ Sync)"]:::ops
        AuditLog["<b>AUDIT_LOG</b><br/>(บันทึก Audit Trail)"]:::ops
    end

    User -->|"1 : N"| Role
    User -->|"1 : N"| Recovery
    
    User -->|"1 : N"| OAuth
    Platform -->|"1 : N"| OAuth
    Platform -->|"1 : N"| Course
    Course -->|"1 : N"| Assignment
    
    User -->|"1 : N"| TaskState
    Assignment -->|"1 : N"| TaskState

    User -->|"1 : 1"| NotifSetting
    NotifSetting -->|"1 : N"| IntervalRule
    IntervalRule -.->|"triggers"| NotifDispatch
    Assignment -.->|"ref"| NotifDispatch
    User -->|"1 : N"| NotifDispatch

    User -.->|"1 : N"| AuditLog
    User -.->|"1 : N"| SyncLog
    Platform -.->|"1 : N"| SyncLog
```

---

### 14. แผนภาพภาพรวมฐานข้อมูลทั้งระบบ (System-wide Physical ER Diagram - 12 Tables)
```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "assigned_roles"
    ROLES ||--o{ USER_ROLES : "granted_via"

    USERS ||--o{ PASSWORD_RECOVERY_TOKENS : "has_tokens"

    USERS ||--o{ OAUTH_CONNECTIONS : "authorizes"
    PLATFORMS ||--o{ OAUTH_CONNECTIONS : "connected_to"

    USERS ||--o{ COURSES : "owns_courses"
    PLATFORMS ||--o{ COURSES : "origin_platform"

    COURSES ||--o{ ASSIGNMENTS : "contains"

    USERS ||--|| NOTIFICATION_SETTINGS : "configures"
    USERS ||--o{ NOTIFICATIONS : "receives"
    ASSIGNMENTS ||--o{ NOTIFICATIONS : "triggers"

    USERS ||--o{ SYNC_LOGS : "subject_of"
    PLATFORMS ||--o{ SYNC_LOGS : "sync_from"

    USERS ||--o{ AUDIT_LOGS : "performed_by"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ROLES {
        smallint id PK
        varchar name UK
    }

    USER_ROLES {
        uuid user_id PK_FK
        smallint role_id PK_FK
    }

    PASSWORD_RECOVERY_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash
        timestamptz expires_at
        boolean is_used
        timestamptz created_at
    }

    PLATFORMS {
        smallint id PK
        varchar name UK
    }

    OAUTH_CONNECTIONS {
        uuid id PK
        uuid user_id FK
        smallint platform_id FK
        text access_token_enc
        text refresh_token_enc
        timestamptz token_expires_at
        varchar status
        timestamptz connected_at
    }

    COURSES {
        uuid id PK
        uuid user_id FK
        smallint platform_id FK
        varchar external_course_id
        varchar name
        text description
        varchar instructor_name
        boolean is_deleted
    }

    ASSIGNMENTS {
        uuid id PK
        uuid course_id FK
        varchar external_assignment_id
        varchar title
        text description
        timestamptz due_at
        varchar source_status
        varchar computed_status
        text source_url
        boolean is_deleted
        timestamptz last_synced_at
    }

    NOTIFICATION_SETTINGS {
        uuid id PK
        uuid user_id FK_UK
        integer lead_time_minutes
        jsonb reminder_intervals
        boolean new_assignment_enabled
        boolean due_soon_enabled
        boolean overdue_enabled
        varchar channel
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid assignment_id FK
        varchar type
        smallint tier
        varchar status
        smallint retry_count
        timestamptz scheduled_at
        timestamptz delivered_at
    }

    SYNC_LOGS {
        uuid id PK
        uuid user_id FK
        smallint platform_id FK
        varchar status
        integer items_synced
        jsonb error_detail
        timestamptz started_at
        timestamptz finished_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_user_id FK
        varchar action
        varchar target
        jsonb metadata
        timestamptz created_at
    }
```

---

### 15. สถาปัตยกรรม C4 Container Architecture
```mermaid
flowchart TB
    classDef user fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef container fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;
    classDef db fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;
    classDef ext fill:#eceff1,stroke:#455a64,stroke-width:2px,color:#263238;

    U_Student["👨‍🎓 <b>Student (ผู้เรียน)</b>"]:::user
    U_Admin["👨‍💼 <b>Administrator (ผู้ดูแลระบบ)</b>"]:::user

    subgraph AppContainer["ระบบ MultiPlatform Assignment Tracking System"]
        SPA["<b>Web Application (SPA Frontend)</b><br/>[React / Vite / TypeScript / TailwindCSS]<br/>แสดงผล Dashboard, Task List, Calendar, Admin Panels"]:::container
        
        API["<b>Core API Application</b><br/>[FastAPI / Python 3.11 / AsyncIO]<br/>ให้บริการ REST APIs, Authentication, RBAC, Data Orchestration"]:::container
        
        Worker_Sync["<b>Sync Engine Worker</b><br/>[Python Background Service / APScheduler]<br/>ดึงข้อมูล LMS Delta-Sync ทุก 10-15 นาที"]:::container
        
        Worker_Notif["<b>Notification Dispatcher</b><br/>[Python Cron Worker]<br/>ประมวลผล Multi-tier Queue ทุก 1 นาที"]:::container

        Redis["<b>Cache & Rate Limiter</b><br/>[Redis 7]<br/>Session Storage, Rate Limit Counter, Course Cache 5m"]:::db
        
        NeonDB[("<b>Primary Database</b><br/>[Neon Serverless PostgreSQL 16]<br/>จัดเก็บ 12 ตารางข้อมูล และ Encrypted Tokens")]:::db
    end

    subgraph ExtServices["ระบบและบริการภายนอก (External Integrations)"]
        GC["<b>Google Classroom API</b><br/>OAuth2, CourseWork Endpoints"]:::ext
        MS["<b>Microsoft Graph API</b><br/>OAuth2, Education Teams Endpoints"]:::ext
        SMTP["<b>Email Provider</b><br/>[SMTP / SendGrid API]"]:::ext
    end

    U_Student & U_Admin -->|"HTTPS / TLS 1.3"| SPA
    SPA -->|"JSON / REST API (JWT Bearer)"| API

    API -->|"Async Read/Write (SQLAlchemy ORM)"| NeonDB
    API -->|"Cache Read/Write & Rate Limit Check"| Redis
    
    Worker_Sync -->|"Upsert Courses / Assignments / Sync Logs"| NeonDB
    Worker_Sync -->|"Invalidate Course Cache"| Redis
    
    Worker_Notif -->|"Poll Pending Tiers / Update Delivered"| NeonDB

    API -->|"OAuth Authorization Code Flow"| GC & MS
    Worker_Sync -->|"Fetch Assignments (Encrypted Refresh Token)"| GC & MS
    Worker_Notif -->|"Send Dispatch Email / Push"| SMTP
```

---

### 16. โครงสร้างเลเยอร์ภายใน Backend (Clean Architecture)
```mermaid
flowchart TD
    classDef l1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#0d47a1;
    classDef l2 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20;
    classDef l3 fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#f57f17;
    classDef l4 fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#880e4f;

    subgraph Layer1["1. Presentation Layer (API Routers & Middleware)"]
        R_Auth["auth_router.py (Login, Register, Recovery)"]:::l1
        R_Learn["learning_router.py (Courses, Tasks, Calendar)"]:::l1
        R_Notif["notifications_router.py (Settings, History)"]:::l1
        R_Admin["admin_router.py (Connections, Monitoring, Logs)"]:::l1
        M_Rate["Middleware: RateLimiter & AuditInterceptor"]:::l1
    end

    subgraph Layer2["2. Application Service Layer (Business Logic)"]
        S_Auth["AuthService (JWT, Password Hashing, Token TTL)"]:::l2
        S_Sync["SyncService (Delta Engine, Deduplication)"]:::l2
        S_Task["TaskService (Status Computation: Overdue/Submitted)"]:::l2
        S_Notif["NotificationService (Multi-tier Scheduling)"]:::l2
        S_Admin["AdminService (Health Check, Connection Stats)"]:::l2
    end

    subgraph Layer3["3. Integration Adapter Layer (External LMS Connectors)"]
        A_Base["BaseAdapter (Interface)"]:::l3
        A_GC["GoogleClassroomAdapter (courses.readonly, coursework.readonly)"]:::l3
        A_MS["MicrosoftTeamsAdapter (education.assignments.readonly)"]:::l3
    end

    subgraph Layer4["4. Infrastructure & Data Layer (Persistence & Security)"]
        Repo["Repositories (UserRepository, LearningRepository, SyncRepository)"]:::l4
        ORM["SQLAlchemy Async ORM Models (12 Tables)"]:::l4
        Vault["Crypto Vault (AES-256-GCM Token Encryption)"]:::l4
    end

    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer2 --> Layer4
    Layer3 --> Layer4
```
