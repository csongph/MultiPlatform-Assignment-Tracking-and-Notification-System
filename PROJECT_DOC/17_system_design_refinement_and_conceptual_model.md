# เอกสารปรับปรุงสถาปัตยกรรมและการออกแบบระบบระดับแนวคิด
## (System Architecture Refinement, Conceptual Data Model & Technical Analysis)
### โครงการ: ระบบติดตามงานและแจ้งเตือนการเรียนจากหลายแพลตฟอร์ม (MultiPlatform Assignment Tracking)

---

## 1. บทนำและสรุปการตรวจสอบความสมบูรณ์ (Executive Audit Summary)

เอกสารฉบับนี้จัดทำขึ้นเพื่อปรับปรุงและอุดช่องโหว่ความสมบูรณ์ของระบบตามข้อเสนอแนะเชิงลึก โดยมุ่งเน้นการยกระดับโครงสร้างสถาปัตยกรรม (System Architecture), แบบจำลองข้อมูลระดับแนวคิด (Conceptual Data Model), กระบวนการทำงาน (Workflows), และการชี้แจงความจำเป็นของระบบส่วนสนับสนุนผู้ดูแลระบบ (Admin Subsystems)

| หัวข้อตรวจสอบ | สถานะเดิม | การปรับปรุง / ข้อสรุป |
|---|---|---|
| **1. Conceptual Data Model** | มีเฉพาะ Physical Schema (ตารางและคอลัมน์) | เพิ่มแผนภาพ Conceptual ERD เน้นความสัมพันธ์เชิงธุรกิจและ Multiplicity |
| **2. Notification Interval Attribute** | มีเฉพาะ `lead_time_minutes: int` ค่าเดียว | ปรับเป็นโครงสร้าง Multi-Interval Schedule รองรับการแจ้งเตือนหลายระดับ |
| **3. Notification Stage Tracking** | ไม่มีตัวระบุว่าส่งแจ้งเตือนรอบใดไปแล้ว | ออกแบบฟิลด์ `notification_tier` / `stage` พร้อม Deduplication Matrix |
| **4. Core Pain Points & Flow** | ขาดการเจาะลึกที่ตรงจุดและ Flow ยังรวบรัด | ปรับ Pain Points 5 มิติ และแจกแจง Flow ละเอียดแบบ Step-by-Step |
| **5. Course Entity** | มีเฉพาะ `name` ไม่มี `description` | เพิ่ม `description`, `section_code`, `instructor_name` |
| **6. Assignment vs User Task** | รวมข้อมูลงานและสถานะผู้ใช้ไว้ในตารางเดียว | แยกชั้นระหว่าง **Assignment Definition (ส่วนกลาง)** และ **User Task State (รายบุคคล)** |
| **7. User Recovery System** | ยังไม่มีการออกแบบ Flow การลืมรหัสผ่าน | เพิ่มระบบ Password Reset & Account Recovery อย่างสมบูรณ์ |
| **8. Admin: Connection Monitoring** | ระบุเป็นฟังก์ชันเสริม | ชี้แจงบทบาท Proactive Support & Token Health Visibility |
| **9. Admin: System Monitoring** | ระบุเป็นเพียงเมตริกทั่วไป | ชี้แจงเหตุผลว่า **จำเป็นต้องมี** เพื่อป้องกัน System Blindness |
| **10. Server / Audit Log** | มีเฉพาะตาราง log กว้างๆ | จำแนกประโยชน์ 4 ด้าน: RCA, Security, Compliance (PDPA), Performance |

---

## 2. การวิเคราะห์ปัญหาหลัก (Refined Core Pain Points)

เพื่อให้ระบบตอบโจทย์ผู้ใช้อย่างตรงจุด จึงจำแนก Pain Point ของผู้เรียนและผู้ดูแลระบบออกเป็น 5 ประการหลัก:

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

1. **Digital Fragmentation & Context Switching Fatigue**: ผู้เรียนต้องเข้าใช้งานทั้ง Google Classroom และ Microsoft Teams สลับกันในแต่ละวัน ทำให้สูญเสียสมาธิและเกิดภาวะข้อมูลล้นเกิน (Cognitive Overload)
2. **Silent Missed Deadlines**: ผู้เรียนพลาดการส่งงานไม่ใช่เพราะไม่ตั้งใจ แต่เพราะไม่เห็นภาพรวมเส้นตาย (Aggregated Timeline) งานในวิชาหนึ่งถูกบดบังด้วยประกาศของอีกวิชาหนึ่ง
3. **Rigid & Ineffective Notification**: การแจ้งเตือนของแพลตฟอร์มต้นทางมักส่งครั้งเดียวตอนอาจารย์โพสต์งาน ซึ่งมักเกิดขึ้นล่วงหน้านานจนผู้เรียนลืม หรือแจ้งเตือนกระชั้นชิดเกินไปจนทำงานไม่ทัน ระบบต้องการการเตือนแบบ **Multi-tier Escalation (เตือนล่วงหน้าหลายระยะ)**
4. **Data Coupling Ambiguity**: ข้อมูลชิ้นงาน (Assignment) จากต้นทางกับความคืบหน้ารายบุคคล (Personal Task State) ปะปนกัน ทำให้ยากต่อการจัดการสถานะงานของผู้เรียนแต่ละคน
5. **Operational Blindness (Admin)**: ผู้ดูแลระบบไม่สามารถทราบได้เลยว่าระบบการเชื่อมต่อ API ของนักศึกษาคนใดล้มเหลว จนกระทั่งนักศึกษาไม่ได้รับแจ้งเตือนและส่งงานสาย

---

## 3. แบบจำลองข้อมูลระดับแนวคิด (Conceptual Data Model - CDM)

ระดับแนวคิด (Conceptual Level) มุ่งเน้นการอธิบาย **สิ่งที่ระบบจัดเก็บ (Entities)** และ **ความสัมพันธ์เชิงความหมาย (Business Relationships & Multiplicity)** โดยแยกย่อยออกเป็น **5 โดเมนหลัก** เพื่อให้อ่านเข้าใจง่าย เส้นไม่ทับซ้อนกัน

---

### 3.1 แบบจำลองแนวคิดภาพรวมทั้งระบบ (Unified Conceptual Data Model - CDM)

