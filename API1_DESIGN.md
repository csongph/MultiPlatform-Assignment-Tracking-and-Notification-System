# KMAPS API Design

## 1. Overview

KMAPS provides a REST API for managing users, connected learning platforms, courses, assignments, notifications, and synchronization jobs.

### Base URL

```text
http://localhost:8000/api/v1
```

### API Documentation

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

## 1.1 Required ENV/API Values

### Core Backend

| Key | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres?ssl=require` | PostgreSQL async connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Queue and cache backend |
| `JWT_SECRET_KEY` | Yes | Strong random secret | Signs access, refresh, and OAuth state JWTs |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | Refresh token lifetime |
| `TOKEN_ENCRYPTION_KEY` | Yes | Secure encryption key | Encrypts stored OAuth tokens |

### Frontend Redirect

| Key | Required | Default | Purpose |
|---|---|---|---|
| `FRONTEND_ORIGIN` | Yes | `http://localhost:5500` | Frontend base URL after OAuth callback |
| `FRONTEND_ONBOARDING_SUCCESS_PATH` | No | `/onboarding/success` | Redirect path after successful OAuth |
| `FRONTEND_ONBOARDING_ERROR_PATH` | No | `/onboarding/error` | Redirect path after failed OAuth |

### Google Classroom OAuth

| Key | Required | Example | Purpose |
|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | From Google Cloud Console | OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes | From Google Cloud Console | OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Yes | `http://localhost:8000/api/v1/oauth/google_classroom/callback` | OAuth callback URL |

Required Google API configuration:

- Enable Google Classroom API in Google Cloud Console.
- Configure the OAuth consent screen and authorized redirect URI.
- Request only the scopes supported by the implementation and required for the user's access.

Google OAuth endpoints:

| Endpoint | Purpose |
|---|---|
| `https://accounts.google.com/o/oauth2/v2/auth` | Authorization |
| `https://oauth2.googleapis.com/token` | Token exchange and refresh |

### Microsoft Teams / Microsoft Graph OAuth

| Key | Required | Example | Purpose |
|---|---|---|---|
| `MICROSOFT_OAUTH_CLIENT_ID` | Yes | From Azure App Registration | OAuth client ID |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | Yes | From Azure App Registration | OAuth client secret |
| `MICROSOFT_OAUTH_TENANT` | No | `common` | Tenant ID or tenant selector |
| `MICROSOFT_OAUTH_REDIRECT_URI` | Yes | `http://localhost:8000/api/v1/oauth/microsoft_teams/callback` | OAuth callback URL |

Microsoft Graph scopes configured for the application may include:

| Scope | Purpose |
|---|---|
| `offline_access` | Request refresh-token access |
| `openid email profile` | Basic identity information |
| `User.Read` | Read the signed-in user's profile |
| `EduAssignments.ReadBasic` | Read basic education assignment information |
| `EduAssignments.Read` | Read education assignments and supported submission information |
| `Team.ReadBasic.All` | Read basic team information |
| `EduRoster.Read` | Read supported education roster information |

The required permissions and administrator consent depend on the endpoints being used and the organization's Microsoft 365 policies.

Microsoft OAuth endpoints:

| Endpoint | Purpose |
|---|---|
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` | Authorization |
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Token exchange and refresh |

### Synchronization and Cache Configuration

| Key | Required | Example | Purpose |
|---|---|---|---|
| `SYNC_INTERVAL_MINUTES` | No | `10` | Automatic synchronization interval |
| `NOTIFICATION_POLL_INTERVAL_SECONDS` | No | `60` | Notification polling interval |
| `TOKEN_REFRESH_LEAD_MINUTES` | No | `15` | Refresh tokens before access-token expiry |
| `CACHE_TTL_SECONDS` | No | `300` | Cache time-to-live |

> **Important:** The examples above document the expected configuration. Verify each variable's actual default and whether it is required against the backend settings and environment-loading code before deployment.
