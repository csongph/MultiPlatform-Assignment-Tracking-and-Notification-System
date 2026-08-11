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
* ตั้งค่า PostgreSQL
* ตั้งค่า Redis
* Database Migration
* Seed Database
* รัน Backend
* รัน Frontend
* ตั้งค่า Google OAuth
* ตั้งค่า Microsoft OAuth
* Troubleshooting

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
| Database        | PostgreSQL              |
| Migration       | Alembic                 |
| Cache / Queue   | Redis                   |
| Background Jobs | Celery                  |
| Authentication  | JWT                     |
| OAuth           | Google / Microsoft      |
| Frontend        | HTML / CSS / JavaScript |
| API Server      | Uvicorn                 |
| Testing         | Pytest                  |
| Container       | Docker / Docker Compose |

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
│   ├── docker-compose.yml
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

| Document                                                                              | Description                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 🚀 [SETUP.md](SETUP.md)                                                               | Installation, configuration and running the system |
| 📡 [API1_DESIGN.md](API1_DESIGN.md)                                                   | API specification and environment variables        |
| 🔐 [README_ONBOARDING.md](README_ONBOARDING.md)                                       | OAuth onboarding documentation                     |
| 📊 [dashboard_flow.md](dashboard_flow.md)                                             | Dashboard flow                                     |
| 📁 [PROJECT_DOC](PROJECT_DOC/)                                                        | Project documentation                              |
| 📋 [System Capability Analysis](System_Capability_Analysis_MultiPlatform_Tracking.md) | System capability analysis                         |

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
* [x] PostgreSQL integration
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

---

# 📦 Repository

GitHub:

https://github.com/csongph/MultiPlatform-Assignment-Tracking-and-Notification-System

---

# 🎓 Thesis Project

**KMAPS — Multi-Platform Assignment Tracking and Notification System**

A thesis project for integrating assignment information from multiple learning platforms into a centralized system.