แผนภาพนี้รวบรวมทุก Entity ในระดับแนวคิดเชิงธุรกิจของทั้งระบบไว้ในแผนภาพเดียว โดยจัดวางลำดับเลย์เอาต์จากซ้ายไปขวาเพื่อให้อ่านง่าย เส้นไม่ไขว้กัน:

```mermaid
flowchart LR
    classDef iam fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef lms fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;
    classDef task fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:#f57f17;
    classDef notif fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100;
    classDef ops fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;

    %% Entity Definitions
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

    %% Relationships (Clean Flow)
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


### 3.2 แผนภาพความสัมพันธ์แยกตามโดเมน (Focused Conceptual Models)

#### โดเมนที่ 1: ระบบจัดการผู้ใช้และความปลอดภัย (Identity, Roles & Recovery)
```mermaid
flowchart LR
    classDef ent fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    
    User["<b>USER</b><br/>(ผู้ใช้งานระบบ)"]:::ent
    Role["<b>ROLE</b><br/>(บทบาท: Student/Admin)"]:::ent
    Recovery["<b>PASSWORD_RECOVERY_TOKEN</b><br/>(โทเค็นกู้คืนรหัสผ่าน)"]:::ent

    User -->|"1 : N (มีบทบาท)"| Role
    User -->|"1 : N (ร้องขอกู้คืน)"| Recovery
```

---

#### โดเมนที่ 2: ระบบเชื่อมต่อ LMS และการรวมงาน (Platform Integration & Course Aggregation)
```mermaid
flowchart LR
    classDef ent fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;
    classDef uent fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;

    User["<b>USER</b>"]:::uent
    Platform["<b>PLATFORM</b><br/>(Google / MS Teams)"]:::ent
    OAuth["<b>OAUTH_CONNECTION</b><br/>(Token เชื่อมต่อ)"]:::ent
    Course["<b>COURSE</b><br/>(รายวิชา + Description)"]:::ent
    Assignment["<b>ASSIGNMENT</b><br/>(ชิ้นงานส่วนกลางของวิชา)"]:::ent

    User -->|"1 : N (อนุญาตเชื่อมต่อ)"| OAuth
    Platform -->|"1 : N (ให้บริการ)"| OAuth
    Platform -->|"1 : N (กำเนิดวิชา)"| Course
    Course -->|"1 : N (มีชิ้นงาน)"| Assignment
```

---

#### โดเมนที่ 3: ระบบติดตามงานรายบุคคล (Personal Task State Tracking)
```mermaid
flowchart LR
    classDef ent fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:#f57f17;
    classDef uent fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef aent fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;

    User["<b>USER</b><br/>(ผู้เรียน)"]:::uent
    Assignment["<b>ASSIGNMENT</b><br/>(งานกลางของวิชา)"]:::aent
    TaskState["<b>USER_TASK_STATE</b><br/>(สถานะงานรายคน: ส่ง/ยังไม่ส่ง/โน้ต)"]:::ent

    User -->|"1 : N (เป็นเจ้าของสถานะ)"| TaskState
    Assignment -->|"1 : N (ถูกติดตามโดย)"| TaskState
```

---

#### โดเมนที่ 4: ระบบการตั้งค่าและการแจ้งเตือนหลายระยะ (Tiered Notification Engine)
```mermaid
flowchart LR
    classDef ent fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100;
    classDef uent fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef aent fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;

    User["<b>USER</b>"]:::uent
    Assignment["<b>ASSIGNMENT</b>"]:::aent
    Setting["<b>NOTIFICATION_SETTING</b><br/>(ค่ากำหนดหลักของผู้ใช้)"]:::ent
    Rule["<b>NOTIFICATION_INTERVAL_RULE</b><br/>(กฎช่วงเวลา Tier 1 / 2 / 3)"]:::ent
    Dispatch["<b>NOTIFICATION_DISPATCH</b><br/>(คิว & ประวัติการส่งแจ้งเตือน)"]:::ent

    User -->|"1 : 1 (ตั้งค่า)"| Setting
    Setting -->|"1 : N (กำหนดระยะ)"| Rule
    Rule -.->|"กระตุ้นส่งตามรอบ"| Dispatch
    User -->|"1 : N (รับการแจ้งเตือน)"| Dispatch
    Assignment -.->|"อ้างอิงชิ้นงาน"| Dispatch
```

---

#### โดเมนที่ 5: ระบบบันทึกประวัติและการทำงาน (Observability & Logs)
```mermaid
flowchart LR
    classDef ent fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;
    classDef uent fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef pent fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20;

    User["<b>USER</b>"]:::uent
    Platform["<b>PLATFORM</b>"]:::pent
    SyncLog["<b>SYNC_LOG</b><br/>(ประวัติการดึงข้อมูลรายรอบ)"]:::ent
    AuditLog["<b>AUDIT_LOG</b><br/>(ประวัติกิจกรรม Admin/User)"]:::ent

    User -->|"1 : N (บันทึกกิจกรรม)"| AuditLog
    User -->|"1 : N (เป็นเป้าหมาย Sync)"| SyncLog
    Platform -->|"1 : N (ผลลัพธ์จาก)"| SyncLog
