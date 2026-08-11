# KMAPS — Installation & Setup Guide

คู่มือนี้ใช้สำหรับสมาชิกทีมที่ต้องการ Clone, ติดตั้ง, ตั้งค่า และรันระบบ KMAPS บนเครื่องตัวเอง

---

# 1. Requirements

ติดตั้งโปรแกรมต่อไปนี้ก่อน:

* Git
* Python 3.10+
* pip

สำหรับการพัฒนา OAuth ต้องมี:

* Google Cloud Project และ Google OAuth Client
* Microsoft Azure App Registration

> **ไม่ต้องติดตั้ง PostgreSQL หรือ Redis ในเครื่องสำหรับ Database**
>
> Database ของระบบใช้ **Supabase PostgreSQL** ที่เตรียมไว้แล้ว

---

# 2. Clone Repository

หากเป็นสมาชิกทีม ให้ Fork Repository ก่อน

จากนั้น Clone Fork ของตัวเอง:

```bash
git clone https://github.com/YOUR_USERNAME/MultiPlatform-Assignment-Tracking-and-Notification-System.git
```

เข้าโฟลเดอร์:

```bash
cd MultiPlatform-Assignment-Tracking-and-Notification-System
```

ตรวจสอบ Remote:

```bash
git remote -v
```

---

# 3. Create Virtual Environment

## Windows PowerShell

```powershell
python -m venv .venv
```

Activate:

```powershell
.\.venv\Scripts\Activate.ps1
```

หาก PowerShell ไม่อนุญาตให้รัน Script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

จากนั้น:

```powershell
.\.venv\Scripts\Activate.ps1
```

เมื่อสำเร็จจะเห็น:

```text
(.venv)
```

ด้านหน้า Terminal

---

## Windows CMD

```cmd
python -m venv .venv
.venv\Scripts\activate
```

---

## macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

# 4. Install Dependencies

เข้า Backend:

```bash
cd backend
```

อัปเกรด pip:

```bash
python -m pip install --upgrade pip
```

ติดตั้ง Dependencies:

```bash
pip install -r requirements.txt
```

หากมีการอัปเดต Dependencies ภายหลัง:

```bash
pip install --upgrade -r requirements.txt
```

---

# 5. Create `.env`

ไฟล์ตัวอย่างอยู่ที่:

```text
backend/.env.example
```

## Windows PowerShell

จากโฟลเดอร์ `backend`:

```powershell
Copy-Item .env.example .env
```

## macOS / Linux

```bash
cp .env.example .env
```

---

# 6. Configure Supabase

โปรเจกต์นี้ใช้ **Supabase PostgreSQL เป็น Database กลาง**

สมาชิกทีม **ไม่ต้องติดตั้ง PostgreSQL ในเครื่อง** และไม่ต้องสร้าง Database ใหม่

เปิด:

```text
backend/.env
```

จากนั้นกำหนด:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres?ssl=require
```

โดยใช้ `DATABASE_URL` ของ Supabase ที่ทีมกำหนดให้

ตัวอย่าง:

```env
DATABASE_URL=postgresql+asyncpg://postgres.xxxxxxxxxxxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require
```

### สำคัญ

* ใช้ Database เดียวกับที่ทีมเตรียมไว้
* ไม่ต้องสร้าง PostgreSQL ใหม่
* ไม่ต้องใช้ `docker compose`
* ไม่ต้องใส่ Password จริงลงใน GitHub
* ห้าม Commit `.env`

---

# 7. Configure Redis

ระบบใช้ Redis สำหรับ Cache / Queue

หากโปรเจกต์ของทีมมี Redis Server ที่กำหนดไว้ ให้ใส่ URL ใน:

```env
REDIS_URL=redis://YOUR_REDIS_HOST:6379/0
```

หากทีมมี Redis URL ให้ใช้ค่าที่ทีมกำหนดให้

ตัวอย่าง Local Redis:

```env
REDIS_URL=redis://localhost:6379/0
```

> Redis เป็นคนละส่วนกับ Supabase Database ดังนั้นการใช้ Supabase ไม่ได้หมายความว่า Redis จะถูกสร้างให้อัตโนมัติ

---

# 8. Run Backend

เข้า Backend:

```bash
cd backend
```

รัน FastAPI:

```bash
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

---

# 9. Run Frontend

เปิด Terminal ใหม่

เข้า Root Project:

```powershell
cd MultiPlatform-Assignment-Tracking-and-Notification-System
```

Activate Virtual Environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

เข้า Frontend:

```powershell
cd frontend
```

รัน:

```powershell
python -m http.server 5500
```

เปิด:

```text
http://localhost:5500
```

---

# 10. Run Complete System

ต้องเปิด 2 Terminal

## Terminal 1 — Backend

```powershell
cd MultiPlatform-Assignment-Tracking-and-Notification-System
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

---

## Terminal 2 — Frontend

```powershell
cd MultiPlatform-Assignment-Tracking-and-Notification-System
.\.venv\Scripts\Activate.ps1
cd frontend
python -m http.server 5500
```

Frontend:

```text
http://localhost:5500
```

---

# 11. Complete First-Time Setup — Windows

สำหรับเพื่อนที่ Clone โปรเจกต์มาใหม่ สามารถทำตามนี้:

```powershell
git clone https://github.com/YOUR_USERNAME/MultiPlatform-Assignment-Tracking-and-Notification-System.git

cd MultiPlatform-Assignment-Tracking-and-Notification-System

python -m venv .venv

Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

pip install -r backend\requirements.txt

cd backend

Copy-Item .env.example .env
```

จากนั้น **เปิด `backend/.env` และใส่ `DATABASE_URL` ของ Supabase**

แล้วรัน Backend:

```powershell
python -m uvicorn app.main:app --reload
```

เปิด Terminal ใหม่สำหรับ Frontend:

```powershell
cd MultiPlatform-Assignment-Tracking-and-Notification-System

