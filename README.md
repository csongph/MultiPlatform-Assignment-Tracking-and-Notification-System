# MultiPlatform-Assignment-Tracking-and-Notification-System
Thesis ProJect

## คำสั่งรันระบบ
# รันอันนี้ก่อน
# วิธีตั้งค่า Database (Supabase) สำหรับรันโปรเจกต์ KMAPS

## 1. Copy ไฟล์ .env.example เป็น .env

```bash
cp .env.example .env
```

## 2. แก้รหัสผ่านใน .env

เปิดไฟล์ `.env` แล้วหาบรรทัด `DATABASE_URL` จะเห็นแบบนี้:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.tecthxhgyxsvlpjijenk:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require
```

ให้แทนที่ `[YOUR-PASSWORD]` ด้วยรหัสผ่าน database จริงที่ได้รับมา (จากเพื่อนในทีม อย่าคอมมิตขึ้น GitHub) เช่น:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.tecthxhgyxsvlpjijenk:xxxxxxxx@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require
```

### หรือใช้คำสั่งเดียวจบ (ไม่ต้องเปิดไฟล์เอง)

**Mac:**
```bash
cp .env.example .env && sed -i '' 's/\[YOUR-PASSWORD\]/ใส่รหัสจริงตรงนี้/' .env
```

**Linux:**
```bash
cp .env.example .env && sed -i 's/\[YOUR-PASSWORD\]/ใส่รหัสจริงตรงนี้/' .env
```

## 3. ติดตั้ง dependencies แล้วรันโปรเจกต์

```bash
pip install -r requirements.txt
```

จากนั้นรันโปรเจกต์ตามปกติ — ไม่ต้องติดตั้งหรือตั้งค่า Postgres local เอง เพราะทุกคนต่อฐานข้อมูลเดียวกันบน Supabase

## ⚠️ ข้อควรระวัง

- **ห้าม commit ไฟล์ `.env` ขึ้น GitHub เด็ดขาด** (ต้องอยู่ใน `.gitignore` แล้ว)
- รหัสผ่านที่ได้รับมาคือรหัส database ทั้งโปรเจกต์ ห้ามแชร์ต่อในกลุ่มสาธารณะ
- ถ้าเชื่อมต่อไม่ได้ ให้เช็คว่า copy รหัสผ่านมาครบ ไม่มีช่องว่างเกิน และ URL ยังมี `?ssl=require` ต่อท้ายอยู่

# frontend
1. d:\PROJECT_KMAPS\MultiPlatform-Assignment-Tracking-and-Notification-System\.venv\Scripts\activate
2. cd MultiPlatform-Assignment-Tracking-and-Notification-System\frontend
3. python -m http.server 5500

# Backend
1. (Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& d:\PROJECT_KMAPS\MultiPlatform-Assignment-Tracking-and-Notification-System\.venv\Scripts\Activate.ps1)
2. cd MultiPlatform-Assignment-Tracking-and-Notification-System\backend
3. python -m  uvicorn app.main:app --reload