```

---

### 3.3 ตารางสรุปความสัมพันธ์และความหมายทางธุรกิจ (Business Relationship Matrix)

| Entity ต้นทาง | Multiplicity | Entity ปลายทาง | ความหมายเชิงธุรกิจ |
|---|:---:|---|---|
| `USER` | **1 : N** | `ROLE` | ผู้ใช้ 1 คนสามารถมีได้หลายบทบาท (เช่น เป็นทั้ง Student และ Admin) |
| `USER` | **1 : N** | `PASSWORD_RECOVERY_TOKEN` | ผู้ใช้สามารถร้องขอโทเค็นรีเซ็ตรหัสผ่านได้หลายครั้ง แต่ละโทเค็นมีอายุ 15 นาที |
| `USER` | **1 : N** | `OAUTH_CONNECTION` | ผู้ใช้ 1 คนสามารถเชื่อมต่อได้หลายแพลตฟอร์ม (Google Classroom, MS Teams) |
| `PLATFORM` | **1 : N** | `COURSE` | แพลตฟอร์มต้นทาง 1 แห่ง เป็นแหล่งที่มาของหลายรายวิชา |
| `COURSE` | **1 : N** | `ASSIGNMENT` | 1 รายวิชาประกอบด้วยงานที่มอบหมายหลายชิ้นงาน (ชิ้นงานเป็นของวิชา) |
| `ASSIGNMENT` | **1 : N** | `USER_TASK_STATE` | งาน 1 ชิ้น จะมีรายการติดตามสถานะการส่งแยกตามนักศึกษาแต่ละคนที่เรียนวิชานั้น |
| `USER` | **1 : N** | `USER_TASK_STATE` | นักศึกษา 1 คน มีรายการสถานะงานของตนเองสำหรับทุกชิ้นงาน |
| `USER` | **1 : 1** | `NOTIFICATION_SETTING` | ผู้ใช้แต่ละคนมีโปรไฟล์การตั้งค่าแจ้งเตือนหลัก 1 ชุด |
| `NOTIFICATION_SETTING` | **1 : N** | `NOTIFICATION_INTERVAL_RULE` | 1 การตั้งค่า สามารถกำหนดช่วงเวลาเตือนล่วงหน้าได้หลายระยะ (Tier 1, Tier 2, Tier 3) |
| `ASSIGNMENT` | **1 : N** | `NOTIFICATION_DISPATCH` | งาน 1 ชิ้น สามารถเกิดการส่งแจ้งเตือนได้หลายรอบตาม Tier ที่ตั้งไว้ |
| `USER` | **1 : N** | `AUDIT_LOG` | บันทึกประวัติกิจกรรมสำคัญที่ผู้ใช้กระทำในระบบ |
| `USER` | **1 : N** | `SYNC_LOG` | บันทึกผลการดึงข้อมูลจากภายนอกของผู้ใช้แต่ละราย |

---



## 4. การแยกความซับซ้อนของ Assignment: ระดับชิ้นงานส่วนกลาง vs สถานะรายบุคคล

### 4.1 ปัญหาของโครงสร้างเดิม (Tightly Coupled Schema)
เดิมการนำ `user_id` มาผูกตรงไว้กับ `Assignment` ทำให้เกิดปัญหา:
- หากนักศึกษา 50 คนอยู่ในวิชาเดียวกัน ระบบต้องจัดเก็บข้อมูลชื่องานและคำอธิบายซ้ำซ้อน 50 แถว
- เมื่ออาจารย์แก้วันส่งหรือแก้คำอธิบายงาน Sync Engine ต้องตามอัปเดต 50 แถว
- ไม่สามารถรองรับการที่นักศึกษาแต่ละคนมีโน้ตส่วนตัว (Personal Notes) หรือสถานะย่อย (e.g. In Progress, Drafted) ได้

### 4.2 โครงสร้างใหม่ที่แยกความรับผิดชอบ (Separation of Concerns)

```mermaid
classDiagram
    class Course {
        +UUID id
        +String platform_id
        +String external_course_id
        +String name
        +String description
        +String instructor_name
        +String section_code
    }

    class Assignment {
        +UUID id
        +UUID course_id
        +String external_assignment_id
        +String title
        +String description
        +DateTime due_at
        +Float max_points
        +String source_url
        +Boolean is_deleted
    }

    class UserTaskState {
        +UUID id
        +UUID user_id
        +UUID assignment_id
        +String source_submission_status
        +String computed_status
        +DateTime submitted_at
        +Float user_score
        +String personal_notes
        +Boolean is_pinned
        +DateTime last_synced_at
    }

    Course "1" --> "*" Assignment : contains
    Assignment "1" --> "*" UserTaskState : tracked by
```

**ประโยชน์ของการแยก**:
1. **Assignment (Global Entity)**: เก็บข้อมูลวัตถุงานจริงที่อาจารย์สั่ง เช่น ชื่องาน, รายละเอียด (description), กำหนดส่งกลาง (due_at), คะแนนเต็ม, ลิงก์ต้นทาง
2. **UserTaskState (Personal Entity)**: เก็บข้อมูลสถานะของนักศึกษาคนนั้นๆ เช่น ส่งหรือยัง (`submitted`), ส่งเวลาใด (`submitted_at`), เลยกำหนดหรือไม่ (`overdue`), โน้ตส่วนตัวที่นักศึกษาจดไว้เอง

---

## 5. การปรับปรุง Course Entity: เพิ่มรายละเอียดรายวิชา (Course Description)

ใน Entity `Course` ได้รับการเพิ่มคุณลักษณะให้ครบถ้วนเพื่อรองรับการแสดงผลหน้า Course Detail:
- **`description` (Text, Nullable)**: คำอธิบายรายวิชา / ข้อมูลสังเขปเกี่ยวกับวิชา
- **`instructor_name` (VARCHAR(150), Nullable)**: ชื่ออาจารย์ผู้สอนประจำวิชา
- **`section_code` (VARCHAR(50), Nullable)**: กลุ่มเรียน / ตอนเรียน (Section)

---

## 6. การแก้ไขคุณลักษณะช่วงเวลาแจ้งเตือน (Custom Notification Intervals)

### 6.1 ปัญหาของคุณลักษณะเดิม
เดิมกำหนดให้ `lead_time_minutes: Integer` เป็นค่าเดี่ยว (เช่น 60 นาที) ทำให้:
- ผู้ใช้ไม่สามารถตั้งการเตือนหลายระยะได้ (เช่น ต้องการให้เตือนทั้ง **3 วันล่วงหน้า** เพื่อเตรียมตัว และ **2 ชั่วโมงล่วงหน้า** เพื่อตรวจความเรียบร้อย)
- ไม่มีความยืดหยุ่นสำหรับวิชาที่มีภาระงานใหญ่ที่ต้องใช้เวลาทำหลายวัน

### 6.2 การปรับปรุงเป็น Multi-Interval / Tiered Notification

```mermaid
graph LR
    subgraph NotificationSettings["Notification Settings"]
        direction TB
        General["Channel: Push + Email<br/>Enabled Types: New, Due-soon, Overdue"]
        Rules["Custom Interval Rules:"]
        R1["Tier 1: 4320 นาที (3 วันก่อนกำหนด) - เพื่อวางแผน"]
        R2["Tier 2: 1440 นาที (1 วันก่อนกำหนด) - เพื่อลงมือทำ"]
        R3["Tier 3: 120 นาที (2 ชม. ก่อนกำหนด) - ตรวจสอบความถูกต้อง"]
    end
    General --> Rules
    Rules --> R1
    Rules --> R2
    Rules --> R3