.\.venv\Scripts\Activate.ps1

cd frontend

python -m http.server 5500
```

เปิด:

```text
Frontend:
http://localhost:5500

Backend:
http://localhost:8000

Swagger:
http://localhost:8000/docs
```

---

# 12. Google Classroom OAuth

สำหรับทดสอบ Google Classroom OAuth ต้องมี Google OAuth Client

Google Cloud Console:

```text
https://console.cloud.google.com/
```

เปิดใช้งาน:

```text
Google Classroom API
```

สร้าง OAuth Client ID แบบ Web Application

Redirect URI:

```text
http://localhost:8000/api/v1/oauth/google_classroom/callback
```

เพิ่มใน:

```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google_classroom/callback
```

รายละเอียดเพิ่มเติม:

👉 [API1_DESIGN.md](API1_DESIGN.md)

---

# 13. Microsoft Teams OAuth

Microsoft Teams Integration ใช้ Microsoft Graph API

เข้า:

```text
https://portal.azure.com/
```

ไปที่:

```text
App registrations
```

สร้าง Application ใหม่

Redirect URI:

```text
http://localhost:8000/api/v1/oauth/microsoft_teams/callback
```

เพิ่มใน:

```env
MICROSOFT_OAUTH_CLIENT_ID=your-client-id
MICROSOFT_OAUTH_CLIENT_SECRET=your-client-secret
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/microsoft_teams/callback
```

รายละเอียดเพิ่มเติม:

👉 [API1_DESIGN.md](API1_DESIGN.md)

---

# 14. OAuth Frontend Redirect

ตรวจสอบ:

```env
FRONTEND_ORIGIN=http://localhost:5500
```

Success:

```env
FRONTEND_ONBOARDING_SUCCESS_PATH=/onboarding/success
```

Error:

```env
FRONTEND_ONBOARDING_ERROR_PATH=/onboarding/error
```

หากเปลี่ยน Port Frontend ต้องแก้:

```env
FRONTEND_ORIGIN=http://localhost:PORT
```

---

# 15. Testing

เข้า Backend:

```bash
cd backend
```

รัน:

```bash
pytest
```

Verbose:

```bash
pytest -v
```

---

# 16. Git Workflow

สร้าง Feature Branch:

```bash
git checkout -b feature/your-feature-name
```

ตัวอย่าง:

```bash
git checkout -b feature/google-classroom-sync
```

ตรวจสอบ:

```bash
git status
```

เพิ่มไฟล์:

```bash
git add .
```

Commit:

```bash
git commit -m "Add Google Classroom sync"
```

Push:

```bash
git push origin feature/google-classroom-sync
```

จากนั้นสร้าง Pull Request ไปยัง Repository หลัก

---

# 17. Update Fork

เพิ่ม Repository หลักเป็น upstream:

```bash
git remote add upstream https://github.com/csongph/MultiPlatform-Assignment-Tracking-and-Notification-System.git
```

ตรวจสอบ:

```bash
git remote -v
```

ดึงข้อมูลล่าสุด:

```bash
git fetch upstream
```

อัปเดต main:

```bash
git checkout main
git merge upstream/main
```

Push กลับไปยัง Fork:

```bash
git push origin main
```

---

# 18. Troubleshooting

## `ModuleNotFoundError`

ตรวจสอบ Virtual Environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

ติดตั้ง Dependencies ใหม่:

```bash
pip install -r backend/requirements.txt
```

---

## Database Connection Error

ตรวจสอบ:

1. `backend/.env` มีอยู่
2. `DATABASE_URL` ถูกต้อง
3. Supabase Database ยังใช้งานได้
4. Password ถูกต้อง
5. URL มี `?ssl=require`

ตัวอย่าง:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres?ssl=require
```

---

## Redis Connection Error

ตรวจสอบ:

```env
REDIS_URL=redis://YOUR_REDIS_HOST:6379/0
```

หากทีมมี Redis Server ให้ใช้ URL ที่ทีมกำหนด

---

## Port 8000 ถูกใช้งาน

ใช้ Port อื่น:

```bash
python -m uvicorn app.main:app --reload --port 8001
```

---

## Port 5500 ถูกใช้งาน

ใช้ Port อื่น:

```bash
python -m http.server 5501
```

และแก้:

```env
FRONTEND_ORIGIN=http://localhost:5501
```

---

# 19. Security

ห้าม Commit:

```text
.env
```

ห้ามเผยแพร่:

* Supabase Database Password
* JWT Secret
* TOKEN_ENCRYPTION_KEY
* Google OAuth Client Secret
* Microsoft OAuth Client Secret
* API Keys
* Access Tokens
* Refresh Tokens

สามารถ Commit ได้:

```text
.env.example
```

ก่อน Commit ให้ตรวจสอบ:

```bash
git status
```

---

# 20. Useful Commands

### Activate Virtual Environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Upgrade Dependencies

```bash
pip install --upgrade -r backend/requirements.txt
```

### Start Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Start Frontend

```bash
cd frontend
python -m http.server 5500
```

### Run Tests

```bash
cd backend
pytest
```

---

# Related Documentation

* [README.md](README.md)
* [API1_DESIGN.md](API1_DESIGN.md)
* [README_ONBOARDING.md](README_ONBOARDING.md)
* [Dashboard Flow](dashboard_flow.md)
* [Project Documentation](PROJECT_DOC/)
* [System Capability Analysis](System_Capability_Analysis_MultiPlatform_Tracking.md)

---

# Repository

https://github.com/csongph/MultiPlatform-Assignment-Tracking-and-Notification-System
