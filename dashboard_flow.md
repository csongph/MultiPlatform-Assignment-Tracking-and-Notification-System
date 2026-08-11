# KMAPS Dashboard Flow

## Overview

The KMAPS Dashboard provides a centralized view of assignments and learning-platform information.

The dashboard is designed to allow students to quickly see:

* Connected learning platforms
* Total courses
* Total assignments
* Upcoming assignments
* Overdue assignments
* Assignment status
* Notifications

---

# Dashboard Architecture

```text
                    ┌─────────────────┐
                    │     Student     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Frontend     │
                    │    Dashboard    │
                    └────────┬────────┘
                             │
                             │ REST API
                             ▼
                    ┌─────────────────┐
                    │     FastAPI     │
                    │    Backend      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Courses  │   │Assignments│   │Notifications│
        └──────────┘   └──────────┘   └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌─────────────────┐
                    │    Supabase     │
                    │   PostgreSQL    │
                    └─────────────────┘
```

---

# 1. Login Flow

```text
User
 ↓
Login Page
 ↓
Email + Password
 ↓
POST /api/v1/auth/login
 ↓
Backend
 ↓
Validate User
 ↓
Generate JWT
 ↓
Frontend receives token
 ↓
Dashboard
```

---

# 2. Dashboard Loading

When the user opens the dashboard:

```text
Dashboard
    ↓
Check Authentication
    ↓
Access Token
    ↓
Request Dashboard Summary
    ↓
GET /api/v1/dashboard/summary
    ↓
Backend
    ↓
Database
    ↓
Return Summary
    ↓
Render Dashboard
```

---

# 3. Dashboard Summary

The dashboard can display:

```text
┌─────────────────────────────────────┐
│              Dashboard              │
├────────────┬────────────┬───────────┤
│  Courses   │ Assignments│  Overdue  │
│     8      │     24     │     3     │
├────────────┴────────────┴───────────┤
│         Upcoming Assignments         │
│                                     │
│ Programming       Due Tomorrow      │
│ Database           Due Friday       │
│ Web Development    Due Monday       │
├─────────────────────────────────────┤
│          Notifications              │
│                                     │
│ Assignment due tomorrow             │
│ Assignment is overdue               │
└─────────────────────────────────────┘
```

---

# 4. Connected Platforms

The dashboard can show connected platforms:

```text
Google Classroom    Connected
Microsoft Teams     Connected
```

Possible actions:

```text
Connect
Disconnect
Sync
```

---

# 5. Assignment Flow

Assignments originate from connected learning platforms.

```text
Google Classroom
       │
       ▼
Synchronization
       │
       ▼
KMAPS Database
       │
       ▼
Assignment API
       │
       ▼
Dashboard
```

Microsoft Teams follows the same architecture:

```text
Microsoft Teams
       │
       ▼
Synchronization
       │
       ▼
KMAPS Database
       │
       ▼
Assignment API
       │
       ▼
Dashboard
```

---

# 6. Assignment Status

An assignment can have statuses such as:

```text
pending
submitted
completed
overdue
```

The frontend can use the status to determine how an assignment should be displayed.

Example:

```text
Pending
→ Normal assignment

Due Soon
→ Highlight assignment

Overdue
→ Show warning

Completed
→ Show completed state
```

---

# 7. Due Date

Assignments contain a due date.

The dashboard can categorize assignments:

```text
Overdue
Today
Tomorrow
This Week
Later
```

Example:

```text
Today
├── Database Assignment
└── Programming Quiz

Tomorrow
└── Web Development Project

Next Week
└── Software Engineering Report
```

---

# 8. Notification Flow

```text
Assignment
      │
      ▼
Check Due Date
      │
      ▼
Notification Rules
      │
      ├──── Due Soon ────► Notification
      │
      └──── Overdue ─────► Notification
                              │
                              ▼
                         Notification API
                              │
                              ▼
                           Frontend
```

---

# 9. Notification Settings

Users can configure:

```text
Due Soon Notifications
        ON / OFF

Overdue Notifications
        ON / OFF
```

API:

```http
GET /api/v1/notification-settings
```

Update:

```http
PUT /api/v1/notification-settings
```

---

# 10. Synchronization Flow

The synchronization architecture is:

```text
Scheduler
   │
   ▼
Sync Job
   │
   ▼
Connected Platforms
   │
   ├───────────────┐
   ▼               ▼
Google          Microsoft
Classroom       Teams
   │               │
   └───────┬───────┘
           ▼
      Normalize Data
           │
           ▼
       PostgreSQL
           │
           ▼
      Dashboard/API
```

---

# 11. Sync Job Status

A synchronization job can have:

```text
pending
running
completed
failed
```

Example:

```text
POST /api/v1/sync
```

returns a Job ID.

The frontend can then check:

```text
GET /api/v1/sync/{job_id}
```

---

# 12. Dashboard Data Flow

```text
                    Dashboard
                        │
                        ▼
              GET /dashboard/summary
                        │
                        ▼
                     FastAPI
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       Courses      Assignments   Notifications
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                    PostgreSQL
                        │
                        ▼
                  Summary Response
                        │
                        ▼
                    Dashboard
```

---

# 13. Frontend Navigation

Recommended navigation:

```text
Dashboard
│
├── Assignments
│
├── Courses
│
├── Notifications
│
├── Connected Platforms
│
└── Settings
```

---

# 14. Connected Platform Flow

```text
Connected Platforms
        │
        ├── Google Classroom
        │       │
        │       ├── Connected
        │       └── Disconnect
        │
        └── Microsoft Teams
                │
                ├── Connected
                └── Disconnect
```

If a platform is not connected:

```text
Connect Google Classroom
Connect Microsoft Teams
```

---

# 15. Error Handling

If the API returns an authentication error:

```text
401 Unauthorized
```

the frontend should:

```text
Clear expired authentication
        ↓
Request login
        ↓
Redirect to Login
```

For server errors:

```text
500 Internal Server Error
```

the frontend should show an appropriate error message and allow the user to retry.

---

# 16. Dashboard Loading State

While loading:

```text
Loading dashboard...
```

The frontend should avoid displaying incorrect empty data while the API request is still running.

---

# 17. Empty State

If there are no connected platforms:

```text
No learning platforms connected.

Connect Google Classroom or Microsoft Teams
to start tracking assignments.
```

If there are no assignments:

```text
No assignments found.
```

---

# 18. Current Development Status

## Completed

* Dashboard API structure
* Course API
* Assignment API
* Notification API
* Authentication
* OAuth onboarding
* Connected platform management
* Database integration

## In Progress

* Automatic platform synchronization
* Background sync jobs
* Assignment synchronization
* Notification delivery
* Complete frontend dashboard integration

---

# 19. Related Documentation

* [README.md](README.md)
* [SETUP.md](SETUP.md)
* [API1_DESIGN.md](API1_DESIGN.md)
* [README_ONBOARDING.md](README_ONBOARDING.md)