```

**โครงสร้างข้อมูลที่ถูกต้อง (JSON / Relational Structure)**:
```json
{
  "user_id": "uuid-1234",
  "channel": "both",
  "new_assignment_enabled": true,
  "overdue_enabled": true,
  "due_soon_enabled": true,
  "reminder_intervals": [
    { "tier": 1, "lead_time_minutes": 4320, "label": "3 วันล่วงหน้า (Early Planning)" },
    { "tier": 2, "lead_time_minutes": 1440, "label": "1 วันล่วงหน้า (Action Reminder)" },
    { "tier": 3, "lead_time_minutes": 120,  "label": "2 ชั่วโมงล่วงหน้า (Urgent Final Check)" }
  ]
}
```

---

## 7. กลไกการแจ้งเตือนหลายระดับ: "จะรู้ได้อย่างไรว่าคนนี้ต้องแจ้งเตือนครั้งที่สอง/สาม?"

นี่คือหัวใจสำคัญของ **Notification Dispatch Engine**: ระบบจะป้องกันการส่งซ้ำ (Deduplication) และรู้ได้อย่างไรว่าต้องส่งการแจ้งเตือน Tier 2 หรือ Tier 3

### 7.1 Data Structure สำหรับ State Tracking
ในตาราง `notifications` (หรือ `notification_dispatches`) มีการระบุ **`tier`** หรือ **`stage`** ควบคู่กับ Composite Unique Key:

| Field | Type | คำอธิบาย |
|---|---|---|
| `id` | UUID | Primary Key |
| `user_id` | UUID | ผู้รับการแจ้งเตือน |
| `assignment_id` | UUID | งานที่เกี่ยวข้อง |
| `notification_type` | VARCHAR | `new_assignment`, `due_soon`, `overdue` |
| **`tier`** | SMALLINT | ระดับการเตือน (1 = เตือนครั้งแรก 3 วัน, 2 = เตือนครั้งที่สอง 1 วัน, 3 = เตือนครั้งที่สาม 2 ชม.) |
| `trigger_time` | TIMESTAMPTZ | เวลาที่กำหนดส่ง (`due_at - lead_time_minutes`) |
| `status` | VARCHAR | `pending`, `sending`, `delivered`, `failed` |
| **Unique Constraint** | - | **`UNIQUE(user_id, assignment_id, notification_type, tier)`** |

### 7.2 กระบวนการตัดสินใจ (Notification Dispatch Algorithm)

```mermaid
flowchart TD
    Start([Cron Dispatcher ทำงานทุก 1 นาที]) --> FetchDue["1. ดึงงานที่ยังไม่ส่ง (computed_status = not_submitted)"]
    FetchDue --> LoopUser["2. สำหรับแต่ละ User + Assignment: คำนวณเวลาที่เหลือก่อน Due Date"]
    
    LoopUser --> CheckTiers["3. เปรียบเทียบเวลาที่เหลือกับ Reminder Intervals ของ User"]
    
    CheckTiers --> T1{เวลาที่เหลือ <= Tier 1 (3 วัน)?}
    T1 -- ใช่ --> CheckSent1{เคยส่ง Tier 1 แล้วหรือยัง?<br/>(Check DB: user_id + ass_id + due_soon + tier 1)}
    CheckSent1 -- ยังไม่เคย --> QueueT1["สร้าง & ส่ง Notification Tier 1<br/>บันทึก status=delivered, tier=1"]
    CheckSent1 -- ส่งแล้ว --> T2
    
    T1 -- ยังไม่ถึงเวลา --> NextItem([ข้ามไปรายการถัดไป])
    
    T2{เวลาที่เหลือ <= Tier 2 (1 วัน)?}
    T2 -- ใช่ --> CheckSent2{เคยส่ง Tier 2 แล้วหรือยัง?<br/>(Check DB: tier 2)}
    CheckSent2 -- ยังไม่เคย --> QueueT2["สร้าง & ส่ง Notification Tier 2 (ครั้งที่สอง)<br/>บันทึก status=delivered, tier=2"]
    CheckSent2 -- ส่งแล้ว --> T3
    
    T2 -- ยังไม่ถึงเวลา --> NextItem
    
    T3{เวลาที่เหลือ <= Tier 3 (2 ชม.)?}
    T3 -- ใช่ --> CheckSent3{เคยส่ง Tier 3 แล้วหรือยัง?<br/>(Check DB: tier 3)}
    CheckSent3 -- ยังไม่เคย --> QueueT3["สร้าง & ส่ง Notification Tier 3 (ครั้งสุดท้าย)<br/>บันทึก status=delivered, tier=3"]
    CheckSent3 -- ส่งแล้ว --> NextItem
