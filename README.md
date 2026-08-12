# KMAPS — Multi-Platform Assignment Tracking and Notification System

**Thesis Project**

KMAPS is a web-based system for tracking assignments from multiple learning platforms in one place.

The system is designed to integrate learning platforms such as:

* Google Classroom
* Microsoft Teams

and provide centralized assignment, course, notification, and synchronization management.

---

## 🚀 Getting Started

ต้องการติดตั้งและรันโปรเจกต์?

👉 **[ดูคู่มือการติดตั้งและรันระบบ → SETUP.md](SETUP.md)**

คู่มือ `SETUP.md` ครอบคลุม:

* Clone Repository
* สร้าง Python Virtual Environment
* ติดตั้ง Dependencies
* ตั้งค่า `.env`
* เชื่อมต่อฐานข้อมูล Supabase
* Database Migration
* Seed Database
* รัน Backend
* รัน Frontend
* ตั้งค่า Google OAuth
* ตั้งค่า Microsoft OAuth
* Troubleshooting

> **หมายเหตุ:** โปรเจกต์ใช้ PostgreSQL บน Supabase เป็นฐานข้อมูล ไม่จำเป็นต้องติดตั้ง PostgreSQL Local เพื่อใช้งานตามการตั้งค่าปัจจุบันของโปรเจกต์

---

## ✨ Current Features

### Authentication

* User registration
* User login
* JWT access token
* JWT refresh token
* Current user API

### OAuth

* Google Classroom OAuth
* Microsoft Teams OAuth
* Connected platform management
* OAuth token encryption
* Connect / disconnect platform

### Dashboard

* Dashboard summary
* Course statistics
* Assignment statistics
* Connected platform information

### Courses

* Course API
* Platform filtering
* Course information

### Assignments

* Assignment API
* Assignment status
* Due date
* Course relationship
* Source URL

### Notifications

* Notification settings
* Notification list
* Mark notification as read
* Due-soon notification configuration
* Overdue notification configuration

### Synchronization

* Sync job infrastructure
* Sync logs
* Redis infrastructure
* Celery infrastructure

> Full automatic synchronization from Google Classroom and Microsoft Teams is still under development.

---

# 🛠 Technology Stack

| Component       | Technology              |
| --------------- | ----------------------- |
| Backend         | Python                  |
| API Framework   | FastAPI                 |
| ORM             | SQLAlchemy              |
| Database        | PostgreSQL / Supabase   |
| Migration       | Alembic                 |
| Cache / Queue   | Redis                   |
| Background Jobs | Celery                  |
| Authentication  | JWT                     |
| OAuth           | Google / Microsoft      |
| Frontend        | HTML / CSS / JavaScript |
| API Server      | Uvicorn                 |
| Testing         | Pytest                  |
| Version Control | Git / GitHub            |

---

# 📁 Project Structure

```text
MultiPlatform-Assignment-Tracking-and-Notification-System/
│
├── README.md
├── SETUP.md
├── API1_DESIGN.md
├── README_ONBOARDING.md
├── dashboard_flow.md
├── System_Capability_Analysis_MultiPlatform_Tracking.md
│
├── PROJECT_DOC/
│
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── scripts/
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
│
└── frontend/
    ├── index.html
    ├── css/
    ├── js/
    └── ...
```

---

# 📚 Documentation

เอกสารประกอบโครงการทั้งหมด:

| **เอกสาร**                                                                            | **คำอธิบาย**                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🚀 [SETUP.md](SETUP.md)                                                               | คู่มือการติดตั้ง การตั้งค่า และการรันระบบสำหรับนักพัฒนา                                                                                                        |
| 📡 [API1_DESIGN.md](API1_DESIGN.md)                                                   | เอกสารรายละเอียดโครงสร้าง API Endpoint รูปแบบการเรียกใช้งาน และตัวแปรสภาพแวดล้อมที่ระบบต้องใช้                                                                 |
| 🔐 [README_ONBOARDING.md](README_ONBOARDING.md)                                       | เอกสารขั้นตอนการเชื่อมต่อแพลตฟอร์มภายนอกผ่าน OAuth เช่น Google Classroom และ Microsoft Teams                                                                   |
| 📊 [dashboard_flow.md](dashboard_flow.md)                                             | เอกสารอธิบายลำดับการทำงานของ Dashboard การโหลดข้อมูล การแสดงรายวิชา งาน การแจ้งเตือน และการเชื่อมต่อกับ API                                                    |
| 📁 [PROJECT_DOC](PROJECT_DOC/)                                                        | เอกสารประกอบโครงงาน เช่น การวิเคราะห์ ออกแบบระบบ Requirements และเอกสารทางเทคนิคต่าง ๆ                                                                         |
| 📋 [System Capability Analysis](System_Capability_Analysis_MultiPlatform_Tracking.md) | เอกสารวิเคราะห์ความสามารถของระบบ ครอบคลุมขอบเขตการทำงาน ความต้องการของระบบ User Flow ฟีเจอร์ การแจ้งเตือน ความปลอดภัย การทดสอบ ความเสี่ยง และแนวทางพัฒนาต่อยอด |

---

# 🔗 Quick Links

### Development

* 🚀 **[Installation & Setup](SETUP.md)**
* 📡 **[API Design](API1_DESIGN.md)**
* 🔐 **[OAuth Onboarding](README_ONBOARDING.md)**

### Project Documentation

* 📊 **[Dashboard Flow](dashboard_flow.md)**
* 📁 **[Project Documentation](PROJECT_DOC/)**
* 📋 **[System Capability Analysis](System_Capability_Analysis_MultiPlatform_Tracking.md)**

---

# 📌 Development Status

## Completed

* [x] User registration
* [x] User login
* [x] JWT authentication
* [x] Refresh token
* [x] Google Classroom OAuth onboarding
* [x] Microsoft Teams OAuth onboarding
* [x] OAuth connection management
* [x] OAuth token encryption
* [x] Dashboard API
* [x] Course API
* [x] Assignment API
* [x] Notification settings
* [x] Notification API
* [x] Sync job infrastructure
* [x] PostgreSQL / Supabase integration
* [x] Alembic migrations
* [x] Redis infrastructure
* [x] Celery infrastructure
* [x] API documentation

## In Progress

* [ ] Google Classroom synchronization
* [ ] Microsoft Teams synchronization
* [ ] Automatic course synchronization
* [ ] Automatic assignment synchronization
* [ ] Background synchronization
* [ ] Automatic OAuth token refresh
* [ ] Complete notification delivery
* [ ] Production deployment
* [ ] Production OAuth configuration
* [ ] Full frontend integration

---

# 👥 Team Development

สมาชิกในทีมควรสร้าง Feature Branch แยกจาก `main`

ตัวอย่าง:

```bash
git checkout -b feature/google-classroom-sync
```

หลังพัฒนาเสร็จ:

```bash
git add .
git commit -m "Add Google Classroom sync"
git push origin feature/google-classroom-sync
```

จากนั้นสร้าง Pull Request กลับมายัง Repository หลัก

### อัปเดตโค้ดจาก Repository หลัก

หากทำงานผ่าน Fork ให้เพิ่ม Repository หลักเป็น `upstream`:

```bash
git remote add upstream https://github.com/csongph/MultiPlatform-Assignment-Tracking-and-Notification-System.git
```

ตรวจสอบ:

```bash
git remote -v
```

ดึงการเปลี่ยนแปลงล่าสุด:

```bash
git fetch upstream
```

อัปเดต `main`:

```bash
git checkout main
git merge upstream/main
```

---

# 🔐 Security

**ห้าม Commit ไฟล์ `.env` ขึ้น GitHub**

ไฟล์ที่ควร Commit:

```text
.env.example
```

ไฟล์ที่ไม่ควร Commit:

```text
.env
```

ห้ามเผยแพร่:

* Database Password
* JWT Secret
* Token Encryption Key
* OAuth Client Secret
* API Keys
* Access Tokens
* Refresh Tokens

