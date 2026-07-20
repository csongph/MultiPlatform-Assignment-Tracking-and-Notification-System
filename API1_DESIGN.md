# API1 Design - KMAPS

เอกสารนี้สรุปค่า API/ENV ที่ระบบต้องใช้ และออกแบบ API v1 รอบแรกสำหรับระบบ
MultiPlatform Assignment Tracking and Notification System

## 1. Required ENV/API Values

### Core backend

| Key | Required | Example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://kmaps:kmaps@localhost:5432/kmaps_db` | PostgreSQL async connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Queue/cache backend for worker jobs |
| `JWT_SECRET_KEY` | Yes | long random string | Sign access, refresh, and OAuth state JWTs |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | Refresh token lifetime |
| `TOKEN_ENCRYPTION_KEY` | Yes | long random string | Encrypt stored OAuth access/refresh tokens |

### Frontend redirect

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `FRONTEND_ORIGIN` | Yes | `http://localhost:5173` | Frontend base URL after OAuth callback |
| `FRONTEND_ONBOARDING_SUCCESS_PATH` | No | `/onboarding/success` | Redirect path when OAuth succeeds |
| `FRONTEND_ONBOARDING_ERROR_PATH` | No | `/onboarding/error` | Redirect path when OAuth fails |

### Google Classroom OAuth

| Key | Required | Example | Purpose |
| --- | --- | --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | from Google Cloud Console | OAuth client id |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes | from Google Cloud Console | OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Yes | `http://localhost:8000/api/v1/oauth/google_classroom/callback` | Must match Google OAuth app redirect URI |

Google APIs/scopes:

| Value | Purpose |
| --- | --- |
| Enable Google Classroom API | Required in Google Cloud project |
| `https://www.googleapis.com/auth/classroom.courses.readonly` | Read courses |
| `https://www.googleapis.com/auth/classroom.coursework.me.readonly` | Read user's coursework |
| `https://www.googleapis.com/auth/classroom.coursework.students.readonly` | Read student coursework where allowed |
| `openid email profile` | Basic identity |

OAuth endpoints used by code:

| Endpoint | Purpose |
| --- | --- |
| `https://accounts.google.com/o/oauth2/v2/auth` | Authorization screen |
| `https://oauth2.googleapis.com/token` | Exchange/refresh token |

### Microsoft Teams / Microsoft Graph OAuth

| Key | Required | Example | Purpose |
| --- | --- | --- | --- |
| `MICROSOFT_OAUTH_CLIENT_ID` | Yes | from Azure App Registration | OAuth client id |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | Yes | from Azure App Registration | OAuth client secret |
| `MICROSOFT_OAUTH_TENANT` | No | `common` | Tenant id or `common` |
| `MICROSOFT_OAUTH_REDIRECT_URI` | Yes | `http://localhost:8000/api/v1/oauth/microsoft_teams/callback` | Must match Azure redirect URI |

Microsoft Graph scopes:

| Value | Purpose |
| --- | --- |
| `offline_access` | Get refresh token |
| `openid email profile` | Basic identity |
| `https://graph.microsoft.com/User.Read` | Read current user |
| `https://graph.microsoft.com/EduAssignments.ReadBasic` | Read education assignments |
| `https://graph.microsoft.com/Team.ReadBasic.All` | Read basic team information |

OAuth endpoints used by code:

| Endpoint | Purpose |
| --- | --- |
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` | Authorization screen |
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Exchange/refresh token |

## 2. API1 Base

Base URL:

```text
http://localhost:8000/api/v1
```

Auth:

```http
Authorization: Bearer <access_token>
```

Response error shape:

```json
{
  "detail": "Human readable error"
}
```

## 3. Implemented API1 Endpoints

### Health/root

```http
GET /
```

Response:

```json
{
  "message": "KMAPS API is running"
}
```

### Auth

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "email": "student@example.com",
  "password": "password123",
  "display_name": "Student Name"
}
```

Response `201`:

```json
{
  "id": "uuid",
  "email": "student@example.com",
  "display_name": "Student Name",
  "is_active": true
}
```

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer"
}
```

```http
POST /api/v1/auth/refresh
```

Request:

```json
{
  "refresh_token": "jwt"
}
```

```http
GET /api/v1/auth/me
```

Requires bearer token.

### OAuth onboarding

```http
GET /api/v1/oauth/platforms
```

Response:

```json
{
  "platforms": ["google_classroom", "microsoft_teams"]
}
```

```http
GET /api/v1/oauth/connections
```

Requires bearer token.

Response:

```json
[
  {
    "id": "uuid",
    "platform_id": 1,
    "platform_name": "google_classroom",
    "status": "connected",
    "token_expires_at": "2026-07-20T12:00:00Z",
    "connected_at": "2026-07-20T11:00:00Z"
  }
]
```

```http
GET /api/v1/oauth/{platform}/authorize
```

Requires bearer token.

Supported `platform` values:

```text
google_classroom
microsoft_teams
```

Response:

```json
{
  "authorization_url": "https://..."
}
```

```http
GET /api/v1/oauth/{platform}/callback?code=...&state=...
```

Called by Google/Microsoft. On success redirects to:

```text
{FRONTEND_ORIGIN}{FRONTEND_ONBOARDING_SUCCESS_PATH}?platform={platform}
```

On failure redirects to:

```text
{FRONTEND_ORIGIN}{FRONTEND_ONBOARDING_ERROR_PATH}?platform={platform}
```

```http
DELETE /api/v1/oauth/{platform}
```

Requires bearer token. Disconnects a platform.

## 4. Proposed API1 Endpoints For Next Build

These match the existing SQLAlchemy models but still need routers,
repositories, schemas, and services.

### Dashboard

```http
GET /api/v1/dashboard/summary
```

Response:

```json
{
  "total_courses": 5,
  "total_assignments": 18,
  "due_soon": 4,
  "overdue": 2,
  "connected_platforms": ["google_classroom"]
}
```

### Courses

```http
GET /api/v1/courses?platform=google_classroom&include_deleted=false
```

Response:

```json
[
  {
    "id": "uuid",
    "platform": "google_classroom",
    "external_course_id": "course-id",
    "name": "Software Engineering",
    "is_deleted": false
  }
]
```

### Assignments

```http
GET /api/v1/assignments?status=overdue&course_id=uuid&due_before=2026-07-31T23:59:59Z
```

Response:

```json
[
  {
    "id": "uuid",
    "course_id": "uuid",
    "course_name": "Software Engineering",
    "platform": "google_classroom",
    "title": "Final Report",
    "description": "Submit PDF",
    "due_at": "2026-07-31T23:59:59Z",
    "source_status": "assigned",
    "computed_status": "overdue",
    "source_url": "https://...",
    "last_synced_at": "2026-07-20T10:00:00Z"
  }
]
```

```http
GET /api/v1/assignments/{assignment_id}
```

Returns one assignment owned by the current user.

### Sync

```http
POST /api/v1/sync
```

Request:

```json
{
  "platform": "google_classroom"
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

```http
GET /api/v1/sync/{job_id}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "running",
  "created_at": "2026-07-20T10:00:00Z",
  "finished_at": null
}
```

### Notification settings

```http
GET /api/v1/notification-settings
```

```http
PUT /api/v1/notification-settings
```

Request:

```json
{
  "lead_time_minutes": 60,
  "new_assignment_enabled": true,
  "due_soon_enabled": true,
  "overdue_enabled": true,
  "channel": "push"
}
```

### Notifications

```http
GET /api/v1/notifications?status=pending
```

```http
POST /api/v1/notifications/{notification_id}/mark-read
```

## 5. Setup Checklist

1. Create `.env` in `backend/`.
2. Start PostgreSQL and Redis with `docker-compose up -d`.
3. Run migrations.
4. Run `python -m scripts.seed_platforms`.
5. Start API with `uvicorn app.main:app --reload`.
6. Open `http://localhost:8000/docs`.

Minimum `.env` for local development:

```env
DATABASE_URL=postgresql+asyncpg://kmaps:kmaps@localhost:5432/kmaps_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=change-me-to-a-long-random-secret
TOKEN_ENCRYPTION_KEY=change-me-to-another-long-random-secret

GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google_classroom/callback

MICROSOFT_OAUTH_CLIENT_ID=your-microsoft-client-id
MICROSOFT_OAUTH_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/microsoft_teams/callback

FRONTEND_ORIGIN=http://localhost:5173
```