```

**คำตอบชัดเจน**: ระบบรู้ว่าต้องส่ง **"ครั้งที่สอง"** เพราะ:
1. เมื่อถึงช่วงเวลา Tier 2 ระบบ Query ตรวจสอบตาราง `notifications` ด้วยเงื่อนไข `(user_id, assignment_id, type='due_soon', tier=2)`
2. หากยังไม่พบบันทึกที่มี `status IN ('delivered', 'sending')` และสถานะงานยังเป็น `not_submitted` ระบบจะสั่งยิงการแจ้งเตือน Tier 2 ทันที และบันทึกประวัติกำกับไว้
3. ด้วยกลไก `UNIQUE KEY` ทำให้ไม่เกิดการยิงซ้ำแม้ Worker จะประมวลผลชนกัน

---

## 8. ระบบกู้คืนบัญชีผู้ใช้ (User Account Recovery & Password Reset Flow)

### 8.1 เหตุผลความจำเป็นทางวิศวกรรม (Engineering Rationale)
หากไม่มีระบบ Account Recovery ระบบจะมีข้อจำกัดที่ส่งผลกระทบขั้นรุนแรงต่อขีดความสามารถการใช้งานจริง (Operational Failure):
- ผู้ใช้ที่ลืมรหัสผ่านจะไม่สามารถเข้าถึงระบบได้ ทำให้พลาดการแจ้งเตือนงานทั้งหมด
- ภาระตกอยู่ที่ Admin ต้องมาแก้รหัสผ่านแบบ Manual ซึ่งผิดหลักความมั่นคงปลอดภัย (Security Violation)

### 8.2 แผนภาพกระบวนการกู้คืนรหัสผ่าน (Password Recovery Flow)

```mermaid
sequenceDiagram
    actor U as ผู้ใช้ (Student)
    participant FE as Frontend Client
    participant API as Backend Auth API
    participant DB as Database
    participant Mail as Email Service Provider

    U->>FE: 1. กด "ลืมรหัสผ่าน" และกรอก Email
    FE->>API: 2. POST /api/v1/auth/forgot-password {email}
    API->>DB: 3. ค้นหาผู้ใช้จาก Email
    alt พบ Email ในระบบ
        API->>API: 4. สร้าง Secure Crypto Token (Random 64 bytes)
        API->>DB: 5. บันทึก Token (Hashed, TTL = 15 นาที, is_used=false)
        API->>Mail: 6. ส่งอีเมลพร้อมลิงก์ Reset: https://app.../reset-password?token=XYZ
        Mail-->>U: 7. ผู้ใช้ได้รับอีเมลลิงก์กู้คืน
    else ไม่พบ Email
        API->>API: 8. หน่วงเวลาเพื่อป้องกัน Timing Attack
    end
    API-->>FE: 9. ตอบกลับข้อความกลาง: "หากมีอีเมลนี้ ระบบได้ส่งคำแนะนำไปแล้ว"
    
    U->>FE: 10. คลิก ลิงก์ในอีเมล กรอกรหัสผ่านใหม่
    FE->>API: 11. POST /api/v1/auth/reset-password {token, new_password}
    API->>DB: 12. ตรวจสอบ Token (ต้องไม่หมดอายุ และ is_used = false)
    alt Token ถูกต้องและยังไม่หมดอายุ
        API->>API: 13. Hash รหัสผ่านใหม่ด้วย bcrypt
        API->>DB: 14. อัปเดต password_hash ของ User
        API->>DB: 15. ทำเครื่องหมาย Token is_used = true (ป้องกัน Replay Attack)
        API->>DB: 16. Invalidate Refresh Token ทั้งหมดของ User เดิม (Force Re-login)
        API-->>FE: 17. กู้คืนสำเร็จ Redirect ไปหน้า Login
        FE-->>U: 18. แสดงข้อความตั้งรหัสผ่านใหม่สำเร็จ
    else Token ไม่ถูกต้องหรือหมดอายุ
        API-->>FE: 19. แจ้ง Error: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอใหม่อีกครั้ง"
    end
```

---

## 9. บทวิเคราะห์และความจำเป็นของระบบฝั่งผู้ดูแลระบบ (Admin Systems)

### 9.1 Connection Monitoring : มีไว้ทำอะไร? มีประโยชน์อย่างไร?

| ประเด็น | คำอธิบายเชิงลึก |
|---|---|
| **หน้าที่ (What it does)** | แสดงสถานะการเชื่อมต่อ OAuth ของนักศึกษาทุกคนในระบบแบบ Real-time (Connected, Expired, Revoked, Rate Limited, Error) |
| **ประโยชน์ต่อ Admin** | **1. Proactive Troubleshooting**: Admin สามารถเห็นได้ทันทีว่านักศึกษากลุ่มใด Token หมดอายุ หรือหลุดการเชื่อมต่อ ก่อนที่นักศึกษาจะรู้ตัว<br/>**2. Visibility on Platform Health**: วิเคราะห์ได้ว่าเกิดปัญหาที่ฝั่ง Google Classroom API หรือ Microsoft Graph API หรือไม่ (เช่น หลุดพร้อมกันทั้งสถาบัน)<br/>**3. Support Efficiency**: เมื่อนักศึกษาแจ้งว่า "งานไม่อัปเดต" Admin ตรวจสอบได้ทันทีในหน้าเดียว ไม่ต้องเดา |
| **ประโยชน์ต่อ User** | ได้รับการแจ้งเตือนให้ Re-authorize อย่างทันท่วงที งานไม่ตกหล่น |

---

### 9.2 System Monitoring : มีไว้ทำอะไร? ควรมีไหม? ช่วยอะไร Admin ได้บ้าง?

| ประเด็น | คำอธิบายเชิงลึก |
|---|---|
| **ข้อสรุปความจำเป็น** | **"จำเป็นต้องมีอย่างยิ่ง" (Critical Must-Have)** |
| **หน้าที่ (What it does)** | ตรวจสอบมาตรวัดสุขภาพของระบบ (System Health Metrics): อัตราความสำเร็จของการ Sync ข้อมูล (Sync Success Rate), ความลึกของคิวแจ้งเตือน (Notification Queue Depth), อัตราการใช้งาน API Quota ต่อ Provider, Database Connection Pool, และ Response Time |
| **ช่วยอะไร Admin ได้บ้าง?** | **1. ป้องกัน System Blindness**: หากไม่มี System Monitoring แล้ว Sync Engine ค้างหรือล่ม Admin จะไม่มีทางทราบเลยจนกว่าผู้ใช้ทั้งมหาวิทยาลัยจะโวยวาย<br/>**2. Early Warning on Quota Exhaustion**: แจ้งเตือนเมื่อ API Quota ของ Google/Microsoft กำลังจะเต็ม เพื่อวางแผนขยาย Quota ทัน<br/>**3. Capacity Planning**: ทราบว่าช่วงเวลาใดที่นักศึกษาใช้งานหนัก (Peak Hour) เพื่อปรับขนาด Worker ให้เหมาะสม |

---

### 9.3 Server Log & Audit Log : มีไว้ทำไม?

การเก็บ Server Log และ Audit Log มีความจำเป็นทางวิศวกรรม 4 มิติ:

```mermaid
graph TD
    LogNode["Server & Audit Logs"]
    LogNode --> RCA["1. Root Cause Analysis (RCA)<br/>ใช้สืบค้นหาสาเหตุเวลาเกิด Bug หรือข้อมูลไม่อัปเดต"]
    LogNode --> SEC["2. Security & Forensics<br/>ตรวจสอบการพยายาม Brute Force, Token Hijacking หรือ Privilege Escalation"]
    LogNode --> COMP["3. Compliance & PDPA Law<br/>เป็นหลักฐานทางกฎหมายว่าใครเข้าถึงข้อมูลอะไร และมี Consent หรือไม่"]
    LogNode --> SLA["4. SLA & Performance Monitoring<br/>วัด Latency ของการเรียก Google/MS API เพื่อประเมิน SLA ของระบบ"]
