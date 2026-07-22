้# เทคโนโลยีที่ใช้ในการพัฒนาระบบ (Technology Stack)

## Frontend

* HTML5
* CSS3
* Tailwind CSS
* JavaScript (ES6+)

**แนวทางการพัฒนา**

* พัฒนาในรูปแบบ **Component-Based Architecture**
* แยกส่วนประกอบของหน้าจอ (UI Components) เพื่อให้สามารถนำกลับมาใช้ซ้ำ (Reusable Components)
* แยก HTML, CSS และ JavaScript ออกเป็นโมดูลตามหน้าที่
* รองรับ Responsive Web Design

---

## Backend

* Python
* FastAPI
* SQLAlchemy (ORM)
* Alembic (Database Migration)
* RESTful API
* JSON
* HTTP Client (HTTPX / Requests)

**แนวทางการพัฒนา**

* พัฒนาในรูปแบบ **Component-Based Architecture**
* แยก Business Logic ออกจาก API Layer
* แยก Service, Repository (ORM), Utility และ API Router ออกจากกัน
* ออกแบบ API ตามหลัก RESTful API
* รองรับการเชื่อมต่อกับบริการภายนอก (External APIs)

---

## Database

### Development Environment

* PostgreSQL (Local Database)

### Production Environment

* Supabase PostgreSQL (Cloud Database)

**แนวทางการออกแบบฐานข้อมูล**

* Relational Database Design
* Modular Data Design
* รองรับการขยายโครงสร้างข้อมูลในอนาคต
* เชื่อมต่อฐานข้อมูลผ่าน **SQLAlchemy (ORM)**
* จัดการโครงสร้างฐานข้อมูลด้วย **Alembic Migration**

---

## แนวคิดในการพัฒนาระบบ

* Component-Based Architecture
* Modular Design
* Reusable Components
* Separation of Concerns (SoC)
* RESTful API Architecture
* Responsive Web Design
* Scalable System Design
* Maintainable Code Structure
