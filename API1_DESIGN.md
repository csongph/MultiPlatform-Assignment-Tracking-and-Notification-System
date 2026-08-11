# KMAPS API Design

## 1. Overview

KMAPS provides a REST API for managing users, connected learning platforms, courses, assignments, notifications, and synchronization jobs.

Base URL:

```text
http://localhost:8000/api/v1
```

Swagger UI:

```text
http://localhost:8000/docs
```

---

# 2. Authentication

KMAPS uses JWT Bearer Authentication.

After login, the client receives:

```json
{
  "access_token": "ACCESS_TOKEN",
  "refresh_token": "REFRESH_TOKEN",
  "token_type": "bearer"
}
```

Authenticated requests must include:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

---

# 3. Authentication Endpoints

## Register

```http
POST /api/v1/auth/register
```

Example:

```json
{
  "email": "student@example.com",
  "password": "password123",
  "display_name": "Student"
}
```

---

## Login

```http
POST /api/v1/auth/login
```

Example:

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "access_token": "jwt-access-token",
  "refresh_token": "jwt-refresh-token",
  "token_type": "bearer"
}
```

---

## Refresh Token

```http
POST /api/v1/auth/refresh
```

Used to obtain a new access token.

---

## Current User

```http
GET /api/v1/auth/me
```

Requires:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

---

# 4. OAuth

Supported platforms:

```text
google_classroom
microsoft_teams
```

---

## Get Supported Platforms

```http
GET /api/v1/oauth/platforms
```

Returns the platforms supported by the system.

---

## Get Connected Platforms

```http
GET /api/v1/oauth/connections
```

Requires authentication.

Returns platforms currently connected to the user's account.

---

# 5. Google Classroom OAuth

Authorization:

```http
GET /api/v1/oauth/google_classroom/authorize
```

Callback:

```http
GET /api/v1/oauth/google_classroom/callback
```

Redirect URI:

```text
http://localhost:8000/api/v1/oauth/google_classroom/callback
```

Required environment variables:

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google_classroom/callback
```

Google Classroom API must be enabled in Google Cloud Console.

---

# 6. Microsoft Teams OAuth

Authorization:

```http
GET /api/v1/oauth/microsoft_teams/authorize
```

Callback:

```http
GET /api/v1/oauth/microsoft_teams/callback
```

Redirect URI:

```text
http://localhost:8000/api/v1/oauth/microsoft_teams/callback
```

Required environment variables:

```env
MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/microsoft_teams/callback
```

Microsoft Graph permissions must be configured in Azure App Registration.

---

# 7. Disconnect Platform

```http
DELETE /api/v1/oauth/{platform}
```

Example:

```http
DELETE /api/v1/oauth/google_classroom
```

Requires authentication.

---

# 8. Dashboard

## Dashboard Summary

```http
GET /api/v1/dashboard/summary
```

Requires authentication.

The endpoint provides summary information such as:

* Connected platforms
* Number of courses
* Number of assignments
* Assignment status
* Upcoming assignments
* Notification information

---

# 9. Courses

## Get Courses

```http
GET /api/v1/courses
```

Requires authentication.

Possible filters include:

```text
platform
```

Example:

```text
GET /api/v1/courses?platform=google_classroom
```

---

# 10. Assignments

## Get Assignments

```http
GET /api/v1/assignments
```

Requires authentication.

Possible filters include:

* Platform
* Course
* Status
* Due date

---

## Get Assignment

```http
GET /api/v1/assignments/{assignment_id}
```

Requires authentication.

---

# 11. Notifications

## Get Notifications

```http
GET /api/v1/notifications
```

Requires authentication.

---

## Mark Notification as Read

```http
POST /api/v1/notifications/{notification_id}/mark-read
```

Requires authentication.

---

# 12. Notification Settings

## Get Settings

```http
GET /api/v1/notification-settings
```

---

## Update Settings

```http
PUT /api/v1/notification-settings
```

Example:

```json
{
  "due_soon_enabled": true,
  "overdue_enabled": true
}
```

---

# 13. Synchronization

## Start Sync

```http
POST /api/v1/sync
```

Starts a synchronization job.

---

## Check Sync Status

```http
GET /api/v1/sync/{job_id}
```

Returns information about the synchronization job.

Possible statuses:

```text
pending
running
completed
failed
```

---

# 14. Environment Variables

The backend uses:

```env
DATABASE_URL=
REDIS_URL=

JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

TOKEN_ENCRYPTION_KEY=

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=

MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=

FRONTEND_ORIGIN=http://localhost:5500
FRONTEND_ONBOARDING_SUCCESS_PATH=/onboarding/success
FRONTEND_ONBOARDING_ERROR_PATH=/onboarding/error

SYNC_INTERVAL_MINUTES=10
NOTIFICATION_POLL_INTERVAL_SECONDS=60
TOKEN_REFRESH_LEAD_MINUTES=15
CACHE_TTL_SECONDS=300
```

---

# 15. Database

The project uses:

```text
PostgreSQL
```

Development database:

```text
Supabase PostgreSQL
```

Example:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres?ssl=require
```

The database credentials must never be committed to GitHub.

---

# 16. Redis

Redis is used for:

* Caching
* Background jobs
* Synchronization infrastructure

Example:

```env
REDIS_URL=redis://localhost:6379/0
```

---

# 17. JWT Configuration

Example:

```env
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
```

`JWT_SECRET_KEY` must be a strong random secret.

Generate one:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

# 18. Token Encryption

OAuth tokens are encrypted before being stored.

Required:

```env
TOKEN_ENCRYPTION_KEY=
```

Generate a secure key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Do not change the encryption key after tokens have been stored unless existing OAuth connections are intentionally invalidated.

---

# 19. Frontend Configuration

The frontend normally runs at:

```text
http://localhost:5500
```

Backend:

```text
http://localhost:8000
```

Environment:

```env
FRONTEND_ORIGIN=http://localhost:5500
```

---

# 20. API Development Status

## Completed

* Authentication
* JWT
* OAuth onboarding
* Platform connections
* Dashboard API
* Course API
* Assignment API
* Notification API
* Notification settings
* Sync job infrastructure

## In Progress

* Google Classroom synchronization
* Microsoft Teams synchronization
* Automatic synchronization
* Background synchronization
* Automatic token refresh
* Notification delivery

---

# 21. API Documentation

The most up-to-date API schema can be viewed through Swagger:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

Repository:

```text
https://github.com/csongph/MultiPlatform-Assignment-Tracking-and-Notification-System
```