```

1. **Root Cause Analysis (RCA)**: เมื่อนักศึกษาแจ้งว่า "งานวิชานี้ไม่เข้า" Server Log จะบอกได้ทันทีว่า Google API ตอบ error รหัสอะไรกลับมา
2. **Security & Accountability**: Audit Log บันทึกว่า Admin คนใดเปลี่ยนสิทธิ์ของใคร หรือใครขอ Export ข้อมูล ป้องกันการทุจริตและการใช้อำนาจมิชอบ
3. **Legal Compliance (PDPA)**: กฎหมายคุ้มครองข้อมูลส่วนบุคคลกำหนดให้ระบบต้องมี Audit Trail บันทึกการยินยอม (Consent) และประวัติการเข้าถึงข้อมูลส่วนบุคคล
4. **Performance Tuning**: รู้ว่าจุดใดในระบบที่เป็นคอขวด (Bottleneck) จากเวลาประมวลผลใน Request Log

---

## 10. แผนภาพกระบวนการทำงานแบบละเอียด (Detailed Step-by-Step Workflows)

### 10.1 End-to-End Core Lifecycle Workflow

```mermaid
flowchart TD
    subgraph S1["ขั้นตอนที่ 1: การยืนยันตัวตนและการกู้คืน"]
        A1[ผู้ใช้สมัครสมาชิก / เข้าสู่ระบบ] --> A2{ลืมรหัสผ่าน?}
        A2 -- ใช่ --> A3[เข้ากระบวนการ Password Reset ผ่าน Email Token]
        A3 --> A1
        A2 -- ไม่ใช่ --> A4[ออก JWT + Refresh Token]
    end

    subgraph S2["ขั้นตอนที่ 2: การเชื่อมต่อ LMS (Onboarding)"]
        A4 --> B1{เคยเชื่อมต่อ LMS แล้วหรือยัง?}
        B1 -- ยังไม่เคย --> B2[เลือก Google Classroom / MS Teams]
        B2 --> B3[OAuth 2.0 PKCE Flow]
        B3 --> B4[บันทึก Encrypted Refresh Token ใน oauth_connections]
        B1 -- เคยแล้ว --> C1
        B4 --> C1
    end

    subgraph S3["ขั้นตอนที่ 3: เครื่องจักรดึงข้อมูล (Sync Engine)"]
        C1[Sync Scheduler ทำงานตามรอบ / Manual Trigger] --> C2[เรียก API Google Classroom & MS Teams]
        C2 --> C3[Upsert ข้อมูล Course + Course Description]
        C3 --> C4[Upsert Assignment กลาง]
        C4 --> C5[คำนวณและอัปเดต UserTaskState รายบุคคล]
        C5 --> C6[บันทึกผลลัพธ์ลง sync_logs]
    end

    subgraph S4["ขั้นตอนที่ 4: การแจ้งเตือนหลายระยะ (Tiered Notifications)"]
        C5 --> D1[ประเมินเงื่อนไข Due Soon ตาม Multi-Interval Tier ของ User]
        D1 --> D2{พบเงื่อนไขที่ยังไม่เคยส่ง?}
        D2 -- มี --> D3[สร้าง Record ลง notifications กำกับ tier]
        D3 --> D4[Notification Dispatcher ส่ง Push/Email]
        D4 --> D5[บันทึกสถานะ delivered / retry หากล้มเหลว]
        D2 -- ไม่มี --> E1
        D5 --> E1
    end

    subgraph S5["ขั้นตอนที่ 5: การแสดงผลและการบริหารจัดการ"]
        E1[ผู้เรียนดู Dashboard / Task List / Calendar]
        E1 --> E2[คลิก Deep Link เพื่อไปส่งงานที่ LMS ต้นทาง]
        E3[Admin ตรวจสอบ Connection Monitoring & System Metrics]
    end
