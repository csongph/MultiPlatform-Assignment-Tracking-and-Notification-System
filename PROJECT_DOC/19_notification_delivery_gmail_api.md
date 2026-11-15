# Notification Delivery ผ่าน In-App และ Gmail API

**สถานะ:** Implemented ใน Backend; ต้องตั้งค่า Gmail sender account และรัน Celery worker/beat ก่อนใช้งานจริง

---

## 1. Flow การทำงาน

```text
ผู้ใช้ตั้ง channel และ Notification Rules
  → Celery Beat รันทุก 60 วินาที
  → Scheduler หา assignment ที่ยังไม่ส่งและใกล้ถึงกำหนด
  → สร้าง notifications ตาม lead_time_minutes + sequence_order
  → Database unique constraint กันรอบเดิมซ้ำ
  → Dispatcher อ่านค่าปัจจุบันของเจ้าของงานอีกครั้ง
  → ถ้าปิด due-soon หรือปิด rule แล้ว: status = cancelled และไม่ส่ง
  → ถ้ายังเปิดอยู่: ทำให้ notification พร้อมใน in-app inbox
  → ถ้า channel = email หรือ both: ส่งด้วย Gmail API
  → สำเร็จ: status = delivered; ล้มเหลว: retry_count เพิ่มและจะลองใหม่
```

## 2. API สำหรับ Frontend

### อ่านและแก้ Notification Settings

```http
GET /api/v1/notification-settings
PUT /api/v1/notification-settings
```

ตัวอย่างเปิดทั้ง in-app และ email:

```json
{
  "lead_time_minutes": 60,
  "reminder_intervals": [1440, 60],
  "new_assignment_enabled": true,
  "due_soon_enabled": true,
  "overdue_enabled": true,
  "channel": "both"
}
```

ค่า `channel`:

| ค่า | ผลลัพธ์ |
|---|---|
| `push` | แสดงใน in-app inbox เท่านั้น |
| `email` | ส่ง Gmail API และเก็บใน in-app inbox |
| `both` | ส่ง Gmail API และเก็บใน in-app inbox |

### จัดการช่วงเวลาแจ้งเตือนหลายรอบ

```http
GET    /api/v1/notification-rules
POST   /api/v1/notification-rules
PATCH  /api/v1/notification-rules/{rule_id}
DELETE /api/v1/notification-rules/{rule_id}
```

ตัวอย่าง: แจ้งรอบแรกก่อน 1 วัน และรอบที่สองก่อน 1 ชั่วโมง

```json
POST /api/v1/notification-rules
{
  "type": "due_soon",
  "lead_time_value": 1,
  "lead_time_unit": "day",
  "sequence_order": 1,
  "is_enabled": true
}
```

```json
POST /api/v1/notification-rules
{
  "type": "due_soon",
  "lead_time_value": 1,
  "lead_time_unit": "hour",
  "sequence_order": 2,
  "is_enabled": true
}
```

ผู้ใช้ใหม่จะได้รับ default rule: 1 ชั่วโมง, `sequence_order = 1` โดย UI ควรให้เลือก
`day` หรือ `hour` เป็นหลัก (`minute` มีไว้รองรับข้อมูลเก่าหรือการเตือนละเอียด)

การตั้งค่าเป็นรายผู้ใช้ทั้งหมด: `notification_settings.user_id` และ
`notification_rules.user_id` ผูกกับผู้ใช้โดยตรง ขณะสร้างงาน scheduler จะจับคู่
rule และ settings กับ `courses.user_id` เท่านั้น จึงไม่มีการใช้ rule หรือ channel
ของผู้ใช้อื่นร่วมกัน และ dispatcher จะใช้ค่า channel ล่าสุดของเจ้าของงานก่อนส่งอีเมล

## 3. การป้องกันการส่งซ้ำ

ตาราง `notifications` มี unique constraint:

```text
user_id + assignment_id + type + tier
```

โดย `tier` มาจาก `notification_rules.sequence_order` และ `notification_rule_id` บันทึกว่า rule ใดสร้างข้อความนั้น ดังนั้นงานหนึ่งชิ้นจะส่งรอบที่ 1 และ 2 ได้คนละครั้ง แต่ worker จะสร้างรอบเดิมซ้ำไม่ได้ แม้ Celery Beat ซ้อนกัน

## 4. ตั้งค่า Gmail API ผู้ส่ง

ใช้บัญชี Gmail กลางของ KMAPS เท่านั้น ไม่ใช้ token Google Classroom ของนักศึกษา

ค่า environment ที่ต้องมีใน `backend/.env`:

```dotenv
GMAIL_SENDER_CLIENT_ID=...
GMAIL_SENDER_CLIENT_SECRET=...
GMAIL_SENDER_REFRESH_TOKEN=...
GMAIL_SENDER_FROM_EMAIL=kmaps.sender@gmail.com
GMAIL_SENDER_FROM_NAME=KMAPS Notifications
GMAIL_SENDER_REDIRECT_URI=http://localhost:8085
```

วิธีสร้าง refresh token อยู่ใน [API Permission Request Document](./API%20Permission%20Request%20Document.md) หัวข้อ “ขั้นตอนตั้งค่า Gmail API ผู้ส่ง” และใช้สคริปต์:

```powershell
cd backend
python -m scripts.gmail_sender_oauth authorize
python -m scripts.gmail_sender_oauth exchange "<code>"
```

## 5. Processes ที่ต้องรัน

```powershell
# Terminal 1: FastAPI
uvicorn app.main:app --reload

# Terminal 2: Celery Worker
celery -A worker.celery_app worker --loglevel=info

# Terminal 3: Celery Beat
celery -A worker.celery_app beat --loglevel=info
```

ต้องมี Redis ตามค่า `REDIS_URL` ก่อนเริ่ม worker และ beat

## 6. ข้อจำกัดปัจจุบัน

- รองรับ `due_soon` ก่อน; `new_assignment` และ `overdue` เป็นงานถัดไป
- Email ส่งด้วย Gmail API; ยังไม่มี web push provider ภายนอก
- เมื่อส่ง Gmail ไม่สำเร็จ จะ retry ตาม `NOTIFICATION_MAX_RETRIES` (default 3)
- ก่อน production ต้องเปิด Gmail API และผ่าน Google verification สำหรับ scope `gmail.send`
