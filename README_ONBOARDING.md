# Onboarding / OAuth — สรุปการติดตั้งและใช้งาน

## 1. วางไฟล์
คัดลอกทุกไฟล์ในโฟลเดอร์นี้ (ยกเว้นไฟล์ `.md`/`.txt` นี้) ไปทับ/เพิ่มในโปรเจกต์จริง
โดยคง path เดิมไว้ เช่น `app/core/security.py` ไปวางที่
`D:\PROJECT_KMAPS\...\backend\app\core\security.py`

ไฟล์ `app/core/config.py` เป็นการ "แทนที่ทั้งไฟล์" (เพิ่ม field ใหม่ แต่ field เดิมยังอยู่ครบ)

## 2. ติดตั้ง package เพิ่ม
```powershell
(venv) PS D:\...\backend> pip install httpx cryptography PyJWT "passlib[bcrypt]" email-validator
```
(รายละเอียดอยู่ใน `requirements-additions.txt` — เพิ่มเข้า requirements.txt เดิมด้วย)

## 3. เพิ่มค่าใน .env
```env
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google_classroom/callback

MICROSOFT_OAUTH_CLIENT_ID=your-microsoft-client-id
MICROSOFT_OAUTH_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/microsoft_teams/callback

FRONTEND_ORIGIN=http://localhost:5173
```
(redirect URI ต้องตรงกับที่ลงทะเบียนไว้ใน Google Cloud Console / Azure App Registration เป๊ะๆ)

## 4. Seed ตาราง platforms
ตาราง `oauth_connections.platform_id` เป็น foreign key ไปยัง `platforms` — ต้องมี row
`google_classroom` และ `microsoft_teams` อยู่ก่อน ไม่งั้น callback จะ error

```powershell
(venv) PS D:\...\backend> python -m scripts.seed_platforms
```

## 5. รัน server
```powershell
(venv) PS D:\...\backend> uvicorn app.main:app --reload
```
เปิด http://localhost:8000/docs จะเห็น endpoint ทั้งหมด

## 6. Flow การใช้งานจริง (สำหรับ frontend)

**สมัคร/login ก่อน (ต้องมี JWT):**
- `POST /api/v1/auth/register` → `{email, password, display_name}`
- `POST /api/v1/auth/login` → คืน `{access_token, refresh_token}`

**เริ่ม onboarding เชื่อมต่อ platform:**
1. Frontend เรียก `GET /api/v1/oauth/google_classroom/authorize`
   (ใส่ header `Authorization: Bearer <access_token>`)
   → ได้ `{authorization_url: "..."}`
2. Frontend สั่ง `window.location.href = authorization_url`
   (พาผู้ใช้ไปหน้ายินยอมของ Google)
3. ผู้ใช้กด "อนุญาต" → Google/Microsoft redirect กลับมาที่
   `GET /api/v1/oauth/google_classroom/callback?code=...&state=...` เอง (backend รับ, ไม่ใช่ frontend)
4. Backend แลก code เป็น token, เข้ารหัส, บันทึกลง `oauth_connections`
   แล้ว redirect ผู้ใช้ต่อไปที่ `FRONTEND_ORIGIN + /onboarding/success?platform=google_classroom`
   (หรือ `/onboarding/error?platform=...` ถ้าล้มเหลว)

**เดียวกันสำหรับ Microsoft Teams:** ใช้ path `/api/v1/oauth/microsoft_teams/authorize` แทน

**ดูรายการที่เชื่อมต่อแล้ว:**
- `GET /api/v1/oauth/connections`

**ยกเลิกการเชื่อมต่อ:**
- `DELETE /api/v1/oauth/{platform}`

## 7. ต้องไปสมัคร OAuth app กับผู้ให้บริการเองก่อน
- **Google:** https://console.cloud.google.com/ → สร้าง OAuth 2.0 Client ID (Web application)
  เปิดใช้ Google Classroom API ด้วย ใส่ redirect URI ให้ตรงกับ `.env`
- **Microsoft:** https://portal.azure.com/ → Azure Active Directory → App registrations
  → New registration → เพิ่ม redirect URI แบบ Web, ใส่ API permissions ตาม scope ที่ใช้ใน
  `app/integrations/microsoft_teams_adapter.py`

## หมายเหตุสำคัญ
- ระบบนี้**ยังไม่ได้ sync ข้อมูล courses/assignments จริง** จาก Google Classroom / MS Teams API
  — ที่ทำไว้คือขั้นตอน "เชื่อมต่อบัญชี" (onboarding) เท่านั้น ได้ access_token/refresh_token
  เก็บไว้ในฐานข้อมูลแบบเข้ารหัสแล้ว ขั้นต่อไปคือเขียน service ที่ใช้ token นี้ไปเรียก
  Google Classroom API / Microsoft Graph API เพื่อดึงรายวิชาและงานจริง (ยังไม่ได้ทำในรอบนี้)
- Token ที่เก็บใน `oauth_connections.access_token_enc` / `refresh_token_enc` เข้ารหัสด้วย
  Fernet โดยอิง `TOKEN_ENCRYPTION_KEY` จาก `.env` — **ถ้าเปลี่ยนค่านี้ภายหลัง token เก่าที่เข้ารหัส
  ไว้แล้วจะถอดรหัสไม่ได้อีก** ต้องให้ผู้ใช้เชื่อมต่อใหม่