หาก Secret ถูก Commit ขึ้น GitHub โดยไม่ตั้งใจ ควรเปลี่ยนหรือ Revoke Secret นั้นทันที

---

# 🗄️ Database

โปรเจกต์ใช้:

```text
PostgreSQL
```

โดย Development Database ของทีมใช้:

```text
Supabase PostgreSQL
```

สมาชิกทีมไม่จำเป็นต้องสร้าง PostgreSQL Database ใหม่สำหรับโปรเจกต์

ให้สร้างไฟล์:

```text
backend/.env
```

จาก:

```text
backend/.env.example
```

แล้วกำหนด:

```env
DATABASE_URL=your-supabase-database-url
```

> ห้ามนำ `DATABASE_URL` ที่มีรหัสผ่านจริงขึ้น GitHub

---

# 📦 Dependencies

Backend Dependencies อยู่ที่:

```text
backend/requirements.txt
```

ติดตั้งด้วย:

```bash
pip install -r requirements.txt
```

หากมีการเพิ่ม Library ใหม่ ต้องอัปเดต `requirements.txt` ก่อน Commit:

```bash
pip freeze > requirements.txt
```

หรือเพิ่มเฉพาะ Package ที่โปรเจกต์ใช้งานจริงตามรูปแบบของทีม

---

# 🧪 Testing

รัน Test จากโฟลเดอร์ `backend`:

```bash
pytest
```

หรือ:

```bash
pytest -v
```

ระบบควรมีการทดสอบอย่างน้อย:

* Authentication
* OAuth
* Course API
* Assignment API
* Notification API
* Sync
* Database
* Error Handling

---

# 📡 API Documentation

เมื่อ Backend ทำงานแล้ว สามารถเปิด Swagger UI ได้ที่:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

รายละเอียด API:

👉 **[API1_DESIGN.md](API1_DESIGN.md)**

---

# 🔐 OAuth Onboarding

ระบบรองรับการเชื่อมต่อ:

* Google Classroom
* Microsoft Teams

รายละเอียดการตั้งค่า OAuth:

👉 **[README_ONBOARDING.md](README_ONBOARDING.md)**

OAuth Flow:

```text
User
  │
  ▼
KMAPS Frontend
  │
  ▼
KMAPS Backend
  │
  ▼
OAuth Provider
  │
  ▼
Authorization
  │
  ▼
Callback
  │
  ▼
Token Exchange
  │
  ▼
Token Encryption
  │
  ▼
Database
```

---

# 📊 Dashboard Flow

รายละเอียดการทำงานของ Dashboard:

👉 **[dashboard_flow.md](dashboard_flow.md)**

Flow หลัก:

```text
Login
  ↓
Dashboard
  ↓
Load Summary
  ↓
Courses / Assignments / Notifications
  ↓
Display Dashboard
```

---

# 📖 System Documentation

เอกสารวิเคราะห์ระบบฉบับเต็ม:

👉 **[System Capability Analysis](System_Capability_Analysis_MultiPlatform_Tracking.md)**

ครอบคลุม:

* System Overview
* Functional Requirements
* Non-Functional Requirements
* User Stories
* User Flow
* Feature Matrix
* Database Design
* API Design
* Security
* Notification Flow
* Background Jobs
* Monitoring
* Error Handling
* Test Cases
* Future Features
* Risk Analysis

---

# 🚧 Future Development

แนวทางพัฒนาระบบในอนาคต:

* Moodle Integration
* Canvas LMS Integration
* LINE OA Notification
* AI Assignment Prioritization
* Learning Analytics
* Real-time Webhook
* Mobile Application
* Data Export
* Advanced Notification System

---

# 📦 Repository

GitHub:

https://github.com/csongph/MultiPlatform-Assignment-Tracking-and-Notification-System

---

# 🎓 Thesis Project

**KMAPS — Multi-Platform Assignment Tracking and Notification System**

A thesis project for integrating assignment information from multiple learning platforms into a centralized system.

---
