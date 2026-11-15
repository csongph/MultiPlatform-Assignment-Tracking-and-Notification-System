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

### เริ่มระบบทั้งหมดด้วยสคริปต์ (Windows PowerShell)

หลังตั้งค่า `backend\.env`, ติดตั้ง dependencies และเปิด Redis แล้ว รันคำสั่งนี้จากโฟลเดอร์โปรเจกต์ สคริปต์จะรัน migration, API, Celery worker, Celery Beat และ frontend จากนั้นเปิดหน้าเข้าสู่ระบบในเบราว์เซอร์ให้อัตโนมัติ:

```powershell
.\backend\start-backend.ps1
```

เมื่อ API, Celery worker และ Celery Beat ทำงาน ระบบจะตรวจ token ของ Google Classroom และ Microsoft Teams ทุก 5 นาที และต่ออายุล่วงหน้า 15 นาทีอัตโนมัติ หากผู้ให้บริการเพิกถอน refresh token หรือบังคับให้ยืนยันตัวตนใหม่ ต้องเชื่อมต่อแพลตฟอร์มอีกครั้ง

เมื่อใช้ Redis ใน WSL สคริปต์จะเปิดตัวช่วยแบบซ่อนเพื่อคง WSL distro ไว้ระหว่างรันระบบ ป้องกัน Redis หยุดเมื่อ WSL ว่าง หากต้องการปิด WSL/Redis หลังหยุดระบบ ให้รัน `wsl --shutdown`

### หรือเริ่มแยกด้วยตนเอง

วิธีนี้ต้องเปิดหลาย Terminal

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

ใน Google Cloud Console ของโปรเจกต์เดียวกับ `GOOGLE_OAUTH_CLIENT_ID` ให้เปิดใช้ **Google Classroom API** แล้วไปที่ **Google Auth Platform → Data Access → Add or Remove Scopes** วาง scope นี้ในช่อง **Manually add scopes** แล้วกด **Add to Table → Update → Save**:

```text
https://www.googleapis.com/auth/classroom.announcements.readonly
```

ถ้า scope ไม่อยู่ในรายการที่แสดง ให้เพิ่มด้วยช่อง **Manually add scopes** ตามขั้นตอนข้างต้น โค้ดร้องขอ scope นี้แล้ว แต่บัญชีที่เชื่อมไว้ก่อนเพิ่ม scope ต้องเชื่อม Google Classroom ใหม่และกดยอมรับสิทธิ์ จึงจะอ่านประกาศได้

## ทดสอบ Classroom webhook โดยยังไม่ตั้งค่า Google Cloud

ตั้ง `APP_ENV=development` ใน backend แล้วเรียก `POST /api/v1/webhooks/google-classroom` จากเครื่องเดียวกันได้โดยไม่ต้องมี Pub/Sub topic หรือ OIDC service account หากเรียกผ่านเครื่องอื่นหรือ Docker ให้ตั้ง `GOOGLE_CLASSROOM_WEBHOOK_SECRET` เป็น secret สุ่มยาว แล้วส่งค่าใน header `X-KMAPS-Webhook-Secret` ตัวอย่าง body แบบตรง:

```json
{
  "eventId": "local-demo-001",
  "courseId": "<course-id-that-is-already-synced>",
  "collection": "courses.courseWork"
}
```

ระบบจะตอบ `202` และเข้าคิวซิงก์ connection ที่มี course นี้อยู่แล้ว ถ้าไม่มี course/บัญชี Google ที่เชื่อมไว้ จะรับ event แต่ไม่มีงานซิงก์เข้าคิว โหมด local นี้ทดสอบการรับและจัดคิว event ได้ แต่การดึงรายละเอียดจริงยังต้องมี Google Classroom OAuth connection และสิทธิ์ API

## ตั้งค่า Classroom event push สำหรับ Google Cloud

ต้องมี API backend ที่เข้าถึงได้จากอินเทอร์เน็ตผ่าน HTTPS และเปิดใช้ Cloud Pub/Sub ใน Google Cloud project เดียวกับ Classroom API:

1. สร้าง Pub/Sub topic แล้วให้ `classroom-notifications@system.gserviceaccount.com` มีสิทธิ์ `Pub/Sub Publisher` บน topic
2. สร้าง push subscription ของ topic ชี้ไปที่ `https://<api-host>/api/v1/webhooks/google-classroom`
3. เปิด authenticated push แบบ OIDC แล้วตั้ง service account และ audience ให้ตรงกับ `GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT` และ `GOOGLE_PUBSUB_PUSH_AUDIENCE`; ให้ Pub/Sub service agent (`service-<PROJECT_NUMBER>@gcp-sa-pubsub.iam.gserviceaccount.com`) มี role `roles/iam.serviceAccountTokenCreator` บน push service account
4. ตั้งค่า `GOOGLE_CLASSROOM_PUBSUB_TOPIC`, `GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT` และ `GOOGLE_PUBSUB_PUSH_AUDIENCE` ใน backend
5. ให้ผู้ใช้เชื่อม Google Classroom ใหม่และอนุมัติ scope เพิ่มสำหรับ push notifications

งาน Google Classroom จะเข้าคิวซิงก์ทันทีเมื่อได้รับ Pub/Sub event และระบบจะต่ออายุ feed registration ทุก 6 วัน ส่วน Microsoft Teams ให้ตั้ง event bridge ที่ตรวจจับเหตุการณ์งานแล้วเรียก `POST https://<api-host>/api/v1/webhooks/microsoft-teams` พร้อม header `X-Kmaps-Webhook-Secret` และ JSON เช่น `{"eventId":"unique-id","connectionId":"<oauth-connection-uuid>"}` ตั้งค่า secret เดียวกันใน `MICROSOFT_TEAMS_WEBHOOK_SECRET` ระบบจะเข้าคิวซิงก์ connection นั้นทันทีและปิด Teams periodic fallback แล้ว

ข้อจำกัด: Microsoft Graph ยังไม่มี change notification สำหรับ Education assignments/submissions โดยตรง จึงต้องมี event bridge ภายนอกเป็นผู้ส่ง event มายัง endpoint นี้ การเพิ่ม endpoint ไม่ได้สร้าง native Graph subscription ให้โดยอัตโนมัติ

## สาธิตข้อมูลงาน Microsoft Teams จาก JSON

ในเครื่องพัฒนา เปิด `APP_ENV=development` และ `MICROSOFT_TEAMS_USE_MOCK_DATA=true` ใน `backend/.env` แล้ว restart backend จากนั้นสั่ง Sync Microsoft Teams ในหน้าเว็บได้เลย ระบบจะสร้าง demo connection ให้ผู้ใช้โดยอัตโนมัติและนำ fixture จาก `backend/app/integrations/mock_data/microsoft_teams.json` เข้า DB โดยตรง ไม่ต้องพึ่ง Redis/Celery หรือเชื่อม Microsoft OAuth

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

OAuth ใช้ Redis เก็บ nonce เพื่อป้องกันการนำ callback มาใช้ซ้ำ ถ้า Redis ไม่พร้อม จะเชื่อมบัญชีใหม่ไม่สำเร็จ ให้ตรวจสอบค่าและสถานะ service:

```env
REDIS_URL=redis://YOUR_REDIS_HOST:6379/0
```

หากทีมมี Redis Server ให้ใช้ URL ที่ทีมกำหนด

สำหรับ Redis ใน WSL ให้เปิด WSL แล้วรัน `sudo service redis-server start` เมื่อเห็น `Password:` ให้ใส่รหัสผ่านของผู้ใช้ Linux ใน WSL (ตัวอักษรจะไม่แสดงขณะพิมพ์) จากนั้นตรวจว่าพอร์ตตาม `REDIS_URL` เปิดรับการเชื่อมต่อ แล้วลองเชื่อมแพลตฟอร์มใหม่ สคริปต์ `backend\start-backend.ps1` จะตรวจ Redis ก่อนเปิด API อยู่แล้ว หากหน้าเว็บยังเปิดได้แต่ OAuth แจ้ง Redis แปลว่า Redis อาจหยุดหลังจากเริ่ม API หรือ backend ที่กำลังทำงานถูกเปิดด้วยวิธีอื่น

การทดสอบ `Test-NetConnection` ตรวจได้เพียง TCP เท่านั้น ให้ยืนยันว่า Redis ตอบคำสั่งจริงด้วย `wsl -e sh -lc "redis-cli -h 127.0.0.1 -p 6379 ping"` ซึ่งควรตอบ `PONG` สคริปต์เริ่มระบบจะตรวจ `PING` ด้วยค่า `REDIS_URL` ที่ backend โหลดจริงโดยใช้ `backend/scripts/check_redis.py` หากตรวจไม่ผ่านจะหยุดก่อนเปิด API และแสดงสาเหตุ เช่น URL/รหัสผ่านไม่ตรงหรือปลายทางไม่ใช่ Redis

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