```

---

## 11. ตารางสรุปการตัดสินใจเชิงสถาปัตยกรรม (Architectural Decision Record - ADR)

| ประเด็นการปรับปรุง | ข้อสรุปและเหตุผลเชิงสถาปัตยกรรม |
|---|---|
| **1. การแยก Assignment และ UserTaskState** | **เลือกแยก Entity 1:N**: เพื่อความถูกต้องตามหลัก Normalization (3NF) ลดความซ้ำซ้อนของข้อมูล และรองรับการจัดการสถานะ/โน้ตส่วนตัวของนักศึกษาแต่ละคนได้อย่างอิสระ |
| **2. โครงสร้าง Multi-Interval Notification** | **เลือกใช้ JSON Array หรือ Relational Tiers**: เพื่อเปิดโอกาสให้นักศึกษาตั้งการแจ้งเตือนได้หลายระยะเวลาตามพฤติกรรมการเรียนจริง |
| **3. การติดตาม State การแจ้งเตือน** | **เลือกใช้ Unique Constraint `(user_id, assignment_id, type, tier)`**: ป้องกันการส่งซ้ำในระดับ Database Level และตรวจสอบได้ทันทีว่า Tier ใดถูกส่งไปแล้ว |
| **4. ระบบ Account Recovery** | **เลือกใช้อีเมล Token แบบ Time-limited (15-30 นาที)**: ปลอดภัยตามมาตรฐาน OWASP และปิดช่องว่างด้านการให้บริการผู้ใช้ |
| **5. การคงระบบ Monitoring & Logging ของ Admin** | **คงไว้ครบถ้วนทั้ง 3 ตัว**: เนื่องจากเป็นหัวใจของการดูแลรักษาระบบ (Observability), ความปลอดภัย (Security), และการปฏิบัติตามกฎหมาย (PDPA) ขาดตัวใดตัวหนึ่งไม่ได้ |

---

## 12. การตรวจสอบความสอดคล้องกับฐานข้อมูลจริง (Physical Database Schema Audit & Mapping)

จากการตรวจสอบ Source Code ของ Database Models (`backend/app/models/*.py`), Alembic Migrations (`0f9f537f2d5a_init_schema.py` & `7a8b9c0d1e2f_add_recovery_tokens_and_tiers.py`) และ Neon PostgreSQL Database Schema พบผลการตรวจสอบดังนี้:

| ตาราง (Table) | คอลัมน์และข้อกำหนดใน Database จริง | สถานะความสอดคล้อง | หมายเหตุการใช้งาน |
|---|---|:---:|---|
| **`platforms`** | `id` (SmallInt PK), `name` (String(50) Unique) | ✅ **100% สอดคล้อง** | รองรับ Seed: `google_classroom`, `microsoft_teams` |
| **`roles`** | `id` (SmallInt PK), `name` (String(50) Unique) | ✅ **100% สอดคล้อง** | รองรับ Seed: `student`, `admin` |
| **`users`** | `id` (UUID PK), `email` (String(255) Unique), `password_hash` (String(255) Nullable), `display_name` (String(150)), `is_active` (Boolean), `created_at`, `updated_at` | ✅ **100% สอดคล้อง** | รองรับการเข้าสู่ระบบทั้งแบบ Local และ SSO |
| **`user_roles`** | `user_id` (UUID PK FK), `role_id` (SmallInt PK FK) | ✅ **100% สอดคล้อง** | Composite PK รองรับสิทธิ์ผู้ใช้แบบ RBAC |
| **`password_recovery_tokens`** | `id` (UUID PK), `user_id` (UUID FK ondelete CASCADE), `token_hash` (VARCHAR(255)), `expires_at` (TIMESTAMPTZ), `is_used` (Boolean), `created_at` (TIMESTAMPTZ) | ✅ **100% อัปเดตแล้ว** | ระบบ Password Reset Token (TTL 15 นาที, One-time use) |
| **`oauth_connections`** | `id` (UUID PK), `user_id` (UUID FK), `platform_id` (SmallInt FK), `access_token_enc` (Text), `refresh_token_enc` (Text Nullable), `token_expires_at` (DateTime Nullable), `status` (String(20)), `connected_at`, `Unique(user_id, platform_id)` | ✅ **100% สอดคล้อง** | สถานะ: `connected`, `expired`, `broken` |
| **`courses`** | `id` (UUID PK), `user_id` (UUID FK), `platform_id` (SmallInt FK), `external_course_id` (String(255)), `name` (String(255)), `description` (Text), `instructor_name` (VARCHAR(150)), `is_deleted` (Boolean), `Unique(platform_id, external_course_id, user_id)` | ✅ **100% อัปเดตแล้ว** | มีข้อมูลคำอธิบายรายวิชาและชื่ออาจารย์ผู้สอน |
| **`assignments`** | `id` (UUID PK), `course_id` (UUID FK), `external_assignment_id` (String(255)), `title` (String(255)), `description` (Text Nullable), `due_at` (DateTime Nullable Index), `source_status` (String(30)), `computed_status` (String(20) Index), `source_url` (Text), `is_deleted` (Boolean), `last_synced_at`, `Unique(course_id, external_assignment_id)` | ✅ **100% สอดคล้อง** | สถานะ: `not_submitted`, `submitted`, `overdue` |
| **`notification_settings`** | `id` (UUID PK), `user_id` (UUID FK Unique), `lead_time_minutes` (Integer), `reminder_intervals` (JSONB), `new_assignment_enabled` (Boolean), `due_soon_enabled` (Boolean), `overdue_enabled` (Boolean), `channel` (String(20)) | ✅ **100% อัปเดตแล้ว** | รองรับการตั้งเวลาแจ้งเตือนหลายระยะ (Multi-tier Schedule) |
| **`notifications`** | `id` (UUID PK), `user_id` (UUID FK), `assignment_id` (UUID FK Nullable), `type` (String(20)), `tier` (SmallInt default 1), `status` (String(20) Index), `retry_count` (SmallInt), `scheduled_at` (DateTime Index), `delivered_at` (DateTime Nullable), `Unique(user_id, assignment_id, type, tier)` | ✅ **100% อัปเดตแล้ว** | มีฟิลด์ `tier` และ Constraint ป้องกันการแจ้งเตือนซ้ำ |
| **`sync_logs`** | `id` (UUID PK), `user_id` (UUID FK), `platform_id` (SmallInt FK), `status` (String(20)), `items_synced` (Integer), `error_detail` (JSONB Nullable), `started_at`, `finished_at` | ✅ **100% สอดคล้อง** | ใช้บันทึกผลการทำงานของ Sync Engine สำหรับ Admin |
| **`audit_logs`** | `id` (UUID PK), `actor_user_id` (UUID FK Nullable), `action` (String(100) Index), `target` (String(255) Nullable), `metadata` (JSONB Nullable), `created_at` (DateTime Index) | ✅ **100% สอดคล้อง** | ใช้สำหรับ Audit Trail ตรวจสอบความปลอดภัยและ PDPA |

---

## 13. แผนภาพภาพรวมฐานข้อมูลทั้งระบบ (System-wide Physical ER Diagram)

แผนภาพแสดงโครงสร้างตาราง ข้อมูล Attributes, Primary Keys (PK), Foreign Keys (FK), และเส้นความสัมพันธ์ Cardinality ครบถ้วนทั้ง 12 ตารางตามฐานข้อมูลจริง:

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

## 14. สถาปัตยกรรมระบบเชิงลึก (Deep-Dive System Architecture & Component Blueprint)

เพื่อให้สถาปัตยกรรมระบบมีความชัดเจนในระดับวิศวกรรมซอฟต์แวร์ระดับสูง จึงได้แจกแจงโครงสร้างตามมาตรฐาน **C4 Model** และ **Data Pipeline Mechanics** ดังนี้:

### 14.1 แผนภาพ C4 Container Architecture (ภาพรวมระบบและเทคโนโลยี)

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

    %% User Interactions
    U_Student & U_Admin -->|"HTTPS / TLS 1.3"| SPA
    SPA -->|"JSON / REST API (JWT Bearer)"| API

    %% Internal Data Flows
    API -->|"Async Read/Write (SQLAlchemy ORM)"| NeonDB
    API -->|"Cache Read/Write & Rate Limit Check"| Redis
    
    Worker_Sync -->|"Upsert Courses / Assignments / Sync Logs"| NeonDB
    Worker_Sync -->|"Invalidate Course Cache"| Redis
    
    Worker_Notif -->|"Poll Pending Tiers / Update Delivered"| NeonDB

    %% External Communications
    API -->|"OAuth Authorization Code Flow"| GC & MS
    Worker_Sync -->|"Fetch Assignments (Encrypted Refresh Token)"| GC & MS
    Worker_Notif -->|"Send Dispatch Email / Push"| SMTP
```

---

### 14.2 โครงสร้างเลเยอร์ภายใน Backend (Clean Architecture / Layered Pattern)

โครงสร้าง Backend แบ่งออกเป็น 4 ชั้นความรับผิดชอบ เพื่อให้ง่ายต่อการทดสอบและบำรุงรักษา (Maintainability & Testability):

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

---

### 14.3 ไปป์ไลน์การทำงานของระบบ (Core Data & Processing Pipelines)

#### ก) ไปป์ไลน์การดึงข้อมูลอัจฉริยะ (LMS Delta-Sync Pipeline)
```mermaid
sequenceDiagram
    participant SCH as Sync Scheduler (Every 10-15m)
    participant W as Sync Worker
    participant Vault as Crypto Vault
    participant LMS as External LMS API (Google/MS)
    participant DB as Neon PostgreSQL
    participant Cache as Redis Cache

    SCH->>W: Trigger Sync Job for User
    W->>DB: ดึง OAuth Connection (Status = 'connected')
    W->>Vault: ถอดรหัส Refresh Token (AES-256-GCM)
    alt Token ใกล้หมดอายุ (< 15 นาที)
        W->>LMS: Request New Access Token (Refresh Flow)
        LMS-->>W: New Token Payload
        W->>Vault: เข้ารหัส Token ใหม่
        W->>DB: Update oauth_connections (Token + Expiration)
    end
    W->>LMS: GET /courses & /coursework (Paginated)
    LMS-->>W: Raw Course & Assignment Payloads
    W->>W: 1. Normalize Payload เป็น Common Schema
    W->>W: 2. Cross-Platform Deduplication (วิชา/งานซ้ำ)
    W->>W: 3. Compute Status (now > due_at ? overdue : not_submitted)
    W->>DB: Batch Upsert courses & assignments (Soft-delete removed items)
    W->>DB: Insert sync_logs (Status = success, items_synced = N)
    W->>Cache: Invalidate Course Cache for User
```

#### ข) ไปป์ไลน์การแจ้งเตือนหลายระยะแบบการันตีไม่ส่งซ้ำ (Multi-Tier Notification Pipeline)
```mermaid
sequenceDiagram
    participant Cron as Cron Dispatcher (Every 1 min)
    participant Engine as Notification Engine
    participant DB as Neon PostgreSQL
    participant Mail as Email / Push Provider

    Cron->>Engine: Poll Pending Notifications
    Engine->>DB: Query Assignments where computed_status = 'not_submitted'
    Engine->>DB: Query User Notification Settings & Intervals (Tier 1/2/3)
    loop แต่ละ Assignment
        Engine->>Engine: คำนวณ Remaining Time = due_at - now()
        alt เข้าเกณฑ์ Tier 1 (เช่น 3 วันก่อน)
            Engine->>DB: Check Unique (user_id, ass_id, 'due_soon', tier=1)
            alt ยังไม่เคยส่ง Tier 1
                Engine->>Mail: Dispatch Notification Message (Tier 1 Alert)
                Mail-->>Engine: 200 OK Delivered
                Engine->>DB: INSERT INTO notifications (tier=1, status='delivered')
            end
        else เข้าเกณฑ์ Tier 2 (เช่น 1 วันก่อน)
            Engine->>DB: Check Unique (user_id, ass_id, 'due_soon', tier=2)
            alt ยังไม่เคยส่ง Tier 2
                Engine->>Mail: Dispatch Notification Message (Tier 2 Alert)
                Engine->>DB: INSERT INTO notifications (tier=2, status='delivered')
            end
        end
    end
```

---

### 14.4 มาตรการความมั่นคงปลอดภัยและสถาปัตยกรรมป้องกันข้อผิดพลาด (Security & Resilience Patterns)

| หมวดหมู่ | รูปแบบและกลไก (Architectural Pattern) | การทำงานในระบบ |
|---|---|---|
| **Token Security** | **AES-256-GCM at Rest** | Access/Refresh Token จาก Google/MS จะไม่ถูกเก็บเป็น Plaintext ใน DB โดยเด็ดขาด |
| **API Resilience** | **Circuit Breaker & Backoff** | เมื่อ Google/Microsoft API เกิด Error 503 หรือ Rate Limit ระบบจะเข้าสู่ Backoff State (1m $\rightarrow$ 5m $\rightarrow$ 15m) และหยุดยิงซ้ำชั่วคราวเพื่อป้องกัน IP ถูกแบน |
| **High Availability** | **Graceful Cache Degradation** | หากการเชื่อมต่อ LMS ล้มเหลว หน้า Dashboard จะเสิร์ฟข้อมูลล่าสุดจาก Redis Cache พร้อมติด Tag *"ข้อมูลอาจไม่อัปเดต"* แทนการแสดงหน้า Error |
| **Idempotency** | **Idempotent Sync Trigger** | ป้องกันการกดปุ่ม Manual Refresh รัวๆ โดยใช้ Redis Rate Limiter (จำกัด 1 ครั้ง/นาที/ผู้ใช้) |
| **Audit & Compliance** | **Immutable Audit Interceptor** | Middleware ดักจับและบันทึกทุกการกระทำสำคัญของ Admin (เปลี่ยนสิทธิ์, Deactivate) ลงตาราง `audit_logs` อัตโนมัติ |




