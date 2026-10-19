# KMAPS Frontend Setup & Integration Guide

## การเชื่อมต่อกับ Backend (OAuth & API)

เพื่อให้การทำงานร่วมกับ backend สมบูรณ์ ต้องตรวจสอบการตั้งค่าในไฟล์ `.env` ของ `backend/`:

```env
FRONTEND_ORIGIN=http://localhost:5500
FRONTEND_ONBOARDING_SUCCESS_PATH=/pages/onboarding.html
FRONTEND_ONBOARDING_ERROR_PATH=/pages/onboarding.html
```

> **ข้อสำคัญ**:
> 1. `FRONTEND_ORIGIN` ต้องระบุพอร์ตที่ใช้เสิร์ฟ frontend จริง (เช่น พอร์ต 5500 หากรันด้วย `python -m http.server 5500` หรือ 5173 หากรันผ่าน Vite)
> 2. `FRONTEND_ONBOARDING_SUCCESS_PATH` และ `FRONTEND_ONBOARDING_ERROR_PATH` ควรกำหนดเป็น `/pages/onboarding.html` เพื่อให้หลัง OAuth เสร็จสิ้น เบราว์เซอร์จะถูก redirect กลับมาที่หน้า Onboarding พร้อม query parameters (`oauth_success`, `synced`, หรือ `oauth_error`) เพื่อแสดงข้อความแจ้งเตือน (Toast) ให้ผู้ใช้เห็นทันที
